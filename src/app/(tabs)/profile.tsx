import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GatedSection } from '@/components/profile/gated-section';
import { WeightPickerModal } from '@/components/profile/weight-picker-modal';
import { ValueChip } from '@/components/track/value-chip';
import { WheelPickerModal } from '@/components/track/wheel-picker-modal';
import { Wordmark } from '@/components/wordmark';
import { MinTouchTarget, Palette, Typefaces } from '@/constants/theme';
import { getBodyweightHistory, logBodyweight } from '@/lib/bodyweight-repo';
import { getProfile, saveProfile } from '@/lib/profile-repo';
import type { BodyweightEntry, Profile, ProfileFields, Sex } from '@/types/profile';
import { calculateAge, daysInMonth } from '@/utils/age';
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
// Both weight fields (goal weight, current bodyweight) used to share one
// 40-200kg-at-0.5-step wheel here (WeightPickerModal replaces WheelPickerModal
// for both below). That range and step are gone from this file now — a
// digital scale reads to 0.1kg, and the 0.5 grid rounded away real signal, so
// the actual two-wheel value arrays (whole kg, tenths) and their own
// rationale now live in weight-picker-modal.tsx, the only place that needs
// them.

const DOB_YEAR_FALLBACK = 2000;
const DOB_MONTH_FALLBACK = 6;
const DOB_DAY_FALLBACK = 15;
const HEIGHT_FT_FALLBACK = 5;
const HEIGHT_IN_FALLBACK = 7;
// Where a weight wheel (goal weight OR bodyweight) opens when there is
// nothing to open on at all — no existing value for that field AND no known
// bodyweight to fall back to either (see the `fallback` prop on both
// WeightPickerModal usages below: value ?? currentEntry?.weightKg ??
// WEIGHT_FALLBACK_KG). Day-one-only in practice. Previously two separate
// constants (GOAL_WEIGHT_FALLBACK, BODY_WEIGHT_FALLBACK) that happened to
// share a value — now genuinely one concept, since both fields resolve
// through the same "known bodyweight beats an arbitrary constant" precedence
// before ever reaching this.
const WEIGHT_FALLBACK_KG = 50;

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

