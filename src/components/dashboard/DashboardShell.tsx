'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import ProviderDashboardShell from '@/components/providers/ProviderDashboardShell'
import type { FacilityData } from '@/components/providers/ListingTab'
import type { Lead } from '@/components/providers/LeadsTab'
import TodayCard from './today/TodayCard'
import type { TodayItemData } from './today/today-queue-types'
import type { DailyQuote } from './today/today-queue-types'
import JourneySubNav from './nav/JourneySubNav'
import type { JourneyTab } from './nav/JourneySubNav'
import SponseesTab from './nav/SponseesTab'
import Hero from './Hero'
import RightRail from './RightRail'

type Mode = 'my' | 'sponsees' | 'checkin' | 'facility'
type Tab = 'today' | 'overview' | 'stepwork' | 'journal' | 'meetings' | 'tasks' | 'saved'

export interface CheckIn { id:string; check_in_date:string; mood:string|null; notes:string|null; sober_today:boolean; meetings_attended:number }
export interface JournalEntry { id:string; title:string|null; entry_date:string; body:string|null; step_number:number|null; is_shared_with_sponsor:boolean }
export interface MeetingAttendance { id:string; meeting_name:string; fellowship_name:string|null; location_name:string|null; attended_at:string; checkin_method:string; notes:string|null }
export interface ReadingAssignment { id:string; title:string; source:string|null; is_completed:boolean; due_date:string|null; created_at:string }
export interface SponseeCheckIn { id:string; date:string; mood:string|null; notes:string|null; soberToday:boolean; meetingsAttended:number; calledSponsor:boolean|null; sponsor_acknowledged_at:string|null }
export interface ActiveSponsor { relationshipId:string; name:string; fellowshipId:string|null; fellowshipAbbr:string|null }
export interface SponseeFull { id:string; name:string; fellowshipAbbr:string|null; fellowshipAbbrs:string[]; relationships:{ id:string; fellowshipId:string|null; fellowshipAbbr:string|null }[]; sobrietyDate:string|null; checkInHistory:SponseeCheckIn[]; lastStepWork:{ date:string; title:string; stepNumber:number|null }|null; pendingReviews:number; lastMeeting:{ date:string; name:string }|null; completedSteps:number; totalSteps:number; latestNote:{ text:string; createdAt:string }|null; noteCount:number; activeTasks:number; overdueTasks:number }
export interface ActivityItem { id:string; event_type:string; title:string; description:string|null; is_read:boolean; created_at:string }
export type { SobrietyMilestone, Fellowship }

interface StepCompletion { step_number: number; fellowship_id: string | null }

export interface ProgramRowData {
  milestoneId: string
  fellowshipId: string | null
  fellowshipAbbr: string | null
  workbookName: string | null
  currentStep: number | null
  maxStep: number | null
  activeSponseesInFellowship: number
  sobrietyDate: string
}

export interface ProviderData {
  facility: FacilityData
  amenities: string[]
  insurance: string[]
  leads: Lead[]
  leadsThisMonth: number
  leadsLastMonth: number
}

interface Props {
  userId: string
  phone: string | null
  onboardingCompleted: boolean
  isProvider: boolean
  providerData: ProviderData | null
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
  todayQueueItems?: TodayItemData[]
  todayQueueOverflow?: number
  todayMemberCaughtUp?: boolean
  todaySummaryParts?: string[]
  dailyQuote?: DailyQuote | null
  sponseeAlertCount?: number
  programRows: ProgramRowData[]
  workingPrograms?: { fellowshipId: string; fellowshipAbbr: string }[]
}

const TODAY_QUEUE_ENABLED = process.env.NEXT_PUBLIC_TODAY_QUEUE_ENABLED === 'true'

const TABS: { id: Tab; label: string }[] = [
  ...(TODAY_QUEUE_ENABLED ? [{ id: 'today' as Tab, label: '⚓ Today' }] : []),
  { id: 'overview',  label: '🗂️ Overview' },
  { id: 'stepwork',  label: '📖 Step Work' },
  { id: 'journal',   label: '✏️ Journal' },
  { id: 'meetings',  label: '👥 Meetings' },
  { id: 'tasks',     label: '📋 Tasks' },
  { id: 'saved',     label: '❤️ Saved' },
]

