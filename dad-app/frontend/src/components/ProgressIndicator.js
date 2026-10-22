import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import theme from '../constants/theme';

function ProgressIndicator({ current, total, label = 'Diagnosis progress' }) {
  const progress = total > 0 ? current / total : 0;
  const progressAnim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>{current} of {total}</Text>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: current, text: `${current} of ${total}` }}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

export default React.memo(ProgressIndicator);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  label: {
    color: theme.colors.subtext,
    fontSize: theme.typography.caption,
    fontWeight: '600',
  },
  count: {
    color: theme.colors.subtext,
    fontSize: theme.typography.caption,
    fontWeight: '600',
  },
  track: {
    height: 4,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
  },
});
