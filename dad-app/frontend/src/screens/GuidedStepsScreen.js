import React, { useEffect, useMemo, useReducer, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import PrimaryButton from '../components/PrimaryButton';
import ScreenCard from '../components/ScreenCard';
import ExpandableRepairImage from '../components/ExpandableRepairImage';
import theme from '../constants/theme';
import useRepairProgressPersistence from '../hooks/useRepairProgressPersistence';
import guidedRepairFlowReducer, {
  GUIDED_REPAIR_FLOW_ACTIONS,
  createInitialGuidedRepairFlowState,
} from '../reducers/guidedRepairFlowReducer';
import { getTools } from '../services/toolboxStorage';
import {
  GENERIC_REPAIR_FOLLOW_UP_OPTIONS,
  SINK_LEAK_DETAIL_STEPS,
  SINK_LEAK_LOCATION_OPTIONS,
  buildRepairStep,
  canUsePrimaryStepAction as getCanUsePrimaryStepAction,
  getAllGuideSteps,
  getDisplayedSteps,
  getHasAdvancedSteps,
  getInitialSinkLeakDetailSteps,
  getInitialStepIndex,
  getOptionalGuideSteps,
  getRepairStepCount,
  getRepairStepsForDiagnosis,
  getRequiredGuideSteps,
  getSimpleFixFollowUpQuestion,
  getSimpleFixStepCount,
  getStepTool,
  getToolName,
  isRunningToiletDiagnosis,
  isSinkPTrapDiagnosis,
  normalizeToolName,
} from '../utils/guidedRepairHelpers';
import {
  buildConnectProRouteParams,
  buildRepairCompleteRouteParams,
  buildToolsForRepairRouteParams,
} from '../utils/guidedRepairRouteParams';
import { getStopIfList } from '../utils/safetyHelpers';

export default function GuidedStepsScreen({ navigation, route }) {
console.log('[GuidedSteps] Screen rendering', {
  hasParams: !!route?.params,
  diagnosisKey: route?.params?.diagnosis?.diagnosisKey,
});

  const {
    diagnosis,
    label,
    categoryTitle,
    repairTodoId,
    resumeStepIndex = 0,
    resumeCompletedParts = {},
  } = route.params;
  const isSinkTrapFlow = isSinkPTrapDiagnosis(diagnosis, label, categoryTitle);
  const isRunningToiletFlow = isRunningToiletDiagnosis(diagnosis, label, categoryTitle);
  const allGuideSteps = useMemo(
    () => getAllGuideSteps({ diagnosis, isSinkTrapFlow, isRunningToiletFlow }),
    [diagnosis, isRunningToiletFlow, isSinkTrapFlow],
  );
  const optionalGuideSteps = useMemo(
    () => getOptionalGuideSteps(allGuideSteps),
    [allGuideSteps],
  );
  const requiredGuideSteps = useMemo(
    () => getRequiredGuideSteps(allGuideSteps),
    [allGuideSteps],
  );
  const initialSinkLeakDetailSteps = getInitialSinkLeakDetailSteps({
    diagnosis,
    isSinkTrapFlow,
    requiredGuideSteps,
  });
  const initialDisplayedSteps = getDisplayedSteps({
    isSinkTrapFlow,
    requiredGuideSteps,
    sinkLeakDetailSteps: initialSinkLeakDetailSteps,
  });
  const initialStepIndex = getInitialStepIndex(resumeStepIndex, initialDisplayedSteps);
  const [flowState, dispatchFlow] = useReducer(
    guidedRepairFlowReducer,
    {
      initialStepIndex,
      resumedCompletedParts: resumeCompletedParts,
      initialSinkLeakDetailSteps,
    },
    createInitialGuidedRepairFlowState,
  );
  const {
    currentStepIndex,
    completedParts,
    sinkLeakDetailSteps,
    fixFollowUpVisible,
    simpleFixCheckpointComplete,
    repairFollowUpAnswer,
    showFinishButton,
    finalDecision,
    leakSource,
    isComplete,
  } = flowState;
  const displayedSteps = useMemo(
    () => getDisplayedSteps({ isSinkTrapFlow, requiredGuideSteps, sinkLeakDetailSteps }),
    [isSinkTrapFlow, sinkLeakDetailSteps, requiredGuideSteps],
  );
  const repairStepsForDiagnosis = useMemo(
    () => getRepairStepsForDiagnosis({
      isSinkTrapFlow,
      requiredGuideSteps,
      sinkLeakDetailSteps,
      displayedSteps,
    }),
    [displayedSteps, isSinkTrapFlow, sinkLeakDetailSteps, requiredGuideSteps],
  );
  const activeDiagnosis = useMemo(
    () => ({
      ...diagnosis,
      troubleshootingSteps: repairStepsForDiagnosis,
      repairSteps: repairStepsForDiagnosis,
      steps: repairStepsForDiagnosis,
    }),
    [diagnosis, repairStepsForDiagnosis],
  );
  const stopConditions = useMemo(() => getStopIfList(diagnosis?.stopIf), [diagnosis]);
  const [openSections, setOpenSections] = useState({});
  const [inventoryTools, setInventoryTools] = useState([]);
  const totalSteps = displayedSteps.length;
  const hasSteps = totalSteps > 0;
  const repairStepCount = getRepairStepCount({
    isSinkTrapFlow,
    requiredGuideSteps,
    sinkLeakDetailSteps,
    totalSteps,
  });
  const simpleFixStepCount = getSimpleFixStepCount(diagnosis, repairStepCount);
  const simpleFixCheckpointIndex = simpleFixStepCount - 1;
  const hasAdvancedSteps = getHasAdvancedSteps({
    currentStepIndex,
    totalSteps,
    isSinkTrapFlow,
    sinkLeakDetailSteps,
  });
  const shouldShowSimpleFixCheckpoint =
    !isSinkTrapFlow && currentStepIndex === simpleFixCheckpointIndex && !simpleFixCheckpointComplete;
  const currentStep = displayedSteps[currentStepIndex];
  const isOutcomeDecisionStep = currentStep?.type === 'outcomeDecision';
  const stepData = useMemo(
    () => buildRepairStep(currentStep, currentStepIndex, activeDiagnosis),
    [currentStep, currentStepIndex, activeDiagnosis]
  );
  const stepParts = stepData.checklist;
  const nextRepairPlanIndex = stepParts.findIndex((_, index) => !completedParts[`${currentStepIndex}-${index}`]);
  const activeRepairPlanIndex =
    nextRepairPlanIndex === -1 ? Math.max(stepParts.length - 1, 0) : nextRepairPlanIndex;
  const isRepairPlanOpen = openSections.repairPlan !== false;
  const stepTool = getStepTool(activeDiagnosis?.tools || [], currentStepIndex);
  const stepToolName = getToolName(stepTool);
  const isFirstStep = currentStepIndex === 0;
  const isFinalStep = currentStepIndex === totalSteps - 1;
  const isReadyToFinish = isFinalStep || finalDecision === 'yes';
  const canUsePrimaryStepAction = getCanUsePrimaryStepAction({
    finalDecision,
    isOutcomeDecisionStep,
    shouldShowSimpleFixCheckpoint,
    isSinkTrapFlow,
  });
  const primaryStepLabel = isReadyToFinish ? 'Finish Repair' : 'Next Step';
  const progressSnapshot = useMemo(() => ({
    name: diagnosis?.issue || label,
    label,
    categoryTitle,
    diagnosis: activeDiagnosis,
    currentStepIndex,
    totalSteps,
    completedParts,
    toolsParts: activeDiagnosis?.tools || activeDiagnosis?.toolsNeeded || [],
  }), [
    activeDiagnosis,
    categoryTitle,
    completedParts,
    currentStepIndex,
    diagnosis?.issue,
    label,
    totalSteps,
  ]);
  const { activeRepairTodoId, saveNow } = useRepairProgressPersistence({
    initialRepairTodoId: repairTodoId,
    progressSnapshot,
    onRepairTodoIdChange: (savedRepairTodoId) => {
      navigation.setParams?.({
        repairTodoId: savedRepairTodoId,
      });
    },
  });

  function animateSupportLayout() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }

  async function handleNext() {
    await saveNow();

    if (finalDecision === 'yes') {
      handleFinishRepair();
      return;
    }

    if (isOutcomeDecisionStep) {
      return;
    }

    if (isSinkTrapFlow && currentStepIndex === totalSteps - 2) {
      dispatchFlow({
        type: GUIDED_REPAIR_FLOW_ACTIONS.ADVANCE_STEP,
        resetOutcomeDecision: true,
      });
      return;
    }

    if (currentStepIndex === totalSteps - 1) {
      dispatchFlow({ type: GUIDED_REPAIR_FLOW_ACTIONS.MARK_GUIDE_COMPLETE });
      return;
    }

    dispatchFlow({ type: GUIDED_REPAIR_FLOW_ACTIONS.ADVANCE_STEP });
  }

  function handleSimpleFixWorked() {
    if (finalDecision === 'yes') return; // already selected
    dispatchFlow({ type: GUIDED_REPAIR_FLOW_ACTIONS.SIMPLE_FIX_WORKED });
  }

  function handleFinishRepair() {
    const repairCompleteRouteParams = buildRepairCompleteRouteParams({
      activeDiagnosis,
      label,
      categoryTitle,
      activeRepairTodoId,
    });

    navigation.replace('RepairComplete', repairCompleteRouteParams);
  }

  function handleConnectToPro() {
    const connectProRouteParams = buildConnectProRouteParams({
      activeDiagnosis,
      label,
      categoryTitle,
    });

    navigation.navigate('ConnectPro', connectProRouteParams);
  }

  function handleOpenRepairTools() {
    const toolsForRepairRouteParams = buildToolsForRepairRouteParams({
      activeRepairTodoId,
      activeDiagnosis,
      diagnosis,
      label,
      categoryTitle,
    });

    navigation.navigate('ToolsForRepair', toolsForRepairRouteParams);
  }

  function handleSimpleFixFailed() {
    if (finalDecision === 'no') return; // already selected
    dispatchFlow({ type: GUIDED_REPAIR_FLOW_ACTIONS.SIMPLE_FIX_FAILED });
  }

  function handleSinkLeakLocation(option) {
    const detailSteps = SINK_LEAK_DETAIL_STEPS[option] || [];
    dispatchFlow({
      type: GUIDED_REPAIR_FLOW_ACTIONS.SELECT_SINK_LEAK_LOCATION,
      option,
      detailSteps,
      stepIndex: requiredGuideSteps.length,
    });

    if (detailSteps.length === 0) {
      handleConnectToPro();
      return;
    }
  }

  function handleGenericFollowUp(option) {
    const shouldAdvance = currentStepIndex < totalSteps - 1;
    dispatchFlow({
      type: GUIDED_REPAIR_FLOW_ACTIONS.SELECT_GENERIC_FOLLOW_UP,
      option,
      shouldAdvance,
    });

    if (shouldAdvance) {
      return;
    }

    handleConnectToPro();
  }

  function handlePreviousStep() {
    if (currentStepIndex === 0) {
      return;
    }

    const newIndex = currentStepIndex - 1;
    const resetsOutcomeDecision =
      isOutcomeDecisionStep || displayedSteps[newIndex]?.type === 'outcomeDecision';
    const resetMode = resetsOutcomeDecision
      ? 'outcome'
      : newIndex === simpleFixCheckpointIndex
        ? 'checkpoint'
        : null;
    dispatchFlow({
      type: GUIDED_REPAIR_FLOW_ACTIONS.GO_TO_PREVIOUS_STEP,
      stepIndex: newIndex,
      resetMode,
    });
  }

  function toggleStepPart(partIndex) {
    const partKey = `${currentStepIndex}-${partIndex}`;
    dispatchFlow({
      type: GUIDED_REPAIR_FLOW_ACTIONS.TOGGLE_CHECKLIST_PART,
      partKey,
    });
  }

  function toggleSection(section) {
    animateSupportLayout();
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function toggleRepairPlan() {
    animateSupportLayout();
    setOpenSections((current) => ({
      ...current,
      repairPlan: current.repairPlan === false,
      repairPlanUserSet: true,
    }));
  }

  useEffect(() => {
    setOpenSections((current) => {
      if (currentStepIndex === 0 || !current.repairPlanUserSet) {
        return {};
      }

      return {
        repairPlan: current.repairPlan,
        repairPlanUserSet: true,
      };
    });
  }, [currentStepIndex]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadTools() {
      const savedTools = await getTools();
      if (active) setInventoryTools(savedTools);
    }

    loadTools();

    return () => {
      active = false;
    };
  }, []);

  // Reset final decision states when diagnosis changes
  useEffect(() => {
    dispatchFlow({ type: GUIDED_REPAIR_FLOW_ACTIONS.RESET_FOR_DIAGNOSIS_CHANGE });
  }, [diagnosis?.diagnosisKey]);

  // Preserve support for older saved routes that may return with a leak location.
  useEffect(() => {
    if (route.params?.selectedLeakLocation && isSinkTrapFlow) {
      const option = route.params.selectedLeakLocation;
      const detailSteps = SINK_LEAK_DETAIL_STEPS[option] || [];
      dispatchFlow({
        type: GUIDED_REPAIR_FLOW_ACTIONS.RESTORE_LEGACY_LEAK_LOCATION,
        option,
        detailSteps,
        stepIndex: requiredGuideSteps.length,
      });
      // Clear the param to avoid re-triggering
      navigation.setParams({ selectedLeakLocation: undefined });
    }
  }, [route.params?.selectedLeakLocation, isSinkTrapFlow, navigation, requiredGuideSteps.length]);

  if (!hasSteps) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <ScreenCard>
            <Text style={styles.emptyTitle}>No guided steps were provided</Text>
            <Text style={styles.emptyText}>
              This repair does not have guided steps yet. You can go back or call a pro.
            </Text>
            <PrimaryButton title="Back to Diagnosis" onPress={() => navigation.goBack()} />
          </ScreenCard>
        </View>
      </View>
    );
  }

  if (isComplete) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.completionHeader}>
          <Text style={styles.kicker}>{label}</Text>
          <Text style={styles.title}>Did this fix the issue?</Text>
          <Text style={styles.subtitle}>
            You made it through the guide.
          </Text>
        </View>

        <ScreenCard style={styles.completionCard}>
          <View style={styles.completionBadge}>
            <Text style={styles.completionBadgeText}>Done</Text>
          </View>

          <Text style={styles.completionQuestion}>Did this fix the issue?</Text>
          <Text style={styles.completionText}>
            If the issue is still there, call a pro.
          </Text>

          <PrimaryButton
            title="Yes"
            onPress={handleFinishRepair}
          />

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={handleConnectToPro}
          >
            <Text style={styles.secondaryButtonText}>No</Text>
          </TouchableOpacity>
        </ScreenCard>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenCard style={styles.stepCard}>
          {isOutcomeDecisionStep ? (
            <OutcomeDecisionCard
              finalDecision={finalDecision}
              leakSource={leakSource}
              onFixed={handleSimpleFixWorked}
              onNotFixed={handleSimpleFixFailed}
              onSelectLocation={handleSinkLeakLocation}
            />
          ) : (
            <>
              <View style={styles.heroSection}>
                <View style={styles.stepContextRow}>
                  <Text style={styles.stepNumber}>Step {currentStepIndex + 1} of {totalSteps}</Text>
                  <Text style={styles.stepContext} numberOfLines={1}>{label}</Text>
                </View>

                <Text style={styles.stepMainTitle}>{stepData.title}</Text>

                {stepData.image ? (
                  <View style={styles.heroImageSurface}>
                    <ExpandableRepairImage
                      imagePath={stepData.image}
                      accessibilityLabel={`Tap to enlarge ${stepData.title} diagram`}
                      height={240}
                    />
                  </View>
                ) : (
                  <View style={styles.visualPlaceholder}>
                    <View style={styles.visualIconWrap}>
                      <Text style={styles.visualIconText}>{currentStepIndex + 1}</Text>
                    </View>
                    <Text style={styles.visualTitle}>Diagram placeholder</Text>
                    <Text style={styles.visualText}>A simple diagram will go here.</Text>
                  </View>
                )}

                <Text style={styles.stepInstruction}>{stepData.instruction}</Text>

                {stepToolName ? (
                  <Pressable
                    onPress={handleOpenRepairTools}
                    style={({ pressed }) => [styles.toolAwarenessCard, pressed && styles.pressScale]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open repair tools for ${stepToolName}`}
                  >
                    <View style={styles.toolIconBadge}>
                      <MaterialCommunityIcons name="hammer-wrench" size={18} color={theme.colors.primary} />
                    </View>
                    <View style={styles.toolAwarenessCopy}>
                      <Text style={styles.toolAwarenessName}>{stepToolName}</Text>
                      <Text style={styles.toolAwarenessLink}>View in “Before You Begin”</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.subtext} />
                  </Pressable>
                ) : null}
              </View>

              {false ? (
                  <View style={styles.repairPlanList}>
                    {stepParts.map((part, index) => {
                      const partKey = `${currentStepIndex}-${index}`;
                      const isPartComplete = Boolean(completedParts[partKey]);
                      const isCurrentPart = !isPartComplete && index === activeRepairPlanIndex;
                      const isUpcomingPart = !isPartComplete && !isCurrentPart;

                      return (
                        <Pressable
                          key={partKey}
                          style={({ pressed }) => [
                            styles.repairPlanRow,
                            isPartComplete && styles.repairPlanRowComplete,
                            isCurrentPart && styles.repairPlanRowCurrent,
                            isUpcomingPart && styles.repairPlanRowUpcoming,
                            pressed && styles.pressScale,
                          ]}
                          onPress={() => toggleStepPart(index)}
                        >
                          <View
                            style={[
                              styles.repairPlanMarker,
                              isPartComplete && styles.repairPlanMarkerComplete,
                              isCurrentPart && styles.repairPlanMarkerCurrent,
                            ]}
                          >
                            <Text
                              style={[
                                styles.repairPlanMarkerText,
                                isPartComplete && styles.repairPlanMarkerTextComplete,
                                isCurrentPart && styles.repairPlanMarkerTextCurrent,
                              ]}
                            >
                              {isPartComplete ? '✓' : isCurrentPart ? '▶' : '○'}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.repairPlanText,
                              isPartComplete && styles.repairPlanTextComplete,
                              isCurrentPart && styles.repairPlanTextCurrent,
                              isUpcomingPart && styles.repairPlanTextUpcoming,
                            ]}
                          >
                            {part}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
              ) : null}

              {shouldShowSimpleFixCheckpoint ? (
                <SimpleFixCheckpointCard
                  followUpQuestion={getSimpleFixFollowUpQuestion(activeDiagnosis, isSinkTrapFlow)}
                  followUpOptions={GENERIC_REPAIR_FOLLOW_UP_OPTIONS}
                  hasAdvancedSteps={hasAdvancedSteps}
                  isLocationFollowUp={false}
                  showFinishButton={showFinishButton}
                  finalDecision={finalDecision}
                  onFixed={handleSimpleFixWorked}
                  onNotFixed={handleSimpleFixFailed}
                  onSelectLocation={handleSinkLeakLocation}
                  onSelectFollowUp={handleGenericFollowUp}
                />
              ) : null}

              {repairFollowUpAnswer && currentStepIndex > simpleFixCheckpointIndex ? (
                <Text style={styles.branchNote}>Continuing with: {repairFollowUpAnswer}</Text>
              ) : null}
            </>
          )}

        </ScreenCard>

        {optionalGuideSteps.length > 0 || !isOutcomeDecisionStep ? (
          <StepSupportSection
            isOpen={Boolean(openSections.learnMore)}
            onToggle={() => toggleSection('learnMore')}
          >
            {optionalGuideSteps.length > 0 ? (
              <View style={styles.supportGroup}>
                <View style={styles.supportGroupHeading}>
                  <MaterialCommunityIcons name="book-open-page-variant-outline" size={19} color={theme.colors.primary} />
                  <Text style={styles.supportGroupTitle}>Learn More</Text>
                </View>
                {optionalGuideSteps.map((step, index) => (
                  <View key={step.id || index} style={styles.learnMoreItem}>
                    <Text style={styles.learnMoreTitle}>{step.title}</Text>
                    <Text style={styles.learnMoreDescription}>{step.description}</Text>
                    {step.image ? (
                      <ExpandableRepairImage
                        imagePath={step.image}
                        accessibilityLabel={`Tap to enlarge ${step.title} diagram`}
                        height={220}
                      />
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {!isOutcomeDecisionStep ? (
              <>
                <View style={styles.supportGroup}>
                  <View style={styles.supportGroupHeading}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={19} color={theme.colors.primary} />
                    <Text style={styles.supportGroupTitle}>Common Mistakes</Text>
                  </View>
                  {stepData.commonMistakes.slice(0, 3).map((mistake, index) => (
                    <View key={index} style={styles.supportPanelRow}>
                      <View style={styles.helpBullet} />
                      <Text style={styles.supportPanelText}>{mistake}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.supportGroup, styles.safetySupportGroup]}>
                  <View style={styles.supportGroupHeading}>
                    <MaterialCommunityIcons name="shield-check-outline" size={19} color={theme.colors.warningText} />
                    <Text style={[styles.supportGroupTitle, styles.helpWarningText]}>Safety Reminder</Text>
                  </View>
                  <Text style={[styles.supportPanelText, styles.helpWarningText]}>
                    {stopConditions[0] || stepData.safetyReminder}
                  </Text>
                </View>
              </>
            ) : null}
          </StepSupportSection>
        ) : null}

        {!isOutcomeDecisionStep ? (
          <>
            <View style={styles.contextHelpCard}>
              <View style={styles.contextHelpIconWrap}>
                <MaterialCommunityIcons name="account-hard-hat-outline" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.contextHelpCopy}>
                <Text style={styles.contextHelpTitle}>Need help with this step?</Text>
                <Text style={styles.contextHelpText}>We're here to help you get unstuck.</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.contextHelpButton, pressed && styles.pressScale]}
                onPress={handleConnectToPro}
              >
                <Text style={styles.contextHelpButtonText}>I'm Stuck →</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.buttonFooter}>
        <Pressable
          disabled={isFirstStep}
          style={({ pressed }) => [
            styles.previousButton,
            isFirstStep && styles.stepButtonDisabled,
            pressed && !isFirstStep && styles.pressScale,
          ]}
          onPress={handlePreviousStep}
        >
          <Text style={[styles.previousButtonText, isFirstStep && styles.stepButtonDisabledText]}>
            Previous
          </Text>
        </Pressable>

        <Text style={styles.footerStepText}>
          Step {currentStepIndex + 1} of {totalSteps}
        </Text>

        <Pressable
          disabled={!canUsePrimaryStepAction}
          style={({ pressed }) => [
            styles.nextButton,
            !canUsePrimaryStepAction && styles.stepButtonDisabled,
            pressed && canUsePrimaryStepAction && styles.pressScale,
          ]}
          onPress={handleNext}
        >
          <Text style={[styles.nextButtonText, !canUsePrimaryStepAction && styles.stepButtonDisabledText]}>
            {primaryStepLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );

}

function StepSupportSection({ isOpen, onToggle, children }) {
  return (
    <View style={styles.stepSupportSection}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.stepSupportHeader, pressed && styles.pressScale]}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel="More About This Step"
      >
        <View style={styles.stepSupportHeaderCopy}>
          <MaterialCommunityIcons name="information-outline" size={21} color={theme.colors.primary} />
          <Text style={styles.stepSupportTitle}>More About This Step</Text>
        </View>
        <MaterialCommunityIcons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={theme.colors.subtext}
        />
      </Pressable>
      {isOpen ? <View style={styles.stepSupportBody}>{children}</View> : null}
    </View>
  );
}

function OutcomeDecisionCard({
  finalDecision,
  leakSource,
  onFixed,
  onNotFixed,
  onSelectLocation,
}) {
  return (
    <View style={styles.outcomeCard}>
      <Text style={styles.kicker}>Final check</Text>
      <Text style={styles.stepMainTitle}>Did this fix the problem?</Text>
      <Text style={styles.stepInstruction}>Run the sink and check the repair before choosing.</Text>

      <View style={styles.branchActionRow}>
        <Pressable
          style={({ pressed }) => [
            finalDecision === 'yes' ? styles.branchPrimaryAction : styles.branchSecondaryAction,
            pressed && styles.pressScale,
          ]}
          onPress={onFixed}
        >
          <Text style={finalDecision === 'yes' ? styles.branchPrimaryActionText : styles.branchSecondaryActionText}>
            Yes
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            finalDecision === 'no' ? styles.branchPrimaryAction : styles.branchSecondaryAction,
            pressed && styles.pressScale,
          ]}
          onPress={onNotFixed}
        >
          <Text style={finalDecision === 'no' ? styles.branchPrimaryActionText : styles.branchSecondaryActionText}>
            No
          </Text>
        </Pressable>
      </View>

      {finalDecision === 'no' ? (
        <View style={styles.branchLocationWrap}>
          <Text style={styles.branchQuestion}>Where is the leak coming from?</Text>
          <View style={styles.branchOptions}>
            {SINK_LEAK_LOCATION_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={({ pressed }) => [
                  styles.branchOption,
                  leakSource === option && styles.branchOptionSelected,
                  pressed && styles.pressScale,
                ]}
                onPress={() => onSelectLocation(option)}
              >
                <Text
                  style={[
                    styles.branchOptionText,
                    leakSource === option && styles.branchOptionSelectedText,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SimpleFixCheckpointCard({
  followUpQuestion,
  followUpOptions,
  hasAdvancedSteps,
  isLocationFollowUp,
  showFinishButton,
  finalDecision,
  onFixed,
  onNotFixed,
  onSelectLocation,
  onSelectFollowUp,
}) {
  return (
    <View style={styles.branchCard}>
      {showFinishButton ? (
        <View>
          <Text style={styles.branchQuestion}>Great! The repair is complete.</Text>
          <Text style={styles.branchHint}>Use the Finish button below to save the completed repair.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.branchQuestion}>Did this fix the problem?</Text>
          <View style={styles.branchActionRow}>
            <Pressable
              style={({ pressed }) => [
                finalDecision === 'yes' ? styles.branchPrimaryAction : styles.branchSecondaryAction,
                pressed && styles.pressScale,
              ]}
              onPress={onFixed}
            >
              <Text style={finalDecision === 'yes' ? styles.branchPrimaryActionText : styles.branchSecondaryActionText}>Yes</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                finalDecision === 'no' ? styles.branchPrimaryAction : styles.branchSecondaryAction,
                pressed && styles.pressScale,
              ]}
              onPress={onNotFixed}
            >
              <Text style={finalDecision === 'no' ? styles.branchPrimaryActionText : styles.branchSecondaryActionText}>No</Text>
            </Pressable>
          </View>

          {finalDecision === 'no' ? (
            <View style={styles.branchLocationWrap}>
              <Text style={styles.branchQuestion}>{followUpQuestion}</Text>
              <View style={styles.branchOptions}>
                {followUpOptions.map((option) => (
                  <Pressable
                    key={option}
                    style={({ pressed }) => [styles.branchOption, pressed && styles.pressScale]}
                    onPress={() => {
                      if (onSelectLocation && isLocationFollowUp) {
                        onSelectLocation(option);
                        return;
                      }
                      onSelectFollowUp(option);
                    }}
                  >
                    <Text style={styles.branchOptionText}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              {!hasAdvancedSteps ? (
                <Text style={styles.branchHint}>
                  If the simple fix did not work, the next best step is to get help before taking anything apart.
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  kicker: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.heading,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  stepCard: {
    justifyContent: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  heroSection: {
    marginBottom: theme.spacing.sm,
  },
  stepContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  stepNumber: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stepContext: {
    flexShrink: 1,
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.subtext,
  },
  stepMainTitle: {
    fontSize: theme.typography.title,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 32,
    letterSpacing: -0.35,
  },
  stepInstruction: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 24,
  },
  heroImageSurface: {
    overflow: 'hidden',
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.14)',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  visualPlaceholder: {
    minHeight: 126,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  visualIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  visualIconText: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '900',
    color: theme.colors.white,
  },
  visualTitle: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  visualText: {
    marginTop: 2,
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.subtext,
    textAlign: 'center',
    lineHeight: 18,
  },
  learnMoreItem: {
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  learnMoreTitle: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  learnMoreDescription: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 21,
    marginBottom: theme.spacing.sm,
  },
  toolAwarenessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    minHeight: 58,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  toolIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  toolAwarenessCopy: {
    flex: 1,
    minWidth: 0,
  },
  toolAwarenessName: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  toolAwarenessLink: {
    marginTop: 3,
    color: theme.colors.primary,
    fontSize: theme.typography.caption,
    lineHeight: 16,
    fontWeight: '700',
  },
  stepBody: {
    backgroundColor: theme.colors.cardHighlight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  outcomeCard: {
    gap: theme.spacing.sm,
  },
  branchCard: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  branchQuestion: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '900',
    color: theme.colors.text,
    lineHeight: 24,
  },
  branchActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  branchPrimaryAction: {
    flex: 1,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.success,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchPrimaryActionText: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.white,
  },
  branchSecondaryAction: {
    flex: 1,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardHighlight,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchSecondaryActionText: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  branchLocationWrap: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  branchOptions: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  branchOption: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardHighlight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  branchOptionSelected: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.surfaceMuted,
  },
  branchOptionText: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  branchOptionSelectedText: {
    color: theme.colors.success,
  },
  branchHint: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.subtext,
    lineHeight: 18,
  },
  branchNote: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  repairPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: theme.radius.md,
    minHeight: 42,
  },
  repairPlanTitle: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '900',
    color: theme.colors.text,
  },
  repairPlanMeta: {
    marginTop: 2,
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.subtext,
  },
  repairPlanToggle: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '900',
    color: theme.colors.primary,
    lineHeight: 22,
  },
  repairPlanList: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  repairPlanRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 8,
  },
  repairPlanRowComplete: {
    opacity: 0.78,
  },
  repairPlanRowCurrent: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  repairPlanRowUpcoming: {
    opacity: 0.62,
  },
  repairPlanMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  repairPlanMarkerComplete: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  repairPlanMarkerCurrent: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  repairPlanMarkerText: {
    fontSize: theme.typography.caption,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  repairPlanMarkerTextComplete: {
    color: theme.colors.white,
  },
  repairPlanMarkerTextCurrent: {
    color: theme.colors.white,
  },
  repairPlanText: {
    flex: 1,
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 22,
  },
  repairPlanTextComplete: {
    color: theme.colors.subtext,
    textDecorationLine: 'line-through',
  },
  repairPlanTextCurrent: {
    fontWeight: '900',
    color: theme.colors.text,
  },
  repairPlanTextUpcoming: {
    color: theme.colors.subtext,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.layout.repairActionBarHeight + theme.spacing.xl,
  },
  buttonFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: theme.layout.repairActionBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    backgroundColor: 'rgba(246,245,240,0.98)',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 4,
  },
  pressScale: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  previousButton: {
    flex: 0.92,
    minHeight: 46,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardHighlight,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previousButtonText: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.subtext,
  },
  footerStepText: {
    flex: 0.82,
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.subtext,
    textAlign: 'center',
  },
  stepButtonDisabled: {
    opacity: 0.48,
  },
  stepButtonDisabledText: {
    color: theme.colors.subtext,
  },
  nextButton: {
    flex: 1.22,
    minHeight: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
  },
  nextButtonText: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.white,
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  stepSupportSection: {
    overflow: 'hidden',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  stepSupportHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
  },
  stepSupportHeaderCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  stepSupportTitle: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  stepSupportBody: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  supportGroup: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  supportGroupHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  supportGroupTitle: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  safetySupportGroup: {
    marginHorizontal: -theme.spacing.md,
    marginBottom: -theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.warningBackground,
    borderBottomWidth: 0,
  },
  helpWarningText: {
    color: theme.colors.warningText,
    fontWeight: '700',
  },
  helpBullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 8,
    marginRight: theme.spacing.sm,
  },
  supportPanelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  supportPanelText: {
    flex: 1,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 18,
  },
  contextHelpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadow.soft,
  },
  contextHelpIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  contextHelpCopy: {
    flex: 1,
  },
  contextHelpTitle: {
    fontSize: theme.typography.body,
    fontWeight: '900',
    color: theme.colors.text,
  },
  contextHelpText: {
    marginTop: 2,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.subtext,
    lineHeight: 18,
  },
  contextHelpButton: {
    alignSelf: 'center',
    flexShrink: 0,
    marginLeft: 'auto',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.35)',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  contextHelpButtonText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  emptyTitle: {
    fontSize: theme.typography.title,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 24,
  },
  completionHeader: {
    marginBottom: theme.spacing.lg,
  },
  completionCard: {
    alignItems: 'stretch',
  },
  completionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  completionBadgeText: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  completionQuestion: {
    fontSize: theme.typography.title,
    fontWeight: '800',
    color: theme.colors.text,
  },
  completionText: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 24,
  },
});
