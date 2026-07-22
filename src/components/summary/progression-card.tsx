import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

import { fmt } from '@/utils/format-number';
import { Palette, Typefaces } from '@/constants/theme';
import { GlossaryInfoDot } from './glossary-info-dot';

// Placeholder series generator — real source (per-exercise e1RM history from
// Supabase) is a follow-up. Ported as-is from the design mock so the chart
// math (smoothing, range filtering, coordinate mapping) is already correct
// once real points get substituted in.
type ExerciseConfig = { count: number; interval: number; start: number; end: number };

const EXERCISE_CONFIGS: Record<string, ExerciseConfig> = {
  'Bench Press': { count: 16, interval: 3, start: 85, end: 100.5 },
  'Back Squat': { count: 10, interval: 7, start: 115, end: 142.5 },
  Deadlift: { count: 8, interval: 9, start: 155, end: 181 },
  'Overhead Press': { count: 9, interval: 6, start: 44, end: 54.5 },
};
const EXERCISE_NAMES = Object.keys(EXERCISE_CONFIGS);

type RangeKey = 'week' | 'month' | 'all';
const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all', label: 'All-time' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type SeriesPoint = { date: Date; value: number };

function genSeries(cfg: ExerciseConfig, today: Date): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (let i = 0; i < cfg.count; i++) {
    const daysAgo = (cfg.count - 1 - i) * cfg.interval;
    const date = new Date(today.getTime() - daysAgo * 86_400_000);
    const progress = cfg.count === 1 ? 1 : i / (cfg.count - 1);
    const base = cfg.start + (cfg.end - cfg.start) * progress;
    const wobble = Math.sin(i * 1.7) * 0.6 + Math.sin(i * 0.53) * 0.9;
    points.push({ date, value: Math.round((base + wobble) * 10) / 10 });
  }
  return points;
}

function filterByRange(points: SeriesPoint[], range: RangeKey, today: Date): SeriesPoint[] {
  const days = range === 'week' ? 7 : range === 'month' ? 30 : Infinity;
  if (days === Infinity) return points;
  const cutoff = today.getTime() - days * 86_400_000;
  const filtered = points.filter(p => p.date.getTime() >= cutoff);
  return filtered.length >= 2 ? filtered : points.slice(-2);
}

function formatShort(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

type Coord = { x: number; y: number };

function smoothPath(coords: Coord[]): string {
  const n = coords.length;
  if (n === 0) return '';
  if (n === 1) return `M ${coords[0].x} ${coords[0].y}`;
  let d = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = coords[Math.max(i - 1, 0)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(i + 2, n - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function buildChart(points: SeriesPoint[]) {
  const w = 314;
  const h = 100;
  const pad = 8;
  const vals = points.map(p => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const spread = max - min || 1;
  const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: pad + i * stepX,
    y: pad + (h - pad * 2) - ((p.value - min) / spread) * (h - pad * 2),
  }));
  const linePath = smoothPath(coords);
  const last = coords[coords.length - 1];
  const first = coords[0];
  const fillPath = `${linePath} L ${last.x.toFixed(2)} ${h + pad} L ${first.x.toFixed(2)} ${h + pad} Z`;
  return { linePath, fillPath, dotX: last.x, dotY: last.y };
}

export function ProgressionCard() {
  const [exercise, setExercise] = useState(EXERCISE_NAMES[0]);
  const [range, setRange] = useState<RangeKey>('month');

  const { headlineValue, deltaLabel, linePath, fillPath, dotX, dotY, axisStart, axisEnd } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fullSeries = genSeries(EXERCISE_CONFIGS[exercise], today);
    const usedPoints = filterByRange(fullSeries, range, today);
    const chart = buildChart(usedPoints);

    const currentValue = usedPoints[usedPoints.length - 1].value;
    const startValue = usedPoints[0].value;
    const delta = Math.round((currentValue - startValue) * 10) / 10;
    const rangeCaption = range === 'week' ? 'this week' : range === 'month' ? 'this month' : 'all time';

    return {
      headlineValue: fmt(currentValue),
      deltaLabel: `${delta >= 0 ? '+' : ''}${fmt(delta)}kg ${rangeCaption}`,
      linePath: chart.linePath,
      fillPath: chart.fillPath,
      dotX: chart.dotX,
      dotY: chart.dotY,
      axisStart: formatShort(usedPoints[0].date),
      axisEnd: formatShort(usedPoints[usedPoints.length - 1].date),
    };
  }, [exercise, range]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Progression</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {EXERCISE_NAMES.map(name => (
          <Pressable
            key={name}
            onPress={() => setExercise(name)}
            style={[styles.chip, name === exercise && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, name === exercise && styles.chipLabelActive]}>{name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.rangeRow}>
        {RANGE_OPTIONS.map(option => (
          <Pressable
            key={option.key}
            onPress={() => setRange(option.key)}
            style={[styles.rangeSeg, option.key === range && styles.rangeSegActive]}
          >
            <Text style={[styles.rangeLabel, option.key === range && styles.rangeLabelActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.e1rmLabelRow}>
        <Text style={styles.e1rmLabel}>e1RM</Text>
        <GlossaryInfoDot term="e1rm" />
      </View>
      <Text style={styles.headline}>
        {headlineValue}
        <Text style={styles.headlineUnit}>kg</Text>
      </Text>
      <Text style={styles.delta}>{deltaLabel}</Text>

      <Svg viewBox="0 0 314 116" style={styles.chart}>
        <Defs>
          <SvgLinearGradient id="progFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Palette.brand} stopOpacity={0.28} />
            <Stop offset="100%" stopColor={Palette.brand} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Path d={fillPath} fill="url(#progFill)" stroke="none" />
        <Path d={linePath} fill="none" stroke={Palette.brand} strokeWidth={2.5} strokeLinecap="round" />
        <Circle cx={dotX} cy={dotY} r={4} fill={Palette.brand} stroke={Palette.background} strokeWidth={2} />
      </Svg>
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>{axisStart}</Text>
        <Text style={styles.axisLabel}>{axisEnd}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    padding: 18,
  },
  title: { fontFamily: Typefaces.uiBold, fontSize: 16, color: Palette.text, marginBottom: 14 },
  chipsRow: { gap: 8, marginBottom: 12, paddingBottom: 2 },
  chip: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  chipActive: { backgroundColor: Palette.brand, borderColor: Palette.brand },
  chipLabel: { fontFamily: Typefaces.uiSemiBold, fontSize: 13, color: Palette.textSecondary },
  chipLabelActive: { color: Palette.background },
  rangeRow: {
    flexDirection: 'row',
    backgroundColor: Palette.background,
    borderRadius: 10,
    padding: 3,
    marginBottom: 18,
  },
  rangeSeg: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  rangeSegActive: { backgroundColor: Palette.brand },
  rangeLabel: { fontFamily: Typefaces.uiSemiBold, fontSize: 12, color: Palette.textSecondary },
  rangeLabelActive: { fontFamily: Typefaces.uiBold, color: Palette.background },
  e1rmLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  e1rmLabel: {
    fontFamily: Typefaces.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: Palette.textMuted,
    textTransform: 'uppercase',
  },
  headline: { fontFamily: Typefaces.numeralBold, fontSize: 40, lineHeight: 44, color: Palette.text },
  headlineUnit: { fontFamily: Typefaces.numeralBold, fontSize: 20, color: Palette.textSecondary },
  delta: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary, marginTop: 2, marginBottom: 14 },
  chart: { width: '100%', height: 116 },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisLabel: { fontFamily: Typefaces.uiRegular, fontSize: 11, color: Palette.textMuted },
});
