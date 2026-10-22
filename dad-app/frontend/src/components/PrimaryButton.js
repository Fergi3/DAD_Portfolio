import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import theme from '../constants/theme';

function PrimaryButton({
  title,
  onPress,
  style,
  textStyle,
  disabled = false,
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.wrapper,
        disabled && styles.disabled,
        hovered && styles.wrapperHovered,
        pressed && styles.wrapperPressed,
        style,
      ]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.button,
            hovered && styles.buttonHovered,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text
            style={[styles.text, hovered && styles.textHovered, textStyle]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default React.memo(PrimaryButton);

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginTop: theme.spacing.md,
  },
  wrapperHovered: {
    transform: [{ translateY: -1 }],
  },
  wrapperPressed: {
    transform: [{ scale: 0.98 }],
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  buttonHovered: {
    backgroundColor: theme.colors.primaryPressed,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
  buttonPressed: {
    backgroundColor: '#294635',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  text: {
    color: theme.colors.white,
    fontSize: theme.typography.body,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  textHovered: {
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
});
