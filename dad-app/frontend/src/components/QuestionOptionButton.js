import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import theme from '../constants/theme';

function QuestionOptionButton({ label, onPress, selected = false, disabled = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.option,
        pressed && styles.optionPressed,
        selected && styles.optionSelected,
        disabled && !selected && styles.optionDisabled,
      ]}
    >
      <Text style={[styles.text, selected && styles.textActive]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export default React.memo(QuestionOptionButton);

const styles = StyleSheet.create({
  option: {
    backgroundColor: theme.colors.cardHighlight,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.16)',
    borderRadius: theme.radius.md,
    minHeight: 56,
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  optionPressed: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: 'rgba(53,95,72,0.48)',
    transform: [{ scale: 0.995 }],
  },
  optionSelected: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.primary,
  },
  optionDisabled: {
    opacity: 0.62,
  },
  text: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'left',
  },
  textActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});

