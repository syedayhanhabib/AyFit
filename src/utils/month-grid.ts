import { formatDateLocal, getMonthRange, parseDateLocal } from '@/utils/local-date';

// Pure calendar-grid arithmetic — no Supabase, no React, no I/O. Same
// math-vs-everything-else split as session-blocks.ts and pr-detection.ts,
// so it's unit-testable without a database or a renderer.

export type MonthGridDay = string | null; // null = blank cell (before day 1 or after the last day)
export type MonthGridWeek = MonthGridDay[]; // always length 7

// month is 1-12, NOT JS's native Date month index (0-11) — matches
// getMonthRange's existing convention (src/utils/local-date.ts).
//
// Grid is MONDAY-FIRST: Mon Tue Wed Thu Fri Sat Sun. Not a free choice —
// summary-repo.ts already buckets weekly streaks by "the Monday of its
// week" (see DESIGN.md's Calendar — Phase 3 section), so a Sunday-first
// grid here would silently disagree with Summary about what "this week"
// means.
export function buildMonthGrid(year: number, month: number): MonthGridWeek[] {
  const { end } = getMonthRange(year, month);
  const daysInMonth = parseDateLocal(end).getDate();

  const firstOfMonth = new Date(year, month - 1, 1);
  // getDay() returns 0 for SUNDAY, 1 for Monday, ... 6 for Saturday. The +6
  // mod 7 shift remaps it to Monday = 0 ... Sunday = 6 — the one line that
  // decides the whole grid's alignment. Get it wrong and the grid is off by
  // a day but still looks like a plausible calendar.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  const cells: MonthGridDay[] = new Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(formatDateLocal(new Date(year, month - 1, day)));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: MonthGridWeek[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
