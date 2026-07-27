/**
 * Picks the singular or plural form of a noun for a count.
 *
 *   `${n} ${pluralize(n, 'exercise')}`  ->  "1 exercise" / "2 exercises"
 *   pluralize(n, 'week')                ->  "week" / "weeks"
 *
 * Returns the noun only, not the count, so callers that render the number in
 * its own styled element (a numeral face beside a unit label, as on Summary's
 * cards) can use it too.
 *
 * `plural` is for irregulars — anything not formed by appending 's'. Zero takes
 * the plural form, which is correct for English: "0 exercises".
 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
