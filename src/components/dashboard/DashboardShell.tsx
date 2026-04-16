'use client'

import { useState, useCallback, useEffect } from 'react'
import { useScrollFade } from '@/hooks/useScrollFade'
import DashboardBanner, { type SobrietyMilestone, type Fellowship } from './DashboardBanner'
import OverviewTab from './tabs/OverviewTab'
import JournalTab from './tabs/JournalTab'
import MeetingsTab from './tabs/MeetingsTab'
import TasksTab from './tabs/TasksTab'
import SavedTab from './tabs/SavedTab'
import StepWorkTab from './tabs/StepWorkTab'
import SponsorView from './SponsorView'
import OnboardingCard from './OnboardingCard'
import MeetingCheckin from './MeetingCheckin'
import CheckInModal from './CheckInModal'
import PendingRequests from './PendingRequests'
import type { PendingRequest } from './PendingRequests'

type Role = 'my' | 'sponsees' | 'meetings'
type Tab = 'overview' | 'stepwork' | 'journal' | 'meetings' | 'tasks' | 'saved'

export interface CheckIn { id:string; check_in_date:string; mood:string|null; notes:string|null; sober_today:boolean; meetings_attended:number }
export interface JournalEntry { id:string; title:string|null; entry_date:string; excerpt:string|null; step_number:number|null; is_shared_with_sponsor:boolean }
export interface MeetingAttendance { id:string; meeting_name:string; fellowship_name:string|null; location_name:string|null; attended_at:string; checkin_method:string; notes:string|null }
export interface ReadingAssignment { id:string; title:string; source:string|null; is_completed:boolean; due_date:string|null; created_at:string }
export interface SponseeCheckIn { date:string; mood:string|null; notes:string|null; soberToday:boolean; meetingsAttended:number; calledSponsor:boolean|null }
export interface ActiveSponsor { relationshipId:string; name:string; fellowshipId:string|null; fellowshipAbbr:string|null }
export interface SponseeFull { id:string; name:string; fellowshipAbbr:string|null; fellowshipAbbrs:string[]; relationships:{ id:string; fellowshipId:string|null; fellowshipAbbr:string|null }[]; sobrietyDate:string|null; checkInHistory:SponseeCheckIn[]; lastStepWork:{ date:string; title:string; stepNumber:number|null }|null; pendingReviews:number; lastMeeting:{ date:string; name:string }|null; completedSteps:number; totalSteps:number; latestNote:{ text:string; createdAt:string }|null; noteCount:number; activeTasks:number; overdueTasks:number }
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
  activeSponsors: ActiveSponsor[]
  sponsees: SponseeFull[]
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
]

