// Shared types for the Phase R user-meetings feature.
//
// Backed by the public.user_custom_meetings table. The table predates Phase R
// (it had a dormant save path via CheckInModal), so the schema carries some
// legacy columns — type/recurrence/is_private — that we don't surface in the
// Phase R UI. Writes default them to ('public', 'weekly'|'once' depending on
// day_of_week, false) so the existing CHECK constraints stay satisfied.

export type MeetingFormat = 'in_person' | 'online' | 'hybrid'

export interface UserCustomMeeting {
  id: string
  user_id: string
  fellowship_id: string | null
  name: string
  day_of_week: number | null         // 0 = Sun .. 6 = Sat
  time_local: string | null          // 'HH:mm' or 'HH:mm:ss'
  format: MeetingFormat | null
  location: string | null
  topic: string | null
  is_active: boolean
  last_attended_at: string | null    // ISO timestamp
  created_at: string
  updated_at: string
  // Legacy columns. Defaults below are what AddMeetingModal writes.
  type: 'public' | 'personal' | 'sponsor' | 'other'
  recurrence: 'once' | 'daily' | 'weekly' | 'custom'
  is_private: boolean
}

export interface FellowshipOption {
  id: string
  name: string
  abbreviation: string | null
}

// Day-of-week display labels (Sun-first to match Postgres EXTRACT(DOW).)
export const DAY_LABELS: { value: number; short: string; long: string }[] = [
  { value: 0, short: 'Sun', long: 'Sunday' },
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
]

export const FORMAT_LABELS: { value: MeetingFormat; label: string }[] = [
  { value: 'in_person', label: 'In-person' },
  { value: 'online',    label: 'Online' },
  { value: 'hybrid',    label: 'Hybrid' },
]
