// The snap-scrolling wheel-column mechanics below (ScrollView + snapToInterval
// + scroll-position-to-index sync, seeded via useLayoutEffect rather than
// requestAnimationFrame) are a SECOND COPY of the same logic in
// src/components/track/wheel-picker-modal.tsx. That is not a design choice —
// it is forced by the dogfooding guardrail in CLAUDE.md's "Current state"
// section: that file and its sibling value-chip.tsx are consumed by the
// guardrailed workout-logging screen and are off-limits for edits while
// dogfooding is in progress, and this component's shape (two synchronized
// wheels, not one) needs changes that file doesn't have. Trigger for
// consolidating both into one shared wheel-column primitive: the guardrail
// lifting, at which point this file's column-rendering half should be
// extracted alongside wheel-picker-modal.tsx's, not before.
import type { RefObject } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { MinTouchTarget, Palette, Typefaces } from '@/constants/theme';

const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;
const LIST_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
// Half the leftover viewport on each side, so the first and last values can
// still reach dead center — same centering identity wheel-picker-modal.tsx
// relies on (scroll offset `i * ITEM_HEIGHT` centers value `i`).
const LIST_PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

// Two wheels, not the one 40-200kg-at-0.5-step list this replaces: digital
// scales read to 0.1kg, and a 0.5 grid rounds away real signal a scale
// actually reports. Whole kg 0-150 covers every realistic bodyweight or goal
// (150 was the old range's upper-middle, kept as the ceiling since nothing
// about switching to 0.1kg precision changes what a plausible weight is);
// the decimal wheel is just the ten tenths digits, 0-9. Selected value =
// whole + decimal / 10. Shared by both the goal-weight field and the
// current-bodyweight field, same as the single wheel this replaces was.
const WHOLE_VALUES = Array.from({ length: 151 }, (_, i) => i);
const DECIMAL_VALUES = Array.from({ length: 10 }, (_, i) => i);

type Props = {
  /** Field name, e.g. 'Weight'. Rendered uppercase. */
  title: string;
  /** Shown next to the value in the confirm button, e.g. 'kg'. */
  unit?: string;
  /** Currently committed value in kg, if the field has one. */
  value: number | undefined;
  /** Where to open the wheels (in kg) when the field is still empty. */
  fallback: number;
  // Confirm is disabled below this value — see the confirm-button block
  // below for why 0.0 specifically needs blocking even though every digit
  // that produces it (whole 0, decimal 0) has to stay reachable on the
  // wheels. Defaults to the smallest value this two-wheel picker can even
  // produce above zero, which is also the smallest value either DB CHECK
  // constraint below allows.
  min?: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
};

// Splits a kg value into whole/decimal wheel indices. Rounds to the nearest
// tenth FIRST (via Math.round on the scaled value) so that a value arriving
// with binary floating-point noise (e.g. a subtraction upstream) still lands
// on a clean digit pair instead of truncating to the wrong one.
function splitKg(kg: number): { whole: number; decimal: number } {
  const tenths = Math.round(kg * 10);
  return { whole: Math.floor(tenths / 10), decimal: ((tenths % 10) + 10) % 10 };
}

function combineKg(whole: number, decimal: number): number {
  return (whole * 10 + decimal) / 10;
}

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(length - 1, index));
}

type WheelColumnProps = {
  scrollRef: RefObject<ScrollView | null>;
  values: number[];
  activeIndex: number;
  onScrollSync: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onSelect: (index: number) => void;
};

