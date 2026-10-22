import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import theme from '../constants/theme';

const MORE_DESTINATIONS = [
  {
    key: 'tools',
    icon: 'toolbox-outline',
    title: 'Tool Inventory',
    description: 'Manage the tools you own.',
    route: 'ToolInventory',
  },
  {
    key: 'maintenance',
    icon: 'calendar-check-outline',
    title: 'Maintenance Planner',
    description: 'Seasonal reminders and preventative maintenance.',
  },
  {
    key: 'settings',
    icon: 'cog-outline',
    title: 'Settings',
    description: 'Application preferences.',
  },
  {
    key: 'support',
    icon: 'help-circle-outline',
    title: 'Help & Support',
    description: 'Documentation, FAQ, and contact.',
  },
  {
    key: 'about',
    icon: 'information-outline',
    title: 'About D.A.D.',
    description: 'Version information and credits.',
  },
];

export default function MoreScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <MoreHero topInset={insets.top} />

      <View style={styles.content}>
        <Pressable
          disabled
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel="Account for Jake, coming soon"
          style={styles.accountRow}
        >
          <View style={styles.accountIcon}>
            <MaterialCommunityIcons name="account-outline" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.accountName}>Jake</Text>
            <Text style={styles.accountDescription}>Manage your account and future home information.</Text>
          </View>
          <ComingSoon />
        </Pressable>

        <Text style={styles.sectionLabel}>Manage</Text>
        <View style={styles.list}>
          {MORE_DESTINATIONS.map((item) => (
            <MoreRow
              key={item.key}
              item={item}
              onPress={item.route ? () => navigation.navigate(item.route) : undefined}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function MoreHero({ topInset }) {
  return (
    <View style={[styles.hero, { paddingTop: Math.max(topInset + 5, 16) }]}>
      <View style={styles.heroShapeLarge} />
      <View style={styles.heroShapeSmall} />
      <Text style={styles.heroTitle}>More</Text>
      <Text style={styles.heroSupporting}>Manage your tools, maintenance, settings, and support.</Text>
    </View>
  );
}

function MoreRow({ item, onPress }) {
  const disabled = !onPress;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={item.icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowDescription} numberOfLines={1}>{item.description}</Text>
      </View>
      {disabled ? <ComingSoon /> : <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.subtext} />}
    </Pressable>
  );
}

function ComingSoon() {
  return (
    <Text style={styles.comingSoon} numberOfLines={1}>Coming Soon</Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 112,
  },
  hero: {
    minHeight: 146,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: '#254B37',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 18,
    justifyContent: 'center',
    overflow: 'hidden',
    ...theme.shadow.soft,
  },
  heroShapeLarge: {
    position: 'absolute',
    width: 172,
    height: 126,
    borderRadius: 38,
    backgroundColor: '#3D7558',
    opacity: 0.28,
    right: -58,
    top: -28,
    transform: [{ rotate: '-18deg' }],
  },
  heroShapeSmall: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: 28,
    backgroundColor: '#183B2A',
    opacity: 0.27,
    left: -38,
    bottom: -34,
    transform: [{ rotate: '18deg' }],
  },
  heroTitle: {
    color: theme.colors.white,
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroSupporting: {
    maxWidth: 330,
    marginTop: 7,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  accountRow: {
    minHeight: 72,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.10)',
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    ...theme.shadow.soft,
  },
  accountIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    color: theme.colors.text,
    fontSize: theme.typography.bodyLarge,
    lineHeight: 22,
    fontWeight: '800',
  },
  accountDescription: {
    marginTop: 2,
    color: theme.colors.subtext,
    fontSize: theme.typography.caption,
    lineHeight: 16,
    fontWeight: '500',
  },
  sectionLabel: {
    marginTop: theme.spacing.xl,
    marginBottom: 8,
    color: theme.colors.subtext,
    fontSize: theme.typography.caption,
    lineHeight: 16,
    fontWeight: '700',
  },
  list: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.10)',
    backgroundColor: theme.colors.surfaceRaised,
    overflow: 'hidden',
  },
  row: {
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  rowDescription: {
    marginTop: 1,
    color: theme.colors.subtext,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  comingSoon: {
    overflow: 'hidden',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 7,
    paddingVertical: 4,
    color: theme.colors.subtext,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
});