export default function DashboardShell({ userId, phone, onboardingCompleted, isProvider, providerData, profile, stepCompletions, recentCheckIns, journalEntries, journalCount, stepWorkCount, meetingAttendance, meetingsThisWeek, meetingsTotal, readingAssignments, checkInsTotal, activeSponsors, sponsees, pendingRequests, sponsorPendingRequests, activityItems, initialMilestones, fellowships, todayQueueItems, todayQueueOverflow, todayMemberCaughtUp, todaySummaryParts, dailyQuote, sponseeAlertCount = 0, programRows, workingPrograms = [] }: Props) {
  const router = useRouter()
  // Provider-only users (no recovery onboarding) default to facility mode
  const defaultMode: Mode = (isProvider && !onboardingCompleted) ? 'facility' : 'my'
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [activeTab, setActiveTab] = useState<Tab>(TODAY_QUEUE_ENABLED ? 'today' : 'overview')
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [recoveryNudgeDismissed, setRecoveryNudgeDismissed] = useState(false)
  const { ref: modeScrollRef,  fadeLeft: modeFadeLeft,  fadeRight: modeFadeRight  } = useScrollFade()
  const { ref: tabsScrollRef,  fadeLeft: tabsFadeLeft,  fadeRight: tabsFadeRight  } = useScrollFade()

  const displayName = profile?.display_name ?? 'Friend'
  const isSponsor = profile?.is_available_sponsor ?? false

  // Check localStorage for dismissed recovery nudge
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRecoveryNudgeDismissed(localStorage.getItem('provider_recovery_nudge_dismissed') === 'true')
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'sponsees' && isSponsor) {
      setMode('sponsees')
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
  const completedStepNumbers = filteredCompletions.map(r => r.step_number)
  const completedStepSet = new Set(completedStepNumbers)
  const completedSteps = completedStepSet.size
  const allStepsDone = completedSteps >= 12
  // First-gap-found: handles out-of-order completions (e.g. 1,2,3,5 done → current = 4)
  const firstIncomplete = (() => {
    for (let i = 1; i <= 12; i++) {
      if (!completedStepSet.has(i)) return i
    }
    return 12
  })()
  const currentStep = allStepsDone ? 12 : firstIncomplete

  const modes: { id: Mode; label: string }[] = [
    // Only show My Recovery if user has completed onboarding (has recovery data)
    ...(onboardingCompleted ? [{ id: 'my' as Mode, label: '⚓ My Journey' }] : []),
    ...(isSponsor ? [{ id: 'sponsees' as Mode, label: '👥 My Sponsees' }] : []),
    ...(isProvider ? [{ id: 'facility' as Mode, label: '🏥 My Facility' }] : []),
  ]

  // Show recovery nudge for provider-only users who haven't onboarded
  const showRecoveryNudge = isProvider && !onboardingCompleted && !recoveryNudgeDismissed

  function dismissRecoveryNudge() {
    setRecoveryNudgeDismissed(true)
    localStorage.setItem('provider_recovery_nudge_dismissed', 'true')
  }

  return (
    <div style={{ padding: '0 24px 72px' }}>
      <div className="max-w-[940px] mx-auto">

        {/* Underline mode bar */}
        <div className="subnav-band relative" style={{ borderBottom: '2px solid #e8e4df' }}>
          {modeFadeLeft && (
            <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 40, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(to right, var(--warm-gray), transparent)' }} />
          )}
          {modeFadeRight && (
            <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 40, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(to left, var(--warm-gray), transparent)' }} />
          )}
          <div ref={modeScrollRef} className="flex items-center overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {modes.map(m => m.id === 'sponsees' ? (
              <SponseesTab
                key="sponsees"
                isActive={mode === 'sponsees'}
                alertCount={sponseeAlertCount}
                onClick={() => setMode('sponsees')}
              />
            ) : (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className="flex-shrink-0 font-semibold transition-colors"
                style={{
                  padding: '14px 20px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: 'none',
                  border: 'none',
                  borderBottom: mode === m.id ? '3px solid #2a9d8f' : '3px solid transparent',
                  marginBottom: '-2px',
                  color: mode === m.id ? '#1a2332' : '#6b7a8d',
                }}
              >
                {m.label}
              </button>
            ))}
            {/* Recovery nudge for provider-only users */}
            {showRecoveryNudge && (
              <div className="flex items-center flex-shrink-0 gap-2" style={{ marginLeft: modes.length > 1 ? '12px' : '0', padding: '8px 0' }}>
                <button
                  onClick={() => router.push('/dashboard?intent=onboard')}
                  className="flex-shrink-0 transition-colors"
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    background: 'none',
                    color: '#6b7a8d',
                    border: 'none',
                    fontWeight: 500,
                  }}
                >
                  ✨ Start your recovery journey →
                </button>
                <button
                  onClick={dismissRecoveryNudge}
                  aria-label="Dismiss recovery nudge"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '14px', color: '#6b7a8d', padding: '2px 6px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            )}
            {/* Check In — right-aligned action button, not a mode */}
            {onboardingCompleted && (
              <button
                onClick={() => setMode('checkin')}
                className="flex-shrink-0 font-semibold transition-colors"
                style={{
                  marginLeft: 'auto',
                  padding: '10px 18px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: mode === 'checkin' ? 'rgba(42, 157, 143, 0.1)' : 'rgba(42, 157, 143, 0.06)',
                  color: '#2a9d8f',
                  border: 'none',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                📍 Check In
              </button>
            )}
          </div>
        </div>

        {/* Secondary strip — Journey sub-nav (when My Journey active) */}
        {TODAY_QUEUE_ENABLED && mode === 'my' && (
          <JourneySubNav
            activeTab={activeTab as JourneyTab}
            onTabChange={tab => setActiveTab(tab)}
          />
        )}

        {/* Spacer below mode bar */}
        <div style={{ paddingTop: 24 }} />

        {/* ── My Recovery ── */}
        {mode === 'my' && (
          <>
            {/* Re-show onboarding if user has no display_name — otherwise the
                "Friend" fallback would stick forever (CLAUDE.md pitfall #3). */}
            {(!onboardingCompleted || !profile?.display_name) && <OnboardingCard userId={userId} />}
            <PendingRequests requests={pendingRequests} perspective="as_sponsee" />
            {/* Incoming sponsorship requests — shown to all users (not gated by
                is_available_sponsor) so people asked to sponsor can respond. */}
            <PendingRequests requests={sponsorPendingRequests} perspective="as_sponsor" />
            {TODAY_QUEUE_ENABLED ? (
              <Hero
                userId={userId}
                displayName={displayName}
                milestones={initialMilestones}
                fellowships={fellowships}
                currentStep={currentStep}
                completedStepNumbers={completedStepNumbers}
                dailyQuote={dailyQuote ?? null}
                onActiveFellowshipChange={handleActiveFellowshipChange}
                programRows={programRows}
                workingPrograms={workingPrograms}
              />
            ) : (
              <DashboardBanner
                userId={userId}
                displayName={displayName}
                initialMilestones={initialMilestones}
                fellowships={fellowships}
                onActiveFellowshipChange={handleActiveFellowshipChange}
                dailyQuote={dailyQuote}
              />
            )}

            {/* Tabs — legacy 7-tab row, shown only when new nav is off */}
            {!TODAY_QUEUE_ENABLED && (
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
            )}

            {activeTab === 'today' && TODAY_QUEUE_ENABLED && (
              <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]" style={{ gap: 16 }}>
                {/* Main column */}
                <div>
                  {todayQueueItems && (
                    <TodayCard
                      items={todayQueueItems}
                      overflowCount={todayQueueOverflow ?? 0}
                      caughtUp={todayMemberCaughtUp ?? false}
                      onCheckIn={() => setCheckInOpen(true)}
                      caughtUpSummaryParts={todaySummaryParts ?? []}
                    />
                  )}
                </div>
                {/* Right rail */}
                <RightRail
                  userId={userId}
                  displayName={displayName}
                  currentStep={currentStep}
                  completedSteps={completedSteps}
                  allStepsDone={allStepsDone}
                  journalCount={journalCount}
                  stepWorkCount={stepWorkCount}
                  meetingsThisWeek={meetingsThisWeek}
                  meetingsTotal={meetingsTotal}
                  activeSponsors={activeSponsors}
                  sponsees={sponsees}
                  isSponsor={isSponsor}
                  recentCheckIns={recentCheckIns}
                  today={new Date().toISOString().slice(0, 10)}
                />
              </div>
            )}
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

        {mode === 'checkin' && <MeetingCheckin userId={userId} />}
        {mode === 'sponsees' && isSponsor && <SponsorView sponsees={sponsees} pendingRequests={sponsorPendingRequests} displayName={displayName} userId={userId} />}
        {mode === 'facility' && isProvider && providerData && (
          <ProviderDashboardShell
            facility={providerData.facility}
            amenities={providerData.amenities}
            insurance={providerData.insurance}
            leads={providerData.leads}
            leadsThisMonth={providerData.leadsThisMonth}
            leadsLastMonth={providerData.leadsLastMonth}
          />
        )}
        {mode === 'facility' && isProvider && !providerData && (
          <div className="text-center py-12">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏥</div>
            <h3 className="font-bold text-navy" style={{ fontSize: 18, marginBottom: 8 }}>No facility linked yet</h3>
            <p className="text-mid" style={{ fontSize: 14, marginBottom: 16, maxWidth: 400, margin: '0 auto 16px' }}>
              Claim a facility listing to manage it from your dashboard.
            </p>
            <a
              href="/providers/claim"
              className="font-semibold text-white rounded-lg inline-block"
              style={{ fontSize: 14, padding: '10px 24px', background: 'var(--teal)', textDecoration: 'none' }}
            >
              Claim a Listing →
            </a>
          </div>
        )}
      </div>

      {checkInOpen && <CheckInModal userId={userId} onClose={() => setCheckInOpen(false)} hasActiveSponsor={activeSponsors.length > 0} />}
    </div>
  )
}
