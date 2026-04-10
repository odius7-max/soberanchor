import { HeroCTAButtons, GetStartedButton } from "./AuthCTAButtons";

const recoveryFeatures = [
  { icon: "📊", title: "Daily check-in", desc: "How are you feeling? Sober today? Quick mood + notes — takes 30 seconds." },
  { icon: "📓", title: "Private journal", desc: "Write freely. Tag entries by step. Choose what to share with your sponsor." },
  { icon: "📋", title: "Step work tracker", desc: "Work through the 12 steps at your own pace. Your sponsor can review and leave feedback." },
  { icon: "👥", title: "Meeting log", desc: "Check in at meetings from the directory. Track your attendance streak." },
  { icon: "🏆", title: "Milestone celebrations", desc: "7 days, 30 days, 90 days — automatic recognition of your progress." },
];

const sponsorFeatures = [
  { icon: "👁️", title: "Sponsee overview", desc: "See how each sponsee is doing at a glance — mood, check-in streak, current step." },
  { icon: "📝", title: "Review step work", desc: "Read submissions, leave feedback, mark as reviewed or needs revision." },
  { icon: "📚", title: "Assign readings", desc: "Send reading assignments with page ranges, due dates, and notes." },
  { icon: "🔔", title: "Attention alerts", desc: "Get notified when a sponsee reports struggling or hasn't checked in." },
  { icon: "📈", title: "Progress tracking", desc: "See step completion, meeting attendance, and milestone timelines." },
];

const trustItems = [
  { icon: "🔒", title: "Encrypted & private", desc: "Your data is encrypted in transit and at rest. We never sell or share it." },
  { icon: "👁️", title: "You control sharing", desc: "Journal entries and check-ins are private by default. You choose what your sponsor sees." },
  { icon: "🗑️", title: "Delete anytime", desc: "Export or permanently delete all your data with one click. No questions asked." },
  { icon: "🛡️", title: "Row-level security", desc: "Database-level access controls ensure only you can access your records." },
];

const steps = [
  { n: "1", title: "Create your account", desc: "Email and password. That's it. Use a display name — real name not required." },
  { n: "2", title: "Set your sobriety date", desc: "Your day counter starts automatically. Milestones are celebrated as you hit them." },
  { n: "3", title: "Connect with a sponsor", desc: "Optional. Invite your sponsor by email, or use the tools on your own." },
];

export default function MyRecoveryPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-[80px] px-6 text-center">
        <div className="max-w-[680px] mx-auto">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-3">
            Recovery Tools
          </p>
          <h1
            className="text-[clamp(36px,5vw,52px)] font-semibold leading-[1.1] mb-5"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
          >
            Your private space for recovery.
          </h1>
          <p className="text-[17px] text-mid leading-[1.7] mb-8 max-w-[560px] mx-auto">
            Daily accountability, personal journaling, step work tracking, and a
            secure connection with your sponsor — all in one place.
          </p>
          <HeroCTAButtons />
          <p className="text-[13px] text-mid">
            Free. Private. No ads. Delete your data anytime.
          </p>
        </div>
      </section>

      {/* Two perspectives */}
      <section className="bg-off-white py-[72px] px-6">
        <div className="max-w-[1120px] mx-auto">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2 text-center">
            Built for both sides of the relationship
          </p>
          <h2
            className="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.2] mb-10 text-center max-w-[640px] mx-auto"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
          >
            Whether you&apos;re working the steps or guiding someone through them.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recovery card */}
            <div className="bg-white border border-border rounded-[14px] overflow-hidden">
              <div
                className="px-7 py-5 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg, var(--navy) 0%, #1a4a5e 100%)" }}
              >
                <span className="text-[28px]">🧭</span>
                <h3
                  className="text-lg font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  For people in recovery
                </h3>
              </div>
              <ul className="p-7 space-y-5">
                {recoveryFeatures.map((f) => (
                  <li key={f.title} className="flex gap-3">
                    <span className="text-[20px] mt-0.5 shrink-0">{f.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-navy">{f.title}</div>
                      <div className="text-sm text-mid leading-relaxed">{f.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sponsor card */}
            <div className="bg-white border border-border rounded-[14px] overflow-hidden">
              <div
                className="px-7 py-5 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg, #2A6B6B 0%, var(--teal) 100%)" }}
              >
                <span className="text-[28px]">⚓</span>
                <h3
                  className="text-lg font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  For sponsors
                </h3>
              </div>
              <ul className="p-7 space-y-5">
                {sponsorFeatures.map((f) => (
                  <li key={f.title} className="flex gap-3">
                    <span className="text-[20px] mt-0.5 shrink-0">{f.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-navy">{f.title}</div>
                      <div className="text-sm text-mid leading-relaxed">{f.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & security */}
      <section className="py-[72px] px-6">
        <div className="max-w-[1120px] mx-auto">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2 text-center">
            Privacy &amp; Security
          </p>
          <h2
            className="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.2] mb-2.5 text-center"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
          >
            Your recovery is your business.
          </h2>
          <p className="text-mid text-base leading-relaxed text-center max-w-[520px] mx-auto mb-10">
            We built this with the same care we&apos;d want for our own recovery data.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[800px] mx-auto">
            {trustItems.map((t) => (
              <div
                key={t.title}
                className="bg-warm-gray border border-border rounded-[14px] p-6 flex gap-4"
              >
                <span className="text-[28px] shrink-0 mt-0.5">{t.icon}</span>
                <div>
                  <div
                    className="text-base font-semibold mb-1"
                    style={{ color: "var(--navy)" }}
                  >
                    {t.title}
                  </div>
                  <div className="text-sm text-mid leading-relaxed">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-off-white py-[72px] px-6">
        <div className="max-w-[1120px] mx-auto">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2 text-center">
            Getting Started
          </p>
          <h2
            className="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.2] mb-12 text-center"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
          >
            Three steps to your recovery dashboard.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4"
                  style={{ background: "var(--teal)" }}
                >
                  {s.n}
                </div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
                >
                  {s.title}
                </h3>
                <p className="text-sm text-mid leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <GetStartedButton />
          </div>
        </div>
      </section>
    </>
  );
}