// "height, date of birth & gender" — an Oxford-comma-less list with '&'
// before the last item, matching the exact wording the caloric-maintenance
// gate below is specced to show.
function joinWithAmpersand(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`;
}

type BwEntryWithChange = BodyweightEntry & { changeKg: number | undefined };

// Delta from the previous (OLDER) entry, computed purely from the already-
// fetched history array — no extra query. bwHistory is date-DESCENDING (see
// getBodyweightHistory's own doc comment), so the older neighbour of
// entry[i] is entry[i + 1]; the last entry in the (possibly limit-truncated)
// array has no older neighbour AT ALL within what was fetched, and renders
// '—' rather than silently implying a query further back that never
// happened. Same 1dp-before-compare-or-display rounding as goalDeltaKg
// below, and for the same reason — 0.1 is not exactly representable in
// binary floating point.
function withChanges(history: BodyweightEntry[]): BwEntryWithChange[] {
  return history.map((entry, i) => {
    const older = history[i + 1];
    const changeKg = older ? Math.round((entry.weightKg - older.weightKg) * 10) / 10 : undefined;
    return { ...entry, changeKg };
  });
}

// Deltas are CHALK, never red/green — colour would editorialise the number,
// and this design's two-accent cap (brand purple, PR gold) has no budget for
// a third. '+' is added explicitly for a positive change since fmt() only
// ever signs negatives (via toFixed's own sign); a zero change renders bare
// '0', matching fmt()'s own bare-integer convention rather than a forced
// '0.0'.
function formatChangeKg(changeKg: number | undefined): string {
  if (changeKg === undefined) return '—';
  if (changeKg === 0) return '0';
  return changeKg > 0 ? `+${fmt(changeKg)}` : fmt(changeKg);
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

  // Mirrors the Details section's three-flag shape immediately above
  // (isLoading / fetchError / hasLoadedOnce) for intra-screen consistency —
  // its OWN copies, not shared state, so a bodyweight fetch failure can
  // never blank the profile form and a profile fetch failure can never
  // blank the bodyweight section (see the independent-promise-chain note on
  // loadBodyweight below). Whether a background refetch failure here should
  // instead keep showing stale data (as this does) or surface an error is
  // exactly the one app-wide stale-data policy CLAUDE.md parks for the
  // offline-support phase — not decided here.
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

  // Details is collapsed by default — this is purely local UI state, never
  // touched by the fetch/focus effect below, so a background refetch can
  // never surprise-collapse or surprise-expand it out from under the user.
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

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

  // Expands Details AND jumps straight to the named field's wheel in one tap
  // — used by the gated sections' "Add ___ ›" links below, so unlocking a
  // gate is one tap rather than "expand, then go find the right chip".
  function openDetailsField(field: ActiveField) {
    setIsDetailsExpanded(true);
    setActiveField(field);
  }

  // Expanding is always allowed; COLLAPSING is refused while isDirty. Save
  // lives inside the expanded block, so collapsing with unsaved edits would
  // hide both the pending changes and the only way to commit them — an
  // unsaved draft the user can no longer see is the same silent-revert
  // failure class the isDobPartial readout above already exists to guard
  // against, just reached by a tap instead of a refocus refetch.
  function toggleDetailsExpanded() {
    if (isDetailsExpanded && isDirty) return;
    setIsDetailsExpanded(v => !v);
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
  const isHeightPartial = (draft.heightFt !== undefined) !== (draft.heightIn !== undefined);

  // getBodyweightHistory orders by date DESCENDING, so history[0] IS the
  // latest entry — getLatestBodyweight() is that exact same query with
  // limit(1), and calling both here would be two round-trips for one fact.
  const currentEntry = bwHistory[0];
  const todayEntry = currentEntry?.date === todayLocalDate() ? currentEntry : undefined;

  // Reads savedDraft, NOT draft: draft may hold an unsaved goal-weight edit,
  // Details sits BELOW this section so there is no live preview of that edit
  // visible anyway, and rendering a delta against an unsaved goal means the
  // line would appear and then silently vanish on the next refocus refetch —
  // the same silent-revert failure isDobPartial's readout above already
  // exists to warn about. savedDraft is what is actually persisted.
  const goalWeightKg = savedDraft.goalWeightKg;
  // Rounded to one decimal HERE, before both the zero-comparison below and
  // display, because raw subtraction is not safe to compare directly: unlike
  // the old 0.5-step wheel (where 0.5 is exactly representable in binary
  // floating point), 0.1 is not — e.g. 78.3 - 75.1 evaluates to
  // 3.1999999999999957, which is neither === 0 when it should be, nor a
  // clean-looking number to render. Rounding first fixes both.
  const goalDeltaKg =
    goalWeightKg !== undefined && currentEntry !== undefined
      ? Math.round((currentEntry.weightKg - goalWeightKg) * 10) / 10
      : undefined;
  const goalDeltaText =
    goalDeltaKg === undefined
      ? undefined
      : goalDeltaKg === 0
        ? 'At goal weight'
        : `${fmt(Math.abs(goalDeltaKg))} kg ${goalDeltaKg > 0 ? 'above' : 'below'} goal`;

  // Everything below (identity line, gated sections, Details' collapsed
  // summary) reads savedDraft rather than draft, same reasoning as
  // goalWeightKg just above: these are facts about the PERSISTED profile,
  // not a live preview of in-progress edits, so they can't flash a value
  // that a refocus refetch then silently reverts.
  const savedDob = dobYmd(savedDraft);
  const age = savedDob !== undefined ? calculateAge(savedDob, todayLocalDate()) : undefined;
  const hasName = savedDraft.name.trim() !== '';
  const identityParts: string[] = [];
  if (hasName) identityParts.push(savedDraft.name.trim());
  if (age !== undefined) identityParts.push(fmt(age));
  // Lowercase, deliberately — "male"/"female" is the raw Sex value and the
  // identity line states it as a plain fact ("Ayhan · 22 · male"), not a
  // chip label. GENDER, NOT SEX: this line and every other user-facing
  // string say "Gender" — the DB column and every identifier in code stay
  // `sex`, because Mifflin-St Jeor (6i) consumes biological sex, so the
  // column should keep naming what the formula actually uses. See the
  // Gender field label below for the same note.
  if (savedDraft.sex !== undefined) identityParts.push(savedDraft.sex);
  const identityText = identityParts.length > 0 ? identityParts.join(' · ') : 'Not set up';

  const savedHeightCm =
    savedDraft.heightFt !== undefined && savedDraft.heightIn !== undefined
      ? cmFromFeetInches(savedDraft.heightFt, savedDraft.heightIn)
      : undefined;
  const hasHeight = savedHeightCm !== undefined;
  const hasWeighIn = currentEntry !== undefined;
  const hasDob = savedDob !== undefined;
  const hasGender = savedDraft.sex !== undefined;

  // BMI's gate: needs height AND a weigh-in. Height is named first because
  // it is what is actually missing today (the profile table starts empty) —
  // once it's added, this correctly pivots to naming the weigh-in instead of
  // going on saying "Needs height" after that stops being true. Once BOTH
  // are present, waitingText is undefined and GatedSection renders label +
  // placeholder only — this section still can't compute a real number (no
  // bmi.ts import this commit), and silence is the only honest state left
  // to show until 6g wires the real one.
  const bmiWaitingText = !hasHeight ? 'Needs height' : !hasWeighIn ? 'Needs a weigh-in' : undefined;
  const bmiActionLabel = !hasHeight ? 'Add height ›' : undefined;

  // Caloric maintenance's gate: needs height, DOB, gender AND a weigh-in —
  // but the weigh-in isn't named in the text while Details is still what's
  // missing, same as relative strength below, because its own fix is the
  // Bodyweight CTA already on this same screen, not something "Add details
  // ›" would open. Once every prerequisite is present, waitingText is
  // undefined and this renders label + placeholder only, same silence-is-
  // honest rule as BMI above.
  const missingDetailParts: string[] = [];
  if (!hasHeight) missingDetailParts.push('height');
  if (!hasDob) missingDetailParts.push('date of birth');
  if (!hasGender) missingDetailParts.push('gender');
  const caloricWaitingText =
    missingDetailParts.length > 0
      ? `Needs ${joinWithAmpersand(missingDetailParts)}`
      : !hasWeighIn
        ? 'Needs a weigh-in'
        : undefined;
  const caloricActionLabel = missingDetailParts.length > 0 ? 'Add details ›' : undefined;

  // Relative strength's gate: the live dev DB already has favourited
  // exercises with real e1RM history (sets are logged), so a hardcoded
  // "Nothing logged" would be factually wrong — the only thing actually
  // missing, and the only thing this screen can check without importing
  // relative-strength.ts / relative-strength-repo.ts, is a bodyweight. No
  // action link either way: the fix, while missing, is the Bodyweight CTA
  // already above; once satisfied, waitingText is undefined and this
  // renders label + placeholder only, same as the other two gates.
  const relativeStrengthWaitingText = !hasWeighIn ? 'Needs a weigh-in' : undefined;

  // Details' collapsed one-line summary — every already-known fact, joined,
  // so collapsing the section doesn't hide information the user already
  // committed. Empty only on a genuine day-one profile.
  const detailsSummaryParts: string[] = [];
  if (hasName) detailsSummaryParts.push(savedDraft.name.trim());
  if (savedDob !== undefined) detailsSummaryParts.push(formatFullDate(savedDob));
  if (savedDraft.sex !== undefined) detailsSummaryParts.push(savedDraft.sex === 'male' ? 'Male' : 'Female');
  if (savedHeightCm !== undefined) {
    detailsSummaryParts.push(`${formatHeightImperial(savedHeightCm)} (${fmt(savedHeightCm)} cm)`);
  }
  if (savedDraft.goalWeightKg !== undefined) {
    detailsSummaryParts.push(`Goal ${fmt(savedDraft.goalWeightKg)} kg`);
  }
  const detailsSummary = detailsSummaryParts.length > 0 ? detailsSummaryParts.join(' · ') : 'Add your details';

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
        {/* No KeyboardAvoidingView here, deliberately not yet: the Name
            TextInput sits at the top of Details' expanded rows with Save at
            the bottom, so on a short screen the soft keyboard may cover
            Save. Whether that actually overlaps depends on real screen
            height and keyboard size, neither of which is knowable from here
            — flagged as a device-check item for the 6j pass rather than
            pre-emptively wrapped. */}
        <ScrollView contentContainerStyle={styles.page}>
          {/* HEADER — wordmark, then an identity line stating facts about
              the person (name, age, gender), not a control. 16px here is a
              real design decision, not an oversight: Track's wordmark is
              30px and Summary's is 26px, so this will visibly change size
              as the user tabs between screens. Ledger's own measurements
              call for 16px, so that's what ships — flagged here rather than
              silently shipped, for a judgement call on device. */}
          <Wordmark size={16} />
          <View style={styles.identityRow}>
            <Text style={styles.identityText}>{identityText}</Text>
            {!hasName && (
              <Pressable onPress={() => setIsDetailsExpanded(true)}>
                <Text style={styles.actionLink}>Add your name ›</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.hairline} />

          {/* BODYWEIGHT */}
          {isBwLoading ? (
            <ActivityIndicator color={Palette.textSecondary} style={styles.loading} />
          ) : bwFetchError ? (
            <Text style={styles.errorText}>
              Could not load your bodyweight history. Check your connection and try again.
            </Text>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Bodyweight</Text>
              <Text style={styles.heroValue}>
                {currentEntry !== undefined ? `${fmt(currentEntry.weightKg)} kg` : '—'}
              </Text>
              {goalDeltaText && <Text style={styles.readout}>{goalDeltaText}</Text>}

              <Pressable
                onPress={() => !isLogging && setActiveField('bodyWeight')}
                style={({ pressed }) => [
                  styles.weighInCta,
                  todayEntry !== undefined ? styles.weighInCtaOutlined : styles.weighInCtaFilled,
                  pressed &&
                    (todayEntry !== undefined ? styles.weighInCtaOutlinedPressed : styles.weighInCtaFilledPressed),
                ]}
              >
                <Text
                  style={[
                    styles.weighInCtaLabel,
                    todayEntry !== undefined ? styles.weighInCtaLabelOutlined : styles.weighInCtaLabelFilled,
                  ]}
                >
                  {todayEntry !== undefined ? "Update today's entry" : "Log today's weight"}
                </Text>
              </Pressable>

              {/* Inline on-section error text, DELIBERATELY diverging from
                  the four Summary cards' swallow-and-fallback-with-no-retry-UI
                  pattern. That pattern is correct for READS, where a
                  failure shows an empty state and the user retries by
                  navigating away and back. A failed WRITE that silently
                  does nothing is different in kind — the user believes a
                  weigh-in was recorded, and only discovers otherwise weeks
                  later as a hole in the history. A read/write asymmetry,
                  not an inconsistency. */}
              {logError && <Text style={styles.errorText}>{logError}</Text>}

              {bwHistory.length > 0 && (
                <View style={styles.recentList}>
                  {withChanges(bwHistory).map(entry => (
                    <View key={entry.date} style={styles.recentRow}>
                      <Text style={styles.recentDate}>
                        {entry.date === todayLocalDate() ? 'Today' : formatFullDate(entry.date)}
                      </Text>
                      <Text style={styles.recentKg}>{fmt(entry.weightKg)} kg</Text>
                      <Text style={styles.recentChange}>{formatChangeKg(entry.changeKg)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.hairline} />

          {/* BODY MASS INDEX — gated only this commit. See gated-section.tsx
              for why this is a real shipping state, not scaffolding. */}
          <GatedSection
            label="Body mass index"
            placeholder="––.–"
            waitingText={bmiWaitingText}
            actionLabel={bmiActionLabel}
            onPressAction={bmiActionLabel !== undefined ? () => openDetailsField('heightFt') : undefined}
          />

          <View style={styles.hairline} />

          {/* RELATIVE STRENGTH — gated only this commit. See the
              relativeStrengthWaitingText comment above for why this is
              dynamic rather than a hardcoded "Nothing logged". */}
          <GatedSection label="Relative strength" placeholder="–.––×" waitingText={relativeStrengthWaitingText} />

          <View style={styles.hairline} />

          {/* CALORIC MAINTENANCE — gated only this commit. */}
          <GatedSection
            label="Caloric maintenance"
            placeholder="–––– kcal"
            waitingText={caloricWaitingText}
            actionLabel={caloricActionLabel}
            onPressAction={caloricActionLabel !== undefined ? () => setIsDetailsExpanded(true) : undefined}
          />

          <View style={styles.hairline} />

          {/* DETAILS — collapsed by default; the summary row above IS the
              toggle. */}
          {isLoading ? (
            <ActivityIndicator color={Palette.textSecondary} style={styles.loading} />
          ) : fetchError ? (
            <Text style={styles.errorText}>Could not load your profile. Check your connection and try again.</Text>
          ) : (
            <View style={styles.section}>
              <Pressable onPress={toggleDetailsExpanded} style={styles.detailsSummaryRow}>
                <Text style={styles.sectionLabel}>Details</Text>
                <View style={styles.detailsSummaryLine}>
                  <Text style={styles.detailsSummaryText} numberOfLines={isDetailsExpanded ? undefined : 1}>
                    {detailsSummary}
                  </Text>
                  {/* Own Text sibling, not appended inside detailsSummaryText
                      — that Text has numberOfLines={1} while collapsed, and a
                      long summary would truncate the chevron away with it,
                      eating the only visual cue this row is tappable. */}
                  <Text style={styles.detailsSummaryChevron}>{isDetailsExpanded ? '⌄' : '›'}</Text>
                </View>
                {isDetailsExpanded && isDirty && (
                  <Text style={styles.readout}>You have unsaved changes — save before collapsing.</Text>
                )}
              </Pressable>

              {isDetailsExpanded && (
                <>
                  <View style={styles.detailsRow}>
                    <Text style={styles.fieldLabel}>Name</Text>
                    <TextInput
                      value={draft.name}
                      onChangeText={name => updateDraft({ name })}
                      placeholder="Your name"
                      placeholderTextColor={Palette.textMuted}
                      style={styles.textInput}
                    />
                  </View>

                  <View style={styles.detailsRow}>
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

                  <View style={styles.detailsRow}>
                    {/* GENDER, NOT SEX: every user-facing string here says
                        "Gender". The DB column and every identifier in code
                        stay `sex` — Mifflin-St Jeor (6i) consumes biological
                        sex, so the column should keep naming what the
                        formula actually uses, and renaming it would need a
                        migration for nothing. This divergence is
                        deliberate, not drift. */}
                    <Text style={styles.fieldLabel}>Gender</Text>
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

                  <View style={styles.detailsRow}>
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

                  <View style={[styles.detailsRow, styles.detailsRowLast]}>
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
                    <Text style={[styles.saveButtonLabel, (!isDirty || isSaving) && styles.saveButtonLabelDisabled]}>
                      {isSaving ? 'Saving…' : 'Save'}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
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
        <WeightPickerModal
          title="Goal weight"
          unit="kg"
          value={draft.goalWeightKg}
          // fallback: where to open when there is no saved goal yet —
          // opening at your most recent known weight beats an arbitrary
          // constant, same precedence as the bodyweight wheel below.
          fallback={currentEntry?.weightKg ?? WEIGHT_FALLBACK_KG}
          onConfirm={value => {
            updateDraft({ goalWeightKg: value });
            setActiveField(null);
          }}
          onCancel={() => setActiveField(null)}
        />
      )}
      {activeField === 'bodyWeight' && (
        <WeightPickerModal
          title="Weight"
          unit="kg"
          // value: the selection that already exists for today (none, if you
          // haven't weighed in today yet) — lastAttemptedWeightKg wins over
          // todayEntry so a retry after a failed write opens where the user
          // left off instead of making them re-scroll.
          value={lastAttemptedWeightKg ?? todayEntry?.weightKg}
          // fallback: where to open when there is NO selection — opening at
          // your most recent known weight beats an arbitrary constant.
          fallback={currentEntry?.weightKg ?? WEIGHT_FALLBACK_KG}
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
  // 30 / 22 / 44 — the Ledger mockup's own outer padding at its 390px
  // reference width. These are web px from a 390px mockup; RN dp maps 1:1
  // at this width, so they're used directly rather than re-derived.
  page: { paddingTop: 30, paddingHorizontal: 22, paddingBottom: 44 },
  identityRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 10, marginBottom: 26 },
  identityText: { fontFamily: Typefaces.uiSemiBold, fontSize: 22, color: Palette.text },
  actionLink: { fontFamily: Typefaces.uiSemiBold, fontSize: 13, color: Palette.brand },
  // The one hairline treatment, reused between every section: 1px,
  // rgba(138,143,148,0.16), 26px vertical margin — the Ledger's own section
  // divider, verbatim.
  hairline: { height: 1, backgroundColor: 'rgba(138,143,148,0.16)', marginVertical: 26 },
  section: { gap: 10 },
  sectionLabel: {
    fontFamily: Typefaces.uiSemiBold,
    fontSize: 11,
    // 0.14em of an 11px face, same em-to-point approximation already used
    // for this label elsewhere (see gated-section.tsx).
    letterSpacing: 1.5,
    color: Palette.textSecondary,
    textTransform: 'uppercase',
  },
  loading: { paddingVertical: 32 },
  readout: { fontFamily: Typefaces.uiRegular, fontSize: 14, color: Palette.textSecondary },
  errorText: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary },
  heroValue: {
    fontFamily: Typefaces.numeralBold,
    fontSize: 52,
    lineHeight: 56,
    color: Palette.text,
    fontVariant: ['tabular-nums'],
  },
  // Two states, per the Ledger spec: OUTLINED once a weigh-in already
  // exists today ("Update today's entry"), FILLED on day one ("Log today's
  // weight") — a filled CTA reads as more urgent, which is right exactly
  // once, before anything has been logged at all.
  weighInCta: { alignSelf: 'flex-start', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  weighInCtaOutlined: {
    borderWidth: 1,
    borderColor: Palette.brand,
    paddingVertical: 11,
    paddingHorizontal: 18,
    minHeight: 44,
  },
  weighInCtaOutlinedPressed: { backgroundColor: Palette.surface },
  weighInCtaFilled: {
    backgroundColor: Palette.brand,
    paddingVertical: 13,
    paddingHorizontal: 20,
    minHeight: 48,
  },
  weighInCtaFilledPressed: { backgroundColor: Palette.brandPressed },
  weighInCtaLabel: { fontFamily: Typefaces.uiSemiBold, fontSize: 13 },
  weighInCtaLabelOutlined: { color: Palette.brand },
  weighInCtaLabelFilled: { color: Palette.background },
  recentList: { gap: 6 },
  recentRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  recentDate: { flex: 1, fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary },
  recentKg: {
    fontFamily: Typefaces.numeralMedium,
    fontSize: 13,
    color: Palette.text,
    fontVariant: ['tabular-nums'],
  },
  // Chalk, not red/green — see formatChangeKg's comment for why a delta
  // never earns its own colour here.
  recentChange: {
    fontFamily: Typefaces.numeralMedium,
    fontSize: 13,
    color: Palette.textSecondary,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
  },
  detailsSummaryRow: { gap: 4 },
  detailsSummaryLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  // flex: 1 so numberOfLines={1}'s truncation has a bounded width to
  // truncate WITHIN — leaving the chevron sibling (fixed size, no flex)
  // room outside that boundary instead of getting truncated along with it.
  detailsSummaryText: { flex: 1, fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.text },
  detailsSummaryChevron: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.text },
  // Details rows: 12px vertical padding, 44 min-height, a fainter hairline
  // (rgba(138,143,148,0.1), lower alpha than the section divider above) —
  // the Ledger's own "Details" row treatment, applied to each field's
  // editing group rather than to a static label/value line, since these
  // rows hold real controls (chips, wheels, a text input) instead.
  detailsRow: {
    gap: 8,
    paddingVertical: 12,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138,143,148,0.1)',
  },
  detailsRowLast: { borderBottomWidth: 0 },
  fieldLabel: {
    fontFamily: Typefaces.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: Palette.textMuted,
    textTransform: 'uppercase',
  },
  chipRow: { flexDirection: 'row', gap: 10 },
  textInput: {
    minHeight: MinTouchTarget,
    backgroundColor: Palette.surface,
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
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexChipSelected: { backgroundColor: Palette.brand, borderColor: Palette.brand },
  sexChipLabel: { fontFamily: Typefaces.uiSemiBold, fontSize: 15, color: Palette.textSecondary },
  sexChipLabelSelected: { color: Palette.text },
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
