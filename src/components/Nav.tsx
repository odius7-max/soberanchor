'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import GlobalSearch, { type SearchContext } from '@/components/GlobalSearch'

function getSearchContext(pathname: string): SearchContext {
  if (pathname.startsWith('/resources')) return 'resources'
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/my-recovery')) return 'member'
  if (pathname.startsWith('/find')) return 'directory'
  return 'home'
}

export default function Nav() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { user, profile, loading, openAuthModal, signOut } = useAuth()
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchOpen,   setSearchOpen]   = useState(false)
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

  // Global Cmd+K / Ctrl+K opens search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setMobileOpen(false)
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Custom event fired by any page component that wants to open the AI search
  useEffect(() => {
    function onOpenSearch() { setMobileOpen(false); setSearchOpen(true) }
    document.addEventListener('soberanchor:open-search', onOpenSearch)
    return () => document.removeEventListener('soberanchor:open-search', onOpenSearch)
  }, [])

  const displayName = profile?.display_name

  async function handleSignOut() {
    setDropdownOpen(false)
    await signOut()
    router.push('/')
    router.refresh()
  }

  const coreLinks = [
    { href: '/find',          label: 'Find Help'  },
    { href: '/find/meetings', label: 'Meetings'   },
    { href: '/resources',     label: 'Resources'  },
  ]

  const isActive = (href: string) =>
    href === '/find' ? pathname === '/find' : pathname.startsWith(href)

  const linkCls = (href: string) =>
    `px-3.5 py-2 rounded-lg text-[13.5px] font-medium transition-colors whitespace-nowrap ${
      isActive(href) ? 'text-teal bg-[var(--teal-10)]' : 'text-dark hover:bg-warm-gray'
    }`

  // ── Magnifying-glass icon ──────────────────────────────────────────────────
  const SearchIcon = (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="8.5" cy="8.5" r="5.75" stroke="#888" strokeWidth="1.75"/>
      <path d="M13 13L17.5 17.5" stroke="#888" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )

  return (
    <nav className="sticky top-0 z-50 bg-white">

      {/* ── Row 1: logo · nav links · auth ── */}
      <div className="border-b border-[var(--border)]">
        <div className="max-w-[1120px] mx-auto px-6 flex items-center justify-between h-[60px]">

          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0 mr-4" aria-label="SoberAnchor home">
            <Image
              src="/logo-nav.png"
              alt="SoberAnchor"
              width={235}
              height={32}
              style={{ height: 30, width: 'auto' }}
              priority
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {coreLinks.map(l => (
              <Link key={l.href} href={l.href} className={linkCls(l.href)}>
                {l.label}
              </Link>
            ))}

            {/* Our Story — shown to all users */}
            <Link
              href="/our-story"
              className={`px-3.5 py-2 rounded-lg text-[13.5px] font-medium transition-colors whitespace-nowrap ${
                pathname === '/our-story' ? 'text-teal bg-[var(--teal-10)]' : 'text-dark hover:bg-warm-gray'
              }`}
            >
              Our Story
            </Link>
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {!loading && (
              user ? (
                /* Logged-in: My Recovery pill */
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(v => !v)}
                    aria-label="My account"
                    aria-expanded={dropdownOpen}
                    style={{
                      display: 'flex', alignItems: 'center',
                      background: 'rgba(0,51,102,0.07)',
                      border: '1px solid rgba(0,51,102,0.12)',
                      borderRadius: 999, padding: '7px 14px',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,51,102,0.11)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,51,102,0.07)')}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap' }}>
                      {displayName || 'Account'} ▾
                    </span>
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden"
                      style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,51,102,0.1)', minWidth: 210, zIndex: 60 }}
                    >
                      <Link href="/dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center justify-between px-4 py-3 text-[14px] text-dark hover:bg-warm-gray transition-colors">
                        Dashboard
                        {pathname === '/dashboard' && <span className="text-[10px] font-bold text-teal">●</span>}
                      </Link>
                      <Link href="/my-recovery/profile" onClick={() => setDropdownOpen(false)} className="flex items-center justify-between px-4 py-3 text-[14px] text-dark hover:bg-warm-gray transition-colors">
                        Profile
                        {pathname === '/my-recovery/profile' && <span className="text-[10px] font-bold text-teal">●</span>}
                      </Link>
                      <Link href="/my-recovery/settings" onClick={() => setDropdownOpen(false)} className="flex items-center justify-between px-4 py-3 text-[14px] text-dark hover:bg-warm-gray transition-colors">
                        Settings
                        {pathname === '/my-recovery/settings' && <span className="text-[10px] font-bold text-teal">●</span>}
                      </Link>
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
                /* Logged-out: Sign In + Get Started */
                <>
                  <button
                    onClick={() => openAuthModal('login')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 500, color: 'var(--mid)', padding: '8px 6px', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    style={{
                      background: 'var(--navy)', color: '#fff', border: 'none',
                      borderRadius: 999, padding: '8px 18px',
                      fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
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

          {/* Mobile: hamburger only (search is in Row 2) */}
          <button
            className="md:hidden text-2xl text-navy"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1 }}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* ── Row 2: search bar ── */}
      <div className="border-b border-[var(--border)]" style={{ background: '#F7F6F4' }}>
        <div className="max-w-[1120px] mx-auto px-6 py-2">
          <button
            onClick={() => { setMobileOpen(false); setSearchOpen(true) }}
            aria-label="Search SoberAnchor"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', maxWidth: 620,
              margin: '0 auto',
              background: '#fff',
              border: '1.5px solid var(--border)',
              borderRadius: 10,
              padding: '8px 14px',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              textAlign: 'left',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--teal)'
              e.currentTarget.style.boxShadow  = '0 0 0 3px rgba(42,138,153,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow   = 'none'
            }}
          >
            {SearchIcon}
            <span style={{ flex: 1, fontSize: 13.5, color: 'var(--mid)', letterSpacing: '0.1px' }}>
              Ask anything…
            </span>
          </button>
        </div>
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

          <Link
            href="/our-story"
            onClick={() => setMobileOpen(false)}
            className={`block py-3.5 text-[15px] font-medium border-b border-[var(--border)] ${
              pathname === '/our-story' ? 'text-teal' : 'text-dark'
            }`}
          >
            Our Story
          </Link>

          {!loading && (
            user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block py-3.5 text-[15px] font-medium border-b border-[var(--border)]" style={{ color: 'var(--navy)' }}>
                  Dashboard
                </Link>
                <Link href="/my-recovery/profile" onClick={() => setMobileOpen(false)} className="block py-3.5 text-[15px] font-medium border-b border-[var(--border)]" style={{ color: 'var(--navy)' }}>
                  Profile
                </Link>
                <Link href="/my-recovery/settings" onClick={() => setMobileOpen(false)} className="block py-3.5 text-[15px] font-medium border-b border-[var(--border)]" style={{ color: 'var(--navy)' }}>
                  Settings
                </Link>
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
                  onClick={() => { setMobileOpen(false); openAuthModal('login') }}
                  style={{ flex: 1, background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, color: 'var(--mid)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMobileOpen(false); openAuthModal('signup') }}
                  style={{ flex: 1, background: 'var(--navy)', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  Get Started
                </button>
              </div>
            )
          )}
        </div>
      )}

      <GlobalSearch
        open={searchOpen}
        context={getSearchContext(pathname)}
        onClose={() => setSearchOpen(false)}
      />
    </nav>
  )
}
