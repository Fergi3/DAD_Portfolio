import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import theme from '../constants/theme';

function QuestionStepCard({ question, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.question}>{question}</Text>
      {children ? <View style={styles.answers}>{children}</View> : null}
    </View>
  );
}

export default React.memo(QuestionStepCard);

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.10)',
    borderRadius: theme.radius.lg,
  },
  question: {
    fontSize: theme.typography.sectionHeading,
    color: theme.colors.text,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  answers: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
});
