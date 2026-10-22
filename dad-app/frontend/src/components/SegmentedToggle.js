import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import theme from '../constants/theme';

export default function SegmentedToggle({
  options,
  value,
  onChange,
  style,
  activeTextColor = theme.colors.white,
  inactiveTextColor = theme.colors.primary,
  fillColor = theme.colors.primary,
}) {
  const [width, setWidth] = useState(0);
  const activeIndex = Math.max(0, options.findIndex((option) => option.key === value));
  const animatedIndex = useRef(new Animated.Value(activeIndex)).current;
  const availableWidth = Math.max(0, width - 8);
  const segmentWidth = availableWidth > 0 && options.length > 0 ? availableWidth / options.length : 0;

  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: activeIndex,
      tension: 150,
      friction: 18,
      useNativeDriver: false,
    }).start();
  }, [activeIndex, animatedIndex]);

  const translateX = useMemo(
    () =>
      animatedIndex.interpolate({
        inputRange: options.map((_, index) => index),
        outputRange: options.map((_, index) => index * segmentWidth),
      }),
    [animatedIndex, options, segmentWidth]
  );

  return (
    <View
      style={[styles.wrap, style]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeFill,
            {
              width: segmentWidth,
              backgroundColor: fillColor,
              transform: [{ translateX }],
            },
          ]}
        />
      ) : null}

      {options.map((option, index) => {
        const inputRange = options.map((_, optionIndex) => optionIndex);
        const color = animatedIndex.interpolate({
          inputRange,
          outputRange: options.map((_, optionIndex) =>
            optionIndex === index ? activeTextColor : inactiveTextColor
          ),
        });

        return (
          <Pressable
            key={option.key}
            style={({ pressed }) => [
              styles.segment,
              pressed && styles.segmentPressed,
            ]}
            onPress={() => onChange(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: option.key === value }}
          >
            <Animated.Text style={[styles.segmentText, { color }]} numberOfLines={1}>
              {option.label}
            </Animated.Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    flexDirection: 'row',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F2F6F1',
    padding: 4,
    overflow: 'hidden',
    ...theme.shadow.soft,
  },
  activeFill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: theme.radius.pill,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  segmentPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  segmentText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    textAlign: 'center',
  },
});
