import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
import theme from '../constants/theme';
import { createDiagnosisRequest } from '../services/diagnoseService';

const CUSTOM_OPTION_LABEL = 'Something else?';
const CATEGORY_PLACEHOLDERS = {
  Kitchen: 'Example: Water is dripping under the kitchen sink when I run the faucet',
  Bathroom: 'Example: The toilet keeps running and the handle feels loose',
  Laundry: 'Example: The washer leaks from the front during the spin cycle',
  'Heating & Cooling': 'Example: The AC is running but the house is not cooling down',
  Electrical: 'Example: One outlet stopped working after the breaker tripped',
  'Doors & Locks': 'Example: The front door latch sticks unless I lift the handle',
};

const PROBLEM_PLACEHOLDERS = {
  'leaky-sink': 'Example: The sink is leaking from the drain pipe under the cabinet',
  'clogged-disposal': 'Example: The disposal hums but will not spin or drain',
  'dishwasher-not-draining': 'Example: Dirty water is sitting at the bottom of the dishwasher',
  'running-toilet': 'Example: The toilet keeps refilling every few minutes',
  'washer-leaking': 'Example: Water pools under the washer during the rinse cycle',
  'dryer-not-heating': 'Example: The dryer spins, but the clothes stay cold and damp',
  'thermostat-issues': 'Example: The thermostat is on, but the temperature never changes',
  'hvac-maintenance': 'Example: The air coming from the vents feels weak',
  'tripped-breaker': 'Example: The breaker trips again when I turn the light on',
  'door-hardware': 'Example: The door hinge squeaks and the door will not close flush',
};

function getCustomProblemPlaceholder(categoryTitle, problemType) {
  return (
    CATEGORY_PLACEHOLDERS[categoryTitle] ||
    PROBLEM_PLACEHOLDERS[problemType] ||
    'Example: Describe what you see, hear, smell, or what changed recently'
  );
}

export default function CustomProblemScreen({ navigation, route }) {
  const {
    problemType,
    previousAnswers = [],
    imageOrModelData,
    userSkillLevel,
    label = CUSTOM_OPTION_LABEL,
    categoryTitle,
    returnToQuestion,
  } = route.params;
  const [customProblemDescription, setCustomProblemDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitGuardRef = useRef(false);
  const inputPlaceholder = getCustomProblemPlaceholder(categoryTitle, problemType);

  function handleContinue() {
    if (submitting || submitGuardRef.current) return;

    const description = customProblemDescription.trim();

    if (!description) {
      Alert.alert('Add a quick description', 'Describe what is going on before continuing.', [
        { text: 'OK' },
      ]);
      return;
    }

    submitGuardRef.current = true;
    setSubmitting(true);
    console.log('[DAD Custom] customProblemDescription before submit:', description);

    const diagnosisAnswers = [...previousAnswers, CUSTOM_OPTION_LABEL];
    const diagnosisRequest = createDiagnosisRequest(
      problemType,
      diagnosisAnswers,
      description,
      {
        category: categoryTitle,
        imageOrModelData,
        userSkillLevel,
      },
    );

    console.log('CUSTOM TEXT:', description);
    console.log('PAYLOAD SENT:', diagnosisRequest);
    console.log('[DAD Custom] diagnosis request payload:', diagnosisRequest);
    navigation.replace('DiagnosisSafety', {
      diagnosisRequest,
      label,
      categoryTitle,
      nextRoute: 'GuidedSteps',
      returnToQuestion: {
        ...returnToQuestion,
        resumeAnswers: diagnosisAnswers,
        resumeCustomProblemDescription: description,
      },
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Tell D.A.D. what's going on</Text>
          <Text style={styles.subtitle}>Describe your problem in your own words</Text>
        </View>

        <View style={styles.inputWrap}>
          <TextInput
            autoFocus
            value={customProblemDescription}
            onChangeText={setCustomProblemDescription}
            placeholder={inputPlaceholder}
            placeholderTextColor={theme.colors.subtext}
            multiline
            textAlignVertical="top"
            style={styles.input}
            returnKeyType="default"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title={submitting ? 'Starting...' : 'Continue'}
          onPress={handleContinue}
          disabled={submitting}
        />
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.heading,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 38,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 24,
  },
  inputWrap: {
    minHeight: 220,
  },
  input: {
    minHeight: 220,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    color: theme.colors.text,
    fontSize: theme.typography.bodyLarge,
    lineHeight: 26,
    ...theme.shadow.soft,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  backButton: {
    marginTop: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  backButtonPressed: {
    opacity: 0.65,
  },
  backButtonText: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    fontWeight: '700',
  },
});
