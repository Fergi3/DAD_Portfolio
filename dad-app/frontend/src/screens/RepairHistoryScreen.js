import React, { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import PrimaryButton from '../components/PrimaryButton';
import ScreenCard from '../components/ScreenCard';
import theme from '../constants/theme';
import { deleteRepair, getRepairs, updateRepair } from '../services/repairStorage';

export default function RepairHistoryScreen({ navigation }) {
  const [repairs, setRepairs] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draftNotes, setDraftNotes] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadRepairs() {
        const savedRepairs = await getRepairs();
        if (isActive) {
          setRepairs(savedRepairs);
        }
      }

      loadRepairs();

      return () => {
        isActive = false;
      };
    }, [])
  );

  async function refreshRepairs() {
    const savedRepairs = await getRepairs();
    setRepairs(savedRepairs);
  }

  function handleEditStart(repair) {
    setEditingId(repair.id);
    setDraftNotes(repair.notes || '');
  }

  async function handleSaveEdit(repairId) {
    await updateRepair(repairId, { notes: draftNotes.trim() });
    setEditingId(null);
    setDraftNotes('');
    await refreshRepairs();
  }

  function handleCancelEdit() {
    setEditingId(null);
    setDraftNotes('');
  }

  async function confirmDeleteRepair(repair) {
    await deleteRepair(repair.id);
    if (editingId === repair.id) {
      handleCancelEdit();
    }
    await refreshRepairs();
  }

  function handleDeleteRepair(repair) {
    const message = `Remove "${repair.issue}" from your repair history?`;

    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm ? globalThis.confirm(message) : false;
      if (confirmed) {
        confirmDeleteRepair(repair);
      }
      return;
    }

    Alert.alert('Delete Repair', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          confirmDeleteRepair(repair);
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>Saved Repairs</Text>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>
          Look back at what you have already fixed and any notes you saved along the way.
        </Text>
      </View>

      {repairs.length === 0 ? (
        <ScreenCard>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptyText}>
            After you finish a repair, you can save it and it will show up here.
          </Text>
          <PrimaryButton title="Start a Repair" onPress={() => navigation.navigate('Home')} />
        </ScreenCard>
      ) : (
        repairs.map((repair) => (
          <ScreenCard key={repair.id} style={styles.repairCard}>
            <View style={styles.repairHeader}>
              <Text style={styles.repairIssue}>{repair.issue}</Text>
              <Text style={styles.repairDate}>{formatDate(repair.date)}</Text>
            </View>
            <Text style={styles.repairCategory}>{repair.category}</Text>

            {editingId === repair.id ? (
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={draftNotes}
                  onChangeText={setDraftNotes}
                  placeholder="Add or update your notes"
                  placeholderTextColor={theme.colors.subtext}
                  multiline
                  textAlignVertical="top"
                />

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.secondaryAction}
                    activeOpacity={0.85}
                    onPress={handleCancelEdit}
                  >
                    <Text style={styles.secondaryActionText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryAction}
                    activeOpacity={0.85}
                    onPress={() => handleSaveEdit(repair.id)}
                  >
                    <Text style={styles.primaryActionText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {repair.notes ? <Text style={styles.repairNotes}>{repair.notes}</Text> : null}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.secondaryAction}
                    activeOpacity={0.85}
                    onPress={() => handleEditStart(repair)}
                  >
                    <Text style={styles.secondaryActionText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteIconButton}
                    activeOpacity={0.85}
                    onPress={() => handleDeleteRepair(repair)}
                  >
                    <Text style={styles.deleteIcon}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScreenCard>
        ))
      )}
    </ScrollView>
  );
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Saved recently';
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  kicker: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.heading,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 24,
  },
  emptyTitle: {
    fontSize: theme.typography.title,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 24,
  },
  repairCard: {
    backgroundColor: theme.colors.surface,
  },
  repairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  repairIssue: {
    flex: 1,
    fontSize: theme.typography.title,
    fontWeight: '700',
    color: theme.colors.text,
  },
  repairDate: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: theme.spacing.xs,
  },
  repairCategory: {
    fontSize: theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  repairNotes: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 24,
    marginTop: theme.spacing.sm,
  },
  editSection: {
    marginTop: theme.spacing.sm,
  },
  editLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  notesInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.cardHighlight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  primaryAction: {
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.cardHighlight,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  secondaryAction: {
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardHighlight,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  deleteIconButton: {
    minWidth: 72,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
    backgroundColor: theme.colors.warningBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  deleteIcon: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.warningText,
  },
});
