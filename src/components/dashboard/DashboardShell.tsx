'use client'

import { useState, useCallback, useEffect } from 'react'
import DashboardBanner, { type SobrietyMilestone, type Fellowship } from './DashboardBanner'
import OverviewTab from './tabs/OverviewTab'
import JournalTab from './tabs/JournalTab'
import MeetingsTab from './tabs/MeetingsTab'
import TasksTab from './tabs/TasksTab'
import PrivacyTab from './tabs/PrivacyTab'
import SavedTab from './tabs/SavedTab'
import StepWorkTab from './tabs/StepWorkTab'
import SponsorView from './SponsorView'
import OnboardingCard from './OnboardingCard'
import MeetingCheckin from './MeetingCheckin'
import CheckInModal from './CheckInModal'
import PendingRequests from './PendingRequests'
import type { PendingRequest } from './PendingRequests'

type Role = 'my' | 'meetings' | 'sponsor'
type Tab = 'overview' | 'stepwork' | 'journal' | 'meetings' | 'tasks' | 'saved' | 'privacy'

export interface CheckIn { id:string; check_in_date:string; mood:string|null; notes:string|null; sober_today:boolean; meetings_attended:number }
export interface JournalEntry { id:string; title:string|null; entry_date:string; excerpt:string|null; step_number:number|null; is_shared_with_sponsor:boolean }
export interface MeetingAttendance { id:string; meeting_name:string; fellowship_name:string|null; attended_at:string; checkin_method:string }
export interface ReadingAssignment { id:string; title:string; source:string|null; is_completed:boolean; due_date:string|null; created_at:string }
export interface Sponsee { id:string; name:string; sobrietyDate:string|null; currentStep:number; completedSteps:number; lastMood:string|null; lastCheckInDate:string|null; pendingReviews:number }
export interface ActivityItem { id:string; event_type:string; title:string; description:string|null; is_read:boolean; created_at:string }
export type { SobrietyMilestone, Fellowship }

interface StepCompletion { step_number: number; fellowship_id: string | null }

interface Props {
  userId: string
  phone: string | null
  onboardingCompleted: boolean
  profile: { display_name:string|null; sobriety_date:string|null; primary_fellowship_id:string|null; current_step:number; is_available_sponsor:boolean } | null
  initialMilestones: SobrietyMilestone[]
  fellowships: Fellowship[]
  stepCompletions: StepCompletion[]
  recentCheckIns: CheckIn[]
  journalEntries: JournalEntry[]
  journalCount: number
  stepWorkCount: number
  meetingAttendance: MeetingAttendance[]
  meetingsThisWeek: number
  meetingsTotal: number
  readingAssignments: ReadingAssignment[]
  checkInsTotal: number
  activeSponsor: string | null
  sponsees: Sponsee[]
  pendingRequests: PendingRequest[]
  sponsorPendingRequests: PendingRequest[]
  activityItems: ActivityItem[]
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: '⚓ Overview' },
  { id: 'stepwork',  label: '📖 Step Work' },
  { id: 'journal',   label: '✏️ Journal' },
  { id: 'meetings',  label: '👥 Meetings' },
  { id: 'tasks',     label: '📋 Tasks' },
  { id: 'saved',     label: '❤️ Saved' },
  { id: 'privacy',   label: '🔒 Privacy' },
]

