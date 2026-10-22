import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import PrimaryButton from '../components/PrimaryButton';
import ScreenCard from '../components/ScreenCard';
import theme from '../constants/theme';
import { RUNNING_TOILET_KEY } from '../data/diagnosisLibrary';
import { submitAnswers } from '../services/diagnoseService';
import { getDisclaimerText, getStopIfList, getSuitabilityMeta } from '../utils/safetyHelpers';

export default function DiagnosisSafetyScreen({ navigation, route }) {
  const {
    diagnosis: initialDiagnosis,
    diagnosisRequest,
    label,
    categoryTitle,
    nextRoute = 'GuidedSteps',
  } = route.params;
  const requestKey = useMemo(
    () => (diagnosisRequest ? JSON.stringify(diagnosisRequest) : ''),
    [diagnosisRequest],
  );
  const lastRequestKeyRef = useRef('');
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis || null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(Boolean(diagnosisRequest && !initialDiagnosis));
  const [diagnosisError, setDiagnosisError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [openSections, setOpenSections] = useState({});

  const suitability = useMemo(
    () => getSuitabilityMeta(diagnosis?.diySuitability, theme.colors),
    [diagnosis?.diySuitability]
  );
  const disclaimerText = getDisclaimerText(diagnosis?.disclaimer);
  const isRunningToilet = diagnosis?.diagnosisKey === RUNNING_TOILET_KEY;
  const stopConditions = isRunningToilet
    ? [
        'Water begins overflowing or cannot be controlled.',
        'The tank, bowl, or another part appears cracked or damaged.',
        'What you see does not match this guided repair.',
      ]
    : getStopIfList(diagnosis?.stopIf || diagnosis?.stopAndCallAProIf);
  const professionalGuidance = isRunningToilet
    ? 'Call a plumber if the toilet still runs after the guided checks or the repair requires replacing the shut-off valve, tank, or flush valve assembly.'
    : diagnosis?.callAPro || 'Call a qualified professional when the repair is beyond your comfort level or requires licensed work.';

  useEffect(() => {
    let isActive = true;

    async function loadDiagnosis() {
      if (!diagnosisRequest || !requestKey || lastRequestKeyRef.current === requestKey) {
        return;
      }

      lastRequestKeyRef.current = requestKey;
      setDiagnosis(null);
      setLoadingDiagnosis(true);
      setDiagnosisError('');

      try {
        console.log('[DAD Results] diagnosis request used by results screen:', diagnosisRequest);
        const result = await submitAnswers(
          diagnosisRequest.problemType,
          diagnosisRequest.answers,
          diagnosisRequest.customProblemDescription,
          diagnosisRequest.context,
        );

        if (isActive) {
          console.log('[DAD Results] final diagnosis object used by UI:', result);
          setDiagnosis(result);
        }
      } catch (error) {
        console.error('[DAD Results] diagnosis load failed:', error);
        if (isActive) {
          lastRequestKeyRef.current = '';
          setDiagnosisError('Could not get a diagnosis. Please check the backend and try again.');
        }
      } finally {
        if (isActive) {
          setLoadingDiagnosis(false);
        }
      }
    }

    loadDiagnosis();

    return () => {
      isActive = false;
    };
  }, [diagnosisRequest, requestKey, retryCount]);

  function handleRetry() {
    lastRequestKeyRef.current = '';
    setDiagnosis(null);
    setLoadingDiagnosis(Boolean(diagnosisRequest));
    setRetryCount((value) => value + 1);
  }

  function handleContinue() {
    if (!diagnosis) return;

    if (nextRoute === 'GuidedSteps') {
      navigation.navigate('ToolsForRepair', {
        recommendedTools: diagnosis.tools || diagnosis.toolsNeeded || [],
        sourceRepair: diagnosis.issue || diagnosis.likelyIssue || label,
        diagnosis,
        label,
        categoryTitle,
        repairEntryPoint: 'start',
      });
      return;
    }

    navigation.navigate(nextRoute, {
      diagnosis,
      label,
      categoryTitle,
    });
  }

  function handleConnectToPro() {
    if (!diagnosis) return;

    navigation.navigate('ConnectPro', {
      diagnosis,
      label,
      categoryTitle,
    });
  }

  function toggleSection(section) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  if (loadingDiagnosis || !diagnosis) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.loadingHeader}>
          <Text style={styles.kicker}>{label}</Text>
          <Text style={styles.title}>Analyzing Repair</Text>
          <Text style={styles.subtitle}>D.A.D. is building a safe next step.</Text>
        </View>

        <ScreenCard style={styles.loadingCard}>
          {diagnosisError ? null : (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          )}
          <Text style={styles.loadingTitle}>
            {diagnosisError ? 'Diagnosis paused' : 'Building your plan...'}
          </Text>
          <Text style={styles.loadingText}>
            {diagnosisError ||
              'Hang tight. This should only take a moment.'}
          </Text>
          {diagnosisError ? <PrimaryButton title="Try Again" onPress={handleRetry} /> : null}
        </ScreenCard>

        <View style={styles.skeletonCard} />
        <View style={[styles.skeletonCard, styles.skeletonCardShort]} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>{label}</Text>
          <View
            style={[
              styles.suitabilityBadge,
              {
                backgroundColor: suitability.badgeBackground,
                borderColor: suitability.badgeBorder,
              },
            ]}
          >
            <Text style={[styles.suitabilityBadgeText, { color: suitability.badgeText }]}>
              {suitability.label}
            </Text>
          </View>
        </View>

        {diagnosis?.aiUsed === false ? (
          <View style={styles.freeModeNotice}>
            <Text style={styles.freeModeText}>
              Free Mode: using basic repair guidance.
            </Text>
          </View>
        ) : null}

        <View style={styles.beforeStartCard}>
          <View style={styles.beforeStartHeadingRow}>
            <View style={styles.safetyIconBadge}>
              <MaterialCommunityIcons name="shield-check-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.beforeStartTitle}>Before You Continue</Text>
          </View>
          <Text style={styles.contextText}>{disclaimerText}</Text>
        </View>

        <AccordionSection
          title="Stop If..."
          isOpen={Boolean(openSections.stop)}
          onToggle={() => toggleSection('stop')}
          warning
        >
          {stopConditions.map((item, index) => (
            <SafetyBullet key={index} text={item} warning />
          ))}
        </AccordionSection>

        <AccordionSection
          title="Call a Professional"
          isOpen={Boolean(openSections.pro)}
          onToggle={() => toggleSection('pro')}
        >
          <SafetyBullet text={professionalGuidance} />
          <Pressable
            onPress={handleConnectToPro}
            style={({ pressed }) => [styles.proButton, pressed && styles.proButtonPressed]}
          >
            <Text style={styles.proButtonText}>Connect to a Pro</Text>
          </Pressable>
        </AccordionSection>
      </ScrollView>

      <View style={styles.stickyActionBar}>
        <PrimaryButton
          title="See What You'll Need"
          onPress={handleContinue}
          style={styles.continueButton}
        />
      </View>
    </View>
  );
}

