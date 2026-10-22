import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../constants/theme';

function ScreenCard({ title, children, style }) {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.card}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

export default React.memo(ScreenCard);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.lg,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,

    // softer border (almost invisible)
    borderWidth: 1,
    borderColor: theme.colors.border,

    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,

    // modern soft shadow (iOS + Android)
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  title: {
    fontSize: theme.typography.subheading || 18,
    fontWeight: '700',
    color: theme.colors.text,

    marginBottom: theme.spacing.md,
    letterSpacing: 0.2,
  },

  content: {
    gap: theme.spacing.sm,
  },
});
