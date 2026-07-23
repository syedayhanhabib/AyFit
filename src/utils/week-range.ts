export type WeekRange = { start: Date; end: Date };

// Monday 00:00 through Sunday 23:59:59.999 of the calendar week containing
// referenceDate, device local time — same locality convention as
// session-repo.ts's todayLocalDate(). Shared by any Summary query that
// needs "this week" (Volume by muscle) or an arbitrary past week
// (Consistency's weekly-streak walk-back).
export function getCurrentWeekRange(referenceDate: Date = new Date()): WeekRange {
  const dayOfWeek = referenceDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - daysSinceMonday,
    0,
    0,
    0,
    0
  );
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);

  return { start, end };
}
