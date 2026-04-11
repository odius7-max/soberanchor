'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Fellowship { id: string; name: string; abbreviation: string | null }

interface Props {
  userId: string
  initialDisplayName: string | null
  initialBio: string | null
  initialFellowshipId: string | null
  fellowships: Fellowship[]
}

export default function ProfileForm({ userId, initialDisplayName, initialBio, initialFellowshipId, fellowships }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState(initialDisplayName ?? '')
  const [bio, setBio] = useState(initialBio ?? '')
  const [fellowshipId, setFellowshipId] = useState(initialFellowshipId ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    if (!displayName.trim()) return
    setSaving(true)
    setSaved(false)
    await supabase.from('user_profiles').update({
      display_name: displayName.trim(),
      bio: bio.trim() || null,
      primary_fellowship_id: fellowshipId || null,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)
    setSaving(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2500)
  }

  const initials = displayName
    ? displayName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : '?'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Avatar preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#2A8A99,#003366)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{displayName || 'Your Name'}</div>
          <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>Avatar is generated from your initials</div>
        </div>
      </div>

      {/* Display name */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--mid)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Display Name <span style={{ color: '#C0392B' }}>*</span>
        </label>
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="How you appear to your sponsor"
          style={{ width: '100%', fontSize: 14, padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fff', fontFamily: 'var(--font-body)', color: 'var(--dark)', boxSizing: 'border-box' as const }}
        />
        <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 5 }}>Visible only to your sponsor and people you connect with — not public.</div>
      </div>

      {/* Primary fellowship */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--mid)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Primary Fellowship
        </label>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <select
            value={fellowshipId}
            onChange={e => setFellowshipId(e.target.value)}
            style={{ width: '100%', fontSize: 14, fontWeight: 500, color: fellowshipId ? 'var(--navy)' : 'var(--mid)', padding: '10px 36px 10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fff', appearance: 'none', fontFamily: 'var(--font-body)', cursor: 'pointer' }}
          >
            <option value="">— Not set —</option>
            {fellowships.map(f => (
              <option key={f.id} value={f.id}>{f.abbreviation ? `${f.abbreviation} — ${f.name}` : f.name}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 12, color: 'var(--mid)' }}>▾</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 5 }}>Determines which step work program is shown on your dashboard.</div>
      </div>

      {/* Bio */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--mid)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Bio <span style={{ fontSize: 11, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
        </label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="A little about your recovery journey — shared only with your sponsor"
          rows={4}
          maxLength={500}
          style={{ width: '100%', fontSize: 14, padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fff', fontFamily: 'var(--font-body)', color: 'var(--dark)', resize: 'vertical', boxSizing: 'border-box' as const }}
        />
        <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 4, textAlign: 'right' }}>{bio.length}/500</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={save}
          disabled={saving || !displayName.trim()}
          style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: saving ? 'var(--mid)' : 'var(--navy)', border: 'none', borderRadius: 10, padding: '11px 28px', cursor: saving || !displayName.trim() ? 'default' : 'pointer', opacity: !displayName.trim() ? 0.5 : 1, transition: 'background 0.2s' }}
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
        {saved && <span style={{ fontSize: 13, color: '#27AE60', fontWeight: 600 }}>✓ Saved</span>}
      </div>
    </div>
  )
}
