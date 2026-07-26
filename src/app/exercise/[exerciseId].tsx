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
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchExerciseById } from '@/lib/exercises-repo';
import { getOrCreateTodaySession, getTodaySession } from '@/lib/session-repo';
import { deleteSet, fetchSetsForSession, getLastLoggedSet, insertSet } from '@/lib/workout-set-repo';
import type { LastLoggedSet } from '@/lib/workout-set-repo';
import type { Exercise } from '@/types/exercise';
import { bestE1rm } from '@/utils/e1rm';
import { InfoTip } from '@/components/info-tip';
import { BackButton } from '@/components/track/back-button';
import { CategoryDot } from '@/components/track/category-dot';
import { SetRow } from '@/components/track/set-row';
import { ValueChip } from '@/components/track/value-chip';
import { WheelPickerModal } from '@/components/track/wheel-picker-modal';
import { WarmupPill } from '@/components/track/warmup-pill';
import { CategoryAccent, TrackColors, TrackFonts } from '@/constants/track-theme';
import type { LoggedSet } from '@/types/logged-set';
import { fmt } from '@/utils/format-number';

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

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  // Accumulating `from + i * step` rather than `current += step` keeps 2.5 and
  // 0.5 steps off floating-point drift, so values stay exactly representable
  // and `fmt` never renders something like 57.50000000000001.
  for (let i = 0; from + i * step <= to; i++) out.push(from + i * step);
  return out;
}

// Every value on every wheel passes the validators above, deliberately: the
// weight wheel starts at 2.5 rather than 0 because `parseValidWeight` rejects 0
// (it always has), so a 0 stop would be a selectable value that silently leaves
// "Add set" disabled. Validation itself is untouched by this row's redesign.
const WEIGHT_VALUES = range(2.5, 300, 2.5);
const REPS_VALUES = range(1, 50, 1);
const RPE_VALUES = range(1, 10, 0.5);

// Where each wheel opens when its field is still empty — same starting points
// the old stepper buttons used as their `base` when stepping from empty.
const WEIGHT_FALLBACK = 60;
const REPS_FALLBACK = 5;
const RPE_FALLBACK = 8;

type ActiveField = 'weight' | 'reps' | 'rpe';

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
  // undefined doubles as "haven't logged this before" once isLoadingSets is
  // false — while still loading, it just means "not resolved yet" and the
  // card stays hidden either way, but the two states are never conflated.
  const [previousSet, setPreviousSet] = useState<LastLoggedSet | undefined>(undefined);
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [rpeInput, setRpeInput] = useState('');
  const [isWarmup, setIsWarmup] = useState(false);
  // Which field's wheel picker is open, if any. The modal is rendered
  // conditionally off this rather than kept mounted behind `visible={false}`,
  // so each open re-seeds the wheel from the field's current value.
  const [activeField, setActiveField] = useState<ActiveField | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const resolvedExerciseId = exercise?.id;

  // Read-back: populate already-logged sets for this exercise when today's session exists,
  // plus the last time this exercise was logged (excluding today's own session — that's what
  // the set ladder above already covers). getTodaySession() never creates a row, so merely
  // opening this screen can't spawn a phantom session.
  useEffect(() => {
    if (!resolvedExerciseId) return;
    let cancelled = false;
    (async () => {
      const sessionId = await getTodaySession();
      return Promise.all([
        sessionId ? fetchSetsForSession(sessionId, resolvedExerciseId) : [],
        getLastLoggedSet(resolvedExerciseId, sessionId ?? undefined),
      ]);
    })()
      .then(([todaysSets, previous]) => {
        if (!cancelled) {
          setSets(todaysSets);
          setPreviousSet(previous);
        }
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

  function handlePickerConfirm(value: number) {
    if (activeField === 'weight') setWeightInput(fmt(value));
    else if (activeField === 'reps') setRepsInput(String(value));
    else if (activeField === 'rpe') setRpeInput(fmt(value));
    setActiveField(null);
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
        <SafeAreaView style={styles.safeArea} edges={['top']}>
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
                <View style={styles.inputCard}>
                  {hasInput && !isValid && (
                    <Text style={styles.errorText}>
                      Enter weight &gt; 0, whole-number reps &gt;= 1, and RPE between 1 and 10.
                    </Text>
                  )}
                  {saveError && <Text style={styles.errorText}>{saveError}</Text>}

                  <View style={styles.chipRow}>
                    <ValueChip
                      label="Kg"
                      // Weight carries the longest values (up to "297.5"); reps and
                      // RPE never exceed 3 chars, so they can afford to give it room.
                      flex={1.5}
                      value={weightInput}
                      onPress={() => setActiveField('weight')}
                    />
                    <ValueChip label="Reps" value={repsInput} onPress={() => setActiveField('reps')} />
                    <ValueChip
                      label="RPE"
                      labelStyle={styles.dottedUnderline}
                      icon={<InfoTip term="rpe" />}
                      value={rpeInput}
                      onPress={() => setActiveField('rpe')}
                    />
                  </View>

                  <View style={styles.actionRow}>
                    <View style={styles.warmupGroup}>
                      <WarmupPill value={isWarmup} onToggle={() => setIsWarmup(prev => !prev)} />
                      <InfoTip term="warmUp" />
                    </View>
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

                <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                  <View style={styles.e1rmCard}>
                    <View style={styles.e1rmLabelRow}>
                      <Text style={[styles.cardLabel, styles.dottedUnderline]}>e1RM this session</Text>
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

                  {!isLoadingSets && previousSet && (
                    <View style={styles.previousCard}>
                      <Text style={styles.cardLabel}>Last time</Text>
                      <Text style={styles.previousValue}>
                        {fmt(previousSet.weightKg)}kg × {previousSet.reps} @ RPE {fmt(previousSet.rpe)}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {activeField === 'weight' && (
                  <WheelPickerModal
                    title="Weight"
                    unit="kg"
                    values={WEIGHT_VALUES}
                    value={weight}
                    fallback={WEIGHT_FALLBACK}
                    onConfirm={handlePickerConfirm}
                    onCancel={() => setActiveField(null)}
                  />
                )}
                {activeField === 'reps' && (
                  <WheelPickerModal
                    title="Reps"
                    values={REPS_VALUES}
                    value={reps}
                    fallback={REPS_FALLBACK}
                    onConfirm={handlePickerConfirm}
                    onCancel={() => setActiveField(null)}
                  />
                )}
                {activeField === 'rpe' && (
                  <WheelPickerModal
                    title="RPE"
                    values={RPE_VALUES}
                    value={rpe}
                    fallback={RPE_FALLBACK}
                    onConfirm={handlePickerConfirm}
                    onCancel={() => setActiveField(null)}
                  />
                )}
              </>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
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
  safeArea: { flex: 1 },
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  cardLabel: {
    fontFamily: TrackFonts.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: TrackColors.textMuted,
    textTransform: 'uppercase',
  },
  dottedUnderline: {
    alignSelf: 'flex-start',
    borderBottomWidth: 1,
    borderStyle: 'dotted',
    borderBottomColor: TrackColors.textSecondary,
    paddingBottom: 1,
  },
  previousCard: {
    backgroundColor: TrackColors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TrackColors.border,
    gap: 4,
  },
  previousValue: {
    fontFamily: TrackFonts.numeralBold,
    fontSize: 20,
    lineHeight: 24,
    color: TrackColors.text,
    fontVariant: ['tabular-nums'],
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
  inputCard: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: TrackColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TrackColors.border,
  },
  chipRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginBottom: 10 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  warmupGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
