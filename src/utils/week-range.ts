export type WeekRange = { start: Date; end: Date };

// Monday 00:00 through Sunday 23:59:59.999 of the current calendar week,
// device local time — same locality convention as session-repo.ts's
// todayLocalDate(). Shared by any Summary query that needs "this week"
// (Volume by muscle; Consistency reuses this in a follow-up task).
export function getCurrentWeekRange(): WeekRange {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday, 0, 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);

  return { start, end };
}
