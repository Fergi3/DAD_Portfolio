import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
import theme from '../constants/theme';

const DAD_PRIMARY_LOGO = require('../../assets/DadPrimaryLogo.png');
const LOGO_ASPECT_RATIO = 3 / 2;

export default function IntroScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const compactHeight = height < 700;

  const logoWidth = useMemo(
    () => Math.min(width * 1.45, height * 0.82, 620),
    [height, width]
  );
  useEffect(() => {
    heroAnim.setValue(0);
    contentAnim.setValue(0);

    Animated.sequence([
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentAnim, heroAnim]);

  return (
    <SafeAreaView style={styles.screen}>
      <View
        style={[
          styles.content,
          compactHeight && styles.contentCompact,
        ]}
      >
        <Animated.View
          style={{
            opacity: heroAnim,
            transform: [
              {
                scale: heroAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1],
                }),
              },
            ],
          }}
        >
          <Image
            source={DAD_PRIMARY_LOGO}
            accessibilityLabel="D.A.D. — Diagnose and Do"
            resizeMode="contain"
            style={{
              width: logoWidth,
              height: logoWidth / LOGO_ASPECT_RATIO,
            }}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.actions,
            compactHeight && styles.actionsCompact,
            {
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.supportingText}>
            Fix home problems with clear, guided steps.
          </Text>

          <PrimaryButton
            title="LETS DO IT!"
            onPress={() => navigation.replace('Home')}
            style={styles.buttonWrap}
            textStyle={styles.buttonText}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
    transform: [{ translateY: -theme.spacing.lg }],
  },
  contentCompact: {
    paddingVertical: theme.spacing.lg,
    transform: [{ translateY: -theme.spacing.sm }],
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    marginTop: -theme.spacing.xxl,
  },
  actionsCompact: {
    marginTop: -theme.spacing.xl,
  },
  supportingText: {
    width: '100%',
    maxWidth: 320,
    color: theme.colors.heroSubtext,
    fontSize: theme.typography.body,
    fontWeight: '500',
    lineHeight: 24,
    textAlign: 'center',
  },
  buttonWrap: {
    width: '100%',
    maxWidth: 280,
    marginTop: theme.spacing.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.72)',
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 17,
    letterSpacing: 0.6,
  },
});
