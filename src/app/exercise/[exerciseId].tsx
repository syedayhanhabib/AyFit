import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { fetchExerciseById } from '@/lib/exercises-repo';
import { getOrCreateTodaySession, getTodaySession } from '@/lib/session-repo';
import { deleteSet, fetchSetsForSession, insertSet } from '@/lib/workout-set-repo';
import type { Exercise } from '@/types/exercise';
import { bestE1rm } from '@/utils/e1rm';
import { InfoTip } from '@/components/info-tip';
import type { GlossaryTermKey } from '@/constants/glossary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import type { LoggedSet } from '@/types/logged-set';

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
  const { exerciseId, name } = useLocalSearchParams<{ exerciseId: string; name?: string }>();
  const [fetchedExercise, setFetchedExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(!name);
  const exercise: Exercise | undefined = name ? { id: exerciseId, name } : (fetchedExercise ?? undefined);
  const theme = useTheme();

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
      <Stack.Screen options={{ title: exercise?.name ?? 'Exercise' }} />
      <ThemedView style={styles.container}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: 'padding', default: undefined })}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {isLoading ? (
              <ActivityIndicator color={theme.textSecondary} />
            ) : !exercise ? (
              <ThemedText type="default" themeColor="textSecondary">
                Exercise not found
              </ThemedText>
            ) : (
              <>
                <View style={styles.entry}>
                  <View style={styles.fieldRow}>
                    <NumberField label="Weight (kg)" value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" />
                    <ThemedText type="default" themeColor="textSecondary">x</ThemedText>
                    <NumberField label="Reps" value={repsInput} onChangeText={setRepsInput} keyboardType="number-pad" />
                    <ThemedText type="default" themeColor="textSecondary">@ RPE</ThemedText>
                    <NumberField
                      label="RPE"
                      value={rpeInput}
                      onChangeText={setRpeInput}
                      keyboardType="decimal-pad"
                      labelInfoTerm="rpe"
                    />
                  </View>

                  <View style={styles.warmupRow}>
                    <View style={styles.fieldLabelRow}>
                      <ThemedText type="default">Warm-up set</ThemedText>
                      <InfoTip term="warmUp" />
                    </View>
                    <Switch value={isWarmup} onValueChange={setIsWarmup} />
                  </View>

                  {hasInput && !isValid && (
                    <ThemedText type="small" themeColor="textSecondary">
                      Enter weight &gt; 0, whole-number reps &gt;= 1, and RPE between 1 and 10.
                    </ThemedText>
                  )}

                  {saveError && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {saveError}
                    </ThemedText>
                  )}

                  <Pressable
                    onPress={handleAddSet}
                    disabled={!isValid || isSaving}
                    style={({ pressed }) => [
                      styles.addButton,
                      { backgroundColor: isValid && !isSaving ? theme.backgroundSelected : theme.backgroundElement },
                      pressed && isValid && !isSaving && styles.pressed,
                    ]}
                  >
                    <ThemedText type="smallBold" themeColor={isValid && !isSaving ? 'text' : 'textSecondary'}>
                      {isSaving ? 'Saving…' : 'Add set'}
                    </ThemedText>
                  </Pressable>
                </View>

                {deleteError && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {deleteError}
                  </ThemedText>
                )}

                {loadError && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {loadError}
                  </ThemedText>
                )}

                {e1rm !== undefined && (
                  <View style={styles.e1rmRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Best e1RM this session: {e1rm.toFixed(1)}kg
                    </ThemedText>
                    <InfoTip term="e1rm" />
                  </View>
                )}

                <View style={styles.list}>
                  {isLoadingSets && <ActivityIndicator color={theme.textSecondary} />}
                  {sets.map((set, index) => (
                    <View key={set.id} style={[styles.setRow, { backgroundColor: theme.backgroundElement }]}>
                      {/* Warm-up sets still get a number but are excluded from e1RM/volume math per CLAUDE.md. */}
                      <ThemedText
                        type="default"
                        themeColor={set.isWarmup ? 'textSecondary' : 'text'}
                        style={styles.setLabel}
                      >
                        {`Set ${index + 1}: ${set.weightKg}kg x ${set.reps} @ RPE ${set.rpe}`}
                      </ThemedText>
                      {set.isWarmup && (
                        <ThemedText type="small" themeColor="textSecondary">
                          warm-up
                        </ThemedText>
                      )}
                      <Pressable onPress={() => handleDeleteSet(set.id)} hitSlop={8}>
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.textSecondary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </>
  );
}

type NumberFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType: 'decimal-pad' | 'number-pad';
  labelInfoTerm?: GlossaryTermKey;
};

function NumberField({ label, value, onChangeText, keyboardType, labelInfoTerm }: NumberFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
        {labelInfoTerm && <InfoTip term={labelInfoTerm} />}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  entry: { gap: Spacing.two },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  field: { gap: Spacing.one },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  input: {
    minWidth: 56,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 16,
  },
  warmupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addButton: { borderRadius: Spacing.two, paddingVertical: Spacing.two, alignItems: 'center' },
  pressed: { opacity: 0.75 },
  list: { gap: Spacing.two },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 56,
  },
  setLabel: { flex: 1 },
  e1rmRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
