import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import ScreenCard from '../components/ScreenCard';
import SegmentedToggle from '../components/SegmentedToggle';
import theme from '../constants/theme';
import { addTool, addShoppingItem, deleteTool, getTools, updateTool } from '../services/toolboxStorage';

const CATEGORIES = ['Hand Tools', 'Power Tools', 'Safety Gear', 'Supplies'];
const TOOLBOX_MODES = [
  { key: 'inventory', label: 'My Inventory' },
  { key: 'add', label: 'Add Tool' },
];
const STATUS_FILTERS = [
  { key: 'owned', label: 'Owned' },
  { key: 'needed', label: 'Needed' },
];
const CATEGORY_META = {
  'Hand Tools': { icon: 'hammer-screwdriver' },
  'Power Tools': { icon: 'power-plug-outline' },
  'Safety Gear': { icon: 'shield-check-outline' },
  Supplies: { icon: 'package-variant-closed' },
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getToolCategory(tool) {
  return tool?.category === 'Project Supplies' ? 'Supplies' : tool?.category || 'Hand Tools';
}

export default function ToolInventoryScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const diagnosisContext = route?.params?.returnTo === 'Diagnosis' ? route.params : null;
  const isCompact = width < 420;
  const [tools, setTools] = useState([]);
  const [draftTool, setDraftTool] = useState('');
  const [draftCategory, setDraftCategory] = useState('Hand Tools');
  const [activeMode, setActiveMode] = useState('inventory');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [activeStatus, setActiveStatus] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [expandedToolId, setExpandedToolId] = useState(null);
  const [addedId, setAddedId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const addedTimer = useRef(null);
  const toastTimer = useRef(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadTools() {
        const savedTools = await getTools();
        if (active) setTools(savedTools);
      }

      loadTools();
      return () => {
        active = false;
      };
    }, [])
  );

  async function refreshTools() {
    setTools(await getTools());
  }

  async function handleAddTool() {
    const name = draftTool.trim();
    if (!name) return;
    await addTool(name, draftCategory);
    setDraftTool('');
    await refreshTools();
  }

  async function handleToggleOwned(tool) {
    const nextOwned = !tool.owned;
    await updateTool(tool.id, { owned: nextOwned });
    showStatusToast(nextOwned ? 'Moved to Owned' : 'Moved to Needed');
    await refreshTools();
  }

  function showStatusToast(message) {
    setToastMessage(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToastMessage('');
    }, 1800);
  }

  async function confirmDelete(tool) {
    await deleteTool(tool.id);
    await refreshTools();
  }

  function handleDelete(tool) {
    const message = `Remove "${tool.name}" from your toolbox?`;

    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm ? globalThis.confirm(message) : false;
      if (confirmed) confirmDelete(tool);
      return;
    }

    Alert.alert('Delete Tool', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(tool) },
    ]);
  }

  async function handleChangeCategory(tool, nextCategory) {
    if (getToolCategory(tool) === nextCategory) {
      setExpandedToolId(null);
      return;
    }

    await updateTool(tool.id, { category: nextCategory });
    setExpandedToolId(null);
    await refreshTools();
  }

  function handleToggleCategory(category) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }

  function handleToggleStatus(status) {
    setActiveStatus((current) => (current === status ? null : status));
  }

  function handleToggleInventoryCategory(category) {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }

    setExpandedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }

  async function handleAddToShopping(tool) {
    await addShoppingItem(tool.name, 'Toolbox');
    setAddedId(tool.id);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(async () => {
      await deleteTool(tool.id);
      setAddedId(null);
      await refreshTools();
    }, 2000);
  }

  function handleBackToDiagnosis() {
    if (diagnosisContext?.returnDepth && navigation.pop) {
      navigation.pop(diagnosisContext.returnDepth);
      return;
    }

    navigation.goBack();
  }

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const categoryMatch =
        selectedCategories.length === 0 || selectedCategories.includes(getToolCategory(tool));
      const statusMatch =
        !activeStatus ||
        (activeStatus === 'owned' && tool.owned) ||
        (activeStatus === 'needed' && !tool.owned);

      return categoryMatch && statusMatch;
    });
  }, [tools, selectedCategories, activeStatus]);

  const sections = useMemo(() => {
    const visibleCategories =
      selectedCategories.length > 0
        ? CATEGORIES.filter((category) => selectedCategories.includes(category))
        : CATEGORIES;

    return visibleCategories
      .map((category) => {
        const categoryTools = filteredTools.filter((tool) => getToolCategory(tool) === category);
        const isExpanded = expandedCategories.includes(category);

        return {
          title: category,
          count: categoryTools.length,
          isExpanded,
          data: isExpanded ? categoryTools : [],
        };
      })
      .filter((section) => section.count > 0);
  }, [expandedCategories, filteredTools, selectedCategories]);

  const ownedCount = tools.filter((tool) => tool.owned).length;
  const neededCount = tools.length - ownedCount;

  return (
    <View style={styles.screenWrap}>
      <SectionList
        style={styles.screen}
        contentContainerStyle={styles.content}
        sections={activeMode === 'inventory' ? sections : []}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <>
            {diagnosisContext ? (
              <View style={styles.returnBanner}>
                <View style={styles.returnCopy}>
                  <Text style={styles.returnLabel}>Current diagnosis</Text>
                  <Text style={styles.returnTitle} numberOfLines={2}>{diagnosisContext.issueText || diagnosisContext.sourceRepair}</Text>
                </View>
                <Pressable style={({ pressed }) => [styles.returnButton, pressed && styles.pressScale]} onPress={handleBackToDiagnosis}>
                  <Text style={styles.returnButtonText}>Back to Diagnosis</Text>
                </Pressable>
              </View>
            ) : null}

            <SegmentedToggle
              options={TOOLBOX_MODES}
              value={activeMode}
              onChange={setActiveMode}
              style={styles.modeToggle}
            />

            {activeMode === 'add' ? (
              <AddToolCard
                draftTool={draftTool}
                draftCategory={draftCategory}
                isCompact={isCompact}
                onChangeTool={setDraftTool}
                onChangeCategory={setDraftCategory}
                onAddTool={handleAddTool}
              />
            ) : (
              <InventoryFilters
                selectedCategories={selectedCategories}
                activeStatus={activeStatus}
                totalCount={tools.length}
                ownedCount={ownedCount}
                neededCount={neededCount}
                onCategoryToggle={handleToggleCategory}
                onStatusToggle={handleToggleStatus}
              />
            )}
          </>
        }
        renderSectionHeader={({ section }) => (
          <InventoryCategoryHeader
            title={section.title}
            count={section.count}
            expanded={section.isExpanded}
            onPress={() => handleToggleInventoryCategory(section.title)}
          />
        )}
        renderItem={({ item }) => (
          <View style={styles.toolCardInset}>
            <ToolInventoryCard
              tool={item}
              isExpanded={expandedToolId === item.id}
              addedToShopping={addedId === item.id}
              onToggleExpand={() => setExpandedToolId((current) => (current === item.id ? null : item.id))}
              onToggleOwned={() => handleToggleOwned(item)}
              onDelete={() => handleDelete(item)}
              onChangeCategory={(category) => handleChangeCategory(item, category)}
              onAddToShopping={() => handleAddToShopping(item)}
            />
          </View>
        )}
        ListFooterComponent={<View style={styles.footerSpace} />}
        ListEmptyComponent={
          activeMode === 'add' ? null : filteredTools.length === 0 ? (
            <FilteredEmptyState
              selectedCategories={selectedCategories}
              activeStatus={activeStatus}
              visibleCount={filteredTools.length}
              onShowAll={() => {
                setSelectedCategories([]);
                setActiveStatus(null);
              }}
            />
          ) : (
            <Text style={styles.emptyText}>No tools in your toolbox yet.</Text>
          )
        }
      />
      <StatusToast message={toastMessage} />
    </View>
  );
}

