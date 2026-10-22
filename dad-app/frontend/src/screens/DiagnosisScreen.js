import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutAnimation, View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import PrimaryButton from '../components/PrimaryButton';
import QuestionFlowScreen from '../components/QuestionFlowScreen';
import ScreenCard from '../components/ScreenCard';
import ToolCard from '../components/ToolCard';
import theme from '../constants/theme';
import {
  getDiagnosisByKey,
  getDiagnosisKeyFromText,
  getQuestionsByDiagnosisKey,
  SINK_P_TRAP_LEAK_TOOLS,
} from '../data/diagnosisLibrary';
import { addShoppingItems, getTools } from '../services/toolboxStorage';
import { confidenceColor } from '../utils/formatHelpers';

const freeDiagnosisSinkLeakTools = [
  'Bucket',
  'Towel or rag',
  'Adjustable wrench or channel-lock pliers',
  'Replacement slip-joint washer (if needed)',
  'Flashlight (optional)',
  'Gloves (optional)',
];

const MOCK_QUESTION_FLOWS = {
  bathroom: [
    {
      text: 'Is there visible water leaking right now?',
      options: ['Yes', 'No', 'Only after use'],
    },
    {
      text: 'Can you shut the water off at the fixture?',
      options: ['Yes', 'No', 'Not sure'],
    },
    {
      text: 'Does the problem seem to be getting worse?',
      options: ['Yes', 'No'],
    },
  ],
  kitchen: [
    {
      text: 'Is water showing up under the sink or appliance?',
      options: ['Yes', 'No', 'Only when running'],
    },
    {
      text: 'Is the drain moving slowly or backing up?',
      options: ['Yes', 'No'],
    },
    {
      text: 'Do you see a loose hose, pipe, or connection?',
      options: ['Yes', 'No', 'Not sure'],
    },
  ],
  laundry: [
    {
      text: 'Is water pooling around the washer or dryer area?',
      options: ['Yes', 'No', 'Only during a cycle'],
    },
    {
      text: 'Are the supply hoses and drain hose seated firmly?',
      options: ['Yes', 'No', 'Not sure'],
    },
    {
      text: 'Did the machine make a new noise before this started?',
      options: ['Yes', 'No'],
    },
  ],
  electrical: [
    {
      text: 'Did a breaker trip or a fuse blow?',
      options: ['Yes', 'No', 'Not sure'],
    },
    {
      text: 'Do you notice sparks, burning smell, or heat?',
      options: ['Yes', 'No'],
    },
    {
      text: 'Is the issue limited to one outlet, switch, or light?',
      options: ['Yes', 'No'],
    },
  ],
  hvac: [
    {
      text: 'Is the system turning on at all?',
      options: ['Yes', 'No', 'It cycles on and off'],
    },
    {
      text: 'Is air coming from the vents?',
      options: ['Yes', 'No', 'Weak airflow'],
    },
    {
      text: 'Has the filter been changed recently?',
      options: ['Yes', 'No', 'Not sure'],
    },
  ],
  'heating-cooling': [
    {
      text: 'Is the system turning on at all?',
      options: ['Yes', 'No', 'It cycles on and off'],
    },
    {
      text: 'Is air coming from the vents?',
      options: ['Yes', 'No', 'Weak airflow'],
    },
    {
      text: 'Has the filter been changed recently?',
      options: ['Yes', 'No', 'Not sure'],
    },
  ],
  'doors-locks': [
    {
      text: 'Does the door or lock feel stuck, loose, or misaligned?',
      options: ['Stuck', 'Loose', 'Misaligned', 'Not sure'],
    },
    {
      text: 'Does lifting or pushing the door change how it closes?',
      options: ['Yes', 'No'],
    },
    {
      text: 'Do you see loose screws or worn hardware?',
      options: ['Yes', 'No', 'Not sure'],
    },
  ],
  generic: [
    {
      text: 'Is the problem happening right now?',
      options: ['Yes', 'No', 'On and off'],
    },
    {
      text: 'Did anything change right before it started?',
      options: ['Yes', 'No', 'Not sure'],
    },
    {
      text: 'Does it seem unsafe, urgent, or likely to cause damage?',
      options: ['Yes', 'No', 'Not sure'],
    },
  ],
};

