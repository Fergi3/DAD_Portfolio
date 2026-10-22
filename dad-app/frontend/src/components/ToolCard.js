import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import theme from '../constants/theme';

const GENERIC_TOOL_ICON = 'tools';

const TOOL_ICON_RULES = [
  { pattern: /flashlight|torch/i, icon: 'flashlight' },
  { pattern: /adjustable\s+wrench|crescent\s+wrench|pipe\s+wrench/i, icon: 'wrench-cog' },
  { pattern: /wrench|spanner|hex|allen/i, icon: 'wrench' },
  { pattern: /plier|tong/i, icon: 'pliers' },
  { pattern: /screwdriver/i, icon: 'screwdriver' },
  { pattern: /bucket|pail|pan|container/i, icon: 'bucket-outline' },
  { pattern: /towel|cloth|rag|sponge/i, icon: 'paper-roll-outline' },
  { pattern: /glove/i, icon: 'hand-back-right-outline' },
  { pattern: /safety\s+glasses|safety\s+goggles|goggle|eye\s+protection/i, icon: 'safety-goggles' },
  { pattern: /tape\s+measure|measuring\s+tape/i, icon: 'tape-measure' },
];

function getToolText(tool) {
  if (typeof tool === 'string') {
    return { name: tool, note: '' };
  }

  if (!tool || typeof tool !== 'object') {
    return { name: String(tool || 'Tool'), note: '' };
  }

  const name = tool.name || tool.tool || tool.title || 'Tool';
  const note = tool.note || tool.shortNote || tool.description || '';

  return {
    name: typeof name === 'string' ? name : String(name || 'Tool'),
    note: typeof note === 'string' ? note : String(note || ''),
  };
}

function splitParentheticalNote(name, explicitNote) {
  const safeName = typeof name === 'string' ? name : String(name || 'Tool');
  const safeNote = typeof explicitNote === 'string' ? explicitNote : String(explicitNote || '');

  if (safeNote) {
    return { name: safeName, note: safeNote };
  }

  const match = safeName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);

  if (!match) {
    return { name: safeName, note: '' };
  }

  return {
    name: match[1].trim(),
    note: match[2].trim(),
  };
}

export function getToolIconName(toolName) {
  const iconRule = TOOL_ICON_RULES.find(({ pattern }) => pattern.test(toolName));
  return iconRule?.icon || GENERIC_TOOL_ICON;
}

function ToolCard({ tool }) {
  const toolText = getToolText(tool);
  const { name, note } = splitParentheticalNote(toolText.name, toolText.note);
  const iconName = getToolIconName(`${name} ${note}`);

  return (
    <View style={styles.card}>
      <View style={styles.iconBadge}>
        <MaterialCommunityIcons name={iconName} size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        {note ? (
          <Text style={styles.note} numberOfLines={2}>
            {note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default React.memo(ToolCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.sm,
    ...(Platform.OS === 'web' ? { cursor: 'default' } : {}),
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.10)',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 21,
  },
  note: {
    marginTop: 2,
    fontSize: theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.subtext,
    lineHeight: 17,
  },
});
