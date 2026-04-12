'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { searchUserByEmail, sendSponsorRequest, requestSponsor } from '@/app/dashboard/actions'
import type { SearchResult } from '@/app/dashboard/actions'

interface Props {
  onClose: () => void
  mode?: 'add_sponsee' | 'find_sponsor'
  sponsorName?: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 8,
  fontSize: 14, fontFamily: 'var(--font-body)', background: '#fff', outline: 'none',
  boxSizing: 'border-box', color: 'var(--dark)',
}

export default function AddSponseeModal({ onClose, mode = 'add_sponsee', sponsorName }: Props) {
  const isFindSponsor = mode === 'find_sponsor'
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSearch() {
    if (!email.trim()) return
    setResult(null); setError(null); setSent(false)
    startTransition(async () => {
      try {
        const r = await searchUserByEmail(email.trim())
        setResult(r)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  function handleSend() {
    if (!result?.found) return
    setError(null)
    startTransition(async () => {
      try {
        if (isFindSponsor) {
          await requestSponsor(result.userId)
        } else {
          await sendSponsorRequest(result.userId)
        }
        setSent(true)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const notFoundReason = !result?.found ? result?.reason : null

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

        {/* ── Found ── */}
        {result?.found && !sent && (
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
                {!isFindSponsor
                  ? <InviteComposer email={email} sponsorName={sponsorName ?? 'Your sponsor'} />
                  : <CopyInviteLink email={email} mode={mode} />
                }
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InviteComposer({ email, sponsorName }: { email: string; sponsorName: string }) {
  const defaultSubject = `${sponsorName} invited you to SoberAnchor`
  const defaultBody = `Hey,

I'd like to sponsor you on SoberAnchor — a free app built to support your recovery journey. It lets us stay connected through daily check-ins, step work, and meeting tracking all in one place.

Click the button below to create your free account. Once you're set up, search for my email and we can connect.

Looking forward to walking this path with you.

– ${sponsorName}`

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
      const res = await fetch('/api/invite-sponsee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, subject: subject.trim(), body: body.trim(), sponsorName }),
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

function CopyInviteLink({ email, mode }: { email: string; mode: 'add_sponsee' | 'find_sponsor' }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/my-recovery`
    : 'https://soberanchor.com/my-recovery'

  function copy() {
    const text = mode === 'find_sponsor'
      ? `Hey, I'm looking for a sponsor on SoberAnchor. Create your free account here: ${url} — then search for my email to connect.`
      : `Hey, I'd like to sponsor you on SoberAnchor. Create your free account here: ${url} — then search for my email to connect.`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <button
      onClick={copy}
      style={{ width: '100%', background: '#fff', border: '1.5px solid var(--navy)', color: 'var(--navy)', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 0.15s' }}>
      {copied ? '✓ Copied to clipboard!' : '📋 Copy invite message'}
    </button>
  )
}