export default function DashboardShell({ userId, phone, onboardingCompleted, profile, stepCompletions, recentCheckIns, journalEntries, journalCount, stepWorkCount, meetingAttendance, meetingsThisWeek, meetingsTotal, readingAssignments, checkInsTotal, activeSponsors, sponsees, pendingRequests, sponsorPendingRequests, activityItems, initialMilestones, fellowships }: Props) {
  const [role, setRole] = useState<Role>('my')
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [checkInOpen, setCheckInOpen] = useState(false)
  const { ref: roleScrollRef,  fadeLeft: roleFadeLeft,  fadeRight: roleFadeRight  } = useScrollFade()
  const { ref: tabsScrollRef,  fadeLeft: tabsFadeLeft,  fadeRight: tabsFadeRight  } = useScrollFade()

  const displayName = profile?.display_name ?? 'Friend'
  const isSponsor = profile?.is_available_sponsor ?? false

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'sponsees' && isSponsor) {
      setRole('sponsees')
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
    { id: 'my'       as Role, label: '⚓ My Recovery'     },
    ...(isSponsor ? [{ id: 'sponsees' as Role, label: '👥 My Sponsees' }] : []),
    { id: 'meetings' as Role, label: '📍 Meeting Check-in' },
  ]

  return (
    <div style={{ padding: '28px 24px 72px' }}>
      <div className="max-w-[940px] mx-auto">

        {/* Role toggle */}
        <div className="relative rounded-xl mb-6" style={{ background: 'var(--warm-gray)', border: '1px solid var(--border)' }}>
          {roleFadeLeft && (
            <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 40, zIndex: 1, pointerEvents: 'none', borderRadius: '12px 0 0 12px', background: 'linear-gradient(to right, var(--warm-gray), transparent)' }} />
          )}
          {roleFadeRight && (
            <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 40, zIndex: 1, pointerEvents: 'none', borderRadius: '0 12px 12px 0', background: 'linear-gradient(to left, var(--warm-gray), transparent)' }} />
          )}
          <div ref={roleScrollRef} className="flex p-1 overflow-x-auto" style={{ scrollbarWidth: 'none', gap: '2px' }}>
            {roles.map(r => (
              <button key={r.id} onClick={() => setRole(r.id)} className="flex-shrink-0 rounded-lg font-semibold transition-all"
                style={{ padding: '9px 18px', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', background: role === r.id ? '#fff' : 'transparent', color: role === r.id ? 'var(--navy)' : 'var(--mid)', border: 'none', boxShadow: role === r.id ? '0 1px 4px rgba(0,51,102,0.1)' : 'none' }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── My Recovery ── */}
        {role === 'my' && (
          <>
            {!onboardingCompleted && <OnboardingCard userId={userId} />}
            <PendingRequests requests={pendingRequests} perspective="as_sponsee" />
            <DashboardBanner
              userId={userId}
              displayName={displayName}
              initialMilestones={initialMilestones}
              fellowships={fellowships}
              onActiveFellowshipChange={handleActiveFellowshipChange}
            />

            {/* Tabs */}
            <div className="relative mb-5" style={{ borderBottom: '2px solid var(--border)' }}>
              {tabsFadeLeft && (
                <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 40, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(to right, #fff, transparent)' }} />
              )}
              {tabsFadeRight && (
                <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 40, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(to left, #fff, transparent)' }} />
              )}
              <div ref={tabsScrollRef} className="flex overflow-x-auto" style={{ scrollbarWidth: 'none', gap: '0' }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)} className="font-semibold flex-shrink-0 transition-colors"
                    style={{ padding: '10px 18px', fontSize: '14px', cursor: 'pointer', background: 'none', border: 'none', whiteSpace: 'nowrap', color: activeTab === t.id ? 'var(--navy)' : 'var(--mid)', borderBottom: activeTab === t.id ? '2px solid var(--navy)' : '2px solid transparent', marginBottom: '-2px' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'overview' && (
              <OverviewTab userId={userId} activeFellowshipId={activeFellowshipId} currentStep={currentStep} completedSteps={completedSteps} allStepsDone={allStepsDone} journalCount={journalCount} stepWorkCount={stepWorkCount} recentCheckIns={recentCheckIns} meetingsThisWeek={meetingsThisWeek} meetingsTotal={meetingsTotal} recentMeetings={meetingAttendance.slice(0,3)} readingAssignments={readingAssignments} activeSponsors={activeSponsors} isAvailableSponsor={isSponsor} activityItems={activityItems} displayName={displayName} onCheckIn={() => setCheckInOpen(true)} onJournal={() => setActiveTab('journal')} onViewTasks={() => setActiveTab('tasks')} />
            )}
            {activeTab === 'stepwork' && <StepWorkTab userId={userId} fellowshipId={activeFellowshipId} />}
            {activeTab === 'journal' && <JournalTab userId={userId} entries={journalEntries} />}
            {activeTab === 'meetings' && <MeetingsTab userId={userId} meetingsThisWeek={meetingsThisWeek} meetingsTotal={meetingsTotal} meetingAttendance={meetingAttendance} fellowships={fellowships} />}
            {activeTab === 'tasks' && <TasksTab userId={userId} readingAssignments={readingAssignments} hasSponsor={activeSponsors.length > 0} />}
            {activeTab === 'saved' && <SavedTab userId={userId} />}
          </>
        )}

        {role === 'meetings' && <MeetingCheckin userId={userId} />}
        {role === 'sponsees' && isSponsor && <SponsorView sponsees={sponsees} pendingRequests={sponsorPendingRequests} displayName={displayName} userId={userId} />}
      </div>

      {checkInOpen && <CheckInModal userId={userId} onClose={() => setCheckInOpen(false)} />}
    </div>
  )
}
