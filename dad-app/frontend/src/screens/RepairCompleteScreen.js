import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

import PrimaryButton from '../components/PrimaryButton';
import ScreenCard from '../components/ScreenCard';
import theme from '../constants/theme';
import { saveRepair, updateRepair } from '../services/repairStorage';
import { completeRepairTodo, deleteRepairTodo } from '../services/toolboxStorage';

export default function RepairCompleteScreen({ navigation, route }) {
  const { width, height } = useWindowDimensions();
  const { label, categoryTitle, repairTodoId } = route.params;
  const [notes, setNotes] = useState('');
  const [showSaveSection, setShowSaveSection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedRepairId, setSavedRepairId] = useState(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSaveSection(true);
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!repairTodoId) return;

    async function completeActiveTodo() {
      await completeRepairTodo(repairTodoId);
      await deleteRepairTodo(repairTodoId);
    }

    completeActiveTodo().catch(() => {
      // Keep completion flow smooth even if cleanup fails.
    });
  }, [repairTodoId]);

  useEffect(() => {
    let active = true;

    async function saveCompletedRepairToHistory() {
      setSaveError('');
      try {
        const savedRepair = await saveRepair({
          issue: label,
          category: categoryTitle || 'General',
          date: new Date().toISOString(),
          notes: '',
        });
        if (active) {
          setSavedRepairId(savedRepair.id);
          setSaved(true);
        }
      } catch (err) {
        if (active) setSaveError('Could not save to history yet. You can try again below.');
      }
    }

    saveCompletedRepairToHistory();

    return () => {
      active = false;
    };
  }, [categoryTitle, label]);

  const completedDateLabel = useMemo(() => new Date().toLocaleDateString(), []);

  async function handleSaveRepair() {
    if (saving) return;

    setSaving(true);
    setSaveError('');
    try {
      if (savedRepairId) {
        await updateRepair(savedRepairId, { notes: notes.trim() });
      } else {
        const savedRepair = await saveRepair({
          issue: label,
          category: categoryTitle || 'General',
          date: new Date().toISOString(),
          notes: notes.trim(),
        });
        setSavedRepairId(savedRepair.id);
      }
      setSaved(true);
    } catch (err) {
      setSaveError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.confettiOverlay}>
        <ConfettiCannon
          count={180}
          origin={{ x: width / 2, y: -24 }}
          fadeOut
          explosionSpeed={360}
          fallSpeed={3200}
          autoStart
        />
        <ConfettiCannon
          count={120}
          origin={{ x: width * 0.18, y: height * 0.18 }}
          fadeOut
          explosionSpeed={300}
          fallSpeed={3000}
          autoStart
        />
        <ConfettiCannon
          count={120}
          origin={{ x: width * 0.82, y: height * 0.18 }}
          fadeOut
          explosionSpeed={300}
          fallSpeed={3000}
          autoStart
        />
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>{categoryTitle || 'Completed Repair'}</Text>
          <Text style={styles.title}>Nice work.</Text>
          <Text style={styles.subtitle}>
            You finished the repair for {label}. D.A.D. saved it to your repair history.
          </Text>
        </View>

        <ScreenCard style={styles.successCard}>
          <View style={styles.successBadge}>
            <Text style={styles.successBadgeText}>Completed</Text>
          </View>
          <Text style={styles.issueTitle}>{label}</Text>
          <Text style={styles.successMeta}>
            {categoryTitle || 'General'} | Completed {completedDateLabel}
          </Text>
        </ScreenCard>

        {showSaveSection ? (
          <ScreenCard style={styles.saveCard}>
            <Text style={styles.saveTitle}>Repair History</Text>
            <Text style={styles.saveSubtitle}>
              Add an optional note for next time.
            </Text>

            <Text style={styles.notesLabel}>Optional notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="What worked, what to watch next time, or anything you want to remember"
              placeholderTextColor={theme.colors.subtext}
              multiline
              textAlignVertical="top"
              editable={!saving}
            />

            <TouchableOpacity
              style={[
                styles.saveButton,
                saved && !notes.trim() && styles.saveButtonSaved,
                saving && styles.saveButtonDisabled,
              ]}
              activeOpacity={0.88}
              disabled={saving}
              onPress={handleSaveRepair}
            >
              <Text style={[styles.saveButtonText, saved && !notes.trim() && styles.saveButtonTextSaved]}>
                {saving ? 'Saving...' : notes.trim() ? 'Update Notes' : 'Saved'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.saveFeedback, saved && styles.saveFeedbackVisible]}>
              Saved to your repair history
            </Text>
            {saveError ? <Text style={styles.saveErrorText}>{saveError}</Text> : null}
          </ScreenCard>
        ) : (
          <View style={styles.savePlaceholder} />
        )}

        <PrimaryButton
          title="Back to Home"
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          }
        />

        <TouchableOpacity
          style={styles.historyLink}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('RepairsTodo', { initialTab: 'history' })}
        >
          <Text style={styles.historyLinkText}>View Repair History</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  confettiOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
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
  successCard: {
    backgroundColor: theme.colors.cardHighlight,
  },
  successBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  successBadgeText: {
    fontSize: theme.typography.caption,
    fontWeight: '800',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  issueTitle: {
    fontSize: theme.typography.title,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  successMeta: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 23,
  },
  saveCard: {
    backgroundColor: theme.colors.surface,
  },
  saveTitle: {
    fontSize: theme.typography.sectionHeading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  saveSubtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.subtext,
    lineHeight: 23,
    marginBottom: theme.spacing.sm,
  },
  notesLabel: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  notesInput: {
    minHeight: 104,
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
  saveButton: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.cardHighlight,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonSaved: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
  },
  saveButtonDisabled: {
    opacity: 0.72,
  },
  saveButtonText: {
    fontSize: theme.typography.body,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  saveButtonTextSaved: {
    color: theme.colors.success,
  },
  saveFeedback: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    color: theme.colors.success,
    opacity: 0,
  },
  saveFeedbackVisible: {
    opacity: 1,
  },
  saveErrorText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    color: theme.colors.danger,
  },
  savePlaceholder: {
    height: 210,
  },
  historyLink: {
    marginTop: theme.spacing.sm,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  historyLinkText: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