const MOCK_RESULTS = {
  bathroom: {
    likelyIssue: 'Likely plumbing leak or fixture issue',
    confidence: 'Medium',
    difficulty: 'Moderate',
    estimatedTime: '30-60 min',
    tools: ['Adjustable Wrench', 'Bucket', 'Towels', 'Safety Glasses'],
    safetyWarnings: ['Shut off water before opening fittings or supply lines.'],
    steps: [
      'Shut off the nearest water valve.',
      'Dry the area completely so you can spot the source.',
      'Run a small amount of water and watch the drain, supply line, and fixture base.',
      'Tighten loose connections gently, then reassess.',
    ],
  },
  kitchen: {
    likelyIssue: 'Likely sink, drain, or appliance connection issue',
    confidence: 'Medium',
    difficulty: 'Moderate',
    estimatedTime: '30-75 min',
    tools: ['Adjustable Wrench', 'Bucket', 'Towels', 'Flashlight'],
    safetyWarnings: ['Turn off water before adjusting hoses or drain fittings.'],
    steps: [
      'Clear items from under the sink or appliance area.',
      'Dry the area and place a towel underneath.',
      'Run water briefly and watch each connection.',
      'Tighten loose fittings or note the exact source before replacing parts.',
    ],
  },
  laundry: {
    likelyIssue: 'Likely hose, drain, or appliance cycle issue',
    confidence: 'Medium',
    difficulty: 'Moderate',
    estimatedTime: '30-90 min',
    tools: ['Work Gloves', 'Bucket', 'Towels', 'Pliers'],
    safetyWarnings: ['Unplug the appliance before moving it or inspecting behind it.'],
    steps: [
      'Pause the machine and unplug it if you need to move it.',
      'Check supply hoses, drain hose, and floor around the machine.',
      'Look for cracked hoses or loose clamps.',
      'Run a short cycle while watching for the first sign of water.',
    ],
  },
  electrical: {
    likelyIssue: 'Likely breaker, outlet, switch, or circuit issue',
    confidence: 'Low',
    difficulty: 'Hard',
    estimatedTime: '15-45 min',
    tools: ['Flashlight', 'Safety Glasses', 'Voltage Tester'],
    safetyWarnings: [
      'Stop immediately if you smell burning, see sparks, or feel heat.',
      'Turn power off at the breaker before inspecting anything electrical.',
    ],
    steps: [
      'Turn off the affected circuit if there is heat, smell, or sparking.',
      'Confirm whether nearby outlets or lights are also affected.',
      'Reset a tripped breaker only once.',
      'Call a licensed electrician if it trips again or anything seems unsafe.',
    ],
  },
  hvac: {
    likelyIssue: 'Likely thermostat, filter, or airflow issue',
    confidence: 'Medium',
    difficulty: 'Easy',
    estimatedTime: '15-45 min',
    tools: ['Replacement Air Filter', 'Flashlight', 'Work Gloves'],
    safetyWarnings: ['Turn the system off before replacing filters or opening panels.'],
    steps: [
      'Check thermostat mode and set temperature.',
      'Replace or inspect the air filter.',
      'Make sure vents are open and not blocked.',
      'Restart the system and listen for normal startup.',
    ],
  },
  'heating-cooling': {
    likelyIssue: 'Likely thermostat, filter, or airflow issue',
    confidence: 'Medium',
    difficulty: 'Easy',
    estimatedTime: '15-45 min',
    tools: ['Replacement Air Filter', 'Flashlight', 'Work Gloves'],
    safetyWarnings: ['Turn the system off before replacing filters or opening panels.'],
    steps: [
      'Check thermostat mode and set temperature.',
      'Replace or inspect the air filter.',
      'Make sure vents are open and not blocked.',
      'Restart the system and listen for normal startup.',
    ],
  },
  'doors-locks': {
    likelyIssue: 'Likely hinge, latch, or strike plate alignment issue',
    confidence: 'High',
    difficulty: 'Easy',
    estimatedTime: '15-40 min',
    tools: ['Phillips Screwdriver', 'Cordless Drill', 'Level'],
    safetyWarnings: ['Do not force a lock if the key may break inside.'],
    steps: [
      'Check for loose hinge, knob, latch, or strike plate screws.',
      'Watch where the latch meets the strike plate.',
      'Tighten hardware a little at a time.',
      'Test the door after each adjustment.',
    ],
  },
  generic: {
    likelyIssue: 'Likely a simple issue that needs a closer look',
    confidence: 'Low',
    difficulty: 'Moderate',
    estimatedTime: 'Varies',
    tools: ['Flashlight', 'Work Gloves', 'Safety Glasses'],
    safetyWarnings: ['Pause if you see water, smell burning, or feel unsure.'],
    steps: [
      'Take a clear look at where the issue starts.',
      'Turn off water, power, or the appliance if there is any safety concern.',
      'Write down what changed recently and what triggers the problem.',
      'Use Guided Diagnosis if one category fits better.',
    ],
  },
};