function InventoryCategoryHeader({ title, count, expanded, onPress }) {
  const chevronAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const categoryIcon = CATEGORY_META[title]?.icon || 'toolbox-outline';

  useEffect(() => {
    Animated.timing(chevronAnim, {
      toValue: expanded ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [chevronAnim, expanded]);

  const chevronRotation = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.inventoryCategoryRow,
        expanded && styles.inventoryCategoryRowExpanded,
        pressed && styles.inventoryCategoryRowPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
    >
      <View style={[styles.inventoryCategoryIconWrap, expanded && styles.inventoryCategoryIconWrapExpanded]}>
        <MaterialCommunityIcons
          name={categoryIcon}
          size={18}
          color={expanded ? theme.colors.white : theme.colors.primary}
        />
      </View>
      <View style={styles.inventoryCategoryCopy}>
        <Text style={styles.inventoryCategoryTitle}>{title}</Text>
        <Text style={styles.inventoryCategoryMeta}>Tap to {expanded ? 'collapse' : 'expand'}</Text>
      </View>
      <Text style={styles.inventoryCategoryToolCount}>{count} {count === 1 ? 'tool' : 'tools'}</Text>
      <Animated.View
        style={[
          styles.inventoryCategoryChevronWrap,
          expanded && styles.inventoryCategoryChevronWrapExpanded,
          { transform: [{ rotate: chevronRotation }] },
        ]}
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={expanded ? theme.colors.white : theme.colors.primary}
        />
      </Animated.View>
    </Pressable>
  );
}

function AddToolCard({
  draftTool,
  draftCategory,
  isCompact,
  onChangeTool,
  onChangeCategory,
  onAddTool,
}) {
  return (
    <ScreenCard style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Add a Tool</Text>
          <Text style={styles.sectionHint}>Add it, then sort it.</Text>
        </View>
      </View>

      <View style={[styles.addControlRow, isCompact && styles.addControlColumn]}>
        <TextInput
          value={draftTool}
          onChangeText={onChangeTool}
          placeholder="Tool name"
          placeholderTextColor={theme.colors.subtext}
          style={[styles.input, isCompact && styles.fullWidthControl]}
          returnKeyType="done"
          onSubmitEditing={onAddTool}
        />
        <TouchableOpacity
          style={[styles.addButton, isCompact && styles.fullWidthControl]}
          activeOpacity={0.9}
          onPress={onAddTool}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <CategoryPicker
        value={draftCategory}
        onChange={onChangeCategory}
        compact
      />
    </ScreenCard>
  );
}

function InventoryFilters({
  selectedCategories,
  activeStatus,
  totalCount,
  ownedCount,
  neededCount,
  onCategoryToggle,
  onStatusToggle,
}) {
  return (
    <View style={styles.inventoryPanel}>
      <View style={styles.inventorySectionHeader}>
        <View>
          <Text style={styles.inventorySectionTitle}>My Inventory</Text>
          <Text style={styles.inventorySectionSub}>
            {totalCount} total | {ownedCount} owned | {neededCount} needed
          </Text>
        </View>
      </View>

      <CategoryPicker
        value={selectedCategories}
        onChange={onCategoryToggle}
        multiSelect
        label={selectedCategories.length ? `${selectedCategories.length} selected` : 'All categories'}
      />

      <View style={styles.statusFilterRow}>
        {STATUS_FILTERS.map((filter) => (
          <FilterPill
            key={filter.key}
            label={filter.label}
            active={activeStatus === filter.key}
            onPress={() => onStatusToggle(filter.key)}
          />
        ))}
      </View>
    </View>
  );
}

function FilteredEmptyState({
  selectedCategories,
  activeStatus,
  visibleCount,
  onShowAll,
}) {
  const statusLabel = activeStatus === 'owned' ? 'owned' : activeStatus === 'needed' ? 'needed' : 'saved';
  const hasFilters = selectedCategories.length > 0 || activeStatus;
  const categoryLabel = selectedCategories.length ? selectedCategories.join(', ') : 'your toolbox';

  return (
    <View style={styles.filteredEmptyCard}>
      <Text style={styles.filteredEmptyTitle}>
        {hasFilters ? `No ${statusLabel} tools shown` : 'No tools in your toolbox yet'}
      </Text>
      <Text style={styles.filteredEmptyText} numberOfLines={2}>
        {hasFilters
          ? `Try clearing filters for ${categoryLabel}.`
          : 'Add a tool above, then sort it when you are ready.'}
      </Text>
      {hasFilters && visibleCount === 0 ? (
        <TouchableOpacity style={styles.showAllButton} activeOpacity={0.86} onPress={onShowAll}>
          <Text style={styles.showAllButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function CategoryPicker({ value, onChange, compact = false, multiSelect = false, label }) {
  const selectedValues = Array.isArray(value) ? value : [value];

  return (
    <View style={[styles.categoryPicker, compact && styles.categoryPickerCompact]}>
      <Text style={styles.categoryPickerLabel}>
        Category: <Text style={styles.categoryLabelActive}>{label || selectedValues[0]}</Text>
      </Text>
      <View style={styles.pillWrap}>
        {CATEGORIES.map((category) => (
          <FilterPill
            key={category}
            label={category}
            active={selectedValues.includes(category)}
            onPress={() => onChange(category)}
            compact={compact}
            accessibilityState={{ selected: selectedValues.includes(category) }}
          />
        ))}
      </View>
    </View>
  );
}

function FilterPill({ label, active, onPress, compact = false, accessibilityState }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.filterPill,
        compact && styles.filterPillCompact,
        active && styles.filterPillActive,
        pressed && styles.filterPillPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={accessibilityState || { selected: active }}
    >
      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function ToolInventoryCard({
  tool,
  isExpanded,
  addedToShopping,
  onToggleExpand,
  onToggleOwned,
  onDelete,
  onChangeCategory,
  onAddToShopping,
}) {
  const isOwned = Boolean(tool.owned);

  return (
    <TouchableOpacity
      style={[
        styles.toolCard,
        isOwned ? styles.toolCardOwned : styles.toolCardNeeded,
      ]}
      activeOpacity={0.92}
      onPress={onToggleExpand}
    >
      <View style={styles.toolCardHeader}>
        <View style={styles.toolTitleWrap}>
          <Text style={styles.toolName} numberOfLines={2}>{tool.name}</Text>
          <Text style={styles.toolCategory}>{getToolCategory(tool)}</Text>
        </View>

        <TouchableOpacity style={styles.deleteButton} activeOpacity={0.8} onPress={onDelete}>
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toolCardBottomRow}>
        <StatusToggle owned={isOwned} onPress={onToggleOwned} />
        <Text style={styles.expandHint}>{isExpanded ? 'Hide details' : 'Details'}</Text>
      </View>

      {isExpanded ? (
        <View style={styles.toolDetailArea}>
          <Text style={styles.detailLabel}>Move to category</Text>
          <View style={styles.detailCategoryWrap}>
            {CATEGORIES.map((category) => (
              <FilterPill
                key={category}
                label={category}
                active={getToolCategory(tool) === category}
                compact
                onPress={() => onChangeCategory(category)}
              />
            ))}
          </View>

          {!isOwned ? (
            <TouchableOpacity
              style={[styles.shoppingButton, addedToShopping && styles.shoppingButtonAdded]}
              activeOpacity={0.85}
              onPress={onAddToShopping}
            >
              <Text
                style={[styles.shoppingButtonText, addedToShopping && styles.shoppingButtonAddedText]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {addedToShopping ? 'Added' : 'Add to Shopping'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function StatusToggle({ owned, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.statusToggle, owned ? styles.statusToggleOwned : styles.statusToggleNeeded]}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <View style={[styles.statusKnob, owned ? styles.statusKnobOwned : styles.statusKnobNeeded]} />
      <Text style={[styles.statusToggleText, owned ? styles.statusToggleTextOwned : styles.statusToggleTextNeeded]}>
        {owned ? 'Owned' : 'Needed'}
      </Text>
    </TouchableOpacity>
  );
}

function StatusToast({ message }) {
  if (!message) return null;

  return (
    <View pointerEvents="none" style={styles.toastWrap}>
      <View style={styles.toast}>
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  returnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.cardHighlight,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  returnCopy: {
    flex: 1,
    minWidth: 0,
  },
  returnLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '900',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  returnTitle: {
    marginTop: 2,
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 21,
  },
  returnButton: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 9,
  },
  returnButtonText: {
    fontSize: theme.typography.caption,
    fontWeight: '900',
    color: theme.colors.white,
  },
  sectionCard: {
    marginBottom: theme.spacing.md,
  },
  modeToggle: {
    marginBottom: theme.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionTitle: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sectionHint: {
    marginTop: 2,
    fontSize: theme.typography.caption,
    color: theme.colors.subtext,
    lineHeight: 18,
  },
  addControlRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  addControlColumn: {
    flexDirection: 'column',
  },
  input: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.cardHighlight,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.body,
    color: theme.colors.text,
  },
  fullWidthControl: {
    width: '100%',
  },
  addButton: {
    minWidth: 86,
    minHeight: 46,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    ...theme.shadow.soft,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  inventoryPanel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadow.soft,
  },
  inventorySectionHeader: {
    marginBottom: theme.spacing.sm,
  },
  inventorySectionTitle: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '800',
    color: theme.colors.text,
  },
  inventorySectionSub: {
    marginTop: 2,
    fontSize: theme.typography.caption,
    color: theme.colors.subtext,
  },
  categoryPicker: {
    marginTop: theme.spacing.xs,
  },
  categoryPickerCompact: {
    marginTop: theme.spacing.sm,
  },
  categoryPickerLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.subtext,
    marginBottom: theme.spacing.xs,
  },
  categoryLabelActive: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  filterPill: {
    minHeight: 34,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  filterPillCompact: {
    flexGrow: 0,
    minHeight: 30,
    paddingVertical: 6,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    transform: [{ scale: 1.02 }],
  },
  filterPillPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  filterPillText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.subtext,
  },
  filterPillTextActive: {
    color: theme.colors.white,
  },
  statusFilterRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  inventoryCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.soft,
  },
  inventoryCategoryRowExpanded: {
    borderColor: 'rgba(53,95,72,0.30)',
    backgroundColor: theme.colors.cardHighlight,
  },
  inventoryCategoryRowPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.995 }],
  },
  inventoryCategoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.18)',
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  inventoryCategoryIconWrapExpanded: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  inventoryCategoryCopy: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  inventoryCategoryTitle: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  inventoryCategoryMeta: {
    marginTop: 2,
    fontSize: theme.typography.caption,
    color: theme.colors.subtext,
  },
  inventoryCategoryToolCount: {
    fontSize: theme.typography.caption,
    fontWeight: '900',
    color: theme.colors.subtext,
    marginRight: theme.spacing.sm,
  },
  inventoryCategoryChevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.20)',
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryCategoryChevronWrapExpanded: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  toolCardInset: {
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(53,95,72,0.14)',
  },
  toolCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  toolCardOwned: {
    backgroundColor: theme.colors.surface,
    borderColor: 'rgba(53,95,72,0.22)',
  },
  toolCardNeeded: {
    backgroundColor: theme.colors.warningBackground,
    borderColor: theme.colors.warningBorder,
  },
  toolCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  toolTitleWrap: {
    flex: 1,
  },
  toolName: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 24,
  },
  toolCategory: {
    marginTop: 3,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.subtext,
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: theme.typography.body,
    fontWeight: '900',
    color: theme.colors.warningText,
    lineHeight: 18,
  },
  toolCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  statusToggle: {
    minWidth: 118,
    minHeight: 36,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  statusToggleOwned: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  statusToggleNeeded: {
    borderColor: theme.colors.warningBorder,
    backgroundColor: theme.colors.surface,
  },
  statusKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: theme.spacing.xs,
  },
  statusKnobOwned: {
    backgroundColor: theme.colors.white,
  },
  statusKnobNeeded: {
    backgroundColor: theme.colors.warningBackground,
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
  },
  statusToggleText: {
    flex: 1,
    fontSize: theme.typography.caption,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusToggleTextOwned: {
    color: theme.colors.white,
  },
  statusToggleTextNeeded: {
    color: theme.colors.warningText,
  },
  expandHint: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  toolDetailArea: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: theme.spacing.xs,
  },
  detailCategoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  shoppingButton: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoppingButtonText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  shoppingButtonAdded: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  shoppingButtonAddedText: {
    color: theme.colors.white,
  },
  toastWrap: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.lg,
    alignItems: 'center',
  },
  toast: {
    maxWidth: 280,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(53,95,72,0.18)',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  toastText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.white,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  filteredEmptyCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardHighlight,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  filteredEmptyTitle: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  filteredEmptyText: {
    fontSize: theme.typography.caption,
    color: theme.colors.subtext,
    lineHeight: 18,
  },
  showAllButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  showAllButtonText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  footerSpace: {
    height: 72,
  },
  emptyText: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});
