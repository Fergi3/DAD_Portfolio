import React, { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import theme from '../constants/theme';
import { deleteRepair, getRepairs, updateRepair } from '../services/repairStorage';
import { deleteRepairTodo, getRepairsTodo } from '../services/toolboxStorage';

const COMPLETED_PREVIEW_LIMIT = 5;

export default function RepairsTodoScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [repairsTodo, setRepairsTodo] = useState([]);
  const [repairHistory, setRepairHistory] = useState([]);
  const [openActionsId, setOpenActionsId] = useState(null);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadRepairs() {
        const [savedRepairs, savedHistory] = await Promise.all([getRepairsTodo(), getRepairs()]);
        if (!mounted) return;
        setRepairsTodo(savedRepairs);
        setRepairHistory(savedHistory);
      }

      loadRepairs();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const activeRepairs = repairsTodo
    .filter((repair) => repair.status !== 'completed' && !repair.complete)
    .sort((a, b) => new Date(b.lastOpenedAt || 0).getTime() - new Date(a.lastOpenedAt || 0).getTime());
  const visibleCompleted = showAllCompleted ? repairHistory : repairHistory.slice(0, COMPLETED_PREVIEW_LIMIT);

  function resumeRepair(repair) {
    navigation.navigate('GuidedSteps', {
      diagnosis: repair.diagnosis,
      label: repair.label,
      categoryTitle: repair.categoryTitle,
      repairTodoId: repair.id,
      resumeStepIndex: repair.currentStepIndex || 0,
      resumeCompletedParts: repair.completedParts || {},
    });
  }

  function viewRepairTools(repair) {
    navigation.navigate('ToolsForRepair', {
      repairId: repair.id,
      recommendedTools: repair.diagnosis?.tools || [],
      sourceRepair: repair.name,
      diagnosis: repair.diagnosis,
      label: repair.label,
      categoryTitle: repair.categoryTitle,
      repairEntryPoint: 'continue',
    });
  }

  async function removeActiveRepair(repair) {
    await deleteRepairTodo(repair.id);
    setOpenActionsId(null);
    setRepairsTodo(await getRepairsTodo());
  }

  function confirmActiveDelete(repair) {
    confirmRemoval({
      title: 'Delete Repair',
      message: `Remove "${repair.name}" from your active repairs?`,
      onConfirm: () => removeActiveRepair(repair),
    });
  }

  function beginHistoryEdit(repair) {
    setOpenActionsId(null);
    setEditingHistoryId(repair.id);
    setDraftNotes(repair.notes || '');
  }

  function cancelHistoryEdit() {
    setEditingHistoryId(null);
    setDraftNotes('');
  }

  async function saveHistoryNotes(repairId) {
    await updateRepair(repairId, { notes: draftNotes.trim() });
    cancelHistoryEdit();
    setRepairHistory(await getRepairs());
  }

  async function removeHistoryRepair(repair) {
    await deleteRepair(repair.id);
    setOpenActionsId(null);
    if (editingHistoryId === repair.id) cancelHistoryEdit();
    setRepairHistory(await getRepairs());
  }

  function confirmHistoryDelete(repair) {
    confirmRemoval({
      title: 'Delete Repair',
      message: `Remove "${repair.issue}" from your repair history?`,
      onConfirm: () => removeHistoryRepair(repair),
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <RepairsHero
        activeCount={activeRepairs.length}
        completedCount={repairHistory.length}
        topInset={insets.top}
      />

      <View style={styles.body}>

      {activeRepairs.length ? (
        <WorkspaceSection title="Active Repairs" primary>
          <View style={styles.activeList}>
            {activeRepairs.map((repair) => (
              <CurrentRepairItem
                key={repair.id}
                repair={repair}
                actionsOpen={openActionsId === `active-${repair.id}`}
                onToggleActions={() => setOpenActionsId(openActionsId === `active-${repair.id}` ? null : `active-${repair.id}`)}
                onResume={resumeRepair}
                onTools={viewRepairTools}
                onDelete={confirmActiveDelete}
              />
            ))}
          </View>
        </WorkspaceSection>
      ) : null}

      {repairHistory.length ? (
        <WorkspaceSection title="Completed Repairs">
          <View style={styles.activityList}>
            {visibleCompleted.map((repair) => (
              <RepairActivityItem
                key={repair.id}
                repair={repair}
                actionsOpen={openActionsId === `completed-${repair.id}`}
                editing={editingHistoryId === repair.id}
                draftNotes={draftNotes}
                onChangeNotes={setDraftNotes}
                onToggleActions={() => setOpenActionsId(openActionsId === `completed-${repair.id}` ? null : `completed-${repair.id}`)}
                onEdit={beginHistoryEdit}
                onCancel={cancelHistoryEdit}
                onSave={saveHistoryNotes}
                onDelete={confirmHistoryDelete}
              />
            ))}
          </View>
          {repairHistory.length > COMPLETED_PREVIEW_LIMIT ? (
            <Pressable
              onPress={() => setShowAllCompleted((current) => !current)}
              style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}
            >
              <Text style={styles.viewAllText}>{showAllCompleted ? 'Show Recent' : 'View All'}</Text>
              <MaterialCommunityIcons name={showAllCompleted ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.primary} />
            </Pressable>
          ) : null}
        </WorkspaceSection>
      ) : null}

      <View style={styles.pageFooter}>
        <View style={styles.footerDivider} />
        <Text style={styles.footerTitle}>Need another repair?</Text>
        <Text style={styles.footerBody}>Start from Home to diagnose a new issue.</Text>
        <Pressable
          onPress={() => navigation.navigate('Home')}
          style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}
        >
          <Text style={styles.homeButtonText}>Go Home</Text>
        </Pressable>
      </View>
      </View>
    </ScrollView>
  );
}

