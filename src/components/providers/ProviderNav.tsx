'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  facilityName: string | null
  initials: string
}

export default function ProviderNav({ facilityName, initials }: Props) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav style={{ background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <svg width="26" height="26" viewBox="0 0 64 64" fill="none">
              <path d="M32 8a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" stroke="var(--navy)" strokeWidth="2.5"/>
              <path d="M32 20v32" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M20 44c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M24 36h16" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--navy)' }}>SoberAnchor</span>
          </Link>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', background: 'rgba(42,138,153,0.09)', border: '1px solid rgba(42,138,153,0.2)', borderRadius: 20, padding: '3px 10px', letterSpacing: '0.5px' }}>Provider Portal</span>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {facilityName && (
            <span style={{ fontSize: 13, color: 'var(--mid)', display: 'none' }} className="sm:block">{facilityName}</span>
          )}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(v => !v)}
              style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), var(--navy))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              {initials}
            </button>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                <div style={{ position: 'absolute', right: 0, top: '46px', background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 0', minWidth: 180, zIndex: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                  {facilityName && (
                    <div style={{ padding: '8px 16px 8px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                      <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 1 }}>Signed in as</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{facilityName}</div>
                    </div>
                  )}
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                    style={{ display: 'block', padding: '9px 16px', fontSize: 14, color: 'var(--dark)', textDecoration: 'none' }}>
                    Dashboard
                  </Link>
                  <button onClick={() => { setMenuOpen(false); signOut() }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 14, color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
