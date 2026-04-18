'use client'

import { useState, useTransition, useRef, useEffect, Component } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SearchResult, ExistingRelationship } from '@/app/dashboard/sponsor-search-types'

interface FellowshipOption { id: string; abbreviation: string; name: string }

// ─── Error boundary — catches render/action errors so the whole modal doesn't crash ──

class ModalErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#FEE', border: '1px solid #F5C6CB', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#721C24' }}>
          <strong>Something went wrong.</strong> Please close this window and try again.
          {process.env.NODE_ENV === 'development' && (
            <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 11, opacity: 0.8 }}>
              {this.state.error.message}
            </div>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

interface Props {
  onClose: () => void
  mode?: 'add_sponsee' | 'find_sponsor'
  sponsorName?: string
  userId: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 8,
  fontSize: 14, fontFamily: 'var(--font-body)', background: '#fff', outline: 'none',
  boxSizing: 'border-box', color: 'var(--dark)',
}

export default function AddSponseeModal({ onClose, mode = 'add_sponsee', sponsorName, userId }: Props) {
  const router = useRouter()
  const isFindSponsor = mode === 'find_sponsor'
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fellowships, setFellowships] = useState<FellowshipOption[]>([])
  const [selectedFellowshipId, setSelectedFellowshipId] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    // Fetch user's fellowship options from sobriety_milestones
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('sobriety_milestones')
        .select('fellowship_id, fellowships(id, abbreviation, name)')
        .eq('user_id', userId)
        .not('fellowship_id', 'is', null)
      if (data) {
        const seen = new Set<string>()
        const opts: FellowshipOption[] = []
        for (const row of data) {
          const f = row.fellowships as unknown as { id: string; abbreviation: string; name: string } | null
          if (f && !seen.has(f.id)) {
            seen.add(f.id)
            opts.push(f)
          }
        }
        setFellowships(opts)
        if (opts.length === 1) setSelectedFellowshipId(opts[0].id)
      }
    })()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, userId])

  function handleSearch() {
    if (!email.trim()) return
    setResult(null); setError(null); setSent(false)
    startTransition(async () => {
      try {
        const res = await fetch('/api/dashboard/search-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? `Search failed (${res.status})`)
        setResult(data as SearchResult)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  function handleSend() {
    if (!result?.found) return
    setError(null)
    const fid = selectedFellowshipId || null
    startTransition(async () => {
      try {
        const url = isFindSponsor
          ? '/api/dashboard/request-sponsor'
          : '/api/dashboard/send-sponsor-request'
        const payload = isFindSponsor
          ? { sponsorUserId: result.userId, fellowshipId: fid }
          : { sponseeUserId: result.userId, fellowshipId: fid }
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
        setSent(true)
        router.refresh()
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const notFoundReason = !result?.found ? result?.reason : null

  // Derive blocking message for the selected fellowship using existingRelationships
  const relationshipBlock: { title: string; body: string } | null = (() => {
    if (!result?.found) return null
    const rels: ExistingRelationship[] = result.existingRelationships
    const fid = selectedFellowshipId || null

    // Check relationships scoped to the selected fellowship (or null-fellowship)
    const relevant = rels.filter(r => r.fellowshipId === fid)

    for (const r of relevant) {
      if (isFindSponsor) {
        // Looking for a sponsor: block if they are already your sponsor in this fellowship
        if (r.direction === 'they_are_sponsor' && r.status === 'active') {
          return {
            title: `This person is already your ${r.fellowshipAbbr ? r.fellowshipAbbr + ' ' : ''}sponsor.`,
            body: 'You already have an active sponsor relationship with this person in this program.',
          }
        }
        // Block circular: you already sponsor them in this fellowship
        if (r.direction === 'you_are_sponsor' && r.status === 'active') {
          return {
            title: 'You are currently sponsoring this person in this program.',
            body: 'A circular sponsorship in the same fellowship is not allowed.',
          }
        }
        if (r.direction === 'they_are_sponsor' && r.status === 'pending') {
          return {
            title: 'Request already sent.',
            body: 'A pending sponsor request to this person already exists for this program.',
          }
        }
        if (r.direction === 'you_are_sponsor' && r.status === 'pending') {
          return {
            title: 'This person already sent you a request.',
            body: 'Check your dashboard — you have a pending request from this person waiting for your response.',
          }
        }
      } else {
        // Adding a sponsee: block if you already sponsor them in this fellowship
        if (r.direction === 'you_are_sponsor' && r.status === 'active') {
          return {
            title: `You are already sponsoring this person${r.fellowshipAbbr ? ' in ' + r.fellowshipAbbr : ''}.`,
            body: 'You already have an active sponsorship with this person in this program.',
          }
        }
        // Block circular: they are already your sponsor in this fellowship
        if (r.direction === 'they_are_sponsor' && r.status === 'active') {
          return {
            title: 'This person is currently your sponsor in this program.',
            body: 'A circular sponsorship in the same fellowship is not allowed.',
          }
        }
        if (r.direction === 'you_are_sponsor' && r.status === 'pending') {
          return {
            title: 'Request already sent.',
            body: 'A pending sponsorship request to this person already exists for this program.',
          }
        }
        if (r.direction === 'they_are_sponsor' && r.status === 'pending') {
          return {
            title: 'This person already sent you a request.',
            body: 'Check your dashboard — you have a pending request from this person waiting for your response.',
          }
        }
      }
    }
    return null
  })()

  const canSendRequest = result?.found && !sent && !relationshipBlock

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460, padding: '36px 32px', boxShadow: '0 24px 64px rgba(0,51,102,0.18)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>{isFindSponsor ? 'My Recovery' : 'My Sponsees'}</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.5px', marginBottom: 6 }}>{isFindSponsor ? 'Find a Sponsor' : 'Add a Sponsee'}</h2>
        <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.6, marginBottom: 24 }}>
          {isFindSponsor
            ? "Search by their SoberAnchor account email. They'll receive a request to accept as your sponsor."
            : "Search by their SoberAnchor account email. They'll receive a request to accept."}
        </p>

        {/* Search row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setResult(null); setSent(false); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="their@email.com"
            style={{ ...inputStyle, flex: 1 }}
            onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          <button
            onClick={handleSearch}
            disabled={isPending || !email.trim()}
            style={{ background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: isPending || !email.trim() ? 'not-allowed' : 'pointer', opacity: isPending || !email.trim() ? 0.6 : 1, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
            {isPending && !result ? 'Searching…' : 'Search'}
          </button>
        </div>

        {error && (
          <div style={{ background: '#FEE', border: '1px solid #F5C6CB', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#721C24', marginBottom: 14 }}>
            {error}
          </div>
        )}

        {/* ── Wrap dynamic result area in error boundary ── */}
        <ModalErrorBoundary>

          {/* ── Found + relationship block ── */}
          {result?.found && !sent && relationshipBlock && (
            <div style={{ background: 'rgba(255,193,7,0.08)', border: '1.5px solid rgba(255,193,7,0.4)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#2A8A99,#003366)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                  {(result.displayName ?? result.email)[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15 }}>
                    {result.displayName ?? 'SoberAnchor Member'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{result.email}</div>
                </div>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 14, marginBottom: 4 }}>
                {relationshipBlock.title}
              </div>
              <p style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.6, margin: 0 }}>
                {relationshipBlock.body}
              </p>
              {fellowships.length > 1 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 6 }}>Try a different program:</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => setSelectedFellowshipId('')} style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', background: selectedFellowshipId === '' ? 'var(--navy)' : '#fff', color: selectedFellowshipId === '' ? '#fff' : 'var(--mid)', borderColor: selectedFellowshipId === '' ? 'var(--navy)' : 'var(--border)' }}>General</button>
                    {fellowships.map(f => (
                      <button key={f.id} type="button" onClick={() => setSelectedFellowshipId(f.id)} style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', background: selectedFellowshipId === f.id ? 'var(--teal)' : '#fff', color: selectedFellowshipId === f.id ? '#fff' : 'var(--mid)', borderColor: selectedFellowshipId === f.id ? 'var(--teal)' : 'var(--border)' }}>{f.abbreviation}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Found + can send ── */}
          {canSendRequest && (
            <div style={{ background: 'rgba(42,138,153,0.06)', border: '1.5px solid rgba(42,138,153,0.2)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#2A8A99,#003366)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                  {(result.displayName ?? result.email)[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15 }}>
                    {result.displayName ?? 'SoberAnchor Member'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{result.email}</div>
                </div>
              </div>

              {/* Fellowship selector */}
              {fellowships.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 6 }}>
                    Which program is this {isFindSponsor ? 'sponsor' : 'sponsorship'} for?
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedFellowshipId('')}
                      style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', background: selectedFellowshipId === '' ? 'var(--navy)' : '#fff', color: selectedFellowshipId === '' ? '#fff' : 'var(--mid)', borderColor: selectedFellowshipId === '' ? 'var(--navy)' : 'var(--border)' }}
                    >
                      General
                    </button>
                    {fellowships.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFellowshipId(f.id)}
                        style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', background: selectedFellowshipId === f.id ? 'var(--teal)' : '#fff', color: selectedFellowshipId === f.id ? '#fff' : 'var(--mid)', borderColor: selectedFellowshipId === f.id ? 'var(--teal)' : 'var(--border)' }}
                      >
                        {f.abbreviation}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.6, marginBottom: 14 }}>
                They&apos;ll see your request on their dashboard and can accept or decline.
              </p>
              <button
                onClick={handleSend}
                disabled={isPending}
                style={{ width: '100%', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1, fontFamily: 'var(--font-body)' }}>
                {isPending ? 'Sending…' : isFindSponsor ? 'Send Sponsor Request →' : 'Send Sponsorship Request →'}
              </button>
            </div>
          )}

          {/* ── Request sent ── */}
          {sent && (
            <div style={{ background: 'rgba(39,174,96,0.07)', border: '1.5px solid rgba(39,174,96,0.25)', borderRadius: 14, padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
              <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 16, marginBottom: 6 }}>Request sent!</div>
              <div style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.6, marginBottom: 18 }}>
                {result?.found && (result.displayName ?? 'They')} will see your request on their dashboard.
              </div>
              <button onClick={onClose} style={{ background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Done
              </button>
            </div>
          )}

          {/* ── Not found ── */}
          {result && !result.found && (
            <div style={{ background: 'var(--warm-gray)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px' }}>
              <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 14, marginBottom: 6 }}>
                {notFoundReason === 'self'
                  ? 'That\'s your own email.'
                  : notFoundReason === 'no_profile'
                  ? 'That account doesn\'t have a member profile yet.'
                  : `No SoberAnchor account found for "${email}".`}
              </div>
              {notFoundReason !== 'self' && (
                <>
                  <p style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.6, marginBottom: 14 }}>
                    They may not have signed up yet. Send them a personal invite email and they can create a free account.
                  </p>
                  <InviteComposer
                    email={email}
                    senderName={sponsorName ?? (isFindSponsor ? 'A fellow member' : 'Your sponsor')}
                    direction={isFindSponsor ? 'invite_sponsor' : 'invite_sponsee'}
                  />
                </>
              )}
            </div>
          )}

        </ModalErrorBoundary>
      </div>
    </div>
  )
}

