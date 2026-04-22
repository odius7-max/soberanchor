import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FELLOWSHIPS, getFellowshipBySlug } from '@/data/fellowships'

export async function generateStaticParams() {
  return FELLOWSHIPS.map(f => ({ slug: f.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const f = getFellowshipBySlug(slug)
  if (!f) return {}
  return {
    title: `${f.name} — Recovery Fellowship | SoberAnchor`,
    description: f.shortDescription,
    alternates: { canonical: `/fellowships/${f.slug}` },
  }
}

export default async function FellowshipDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const f = getFellowshipBySlug(slug)
  if (!f) notFound()

  return (
    <div className="max-w-[820px] mx-auto px-6 py-10">
      <Link href="/fellowships" className="text-teal text-sm font-semibold hover:underline">
        ← All fellowships
      </Link>

      <h1 className="text-3xl font-extrabold text-navy mt-5 mb-3 tracking-tight">
        {f.name}
        {f.abbreviation && (
          <span className="text-mid font-medium ml-2 text-xl">{f.abbreviation}</span>
        )}
      </h1>

      <p className="text-base text-dark leading-relaxed mb-6">{f.shortDescription}</p>

      <div className="rounded-xl border border-[var(--border)] p-5 bg-warm-gray mb-6">
        <p className="text-sm text-mid mb-3">
          A full overview of {f.name} is coming soon. In the meantime:
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={f.officialMeetingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-navy-dark transition-colors"
          >
            Find {f.abbreviation ?? f.name} meetings →
          </a>
          <a
            href={f.officialHomepageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-navy border border-[var(--border)] px-4 py-2 rounded-lg text-sm font-bold hover:border-navy transition-colors"
          >
            Official website
          </a>
        </div>
      </div>
    </div>
  )
}