function RepairsHero({ activeCount, completedCount, topInset }) {
  return (
    <View style={[styles.hero, { paddingTop: Math.max(topInset + 5, 16) }]}>
      <View style={styles.heroShapeLarge} />
      <View style={styles.heroShapeSmall} />
      <Text style={styles.heroTitle}>Continue where you left off</Text>
      <Text style={styles.heroSummary}>{activeCount} Active · {completedCount} Completed</Text>
    </View>
  );
}

function WorkspaceSection({ title, primary = false, children }) {
  return (
    <View style={[styles.workspaceSection, primary && styles.primarySection]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function CurrentRepairItem({ repair, actionsOpen, onToggleActions, onResume, onTools, onDelete }) {
  const totalSteps = repair.totalSteps || repair.diagnosis?.steps?.length || 1;
  const currentStep = Math.min((repair.currentStepIndex || 0) + 1, totalSteps);
  const progress = Math.min(100, repair.progressPercentage || Math.round((currentStep / totalSteps) * 100));

  return (
    <View style={styles.currentRepair}>
      <View style={styles.currentTopRow}>
        <View style={styles.repairIcon}>
          <MaterialCommunityIcons name="wrench-outline" size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.repairCopy}>
          <Text style={styles.repairTitle} numberOfLines={2}>{repair.name}</Text>
          <Text style={styles.repairContext}>{repair.categoryTitle || 'Saved repair'}</Text>
        </View>
        <Pressable
          onPress={onToggleActions}
          style={({ pressed }) => [styles.overflowButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${repair.name}`}
        >
          <MaterialCommunityIcons name="dots-horizontal" size={21} color={theme.colors.subtext} />
        </Pressable>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.stepText}>Step {currentStep} of {totalSteps} · {progress}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(8, progress)}%` }]} />
      </View>

      <View style={styles.repairActions}>
        <Pressable style={({ pressed }) => [styles.resumeButton, pressed && styles.pressed]} onPress={() => onResume(repair)}>
          <Text style={styles.resumeText}>Resume</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.toolsButton, pressed && styles.pressed]} onPress={() => onTools(repair)}>
          <Text style={styles.toolsText}>View Tools</Text>
        </Pressable>
      </View>

      {actionsOpen ? (
        <OverflowActions>
          <ContextAction icon="trash-can-outline" label="Delete repair" warning onPress={() => onDelete(repair)} />
        </OverflowActions>
      ) : null}
    </View>
  );
}

