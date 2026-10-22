import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HOME_CATEGORIES from '../constants/homeCategories';
import theme from '../constants/theme';
import demoDiagnoses from '../data/demoDiagnoses';
import { getDiagnosisKeyFromText, RUNNING_TOILET_KEY, SINK_P_TRAP_LEAK_KEY } from '../data/diagnosisLibrary';
import { getRepairsTodo } from '../services/toolboxStorage';

const BROWSE_CATEGORIES = [
  { label: 'Plumbing', helper: 'Leaks • Toilets • Drains', icon: 'faucet', categoryId: 'bathroom' },
  { label: 'Electrical', helper: 'Lights • Outlets • Breakers', icon: 'lightbulb-outline', categoryId: 'electrical' },
  { label: 'Appliances', helper: 'Kitchen • Laundry', icon: 'fridge-outline', categoryId: 'kitchen' },
  { label: 'HVAC', helper: 'Heat • A/C • Airflow', icon: 'fan', categoryId: 'heating-cooling' },
  { label: 'Roofing', helper: 'Roof • Gutters', icon: 'home-roof', issue: 'Roof leak' },
  { label: 'Lawn & Garden', helper: 'Grass • Plants', icon: 'grass', issue: 'Lawn mower will not start' },
  { label: 'Automotive', helper: 'Car Care', icon: 'car-outline', issue: "Car won't start" },
  { label: 'Cleaning', helper: 'Mold • Stains', icon: 'spray-bottle', issue: 'Deep clean appliance' },
];

