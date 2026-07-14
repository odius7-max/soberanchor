import Link from 'next/link'
import type { ReactNode } from 'react'

export type LaneTile = {
  key: string
  href: string
  title: string
  desc: string
  icon: ReactNode
  iconBg: string
  count?: number | null
  isActive?: boolean
}

type PillKind = 'clinical' | 'lifestyle' | 'support'
type ColCount = 4 | 3 | 2

type Props = {
  id: string
  label: string
  pillLabel: string
  pillKind: PillKind
  tiles: LaneTile[]
  cols: ColCount
  /** Optional cross-lane hint (e.g., "recovery housing" from Get Treatment lane). */
  crossLink?: { href: string; label: string }
}

const pillClasses: Record<PillKind, string> = {
  clinical: 'text-teal bg-[var(--teal-10)] border-[var(--teal-20)]',
  lifestyle: 'text-[#9A7B54] bg-[var(--gold-10)] border-[rgba(212,165,116,0.25)]',
  support: 'text-navy bg-[rgba(0,51,102,0.06)] border-[rgba(0,51,102,0.15)]',
}

const gridClasses: Record<ColCount, string> = {
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  2: 'grid-cols-1 sm:grid-cols-2',
}

export default function CategoryLane({ id, label, pillLabel, pillKind, tiles, cols, crossLink }: Props) {
  return (
    <section id={id} aria-labelledby={`${id}-label`} className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <h2
          id={`${id}-label`}
          className="text-[13px] font-semibold uppercase tracking-[1.6px] text-navy"
        >
          {label}
        </h2>
        <span className={`text-[10.5px] font-semibold uppercase tracking-[1px] rounded-full border px-2.5 py-0.5 ${pillClasses[pillKind]}`}>
          {pillLabel}
        </span>
      </div>

      <ul role="list" className={`grid ${gridClasses[cols]} gap-4`}>
        {tiles.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={t.isActive ? 'page' : undefined}
              className={`card-hover block rounded-[16px] border overflow-hidden min-h-[100px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--teal)] ${
                t.isActive
                  ? 'border-[1.5px] border-[var(--teal)] bg-[var(--teal-10)]'
                  : 'border-[var(--border)] bg-white'
              }`}
            >
              <div className="flex items-start gap-4 p-5">
                <div
                  className="flex items-center justify-center rounded-xl shrink-0 text-[28px]"
                  style={{
                    width: 56,
                    height: 56,
                    background: t.isActive ? 'var(--teal-10)' : t.iconBg,
                  }}
                  aria-hidden
                >
                  {t.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-navy text-[15px] leading-snug">{t.title}</div>
                  <div className="text-mid text-[13px] mt-0.5 leading-snug">{t.desc}</div>
                  {typeof t.count === 'number' && t.count > 0 && (
                    <div className="text-mid text-[12px] mt-1">
                      {t.count.toLocaleString()} listing{t.count === 1 ? '' : 's'}
                    </div>
                  )}
                  {t.isActive && (
                    <div className="text-teal text-[12px] font-semibold mt-1">● Showing below</div>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {crossLink && (
        <p className="mt-4 text-[13px] text-mid">
          <Link
            href={crossLink.href}
            className="text-teal font-semibold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--teal)] rounded-sm"
          >
            {crossLink.label} →
          </Link>
        </p>
      )}
    </section>
  )
}
