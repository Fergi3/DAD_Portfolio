import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import theme from '../constants/theme';

const LETTERS = ['D', 'A', 'D'];

export default function DadWordmark({
  compact = false,
  badge = false,
  subtitle = null,
  color = theme.colors.white,
  subtitleColor = 'rgba(255,255,255,0.55)',
}) {
  return (
    <View style={styles.wordmarkBlock}>
      <View style={styles.wordmarkRow}>
        {LETTERS.map((letter, index) => (
          <View
            key={letter + index}
            style={[
              styles.letterWrap,
              compact && styles.letterWrapCompact,
              badge && styles.letterWrapBadge,
              index === 1 && styles.letterWrapMiddle,
              compact && index === 1 && styles.letterWrapMiddleCompact,
              badge && index === 1 && styles.letterWrapMiddleBadge,
            ]}
          >
            <Text
              style={[
                styles.letterText,
                compact && styles.letterTextCompact,
                badge && styles.letterTextBadge,
                { color },
              ]}
            >
              {letter}
            </Text>
          </View>
        ))}
      </View>

      {subtitle ? (
        <Text style={[styles.wordmarkSubtitle, compact && styles.wordmarkSubtitleCompact, { color: subtitleColor }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wordmarkBlock: {
    alignItems: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterWrap: {
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  letterWrapCompact: {
    minWidth: 18,
    marginHorizontal: 1,
  },
  letterWrapMiddle: {
    marginHorizontal: 12,
  },
  letterWrapMiddleCompact: {
    marginHorizontal: 5,
  },
  letterWrapBadge: {
    minWidth: 11,
    marginHorizontal: 0,
  },
  letterWrapMiddleBadge: {
    marginHorizontal: 2,
  },
  letterText: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: undefined }),
  },
  letterTextCompact: {
    fontSize: 18,
    letterSpacing: 0.5,
  },
  letterTextBadge: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  wordmarkSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.5,
    marginTop: 4,
    textAlign: 'center',
  },
  wordmarkSubtitleCompact: {
    fontSize: 7,
    marginTop: 1,
    letterSpacing: 0.8,
  },
});
