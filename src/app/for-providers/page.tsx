import ProviderAuthButton from "./ProviderAuthButton";
import ClaimScrollButton from "./ClaimScrollButton";
import ClaimSection from "./ClaimSection";

const angelYears = Math.floor((Date.now() - new Date('2021-12-04').getTime()) / (365.25 * 24 * 60 * 60 * 1000));

const stats = [
  { value: "3-5x", label: "higher conversion rate than paid search" },
  { value: "$40-80", label: "average cost per click for rehab keywords on Google" },
  { value: "24/7", label: "your listing works around the clock" },
];

const steps = [
  {
    n: "1",
    title: "Claim your listing",
    desc: "Find your facility in our directory and verify ownership. If you're not listed yet, add your facility in minutes.",
  },
  {
    n: "2",
    title: "Complete your profile",
    desc: "Add your description, services, insurance accepted, photos, and contact information. The more complete your profile, the more inquiries you'll receive.",
  },
  {
    n: "3",
    title: "Start receiving leads",
    desc: "When families submit a contact request through your listing, it goes directly to you. No middleman. No fulfillment on our end.",
  },
];

const freeFeatures = [
  "Listed in the SoberAnchor directory",
  "Lead capture form on your listing page",
  "Phone number and contact info displayed",
  "Edit your description, services, and hours",
  "Up to 3 facility photos",
  "Appear in search results and guided discovery flow",
  "Insurance accepted badges",
];

const proFeatures = [
  "Unlimited photos and video tours",
  "Verified badge — builds trust with families",
  "Lead analytics — see who's viewing your listing",
  "Featured placement in search results",
  "Priority positioning in your market",
  "Respond to reviews publicly",
  "Post events and open house announcements",
  "Dedicated account support",
];

const providerTypes = [
  { icon: "🏥", title: "Treatment centers", desc: "Inpatient, outpatient, detox, and residential programs" },
  { icon: "🏠", title: "Sober living homes", desc: "Transitional housing and recovery residences" },
  { icon: "💆", title: "Therapists & counselors", desc: "Addiction specialists, dual-diagnosis, family therapy" },
  { icon: "🍹", title: "Sober venues", desc: "Alcohol-free bars, cafes, and event spaces" },
  { icon: "💊", title: "Outpatient & telehealth", desc: "IOP programs and virtual treatment options" },
  { icon: "🎰", title: "Specialized programs", desc: "Gambling, eating disorders, behavioral health" },
];

const trustItems = [
  { icon: "🔒", title: "No contracts", desc: "Month-to-month on all upgrades. Cancel anytime, keep your free listing." },
  { icon: "🎯", title: "Qualified leads", desc: "Every inquiry comes from a real person or family actively seeking treatment — not bots, not purchased lists." },
  { icon: "❤️", title: "Built by people in recovery", desc: `We understand the space because we've lived it. SoberAnchor was founded by Angel J., ${angelYears}+ years sober.` },
  { icon: "📊", title: "Full transparency", desc: "See exactly what your listing is doing. No black boxes, no mystery metrics." },
];

const faqs = [
  {
    q: "Is claiming my listing really free?",
    a: "Yes, permanently. Claiming your listing is free forever — no trial period, no credit card required, no surprise charges. You get a lead capture form, contact info display, photos, and full editing access at no cost.",
  },
  {
    q: "What if my facility isn't listed yet?",
    a: "No problem. You can add your facility directly through the claim form. We'll verify your information and have you live in the directory within 24 hours.",
  },
  {
    q: "How do leads work?",
    a: "When a visitor fills out the contact form on your listing, their information goes directly to you via email. You handle the follow-up. SoberAnchor does not do any fulfillment or sit between you and the potential patient.",
  },
  {
    q: "What's the difference between free and paid tiers?",
    a: "The free claimed listing gives you everything you need to receive leads. Paid upgrades add visibility features like featured placement, verified badges, analytics, and unlimited media — tools that help you stand out in competitive markets.",
  },
  {
    q: "Can I remove my listing?",
    a: "Yes. Contact us and we'll remove your listing within 48 hours. No questions asked.",
  },
  {
    q: "What types of facilities can list?",
    a: "Treatment centers, sober living homes, therapists, counselors, outpatient programs, telehealth providers, sober venues, and any professional serving the recovery community.",
  },
];

