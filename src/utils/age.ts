// Pure date math, no Supabase/React import — same math-vs-fetching split as
// pr-detection.ts and session-blocks.ts. Both args are 'YYYY-MM-DD'; parsed by
// splitting on '-' into integers rather than via `new Date(...)`, because
// `new Date('1990-05-15')` parses as UTC midnight but reports local
// components — in a negative-offset timezone that reads as the 14th.
export function calculateAge(dobYmd: string, todayYmd: string): number | undefined {
  const dob = parseYmd(dobYmd);
  const today = parseYmd(todayYmd);
  if (!dob || !today) {
    return undefined;
  }

  if (compareYmd(dob, today) > 0) {
    return undefined;
  }

  let age = today.year - dob.year;
  // Comparing (month, day) tuples handles the 29 Feb edge case without any
  // special-casing: in a non-leap year there is no Feb 29 to compare against,
  // so today's (month, day) is compared directly against (2, 29). Feb 28 is
  // (2, 28) < (2, 29) — birthday not yet occurred; March 1 is (3, 1) > (2, 29)
  // — birthday occurred. Both fall out of the plain tuple comparison below;
  // the "counts as passed from 1 March" rule needs no dedicated code path.
  const birthdayOccurred =
    today.month > dob.month || (today.month === dob.month && today.day >= dob.day);
  if (!birthdayOccurred) {
    age -= 1;
  }

  return age;
}

type Ymd = { year: number; month: number; day: number };

function parseYmd(ymd: string): Ymd | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidCalendarDate(year, month, day)) {
    return undefined;
  }

  return { year, month, day };
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  return day <= daysInMonth(year, month);
}

// Exported: also consumed by Profile's DOB day-wheel, which builds its
// `values` array as 1..daysInMonth(year, month) — so an impossible date like
// Feb 30 is never a selectable stop, and parseYmd's calendar-validity guard
// above can never fire from that UI (it stays as a defense for malformed or
// hand-typed input elsewhere).
export function daysInMonth(year: number, month: number): number {
  const daysByMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysByMonth[month - 1];
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function compareYmd(a: Ymd, b: Ymd): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}
