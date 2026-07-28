import { useCallback, useMemo, useState } from 'react';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { addFavourite, removeFavourite } from '@/lib/exercise-favourite-repo';
import { groupExercisesForList } from '@/lib/exercise-list-grouping';
import { fetchExercisesForMuscle } from '@/lib/exercises-repo';
import { getLastLoggedSetsForMuscle } from '@/lib/workout-set-repo';
import type { LastLoggedByExerciseId } from '@/lib/workout-set-repo';
import { BackButton } from '@/components/track/back-button';
import { CategoryDot } from '@/components/track/category-dot';
import { CategoryAccent, TrackColors, TrackFonts } from '@/constants/track-theme';
import type { Exercise } from '@/types/exercise';
import { fmt } from '@/utils/format-number';
import { formatMovementGroupName } from '@/utils/format-movement-group';
import { formatMuscleName } from '@/utils/format-muscle-name';
import { formatRelativeDate } from '@/utils/format-relative-date';
import { pluralize } from '@/utils/pluralize';

type ExerciseSection = { title: string; data: Exercise[] };

// Both params come from the path (/category/Legs/quads), so this screen needs
// nothing passed in: `muscle` scopes the query, `category` picks the accent.
export default function MuscleExercisesScreen() {
  const { category, muscle } = useLocalSearchParams<{ category: string; muscle: string }>();
  const accent = CategoryAccent[category as keyof typeof CategoryAccent] ?? TrackColors.brand;
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [lastLoggedByExercise, setLastLoggedByExercise] = useState<LastLoggedByExerciseId>({});
  const [error, setError] = useState<string | null>(null);
  const [pendingFavouriteIds, setPendingFavouriteIds] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    // Two independent queries, so they go out together rather than waiting on
    // each other. getLastLoggedSetsForMuscle is keyed by exercise id and is a
    // single batched query — it used to be one getLastLoggedSet call per row,
    // which is 25 round trips on a muscle like chest.
    Promise.all([fetchExercisesForMuscle(muscle), getLastLoggedSetsForMuscle(muscle)])
      .then(([result, lastLogged]) => {
        setError(null);
        setLastLoggedByExercise(lastLogged);
        setExercises(result);
      })
      .catch(() => setError('Could not load exercises. Check your connection and try again.'));
  }, [muscle]);

  // Focus, not mount: this screen stays mounted underneath the logging screen
  // that gets pushed on top of it, so after logging a set and hitting back, the
  // per-row "last logged" subtitles were showing pre-workout values until the
  // app relaunched — the same mount-only bug as Summary's cards, just reached
  // by back-navigation instead of a tab switch.
  useFocusEffect(load);

  // Derived view over `exercises`, same principle as e1RM/volume being
  // computed-live rather than stored — not its own state.
  const listSections = useMemo<ExerciseSection[]>(() => {
    const { favourites, sections } = groupExercisesForList(exercises ?? []);
    const result: ExerciseSection[] = [];
    if (favourites.length > 0) result.push({ title: 'Favourites', data: favourites });
    for (const section of sections) {
      result.push({
        title: section.label === null ? '' : formatMovementGroupName(section.label),
        data: section.exercises,
      });
    }
    return result;
  }, [exercises]);

  function handleRetry() {
    setError(null);
    setExercises(null);
    load();
  }

  function setExerciseFavourited(exerciseId: string, isFavourited: boolean) {
    setExercises(prev =>
      prev ? prev.map(e => (e.id === exerciseId ? { ...e, isFavourited } : e)) : prev,
    );
  }

  async function handleToggleFavourite(exercise: Exercise) {
    if (pendingFavouriteIds[exercise.id]) return;

    const previousValue = exercise.isFavourited;
    setPendingFavouriteIds(prev => ({ ...prev, [exercise.id]: true }));
    setExerciseFavourited(exercise.id, !previousValue);

    try {
      if (previousValue) {
        await removeFavourite(exercise.id);
      } else {
        await addFavourite(exercise.id);
      }
    } catch {
      setExerciseFavourited(exercise.id, previousValue);
    } finally {
      setPendingFavouriteIds(prev => {
        const next = { ...prev };
        delete next[exercise.id];
        return next;
      });
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <BackButton onPress={() => router.back()} />
            <View style={styles.headerText}>
              <View style={styles.titleRow}>
                <CategoryDot color={accent} />
                <Text style={styles.title}>{formatMuscleName(muscle)}</Text>
              </View>
              <Text style={styles.eyebrow}>
                {exercises === null
                  ? '—'
                  : `${exercises.length} ${pluralize(exercises.length, 'exercise')}`}
              </Text>
            </View>
          </View>

          {error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{error}</Text>
              <Pressable
                onPress={handleRetry}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              >
                <Text style={styles.retryLabel}>Retry</Text>
              </Pressable>
            </View>
          ) : exercises === null ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={TrackColors.textSecondary} />
            </View>
          ) : exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No exercises for this muscle yet.</Text>
            </View>
          ) : (
            <SectionList
              style={styles.sectionList}
              sections={listSections}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              // Muscle lists top out around 40 rows + a handful of section
              // headers (Back) — small enough to render in full upfront
              // rather than lean on scroll-triggered windowing, which needs
              // rAF to expand its render window (see CLAUDE.md's
              // VirtualizedList-on-web caution).
              initialNumToRender={100}
              renderSectionHeader={({ section }) =>
                section.title === '' ? null : (
                  <Text style={styles.sectionHeader}>{section.title}</Text>
                )
              }
              renderItem={({ item: exercise }) => {
                const lastLogged = lastLoggedByExercise[exercise.id];
                const isPending = pendingFavouriteIds[exercise.id] === true;
                return (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/exercise/[exerciseId]',
                        params: { exerciseId: exercise.id, name: exercise.name, category },
                      })
                    }
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <Pressable
                      onPress={event => {
                        event.stopPropagation();
                        handleToggleFavourite(exercise);
                      }}
                      hitSlop={14}
                      style={styles.favouriteButton}
                    >
                      <MaterialCommunityIcons
                        name={exercise.isFavourited ? 'star' : 'star-outline'}
                        size={20}
                        color={exercise.isFavourited ? TrackColors.brand : TrackColors.textMuted}
                        style={isPending && styles.favouriteIconPending}
                      />
                    </Pressable>
                    <View style={styles.rowTextColumn}>
                      <Text style={styles.rowLabel}>{exercise.name}</Text>
                      {lastLogged && (
                        <Text style={styles.rowSubtitle} numberOfLines={1}>
                          <Text style={styles.rowSubtitleMono}>
                            {fmt(lastLogged.weightKg)}kg × {lastLogged.reps}
                          </Text>
                          {' · '}
                          {formatRelativeDate(lastLogged.sessionDate)}
                        </Text>
                      )}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={TrackColors.textMuted} />
                  </Pressable>
                );
              }}
            />
          )}
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: TrackColors.background },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 18, paddingTop: 4 },
  headerText: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: TrackFonts.uiBold, fontSize: 22, color: TrackColors.text },
  eyebrow: {
    fontFamily: TrackFonts.numeralMedium,
    fontSize: 12,
    letterSpacing: 1.5,
    color: TrackColors.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  sectionList: { flex: 1 },
  list: { paddingBottom: 24 },
  sectionHeader: {
    fontFamily: TrackFonts.uiSemiBold,
    fontSize: 12,
    letterSpacing: 1.5,
    color: TrackColors.textMuted,
    textTransform: 'uppercase',
    backgroundColor: TrackColors.background,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: TrackColors.border,
  },
  rowPressed: { backgroundColor: TrackColors.surface },
  favouriteButton: { alignItems: 'center', justifyContent: 'center' },
  favouriteIconPending: { opacity: 0.4 },
  rowTextColumn: { flex: 1, minWidth: 0, gap: 2 },
  rowLabel: { fontFamily: TrackFonts.uiSemiBold, fontSize: 16, color: TrackColors.text },
  rowSubtitle: { fontFamily: TrackFonts.uiRegular, fontSize: 13, color: TrackColors.textSecondary },
  rowSubtitleMono: { fontFamily: TrackFonts.numeralMedium, color: TrackColors.textSecondary },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  emptyText: { fontFamily: TrackFonts.uiRegular, fontSize: 14, color: TrackColors.textSecondary, textAlign: 'center' },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: TrackColors.surface },
  retryLabel: { fontFamily: TrackFonts.uiBold, fontSize: 14, color: TrackColors.text },
  pressed: { opacity: 0.75 },
});
