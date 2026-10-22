import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import theme from '../constants/theme';
import {
  RUNNING_TOILET_KEY,
  RUNNING_TOILET_PREPARATION_ITEMS,
} from '../data/diagnosisLibrary';
import { addToolToInventory, getTools, updateTool } from '../services/toolboxStorage';

function normalizeItemName(name) {
  return String(name || '')
    .replace(/\s*\((optional|if needed)\)\s*$/i, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getItemName(item) {
  if (typeof item === 'string') return item;
  return item?.name || item?.tool || item?.title || '';
}

function getFallbackPreparationItems(items) {
  const seen = new Set();

  return items.reduce((result, item) => {
    const originalName = getItemName(item).trim();
    const name = originalName.replace(/\s*\((optional|if needed)\)\s*$/i, '');
    const key = normalizeItemName(name);
    if (!key || seen.has(key)) return result;
    seen.add(key);

    const isPart = /replacement|washer|valve|flapper|filter|cartridge/i.test(name);
    const isSupply = /bucket|towel|rag|sponge|glove|tape|cloth/i.test(name);
    const mayBeNeeded = isPart || /\((optional|if needed)\)\s*$/i.test(originalName);

    result.push({
      name,
      category: isPart ? 'part' : isSupply ? 'supply' : 'tool',
      required: !mayBeNeeded,
    });
    return result;
  }, []);
}

function getRepairName(route) {
  const label = route?.params?.label;
  if (label) return label;

  const source = String(route?.params?.sourceRepair || 'Repair').split(',')[0].trim();
  if (source !== source.toUpperCase()) return source;
  return source.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

function getSuitabilityLabel(diagnosis) {
  const value = String(diagnosis?.diySuitability || diagnosis?.difficulty || '').toLowerCase();
  return /beginner|diy friendly|easy/.test(value) ? 'Beginner-friendly' : '';
}

export default function ToolsForRepairScreen({ navigation, route }) {
  const diagnosis = route?.params?.diagnosis;
  const recommendedTools = Array.isArray(route?.params?.recommendedTools)
    ? route.params.recommendedTools
    : [];
  const preparationItems = useMemo(() => {
    let modeledItems = Array.isArray(diagnosis?.preparationItems)
      ? diagnosis.preparationItems
      : [];
    const repairContext = `${route?.params?.label || ''} ${route?.params?.sourceRepair || ''}`;
    if (
      !modeledItems.length
      && (diagnosis?.diagnosisKey === RUNNING_TOILET_KEY || /running toilet/i.test(repairContext))
    ) {
      modeledItems = RUNNING_TOILET_PREPARATION_ITEMS;
    }
    return modeledItems.length
      ? modeledItems.map((item) => ({ ...item, name: getItemName(item).trim() })).filter((item) => item.name)
      : getFallbackPreparationItems(recommendedTools);
  }, [diagnosis?.diagnosisKey, diagnosis?.preparationItems, recommendedTools, route?.params?.label, route?.params?.sourceRepair]);
  const [inventoryTools, setInventoryTools] = useState([]);

  const refreshTools = useCallback(async () => {
    setInventoryTools(await getTools());
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getTools().then((tools) => {
        if (active) setInventoryTools(tools);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const items = preparationItems.map((item) => {
    const inventoryItem = inventoryTools.find(
      (tool) => normalizeItemName(tool.name) === normalizeItemName(item.name),
    );
    return {
      ...item,
      id: inventoryItem?.id || `preparation-${normalizeItemName(item.name)}`,
      available: Boolean(inventoryItem?.owned),
      inventoryItem,
    };
  });
  const supplies = items.filter((item) => item.category === 'supply');
  const tools = items.filter((item) => item.category === 'tool');
  const parts = items.filter((item) => item.category === 'part');
  const requiredItems = items.filter((item) => item.required);
  const missingRequiredItems = requiredItems.filter((item) => !item.available);
  const missingParts = parts.filter((item) => !item.available);
  const isReady = missingRequiredItems.length === 0;
  const repairName = getRepairName(route);
  const suitabilityLabel = getSuitabilityLabel(diagnosis);
  const missingCount = missingRequiredItems.length;

  async function handleToggleItem(item) {
    if (item.inventoryItem) {
      await updateTool(item.inventoryItem.id, { owned: !item.available });
    } else {
      const category = item.category === 'tool' ? 'Hand Tools' : 'Parts & Supplies';
      await addToolToInventory(item.name, category);
    }
    await refreshTools();
  }

  function handleContinueToRepair() {
    if (!diagnosis) {
      navigation.goBack();
      return;
    }

    navigation.navigate('GuidedSteps', {
      diagnosis,
      label: route.params.label,
      categoryTitle: route.params.categoryTitle,
      repairTodoId: route?.params?.repairId,
      resumeStepIndex: 0,
    });
  }

  const readinessText = isReady
    ? 'You have everything required to get started.'
    : `You’re missing ${missingCount} required ${missingCount === 1 ? 'item' : 'items'}.`;
  const footerText = isReady
    ? 'You have everything you need to get started.'
    : `You’re missing ${missingCount} ${missingCount === 1 ? 'item' : 'items'} you’ll need for this repair.`;
  const shoppingLabel = missingCount > 0
    ? 'Shop Missing Items'
    : missingParts.length > 0
      ? 'Shop Parts You May Need'
      : '';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.repairContext}>
          <Text style={styles.repairName}>{repairName}</Text>
          {suitabilityLabel ? <Text style={styles.suitabilityBadge}>{suitabilityLabel}</Text> : null}
        </View>

        <View style={[styles.readinessCard, isReady && styles.readinessCardReady]}>
          <View style={[styles.statusIcon, isReady && styles.statusIconReady]}>
            <MaterialCommunityIcons
              name={isReady ? 'check' : 'progress-clock'}
              size={20}
              color={isReady ? theme.colors.white : theme.colors.primary}
            />
          </View>
          <View style={styles.readinessCopy}>
            <Text style={styles.readinessTitle}>{isReady ? 'Ready to Go' : 'Almost Ready'}</Text>
            <Text style={styles.readinessText}>{readinessText}</Text>
          </View>
        </View>

        <PreparationSection title="What You’ll Need" items={supplies} onToggle={handleToggleItem} />
        <PreparationSection title="Tools" items={tools} onToggle={handleToggleItem} />
        <PreparationSection title="Parts You May Need" items={parts} informational />

        <View style={styles.footerActions}>
          <Text style={styles.continueNote}>{footerText}</Text>
          <Pressable
            style={({ pressed }) => [styles.continueAction, pressed && styles.pressScale]}
            onPress={handleContinueToRepair}
            accessibilityRole="button"
            accessibilityLabel={isReady ? 'Start Repair' : 'Start Anyway'}
          >
            <Text style={styles.continueActionText}>{isReady ? 'Start Repair' : 'Start Anyway'}</Text>
            <MaterialCommunityIcons name="arrow-right" size={19} color={theme.colors.white} />
          </Pressable>
          {shoppingLabel ? (
            <Pressable
              style={({ pressed }) => [styles.shoppingAction, pressed && styles.pressScale]}
              onPress={() => navigation.navigate('ShoppingList')}
              accessibilityRole="button"
            >
              <Text style={styles.shoppingActionText}>{shoppingLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function PreparationSection({ title, items, onToggle, informational = false }) {
  if (!items.length) return null;

  return (
    <View style={styles.preparationSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.itemList}>
        {items.map((item) => informational ? (
          <View key={`${item.category}-${item.name}`} style={styles.itemRow}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={21}
              color={theme.colors.subtext}
            />
            <View style={styles.itemCopy}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>May be needed after inspection.</Text>
            </View>
          </View>
        ) : (
          <Pressable
            key={`${item.category}-${item.name}`}
            onPress={() => onToggle(item)}
            style={({ pressed }) => [styles.itemRow, pressed && styles.itemRowPressed]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.available }}
            accessibilityLabel={`${item.name}, ${item.available ? 'available' : item.required ? 'required' : 'may be needed'}`}
          >
            <MaterialCommunityIcons
              name={item.available ? 'check-circle' : 'checkbox-blank-outline'}
              size={22}
              color={item.available ? theme.colors.success : theme.colors.subtext}
            />
            <View style={styles.itemCopy}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={[styles.itemMeta, item.available && styles.itemMetaAvailable]}>
                {item.available
                  ? item.category === 'tool' ? 'In your toolbox' : 'You have this'
                  : item.required ? 'Required' : 'May be needed'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  repairContext: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  repairName: {
    flex: 1,
    fontSize: theme.typography.bodyLarge,
    fontWeight: '800',
    color: theme.colors.text,
  },
  suitabilityBadge: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  readinessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.14)',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceRaised,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  readinessCardReady: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7EFE6',
  },
  statusIconReady: {
    backgroundColor: theme.colors.success,
  },
  readinessCopy: {
    flex: 1,
  },
  readinessTitle: {
    fontSize: theme.typography.sectionHeading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  readinessText: {
    marginTop: 3,
    fontSize: theme.typography.caption,
    lineHeight: 18,
    color: theme.colors.subtext,
  },
  preparationSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.xs,
    fontSize: theme.typography.caption,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: theme.colors.primary,
  },
  itemList: {
    gap: 2,
  },
  itemRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  itemRowPressed: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  itemCopy: {
    flex: 1,
  },
  itemName: {
    fontSize: theme.typography.body,
    lineHeight: 21,
    fontWeight: '700',
    color: theme.colors.text,
  },
  itemMeta: {
    marginTop: 2,
    fontSize: theme.typography.caption,
    lineHeight: 16,
    fontWeight: '600',
    color: theme.colors.subtext,
  },
  itemMetaAvailable: {
    color: theme.colors.success,
  },
  footerActions: {
    gap: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.lg,
    marginTop: theme.spacing.xs,
  },
  continueNote: {
    marginBottom: theme.spacing.xs,
    fontSize: theme.typography.caption,
    lineHeight: 18,
    textAlign: 'center',
    color: theme.colors.subtext,
  },
  continueAction: {
    minHeight: 50,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    ...theme.shadow.soft,
  },
  continueActionText: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.white,
  },
  shoppingAction: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  shoppingActionText: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  pressScale: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