export default function ForProvidersPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="py-[80px] px-6 text-center">
        <div className="max-w-[680px] mx-auto">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-3">
            For Providers
          </p>
          <h1
            className="text-[clamp(34px,5vw,52px)] font-semibold leading-[1.1] mb-5"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-1.5px" }}
          >
            Families are searching for help. Make sure they find you.
          </h1>
          <p className="text-[17px] text-mid leading-[1.7] mb-8 max-w-[560px] mx-auto">
            SoberAnchor connects treatment centers, sober living homes, therapists, and recovery
            professionals with high-intent visitors at the moment they need you most.
          </p>
          <div className="flex gap-3 justify-center flex-wrap mb-4">
            <ClaimScrollButton className="bg-navy text-white font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-navy-dark transition-colors">
              Claim your listing — free forever
            </ClaimScrollButton>
            <ProviderAuthButton />
          </div>
          <p className="text-[13px] text-mid">
            No contracts. No hidden fees. Cancel upgrades anytime.
          </p>
        </div>
      </section>

      {/* ── Value proposition ── */}
      <section className="bg-off-white py-[72px] px-6">
        <div className="max-w-[1120px] mx-auto">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2 text-center">
            Why SoberAnchor
          </p>
          <h2
            className="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.2] mb-10 text-center"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.75px" }}
          >
            Better leads. Less spend. Real results.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {stats.map((s) => (
              <div key={s.value} className="card-hover bg-warm-gray border border-border rounded-[14px] p-8 text-center">
                <div
                  className="text-[clamp(40px,5vw,56px)] font-semibold leading-none mb-3"
                  style={{ fontFamily: "var(--font-display)", color: "var(--teal)", letterSpacing: "-1.5px" }}
                >
                  {s.value}
                </div>
                <div className="text-sm text-mid leading-relaxed">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-[15px] text-mid leading-[1.8] max-w-[720px] mx-auto text-center">
            Treatment facilities spend thousands on Google Ads for clicks that rarely convert.
            Directory leads are different — they come from families actively comparing options with
            genuine intent to seek treatment. No click fraud. No wasted spend. Just real people
            looking for real help.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-[72px] px-6">
        <div className="max-w-[1120px] mx-auto">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2 text-center">
            How It Works
          </p>
          <h2
            className="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.2] mb-12 text-center"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.75px" }}
          >
            Three steps to start receiving leads.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4"
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
        </div>
      </section>

      {/* ── What you get ── */}
      <section className="bg-off-white py-[72px] px-6">
        <div className="max-w-[1120px] mx-auto">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2 text-center">
            What&apos;s Included
          </p>
          <h2
            className="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.2] mb-10 text-center"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.75px" }}
          >
            Everything you need to connect with families seeking care.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free card */}
            <div className="card-hover bg-white rounded-[14px] border border-border overflow-hidden">
              <div className="border-l-4 border-teal p-7">
                <h3
                  className="text-xl font-semibold mb-5"
                  style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
                >
                  Claimed listing <span className="text-teal">(free forever)</span>
                </h3>
                <ul className="space-y-3">
                  {freeFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-dark">
                      <span className="text-teal font-bold mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="text-[12px] text-mid mt-6 pt-5 border-t border-border">
                  Free. No credit card required. No time limit.
                </p>
              </div>
            </div>

            {/* Pro card */}
            <div className="card-hover bg-white rounded-[14px] border border-border overflow-hidden">
              <div className="border-l-4 border-gold p-7">
                <h3
                  className="text-xl font-semibold mb-5"
                  style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
                >
                  Pro &amp; Premium upgrades
                </h3>
                <ul className="space-y-3">
                  {proFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-dark">
                      <span className="font-bold mt-0.5 shrink-0" style={{ color: "var(--gold)" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="text-[12px] text-mid mt-6 pt-5 border-t border-border">
                  Contact us for pricing tailored to your facility and market.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who this is for ── */}
      <section className="py-[72px] px-6">
        <div className="max-w-[1120px] mx-auto">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2 text-center">
            Who We Serve
          </p>
          <h2
            className="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.2] mb-10 text-center"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.75px" }}
          >
            Built for every type of recovery provider.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {providerTypes.map((p) => (
              <div key={p.title} className="card-hover bg-warm-gray border border-border rounded-[14px] p-6">
                <div className="text-[32px] mb-3">{p.icon}</div>
                <div className="text-base font-semibold text-navy mb-1">{p.title}</div>
                <div className="text-sm text-mid leading-relaxed">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust signals ── */}
      <section className="bg-off-white py-[72px] px-6">
        <div className="max-w-[1120px] mx-auto">
          <h2
            className="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.2] mb-10 text-center"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.75px" }}
          >
            Why providers choose SoberAnchor.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[820px] mx-auto">
            {trustItems.map((t) => (
              <div key={t.title} className="card-hover bg-white border border-border rounded-[14px] p-6 flex gap-4">
                <span className="text-[28px] shrink-0 mt-0.5">{t.icon}</span>
                <div>
                  <div className="text-base font-semibold text-navy mb-1">{t.title}</div>
                  <div className="text-sm text-mid leading-relaxed">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-[72px] px-6">
        <div className="max-w-[720px] mx-auto">
          <h2
            className="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.2] mb-8 text-center"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.75px" }}
          >
            Common questions
          </h2>
          <div className="space-y-2">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="bg-warm-gray border border-border rounded-[12px] overflow-hidden group"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none font-semibold text-navy text-[15px] select-none hover:bg-white transition-colors">
                  {faq.q}
                  <span className="text-teal text-lg ml-4 shrink-0 transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="px-6 pb-5 text-sm text-mid leading-relaxed border-t border-border pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <ClaimSection />

      {/* ── Footer CTA ── */}
      <section
        className="py-[80px] px-6 text-center"
        style={{ background: "linear-gradient(135deg, var(--navy) 0%, #1a4a5e 100%)" }}
      >
        <div className="max-w-[620px] mx-auto">
          <h2
            className="text-[clamp(28px,3.5vw,42px)] font-semibold leading-[1.15] mb-4 text-white"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-1.0px" }}
          >
            Ready to reach families who need you?
          </h2>
          <p className="text-[17px] leading-[1.7] mb-8" style={{ color: "rgba(255,255,255,0.6)" }}>
            Claim your free listing today, or reach out to learn about Pro and Premium options.
          </p>
          <div className="flex gap-3 justify-center flex-wrap mb-6">
            <ClaimScrollButton className="bg-teal text-white font-semibold text-base px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity">
              Claim your listing
            </ClaimScrollButton>
            <a
              href="mailto:providers@soberanchor.com"
              className="border-2 border-white text-white font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              Contact us
            </a>
          </div>
          <a
            href="mailto:providers@soberanchor.com"
            className="font-semibold text-base hover:underline"
            style={{ color: "var(--gold)" }}
          >
            providers@soberanchor.com
          </a>
          <p className="text-[13px] mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            We typically respond within one business day.
          </p>
        </div>
      </section>
    </>
  );
}
