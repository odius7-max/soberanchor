import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FELLOWSHIPS, getFellowshipBySlug, type FellowshipTagTone } from '@/data/fellowships'
import { FELLOWSHIP_CONTENT } from '@/data/fellowship-content'

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

const TAG_CLASSES: Record<FellowshipTagTone, string> = {
  primary: 'bg-teal/10 text-[#1f6e7a]',
  secular: 'bg-[rgba(107,107,107,0.12)] text-[#4a4a4a]',
  faith:   'bg-[rgba(200,155,60,0.15)] text-[#8a6a1f]',
  neutral: 'bg-warm-gray text-mid',
}

function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-4">
      {text.split('\n\n').map((para, i) => (
        <p key={i} className="text-[15px] leading-relaxed text-dark">{para}</p>
      ))}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[19px] font-bold text-navy mb-4 mt-10 pb-2 border-b border-[var(--border)]">
      {children}
    </h2>
  )
}

export default async function FellowshipDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const f = getFellowshipBySlug(slug)
  if (!f) notFound()

  const content = FELLOWSHIP_CONTENT[slug] ?? null

  const metaParts: string[] = []
  if (f.founded) metaParts.push(`Founded ${f.founded}`)
  if (f.reach) metaParts.push(...f.reach)

  return (
    <div className="max-w-[820px] mx-auto px-6 py-10 pb-20">

      {/* Breadcrumb */}
      <Link href="/fellowships" className="text-teal text-sm font-semibold hover:underline">
        ← All fellowships
      </Link>

      {/* Header */}
      <div className="mt-5 mb-4">
        <h1 className="text-[clamp(26px,4vw,34px)] font-extrabold text-navy tracking-tight leading-tight mb-2">
          {f.name}
          {f.abbreviation && (
            <span className="text-mid font-medium ml-2 text-[20px]">{f.abbreviation}</span>
          )}
        </h1>

        {content?.tagline ? (
          <p className="text-[17px] text-mid leading-relaxed">{content.tagline}</p>
        ) : (
          <p className="text-[17px] text-mid leading-relaxed">{f.shortDescription}</p>
        )}
      </div>

      {/* Tags + meta */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {f.tags.map(t => (
          <span
            key={t.label}
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${TAG_CLASSES[t.tone]}`}
          >
            {t.label}
          </span>
        ))}
        {metaParts.length > 0 && (
          <span className="text-[12px] text-[#9a9a9a] ml-1">{metaParts.join(' · ')}</span>
        )}
      </div>

      {/* ── Rich article (content exists) ── */}
      {content ? (
        <>
          {/* Overview */}
          {content.overview && (
            <>
              <SectionHeading>Overview</SectionHeading>
              <Prose text={content.overview} />
            </>
          )}

          {/* How it works */}
          {content.howItWorks && (
            <>
              <SectionHeading>How it works</SectionHeading>
              <Prose text={content.howItWorks} />
            </>
          )}

          {/* What to expect */}
          {content.whatToExpect && (
            <>
              <SectionHeading>What to expect at a meeting</SectionHeading>
              <Prose text={content.whatToExpect} />
            </>
          )}

          {/* Best for / Not ideal if */}
          {(content.bestFor || content.notIdealIf) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
              {content.bestFor && (
                <div className="rounded-xl border border-[var(--border)] p-5">
                  <h3 className="text-[14px] font-bold text-navy mb-3 uppercase tracking-wide">Good fit if…</h3>
                  <ul className="space-y-2">
                    {content.bestFor.map((item, i) => (
                      <li key={i} className="flex gap-2 text-[13.5px] text-dark leading-snug">
                        <span className="text-teal mt-0.5 flex-shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {content.notIdealIf && (
                <div className="rounded-xl border border-[var(--border)] p-5 bg-warm-gray">
                  <h3 className="text-[14px] font-bold text-navy mb-3 uppercase tracking-wide">Consider alternatives if…</h3>
                  <ul className="space-y-2">
                    {content.notIdealIf.map((item, i) => (
                      <li key={i} className="flex gap-2 text-[13.5px] text-dark leading-snug">
                        <span className="text-[#9a9a9a] mt-0.5 flex-shrink-0">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Meeting finders */}
          <SectionHeading>Find a meeting</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {content.meetingFinders.map(mf => (
              <a
                key={mf.name}
                href={mf.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-[var(--border)] p-4 hover:border-teal transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[14px] font-bold text-navy">{mf.name}</span>
                  {mf.badge && (
                    <span className="text-[10px] font-semibold bg-teal/10 text-teal px-2 py-0.5 rounded-full">{mf.badge}</span>
                  )}
                </div>
                <p className="text-[12.5px] text-mid leading-snug">{mf.description}</p>
              </a>
            ))}
          </div>

          {/* FAQs */}
          {content.faqs && content.faqs.length > 0 && (
            <>
              <SectionHeading>Frequently asked questions</SectionHeading>
              <div className="space-y-0 divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden">
                {content.faqs.map((faq, i) => (
                  <details key={i} className="group">
                    <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none hover:bg-warm-gray transition-colors">
                      <span className="text-[14px] font-semibold text-navy pr-4">{faq.question}</span>
                      <span className="text-mid text-lg flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <div className="px-5 pb-4 pt-1">
                      <p className="text-[13.5px] text-dark leading-relaxed">{faq.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </>
          )}

          {/* See also */}
          {content.seeAlso && content.seeAlso.length > 0 && (
            <div className="mt-10 pt-8 border-t border-[var(--border)]">
              <h3 className="text-[14px] font-bold text-navy mb-3 uppercase tracking-wide">Related fellowships</h3>
              <div className="flex flex-wrap gap-2">
                {content.seeAlso.map(relSlug => {
                  const rel = getFellowshipBySlug(relSlug)
                  if (!rel) return null
                  return (
                    <Link
                      key={relSlug}
                      href={`/fellowships/${relSlug}`}
                      className="bg-white border border-[var(--border)] rounded-lg px-3.5 py-2 text-[13px] font-semibold text-navy hover:border-teal transition-colors"
                    >
                      {rel.abbreviation ?? rel.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── Stub fallback (no content yet) ── */
        <div className="rounded-xl border border-[var(--border)] p-5 bg-warm-gray">
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
      )}

      {/* Bottom nav back */}
      <div className="mt-12 pt-8 border-t border-[var(--border)]">
        <Link href="/fellowships" className="text-teal text-sm font-semibold hover:underline">
          ← View all fellowships
        </Link>
      </div>
    </div>
  )
}
