import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ValueChip } from '@/components/track/value-chip';
import { WheelPickerModal } from '@/components/track/wheel-picker-modal';
import { Wordmark } from '@/components/wordmark';
import { MinTouchTarget, Palette, Typefaces } from '@/constants/theme';
import { getBodyweightHistory, logBodyweight } from '@/lib/bodyweight-repo';
import { getProfile, saveProfile } from '@/lib/profile-repo';
import type { BodyweightEntry, Profile, ProfileFields, Sex } from '@/types/profile';
import { daysInMonth } from '@/utils/age';
import { formatFullDate } from '@/utils/date-display';
import { fmt } from '@/utils/format-number';
import { cmFromFeetInches, feetInchesFromCm, formatHeightImperial } from '@/utils/height';
import { todayLocalDate } from '@/utils/local-date';

// This is a SECOND copy of range() — the first lives in
// src/app/exercise/[exerciseId].tsx. That is exactly the drift CLAUDE.md
// warns about: fmt() ended up duplicated into three files this same way,
// each copy justified at the time as "just repeating the existing pattern."
// It stays local here only because consolidating it into src/utils/ would
// mean editing [exerciseId].tsx, which is guardrailed during dogfooding —
// and extracting a shared util while leaving that guardrailed copy in place
// would produce THREE copies (the util plus both call sites still on their
// own), not one. Trigger for fixing it: once the dogfooding guardrail
// lifts, move range() into src/utils/ and point both screens at it.
function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let i = 0; from + i * step <= to; i++) out.push(from + i * step);
  return out;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_VALUES = range(1930, CURRENT_YEAR, 1);
const MONTH_VALUES = range(1, 12, 1);
const FEET_VALUES = range(4, 7, 1);
const INCHES_VALUES = range(0, 11, 1);
// 40-200kg, not 30-300: 300kg is not a plausible bodyweight, and the wider
// range's 541 stops was 4.5x the logging screen's weight wheel (WEIGHT_VALUES
// in [exerciseId].tsx, 120 stops) for no realistic benefit. 40-200 covers
// every realistic bodyweight at 321 stops instead. Step stays 0.5 — weights
// land on half-kilos, same as the logging screen's weight wheel. One range,
// shared by BOTH the goal-weight chip and the current-bodyweight chip (6f) —
// not two near-identical 321-element ranges. WheelPickerModal has recorded
// initialScrollIndex / onContentSizeChange fragility inside a Modal (see its
// own file comment and CLAUDE.md), so a wheel still this much longer than
// Track's is an explicit device-check item for 6j's real-device pass, not
// assumed fine just because it scrolled correctly in the web preview.
const BODY_WEIGHT_VALUES = range(40, 200, 0.5);

const DOB_YEAR_FALLBACK = 2000;
const DOB_MONTH_FALLBACK = 6;
const DOB_DAY_FALLBACK = 15;
const HEIGHT_FT_FALLBACK = 5;
const HEIGHT_IN_FALLBACK = 7;
const GOAL_WEIGHT_FALLBACK = 75;
// Where the bodyweight wheel opens when there is no today's entry AND no
// prior weigh-in to fall back to (day one, empty table) — see the `fallback`
// prop on the bodyweight WheelPickerModal below. Same numeric value as
// GOAL_WEIGHT_FALLBACK today,
// kept as its own constant rather than reused: the two fallbacks answer
// different questions (an unset goal vs. an unset bodyweight) that happen to
// share a default, not one concept with two names.
const BODY_WEIGHT_FALLBACK = 75;

type Draft = {
  name: string;
  dobYear: number | undefined;
  dobMonth: number | undefined;
  dobDay: number | undefined;
  sex: Sex | undefined;
  heightFt: number | undefined;
  heightIn: number | undefined;
  goalWeightKg: number | undefined;
};

const EMPTY_DRAFT: Draft = {
  name: '',
  dobYear: undefined,
  dobMonth: undefined,
  dobDay: undefined,
  sex: undefined,
  heightFt: undefined,
  heightIn: undefined,
  goalWeightKg: undefined,
};

