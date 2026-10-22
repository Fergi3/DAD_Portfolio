import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenCard from '../components/ScreenCard';
import SegmentedToggle from '../components/SegmentedToggle';
import theme from '../constants/theme';
import {
  addShoppingItem,
  addToolToInventory,
  deleteShoppingItem,
  getShoppingItems,
  updateShoppingItem,
} from '../services/toolboxStorage';

const SHOPPING_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'needed', label: 'Needed' },
];
const TOOL_CATEGORIES = ['Hand Tools', 'Power Tools', 'Safety Gear', 'Supplies'];

export default function ShoppingListScreen() {
  const [items, setItems] = useState([]);
  const [draftItem, setDraftItem] = useState('');
  const [addedId, setAddedId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [categoryPromptItem, setCategoryPromptItem] = useState(null);
  const [lastSelectedCategory, setLastSelectedCategory] = useState('Hand Tools');
  const addedTimer = useRef(null);
  const neededCount = items.filter((item) => (item.status || 'needed') === 'needed' && !item.complete).length;
  const filteredItems =
    activeFilter === 'needed'
      ? items.filter((item) => (item.status || 'needed') === 'needed' && !item.complete)
      : items;

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadItems() {
        const savedItems = await getShoppingItems();
        if (active) setItems(savedItems);
      }

      loadItems();
      return () => {
        active = false;
      };
    }, [])
  );

  async function handleAddItem() {
    const name = draftItem.trim();
    if (!name) return;
    await addShoppingItem(name, 'Manual add');
    setDraftItem('');
    setItems(await getShoppingItems());
  }

  async function handleToggleItem(item) {
    await updateShoppingItem(item.id, { complete: !item.complete });
    setItems(await getShoppingItems());
  }

  async function confirmDelete(item) {
    await deleteShoppingItem(item.id);
    setItems(await getShoppingItems());
  }

  function handleDelete(item) {
    const message = `Remove "${item.name}" from your shopping list?`;

    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm ? globalThis.confirm(message) : false;
      if (confirmed) {
        confirmDelete(item);
      }
      return;
    }

    Alert.alert('Delete Item', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          confirmDelete(item);
        },
      },
    ]);
  }

  function handleAddToTools(item) {
    setCategoryPromptItem(item);
  }

  async function handleChooseToolCategory(category) {
    if (!categoryPromptItem) return;

    const item = categoryPromptItem;
    setLastSelectedCategory(category);
    setCategoryPromptItem(null);
    await addToolToInventory(item.name, category);
    setAddedId(item.id);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(async () => {
      await deleteShoppingItem(item.id);
      setAddedId(null);
      setItems(await getShoppingItems());
    }, 2000);
  }

  return (
    <View style={styles.screenWrap}>
      <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={filteredItems}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          <ScreenCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Add an Item</Text>
            <View style={styles.addRow}>
              <TextInput
                value={draftItem}
                onChangeText={setDraftItem}
                placeholder="Add a part or tool"
                placeholderTextColor={theme.colors.subtext}
                style={styles.input}
              />
              <Pressable
                style={({ pressed }) => [styles.addButton, pressed && styles.pressScale]}
                onPress={handleAddItem}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            </View>
          </ScreenCard>

          <ShoppingFilterBar
            activeFilter={activeFilter}
            onChangeFilter={setActiveFilter}
            totalCount={items.length}
            neededCount={neededCount}
          />
        </>
      }
      renderItem={({ item }) => (
        <ScreenCard
          style={[
            styles.sectionCard,
            activeFilter === 'all' &&
              (item.status || 'needed') === 'needed' &&
              !item.complete &&
              styles.neededItemCard,
          ]}
        >
          {activeFilter === 'all' && (item.status || 'needed') === 'needed' && !item.complete ? (
            <View style={styles.neededBadge}>
              <Text style={styles.neededBadgeText}>Needed</Text>
            </View>
          ) : null}
          <Text style={styles.itemTitle} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {item.complete ? 'Purchased' : item.status || 'needed'} / {item.source || item.sourceRepair || 'manual'}
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.toolButton,
                addedId === item.id && styles.toolButtonAdded,
                pressed && styles.pressScale,
              ]}
              onPress={() => handleAddToTools(item)}
            >
              <Text
                style={[styles.toolButtonText, addedId === item.id && styles.toolButtonAddedText]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {addedId === item.id ? 'Added' : 'Add to Tools'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.statusChip,
                item.complete ? styles.statusChipFilled : styles.statusChipOutline,
                pressed && styles.pressScale,
              ]}
              onPress={() => handleToggleItem(item)}
            >
              <Text style={[styles.statusChipText, item.complete ? styles.statusFilledText : styles.statusOutlineText]} numberOfLines={1}>
                {item.complete ? 'Done' : 'Buy'}
              </Text>
            </Pressable>

            <TouchableOpacity
              style={styles.deleteIconButton}
              activeOpacity={0.85}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </ScreenCard>
      )}
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          {activeFilter === 'needed' ? 'Nothing needed right now. Nice and tidy.' : 'Your shopping list is clear.'}
        </Text>
      }
      />
      <CategoryChoiceModal
        item={categoryPromptItem}
        selectedCategory={lastSelectedCategory}
        onClose={() => setCategoryPromptItem(null)}
        onChoose={handleChooseToolCategory}
      />
    </View>
  );
}

