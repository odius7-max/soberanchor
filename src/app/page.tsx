"use client";
import { useState } from "react";
import Link from "next/link";
import GuidedDiscovery from "@/components/GuidedDiscovery";

const categories = [
  { icon: "🏥", title: "Treatment Centers", sub: "Find professional help", href: "/find#facilities" },
  { icon: "🏠", title: "Sober Living", sub: "Homes & residences", href: "/find#facilities" },
  { icon: "👥", title: "Meetings", sub: "AA, NA, GA, OA & more", href: "/find#meetings" },
  { icon: "🍹", title: "Sober Venues", sub: "Bars, cafes & events", href: "/find#facilities" },
  { icon: "💆", title: "Therapists", sub: "Counselors & specialists", href: "/find#facilities" },
  { icon: "⚓", title: "Track Your Journey", sub: "Check-ins, journal & sponsor tools", href: "/my-recovery", special: true, pills: ["Check-ins", "Journal", "Steps", "Sponsor"] },
];

const fellowships = [
  "AA","NA","GA","OA","Al-Anon","SMART Recovery","CA","SAA","DA",
  "Nar-Anon","SLAA","CMA","ACA","Celebrate Recovery","LifeRing","FA",
  "OSPA","Gam-Anon","+ dozens more",
];

export default function Home() {
  const [showDiscovery, setShowDiscovery] = useState(false);

  return (
    <>
      {/* Hero */}
      {!showDiscovery && (
        <section className="relative overflow-hidden py-[72px] px-6">
          {/* Dot texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.025]"
            style={{
              backgroundImage: "radial-gradient(circle, var(--navy) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative max-w-[1120px] mx-auto flex flex-wrap gap-12 items-center">
            <div className="flex-1 min-w-[400px] max-w-[560px]">
              <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">
                Your Anchor to Living Sober
              </p>
              <h1
                className="text-[clamp(36px,5vw,52px)] font-semibold leading-[1.1] mb-4"
                style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
              >
                Find the right help,
                <br />
                whatever you&apos;re facing.
              </h1>
              <p className="text-[17px] text-mid leading-[1.7] mb-8">
                The definitive resource for recovery — from alcohol and drugs to
                gambling, eating disorders, and compulsive behaviors. For you, or
                for someone you love.
              </p>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setShowDiscovery(true)}
                  className="bg-navy text-white font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-navy-dark transition-colors"
                >
                  Help Me Find Resources →
                </button>
                <Link
                  href="/find"
                  className="border-[1.5px] border-navy text-navy font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-[var(--navy-10)] transition-colors"
                >
                  Search the Directory
                </Link>
              </div>
              <p className="text-[13px] text-mid mt-4">
                No account needed. Free. Confidential.
              </p>
            </div>
            <div className="flex-1 min-w-[300px] max-w-[420px]">
              <div className="grid grid-cols-2 gap-2.5">
                {categories.map((c) => (
                  <Link
                    key={c.title}
                    href={c.href}
                    className={`bg-white rounded-[14px] p-[18px] hover:shadow-lg hover:-translate-y-0.5 transition-all ${
                      c.special
                        ? "border-2 border-[var(--teal)]"
                        : "border border-border"
                    }`}
                  >
                    <div className="text-[28px] mb-1.5">{c.icon}</div>
                    <div className="text-sm font-semibold text-navy">
                      {c.title}
                    </div>
                    <div className="text-xs text-mid mt-0.5">{c.sub}</div>
                    {c.pills && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.pills.map((p) => (
                          <span
                            key={p}
                            className="bg-[var(--teal-10)] text-teal text-[10px] font-medium rounded-full px-2 py-0.5"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Guided Discovery */}
      {showDiscovery && (
        <GuidedDiscovery onClose={() => setShowDiscovery(false)} />
      )}

      {/* Angel's Story */}
      {!showDiscovery && (
        <>
          <section className="bg-off-white py-16 px-6">
            <div className="max-w-[1120px] mx-auto">
              <div className="flex flex-wrap overflow-hidden border border-border rounded-[14px]">
                <div
                  className="flex-1 min-w-[280px] p-10 flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, var(--navy) 0%, #1a4a5e 100%)",
                  }}
                >
                  <div className="text-center">
                    <div className="w-[72px] h-[72px] rounded-full bg-white/10 mx-auto mb-3 flex items-center justify-center text-[32px]">
                      👩
                    </div>
                    <div
                      className="text-gold text-xl font-semibold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Angel
                    </div>
                    <div className="text-white/60 text-[13px] mt-1">
                      Co-Founder · 5+ Years Sober
                    </div>
                  </div>
                </div>
                <div className="flex-[2] min-w-[400px] p-9 px-10 bg-white">
                  <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">
                    Our Story
                  </p>
                  <h2
                    className="text-[26px] font-semibold mb-3"
                    style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
                  >
                    Built from lived experience, not a boardroom.
                  </h2>
                  <p className="text-mid text-[15px] leading-[1.7] mb-5">
                    SoberAnchor exists because Angel couldn&apos;t find what she
                    needed during her own recovery — a single place that felt
                    warm, comprehensive, and judgment-free. So she built one.
                  </p>
                  <Link
                    href="/our-story"
                    className="inline-block bg-navy text-white font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-navy-dark transition-colors"
                  >
                    Read Angel&apos;s Story →
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Resources Preview */}
          <section className="py-[72px] px-6">
            <div className="max-w-[1120px] mx-auto">
              <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">
                Resources
              </p>
              <h2
                className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.15] mb-2.5"
                style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
              >
                Guides for wherever you are.
              </h2>
              <p className="text-mid text-base leading-relaxed max-w-[600px] mb-8">
                Whether you&apos;re at day one or year five — whether it&apos;s you or
                someone you love — we&apos;ve got something that can help.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  {
                    badge: "Early Recovery",
                    title: "The First 30 Days: What to Expect",
                    desc: "An honest guide to the hardest and most rewarding month of your life.",
                    author: "Angel · 6 min",
                  },
                  {
                    badge: "Supporting Someone",
                    title: "How to Help When Someone You Love Is Struggling",
                    desc: "A guide for families navigating addiction with empathy and boundaries.",
                    author: "SoberAnchor Team · 8 min",
                  },
                  {
                    badge: "Understanding Options",
                    title: "AA vs. SMART Recovery vs. Other Programs",
                    desc: "Not sure what kind of program is right? Here's how they compare.",
                    author: "SoberAnchor Team · 10 min",
                  },
                ].map((a) => (
                  <Link
                    key={a.title}
                    href="/resources"
                    className="bg-white border border-border rounded-[14px] p-7 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <span className="inline-block bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-medium rounded-full px-3 py-1 mb-3">
                      {a.badge}
                    </span>
                    <h3
                      className="text-xl font-semibold mb-1.5"
                      style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
                    >
                      {a.title}
                    </h3>
                    <p className="text-sm text-mid leading-relaxed mb-3">
                      {a.desc}
                    </p>
                    <div className="text-[13px] text-mid">{a.author}</div>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-6">
                <Link
                  href="/resources"
                  className="inline-block border-[1.5px] border-navy text-navy font-semibold px-6 py-2.5 rounded-lg hover:bg-[var(--navy-10)] transition-colors"
                >
                  Browse All Resources →
                </Link>
              </div>
            </div>
          </section>

          {/* Beyond Alcohol */}
          <section className="bg-warm-gray py-16 px-6">
            <div className="max-w-[720px] mx-auto text-center">
              <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">
                Beyond Alcohol & Drugs
              </p>
              <h2
                className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.15] mb-4"
                style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
              >
                Recovery isn&apos;t one-size-fits-all.
              </h2>
              <p className="text-mid text-base leading-[1.7] mb-8">
                SoberAnchor covers the full spectrum — gambling, eating
                disorders, compulsive behaviors, and dozens of fellowships most
                people don&apos;t know exist. Whatever you&apos;re facing, there&apos;s
                help for it.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-7">
                {fellowships.map((f) => (
                  <span
                    key={f}
                    className="bg-white border border-border rounded-full px-3 py-1 text-[13px] font-medium text-dark"
                  >
                    {f}
                  </span>
                ))}
              </div>
              <Link
                href="/find"
                className="inline-block bg-navy text-white font-semibold px-6 py-3 rounded-lg hover:bg-navy-dark transition-colors"
              >
                Explore the Full Directory →
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  );
}
