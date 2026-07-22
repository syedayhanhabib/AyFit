import { useEffect, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchExerciseById } from '@/lib/exercises-repo';
import { getOrCreateTodaySession, getTodaySession } from '@/lib/session-repo';
import { deleteSet, fetchSetsForSession, insertSet } from '@/lib/workout-set-repo';
import type { Exercise } from '@/types/exercise';
import { bestE1rm } from '@/utils/e1rm';
import { InfoTip } from '@/components/info-tip';
import { BackButton } from '@/components/track/back-button';
import { CategoryDot } from '@/components/track/category-dot';
import { SetRow } from '@/components/track/set-row';
import { StepperField } from '@/components/track/stepper-field';
import { WarmupPill } from '@/components/track/warmup-pill';
import { CategoryAccent, TrackColors, TrackFonts } from '@/constants/track-theme';
import type { LoggedSet } from '@/types/logged-set';

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function parseValidWeight(input: string): number | undefined {
  const value = Number(input.replace(',', '.'));
  return input.trim() !== '' && value > 0 ? value : undefined;
}

function parseValidReps(input: string): number | undefined {
  const value = Number(input.replace(',', '.'));
  return input.trim() !== '' && Number.isInteger(value) && value >= 1 ? value : undefined;
}

function parseValidRpe(input: string): number | undefined {
  const value = Number(input.replace(',', '.'));
  return input.trim() !== '' && value >= 1 && value <= 10 ? value : undefined;
}

