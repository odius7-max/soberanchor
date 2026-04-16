'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { key: 'sponsees', label: 'Sponsees',   href: '/dashboard?tab=sponsees' },
  { key: 'library',  label: 'My Library', href: '/dashboard/sponsees/program' },
] as const

type TabKey = typeof TABS[number]['key']

interface Props {
  /** Force the active tab. If omitted, derived from pathname. */
  active?: TabKey
}

/**
 * Secondary nav for the sponsor area. Pairs the sponsor dashboard
 * (Sponsees list) with the Program Builder / task library.
 *
 * Appears on:
 *   - /dashboard (when role === 'sponsees')
 *   - /dashboard/sponsees/program
 */
export default function SponsorNavTabs({ active }: Props) {
  const pathname = usePathname()
  const activeTab: TabKey =
    active ?? (pathname?.startsWith('/dashboard/sponsees/program') ? 'library' : 'sponsees')

  return (
    <div
      role="tablist"
      aria-label="Sponsor sections"
      style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid var(--border)',
        marginBottom: 20,
      }}
    >
      {TABS.map(tab => {
        const isActive = tab.key === activeTab
        return (
          <Link
            key={tab.key}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? 'page' : undefined}
            style={{
              position: 'relative',
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              color: isActive ? 'var(--navy)' : 'var(--mid)',
              textDecoration: 'none',
              borderBottom: isActive ? '2px solid var(--teal)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
