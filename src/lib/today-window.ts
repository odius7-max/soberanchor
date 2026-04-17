// Returns the current "today" date string (YYYY-MM-DD) for check-in comparisons.
// Uses UTC date as the server-side fallback since user_profiles.timezone does not
// yet exist. Off-by-one near midnight for Americas users is acceptable for beta.
// TODO: Replace with IANA timezone lookup once user_profiles.timezone is added.
export function getTodayDateStr(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}
