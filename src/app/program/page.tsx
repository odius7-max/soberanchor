import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Program — Work your program every day | SoberAnchor",
  description:
    "Daily check-ins, step work, meeting tracking, milestones, and sponsor-sponsee tools — all in one place, built for how recovery actually works. Free for personal use; Pro for sponsors scaling up.",
  alternates: { canonical: "/program" },
  openGraph: {
    title: "The Program — SoberAnchor",
    description:
      "Daily check-ins, step work, meetings, milestones, and sponsor tools. Free for personal recovery; Pro for active sponsors.",
    type: "website",
  },
};

// ── Static data ─────────────────────────────────────────────────────────────

const sponsorFeatures = [
  {
    icon: "🏗️",
    name: "Program builder",
    desc: "Build your own step-by-step program from any fellowship's tradition. Save custom tasks, reading assignments, and prompts. Reuse across sponsees.",
  },
  {
    icon: "📋",
    name: "Task assignment",
    desc: "Assign tasks from your library or create custom tasks on the fly. Set due dates. Track completion. Your sponsee sees exactly what you asked them to do.",
  },
  {
    icon: "📊",
    name: "Sponsee dashboard",
    desc: "See all your sponsees at a glance. Who checked in today. Who's missed three days. Who just hit a milestone. Who's on which step.",
  },
  {
    icon: "🔔",
    name: "Smart alerts",
    desc: "Get notified when a sponsee hasn't checked in, hits a milestone, or flags they're struggling. Never miss the moment when someone needs the call.",
  },
  {
    icon: "💬",
    name: "Shared notes",
    desc: "Leave private guidance on each task or step. Your sponsee sees your notes in context. All conversation stays tied to the work.",
  },
  {
    icon: "📧",
    name: "Email invites",
    desc: "Invite a new sponsee by email. They get a one-click onboarding that connects them straight to you. No account setup friction.",
  },
];

const testimonials = [
  {
    quote:
      "I had a spreadsheet with five sponsees' sobriety dates, step positions, and last-call times. I was missing anniversaries and forgetting which sponsee was on Step 4 vs Step 7. SoberAnchor gave me one page that holds all of it. My anxiety dropped immediately.",
    name: "Angel J.",
    role: "Sponsor, AA · 4+ years sober",
  },
  {
    quote:
      "First time I've worked the steps digitally. My sponsor can see my writing when I'm ready to share, and it's all there when I want to come back to it. I've been through three sponsors and this is the first time the process didn't feel scattered.",
    name: "M.",
    role: "Sponsee, NA · 2 years clean",
  },
  {
    quote:
      "The scheduled due dates changed how I sponsor. I used to text reminders and feel like a nag. Now the app does it, my sponsees show up to our calls with the work done, and we actually talk about recovery instead of logistics.",
    name: "Chris.",
    role: "Sponsor, SMART Recovery · 6 years",
  },
];

const trustCards = [
  {
    icon: "👤",
    name: "Anonymous by default",
    desc: "First name only. No real name required. Profile photos optional. You control who sees what, always.",
  },
  {
    icon: "🔒",
    name: "Secure storage",
    desc: "Your check-ins, step work, and shared notes are encrypted at rest and in transit. Industry-standard infrastructure, not a weekend project.",
  },
  {
    icon: "🗑️",
    name: "Delete anytime",
    desc: "One button in Settings permanently deletes your account and all associated data. No email to support. No waiting period. It's your data.",
  },
  {
    icon: "🚫",
    name: "Never sold, never ads",
    desc: "We never sell or share your data with advertisers, insurers, or anyone else. Our revenue comes from the Pro tier — not from you being the product.",
  },
];

const freeFeatures = [
  "Unlimited daily check-ins & mood tracking",
  "Step work for every major fellowship",
  "Save unlimited meetings you attend",
  "Sobriety milestones & tracking",
  "Unlimited personal journal entries",
  "Connect with 1 sponsor as a sponsee",
  "Your first sponsee is always free — full basic tools",
  "Full directory access (treatment, fellowships, therapists)",
];