// Derives the editable draft from a fetched Profile, or from `undefined` —
// the day-one, no-row-yet state, which is also today's REAL state since the
// table is currently empty. Height is converted cm -> ft/in here;
// cmFromFeetInches runs the other way on save.
function deriveDraft(profile: Profile | undefined): Draft {
  if (!profile) return EMPTY_DRAFT;

  const [year, month, day] = profile.dateOfBirth
    ? profile.dateOfBirth.split('-').map(Number)
    : [undefined, undefined, undefined];
  const heightParts = profile.heightCm !== undefined ? feetInchesFromCm(profile.heightCm) : undefined;

  return {
    name: profile.name ?? '',
    dobYear: year,
    dobMonth: month,
    dobDay: day,
    sex: profile.sex,
    heightFt: heightParts?.feet,
    heightIn: heightParts?.inches,
    goalWeightKg: profile.goalWeightKg,
  };
}

function draftsEqual(a: Draft, b: Draft): boolean {
  return (
    a.name === b.name &&
    a.dobYear === b.dobYear &&
    a.dobMonth === b.dobMonth &&
    a.dobDay === b.dobDay &&
    a.sex === b.sex &&
    a.heightFt === b.heightFt &&
    a.heightIn === b.heightIn &&
    a.goalWeightKg === b.goalWeightKg
  );
}

function dobYmd(draft: Draft): string | undefined {
  if (draft.dobYear === undefined || draft.dobMonth === undefined || draft.dobDay === undefined) {
    return undefined;
  }
  return `${draft.dobYear}-${String(draft.dobMonth).padStart(2, '0')}-${String(draft.dobDay).padStart(2, '0')}`;
}

type ActiveField = 'dobYear' | 'dobMonth' | 'dobDay' | 'heightFt' | 'heightIn' | 'goalWeight' | 'bodyWeight';

