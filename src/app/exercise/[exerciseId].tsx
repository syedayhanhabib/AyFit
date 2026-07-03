import { useRef, useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { EXERCISES } from '@/constants/exercises';
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
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const exercise = EXERCISES.find(item => item.id === exerciseId);
  const theme = useTheme();

  // Local to this screen session only — lost on unmount. Supabase persistence is a later step.
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [rpeInput, setRpeInput] = useState('');
  const [isWarmup, setIsWarmup] = useState(false);
  const nextId = useRef(0);

  const weight = parseValidWeight(weightInput);
  const reps = parseValidReps(repsInput);
  const rpe = parseValidRpe(rpeInput);
  const isValid = weight !== undefined && reps !== undefined && rpe !== undefined;
  const hasInput = weightInput !== '' || repsInput !== '' || rpeInput !== '';
  const e1rm = bestE1rm(sets);

  function handleAddSet() {
    if (!exercise || weight === undefined || reps === undefined || rpe === undefined) return;

    setSets(prev => [
      ...prev,
      { id: String(nextId.current++), exerciseId: exercise.id, weightKg: weight, reps, rpe, isWarmup },
    ]);
    // Keep weight/reps/RPE so repeating a set is one tap; warm-up resets to its off default.
    setIsWarmup(false);
  }

  function handleDeleteSet(id: string) {
    setSets(prev => prev.filter(set => set.id !== id));
  }

  return (
    <>
      <Stack.Screen options={{ title: exercise?.name ?? 'Exercise' }} />
      <ThemedView style={styles.container}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: 'padding', default: undefined })}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {!exercise ? (
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

                  <Pressable
                    onPress={handleAddSet}
                    disabled={!isValid}
                    style={({ pressed }) => [
                      styles.addButton,
                      { backgroundColor: isValid ? theme.backgroundSelected : theme.backgroundElement },
                      pressed && isValid && styles.pressed,
                    ]}
                  >
                    <ThemedText type="smallBold" themeColor={isValid ? 'text' : 'textSecondary'}>
                      Add set
                    </ThemedText>
                  </Pressable>
                </View>

                {e1rm !== undefined && (
                  <View style={styles.e1rmRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Best e1RM this session: {e1rm.toFixed(1)}kg
                    </ThemedText>
                    <InfoTip term="e1rm" />
                  </View>
                )}

                <View style={styles.list}>
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
