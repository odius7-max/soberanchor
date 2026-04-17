import type { TodayItemData, TodayQueueResult } from '@/components/dashboard/today/today-queue-types'

const DEFAULT_MEETING_TARGET = 3

interface MemberQueueInput {
  checkedInToday: boolean
  currentStep: number | null
  stepWorkCount: number
  meetingsThisWeek: number
  weeklyMeetingTarget?: number
  stepWorkHref?: string
}

export function buildMemberTodayQueue(input: MemberQueueInput): TodayQueueResult {
  const target = input.weeklyMeetingTarget ?? DEFAULT_MEETING_TARGET
  const items: TodayItemData[] = []

  // Priority 500 — daily check-in (always shown; completed if already done today)
  items.push({
    id: 'checkin',
    icon: '⚓',
    variant: 'gold',
    label: "Log today's check-in",
    sub: 'Mood · meeting · a note — takes 30 seconds',
    cta: 'Check in →',
    priority: 500,
    completed: input.checkedInToday,
  })

  // Priority 450 — step work in progress
  if (input.currentStep) {
    items.push({
      id: 'stepwork',
      icon: '📝',
      variant: 'default',
      label: `Continue Step ${input.currentStep}`,
      sub: input.stepWorkCount > 0
        ? `${input.stepWorkCount} prompt${input.stepWorkCount !== 1 ? 's' : ''} answered`
        : 'Ready to begin',
      cta: 'Continue →',
      href: input.stepWorkHref ?? '/dashboard/step-work/aa-step-1-reading',
      priority: 450,
    })
  }

  // Priority 400 — weekly meeting target
  items.push({
    id: 'meeting',
    icon: '🤝',
    variant: 'default',
    label: 'Log a meeting this week',
    sub: `${input.meetingsThisWeek} of ${target} weekly target`,
    cta: 'Find meetings →',
    href: '/find/meetings',
    priority: 400,
    completed: input.meetingsThisWeek >= target,
  })

  items.sort((a, b) => b.priority - a.priority)
  const visible = items.slice(0, 6)
  const overflowCount = Math.max(0, items.length - 6)

  return {
    items: visible,
    overflowCount,
    caughtUp: items.every(i => i.completed),
  }
}

interface SponsorSponseeInput {
  id: string
  name: string
  checkInHistory: Array<{ date: string; mood: string | null }>
  pendingReviews: number
}

interface MilestoneReminderInput {
  sponsee_user_id: string
  sponsee_name: string
  milestone_label: string
  milestone_date: string
}

interface SponsorTodayInput {
  sponsees: SponsorSponseeInput[]
  milestoneReminders: MilestoneReminderInput[]
  today: string
}

// Moods that surface a sponsor alert. 'crisis' is DB-only (not shown in modal UI)
// but must be caught here — it's the most urgent case.
const SEVERE_MOODS = new Set(['struggling', 'hard', 'crisis'])

const MOOD_ALERT_LABEL: Record<string, string> = {
  crisis:     'is in crisis — reach out now',
  struggling: 'checked in as struggling',
  hard:       'is having a hard day',
}
const MOOD_ALERT_SUB: Record<string, string> = {
  crisis:     'Today · reach out now',
  struggling: 'Today · reach out when you can',
  hard:       'Today · check in if you can',
}

export function buildSponsorTodayItems(input: SponsorTodayInput): TodayItemData[] {
  const { sponsees, milestoneReminders, today } = input
  const items: TodayItemData[] = []

  for (const sponsee of sponsees) {
    const latest = sponsee.checkInHistory[0]

    // Tier 1 — severe check-in today (struggling | hard | crisis) — priority 600
    if (latest?.date === today && latest.mood && SEVERE_MOODS.has(latest.mood)) {
      const mood = latest.mood
      items.push({
        id: `alert-${mood}-${sponsee.id}`,
        icon: mood === 'crisis' ? '🚨' : '⚠️',
        variant: 'alert',
        label: `${sponsee.name} ${MOOD_ALERT_LABEL[mood] ?? 'checked in as struggling'}`,
        sub: MOOD_ALERT_SUB[mood] ?? 'Today · reach out when you can',
        cta: 'Reach out →',
        href: `/my-recovery/sponsor/sponsee/${sponsee.id}`,
        priority: 600,
      })
      continue
    }

    // Tier 1 — silent 3+ days (priority 580); skip if already alerted struggling
    const daysSilent = latest
      ? Math.floor((new Date(today).getTime() - new Date(latest.date).getTime()) / 86_400_000)
      : 999
    if (daysSilent >= 3) {
      items.push({
        id: `alert-silent-${sponsee.id}`,
        icon: '🔔',
        variant: 'alert',
        label: `${sponsee.name} hasn't checked in for ${daysSilent} days`,
        sub: 'A quick check-in might help',
        cta: 'Reach out →',
        href: `/my-recovery/sponsor/sponsee/${sponsee.id}`,
        priority: 580,
      })
    }

    // Tier 3 — pending step work reviews (priority 350)
    if (sponsee.pendingReviews > 0) {
      items.push({
        id: `review-${sponsee.id}`,
        icon: '📋',
        variant: 'default',
        label: `Review ${sponsee.name}'s step work`,
        sub: `${sponsee.pendingReviews} awaiting response`,
        cta: 'Review →',
        href: `/my-recovery/sponsor/sponsee/${sponsee.id}`,
        priority: 350,
      })
    }
  }

  // Tier 3 — milestone reminders (priority 300)
  for (const r of milestoneReminders) {
    const daysOut = Math.round(
      (new Date(r.milestone_date).getTime() - new Date(today).getTime()) / 86_400_000
    )
    const dayOf = daysOut === 0
    const formattedDate = new Date(r.milestone_date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric',
    })
    items.push({
      id: `milestone-${r.sponsee_user_id}-${r.milestone_label}`,
      icon: '🎉',
      variant: 'gold',
      label: dayOf
        ? `${r.sponsee_name} is celebrating ${r.milestone_label} today — reach out`
        : `${r.sponsee_name} hits ${r.milestone_label} on ${formattedDate}`,
      sub: dayOf ? undefined : `${daysOut} days out · time to order a chip or plan something`,
      cta: `Plan their ${r.milestone_label} →`,
      href: `/my-recovery/sponsor/sponsee/${r.sponsee_user_id}`,
      priority: 300,
    })
  }

  return items
}
