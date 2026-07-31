// Canonical home for local-date math. All date keys are 'YYYY-MM-DD' strings
// computed in LOCAL device time, never UTC-derived (device is UTC+5; a
// UTC-derived key puts an evening set on the wrong day). session-repo.ts and
// summary-repo.ts each still carry their own copy of this logic — not
// consolidated onto this file yet, see CLAUDE.md's parking lot.

export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Inverse of formatDateLocal. Parses via explicit y/m/d components rather
// than `new Date(str)`, which parses as UTC midnight and can land on the
// wrong local day.
export function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayLocalDate(): string {
  return formatDateLocal(new Date());
}

// month is 1-12 here, NOT JS's native Date month index (0-11) — the
// conversion to 0-11 happens internally. Passing a JS-style 0-11 month
// silently shifts the whole range by one month.
export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // day 0 of "next month" = last day of this month
  return { start: formatDateLocal(start), end: formatDateLocal(end) };
}