function RepairActivityItem({ repair, actionsOpen, editing, draftNotes, onChangeNotes, onToggleActions, onEdit, onCancel, onSave, onDelete }) {
  return (
    <View style={styles.activityItem}>
      <View style={styles.activityMainRow}>
        <View style={styles.completeIcon}>
          <MaterialCommunityIcons name="check" size={15} color={theme.colors.success} />
        </View>
        <View style={styles.repairCopy}>
          <Text style={styles.activityTitle} numberOfLines={1}>{repair.issue}</Text>
          <Text style={styles.activityMeta}>{repair.category || 'General'} · {completedDate(repair.date)}</Text>
        </View>
        <Pressable
          onPress={onToggleActions}
          style={({ pressed }) => [styles.overflowButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${repair.issue}`}
        >
          <MaterialCommunityIcons name="dots-horizontal" size={20} color={theme.colors.subtext} />
        </Pressable>
      </View>

      {repair.notes && !editing ? <Text style={styles.notesPreview}>{repair.notes}</Text> : null}

      {actionsOpen && !editing ? (
        <OverflowActions>
          <ContextAction icon="pencil-outline" label="Edit notes" onPress={() => onEdit(repair)} />
          <ContextAction icon="trash-can-outline" label="Delete" warning onPress={() => onDelete(repair)} />
        </OverflowActions>
      ) : null}

      {editing ? (
        <View style={styles.notesEditor}>
          <TextInput
            value={draftNotes}
            onChangeText={onChangeNotes}
            placeholder="Add or update your notes"
            placeholderTextColor={theme.colors.subtext}
            style={styles.notesInput}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.editorActions}>
            <Pressable onPress={onCancel} style={({ pressed }) => [styles.editorSecondary, pressed && styles.pressed]}>
              <Text style={styles.editorSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onSave(repair.id)} style={({ pressed }) => [styles.editorPrimary, pressed && styles.pressed]}>
              <Text style={styles.editorPrimaryText}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function OverflowActions({ children }) {
  return <View style={styles.overflowActions}>{children}</View>;
}

function ContextAction({ icon, label, warning = false, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.contextAction, pressed && styles.pressed]}>
      <MaterialCommunityIcons name={icon} size={16} color={warning ? theme.colors.warningText : theme.colors.primary} />
      <Text style={[styles.contextLabel, warning && styles.contextLabelWarning]}>{label}</Text>
    </Pressable>
  );
}

function confirmRemoval({ title, message, onConfirm }) {
  if (Platform.OS === 'web') {
    const confirmed = globalThis.confirm ? globalThis.confirm(message) : false;
    if (confirmed) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

function completedDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Completed recently';
  return `Completed ${date.toLocaleDateString()}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: 112 },
  hero: { minHeight: 146, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, backgroundColor: '#254B37', paddingHorizontal: theme.spacing.lg, paddingBottom: 18, justifyContent: 'center', overflow: 'hidden', ...theme.shadow.soft },
  heroShapeLarge: { position: 'absolute', width: 172, height: 126, borderRadius: 38, backgroundColor: '#3D7558', opacity: 0.28, right: -58, top: -28, transform: [{ rotate: '-18deg' }] },
  heroShapeSmall: { position: 'absolute', width: 94, height: 94, borderRadius: 28, backgroundColor: '#183B2A', opacity: 0.27, left: -38, bottom: -34, transform: [{ rotate: '18deg' }] },
  heroTitle: { color: theme.colors.white, fontSize: 27, lineHeight: 31, fontWeight: '800', letterSpacing: -0.4 },
  heroSummary: { marginTop: 10, color: 'rgba(255,255,255,0.68)', fontSize: theme.typography.caption, lineHeight: 16, fontWeight: '700' },
  body: { paddingHorizontal: theme.spacing.lg, paddingTop: 14 },
  workspaceSection: { marginTop: theme.spacing.xl },
  primarySection: { marginTop: 0 },
  sectionHeader: { marginBottom: 8 },
  sectionTitle: { color: theme.colors.text, fontSize: theme.typography.bodyLarge, lineHeight: 22, fontWeight: '800' },
  activeList: { gap: 8 },
  currentRepair: { borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceRaised, borderWidth: 1, borderColor: 'rgba(53,95,72,0.11)', paddingHorizontal: 11, paddingVertical: 9, ...theme.shadow.soft },
  currentTopRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  repairIcon: { width: 34, height: 34, borderRadius: 13, backgroundColor: theme.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  repairCopy: { flex: 1, minWidth: 0 },
  repairTitle: { color: theme.colors.text, fontSize: 16, lineHeight: 20, fontWeight: '800' },
  repairContext: { marginTop: 1, color: theme.colors.subtext, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  overflowButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  progressRow: { marginTop: 7 },
  stepText: { color: theme.colors.subtext, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  progressTrack: { height: 5, marginTop: 4, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceMuted, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary },
  repairActions: { marginTop: 8, flexDirection: 'row', gap: 7 },
  resumeButton: { flex: 1.15, minHeight: 38, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  resumeText: { color: theme.colors.white, fontSize: 13, lineHeight: 17, fontWeight: '800' },
  toolsButton: { flex: 1, minHeight: 38, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.cardHighlight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  toolsText: { color: theme.colors.primary, fontSize: 13, lineHeight: 17, fontWeight: '800' },
  overflowActions: { marginTop: 8, paddingTop: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, flexDirection: 'row', justifyContent: 'flex-end', gap: 7 },
  contextAction: { minHeight: 32, borderRadius: theme.radius.pill, backgroundColor: theme.colors.cardHighlight, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  contextLabel: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
  contextLabelWarning: { color: theme.colors.warningText },
  activityList: { borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceRaised, overflow: 'hidden' },
  activityItem: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border, paddingHorizontal: 11, paddingVertical: 8 },
  activityMainRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8 },
  completeIcon: { width: 26, height: 26, borderRadius: 11, backgroundColor: '#EDF3EB', alignItems: 'center', justifyContent: 'center' },
  activityTitle: { color: theme.colors.text, fontSize: 13, lineHeight: 17, fontWeight: '650' },
  activityMeta: { marginTop: 1, color: theme.colors.subtext, fontSize: 10, lineHeight: 14, fontWeight: '500' },
  notesPreview: { marginTop: 5, marginLeft: 35, color: theme.colors.subtext, fontSize: 11, lineHeight: 16 },
  notesEditor: { marginTop: 8 },
  notesInput: { minHeight: 72, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.cardHighlight, paddingHorizontal: 10, paddingVertical: 9, color: theme.colors.text, fontSize: 13, lineHeight: 19 },
  editorActions: { marginTop: 7, flexDirection: 'row', justifyContent: 'flex-end', gap: 7 },
  editorSecondary: { minHeight: 34, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  editorSecondaryText: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  editorPrimary: { minHeight: 34, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  editorPrimaryText: { color: theme.colors.white, fontSize: 11, fontWeight: '800' },
  viewAllButton: { minHeight: 42, marginTop: 8, borderRadius: theme.radius.pill, alignSelf: 'center', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  viewAllText: { color: theme.colors.primary, fontSize: theme.typography.caption, fontWeight: '800' },
  pageFooter: { marginTop: theme.spacing.xl, alignItems: 'center' },
  footerDivider: { width: '100%', height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, marginBottom: theme.spacing.lg },
  footerTitle: { color: theme.colors.text, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  footerBody: { marginTop: 3, color: theme.colors.subtext, fontSize: theme.typography.caption, lineHeight: 17, textAlign: 'center' },
  homeButton: { minHeight: 40, marginTop: 10, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  homeButtonText: { color: theme.colors.primary, fontSize: theme.typography.caption, fontWeight: '800' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
