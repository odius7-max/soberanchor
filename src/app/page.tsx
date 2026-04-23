"use client";
import { useState } from "react";
import Link from "next/link";
import GuidedDiscovery from "@/components/GuidedDiscovery";

const angelYears = Math.floor(
  (Date.now() - new Date("2021-12-04").getTime()) / (365.25 * 24 * 60 * 60 * 1000)
);

const directoryCategories = [
  { icon: "🏥", title: "Treatment Centers", sub: "Professional care",        href: "/find#facilities" },
  { icon: "🏠", title: "Sober Living",      sub: "Homes & residences",       href: "/find#facilities" },
  { icon: "🤝", title: "Fellowships",       sub: "AA, NA, SMART & more",     href: "/fellowships"     },
  { icon: "🧠", title: "Therapists",        sub: "Counselors & specialists", href: "/find#facilities" },
  { icon: "🍹", title: "Sober Venues",      sub: "Bars, cafés & events",     href: "/find#facilities" },
];

const findHelpBullets = [
  "Treatment centers & rehabs",
  "Sober living homes",
  "Fellowships (AA, NA, SMART & more)",
  "Licensed therapists",
  "Sober-friendly venues & events",
];

const programBullets = [
  "Daily check-ins & mood tracking",
  "Step work for any fellowship",
  "Sponsor & sponsee management tools",
  "Meeting tracking & milestones",
  "Program builder & task assignment",
];