export default function DashboardShell({ userId, phone, onboardingCompleted, profile, stepCompletions, recentCheckIns, journalEntries, journalCount, stepWorkCount, meetingAttendance, meetingsThisWeek, meetingsTotal, readingAssignments, checkInsTotal, activeSponsor, sponsees, pendingRequests, sponsorPendingRequests, activityItems, initialMilestones, fellowships }: Props) {
  const [role, setRole] = useState<Role>('my')
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [checkInOpen, setCheckInOpen] = useState(false)

  const displayName = profile?.display_name ?? 'Friend'
  const isSponsor = profile?.is_available_sponsor ?? false

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'sponsor' && isSponsor) {
      setRole('sponsor')
      const url = new URL(window.location.href)
      url.searchParams.delete('tab')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // Active fellowship driven by which milestone tab the user is viewing.
  // undefined = no milestones → fall back to sponsor_relationships in step work.
  // null    = milestone exists but has no fellowship linked (tracking only).
  // string  = specific fellowship ID.
  const hasMilestones = initialMilestones.length > 0
  const primaryMilestone = initialMilestones.find(m => m.is_primary) ?? initialMilestones[0] ?? null
  const [activeFellowshipId, setActiveFellowshipId] = useState<string | null | undefined>(
    hasMilestones ? (primaryMilestone?.fellowship_id ?? null) : undefined
  )
  const handleActiveFellowshipChange = useCallback((fid: string | null) => setActiveFellowshipId(fid), [])

  // Reactively derive step progress for the active fellowship.
  // undefined → all completions (no milestones, legacy cross-fellowship)
  // null      → none (tracking only)
  // string    → filter to that fellowship
  const filteredCompletions = activeFellowshipId === undefined
    ? stepCompletions
    : activeFellowshipId === null
      ? []
      : stepCompletions.filter(sc => sc.fellowship_id === activeFellowshipId)
  const completedSteps = new Set(filteredCompletions.map(r => r.step_number)).size
  const allStepsDone = completedSteps >= 12
  const currentStep = allStepsDone ? 12 : Math.max(1, completedSteps + 1)

  const roles = [
    { id: 'my' as Role, label: '⚓ My Dashboard' },
    { id: 'meetings' as Role, label: '📍 Meeting Check-in' },
    ...(isSponsor ? [{ id: 'sponsor' as Role, label: '👥 Sponsor View' }] : []),
  ]

  return (
    <div style={{ padding: '28px 24px 72px' }}>
      <div className="max-w-[940px] mx-auto">

        {/* Role toggle */}
        <div className="flex p-1 rounded-xl mb-6 overflow-x-auto" style={{ background: 'var(--warm-gray)', border: '1px solid var(--border)', scrollbarWidth: 'none', gap: '2px' }}>
          {roles.map(r => (
            <button key={r.id} onClick={() => setRole(r.id)} className="flex-shrink-0 rounded-lg font-semibold transition-all"
              style={{ padding: '9px 18px', fontSize: '14px', cursor: 'pointer', background: role === r.id ? '#fff' : 'transparent', color: role === r.id ? 'var(--navy)' : 'var(--mid)', border: 'none', boxShadow: role === r.id ? '0 1px 4px rgba(0,51,102,0.1)' : 'none' }}>
              {r.label}
            </button>
          ))}
        </div>

        {/* ── My Dashboard ── */}
        {role === 'my' && (
          <>
            {!onboardingCompleted && <OnboardingCard userId={userId} />}
            <PendingRequests requests={pendingRequests} perspective="as_sponsee" />
            <DashboardBanner
              userId={userId}
              displayName={displayName}
              currentStep={currentStep}
              initialMilestones={initialMilestones}
              fellowships={fellowships}
              onActiveFellowshipChange={handleActiveFellowshipChange}
            />

            {/* Tabs */}
            <div className="flex mb-5 overflow-x-auto" style={{ borderBottom: '2px solid var(--border)', scrollbarWidth: 'none', gap: '0' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className="font-semibold flex-shrink-0 transition-colors"
                  style={{ padding: '10px 18px', fontSize: '14px', cursor: 'pointer', background: 'none', border: 'none', color: activeTab === t.id ? 'var(--navy)' : 'var(--mid)', borderBottom: activeTab === t.id ? '2px solid var(--navy)' : '2px solid transparent', marginBottom: '-2px' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <OverviewTab userId={userId} activeFellowshipId={activeFellowshipId} currentStep={currentStep} completedSteps={completedSteps} allStepsDone={allStepsDone} journalCount={journalCount} stepWorkCount={stepWorkCount} recentCheckIns={recentCheckIns} meetingsThisWeek={meetingsThisWeek} meetingsTotal={meetingsTotal} recentMeetings={meetingAttendance.slice(0,3)} readingAssignments={readingAssignments} activeSponsor={activeSponsor} isAvailableSponsor={isSponsor} activityItems={activityItems} onCheckIn={() => setCheckInOpen(true)} onJournal={() => setActiveTab('journal')} />
            )}
            {activeTab === 'stepwork' && <StepWorkTab userId={userId} fellowshipId={activeFellowshipId} />}
            {activeTab === 'journal' && <JournalTab userId={userId} entries={journalEntries} />}
            {activeTab === 'meetings' && <MeetingsTab userId={userId} meetingsThisWeek={meetingsThisWeek} meetingsTotal={meetingsTotal} meetingAttendance={meetingAttendance} />}
            {activeTab === 'tasks' && <TasksTab readingAssignments={readingAssignments} hasSponsor={activeSponsor !== null} />}
            {activeTab === 'saved' && <SavedTab userId={userId} />}
            {activeTab === 'privacy' && <PrivacyTab userId={userId} displayName={profile?.display_name ?? null} phone={phone} journalCount={journalCount} stepWorkCount={stepWorkCount} checkInsTotal={checkInsTotal} meetingsTotal={meetingsTotal} isAvailableSponsor={isSponsor} />}
          </>
        )}

        {role === 'meetings' && <MeetingCheckin userId={userId} />}
        {role === 'sponsor' && isSponsor && <SponsorView sponsees={sponsees} pendingRequests={sponsorPendingRequests} />}
      </div>

      {checkInOpen && <CheckInModal userId={userId} onClose={() => setCheckInOpen(false)} />}
    </div>
  )
}