export default function ExerciseScreen() {
  const { exerciseId, name, category } = useLocalSearchParams<{
    exerciseId: string;
    name?: string;
    category?: string;
  }>();
  const [fetchedExercise, setFetchedExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(!name);
  const exercise: Exercise | undefined = name ? { id: exerciseId, name } : (fetchedExercise ?? undefined);
  const accent = CategoryAccent[category as keyof typeof CategoryAccent] ?? TrackColors.brand;

  // Deep-link fallback: the category list screen normally passes `name` so no fetch is needed.
  useEffect(() => {
    if (name || !exerciseId) return;
    let cancelled = false;
    fetchExerciseById(exerciseId)
      .then(result => {
        if (!cancelled) setFetchedExercise(result);
      })
      .catch(() => {
        if (!cancelled) setFetchedExercise(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId, name]);

  // Local to this screen session only — lost on unmount; sets themselves are persisted to Supabase on save.
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [rpeInput, setRpeInput] = useState('');
  const [isWarmup, setIsWarmup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const resolvedExerciseId = exercise?.id;

  // Read-back: populate already-logged sets for this exercise when today's session exists.
  // getTodaySession() never creates a row, so merely opening this screen can't spawn a phantom session.
  useEffect(() => {
    if (!resolvedExerciseId) return;
    let cancelled = false;
    (async () => {
      const sessionId = await getTodaySession();
      if (!sessionId) return [];
      return fetchSetsForSession(sessionId, resolvedExerciseId);
    })()
      .then(result => {
        if (!cancelled) setSets(result);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load today’s sets for this exercise.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSets(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedExerciseId]);

  const weight = parseValidWeight(weightInput);
  const reps = parseValidReps(repsInput);
  const rpe = parseValidRpe(rpeInput);
  const isValid = weight !== undefined && reps !== undefined && rpe !== undefined;
  const hasInput = weightInput !== '' || repsInput !== '' || rpeInput !== '';
  const e1rm = bestE1rm(sets);

  function stepWeight(delta: number) {
    const base = weight ?? 60;
    setWeightInput(fmt(Math.max(0, Math.round((base + delta) * 2) / 2)));
  }

  function stepReps(delta: number) {
    const base = reps ?? 5;
    setRepsInput(String(Math.max(1, base + delta)));
  }

  function stepRpe(delta: number) {
    const base = rpe ?? 8;
    setRpeInput(fmt(Math.min(10, Math.max(1, Math.round((base + delta) * 2) / 2))));
  }

  async function handleAddSet() {
    if (!exercise || weight === undefined || reps === undefined || rpe === undefined) return;

    setSaveError(null);
    setIsSaving(true);
    try {
      const sessionId = await getOrCreateTodaySession();
      const id = await insertSet({
        sessionId,
        exerciseId: exercise.id,
        weightKg: weight,
        reps,
        rpe,
        isWarmup,
      });
      setSets(prev => [...prev, { id, exerciseId: exercise.id, weightKg: weight, reps, rpe, isWarmup }]);
      // Keep weight/reps/RPE so repeating a set is one tap; warm-up resets to its off default.
      setIsWarmup(false);
    } catch {
      setSaveError('Could not save set. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSet(id: string) {
    setDeleteError(null);
    try {
      await deleteSet(id);
      setSets(prev => prev.filter(set => set.id !== id));
    } catch {
      setDeleteError('Could not delete set. Try again.');
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: 'padding', default: undefined })}>
          <View style={styles.header}>
            <BackButton onPress={() => router.back()} />
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>
                {exercise?.name ?? 'Exercise'}
              </Text>
              {category && (
                <View style={styles.categoryRow}>
                  <CategoryDot color={accent} size={7} />
                  <Text style={styles.categoryLabel}>{category}</Text>
                </View>
              )}
            </View>
          </View>

          {isLoading ? (
            <View style={styles.centerFill}>
              <ActivityIndicator color={TrackColors.textSecondary} />
            </View>
          ) : !exercise ? (
            <View style={styles.centerFill}>
              <Text style={styles.emptyText}>Exercise not found</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.e1rmCard}>
                  <View style={styles.e1rmLabelRow}>
                    <Text style={styles.cardLabel}>e1RM this session</Text>
                    <InfoTip term="e1rm" />
                  </View>
                  <Text style={styles.e1rmValue}>{e1rm !== undefined ? `${fmt(Math.round(e1rm * 10) / 10)}kg` : '—'}</Text>
                </View>

                {loadError && <Text style={styles.errorText}>{loadError}</Text>}
                {deleteError && <Text style={styles.errorText}>{deleteError}</Text>}

                {isLoadingSets ? (
                  <ActivityIndicator color={TrackColors.textSecondary} />
                ) : sets.length === 0 ? (
                  <Text style={styles.emptyLadderText}>No sets logged yet.</Text>
                ) : (
                  sets.map((set, index) => (
                    <SetRow key={set.id} set={set} index={index} onDelete={() => handleDeleteSet(set.id)} />
                  ))
                )}
              </ScrollView>

              <View style={styles.footer}>
                {hasInput && !isValid && (
                  <Text style={styles.errorText}>
                    Enter weight &gt; 0, whole-number reps &gt;= 1, and RPE between 1 and 10.
                  </Text>
                )}
                {saveError && <Text style={styles.errorText}>{saveError}</Text>}

                <View style={styles.stepperRow}>
                  <StepperField
                    label="Kg"
                    value={weightInput}
                    onChangeText={setWeightInput}
                    onDecrement={() => stepWeight(-2.5)}
                    onIncrement={() => stepWeight(2.5)}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.separator}>×</Text>
                  <StepperField
                    label="Reps"
                    value={repsInput}
                    onChangeText={setRepsInput}
                    onDecrement={() => stepReps(-1)}
                    onIncrement={() => stepReps(1)}
                    keyboardType="number-pad"
                    inputWidth={32}
                  />
                  <Text style={styles.separator}>@ RPE</Text>
                  <StepperField
                    label=""
                    value={rpeInput}
                    onChangeText={setRpeInput}
                    onDecrement={() => stepRpe(-0.5)}
                    onIncrement={() => stepRpe(0.5)}
                    keyboardType="decimal-pad"
                    inputWidth={32}
                  />
                </View>

                <View style={styles.actionRow}>
                  <WarmupPill value={isWarmup} onToggle={() => setIsWarmup(prev => !prev)} />
                  <Pressable
                    onPress={handleAddSet}
                    disabled={!isValid || isSaving}
                    style={({ pressed }) => [
                      styles.addButton,
                      !isValid || isSaving ? styles.addButtonDisabled : null,
                      pressed && isValid && !isSaving && styles.addButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.addButtonLabel,
                        (!isValid || isSaving) && styles.addButtonLabelDisabled,
                      ]}
                    >
                      {isSaving ? 'Saving…' : 'Add set'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: TrackColors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontFamily: TrackFonts.uiBold, fontSize: 19, color: TrackColors.text },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  categoryLabel: {
    fontFamily: TrackFonts.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: TrackColors.textSecondary,
    textTransform: 'uppercase',
  },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: TrackFonts.uiRegular, fontSize: 14, color: TrackColors.textSecondary },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 12 },
  cardLabel: {
    fontFamily: TrackFonts.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: TrackColors.textMuted,
    textTransform: 'uppercase',
  },
  e1rmCard: {
    backgroundColor: TrackColors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TrackColors.border,
    gap: 4,
  },
  e1rmLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  e1rmValue: {
    fontFamily: TrackFonts.numeralBold,
    fontSize: 36,
    color: TrackColors.text,
    fontVariant: ['tabular-nums'],
  },
  errorText: { fontFamily: TrackFonts.uiRegular, fontSize: 13, color: TrackColors.textSecondary, marginBottom: 8 },
  emptyLadderText: {
    fontFamily: TrackFonts.uiRegular,
    fontSize: 13,
    color: TrackColors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: '#1B1D20',
    borderTopWidth: 1,
    borderTopColor: TrackColors.border,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginBottom: 10 },
  separator: { color: TrackColors.textMuted, fontFamily: TrackFonts.uiRegular, fontSize: 13, alignSelf: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: TrackColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { backgroundColor: TrackColors.surface },
  addButtonPressed: { backgroundColor: TrackColors.brandPressed },
  addButtonLabel: { fontFamily: TrackFonts.uiBold, fontSize: 16, color: TrackColors.text },
  addButtonLabelDisabled: { color: TrackColors.textMuted },
});