function CategoryChoiceModal({ item, selectedCategory, onClose, onChoose }) {
  return (
    <Modal visible={Boolean(item)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.categorySheet}>
          <Text style={styles.modalEyebrow}>Add to Toolbox</Text>
          <Text style={styles.modalTitle}>Choose a category</Text>
          <Text style={styles.modalSubtitle} numberOfLines={2}>
            {item?.name}
          </Text>

          <View style={styles.categoryGrid}>
            {TOOL_CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <Pressable
                  key={category}
                  style={({ pressed }) => [
                    styles.categoryChoice,
                    active && styles.categoryChoiceActive,
                    pressed && styles.pressScale,
                  ]}
                  onPress={() => onChoose(category)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.categoryChoiceText, active && styles.categoryChoiceTextActive]}>
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={({ pressed }) => [styles.cancelButton, pressed && styles.pressScale]} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ShoppingFilterBar({ activeFilter, onChangeFilter, totalCount, neededCount }) {
  const counts = {
    all: totalCount,
    needed: neededCount,
  };

  return (
    <View style={styles.filterSection}>
      <SegmentedToggle
        options={SHOPPING_FILTERS.map((filter) => ({
          ...filter,
          label: `${filter.label} (${counts[filter.key]})`,
        }))}
        value={activeFilter}
        onChange={onChangeFilter}
      />
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
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  sectionCard: {
    marginBottom: theme.spacing.sm,
  },
  pressScale: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  neededItemCard: {
    borderWidth: 2,
    borderColor: theme.colors.warningBorder,
    backgroundColor: theme.colors.warningBackground,
  },
  neededBadge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    marginBottom: theme.spacing.xs,
  },
  neededBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.warningText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontSize: theme.typography.title,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  addRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.cardHighlight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: theme.typography.body,
    color: theme.colors.text,
  },
  addButton: {
    minWidth: 96,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  filterSection: {
    marginBottom: theme.spacing.md,
  },
  itemTitle: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: theme.typography.caption,
    color: theme.colors.subtext,
    marginBottom: theme.spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  toolButton: {
    flex: 1,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
  },
  toolButtonAdded: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  toolButtonText: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.text,
  },
  toolButtonAddedText: {
    color: theme.colors.white,
  },
  statusChip: {
    flex: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
  },
  statusChipFilled: {
    backgroundColor: theme.colors.success,
  },
  statusChipOutline: {
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusChipText: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusFilledText: {
    color: theme.colors.white,
  },
  statusOutlineText: {
    color: theme.colors.text,
  },
  deleteIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
    backgroundColor: theme.colors.warningBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(31,42,31,0.42)',
    justifyContent: 'flex-end',
  },
  categorySheet: {
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    ...theme.shadow.cardElevated,
  },
  modalEyebrow: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  modalTitle: {
    fontSize: theme.typography.title,
    fontWeight: '800',
    color: theme.colors.text,
  },
  modalSubtitle: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 22,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  categoryChoice: {
    flexGrow: 1,
    minWidth: '46%',
    minHeight: 42,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  categoryChoiceActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    transform: [{ scale: 1.01 }],
  },
  categoryChoiceText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.subtext,
  },
  categoryChoiceTextActive: {
    color: theme.colors.white,
  },
  cancelButton: {
    minHeight: 42,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  cancelButtonText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.text,
  },
});
