import { useLayoutEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { TrackColors, TrackFonts, TrackTouchTarget } from '@/constants/track-theme';
import { fmt } from '@/utils/format-number';

const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;
const LIST_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
// Half the leftover viewport on each side, so the first and last values can
// still reach dead center. Because this exactly equals the centering offset,
// scroll offset `i * ITEM_HEIGHT` centers value `i` — which is what makes
// `snapToInterval` and `round(offset / ITEM_HEIGHT)` agree with no fudge factor.
const LIST_PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

type Props = {
  /** Field name, e.g. 'Weight'. Rendered uppercase. */
  title: string;
  /** Shown next to the value in the confirm button, e.g. 'kg'. */
  unit?: string;
  /** Selectable values, ascending. Every entry must pass the screen's own validation. */
  values: number[];
  /** Currently committed value, if the field has one. */
  value: number | undefined;
  /** Where to open the wheel when the field is still empty. */
  fallback: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
};

function nearestIndex(values: number[], target: number): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - target) < Math.abs(values[best] - target)) best = i;
  }
  return best;
}

/**
 * Snap-scrolling wheel picker, in the shape of a native alarm/time picker:
 * large digits, one value locked in a centered band, neighbours dimmed.
 *
 * Mount this conditionally (only while a field is active) rather than leaving it
 * mounted with `visible={false}` — a fresh mount is what makes it open on the
 * field's current value every time instead of only on the first open.
 *
 * Deliberately a plain ScrollView rather than a FlatList. FlatList's
 * `initialScrollIndex` is driven by VirtualizedList's `_onContentSizeChange`,
 * which react-native-web wires to the content container's `onLayout` — and that
 * never fires inside a `Modal` (instrumented and confirmed silent), so the wheel
 * opened pinned to its first value with the real starting value a full
 * content-height below the band. Every value is a fixed-height row and the
 * longest wheel is ~120 rows, so there is nothing here worth virtualizing.
 */
export function WheelPickerModal({ title, unit, values, value, fallback, onConfirm, onCancel }: Props) {
  const initialIndex = nearestIndex(values, value ?? fallback);
  // Seeded rather than left at 0 so the band renders the right value on the
  // first paint, without waiting for a scroll event to tell it where it is.
  const [index, setIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);

  // useLayoutEffect, not requestAnimationFrame: this runs synchronously after
  // mount, so it doesn't depend on a frame being composited (an rAF here was
  // observed never firing at all in a non-compositing browser) and the wheel is
  // already scrolled to the right value on first paint — no visible jump.
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false });
  }, [initialIndex]);

  function syncIndex(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    // React bails out on an identical value, so this re-renders once per value
    // crossed rather than once per scroll frame.
    setIndex(Math.max(0, Math.min(values.length - 1, next)));
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.wheel}>
            {/* The band is just the "selected" marker the values scroll through — it
                sits above the list, so it must not swallow drags aimed at it. */}
            <View style={styles.band} />
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              snapToAlignment="start"
              decelerationRate="fast"
              scrollEventThrottle={16}
              onScroll={syncIndex}
              // onScroll alone can leave the band one value off after a slow drag
              // that ends without momentum, so settle on both end events too.
              onMomentumScrollEnd={syncIndex}
              onScrollEndDrag={syncIndex}
              contentContainerStyle={styles.listContent}
            >
              {values.map((item, i) => (
                <Pressable
                  key={item}
                  style={styles.item}
                  onPress={() => {
                    setIndex(i);
                    scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
                  }}
                >
                  <Text style={[styles.itemText, i === index ? styles.itemTextActive : null]}>
                    {fmt(item)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.button, pressed && styles.cancelPressed]}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(values[index])}
              style={({ pressed }) => [styles.button, styles.confirm, pressed && styles.confirmPressed]}
            >
              <Text style={styles.confirmLabel}>
                Set {fmt(values[index])}
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
    backgroundColor: TrackColors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: TrackColors.border,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 14,
  },
  title: {
    fontFamily: TrackFonts.uiSemiBold,
    fontSize: 12,
    letterSpacing: 2,
    color: TrackColors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  wheel: { height: LIST_HEIGHT, justifyContent: 'center' },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: LIST_PADDING,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: TrackColors.background,
    borderWidth: 1,
    borderColor: TrackColors.brand,
    // Style-prop form, not the deprecated `pointerEvents` prop.
    pointerEvents: 'none',
  },
  listContent: { paddingVertical: LIST_PADDING },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemText: {
    fontFamily: TrackFonts.numeralBold,
    fontSize: 26,
    lineHeight: 32,
    color: TrackColors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  itemTextActive: { fontSize: 36, lineHeight: 42, color: TrackColors.text },
  actions: { flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    minHeight: TrackTouchTarget,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TrackColors.border,
  },
  cancelPressed: { backgroundColor: TrackColors.background },
  cancelLabel: { fontFamily: TrackFonts.uiSemiBold, fontSize: 15, color: TrackColors.textSecondary },
  confirm: { backgroundColor: TrackColors.brand, borderColor: TrackColors.brand },
  confirmPressed: { backgroundColor: TrackColors.brandPressed, borderColor: TrackColors.brandPressed },
  confirmLabel: {
    fontFamily: TrackFonts.uiBold,
    fontSize: 15,
    color: TrackColors.text,
    fontVariant: ['tabular-nums'],
  },
});