const proFeatures = [
  "Everything in Free",
  "Unlimited sponsees with full tools",
  "All sponsee sobriety dates & milestones, tracked for you",
  "Custom program templates & reusable task library",
  "Scheduled due dates with automatic reminders",
  "Sponsee analytics & weekly trend reports",
  "Email invitations for new sponsees",
  "Priority in-app support",
  "Export & archive your data anytime",
];

const faqs: { q: string; a: string }[] = [
  {
    q: "Is this really anonymous?",
    a: "Yes. We only require a first name and an email (for sign-in). No real name, no phone number, no address. Your profile is private by default. You decide what you share with your sponsor or sponsees.",
  },
  {
    q: "Do I have to be in a specific fellowship?",
    a: "No. SoberAnchor works across AA, NA, SMART Recovery, Refuge Recovery, Recovery Dharma, Celebrate Recovery, LifeRing, and Women for Sobriety. You can even work multiple programs at once if that fits your recovery.",
  },
  {
    q: "Can I use the program tools without a sponsor?",
    a: "Absolutely. All personal tools — check-ins, step work, meetings, milestones — work whether you have a sponsor or not. You can add a sponsor later if you decide to.",
  },
  {
    q: "What if I relapse?",
    a: "You reset your sober date with one tap. No guilt trip, no scolding copy, no shame. Recovery is rarely a straight line, and the app is built to support you starting again as many times as needed.",
  },
  {
    q: "How do sponsor and sponsee accounts work?",
    a: "Anyone can sponsor anyone else. A sponsor invites a sponsee by email or link. Once connected, the sponsor can see what the sponsee chooses to share, assign step work, and leave notes. Either side can end the relationship at any time.",
  },
  {
    q: "What happens to my data if I delete my account?",
    a: "Everything goes. Account, check-ins, step work, notes, and anything you shared with a sponsor. Permanent deletion happens instantly through Settings — no email to support, no waiting period. It's your data; you own the off-switch.",
  },
  {
    q: "Is Pro required to sponsor someone?",
    a: "No. The Free tier lets you sponsor 1 person with the full basic toolset — assigning tasks, seeing check-ins, leaving notes, tracking their step progress. Pro is for sponsors who take on more than one sponsee and want power tools like scheduled due dates, analytics, custom program templates, and bulk email invites. Most sponsors find they want Pro once they're actively sponsoring 2 or more people.",
  },
];

// ── Feature bullet helper ────────────────────────────────────────────────────

