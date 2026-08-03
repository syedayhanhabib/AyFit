// Display formatting for Calendar's date headers — explicit month-name
// array, not Intl/toLocaleDateString, since Hermes's Intl support is
// inconsistent. Kept separate from local-date.ts: that file is local-date
// MATH (keys, ranges, "today"), this one is display formatting — a
// different concern, same split CLAUDE.md already draws elsewhere.
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// month is 1-12, matching local-date.ts's getMonthRange convention. Used by
// calendar.tsx's month header, e.g. "AUGUST 2026".
export function formatMonthHeader(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1].toUpperCase()} ${year}`;
}

// dateKey is a 'YYYY-MM-DD' string (local-date.ts's format). Assumes
// well-formed input, same convention as parseDateLocal — validating a
// route param before it reaches here is the caller's job. Used by
// /day/[date]'s header, e.g. "July 30, 2026".
export function formatFullDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}
