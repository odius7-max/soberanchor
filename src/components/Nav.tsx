'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, isProvider, loading, openAuthModal, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const displayName = profile?.display_name
  // Build initials: up to 2 chars from display name words, fallback to email initial
  const initials = displayName
    ? displayName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : user?.email?.[0]?.toUpperCase() ?? '?'

  async function handleSignOut() {
    setDropdownOpen(false)
    await signOut()
    router.push('/')
    router.refresh()
  }

  // Core nav links — Our Story only shown when logged out
  const coreLinks = [
    { href: '/find', label: 'Find' },
    { href: '/find/meetings', label: 'Meetings' },
    { href: '/resources', label: 'Resources' },
  ]

  const isActive = (href: string) =>
    href === '/find'
      ? pathname === '/find'
      : pathname.startsWith(href)

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-[var(--border)]">
      <div className="max-w-[1120px] mx-auto px-6 flex items-center justify-between h-[64px]">

        {/* ── Logo ── */}
        <Link
          href="/"
          className="flex items-center flex-shrink-0"
          aria-label="SoberAnchor home"
        >
          <Image
            src="/logo-nav.png"
            alt="SoberAnchor"
            width={235}
            height={32}
            style={{ height: 32, width: 'auto' }}
            priority
          />
        </Link>

        {/* ── Desktop nav ── */}
        <div className="hidden md:flex items-center gap-0.5">
          {coreLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
                isActive(l.href)
                  ? 'text-teal bg-[var(--teal-10)]'
                  : 'text-dark hover:bg-warm-gray'
              }`}
            >
              {l.label}
            </Link>
          ))}

          {/* Our Story — logged-out only */}
          {!loading && !user && (
            <Link
              href="/our-story"
              className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
                pathname === '/our-story'
                  ? 'text-teal bg-[var(--teal-10)]'
                  : 'text-dark hover:bg-warm-gray'
              }`}
            >
              Our Story
            </Link>
          )}

          {/* Separator */}
          <span className="w-px h-5 bg-[var(--border)] mx-2" />

          {/* For Providers — muted */}
          <Link
            href="/for-providers"
            className={`text-[13px] px-3 py-1.5 rounded-lg transition-colors ${
              pathname === '/for-providers'
                ? 'text-teal font-semibold'
                : 'text-mid hover:text-dark'
            }`}
          >
            For Providers
          </Link>
        </div>

        {/* ── Desktop right side ── */}
        <div className="hidden md:flex items-center gap-2">
          {!loading && (
            user ? (
              /* Logged-in: unified pill */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  aria-label="My account"
                  aria-expanded={dropdownOpen}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 0,
                    background: 'rgba(0,51,102,0.07)',
                    border: '1px solid rgba(0,51,102,0.12)',
                    borderRadius: 999, padding: '5px 5px 5px 14px',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,51,102,0.11)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,51,102,0.07)')}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginRight: 10, whiteSpace: 'nowrap' }}>
                    My Recovery
                  </span>
                  {/* Initials avatar */}
                  <span
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2A8A99, #003366)',
                      color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.3px',
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </span>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden"
                    style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,51,102,0.1)', minWidth: 210, zIndex: 60 }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="font-semibold text-navy text-[14px]">{displayName ?? 'My Account'}</div>
                      {isProvider && (
                        <div className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--teal)' }}>Provider + Member</div>
                      )}
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center justify-between px-4 py-3 text-[14px] text-dark hover:bg-warm-gray transition-colors"
                    >
                      My Recovery
                      {pathname.startsWith('/dashboard') && <span className="text-[10px] font-bold text-teal">●</span>}
                    </Link>
                    {isProvider && (
                      <Link
                        href="/providers/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center justify-between px-4 py-3 text-[14px] text-dark hover:bg-warm-gray transition-colors"
                        style={{ borderTop: '1px solid var(--border)' }}
                      >
                        Provider Dashboard
                        {pathname.startsWith('/providers') && <span className="text-[10px] font-bold text-teal">●</span>}
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-3 text-[14px] text-mid hover:bg-warm-gray transition-colors"
                      style={{ background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Logged-out: Sign in text + Get Started pill */
              <>
                <button
                  onClick={openAuthModal}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--mid)', padding: '8px 4px', fontFamily: 'var(--font-body)' }}
                >
                  Sign in
                </button>
                <button
                  onClick={openAuthModal}
                  style={{
                    background: 'var(--navy)', color: '#fff', border: 'none',
                    borderRadius: 999, padding: '9px 20px',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Get Started
                </button>
              </>
            )
          )}
        </div>

        {/* ── Mobile toggle ── */}
        <button
          className="md:hidden text-2xl text-navy"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1 }}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-[var(--border)] px-6 pb-5">
          {coreLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={`block py-3.5 text-[15px] font-medium border-b border-[var(--border)] ${
                isActive(l.href) ? 'text-teal' : 'text-dark'
              }`}
            >
              {l.label}
            </Link>
          ))}

          {!loading && !user && (
            <Link
              href="/our-story"
              onClick={() => setMobileOpen(false)}
              className={`block py-3.5 text-[15px] font-medium border-b border-[var(--border)] ${
                pathname === '/our-story' ? 'text-teal' : 'text-dark'
              }`}
            >
              Our Story
            </Link>
          )}

          <Link
            href="/for-providers"
            onClick={() => setMobileOpen(false)}
            className={`block py-3.5 text-[15px] font-medium border-b border-[var(--border)] ${
              pathname === '/for-providers' ? 'text-teal' : 'text-mid'
            }`}
          >
            For Providers
          </Link>

          {!loading && (
            user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block py-3.5 text-[15px] font-semibold border-b border-[var(--border)]"
                  style={{ color: 'var(--navy)' }}
                >
                  ⚓ My Recovery
                </Link>
                {isProvider && (
                  <Link
                    href="/providers/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="block py-3.5 text-[15px] font-medium border-b border-[var(--border)]"
                    style={{ color: 'var(--navy)' }}
                  >
                    Provider Dashboard
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="block py-3.5 text-[15px] text-mid w-full text-left"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => { setMobileOpen(false); openAuthModal() }}
                  style={{ flex: 1, background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, color: 'var(--mid)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  Sign in
                </button>
                <button
                  onClick={() => { setMobileOpen(false); openAuthModal() }}
                  style={{ flex: 1, background: 'var(--navy)', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  Get Started
                </button>
              </div>
            )
          )}
        </div>
      )}
    </nav>
  )
}
