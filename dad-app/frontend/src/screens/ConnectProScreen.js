import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '../components/PrimaryButton';
import theme from '../constants/theme';
import { getDisclaimerText } from '../utils/safetyHelpers';

export default function ConnectProScreen({ navigation, route }) {
  const { diagnosis, label, returnActionTitle } = route.params || {};
  const disclaimerText = getDisclaimerText(diagnosis?.disclaimer);
  const stopReason =
    diagnosis?.callAPro ||
    'Call now for safety risks, repeated failure, hidden damage, or anything outside your comfort level.';
  const actionTitle = returnActionTitle || (diagnosis ? 'Return to Repair' : 'Back to Diagnosis');

  function handleReturn() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Home');
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>{label || 'Support'}</Text>
        <Text style={styles.subtitle}>If this feels unsafe, unclear, or bigger than expected, pause and get help.</Text>

        <CompactSection title="Pro feature coming soon">
          D.A.D. will help connect you with local pros soon. For now, contact a licensed professional directly.
        </CompactSection>

        <CompactSection title="When to call now" warning>
          {shortenText(stopReason)}
        </CompactSection>

        <CompactSection title="A calm next step" muted>
          {shortenText(disclaimerText)}
        </CompactSection>
      </ScrollView>

      <View style={styles.stickyActionBar}>
        <PrimaryButton title={actionTitle} onPress={handleReturn} />
      </View>
    </View>
  );
}

function CompactSection({ title, children, warning = false, muted = false }) {
  return (
    <View style={[styles.sectionCard, warning && styles.warningCard, muted && styles.mutedCard]}>
      <Text style={[styles.sectionTitle, warning && styles.warningTitle]}>{title}</Text>
      <Text style={[styles.bodyText, warning && styles.warningText]}>{children}</Text>
    </View>
  );
}

function shortenText(text) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Pause here and choose professional support if anything feels unsafe.';
  if (cleaned.length <= 145) return cleaned;
  return `${cleaned.slice(0, 142).trim()}...`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.layout.repairActionBarHeight + theme.spacing.lg,
  },
  kicker: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  sectionCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadow.soft,
  },
  mutedCard: {
    backgroundColor: theme.colors.cardHighlight,
  },
  warningCard: {
    backgroundColor: theme.colors.warningBackground,
    borderColor: theme.colors.warningBorder,
  },
  sectionTitle: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  warningTitle: {
    color: theme.colors.warningText,
  },
  bodyText: {
    fontSize: theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  warningText: {
    color: theme.colors.warningText,
    fontWeight: '600',
  },
  stickyActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    ...theme.shadow.cardElevated,
  },
});