function getFlowKey(category, categoryTitle, mode, issueText = '', label = '') {
  const normalizedCategory = String(category || '').toLowerCase();
  const normalizedTitle = String(categoryTitle || '').toLowerCase();

  const diagnosisKey = getDiagnosisKeyFromText(`${issueText} ${category} ${categoryTitle} ${label}`);
  if (diagnosisKey) return diagnosisKey;
  if (normalizedCategory && MOCK_QUESTION_FLOWS[normalizedCategory]) return normalizedCategory;
  if (normalizedTitle.includes('bath')) return 'bathroom';
  if (normalizedTitle.includes('kitchen')) return 'kitchen';
  if (normalizedTitle.includes('laundry')) return 'laundry';
  if (normalizedTitle.includes('electrical')) return 'electrical';
  if (normalizedTitle.includes('heating') || normalizedTitle.includes('cooling') || normalizedTitle.includes('hvac')) return 'hvac';
  if (normalizedTitle.includes('door') || normalizedTitle.includes('lock')) return 'doors-locks';
  return mode === 'guided' ? normalizedCategory || 'generic' : 'generic';
}

function isSinkLeakIssue(...values) {
  return Boolean(getDiagnosisKeyFromText(values.join(' ')));
}

function normalizeToolName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getDisplayTools({ tools = [], diagnosisTitle = '', label = '', categoryTitle = '', issueText = '' }) {
  if (isSinkLeakIssue(diagnosisTitle, label, categoryTitle, issueText)) {
    return SINK_P_TRAP_LEAK_TOOLS;
  }

  return tools;
}

function animateLayoutChange() {
  if (LayoutAnimation?.configureNext && LayoutAnimation?.Presets?.easeInEaseOut) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
}

function buildMockDiagnosis({ result, issueText, label, categoryTitle, mode }) {
  const tools = result.tools || result.toolsNeeded || [];

  return {
    aiUsed: false,
    issue: result.likelyIssue,
    likelyIssue: result.likelyIssue,
    confidence: result.confidence,
    difficulty: result.difficulty,
    estimatedTime: result.estimatedTime,
    tools,
    toolsNeeded: tools,
    safetyWarning: result.safetyWarnings?.[0],
    beforeYouStart: result.safetyWarnings,
    callAPro: 'If anything feels unsafe, unclear, or beyond your comfort level, call a qualified professional.',
    troubleshootingSteps: result.steps,
    steps: result.steps,
    whyThisMightBeHappening:
      mode === 'free'
        ? `Based on what you entered: "${issueText}".`
        : `Based on the ${categoryTitle || label || 'selected'} flow.`,
    diySuitability: result.difficulty === 'Hard' ? 'pro recommended' : 'diy friendly',
  };
}

function shortEvidenceText(text) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'It matches your answers so far.';
  return cleaned;
}

