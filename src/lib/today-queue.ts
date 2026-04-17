// Server-side today-queue builder (member Tier 2 only).
// Sponsor Tier 1/3 items are added in Phase E.
import type { TodayItemData, TodayQueueResult } from '@/components/dashboard/today/today-queue-types'

const DEFAULT_MEETING_TARGET = 3

interface MemberQueueInput {
  checkedInToday: boolean
  currentStep: number | null
  stepWorkCount: number
  meetingsThisWeek: number
  weeklyMeetingTarget?: number
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
      href: '/dashboard/step-work',
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
    href: '/meetings',
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