function FeatureBullet({ text }: { text: string }) {
  return (
    <li className="text-sm text-dark flex items-start gap-2 py-1.5 pl-6 relative">
      <span className="absolute left-0.5 top-1.5 text-teal font-extrabold text-[13px]">✓</span>
      {text}
    </li>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProgramPage() {
  return (
    <>
      {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-navy-dark to-navy text-white py-20 px-8">
        <div className="max-w-[1120px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
            {/* Copy */}
            <div>
              <p className="text-[11px] uppercase tracking-[1.5px] font-bold text-gold mb-4">
                The program tools
              </p>
              <h1
                className="text-[clamp(32px,4.5vw,52px)] font-extrabold leading-[1.08] mb-[18px]"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-1px" }}
              >
                Work your program, every day.
              </h1>
              <p className="text-lg text-white/80 leading-[1.55] mb-7 max-w-[540px]">
                Daily check-ins, step work, meeting tracking, and the sponsor-sponsee
                connection — all in one place, built for how recovery actually works.
                For sponsees doing the work, and sponsors carrying the message.
              </p>
              <div className="flex gap-3 flex-wrap mb-6">
                <Link
                  href="/my-recovery"
                  className="bg-teal text-white font-bold px-7 py-3.5 rounded-xl hover:opacity-90 transition-opacity text-[15px]"
                >
                  Start working your program →
                </Link>
                <Link
                  href="/?auth=login"
                  className="border border-white/35 text-white font-bold px-7 py-3.5 rounded-xl hover:border-white hover:bg-white/10 transition-colors text-[15px]"
                >
                  Sign in
                </Link>
              </div>
              <div className="flex gap-5 flex-wrap text-[12.5px] text-white/65">
                <span>🔒 Anonymous by default</span>
                <span>👤 Your data, your control</span>
                <span>✕ Delete anytime</span>
              </div>
            </div>

            {/* Product-preview cards — hidden below lg */}
            <div className="hidden lg:block relative h-[440px]" aria-hidden="true">
              {/* Card A: Check-in */}
              <div
                className="absolute top-0 right-5 w-[300px] rounded-[14px] p-5"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  backdropFilter: "blur(8px)",
                  transform: "rotate(-2deg)",
                }}
              >
                <p className="text-[9.5px] uppercase tracking-[1.2px] font-bold text-gold mb-1.5">
                  Today&apos;s check-in
                </p>
                <p className="text-sm font-bold text-white mb-1 tracking-tight">
                  Good day. Meeting tonight.
                </p>
                <p className="text-xs text-white/70 mb-2.5">
                  Mood 7 · 127 days sober · 2 meetings this week
                </p>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <div className="h-full bg-teal rounded-full" style={{ width: "72%" }} />
                </div>
              </div>

              {/* Card B: Step work */}
              <div
                className="absolute top-[135px] right-[70px] w-[290px] rounded-[14px] p-5"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  backdropFilter: "blur(8px)",
                  transform: "rotate(1.5deg)",
                }}
              >
                <p className="text-[9.5px] uppercase tracking-[1.2px] font-bold text-gold mb-1.5">
                  Step 4 · Inventory
                </p>
                <p className="text-sm font-bold text-white mb-1 tracking-tight">
                  List 5 examples of powerlessness
                </p>
                <p className="text-xs text-white/70">
                  Assigned by your sponsor · due Apr 28
                </p>
              </div>

              {/* Card C: Sponsor dashboard — gold tint */}
              <div
                className="absolute top-[270px] right-0 w-[310px] rounded-[14px] p-5"
                style={{
                  background: "rgba(200,155,60,0.14)",
                  border: "1px solid rgba(200,155,60,0.4)",
                  backdropFilter: "blur(8px)",
                  transform: "rotate(-1deg)",
                }}
              >
                <p className="text-[9.5px] uppercase tracking-[1.2px] font-bold text-gold mb-1.5">
                  Sponsor dashboard
                </p>
                <p className="text-sm font-bold text-white mb-1 tracking-tight">
                  3 sponsees · 1 needs attention
                </p>
                {[
                  { name: "TJ",     status: "Checked in today ✓", type: "ok"      },
                  { name: "Sarah",  status: "3 days · follow up",  type: "alert"   },
                  { name: "Marcus", status: "Step 7 in progress",  type: "neutral" },
                ].map((r, i) => (
                  <div
                    key={r.name}
                    className="flex justify-between text-[11.5px] py-1"
                    style={{
                      borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.1)",
                      marginTop: i === 0 ? 8 : 0,
                    }}
                  >
                    <span className="font-semibold text-white">{r.name}</span>
                    <span
                      style={{
                        color:
                          r.type === "ok" ? "#7cd0a8"
                          : r.type === "alert" ? "#e8a87c"
                          : "rgba(255,255,255,0.65)",
                        fontWeight: r.type === "neutral" ? 400 : 600,
                      }}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Feature deep dive (sponsees) ──────────────────────────────── */}
      <section className="bg-white py-20 px-8">
        <div className="max-w-[1120px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] uppercase tracking-[1.5px] font-bold text-teal mb-3">
              Built for sponsees
            </p>
            <h2
              className="text-[clamp(26px,3vw,36px)] font-extrabold text-navy mb-3.5 leading-[1.12]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.6px" }}
            >
              The tools you actually use every day.
            </h2>
            <p className="text-base text-mid max-w-[620px] mx-auto leading-[1.55]">
              Simple enough for day-one sobriety. Deep enough for the 10-year member
              still showing up and doing the work.
            </p>
          </div>

          {/* Feature 1: Daily check-ins — copy left, preview right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <p className="text-[10.5px] uppercase tracking-[1.2px] font-bold text-teal mb-2.5">
                Daily check-ins
              </p>
              <h3
                className="text-[clamp(22px,2.5vw,28px)] font-extrabold text-navy leading-[1.15] mb-3.5"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.4px" }}
              >
                Log your day. Keep it private or share with your sponsor.
              </h3>
              <p className="text-[15px] text-mid leading-[1.65] mb-4">
                A 30-second check-in that fits into your morning or night routine.
                Track your mood, the meetings you attended, what you&apos;re grateful
                for, what&apos;s hard. Your sponsor sees what you choose to share.
              </p>
              <ul>
                {[
                  "Mood tracking with trends over time",
                  "Tag meetings you attended",
                  "Private notes just for you",
                  "Sponsor-shared notes for when you need support",
                ].map((b) => <FeatureBullet key={b} text={b} />)}
              </ul>
            </div>
            <div className="bg-warm-gray rounded-2xl p-7">
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-border">
                <span className="text-sm font-bold text-navy">How was today?</span>
                <span className="text-[11.5px] text-mid">Apr 23</span>
              </div>
              <div className="flex gap-1.5 mb-4">
                {["😔", "😕", "😐", "🙂", "😊", "🤩"].map((emoji, i) => (
                  <div
                    key={emoji}
                    className="flex-1 aspect-square rounded-[10px] flex items-center justify-center text-[22px]"
                    style={{
                      border: `1.5px solid ${i === 4 ? "var(--teal)" : "var(--border)"}`,
                      background: i === 4 ? "var(--teal-10)" : "#fff",
                      transform: i === 4 ? "scale(1.05)" : "none",
                    }}
                  >
                    {emoji}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  { label: "Sunday Morning AA", sel: true  },
                  { label: "Tuesday Tools",      sel: false },
                  { label: "+ add meeting",       sel: false },
                ].map((c) => (
                  <span
                    key={c.label}
                    className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-full"
                    style={{
                      background: c.sel ? "var(--teal)" : "#fff",
                      color:      c.sel ? "#fff" : "var(--dark)",
                      border:     `1px solid ${c.sel ? "var(--teal)" : "var(--border)"}`,
                    }}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
              <div className="bg-white border border-border rounded-lg px-3 py-2.5 text-xs text-mid italic">
                Had a tough moment at lunch today, but called my sponsor. Grateful for the phone list.
              </div>
            </div>
          </div>

          {/* Feature 2: Step work — copy right, preview left on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            <div className="lg:order-2">
              <p className="text-[10.5px] uppercase tracking-[1.2px] font-bold text-teal mb-2.5">
                Step work
              </p>
              <h3
                className="text-[clamp(22px,2.5vw,28px)] font-extrabold text-navy leading-[1.15] mb-3.5"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.4px" }}
              >
                Work the steps — any fellowship, your pace.
              </h3>
              <p className="text-[15px] text-mid leading-[1.65] mb-4">
                Guided prompts for each step in AA, NA, SMART, Refuge Recovery,
                Recovery Dharma, Celebrate Recovery, LifeRing, and Women for Sobriety.
                Your writing saves as you go. Share with your sponsor when you&apos;re ready.
              </p>
              <ul>
                {[
                  "Works across every major fellowship",
                  "Never lose your writing — autosave on every keystroke",
                  "Share each step with your sponsor when it feels right",
                  "Come back months or years later — it's all still there",
                ].map((b) => <FeatureBullet key={b} text={b} />)}
              </ul>
            </div>
            <div className="lg:order-1 bg-warm-gray rounded-2xl p-7">
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-border">
                <span className="text-sm font-bold text-navy">Step Progress</span>
                <span className="text-[11.5px] text-mid">AA · 4 of 12 complete</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3.5">
                {[
                  { label: "Powerless", state: "done",    display: "✓" },
                  { label: "Hope",      state: "done",    display: "✓" },
                  { label: "Decision",  state: "done",    display: "✓" },
                  { label: "Current",   state: "current", display: "4" },
                  { label: "Admit",     state: "empty",   display: "5" },
                  { label: "Ready",     state: "empty",   display: "6" },
                  { label: "Humble",    state: "empty",   display: "7" },
                  { label: "Amends",    state: "empty",   display: "8" },
                ].map((step) => (
                  <div
                    key={step.label}
                    className="aspect-square rounded-[10px] flex flex-col items-center justify-center font-bold border"
                    style={{
                      background:
                        step.state === "done"    ? "rgba(45,134,89,0.1)"  :
                        step.state === "current" ? "rgba(0,51,102,0.08)"  : "#fff",
                      borderColor:
                        step.state === "done"    ? "rgba(45,134,89,0.3)"  :
                        step.state === "current" ? "rgba(0,51,102,0.3)"   : "var(--border)",
                      color:
                        step.state === "done"    ? "#2d8659"              :
                        step.state === "current" ? "var(--navy)"          : "var(--dark)",
                    }}
                  >
                    <span className="text-lg">{step.display}</span>
                    <span
                      className="text-[8.5px] uppercase tracking-[0.5px] mt-0.5"
                      style={{
                        color:
                          step.state === "done"    ? "#2d8659"     :
                          step.state === "current" ? "var(--navy)" : "var(--mid)",
                        fontWeight: step.state === "current" ? 800 : 400,
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="bg-white rounded-md px-3 py-2.5 text-sm text-dark"
                style={{ borderLeft: "3px solid #d4a017" }}
              >
                <strong>Current prompt</strong>
                <span
                  className="ml-1 inline-block text-[9.5px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-[0.5px]"
                  style={{ background: "rgba(212,160,23,0.12)", color: "#d4a017" }}
                >
                  Writing
                </span>
                <div className="mt-1 text-xs text-mid">
                  List five examples of powerlessness from the last year…
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: Meetings — copy left, preview right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <p className="text-[10.5px] uppercase tracking-[1.2px] font-bold text-teal mb-2.5">
                Meetings you attend
              </p>
              <h3
                className="text-[clamp(22px,2.5vw,28px)] font-extrabold text-navy leading-[1.15] mb-3.5"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.4px" }}
              >
                Save your home groups. Track every meeting.
              </h3>
              <p className="text-[15px] text-mid leading-[1.65] mb-4">
                Add the meetings you actually go to — AA, NA, SMART, Refuge, whatever
                fits. Check them off when you attend. Keep a simple record that respects
                your privacy.
              </p>
              <ul>
                {[
                  "Save unlimited meetings — in-person, online, speaker, step study",
                  "Quick check-in: one tap to log attendance",
                  "Weekly and monthly attendance trends",
                  "Link meetings to your check-ins automatically",
                ].map((b) => <FeatureBullet key={b} text={b} />)}
              </ul>
            </div>
            <div className="bg-warm-gray rounded-2xl p-7">
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-border">
                <span className="text-sm font-bold text-navy">Your meetings</span>
                <span className="text-[11.5px] text-mid">12 this month</span>
              </div>
              {[
                { name: "Sunday Morning Sober", meta: "AA · Sundays 9:00am · In-person",     count: "4 ✓" },
                { name: "Tuesday Tools & Talk", meta: "SMART · Tuesdays 7:30pm · Online",      count: "3 ✓" },
                { name: "Friday Refuge Sit",    meta: "Refuge · Fridays 6:00pm · In-person",   count: "3 ✓" },
                { name: "Thursday Big Book",    meta: "AA · Thursdays 7:00pm · In-person",     count: "2 ✓" },
              ].map((m, i, arr) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-bold text-navy">{m.name}</span>
                    <span className="text-[11px] text-mid">{m.meta}</span>
                  </div>
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ml-3"
                    style={{ background: "var(--teal-10)", color: "var(--teal)" }}
                  >
                    {m.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature 4: Milestones — copy right, preview left on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="lg:order-2">
              <p className="text-[10.5px] uppercase tracking-[1.2px] font-bold text-teal mb-2.5">
                Milestones
              </p>
              <h3
                className="text-[clamp(22px,2.5vw,28px)] font-extrabold text-navy leading-[1.15] mb-3.5"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.4px" }}
              >
                Every day counts. Every milestone matters.
              </h3>
              <p className="text-[15px] text-mid leading-[1.65] mb-4">
                Track your sober date. Celebrate 24 hours, 30 days, 90 days, one year,
                and every anniversary that matters. Let your sponsor or support circle
                celebrate with you — or keep it private.
              </p>
              <ul>
                {[
                  "Automatic milestone tracking from your sober date",
                  "Private celebrations or shared with your sponsor",
                  "Multiple sobriety dates (different substances, different starts)",
                  "Handled with grace if you relapse — start again, no shame",
                ].map((b) => <FeatureBullet key={b} text={b} />)}
              </ul>
            </div>
            <div className="lg:order-1 bg-warm-gray rounded-2xl p-7">
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-border">
                <span className="text-sm font-bold text-navy">Sobriety tracker</span>
                <span className="text-[11.5px] text-mid">Since Dec 17, 2025</span>
              </div>
              <div className="text-center py-5">
                <div
                  className="font-extrabold text-navy leading-none"
                  style={{ fontSize: 64, letterSpacing: "-2px" }}
                >
                  127
                </div>
                <div className="text-[13px] text-mid mt-1 font-semibold">days sober</div>
              </div>
              <div className="bg-white border border-dashed border-border rounded-[10px] px-3.5 py-2.5 text-[12px] text-mid">
                Next milestone: <strong className="text-navy font-bold">180 days</strong> · 53 days to go
                <br />
                <span style={{ color: "#9a9a9a" }}>After that: 1 year on Dec 17, 2026</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Sponsor features ──────────────────────────────────────────── */}
      <section
        className="text-white py-20 px-8"
        style={{ background: "linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 50%, #0a3d66 100%)" }}
      >
        <div className="max-w-[1120px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] uppercase tracking-[1.5px] font-bold text-gold mb-3">
              For sponsors
            </p>
            <h2
              className="text-[clamp(26px,3vw,36px)] font-extrabold text-white mb-3.5 leading-[1.12]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.6px" }}
            >
              Carry the message. Without losing track.
            </h2>
            <p className="text-base text-white/80 max-w-[620px] mx-auto leading-[1.55]">
              Sponsor well across multiple people. Build a program shaped by your own
              recovery. Assign the work. See who&apos;s checking in, who&apos;s stuck,
              and who needs a call today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-11">
            {sponsorFeatures.map((f) => (
              <div
                key={f.name}
                className="rounded-[14px] p-6"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl inline-flex items-center justify-center mb-3.5 text-xl"
                  style={{ background: "rgba(200,155,60,0.18)" }}
                >
                  {f.icon}
                </div>
                <div
                  className="text-base font-bold text-white mb-1.5"
                  style={{ letterSpacing: "-0.2px" }}
                >
                  {f.name}
                </div>
                <div className="text-[13.5px] text-white/70 leading-[1.55]">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/my-recovery"
              className="inline-flex items-center gap-2 font-bold px-7 py-3.5 rounded-xl text-[15px] hover:opacity-90 transition-opacity"
              style={{ background: "var(--gold)", color: "var(--navy-dark)" }}
            >
              Start sponsoring with these tools →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. Testimonials ──────────────────────────────────────────────── */}
      <section className="bg-white py-20 px-8">
        <div className="max-w-[1120px] mx-auto">
          {/*
            Placeholder testimonials — replace with real opt-in quotes from
            Founding Members once they've been using Pro for a few weeks.
            Keep first-name-only attribution and fellowship + role format.
          */}
          <div className="text-center mb-12">
            <p className="text-[11px] uppercase tracking-[1.5px] font-bold text-teal mb-3">
              What members say
            </p>
            <h2
              className="text-[clamp(26px,3vw,36px)] font-extrabold text-navy mb-3.5 leading-[1.12]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.6px" }}
            >
              Real stories from active sponsors and sponsees.
            </h2>
            <p className="text-base text-mid max-w-[620px] mx-auto leading-[1.55]">
              Shared with permission. First names only. Every story opt-in from real
              SoberAnchor members.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-warm-gray rounded-2xl p-6 flex flex-col">
                <p className="text-[15px] text-dark leading-[1.6] mb-[18px] flex-1">
                  <span
                    className="inline-block mr-1"
                    style={{
                      fontSize: 48,
                      lineHeight: 0.3,
                      color: "var(--teal)",
                      fontFamily: "Georgia, serif",
                      verticalAlign: "-10px",
                    }}
                  >
                    &ldquo;
                  </span>
                  {t.quote}
                </p>
                <div className="text-[12.5px] text-mid border-t border-border pt-3">
                  <strong className="text-navy font-bold">{t.name}</strong> — {t.role}
                </div>
              </div>
            ))}
          </div>

          <p
            className="text-center mt-7 text-xs italic"
            style={{ color: "#9a9a9a" }}
          >
            Placeholder testimonials for initial launch — real opt-in quotes replacing these soon.
          </p>
        </div>
      </section>

      {/* ── 5. Trust & Privacy ───────────────────────────────────────────── */}
      <section className="bg-warm-gray py-20 px-8">
        <div className="max-w-[1120px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] uppercase tracking-[1.5px] font-bold text-teal mb-3">
              Trust &amp; privacy
            </p>
            <h2
              className="text-[clamp(26px,3vw,36px)] font-extrabold text-navy mb-3.5 leading-[1.12]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.6px" }}
            >
              Anonymity isn&apos;t a feature. It&apos;s the foundation.
            </h2>
            <p className="text-base text-mid max-w-[620px] mx-auto leading-[1.55]">
              SoberAnchor is built around the traditions that make recovery fellowships
              work. Your identity, your data, and your story are yours.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trustCards.map((c) => (
              <div key={c.name} className="bg-white border border-border rounded-[14px] p-6">
                <div
                  className="w-11 h-11 rounded-xl inline-flex items-center justify-center mb-3.5 text-xl"
                  style={{ background: "rgba(42,138,153,0.1)" }}
                >
                  {c.icon}
                </div>
                <div
                  className="text-[15px] font-bold text-navy mb-1.5"
                  style={{ letterSpacing: "-0.2px" }}
                >
                  {c.name}
                </div>
                <div className="text-[13px] text-mid leading-[1.55]">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Pricing ───────────────────────────────────────────────────── */}
      <section className="bg-white border-t border-border py-20 px-8">
        <div className="max-w-[1120px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] uppercase tracking-[1.5px] font-bold text-teal mb-3">
              Pricing
            </p>
            <h2
              className="text-[clamp(26px,3vw,36px)] font-extrabold text-navy mb-3.5 leading-[1.12]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.6px" }}
            >
              Free for recovery. Pro when you scale.
            </h2>
            <p className="text-base text-mid max-w-[620px] mx-auto leading-[1.55]">
              Everything you need for your own recovery — and your first sponsee — is
              always free. Pro replaces the spreadsheets, handwritten notes, and calendar
              reminders that active sponsors juggle. Every sobriety date, due date, and
              step position, tracked automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[860px] mx-auto">
            {/* Free card */}
            <div className="bg-white border-2 border-border rounded-[20px] p-8">
              <h3
                className="text-xl font-extrabold text-navy mb-1"
                style={{ letterSpacing: "-0.3px" }}
              >
                Free
              </h3>
              <p className="text-[13px] text-mid mb-[18px]">
                Everything you need for your own recovery.
              </p>
              <div
                className="text-[40px] font-extrabold text-navy leading-none mb-1"
                style={{ letterSpacing: "-1px" }}
              >
                $0
                <span className="text-[15px] text-mid font-medium ml-1">
                  /forever for personal use
                </span>
              </div>
              <div className="mb-[22px] h-[18px]" />
              <ul className="mb-[26px]">
                {freeFeatures.map((f) => (
                  <li
                    key={f}
                    className="text-[13.5px] text-dark leading-[1.55] py-2 pl-[26px] relative border-b border-border last:border-b-0"
                  >
                    <span className="absolute left-0.5 top-2 text-teal font-extrabold text-[13px]">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/?auth=signup"
                className="block w-full py-3 rounded-[10px] text-sm font-bold text-center text-navy bg-white hover:bg-navy hover:text-white transition-colors"
                style={{ border: "1.5px solid var(--navy)" }}
              >
                Get started free
              </Link>
            </div>

            {/* Pro card */}
            <div
              className="border-2 border-teal rounded-[20px] p-8 relative"
              style={{ background: "linear-gradient(to bottom, var(--teal-10), #fff)" }}
            >
              <div
                className="absolute text-[10px] uppercase tracking-[1px] font-bold text-white px-3 py-1 rounded-full bg-teal"
                style={{ top: -10, right: 20 }}
              >
                For active sponsors
              </div>
              <h3
                className="text-xl font-extrabold text-navy mb-1"
                style={{ letterSpacing: "-0.3px" }}
              >
                Pro
              </h3>
              <p className="text-[13px] text-mid mb-[18px]">
                Replace the spreadsheets. Stop tracking sobriety dates in your head.
                Keep every sponsee organized in one place.
              </p>
              <div
                className="text-[40px] font-extrabold text-navy leading-none mb-1"
                style={{ letterSpacing: "-1px" }}
              >
                $7
                <span className="text-[15px] text-mid font-medium ml-1">/mo</span>
              </div>
              <div className="text-[12px] text-mid mb-[22px]">or $59/year — save ~30%</div>
              <ul className="mb-[26px]">
                {proFeatures.map((f) => (
                  <li
                    key={f}
                    className="text-[13.5px] text-dark leading-[1.55] py-2 pl-[26px] relative border-b border-border last:border-b-0"
                  >
                    <span className="absolute left-0.5 top-2 text-teal font-extrabold text-[13px]">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/upgrade"
                className="block w-full py-3 rounded-[10px] text-sm font-bold text-center text-white bg-teal hover:opacity-90 transition-opacity"
              >
                Try Pro — 14 day trial
              </Link>
            </div>
          </div>

          <p className="text-center mt-7 text-[13px] text-mid max-w-[640px] mx-auto">
            <strong>Recovery work shouldn&apos;t hit a paywall.</strong>{" "}
            If you&apos;re in recovery and can&apos;t afford Pro, the Free tier gives
            you everything you need to do your own step work, check in daily, track
            meetings, and sponsor one person. Pro exists for sponsors who&apos;ve scaled
            beyond that — and can comfortably pay forward to keep the lights on for
            everyone else.
          </p>
        </div>
      </section>

      {/* ── 7. FAQ ───────────────────────────────────────────────────────── */}
      <section className="bg-warm-gray py-20 px-8">
        <div className="max-w-[1120px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] uppercase tracking-[1.5px] font-bold text-teal mb-3">
              Common questions
            </p>
            <h2
              className="text-[clamp(26px,3vw,36px)] font-extrabold text-navy leading-[1.12]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.6px" }}
            >
              What people ask before signing up.
            </h2>
          </div>

          <div className="max-w-[780px] mx-auto">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="bg-white border border-border rounded-xl px-6 py-5 mb-2.5 group"
              >
                <summary className="flex justify-between items-center cursor-pointer list-none text-navy font-bold text-base">
                  {item.q}
                  <span className="text-teal text-xl font-normal group-open:rotate-45 transition-transform ml-4 flex-shrink-0">
                    +
                  </span>
                </summary>
                <div className="text-sm text-mid leading-relaxed mt-3">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Bottom CTA ────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-navy-dark to-navy text-white text-center py-20 px-8">
        <div className="max-w-[1120px] mx-auto">
          <h2
            className="text-4xl font-extrabold mb-4"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.6px", lineHeight: 1.15 }}
          >
            Start working your program today.
          </h2>
          <p className="text-[17px] text-white/80 max-w-[560px] mx-auto mb-7 leading-[1.55]">
            Free to start. Anonymous by default. Delete anytime. Everything built to
            help you show up to your recovery — one day at a time.
          </p>
          <Link
            href="/?auth=signup"
            className="inline-flex items-center gap-2 bg-teal text-white font-bold px-7 py-3.5 rounded-xl hover:opacity-90 transition-opacity text-[15px]"
          >
            Create your free account →
          </Link>
        </div>
      </section>
    </>
  );
}