function getStepPreviewText(step) {
  const rawText = typeof step === 'string' ? step : step?.title || step?.text || '';
  const cleaned = String(rawText)
    .replace(/^\d+\.\s*/, '')
    .replace(/[.!?]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 'Check the area';
  return cleaned;
}

function getDiagnosisSteps(diagnosis) {
  const candidates = [
    diagnosis?.steps,
    diagnosis?.troubleshootingSteps,
    diagnosis?.repairSteps,
    diagnosis?.guidedSteps,
  ];

  const steps = candidates.find((item) => Array.isArray(item) && item.length > 0);
  return steps || [];
}

export default function DiagnosisScreen({ navigation, route }) {
  const routeParams = route.params || {};
  const {
    diagnosis,
    label,
    categoryTitle,
    mode,
    issueText = '',
    category,
  } = routeParams;
  const [openSections, setOpenSections] = useState({});
  const [inventoryTools, setInventoryTools] = useState([]);

  useEffect(() => {
    console.log('[DAD UI] final diagnosis object used by DiagnosisScreen:', diagnosis);
  }, [diagnosis]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      getTools().then((savedTools) => {
        if (active) setInventoryTools(savedTools);
      });

      return () => {
        active = false;
      };
    }, [])
  );

  if (mode === 'guided' || mode === 'free') {
    return (
      <InteractiveDiagnosisFlow
        navigation={navigation}
        mode={mode}
        issueText={issueText}
        category={category}
        categoryTitle={categoryTitle}
        label={label}
        diagnosis={diagnosis}
        diagnosisKey={routeParams.diagnosisKey}
      />
    );
  }

  const {
    issue,
    likelyIssue,
    yourDiagnosis,
    confidence,
    difficulty,
    estimatedTime,
    tools = [],
    whyThisMightBeHappening,
    possibleCauses = [],
    lessLikelyCauses = [],
    recommendedNextCheck,
    followUpQuestion,
  } = diagnosis;
  const diagnosisTitle = likelyIssue || yourDiagnosis || issue;
  const diagnosisSteps = getDiagnosisSteps(diagnosis);
  const displayTools = getDisplayTools({
    tools,
    diagnosisTitle,
    label,
    categoryTitle,
    issueText: routeParams.issueText,
  });
  function handleLetsDoIt() {
    navigation.navigate('GuidedSteps', {
      diagnosis,
      label,
      categoryTitle,
    });
  }

  function handleConnectToPro() {
    navigation.navigate('ConnectPro', {
      diagnosis,
      label,
      categoryTitle,
    });
  }

  function toggleSection(section) {
    animateLayoutChange();
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.verdictContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.verdictHeader}>
        <Text style={styles.kicker}>{label}</Text>
        <Text style={styles.title}>Your Diagnosis</Text>
      </View>

      {diagnosis?.aiUsed === false ? (
        <View style={styles.freeModeNotice}>
          <Text style={styles.freeModeText}>
            Free Mode: using basic repair guidance.
          </Text>
        </View>
      ) : null}

      <ScreenCard style={styles.verdictCard}>
        <Text style={styles.verdictLabel}>Likely issue</Text>
        <Text style={styles.verdictIssue}>{diagnosisTitle}</Text>
        <View style={styles.compactStatsRow}>
          <StatChip
            label="Confidence"
            value={confidence}
            valueColor={confidenceColor(confidence, theme.colors)}
          />
          <StatChip label="Difficulty" value={difficulty} valueColor={theme.colors.primary} />
          <StatChip label="Est. Time" value={estimatedTime} valueColor={theme.colors.accent} />
        </View>
      </ScreenCard>

      <DiagnosisAccordion
        title="Why we think this"
        isOpen={Boolean(openSections.why)}
        onToggle={() => toggleSection('why')}
      >
        {whyThisMightBeHappening ? (
          <Text style={styles.whySummary}>
            {whyThisMightBeHappening}
          </Text>
        ) : null}
        {possibleCauses.slice(0, 3).map((item, index) => (
          <View key={index} style={styles.evidenceRow}>
            <View style={styles.evidenceDot} />
            <View style={styles.evidenceCopy}>
              <View style={styles.evidenceHeader}>
                <Text style={styles.evidenceTitle}>
                  {item.cause}
                </Text>
                {item.likelihood ? (
                  <Text style={styles.likelihoodBadge} numberOfLines={1}>
                    {item.likelihood}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.evidenceText}>
                {shortEvidenceText(item.whyItFits)}
              </Text>
            </View>
          </View>
        ))}
        {lessLikelyCauses.length > 0 ? (
          <Text style={styles.detailHint}>
            Also possible: {lessLikelyCauses.slice(0, 2).map((item) => item.cause).join(', ')}
          </Text>
        ) : null}
        {recommendedNextCheck || followUpQuestion ? (
          <Text style={styles.detailHint}>
            Next: {recommendedNextCheck || followUpQuestion}
          </Text>
        ) : null}
        {!whyThisMightBeHappening && possibleCauses.length === 0 ? (
          <Text style={styles.emptyText}>Matched from your answers and category.</Text>
        ) : null}
      </DiagnosisAccordion>

      <DiagnosisAccordion
        title="Tools Needed"
        isOpen={Boolean(openSections.tools)}
        onToggle={() => toggleSection('tools')}
      >
        {displayTools.length > 0 ? (
          <ToolsNeededList tools={displayTools} inventoryTools={inventoryTools} sourceRepair={diagnosisTitle} />
        ) : (
          <Text style={styles.emptyText}>No tools listed for this diagnosis.</Text>
        )}
      </DiagnosisAccordion>

      <DiagnosisAccordion
        title="Step preview"
        isOpen={Boolean(openSections.steps)}
        onToggle={() => toggleSection('steps')}
      >
        {diagnosisSteps.length > 0 ? (
          <>
            <Text style={styles.previewIntro}>A quick look before the full guide.</Text>
            {diagnosisSteps.slice(0, 4).map((step, index) => (
              <View key={index} style={styles.previewStepRow}>
                <Text style={styles.previewStepNumber}>{index + 1}</Text>
                <Text style={styles.previewStepText}>
                  {getStepPreviewText(step)}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.emptyText}>The guide will walk you through it.</Text>
        )}
      </DiagnosisAccordion>

      <View style={styles.verdictActions}>
        <PrimaryButton title="LET'S DO IT!" onPress={handleLetsDoIt} />
        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.85}
          onPress={handleConnectToPro}
        >
          <Text style={styles.secondaryButtonText}>Call a Pro</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionWrap}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.homeLink}>Diagnose Another Dilemma</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function DiagnosisAccordion({ title, isOpen, onToggle, children }) {
  return (
    <ScreenCard style={styles.verdictAccordionCard}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.verdictAccordionHeader, pressed && styles.verdictAccordionHeaderPressed]}
      >
        <Text style={styles.verdictAccordionTitle}>{title}</Text>
        <Text style={styles.verdictAccordionIcon}>{isOpen ? '-' : '+'}</Text>
      </Pressable>
      {isOpen ? <View style={styles.verdictAccordionBody}>{children}</View> : null}
    </ScreenCard>
  );
}

