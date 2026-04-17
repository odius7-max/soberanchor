export type MoodKey = 'struggling' | 'hard' | 'okay' | 'good' | 'great'
export type MoodTone = 'rough' | 'neutral' | 'positive'

export interface MoodOption {
  key: MoodKey
  emoji: string
  label: string
  tone: MoodTone
}

export const MOODS: MoodOption[] = [
  { key: 'struggling', emoji: '😖', label: 'Struggling', tone: 'rough' },
  { key: 'hard',       emoji: '😕', label: 'Hard',       tone: 'rough' },
  { key: 'okay',       emoji: '😐', label: 'Okay',       tone: 'neutral' },
  { key: 'good',       emoji: '🙂', label: 'Good',       tone: 'positive' },
  { key: 'great',      emoji: '😊', label: 'Great',      tone: 'positive' },
]

export type MeetingKind = 'public' | 'custom'

export interface SelectedMeeting {
  kind: MeetingKind
  id: string
  name: string
}

export interface MeetingChipData {
  key: string
  kind: MeetingKind | 'none' | 'different' | 'custom_new'
  id?: string
  name: string
  isUsual?: boolean
}

export interface NewCustomMeeting {
  name: string
  type: 'public' | 'personal' | 'sponsor' | 'other'
  recurrence: 'once' | 'daily' | 'weekly' | 'custom'
  dayOfWeek?: number
  saveToMyMeetings: boolean
  isPrivate: boolean
}

export interface CheckinFormState {
  mood: MoodKey | null
  meeting: SelectedMeeting | null
  newCustom: NewCustomMeeting | null
  note: string
  isSharedWithSponsor: boolean
}

export interface SaveResult {
  streak: number
  mood: MoodKey
  meetingName: string | null
}
