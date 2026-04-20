'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SobrietyMilestonesSection from '@/components/dashboard/SobrietyMilestonesSection'

interface Props { userId: string; displayName: string | null; phone: string | null; journalCount: number; stepWorkCount: number; checkInsTotal: number; meetingsTotal: number; isAvailableSponsor: boolean; canSponsor: boolean }

export default function PrivacyTab({ userId, displayName, phone, journalCount, stepWorkCount, checkInsTotal, meetingsTotal, isAvailableSponsor, canSponsor }: Props) {
  const router = useRouter()
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(displayName ?? '')
  const [savingName, setSavingName] = useState(false)
  const [sponsorEnabled, setSponsorEnabled] = useState(isAvailableSponsor)
  const [savingSponsor, setSavingSponsor] = useState(false)

  async function toggleSponsor() {
    const next = !sponsorEnabled
    setSavingSponsor(true)
    const supabase = createClient()
    await supabase.from('user_profiles').update({ is_available_sponsor: next }).eq('id', userId)
    setSponsorEnabled(next)
    setSavingSponsor(false)
    router.refresh()
  }

  async function saveName() {
    if (!newName.trim()) return
    setSavingName(true)
    const supabase = createClient()
    await supabase.from('user_profiles').update({ display_name: newName.trim() }).eq('id', userId)
    setSavingName(false); setEditingName(false); router.refresh()
  }

  const maskedPhone = phone ? '•••••' + phone.slice(-4) : '—'

  return (
    <div style={{ maxWidth: '640px' }}>
      <div className="flex items-center gap-3 mb-5">
        <span style={{ fontSize: '28px' }}>🔒</span>
        <div>
          <h3 className="font-bold text-navy" style={{ fontSize: '18px', marginBottom: '2px' }}>Your Data, Your Rules</h3>
          <p className="text-mid" style={{ fontSize: '14px' }}>You control what lives on our servers and what doesn&apos;t.</p>
        </div>
      </div>

      <SobrietyMilestonesSection userId={userId} />

      {/* Account */}
      <div className="card-hover rounded-[16px] p-6 mb-4 bg-white border border-[var(--border)]">
        <h4 className="font-bold text-navy mb-3" style={{ fontSize: '14px' }}>Account</h4>
        <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--warm-gray)' }}>
          <div>
            <div className="font-medium text-dark" style={{ fontSize: '14px' }}>Display Name</div>
            {editingName ? (
              <div className="flex items-center gap-2 mt-2">
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} autoFocus className="rounded-lg text-dark outline-none"
                  style={{ border: '1.5px solid #2A8A99', padding: '6px 10px', fontSize: '14px', fontFamily: 'inherit' }}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }} />
                <button onClick={saveName} disabled={savingName} className="font-semibold text-white rounded-lg" style={{ fontSize: '12px', padding: '6px 12px', background: '#2A8A99', border: 'none', cursor: 'pointer', opacity: savingName ? 0.7 : 1 }}>{savingName ? '…' : 'Save'}</button>
                <button onClick={() => setEditingName(false)} className="rounded-lg" style={{ fontSize: '12px', padding: '6px 10px', background: 'var(--warm-gray)', border: '1.5px solid var(--border)', color: 'var(--mid)', cursor: 'pointer' }}>Cancel</button>
              </div>
            ) : (
              <div className="text-mid" style={{ fontSize: '13px', marginTop: '2px' }}>{displayName ?? 'Not set'} — visible to your sponsor only</div>
            )}
          </div>
          {!editingName && <button onClick={() => setEditingName(true)} className="font-semibold rounded-lg hover:bg-[var(--navy-10)] transition-colors flex-shrink-0" style={{ fontSize: '12px', padding: '6px 14px', background: 'none', border: '1.5px solid var(--navy)', color: 'var(--navy)', cursor: 'pointer' }}>Edit</button>}
        </div>
        <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--warm-gray)' }}>
          <div>
            <div className="font-medium text-dark" style={{ fontSize: '14px' }}>Phone</div>
            <div className="text-mid" style={{ fontSize: '13px', marginTop: '2px' }}>{maskedPhone}</div>
          </div>
          <span className="rounded-full font-semibold" style={{ fontSize: '11px', padding: '3px 10px', background: 'var(--teal-10)', border: '1px solid var(--teal-20)', color: 'var(--teal)' }}>Verified</span>
        </div>
        <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--warm-gray)' }}>
          <div>
            <div className="font-medium text-dark" style={{ fontSize: '14px' }}>Two-Factor Auth</div>
            <div className="text-mid" style={{ fontSize: '13px', marginTop: '2px' }}>Phone OTP — your phone is your second factor</div>
          </div>
          <span className="rounded-full font-semibold" style={{ fontSize: '11px', padding: '3px 10px', background: 'var(--teal-10)', border: '1px solid var(--teal-20)', color: 'var(--teal)' }}>🔐 Active</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <div style={{ flex: 1, paddingRight: '16px' }}>
            <div className="font-medium text-dark" style={{ fontSize: '14px' }}>Available as a sponsor</div>
            <div className="text-mid" style={{ fontSize: '13px', marginTop: '2px', lineHeight: 1.5 }}>
              {canSponsor
                ? 'Enable this when you\'re ready to sponsor others. This unlocks the Sponsor View tab on your dashboard.'
                : 'Your sponsor can mark you ready, or it unlocks automatically when you complete your steps.'}
            </div>
          </div>
          <button
            onClick={canSponsor ? toggleSponsor : undefined}
            disabled={savingSponsor || !canSponsor}
            style={{
              flexShrink: 0,
              width: '44px', height: '24px', borderRadius: '12px', border: 'none',
              cursor: !canSponsor ? 'not-allowed' : savingSponsor ? 'wait' : 'pointer',
              background: sponsorEnabled ? '#2A8A99' : '#D1CCC7',
              position: 'relative', transition: 'background 0.2s',
              opacity: savingSponsor || !canSponsor ? 0.45 : 1,
            }}
            aria-label={sponsorEnabled ? 'Disable sponsor mode' : 'Enable sponsor mode'}
          >
            <span style={{
              position: 'absolute', top: '3px',
              left: sponsorEnabled ? '23px' : '3px',
              width: '18px', height: '18px', borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
      </div>

      {/* What's stored */}
      <div className="card-hover rounded-[16px] p-6 mb-4 bg-white border border-[var(--border)]">
        <h4 className="font-bold text-navy mb-3" style={{ fontSize: '14px' }}>What&apos;s on our servers</h4>
        <DataRow label="Step progress (Steps 1–12)" sub="Which steps are complete — no written content" badge="Always synced" />
        <DataRow label="Journal entries" sub={`${journalCount} ${journalCount === 1 ? 'entry' : 'entries'}`}
          actions={<><OutlineBtn label="🖨️ Print" /><DangerBtn label="Delete" onClick={() => { if (window.confirm('Delete all journal entries? Recommend exporting first. Cannot be undone.')) alert('API coming soon.') }} /></>} />
        <DataRow label="Step work entries" sub={`${stepWorkCount} ${stepWorkCount === 1 ? 'entry' : 'entries'}`}
          actions={<><OutlineBtn label="🖨️ Print" /><DangerBtn label="Delete" onClick={() => { if (window.confirm('Delete all step work? Cannot be undone.')) alert('API coming soon.') }} /></>} />
        <DataRow label="Check-ins & meeting log" sub={`${checkInsTotal} check-ins · ${meetingsTotal} meetings`}
          actions={<><OutlineBtn label="📥 Export" /><DangerBtn label="Delete" onClick={() => { if (window.confirm('Delete all check-ins and meeting logs? Cannot be undone.')) alert('API coming soon.') }} /></>} />
      </div>

      {/* Export */}
      <div className="rounded-[16px] p-5 mb-4 flex items-center gap-4 bg-white" style={{ border: '1.5px solid #2A8A99' }}>
        <span style={{ fontSize: '28px', flexShrink: 0 }}>📥</span>
        <div className="flex-1">
          <div className="font-semibold text-navy" style={{ fontSize: '15px', marginBottom: '4px' }}>Export Everything</div>
          <div className="text-mid" style={{ fontSize: '13px', lineHeight: 1.55 }}>Download a complete PDF of all your step work, journals, check-ins, and meeting history.</div>
        </div>
        <button className="font-semibold text-white rounded-xl flex-shrink-0" style={{ fontSize: '13px', padding: '10px 18px', background: '#2A8A99', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Export Full PDF</button>
      </div>

      {/* Nuclear */}
      <div className="rounded-[16px] p-5 mb-5 flex items-center gap-4 bg-white" style={{ border: '1.5px solid #C0392B' }}>
        <span style={{ fontSize: '28px', flexShrink: 0 }}>⚠️</span>
        <div className="flex-1">
          <div className="font-semibold" style={{ fontSize: '15px', color: '#C0392B', marginBottom: '4px' }}>Delete All My Data</div>
          <div className="text-mid" style={{ fontSize: '13px', lineHeight: 1.55 }}>Permanently erase everything — account, journals, step work, check-ins, meeting log. This cannot be undone.</div>
        </div>
        <button style={{ fontSize: '13px', padding: '10px 18px', borderRadius: '12px', background: 'none', border: '1.5px solid #C0392B', color: '#C0392B', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          onClick={() => { if (window.confirm('This will permanently delete your entire account and all data. Are you absolutely sure?')) alert('API coming soon.') }}>
          Delete Everything
        </button>
      </div>

      <div className="rounded-xl px-5 py-4" style={{ background: 'var(--warm-gray)', border: '1px solid var(--border)' }}>
        <div className="text-mid" style={{ fontSize: '13px', lineHeight: 1.65 }}>
          <strong className="text-dark">Our promise:</strong> We never sell your data. We don&apos;t run ads. Your sponsor only sees entries you explicitly share. All written content can be deleted at any time — no retention period, no backups kept.
        </div>
      </div>
    </div>
  )
}

function DataRow({ label, sub, badge, actions }: { label: string; sub: string; badge?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderTop: '1px solid var(--warm-gray)' }}>
      <div>
        <div className="font-medium text-dark" style={{ fontSize: '14px' }}>{label}</div>
        <div className="text-mid" style={{ fontSize: '13px', marginTop: '2px' }}>{sub}</div>
      </div>
      {badge ? (
        <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'var(--warm-gray)', border: '1px solid var(--border)', color: 'var(--mid)', whiteSpace: 'nowrap' }}>{badge}</span>
      ) : (
        <div className="flex gap-1.5 flex-shrink-0 ml-3">{actions}</div>
      )}
    </div>
  )
}

function OutlineBtn({ label }: { label: string }) {
  return <button className="rounded-lg hover:bg-[var(--navy-10)] transition-colors" style={{ fontSize: '11px', padding: '5px 12px', background: 'none', border: '1.5px solid var(--navy)', color: 'var(--navy)', fontWeight: 600, cursor: 'pointer' }}>{label}</button>
}

function DangerBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '8px', background: 'none', border: '1.5px solid #C0392B', color: '#C0392B', fontWeight: 600, cursor: 'pointer' }}>{label}</button>
}