export default function ProfileScreen() {
  // isLoading and fetchError are SEPARATE flags rather than using a `null`
  // profile as a loading/error sentinel — storing null in state can't tell
  // not-yet-fetched apart from confirmed-absent apart from fetch-failed,
  // which is exactly the three-states-one-token wart CLAUDE.md records
  // against src/app/exercise/[exerciseId].tsx:78-92. A failed FIRST load
  // renders a distinguishable error rather than an empty form.
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  // Mirrors the Details card's three-flag shape immediately above (isLoading /
  // fetchError / hasLoadedOnce) for intra-screen consistency — its OWN copies,
  // not shared state, so a bodyweight fetch failure can never blank the
  // profile form and a profile fetch failure can never blank this card (see
  // the independent-promise-chain note on loadBodyweight below). Whether a
  // background refetch failure here should instead keep showing stale data
  // (as this does) or surface an error is exactly the one app-wide stale-data
  // policy CLAUDE.md parks for the offline-support phase — not decided here.
  const [bwHistory, setBwHistory] = useState<BodyweightEntry[]>([]);
  const [isBwLoading, setIsBwLoading] = useState(true);
  const [bwFetchError, setBwFetchError] = useState(false);
  const hasLoadedBwOnceRef = useRef(false);

  // Set only on a failed logBodyweight write, so the wheel reopens where the
  // user left off instead of making them re-scroll to the value that didn't
  // save. Cleared on the next successful write.
  const [lastAttemptedWeightKg, setLastAttemptedWeightKg] = useState<number | undefined>(undefined);
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [savedDraft, setSavedDraft] = useState<Draft>(EMPTY_DRAFT);
  const [activeField, setActiveField] = useState<ActiveField | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isDirty = !draftsEqual(draft, savedDraft);

  // Mirrored into a ref so the focus-effect callback below (deps
  // [loadBodyweight], which is itself useCallback([])'d and so never
  // changes — stable deps, so the callback is still effectively created
  // once) can read the CURRENT dirty state rather than whatever it was when
  // the effect was set up.
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  });

  // Shared by the focus effect below AND the post-write refetch inside
  // handleLogWeight, which is the whole reason this is its own function
  // rather than being inlined into the effect. `isCancelled` defaults to
  // "never cancelled" for the post-write call, which has no unmount race to
  // guard against; the focus effect passes its own `cancelled` closure.
  // useCallback with `[]` deps so it never itself becomes a reason for the
  // focus effect below to re-run.
  const loadBodyweight = useCallback(async (isCancelled: () => boolean = () => false) => {
    try {
      const history = await getBodyweightHistory(5);
      if (isCancelled()) return;
      setBwHistory(history);
      setBwFetchError(false);
      hasLoadedBwOnceRef.current = true;
    } catch {
      if (isCancelled()) return;
      if (!hasLoadedBwOnceRef.current) {
        setBwFetchError(true);
      }
    } finally {
      if (!isCancelled()) setIsBwLoading(false);
    }
  }, []);

  // useFocusEffect (expo-router's fork), not useEffect: the tab navigator
  // keeps this screen mounted, so a mount-only effect would never re-run on
  // return to this tab — same fix as fd64f34. Deliberately does NOT reset
  // draft to empty before the fetch resolves, so a refocus doesn't flash a
  // blank form over data (or in-progress edits) already on screen.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      getProfile()
        .then(result => {
          if (cancelled) return;
          const normalised = result ?? undefined;
          setFetchError(false);
          // Only sync the form from a fresh fetch when nothing is unsaved —
          // a background refetch (tabbing away mid-edit and back) must
          // never clobber in-progress edits. Same precedent as
          // Progression's exercise-chip guard: only reset a selection when
          // there isn't a valid one already, applied to a whole form here.
          if (!isDirtyRef.current) {
            const derived = deriveDraft(normalised);
            setSavedDraft(derived);
            setDraft(derived);
          }
          hasLoadedOnceRef.current = true;
          setIsLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          // Only the genuinely first load surfaces the error state. If the
          // form has already loaded once (edited or not), a background
          // refetch failure is swallowed rather than replacing real,
          // possibly-unsaved data with an error screen. This deliberately
          // DIVERGES from calendar.tsx's current behaviour, recorded in
          // CLAUDE.md's parking lot: Calendar discards dots that were
          // already correct on screen and shows its error banner instead,
          // which is the opposite choice, kept there as a small accepted
          // regression. Swallowing is strictly better here, since there is
          // stateful, possibly-unsaved user input to protect that Calendar's
          // read-only dots never had. One app-wide stale-data policy for
          // both screens is what the offline-support phase is for — not
          // decided here.
          if (!hasLoadedOnceRef.current) {
            setFetchError(true);
          }
          setIsLoading(false);
        });

      // Fired alongside getProfile() above, NOT under Promise.all — an
      // INDEPENDENT promise chain, so a bodyweight fetch failure can't touch
      // the profile form's loading/error state and vice versa.
      loadBodyweight(() => cancelled);

      return () => {
        cancelled = true;
      };
    }, [loadBodyweight]),
  );

  function updateDraft(patch: Partial<Draft>) {
    setDraft(prev => ({ ...prev, ...patch }));
  }

  function handleYearConfirm(value: number) {
    const maxDay = daysInMonth(value, draft.dobMonth ?? DOB_MONTH_FALLBACK);
    updateDraft({
      dobYear: value,
      dobDay: draft.dobDay !== undefined && draft.dobDay > maxDay ? maxDay : draft.dobDay,
    });
    setActiveField(null);
  }

  function handleMonthConfirm(value: number) {
    const maxDay = daysInMonth(draft.dobYear ?? DOB_YEAR_FALLBACK, value);
    updateDraft({
      dobMonth: value,
      dobDay: draft.dobDay !== undefined && draft.dobDay > maxDay ? maxDay : draft.dobDay,
    });
    setActiveField(null);
  }

  const dobDayValues = range(
    1,
    daysInMonth(draft.dobYear ?? DOB_YEAR_FALLBACK, draft.dobMonth ?? DOB_MONTH_FALLBACK),
    1,
  );
  const assembledDob = dobYmd(draft);

  // A partial DOB or height is legitimately nullable in the DB — it is not
  // invalid state to reject and block Save over (a partly-filled date must
  // not stop an unrelated name change from saving). But dobYmd()/derivedCm
  // both require ALL of their fields to produce a value, so a partial group
  // silently writes NULL on save while the chips keep showing what was
  // picked — and the next refocus refetch then clears those chips back to
  // "—", from a column that was never actually written. Surfacing this in
  // the readout means the user finds out before tapping Save, not after a
  // refocus quietly reverts their picks.
  const dobFieldsSet = [draft.dobYear, draft.dobMonth, draft.dobDay].filter(v => v !== undefined).length;
  const isDobPartial = dobFieldsSet > 0 && dobFieldsSet < 3;

  const derivedHeightCm =
    draft.heightFt !== undefined && draft.heightIn !== undefined
      ? cmFromFeetInches(draft.heightFt, draft.heightIn)
      : undefined;
  const isHeightPartial =
    (draft.heightFt !== undefined) !== (draft.heightIn !== undefined);

  // getBodyweightHistory orders by date DESCENDING, so history[0] IS the
  // latest entry — getLatestBodyweight() is that exact same query with
  // limit(1), and calling both here would be two round-trips for one fact.
  const currentEntry = bwHistory[0];
  const todayEntry = currentEntry?.date === todayLocalDate() ? currentEntry : undefined;

  // Reads savedDraft, NOT draft: draft may hold an unsaved goal-weight edit,
  // Details sits BELOW this card so there is no live preview of that edit
  // visible anyway, and rendering a delta against an unsaved goal means the
  // line would appear and then silently vanish on the next refocus refetch —
  // the same silent-revert failure isDobPartial's readout above already
  // exists to warn about. savedDraft is what is actually persisted.
  const goalWeightKg = savedDraft.goalWeightKg;
  const goalDeltaKg =
    goalWeightKg !== undefined && currentEntry !== undefined ? currentEntry.weightKg - goalWeightKg : undefined;
  const goalDeltaText =
    goalDeltaKg === undefined
      ? undefined
      // Strict === 0 is safe here: both operands come off BODY_WEIGHT_VALUES,
      // a 0.5-step grid, and 0.5 is exactly representable in binary floating
      // point, so the subtraction is exact and === 0 can't be missed by a
      // rounding residue. This breaks if either value ever becomes
      // free-text-entered rather than wheel-picked.
      : goalDeltaKg === 0
        ? 'At goal weight'
        : `${fmt(Math.abs(goalDeltaKg))} kg ${goalDeltaKg > 0 ? 'above' : 'below'} goal`;

  async function handleLogWeight(weightKg: number) {
    setLogError(null);
    setIsLogging(true);
    try {
      await logBodyweight(todayLocalDate(), weightKg);
      // Deliberately NOT an optimistic update — refetch and let the
      // CONFIRMED value render. Bodyweight is not a leaf value here: BMI,
      // TDEE and relative strength (6g/6h/6i) all read it from this screen's
      // state, so an optimistically-rendered weight that never actually
      // landed would propagate one wrong number into three downstream cards
      // that each look authoritative. One extra read is cheap against that.
      await loadBodyweight();
      setLastAttemptedWeightKg(undefined);
    } catch {
      setLastAttemptedWeightKg(weightKg);
      setLogError('Could not save your weigh-in. Check your connection and try again.');
    } finally {
      setIsLogging(false);
    }
  }

  async function handleSave() {
    setSaveError(null);
    setIsSaving(true);
    try {
      // saveProfile is a FULL REPLACE — ProfileFields forces every field to
      // be named here, so a field this screen doesn't touch can never be
      // silently nulled by an incomplete call.
      //
      // Trimming happens HERE, at save-commit time, not live in the
      // TextInput's onChangeText — live-trimming would strip a trailing
      // space the user just typed before they've had a chance to type the
      // next word. The trimmed value is then written into BOTH `draft` and
      // `savedDraft` below, not just sent to the DB: writing the DB copy
      // alone would leave savedDraft holding the untrimmed string, so it
      // would silently disagree with what a later refetch derives from the
      // DB (which is already trimmed) — surviving locally only until the
      // next refocus quietly changed it out from under the user. Committing
      // the same trimmed value to state now means there is nothing left to
      // silently change later.
      const trimmedName = draft.name.trim();
      const fields: ProfileFields = {
        name: trimmedName === '' ? undefined : trimmedName,
        dateOfBirth: assembledDob,
        sex: draft.sex,
        heightCm: derivedHeightCm,
        goalWeightKg: draft.goalWeightKg,
      };
      await saveProfile(fields);
      const committedDraft: Draft = { ...draft, name: trimmedName };
      setDraft(committedDraft);
      setSavedDraft(committedDraft);
    } catch {
      setSaveError('Could not save. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Wordmark size={26} />
          <Text style={styles.eyebrow}>Profile</Text>
        </View>
        {/* No KeyboardAvoidingView here, deliberately not yet: the Name
            TextInput sits at the top of a tall card with Save at the
            bottom, so on a short screen the soft keyboard may cover Save.
            Whether that actually overlaps depends on real screen height and
            keyboard size, neither of which is knowable from here — flagged
            as a device-check item for the 6j pass rather than pre-emptively
            wrapped. */}
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bodyweight</Text>

            {isBwLoading ? (
              <ActivityIndicator color={Palette.textSecondary} style={styles.loading} />
            ) : bwFetchError ? (
              <Text style={styles.errorText}>
                Could not load your bodyweight history. Check your connection and try again.
              </Text>
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Current weight</Text>
                  <Text style={styles.bwCurrentValue}>
                    {currentEntry !== undefined ? `${fmt(currentEntry.weightKg)} kg` : '—'}
                  </Text>
                  {goalDeltaText && <Text style={styles.readout}>{goalDeltaText}</Text>}
                </View>

                <View style={styles.fieldGroup}>
                  <ValueChip
                    label={todayEntry !== undefined ? "Update today's weight" : "Log today's weight"}
                    value={todayEntry !== undefined ? fmt(todayEntry.weightKg) : ''}
                    onPress={() => !isLogging && setActiveField('bodyWeight')}
                  />
                </View>

                {/* Inline on-card error text, DELIBERATELY diverging from the
                    four Summary cards' swallow-and-fallback-with-no-retry-UI
                    pattern. That pattern is correct for READS, where a
                    failure shows an empty state and the user retries by
                    navigating away and back. A failed WRITE that silently
                    does nothing is different in kind — the user believes a
                    weigh-in was recorded, and only discovers otherwise weeks
                    later as a hole in the history. A read/write asymmetry,
                    not an inconsistency. */}
                {logError && <Text style={styles.errorText}>{logError}</Text>}

                {bwHistory.length > 0 && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>History</Text>
                    {bwHistory.map(entry => (
                      <View key={entry.date} style={styles.bwEntryRow}>
                        <Text style={styles.bwEntryDate}>{formatFullDate(entry.date)}</Text>
                        <Text style={styles.bwEntryWeight}>{fmt(entry.weightKg)} kg</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Details</Text>

            {isLoading ? (
              <ActivityIndicator color={Palette.textSecondary} style={styles.loading} />
            ) : fetchError ? (
              <Text style={styles.errorText}>
                Could not load your profile. Check your connection and try again.
              </Text>
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    value={draft.name}
                    onChangeText={name => updateDraft({ name })}
                    placeholder="Your name"
                    placeholderTextColor={Palette.textMuted}
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Date of birth</Text>
                  <View style={styles.chipRow}>
                    <ValueChip
                      label="Year"
                      // Year carries the widest content (4 digits, e.g.
                      // "2026") against Month/Day's 2, same ratio as the
                      // logging screen's Kg chip against Reps/RPE — matching
                      // its flex={1.5}/default split rather than inventing a
                      // new one.
                      flex={1.5}
                      value={draft.dobYear !== undefined ? fmt(draft.dobYear) : ''}
                      onPress={() => setActiveField('dobYear')}
                    />
                    <ValueChip
                      label="Month"
                      value={draft.dobMonth !== undefined ? fmt(draft.dobMonth) : ''}
                      onPress={() => setActiveField('dobMonth')}
                    />
                    <ValueChip
                      label="Day"
                      value={draft.dobDay !== undefined ? fmt(draft.dobDay) : ''}
                      onPress={() => setActiveField('dobDay')}
                    />
                  </View>
                  <Text style={styles.readout}>
                    {assembledDob
                      ? formatFullDate(assembledDob)
                      : isDobPartial
                        ? 'Year, month, and day must all be set to save your date of birth.'
                        : '—'}
                  </Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Sex</Text>
                  {/* Sex is nullable in the DB, but this pass has no "unset"
                      affordance — tapping the already-selected chip again is
                      a no-op re-set to the same value, not a clear. */}
                  <View style={styles.chipRow}>
                    <Pressable
                      onPress={() => updateDraft({ sex: 'male' })}
                      style={[styles.sexChip, draft.sex === 'male' && styles.sexChipSelected]}
                    >
                      <Text style={[styles.sexChipLabel, draft.sex === 'male' && styles.sexChipLabelSelected]}>
                        Male
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => updateDraft({ sex: 'female' })}
                      style={[styles.sexChip, draft.sex === 'female' && styles.sexChipSelected]}
                    >
                      <Text style={[styles.sexChipLabel, draft.sex === 'female' && styles.sexChipLabelSelected]}>
                        Female
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Height</Text>
                  <View style={styles.chipRow}>
                    <ValueChip
                      label="Ft"
                      value={draft.heightFt !== undefined ? fmt(draft.heightFt) : ''}
                      onPress={() => setActiveField('heightFt')}
                    />
                    <ValueChip
                      label="In"
                      value={draft.heightIn !== undefined ? fmt(draft.heightIn) : ''}
                      onPress={() => setActiveField('heightIn')}
                    />
                  </View>
                  <Text style={styles.readout}>
                    {derivedHeightCm !== undefined
                      ? `${formatHeightImperial(derivedHeightCm)} (${fmt(derivedHeightCm)} cm)`
                      : isHeightPartial
                        ? 'Both feet and inches must be set to save your height.'
                        : '—'}
                  </Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Goal weight</Text>
                  <ValueChip
                    label="Kg"
                    value={draft.goalWeightKg !== undefined ? fmt(draft.goalWeightKg) : ''}
                    onPress={() => setActiveField('goalWeight')}
                  />
                </View>

                {saveError && <Text style={styles.errorText}>{saveError}</Text>}

                <Pressable
                  onPress={handleSave}
                  disabled={!isDirty || isSaving}
                  style={({ pressed }) => [
                    styles.saveButton,
                    (!isDirty || isSaving) && styles.saveButtonDisabled,
                    pressed && isDirty && !isSaving && styles.saveButtonPressed,
                  ]}
                >
                  <Text
                    style={[styles.saveButtonLabel, (!isDirty || isSaving) && styles.saveButtonLabelDisabled]}
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {activeField === 'dobYear' && (
        <WheelPickerModal
          title="Year"
          values={YEAR_VALUES}
          value={draft.dobYear}
          fallback={DOB_YEAR_FALLBACK}
          onConfirm={handleYearConfirm}
          onCancel={() => setActiveField(null)}
        />
      )}
      {activeField === 'dobMonth' && (
        <WheelPickerModal
          title="Month"
          values={MONTH_VALUES}
          value={draft.dobMonth}
          fallback={DOB_MONTH_FALLBACK}
          onConfirm={handleMonthConfirm}
          onCancel={() => setActiveField(null)}
        />
      )}
      {activeField === 'dobDay' && (
        <WheelPickerModal
          title="Day"
          values={dobDayValues}
          value={draft.dobDay}
          fallback={DOB_DAY_FALLBACK}
          onConfirm={value => {
            updateDraft({ dobDay: value });
            setActiveField(null);
          }}
          onCancel={() => setActiveField(null)}
        />
      )}
      {activeField === 'heightFt' && (
        <WheelPickerModal
          title="Feet"
          unit="ft"
          values={FEET_VALUES}
          value={draft.heightFt}
          fallback={HEIGHT_FT_FALLBACK}
          onConfirm={value => {
            updateDraft({ heightFt: value });
            setActiveField(null);
          }}
          onCancel={() => setActiveField(null)}
        />
      )}
      {activeField === 'heightIn' && (
        <WheelPickerModal
          title="Inches"
          unit="in"
          values={INCHES_VALUES}
          value={draft.heightIn}
          fallback={HEIGHT_IN_FALLBACK}
          onConfirm={value => {
            updateDraft({ heightIn: value });
            setActiveField(null);
          }}
          onCancel={() => setActiveField(null)}
        />
      )}
      {activeField === 'goalWeight' && (
        <WheelPickerModal
          title="Goal weight"
          unit="kg"
          values={BODY_WEIGHT_VALUES}
          value={draft.goalWeightKg}
          fallback={GOAL_WEIGHT_FALLBACK}
          onConfirm={value => {
            updateDraft({ goalWeightKg: value });
            setActiveField(null);
          }}
          onCancel={() => setActiveField(null)}
        />
      )}
      {activeField === 'bodyWeight' && (
        <WheelPickerModal
          title="Weight"
          unit="kg"
          values={BODY_WEIGHT_VALUES}
          // value: the selection that already exists for today (none, if you
          // haven't weighed in today yet) — lastAttemptedWeightKg wins over
          // todayEntry so a retry after a failed write opens where the user
          // left off instead of making them re-scroll.
          value={lastAttemptedWeightKg ?? todayEntry?.weightKg}
          // fallback: where to open when there is NO selection — opening at
          // your most recent known weight beats an arbitrary constant.
          fallback={currentEntry?.weightKg ?? BODY_WEIGHT_FALLBACK}
          onConfirm={value => {
            setActiveField(null);
            // Write immediately on confirm — no separate Log button. The
            // write is idempotent edit-or-create (one canonical weigh-in per
            // local date) and scroll-then-confirm is already a deliberate
            // two-step act, so a second confirmation is friction for
            // nothing.
            handleLogWeight(value);
          }}
          onCancel={() => setActiveField(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 },
  eyebrow: {
    fontFamily: Typefaces.numeralMedium,
    fontSize: 14,
    letterSpacing: 2,
    color: Palette.textMuted,
    textTransform: 'uppercase',
    marginTop: 9,
  },
  list: { gap: 16, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  card: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    padding: 18,
    gap: 20,
  },
  cardTitle: { fontFamily: Typefaces.uiBold, fontSize: 16, color: Palette.text },
  loading: { paddingVertical: 32 },
  fieldGroup: { gap: 8 },
  fieldLabel: {
    fontFamily: Typefaces.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: Palette.textMuted,
    textTransform: 'uppercase',
  },
  readout: { fontFamily: Typefaces.uiRegular, fontSize: 14, color: Palette.textSecondary },
  chipRow: { flexDirection: 'row', gap: 10 },
  bwCurrentValue: {
    fontFamily: Typefaces.numeralBold,
    fontSize: 40,
    lineHeight: 44,
    color: Palette.text,
    fontVariant: ['tabular-nums'],
  },
  bwEntryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bwEntryDate: { fontFamily: Typefaces.uiRegular, fontSize: 14, color: Palette.textSecondary },
  bwEntryWeight: {
    fontFamily: Typefaces.numeralMedium,
    fontSize: 14,
    color: Palette.text,
    fontVariant: ['tabular-nums'],
  },
  textInput: {
    minHeight: MinTouchTarget,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: Typefaces.uiRegular,
    fontSize: 16,
    color: Palette.text,
  },
  sexChip: {
    flex: 1,
    minHeight: MinTouchTarget,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexChipSelected: { backgroundColor: Palette.brand, borderColor: Palette.brand },
  sexChipLabel: { fontFamily: Typefaces.uiSemiBold, fontSize: 15, color: Palette.textSecondary },
  sexChipLabelSelected: { color: Palette.text },
  errorText: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary },
  saveButton: {
    minHeight: MinTouchTarget,
    borderRadius: 24,
    backgroundColor: Palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: { backgroundColor: Palette.border },
  saveButtonPressed: { backgroundColor: Palette.brandPressed },
  saveButtonLabel: { fontFamily: Typefaces.uiBold, fontSize: 15, color: Palette.text },
  saveButtonLabelDisabled: { color: Palette.textMuted },
});