function getToolDisplayName(tool) {
  if (typeof tool === 'string') return tool;
  return tool?.name || tool?.tool || tool?.title || '';
}

function getUniqueToolNames(tools = []) {
  const uniqueTools = tools.filter((tool, index) => {
    const name = getToolDisplayName(tool);
    return name && tools.findIndex((candidate) => normalizeToolName(getToolDisplayName(candidate)) === normalizeToolName(name)) === index;
  });

  return uniqueTools.map(getToolDisplayName).filter(Boolean);
}

function ToolsNeededList({ tools = [], inventoryTools = [], sourceRepair = 'Diagnosis' }) {
  const [shoppingMessage, setShoppingMessage] = useState('');
  const uniqueToolNames = getUniqueToolNames(tools);

  if (!uniqueToolNames.length) return null;

  const hasInventoryStatus = inventoryTools.length > 0;
  const isOwned = (name) =>
    inventoryTools.some((item) => item.owned && normalizeToolName(item.name) === normalizeToolName(name));
  const missingToolNames = hasInventoryStatus ? uniqueToolNames.filter((name) => !isOwned(name)) : uniqueToolNames;

  async function handleAddMissingToShoppingList() {
    if (!missingToolNames.length) return;

    await addShoppingItems(missingToolNames, sourceRepair, {
      status: 'needed',
      source: 'repair',
    });
    setShoppingMessage(`${missingToolNames.length} ${missingToolNames.length === 1 ? 'tool' : 'tools'} added to shopping list`);
  }

  return (
    <View style={styles.toolsNeededList}>
      <View style={styles.toolsGrid}>
        {uniqueToolNames.map((name, index) => {
          const owned = isOwned(name);

          return (
            <View key={`${name}-${index}`} style={styles.toolCardWithStatus}>
              <View style={styles.toolCardBody}>
                <ToolCard tool={name} />
              </View>
              {hasInventoryStatus ? (
                <Text style={[styles.toolsNeededStatus, owned ? styles.toolsNeededOwned : styles.toolsNeededMissing]}>
                  {owned ? 'Owned' : 'Needed'}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
      {missingToolNames.length > 0 ? (
        <TouchableOpacity
          style={styles.toolboxAction}
          activeOpacity={0.85}
          onPress={handleAddMissingToShoppingList}
        >
          <Text style={styles.toolboxActionText}>
            {hasInventoryStatus ? (
              'Add Missing Tools to Shopping List'
            ) : (
              'Add to Shopping List'
            )}
          </Text>
        </TouchableOpacity>
      ) : null}
      {shoppingMessage ? <Text style={styles.shoppingAddedText}>{shoppingMessage}</Text> : null}
    </View>
  );
}

function InteractiveDiagnosisFlow({
  navigation,
  mode,
  issueText,
  category,
  categoryTitle,
  label,
  diagnosis,
  diagnosisKey: routeDiagnosisKey,
}) {
  const flowKey = routeDiagnosisKey || diagnosis?.diagnosisKey || getFlowKey(category, categoryTitle, mode, issueText, label);
  // TODO: Replace mock question selection with API-generated diagnostic questions.
  const questions = getQuestionsByDiagnosisKey(flowKey) || MOCK_QUESTION_FLOWS[flowKey] || MOCK_QUESTION_FLOWS.generic;
  // TODO: Replace this mock result with the diagnosis result returned by the API.
  const result = diagnosis || getDiagnosisByKey(flowKey) || MOCK_RESULTS[flowKey] || MOCK_RESULTS.generic;
  const resultTools = getDisplayTools({
    tools: result.tools || result.toolsNeeded || [],
    diagnosisTitle: result.likelyIssue || result.issue,
    label,
    categoryTitle,
    issueText,
  });
  const freeDiagnosisTools =
    mode === 'free' && isSinkLeakIssue(issueText, result.likelyIssue, result.issue)
      ? freeDiagnosisSinkLeakTools
      : resultTools;
  const displayResult = {
    ...result,
    tools: freeDiagnosisTools,
    toolsNeeded: freeDiagnosisTools,
  };
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;
  const displayCategory = categoryTitle || label || result.likelyIssue || 'Home Issue';
  const mockDiagnosis = useMemo(
    () => buildMockDiagnosis({
      result: displayResult,
      issueText,
      label: label || displayCategory,
      categoryTitle: displayCategory,
      mode,
    }),
    [displayCategory, displayResult, issueText, label, mode],
  );

  useEffect(() => {
    fadeAnim.setValue(0);
    translateAnim.setValue(10);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep, fadeAnim, translateAnim]);

  function handleAnswer(answer) {
    const updatedAnswers = [...answers, answer];
    const nextStep = currentStep + 1;

    setAnswers(updatedAnswers);

    if (nextStep >= questions.length) {
      navigation.replace('DiagnosisSafety', {
        diagnosis: mockDiagnosis,
        label: label || 'Diagnosis',
        categoryTitle: displayCategory,
        nextRoute: 'GuidedSteps',
      });
      return;
    }

    setCurrentStep(nextStep);
  }

  const currentQuestion = questions[currentStep];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: translateAnim }],
        }}
      >
        <QuestionFlowScreen
          headerKicker={mode === 'guided' ? 'Guided Diagnosis' : 'Free Diagnosis'}
          headerTitle="Diagnosis"
          headerSubtitle={
            mode === 'free'
              ? 'Based on what you told us:'
              : `${displayCategory} Issue`
          }
          headerQuote={mode === 'free' ? issueText : undefined}
          currentStep={currentStep}
          totalSteps={questions.length}
          question={currentQuestion.text}
          options={currentQuestion.options}
          onAnswer={handleAnswer}
          onHome={() => navigation.navigate('Home')}
          homeLinkText="Start over"
        />
      </Animated.View>
    </ScrollView>
  );
}

function StatChip({ label, value, valueColor }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  verdictContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  verdictHeader: {
    marginBottom: theme.spacing.sm,
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
  verdictCard: {
    marginBottom: theme.spacing.sm,
  },
  verdictLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  verdictIssue: {
    fontSize: theme.typography.title,
    color: theme.colors.text,
    lineHeight: 30,
    fontWeight: '900',
  },
  compactStatsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  verdictActions: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  freeModeNotice: {
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.warningBackground,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  freeModeText: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.warningText,
    lineHeight: 18,
  },
  whySummary: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  evidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 8,
    marginRight: theme.spacing.sm,
  },
  evidenceCopy: {
    flex: 1,
  },
  evidenceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  evidenceTitle: {
    flex: 1,
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 22,
  },
  evidenceText: {
    marginTop: 4,
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 21,
  },
  likelihoodBadge: {
    maxWidth: 76,
    flexShrink: 0,
    textAlign: 'center',
    overflow: 'hidden',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.primary,
    fontSize: theme.typography.caption,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  secondaryButton: {
    marginTop: theme.spacing.xs,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardHighlight,
    paddingVertical: 15,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.body,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  actionWrap: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  homeLink: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    fontWeight: '600',
  },
  statChip: {
    flex: 1,
    minHeight: 72,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: theme.typography.caption,
    color: theme.colors.subtext,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    textAlign: 'center',
  },
  verdictAccordionCard: {
    marginBottom: theme.spacing.sm,
  },
  verdictAccordionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verdictAccordionHeaderPressed: {
    opacity: 0.78,
  },
  verdictAccordionTitle: {
    fontSize: theme.typography.sectionHeading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  verdictAccordionIcon: {
    fontSize: theme.typography.title,
    fontWeight: '800',
    color: theme.colors.primary,
    lineHeight: 26,
    paddingLeft: theme.spacing.md,
  },
  verdictAccordionBody: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  detailHint: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 22,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  previewStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  previewIntro: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.subtext,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
  previewStepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.primary,
    fontSize: theme.typography.caption,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'center',
    marginRight: theme.spacing.sm,
    marginTop: 1,
  },
  previewStepText: {
    flex: 1,
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 22,
  },
  toolsNeededList: {
    gap: theme.spacing.sm,
  },
  toolsGrid: {
    gap: theme.spacing.sm,
  },
  toolCardWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  toolCardBody: {
    flex: 1,
    minWidth: 0,
  },
  toolsNeededStatus: {
    minWidth: 64,
    textAlign: 'center',
    overflow: 'hidden',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
    fontSize: theme.typography.caption,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  toolsNeededOwned: {
    color: theme.colors.primary,
    backgroundColor: theme.colors.cardHighlight,
  },
  toolsNeededMissing: {
    color: theme.colors.warningText,
    backgroundColor: theme.colors.warningBackground,
  },
  toolboxAction: {
    marginTop: theme.spacing.xs,
    alignSelf: 'stretch',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardHighlight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toolboxActionText: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  shoppingAddedText: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 23,
  },
});