// One scrolling digit column — whole and decimal are two instances of this
// rather than two copies of the same JSX, since the only thing that differs
// between them is which values/index/ref/handlers they're wired to.
function WheelColumn({ scrollRef, values, activeIndex, onScrollSync, onSelect }: WheelColumnProps) {
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.column}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      snapToAlignment="start"
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={onScrollSync}
      onMomentumScrollEnd={onScrollSync}
      onScrollEndDrag={onScrollSync}
      contentContainerStyle={styles.listContent}
    >
      {values.map((item, i) => (
        <Pressable key={item} style={styles.item} onPress={() => onSelect(i)}>
          <Text style={[styles.itemText, i === activeIndex ? styles.itemTextActive : null]}>{item}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/**
 * Two synchronized snap-scrolling wheels (whole kg, tenths) with a literal
 * "." between them, in the same native-alarm-picker visual language as
 * wheel-picker-modal.tsx. See the file-header comment for why this is a
 * separate component rather than an extension of that one.
 *
 * Mount this conditionally (only while a field is active), matching
 * wheel-picker-modal.tsx's own convention — see its comment for why
 * (FlatList's initialScrollIndex doesn't fire inside a Modal on web; a fresh
 * mount is what makes the wheels open on the field's current value every
 * time).
 */
export function WeightPickerModal({ title, unit, value, fallback, min = 0.1, onConfirm, onCancel }: Props) {
  const initial = splitKg(value ?? fallback);
  const initialWholeIndex = clampIndex(initial.whole, WHOLE_VALUES.length);
  const initialDecimalIndex = clampIndex(initial.decimal, DECIMAL_VALUES.length);

  const [wholeIndex, setWholeIndex] = useState(initialWholeIndex);
  const [decimalIndex, setDecimalIndex] = useState(initialDecimalIndex);
  const wholeRef = useRef<ScrollView>(null);
  const decimalRef = useRef<ScrollView>(null);

  useLayoutEffect(() => {
    wholeRef.current?.scrollTo({ y: initialWholeIndex * ITEM_HEIGHT, animated: false });
    decimalRef.current?.scrollTo({ y: initialDecimalIndex * ITEM_HEIGHT, animated: false });
  }, [initialWholeIndex, initialDecimalIndex]);

  function syncWhole(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    setWholeIndex(clampIndex(next, WHOLE_VALUES.length));
  }

  function syncDecimal(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    setDecimalIndex(clampIndex(next, DECIMAL_VALUES.length));
  }

  const confirmValue = combineKg(WHOLE_VALUES[wholeIndex], DECIMAL_VALUES[decimalIndex]);
  // The REAL guarantee against a bad weight ever reaching storage is the DB
  // itself — bodyweight_log.weight_kg and profile.goal_weight_kg both carry a
  // CHECK (... > 0). This disabled-confirm state is a UX layer in front of
  // that constraint, not a replacement for it: it exists only so scrolling
  // both wheels to zero (a real, reachable position — 0 stays on both wheels
  // deliberately, see WHOLE_VALUES/DECIMAL_VALUES above) produces an
  // unavailable Set button instead of a Postgres constraint violation that
  // the write path can only render as a misleading "check your connection"
  // error. If this picker is ever replaced, the constraint still holds and
  // the data can't go bad — this is belt, not suspenders.
  const isBelowMin = confirmValue < min;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.wheelRow}>
            {/* One band spanning both columns and the separator, rather than
                a band per column — the picker selects ONE weight, not two
                independent values, so a single highlighted row reads that
                way. Sits above the columns, so it must not swallow drags. */}
            <View style={styles.band} />

            <WheelColumn
              scrollRef={wholeRef}
              values={WHOLE_VALUES}
              activeIndex={wholeIndex}
              onScrollSync={syncWhole}
              onSelect={i => {
                setWholeIndex(i);
                wholeRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
              }}
            />

            <Text style={styles.separator}>.</Text>

            <WheelColumn
              scrollRef={decimalRef}
              values={DECIMAL_VALUES}
              activeIndex={decimalIndex}
              onScrollSync={syncDecimal}
              onSelect={i => {
                setDecimalIndex(i);
                decimalRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
              }}
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.button, pressed && styles.cancelPressed]}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(confirmValue)}
              disabled={isBelowMin}
              style={({ pressed }) => [
                styles.button,
                styles.confirm,
                isBelowMin && styles.confirmDisabled,
                pressed && !isBelowMin && styles.confirmPressed,
              ]}
            >
              <Text style={[styles.confirmLabel, isBelowMin && styles.confirmLabelDisabled]}>
                Set {WHOLE_VALUES[wholeIndex]}.{DECIMAL_VALUES[decimalIndex]}
                {unit ?? ''}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 14,
  },
  title: {
    fontFamily: Typefaces.uiSemiBold,
    fontSize: 12,
    letterSpacing: 2,
    color: Palette.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  wheelRow: { height: LIST_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: LIST_PADDING,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.brand,
    // Style-prop form, not the deprecated `pointerEvents` prop — same
    // convention as wheel-picker-modal.tsx's own band. The band still must
    // not swallow drags aimed at it; only where that's declared changed.
    pointerEvents: 'none',
  },
  // Explicit height because wheelRow's alignItems: 'center' governs the
  // CROSS axis (vertical, since wheelRow is flexDirection: 'row') and,
  // unlike 'stretch', does not stretch children to fill it — so nothing else
  // pins this ScrollView's main-axis size to LIST_HEIGHT. UNVERIFIED whether
  // omitting it would actually overflow to full content height (151 rows x
  // ITEM_HEIGHT) rather than clip correctly: wheel-picker-modal.tsx has the
  // same structural gap on its own axis (a ScrollView with no explicit
  // height/flex, inside a fixed-height parent whose alignment doesn't
  // stretch it) and is device-verified working, which undercuts that
  // prediction — RN's ScrollView may not size to content the way a plain
  // View does. Kept regardless: harmless if unnecessary, correct if not, and
  // states the intended viewport size explicitly rather than relying on
  // behaviour neither reasoning nor a device check has actually confirmed.
  column: { flex: 1, height: LIST_HEIGHT },
  listContent: { paddingVertical: LIST_PADDING },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemText: {
    fontFamily: Typefaces.numeralBold,
    fontSize: 26,
    lineHeight: 32,
    color: Palette.textMuted,
    fontVariant: ['tabular-nums'],
  },
  itemTextActive: { fontSize: 36, lineHeight: 42, color: Palette.text },
  separator: {
    fontFamily: Typefaces.numeralBold,
    fontSize: 36,
    lineHeight: 42,
    color: Palette.text,
    marginHorizontal: 2,
  },
  actions: { flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    minHeight: MinTouchTarget,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  cancelPressed: { backgroundColor: Palette.background },
  cancelLabel: { fontFamily: Typefaces.uiSemiBold, fontSize: 15, color: Palette.textSecondary },
  confirm: { backgroundColor: Palette.brand, borderColor: Palette.brand },
  confirmPressed: { backgroundColor: Palette.brandPressed, borderColor: Palette.brandPressed },
  // Same disabled convention as profile.tsx's Save button (saveButtonDisabled
  // / saveButtonLabelDisabled) — border-colored surface, muted label — rather
  // than inventing a second disabled look for the same screen.
  confirmDisabled: { backgroundColor: Palette.border, borderColor: Palette.border },
  confirmLabel: {
    fontFamily: Typefaces.uiBold,
    fontSize: 15,
    color: Palette.text,
    fontVariant: ['tabular-nums'],
  },
  confirmLabelDisabled: { color: Palette.textMuted },
});
