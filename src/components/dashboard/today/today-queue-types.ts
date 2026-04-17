export type TodayItemVariant = 'default' | 'gold' | 'alert'

export interface TodayItemData {
  id: string
  icon: string
  variant?: TodayItemVariant
  label: string
  sub?: string
  cta: string
  href?: string
  priority: number
  completed?: boolean
  /**
   * When set, renders a check-to-complete affordance. Clicking it calls
   * acknowledge_sponsee_checkin RPC and optimistically hides the row.
   */
  ackCheckInId?: string
}

export interface TodayQueueResult {
  items: TodayItemData[]
  overflowCount: number
  caughtUp: boolean
  memberCaughtUp: boolean
}

export interface DailyQuote {
  text: string
  attribution: string | null
}