const KEYWORD_CATEGORIES = [
  {
    key: 'kitchen',
    categoryId: 'kitchen',
    label: 'Kitchen',
    keywords: [
      'kitchen',
      'sink',
      'faucet',
      'drain',
      'leak',
      'leaking',
      'water',
      'clog',
      'clogged',
      'pipe',
      'cabinet',
      'disposal',
      'garbage disposal',
      'dishwasher',
      'fridge',
      'refrigerator',
      'oven',
      'stove',
      'microwave',
    ],
  },
  {
    key: 'bathroom',
    categoryId: 'bathroom',
    label: 'Bathroom',
    keywords: [
      'bathroom',
      'toilet',
      'shower',
      'tub',
      'bathtub',
      'vanity',
      'sink',
      'faucet',
      'drain',
      'clog',
      'clogged',
      'plumbing',
      'leak',
      'leaking',
      'water',
    ],
  },
  {
    key: 'electrical',
    categoryId: 'electrical',
    label: 'Electrical',
    keywords: ['outlet', 'breaker', 'light', 'switch', 'power', 'spark', 'fuse', 'wiring', 'gfci'],
  },
  {
    key: 'laundry',
    categoryId: 'laundry',
    label: 'Laundry',
    keywords: ['laundry', 'washer', 'washing machine', 'dryer', 'vent', 'leak', 'leaking', 'water'],
  },
  {
    key: 'hvac',
    categoryId: 'heating-cooling',
    label: 'HVAC',
    keywords: ['heat', 'heating', 'furnace', 'filter', 'ac', 'air conditioner', 'cooling', 'thermostat'],
  },
  {
    key: 'doors-locks',
    categoryId: 'doors-locks',
    label: 'Doors & Locks',
    keywords: ['door', 'doors', 'lock', 'locks', 'hinge', 'hinges', 'knob', 'handle', 'deadbolt', 'latch'],
  },
  {
    key: 'automotive',
    label: 'Automotive',
    keywords: ['car', 'battery', 'tire', 'engine', 'brake', 'oil', 'windshield', 'jump start'],
  },
  {
    key: 'outdoor-yard',
    label: 'Lawn & Garden',
    keywords: ['mower', 'grass', 'lawn', 'gutter', 'fence', 'hose', 'sprinkler', 'roof'],
  },
  {
    key: 'cleaning',
    label: 'Cleaning',
    keywords: ['clean', 'cleaning', 'stain', 'odor', 'mold'],
  },
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countKeywordMatches(input, keywords) {
  return keywords.reduce((score, keyword) => {
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
    return pattern.test(input) ? score + 1 : score;
  }, 0);
}

function getBestCategoryFromInput(input) {
  const normalizedInput = input.trim().toLowerCase();
  if (!normalizedInput) return null;

  const scoredCategories = KEYWORD_CATEGORIES
    .map((category) => ({
      ...category,
      score: countKeywordMatches(normalizedInput, category.keywords),
    }))
    .filter((category) => category.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scoredCategories.length === 0) return null;
  if (scoredCategories[1]?.score === scoredCategories[0].score) return null;

  return scoredCategories[0];
}

function getSharedDiagnosisByKey(diagnosisKey) {
  if (diagnosisKey === SINK_P_TRAP_LEAK_KEY) return demoDiagnoses['leaky-sink'];
  if (diagnosisKey === RUNNING_TOILET_KEY) return demoDiagnoses['running-toilet'];
  return null;
}

function createFallbackDiagnosis(issueText, mode, categoryLabel = 'Custom Issue') {
  const diagnosisKey = getDiagnosisKeyFromText(issueText);
  const sharedDiagnosis = getSharedDiagnosisByKey(diagnosisKey);

  if (sharedDiagnosis) {
    return {
      ...sharedDiagnosis,
      whyThisMightBeHappening:
        sharedDiagnosis.whyThisMightBeHappening || `Based on what you entered: "${issueText}".`,
    };
  }

  const maintainCopy =
    mode === 'maintain'
      ? 'D.A.D. will turn this into a preventive checklist with tools, parts, and timing.'
      : 'D.A.D. has your description. Free-text diagnosis will connect to the full diagnosis engine soon.';

  return {
    aiUsed: false,
    issue: issueText,
    likelyIssue: issueText,
    confidence: mode === 'maintain' ? 'Maintenance plan' : 'Free mode',
    difficulty: 'Not yet rated',
    estimatedTime: 'Varies',
    tools: [],
    whyThisMightBeHappening: maintainCopy,
    recommendedNextCheck:
      mode === 'maintain'
        ? `This looks related to ${categoryLabel}. Start with the safest visible checks first.`
        : 'For now, use Guided Diagnosis if you want step-by-step questions for a specific home area.',
    diySuitability: 'unknown',
  };
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [issueText, setIssueText] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [activeMode, setActiveMode] = useState('diagnose');
  const [activeRepair, setActiveRepair] = useState(null);
  const introAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(introAnim, {
      toValue: 1,
      tension: 72,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [introAnim]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadActiveRepair() {
        const savedRepairs = await getRepairsTodo();
        if (!active) return;
        const inProgressRepairs = savedRepairs
          .filter((repair) => repair.status === 'in_progress' && !repair.complete && repair.id !== 'todo-1' && repair.id !== 'todo-2')
          .sort((a, b) => new Date(b.lastOpenedAt || 0).getTime() - new Date(a.lastOpenedAt || 0).getTime());
        setActiveRepair(inProgressRepairs[0] || null);
      }

      loadActiveRepair();
      return () => {
        active = false;
      };
    }, [])
  );

  function handleSelectCategory(category) {
    const existingCategory = HOME_CATEGORIES.find((item) => item.id === category.categoryId);
    if (existingCategory) {
      navigation.navigate('IssueSelection', { categoryId: existingCategory.id });
      return;
    }

    const issue = category.issue || category.label;
    setIssueText(issue);
    startDiagnosis(issue);
  }

  function startDiagnosis(nextIssueText = issueText) {
    const trimmedIssueText = nextIssueText.trim();

    if (!trimmedIssueText) {
      setValidationMessage(
        activeMode === 'maintain' ? 'Tell D.A.D. the task you want to maintain.' : 'Tell D.A.D. a little about the problem first.'
      );
      return;
    }

    setValidationMessage('');

    const diagnosisKey = getDiagnosisKeyFromText(trimmedIssueText);

    if (diagnosisKey) {
      const sharedDiagnosis = getSharedDiagnosisByKey(diagnosisKey);
      const isRunningToilet = diagnosisKey === RUNNING_TOILET_KEY;

      navigation.navigate('Diagnosis', {
        mode: 'free',
        diagnosisKey,
        issueText: trimmedIssueText,
        diagnosis: sharedDiagnosis,
        label: isRunningToilet ? 'Running Toilet' : 'Sink Leak',
        categoryTitle: 'Plumbing',
      });
      return;
    }

    const matchedCategory = getBestCategoryFromInput(trimmedIssueText);
    const existingCategory = matchedCategory?.categoryId
      ? HOME_CATEGORIES.find((category) => category.id === matchedCategory.categoryId)
      : null;

    if (activeMode === 'diagnose' && existingCategory) {
      navigation.navigate('IssueSelection', {
        categoryId: existingCategory.id,
        mode: 'guided',
        category: matchedCategory.key,
        issueText: trimmedIssueText,
      });
      return;
    }

    navigation.navigate('Diagnosis', {
      mode: activeMode === 'maintain' ? 'maintain' : 'free',
      category: matchedCategory?.key,
      issueText: trimmedIssueText,
      diagnosis: createFallbackDiagnosis(trimmedIssueText, activeMode, matchedCategory?.label),
      label: matchedCategory?.label || (activeMode === 'maintain' ? 'Maintenance Task' : 'Free Diagnosis'),
      categoryTitle: matchedCategory?.label || 'Custom Issue',
    });
  }

  function handleResumeRepair() {
    if (!activeRepair) return;

    navigation.navigate('GuidedSteps', {
      diagnosis: activeRepair.diagnosis,
      label: activeRepair.label,
      categoryTitle: activeRepair.categoryTitle,
      repairTodoId: activeRepair.id,
      resumeStepIndex: activeRepair.currentStepIndex || 0,
      resumeCompletedParts: activeRepair.completedParts || {},
    });
  }

  const placeholder =
    activeMode === 'maintain'
      ? 'What maintenance task are you looking for?'
      : 'Search by problem, appliance, or symptom...';
  const totalRepairSteps = activeRepair?.totalSteps || activeRepair?.diagnosis?.steps?.length || 1;
  const currentRepairStep = activeRepair ? Math.min((activeRepair.currentStepIndex || 0) + 1, totalRepairSteps) : 0;
  const translateY = introAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const headerControlLift = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [0, -6],
    extrapolate: 'clamp',
  });
  const actionHeaderTranslateY = Animated.add(translateY, headerControlLift);
  const isSmallPhone = width > 0 && width < 380;
  const isWideLayout = width >= 720;
  const categoryCardWidth = (width - theme.spacing.lg * 2 - 12) / 2;
  const headerMaxWidth = isWideLayout ? 620 : '100%';
  const heroTopPadding = Math.max(insets.top + (isSmallPhone ? 3 : 5), isSmallPhone ? 13 : 16);
  const heroMinHeight = (isSmallPhone ? 146 : 154) + Math.min(insets.top, 38);
  const sharedHeaderWidth = {
    width: headerMaxWidth,
    alignSelf: 'center',
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        <View
          style={[
            styles.hero,
            {
              minHeight: heroMinHeight,
              paddingTop: heroTopPadding,
              paddingBottom: isSmallPhone ? 8 : 10,
            },
          ]}
        >
          <View style={styles.heroShapeLarge} />
          <View style={styles.heroShapeSmall} />

          <View style={[styles.heroTopRow, sharedHeaderWidth, isSmallPhone && styles.heroTopRowCompact]}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroSubtitle}>What do you need help with today?</Text>
            </View>
            <View style={[styles.avatar, isSmallPhone && styles.avatarCompact]}>
              <Text style={[styles.avatarText, isSmallPhone && styles.avatarTextCompact]}>D.A.D.</Text>
            </View>
          </View>

          <Animated.View
            style={[
              styles.actionHeaderGroup,
              sharedHeaderWidth,
              {
                opacity: introAnim,
                transform: [{ translateY: actionHeaderTranslateY }],
              },
            ]}
          >
            <View style={[styles.searchBar, isSmallPhone && styles.searchBarCompact]}>
              <MaterialCommunityIcons name="magnify" size={22} color={theme.colors.primary} />
              <TextInput
                value={issueText}
                onChangeText={(text) => {
                  setIssueText(text);
                  if (validationMessage) setValidationMessage('');
                }}
                placeholder={placeholder}
                placeholderTextColor="#6B786B"
                style={styles.searchInput}
                returnKeyType="search"
                onSubmitEditing={() => startDiagnosis()}
              />
              <Pressable
                onPress={() => navigation.navigate('CustomProblem', { startWithPhoto: true })}
                style={({ pressed }) => [styles.cameraButton, isSmallPhone && styles.cameraButtonCompact, pressed && styles.tapScale]}
                accessibilityLabel="Diagnose with photo"
              >
                <MaterialCommunityIcons name="camera-outline" size={20} color={theme.colors.white} />
              </Pressable>
            </View>

            {validationMessage ? <Text style={styles.validationText}>{validationMessage}</Text> : null}

          </Animated.View>
        </View>

        <Animated.View style={{ opacity: introAnim, transform: [{ translateY }] }}>
          {activeRepair ? (
            <Pressable onPress={handleResumeRepair} style={({ pressed }) => [styles.resumeCard, pressed && styles.tapScale]}>
              <View style={styles.resumeIcon}>
                <MaterialCommunityIcons name="progress-wrench" size={18} color={theme.colors.white} />
              </View>
              <View style={styles.resumeCopy}>
                <Text style={styles.resumeTitle}>{activeRepair.name}</Text>
                {activeRepair.location ? <Text style={styles.resumeLocation}>{activeRepair.location}</Text> : null}
                <Text style={styles.resumeMeta}>
                  Step {currentRepairStep} of {totalRepairSteps}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} />
            </Pressable>
          ) : null}

          <SectionHeader title="Browse by Category" />
          <View style={styles.categoryGrid}>
            {BROWSE_CATEGORIES.map((category) => (
              <Pressable
                key={category.label}
                onPress={() => handleSelectCategory(category)}
                style={({ pressed }) => [styles.categoryItem, { width: categoryCardWidth }, pressed && styles.tapScale]}
                accessibilityRole="button"
                accessibilityLabel={`${category.label}: ${category.helper}`}
              >
                <View style={styles.categoryIcon}>
                  <MaterialCommunityIcons name={category.icon} size={28} color={theme.colors.primary} />
                </View>
                <View style={styles.categoryCopy}>
                  <Text style={styles.categoryLabel} numberOfLines={1} ellipsizeMode="tail">
                    {category.label}
                  </Text>
                  <Text style={styles.categoryHelper} numberOfLines={1} ellipsizeMode="tail">
                    {category.helper}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

function SectionHeader({ title }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 112,
  },
  hero: {
    backgroundColor: '#254B37',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: theme.spacing.lg,
    overflow: 'hidden',
    ...theme.shadow.soft,
  },
  heroShapeLarge: {
    position: 'absolute',
    width: 196,
    height: 148,
    borderRadius: 42,
    backgroundColor: '#3D7558',
    opacity: 0.28,
    right: -72,
    top: -30,
    transform: [{ rotate: '-18deg' }],
  },
  heroShapeSmall: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 32,
    backgroundColor: '#183B2A',
    opacity: 0.27,
    left: -44,
    bottom: -34,
    transform: [{ rotate: '18deg' }],
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: 9,
  },
  heroTopRowCompact: {
    marginBottom: 8,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroSubtitle: {
    color: theme.colors.white,
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 13,
    marginTop: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCompact: {
    width: 34,
    height: 34,
    borderRadius: 12,
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0,
  },
  avatarTextCompact: {
    fontSize: 9,
  },
  actionHeaderGroup: {
    borderRadius: 25,
    padding: 0,
  },
  searchBar: {
    minHeight: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: '#FFFEFB',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    paddingLeft: 16,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...theme.shadow.cardElevated,
  },
  searchBarCompact: {
    minHeight: 54,
    paddingLeft: 14,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: theme.spacing.sm,
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButtonCompact: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  validationText: {
    marginTop: 8,
    marginLeft: theme.spacing.md,
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.warningText,
  },
  resumeCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: 18,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.14)',
    paddingHorizontal: 13,
    paddingVertical: 10,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...theme.shadow.soft,
  },
  resumeIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeCopy: {
    flex: 1,
    minWidth: 0,
  },
  resumeTitle: {
    fontSize: theme.typography.body,
    lineHeight: 21,
    fontWeight: '800',
    color: theme.colors.text,
  },
  resumeLocation: {
    marginTop: 3,
    fontSize: theme.typography.caption,
    lineHeight: 16,
    color: theme.colors.subtext,
    fontWeight: '600',
  },
  resumeMeta: {
    marginTop: 1,
    fontSize: theme.typography.caption,
    color: theme.colors.subtext,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: theme.spacing.xl,
    marginBottom: 12,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: 0,
  },
  categoryGrid: {
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: theme.spacing.lg,
  },
  categoryItem: {
    height: 102,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    ...theme.shadow.soft,
  },
  categoryIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCopy: {
    width: '100%',
    minWidth: 0,
    marginTop: 6,
    alignItems: 'center',
  },
  categoryLabel: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '750',
    textAlign: 'center',
  },
  categoryHelper: {
    marginTop: 1,
    color: '#788276',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  tapScale: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
