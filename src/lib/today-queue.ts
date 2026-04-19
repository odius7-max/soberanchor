import type { TodayItemData, TodayQueueResult } from '@/components/dashboard/today/today-queue-types'

const DEFAULT_MEETING_TARGET = 3

// ─── Caught-up detection ─────────────────────────────────────────────────────

export interface CaughtUpInput {
  checkedInToday: boolean
  stepWorkCount: number
  currentStep: number | null
  meetingsThisWeek: number
  weeklyMeetingTarget?: number
}

/**
 * True when all required Today items are satisfied:
 * - Check-in logged for today
 * - Meeting goal met this week (or user has no weekly target set)
 * Step work is not forced daily — if currentStep is null (no program) it's not required.
 */
export function isCaughtUp(input: CaughtUpInput): boolean {
  if (!input.checkedInToday) return false
  const target = input.weeklyMeetingTarget ?? DEFAULT_MEETING_TARGET
  if (input.meetingsThisWeek < target) return false
  return true
}

export interface TodaySummaryInput {
  checkedInMood: string | null
  meetingName: string | null
  stepWorkCount: number
  currentStep: number | null
}

/** Builds "Today you · checked in 'okay' · logged X · answered Y prompt" string parts. */
export function getTodaySummaryParts(input: TodaySummaryInput): string[] {
  const parts: string[] = []
  if (input.checkedInMood) parts.push(`checked in '${input.checkedInMood}'`)
  if (input.meetingName) parts.push(`logged ${input.meetingName}`)
  if (input.stepWorkCount > 0 && input.currentStep) {
    parts.push(`answered ${input.stepWorkCount} Step ${input.currentStep} prompt${input.stepWorkCount !== 1 ? 's' : ''}`)
  }
  return parts
}

export interface MemberProgram {
  fellowshipId: string
  fellowshipAbbr: string
  currentStep: number | null
  stepWorkCount: number
  /** True when step has been submitted to sponsor and is awaiting review. */
  stepWorkSubmitted?: boolean
  stepWorkHref?: string
  meetingsThisWeek: number
  weeklyMeetingTarget?: number
}

interface MemberQueueInput {
  checkedInToday: boolean
  programs: MemberProgram[]
}

export function buildMemberTodayQueue(input: MemberQueueInput): TodayQueueResult {
  const { programs } = input
  const multi = programs.length > 1
  const items: TodayItemData[] = []

  // Priority 500 — daily check-in (always shown)
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

  // Priority 450 — step work per program (only when currentStep + href are set)
  for (const p of programs) {
    if (!p.currentStep || !p.stepWorkHref) continue
    const submitted = !!p.stepWorkSubmitted
    const baseLabel = submitted
      ? `Step ${p.currentStep} submitted`
      : `Continue Step ${p.currentStep}`
    items.push({
      id: multi ? `stepwork-${p.fellowshipId}` : 'stepwork',
      icon: '📝',
      variant: 'default',
      label: multi ? `${baseLabel} · ${p.fellowshipAbbr}` : baseLabel,
      sub: submitted
        ? 'Awaiting sponsor review'
        : p.stepWorkCount > 0
          ? `${p.stepWorkCount} prompt${p.stepWorkCount !== 1 ? 's' : ''} answered`
          : 'Ready to begin',
      cta: submitted ? 'Submitted' : 'Continue →',
      href: p.stepWorkHref,
      priority: 450,
      completed: submitted,
    })
  }

  // Priority 400 — weekly meeting target per program
  for (const p of programs) {
    const target = p.weeklyMeetingTarget ?? DEFAULT_MEETING_TARGET
    items.push({
      id: multi ? `meeting-${p.fellowshipId}` : 'meeting',
      icon: '🤝',
      variant: 'default',
      label: multi ? `Log ${p.fellowshipAbbr} meeting this week` : 'Log a meeting this week',
      sub: `${p.meetingsThisWeek} of ${target} weekly target`,
      cta: 'Find meetings →',
      href: '/find/meetings',
      priority: 400,
      completed: p.meetingsThisWeek >= target,
    })
  }

  items.sort((a, b) => b.priority - a.priority)
  const visible = items.slice(0, 6)
  const overflowCount = Math.max(0, items.length - 6)
  const p0 = programs[0]
  const memberCaughtUp = p0
    ? isCaughtUp({
        checkedInToday: input.checkedInToday,
        stepWorkCount: p0.stepWorkCount,
        currentStep: p0.currentStep,
        meetingsThisWeek: p0.meetingsThisWeek,
        weeklyMeetingTarget: p0.weeklyMeetingTarget,
      })
    : input.checkedInToday

  return {
    items: visible,
    overflowCount,
    caughtUp: items.every(i => i.completed),
    memberCaughtUp,
  }
}

interface SponsorSponseeInput {
  id: string
  name: string
  checkInHistory: Array<{ id: string; date: string; mood: string | null; sponsor_acknowledged_at: string | null }>
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
      if (latest.sponsor_acknowledged_at) continue

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
        ackCheckInId: latest.id,
      })
      continue
    }

    // Tier 1 — silent: no shared check-ins at all, or none in 3+ days (priority 580)
    if (!latest) {
      // No rows returned by the is_shared_with_sponsor=true query — sponsee hasn't
      // shared any check-ins yet. Don't expose a raw day-count sentinel.
      items.push({
        id: `alert-silent-${sponsee.id}`,
        icon: '🔔',
        variant: 'alert',
        label: `${sponsee.name} — no recent check-ins shared with you`,
        sub: undefined,
        cta: 'Reach out →',
        href: `/my-recovery/sponsor/sponsee/${sponsee.id}`,
        priority: 580,
      })
    } else {
      const daysSilent = Math.floor(
        (new Date(today).getTime() - new Date(latest.date).getTime()) / 86_400_000
      )
      if (daysSilent >= 3) {
        const lastDate = new Date(latest.date + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'short', day: 'numeric',
        })
        items.push({
          id: `alert-silent-${sponsee.id}`,
          icon: '🔔',
          variant: 'alert',
          label: `${sponsee.name} hasn't checked in for ${daysSilent} day${daysSilent !== 1 ? 's' : ''}`,
          sub: `Last shared check-in: ${lastDate}`,
          cta: 'Reach out →',
          href: `/my-recovery/sponsor/sponsee/${sponsee.id}`,
          priority: 580,
        })
      }
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