function SafetyBullet({ text, warning = false }) {
  return (
    <View style={styles.beforeStartRow}>
      <View style={[styles.beforeStartBullet, warning && styles.warningBullet]} />
      <Text style={[styles.bodyText, warning && styles.warningText]}>{text}</Text>
    </View>
  );
}

function AccordionSection({ title, isOpen, onToggle, children, warning = false }) {
  return (
    <View style={[styles.accordionCard, warning && styles.accordionWarningCard]}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.accordionHeader, pressed && styles.accordionHeaderPressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={[styles.accordionTitle, warning && styles.accordionWarningTitle]}>
          {title}
        </Text>
        <MaterialCommunityIcons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={warning ? theme.colors.warningText : theme.colors.subtext}
        />
      </Pressable>
      {isOpen ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.layout.repairActionBarHeight + theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  loadingHeader: {
    marginBottom: theme.spacing.lg,
  },
  kicker: {
    flex: 1,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  title: {
    fontSize: theme.typography.heading,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  suitabilityBadge: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  suitabilityBadgeText: {
    fontSize: theme.typography.caption,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 24,
  },
  beforeStartCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.18)',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
  },
  beforeStartHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  safetyIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
  },
  beforeStartTitle: {
    flex: 1,
    fontSize: theme.typography.sectionHeading,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  stickyActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    ...theme.shadow.cardElevated,
  },
  continueButton: {
    marginTop: 0,
  },
  bodyText: {
    flex: 1,
    fontSize: theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  contextText: {
    fontSize: theme.typography.caption,
    fontWeight: '500',
    color: theme.colors.subtext,
    lineHeight: 19,
  },
  warningText: {
    color: theme.colors.warningText,
    fontWeight: '600',
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
  loadingCard: {
    alignItems: 'stretch',
  },
  loadingTitle: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.title,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 24,
    textAlign: 'center',
  },
  skeletonCard: {
    height: 118,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    opacity: 0.65,
  },
  skeletonCardShort: {
    height: 78,
  },
  beforeStartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  beforeStartBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 8,
    marginRight: theme.spacing.sm,
  },
  warningBullet: {
    backgroundColor: theme.colors.warning,
  },
  accordionCard: {
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  accordionWarningCard: {
    backgroundColor: theme.colors.warningBackground,
    borderColor: theme.colors.warningBorder,
  },
  accordionHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accordionHeaderPressed: {
    opacity: 0.75,
  },
  accordionTitle: {
    flex: 1,
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  accordionWarningTitle: {
    color: theme.colors.warningText,
  },
  accordionBody: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  proButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  proButtonPressed: {
    opacity: 0.82,
  },
  proButtonText: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.white,
  },
});
