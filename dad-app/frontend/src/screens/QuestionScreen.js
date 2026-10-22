import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import {
  createDiagnosisRequest,
  fetchQuestions,
  getApiBaseUrl,
} from '../services/diagnoseService';
import theme from '../constants/theme';
import ScreenCard from '../components/ScreenCard';
import PrimaryButton from '../components/PrimaryButton';
import QuestionFlowScreen from '../components/QuestionFlowScreen';

const CUSTOM_OPTION_LABEL = 'Something else?';

export default function QuestionScreen({ navigation, route }) {
  const {
    problemType,
    label,
    categoryTitle,
    imageOrModelData,
    userSkillLevel,
  } = route.params;

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const submitGuardRef = useRef(false);

  useEffect(() => {
    async function loadQuestions() {
      try {
        const data = await fetchQuestions(problemType);
        setQuestions(data);
      } catch (err) {
        setFetchError(
          `Could not load questions from ${getApiBaseUrl()}. Make sure the backend API is running on port 3000 and reachable from this device or browser.`
        );
      } finally {
        setLoadingQ(false);
      }
    }

    loadQuestions();
  }, [problemType]);

  useEffect(() => {
    const resumeIndex = route.params?.resumeIndex;
    const resumeAnswers = route.params?.resumeAnswers;

    if (typeof resumeIndex === 'number') {
      setCurrentIndex(resumeIndex);
    }

    if (Array.isArray(resumeAnswers)) {
      setAnswers(resumeAnswers);
    }

  }, [
    route.params?.resumeIndex,
    route.params?.resumeAnswers,
  ]);

  useEffect(() => {
    navigation.setParams({
      questionIndex: currentIndex,
      questionAnswers: answers,
    });
  }, [navigation, currentIndex, answers]);

  const submitFinalAnswers = useCallback(async (
    updatedAnswers,
  ) => {
    if (submitting || submitGuardRef.current) return;

    submitGuardRef.current = true;
    setSubmitting(true);
    const diagnosisRequest = createDiagnosisRequest(
      problemType,
      updatedAnswers,
      '',
      {
        category: categoryTitle,
        imageOrModelData,
        userSkillLevel,
      },
    );

    navigation.navigate('DiagnosisSafety', {
      diagnosisRequest,
      label,
      categoryTitle,
      nextRoute: 'GuidedSteps',
      returnToQuestion: {
        problemType,
        label,
        categoryTitle,
        resumeIndex: currentIndex,
        resumeAnswers: updatedAnswers,
      },
    });
    setSubmitting(false);
    setTimeout(() => {
      submitGuardRef.current = false;
    }, 700);
  }, [
    categoryTitle,
    currentIndex,
    imageOrModelData,
    label,
    navigation,
    problemType,
    submitting,
    userSkillLevel,
  ]);

  const handleAnswer = useCallback(async (selectedOption) => {
    const updatedAnswers = [...answers, selectedOption];
    setAnswers(updatedAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      return;
    }

    await submitFinalAnswers(updatedAnswers);
  }, [answers, currentIndex, questions.length, submitFinalAnswers]);

  const handleCustomOption = useCallback(() => {
    navigation.navigate('CustomProblem', {
      problemType,
      previousAnswers: answers,
      imageOrModelData,
      userSkillLevel,
      label,
      categoryTitle,
      returnToQuestion: {
        problemType,
        label,
        categoryTitle,
        resumeIndex: currentIndex,
        resumeAnswers: answers,
      },
    });
  }, [
    answers,
    categoryTitle,
    currentIndex,
    imageOrModelData,
    label,
    navigation,
    problemType,
    userSkillLevel,
  ]);

  if (loadingQ || submitting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.statusText}>{loadingQ ? 'Loading questions...' : 'Analyzing your answers...'}</Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centered}>
        <ScreenCard style={styles.errorCard}>
          <Text style={styles.errorText}>{fetchError}</Text>
          <PrimaryButton title="Go Back" onPress={() => navigation.goBack()} />
        </ScreenCard>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];
  const options = currentQuestion.options.includes(CUSTOM_OPTION_LABEL)
    ? currentQuestion.options
    : [...currentQuestion.options, CUSTOM_OPTION_LABEL];

  return (
    <QuestionFlowScreen
      headerKicker="Guided Diagnosis"
      headerTitle="Diagnosis"
      headerSubtitle={`${categoryTitle} Issue`}
      currentStep={currentIndex}
      totalSteps={questions.length}
      question={currentQuestion.text}
      options={options}
      onAnswer={(option) =>
        option === CUSTOM_OPTION_LABEL ? handleCustomOption() : handleAnswer(option)
      }
      onHome={() => navigation.navigate('Home')}
      homeLinkText="Start over"
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  statusText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
  },
  errorCard: {
    width: '100%',
    maxWidth: 460,
  },
  errorText: {
    fontSize: theme.typography.body,
    color: theme.colors.danger,
    lineHeight: 21,
    marginBottom: theme.spacing.md,
  },
});