type InviteDirection = 'invite_sponsee' | 'invite_sponsor'

function InviteComposer({ email, senderName, direction }: { email: string; senderName: string; direction: InviteDirection }) {
  const isInvitingSponsor = direction === 'invite_sponsor'

  const defaultSubject = isInvitingSponsor
    ? `${senderName} asked you to be their sponsor on SoberAnchor`
    : `${senderName} invited you to SoberAnchor`

  const defaultBody = isInvitingSponsor
    ? `Hey,

I'd like you to be my sponsor through SoberAnchor. It keeps us connected with daily check-ins, step work, and meeting tracking — all in one place. Sponsors get a free 30-day trial.

Click below to create your account. You'll see my request waiting when you sign in — no searching, just tap Accept.

Thanks for considering it. It would mean a lot.

– ${senderName}`
    : `Hey,

I'd like to sponsor you through SoberAnchor. We can stay connected there through daily check-ins, step work, and meeting tracking — all in one place. Sponsees always use it free.

Click below to create your account. You'll see my invite waiting when you sign in.

Looking forward to walking this path with you.

– ${senderName}`

  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [preview, setPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return
    setSending(true)
    setInviteError(null)
    try {
      const endpoint = isInvitingSponsor ? '/api/invite-sponsor' : '/api/invite-sponsee'
      const nameField = isInvitingSponsor ? { senderName } : { sponsorName: senderName }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, subject: subject.trim(), body: body.trim(), ...nameField }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send invite.')
      setInviteSent(true)
    } catch (e: any) {
      setInviteError(e.message)
    } finally {
      setSending(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(body).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  if (inviteSent) {
    return (
      <div style={{ background: 'rgba(39,174,96,0.09)', border: '1.5px solid rgba(39,174,96,0.3)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✉️</div>
        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15, marginBottom: 6 }}>Invite sent!</div>
        <div style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.6 }}>
          We&apos;ll notify you when they create their account.
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Email invite</div>
        <button
          onClick={() => setPreview(p => !p)}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: 'var(--mid)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {preview ? (
        /* ── Email Preview ── */
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ background: 'linear-gradient(135deg,#002244 0%,#003366 60%,#1a4a5e 100%)', padding: '20px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 4 }}>⚓</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700 }}>SoberAnchor</div>
          </div>
          <div style={{ background: '#fff', padding: '20px 24px' }}>
            <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 4 }}>
              <strong>To:</strong> {email}
            </div>
            <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 16 }}>
              <strong>Subject:</strong> {subject || '(no subject)'}
            </div>
            <div style={{ fontSize: 13, color: '#333', lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: 16 }}>
              {body}
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'inline-block', background: '#2A8A99', color: '#fff', padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                Create Your Free Account →
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ── Composer Fields ── */
        <div style={{ marginBottom: 14 }}>
          {/* To */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 4 }}>To</label>
            <div style={{ padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, color: 'var(--mid)', background: '#f9f9f9', fontFamily: 'var(--font-body)' }}>
              {email}
            </div>
          </div>
          {/* Subject */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 4 }}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-body)', background: '#fff', outline: 'none', boxSizing: 'border-box', color: 'var(--dark)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          {/* Body */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 4 }}>Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', background: '#fff', outline: 'none', boxSizing: 'border-box', color: 'var(--dark)', resize: 'vertical', lineHeight: 1.65 }}
              onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>
      )}

      {inviteError && (
        <div style={{ background: '#FEE', border: '1px solid #F5C6CB', borderRadius: 8, padding: '9px 13px', fontSize: 13, color: '#721C24', marginBottom: 10 }}>
          {inviteError}
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={sending || !subject.trim() || !body.trim()}
        style={{ width: '100%', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: sending || !subject.trim() || !body.trim() ? 'not-allowed' : 'pointer', opacity: sending || !subject.trim() || !body.trim() ? 0.7 : 1, fontFamily: 'var(--font-body)', marginBottom: 10 }}>
        {sending ? 'Sending…' : 'Send Invite →'}
      </button>

      {/* Secondary: copy */}
      <button
        onClick={handleCopy}
        style={{ width: '100%', background: '#fff', border: '1.5px solid var(--border)', color: 'var(--mid)', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
        {copied ? '✓ Copied to clipboard!' : '📋 Copy message instead'}
      </button>
    </div>
  )
}

