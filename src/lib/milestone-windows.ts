export const MILESTONE_WINDOWS: Array<{ days: number; label: string; leadDays: number }> = [
  { days: 1,   label: '24 hours',  leadDays: 0 },
  { days: 30,  label: '30 days',   leadDays: 7 },
  { days: 60,  label: '60 days',   leadDays: 10 },
  { days: 90,  label: '90 days',   leadDays: 10 },
  { days: 180, label: '6 months',  leadDays: 14 },
  { days: 270, label: '9 months',  leadDays: 14 },
  { days: 365, label: '1 year',    leadDays: 21 },
  { days: 548, label: '18 months', leadDays: 10 },
]

export function getUpcomingMilestones(
  sobrietyDate: Date,
  now = new Date()
): Array<{ days: number; label: string; leadDays: number }> {
  const daysSober = Math.floor((+now - +sobrietyDate) / 86_400_000)
  const candidates = [
    ...MILESTONE_WINDOWS,
    ...Array.from({ length: 30 }, (_, i) => ({
      days: 365 * (i + 2),
      label: `${i + 2} years`,
      leadDays: 14,
    })),
  ]
  return candidates.filter(m => m.days >= daysSober && m.days - daysSober <= m.leadDays)
}
