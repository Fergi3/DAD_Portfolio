import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import ProgressIndicator from './ProgressIndicator';
import QuestionOptionButton from './QuestionOptionButton';
import QuestionStepCard from './QuestionStepCard';
import theme from '../constants/theme';

export default function QuestionFlowScreen({
  headerSubtitle,
  headerQuote,
  currentStep,
  totalSteps,
  question,
  options = [],
  onAnswer,
  onHome,
  homeLinkText = 'Start over',
}) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;
  const answerTimerRef = useRef(null);
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    clearTimeout(answerTimerRef.current);
    answerTimerRef.current = null;
    setSelectedOption(null);
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

    return () => clearTimeout(answerTimerRef.current);
  }, [question, fadeAnim, translateAnim]);

  function handleAnswer(option) {
    if (selectedOption !== null) return;

    setSelectedOption(option);
    answerTimerRef.current = setTimeout(() => {
      answerTimerRef.current = null;
      onAnswer(option);
    }, 220);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {(headerSubtitle || headerQuote) && (
        <View style={styles.header}>
          {headerSubtitle ? <Text style={styles.context}>{headerSubtitle}</Text> : null}
          {headerQuote ? (
            <View style={styles.quoteBox}>
              <Text style={styles.quoteText}>{headerQuote}</Text>
            </View>
          ) : null}
        </View>
      )}

      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: translateAnim }],
        }}
      >
        <ProgressIndicator current={currentStep + 1} total={totalSteps} />

        <QuestionStepCard question={question}>
          {options.map((option) => (
            <QuestionOptionButton
              key={option}
              label={option}
              selected={selectedOption === option}
              disabled={selectedOption !== null}
              onPress={() => handleAnswer(option)}
            />
          ))}
        </QuestionStepCard>
      </Animated.View>

      {onHome ? (
        <View style={styles.homeLinkWrap}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onHome}
            style={styles.startOverButton}
            accessibilityRole="button"
            accessibilityLabel={homeLinkText}
          >
            <Text style={styles.homeLink}>{homeLinkText}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
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
    paddingBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  context: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  quoteBox: {
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.cardHighlight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  quoteText: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 25,
  },
  homeLinkWrap: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  startOverButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  homeLink: {
    color: theme.colors.subtext,
    fontSize: theme.typography.helper,
    fontWeight: '600',
  },
});