export default function Home() {
  const [showDiscovery, setShowDiscovery] = useState(false);

  return (
    <>
      {showDiscovery ? (
        <GuidedDiscovery onClose={() => setShowDiscovery(false)} />
      ) : (
        <>
          {/* Hero + two-path grid */}
          <section className="relative overflow-hidden bg-off-white py-[72px] px-6">
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.025]"
              style={{
                backgroundImage: "radial-gradient(circle, var(--navy) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative max-w-[1120px] mx-auto text-center">
              <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-3">
                Your Anchor to Living Sober
              </p>
              <h1
                className="text-[clamp(26px,4vw,40px)] font-semibold leading-[1.1] mb-4"
                style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-1px" }}
              >
                Find the right help.
                <br />
                Work your program, every day.
              </h1>
              <p className="text-base text-mid leading-[1.7] mb-8 max-w-[540px] mx-auto">
                Whether you need to find treatment, meetings, or support — or
                you&apos;re in recovery doing the daily work — SoberAnchor has
                both paths covered.
              </p>

              {/* Two-path grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[900px] mx-auto text-left">
                {/* Find Help card */}
                <div className="bg-white border border-border rounded-2xl p-6 card-hover flex flex-col">
                  <p className="text-[10px] uppercase tracking-[1.2px] font-bold text-teal mb-2">
                    Looking for help?
                  </p>
                  <h2
                    className="text-lg font-bold text-navy mb-4"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Search our directory.
                  </h2>
                  <button
                    onClick={() => setShowDiscovery(true)}
                    className="w-full bg-navy text-white font-semibold text-sm py-3 rounded-xl hover:bg-navy-dark transition-colors mb-5"
                  >
                    Help me find resources →
                  </button>
                  <ul className="space-y-2 flex-1">
                    {findHelpBullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-dark">
                        <span className="text-teal font-bold mt-0.5 flex-shrink-0">✓</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Work Your Program card */}
                <div
                  className="rounded-2xl p-6 card-hover flex flex-col border bg-gradient-to-br from-navy-dark to-navy"
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}
                >
                  <p className="text-[10px] uppercase tracking-[1.2px] font-bold text-gold mb-2">
                    Already in recovery?
                  </p>
                  <h2
                    className="text-lg font-bold text-white mb-4"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Work your program, every day.
                  </h2>
                  <Link
                    href="/program"
                    className="w-full bg-teal text-white font-semibold text-sm py-3 rounded-xl text-center hover:opacity-90 transition-opacity mb-5 block"
                  >
                    Explore the program →
                  </Link>
                  <ul className="space-y-2 flex-1">
                    {programBullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm">
                        <span className="text-gold font-bold mt-0.5 flex-shrink-0">✓</span>
                        <span className="text-white/80">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Trust line */}
              <div className="mt-6 text-center text-xs text-mid">
                <span>No account required to browse</span>
                <span className="mx-3 text-teal">•</span>
                <span>Anonymous by default</span>
              </div>
            </div>
          </section>

          {/* Directory band */}
          <section className="border-t border-border bg-white py-14 px-6">
            <div className="max-w-[1120px] mx-auto">
              <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">
                Directory
              </p>
              <h2
                className="text-[clamp(24px,3vw,36px)] font-semibold mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.75px" }}
              >
                Find what you need.
              </h2>
              <p className="text-mid text-base leading-relaxed max-w-[480px] mb-8">
                From professional treatment to local fellowships — search the
                full directory for free.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
                {directoryCategories.map((c) => (
                  <Link
                    key={c.title}
                    href={c.href}
                    className="bg-white border border-border rounded-[14px] p-5 card-hover text-center"
                  >
                    <div className="text-[28px] mb-2">{c.icon}</div>
                    <div className="text-sm font-semibold text-navy">{c.title}</div>
                    <div className="text-xs text-mid mt-0.5">{c.sub}</div>
                  </Link>
                ))}
              </div>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link
                  href="/find"
                  className="bg-navy text-white font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-navy-dark transition-colors"
                >
                  Search the full directory →
                </Link>
                <button
                  onClick={() => setShowDiscovery(true)}
                  className="border-[1.5px] border-navy text-navy font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-[var(--navy-10)] transition-colors"
                >
                  Talk to AI search
                </button>
              </div>
            </div>
          </section>

          {/* Program teaser band */}
          <section className="bg-gradient-to-br from-navy-dark to-navy text-white py-14 px-6">
            <div className="max-w-[1120px] mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
                {/* Left: copy */}
                <div>
                  <p className="text-[10px] uppercase tracking-[1.2px] font-bold text-gold mb-3">
                    The program tools
                  </p>
                  <h2
                    className="text-[clamp(26px,3.5vw,40px)] font-semibold leading-[1.15] mb-4"
                    style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.75px" }}
                  >
                    Built for the work that happens every day.
                  </h2>
                  <p className="text-white/70 text-base leading-[1.7] mb-8 max-w-[480px]">
                    Whether you&apos;re doing the steps with a sponsor or carrying
                    the message as one — SoberAnchor has the tools for both sides
                    of the relationship.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <Link
                      href="/program"
                      className="bg-teal text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
                    >
                      Explore the program →
                    </Link>
                    <Link
                      href="/my-recovery"
                      className="border border-white/35 text-white font-semibold px-6 py-3 rounded-xl hover:border-white hover:bg-white/10 transition-colors"
                    >
                      Sign in
                    </Link>
                  </div>
                </div>

                {/* Right: floating product-preview cards — hidden below lg */}
                <div className="hidden lg:block relative h-[340px]">
                  {/* Card 1: Today's check-in */}
                  <div
                    className="absolute top-0 left-4 w-[280px] rounded-xl p-4"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      backdropFilter: "blur(8px)",
                      transform: "rotate(-2deg)",
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-[1px] font-bold text-gold mb-1.5">
                      Today&apos;s check-in
                    </p>
                    <p className="text-sm font-semibold text-white mb-1">
                      Good day · 2 meetings this week
                    </p>
                    <p className="text-xs text-white/60 mb-2.5">Mood 7 · 127 days sober</p>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full bg-teal rounded-full" style={{ width: "71%" }} />
                    </div>
                  </div>

                  {/* Card 2: Step work */}
                  <div
                    className="absolute top-[112px] left-[56px] w-[280px] rounded-xl p-4"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      backdropFilter: "blur(8px)",
                      transform: "rotate(1.5deg)",
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-[1px] font-bold text-teal mb-1.5">
                      Step 4 · Inventory
                    </p>
                    <p className="text-sm font-semibold text-white mb-1">
                      List 5 examples of powerlessness
                    </p>
                    <p className="text-xs text-white/60">Assigned by sponsor · due Apr 28</p>
                  </div>

                  {/* Card 3: Sponsor dashboard */}
                  <div
                    className="absolute top-[224px] left-2 w-[300px] rounded-xl p-4"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      backdropFilter: "blur(8px)",
                      transform: "rotate(-1deg)",
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-[1px] font-bold text-gold mb-1.5">
                      Sponsor dashboard
                    </p>
                    <p className="text-xs text-white/60 mb-2.5">3 sponsees · 1 needs attention</p>
                    <div className="space-y-1.5">
                      {[
                        { name: "TJ",     status: "ok",      color: "var(--green-ok)"           },
                        { name: "Sarah",  status: "alert",   color: "var(--red-alert)"           },
                        { name: "Marcus", status: "neutral", color: "rgba(255,255,255,0.45)"     },
                      ].map((s) => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <span className="font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                            {s.name}
                          </span>
                          <span className="font-semibold" style={{ color: s.color }}>
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Our Story */}
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
                      Angel J.
                    </div>
                    <div className="text-white/60 text-[13px] mt-1">
                      Co-Founder · {angelYears}+ Years Sober
                    </div>
                  </div>
                </div>
                <div className="flex-[2] min-w-[400px] p-9 px-10 bg-white">
                  <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">
                    Our Story
                  </p>
                  <h2
                    className="text-[26px] font-semibold mb-3"
                    style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.5px" }}
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
                style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-1.0px" }}
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
                    className="bg-white border border-border rounded-[14px] p-7 card-hover"
                  >
                    <span className="inline-block bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-medium rounded-full px-3 py-1 mb-3">
                      {a.badge}
                    </span>
                    <h3
                      className="text-xl font-semibold mb-1.5"
                      style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.5px" }}
                    >
                      {a.title}
                    </h3>
                    <p className="text-sm text-mid leading-relaxed mb-3">{a.desc}</p>
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
        </>
      )}
    </>
  );
}
