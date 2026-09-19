import ProviderAuthButton, { ProviderSignupButton } from "./ProviderAuthButton";
import ClaimScrollButton from "./ClaimScrollButton";
import ClaimSection from "./ClaimSection";
import { PROVIDER_TIERS, tierPricePeriod } from "@/lib/provider-tiers";

const angelYears = Math.floor((Date.now() - new Date('2021-12-04').getTime()) / (365.25 * 24 * 60 * 60 * 1000));

const stats = [
  { value: "11,400+", label: "facilities in the SoberAnchor directory" },
  { value: "100%", label: "flat pricing — never per-lead, never per-call" },
  { value: "24/7", label: "your listing works around the clock" },
];

const steps = [
  {
    n: "1",
    title: "Claim your listing — free",
    desc: "Find your facility in our directory and verify ownership. Claiming protects your listing from unauthorized changes and puts you in control of your information.",
  },
  {
    n: "2",
    title: "Complete your profile",
    desc: "Update your description, hours, contact information, and photos. Accurate listings build trust with the families comparing their options.",
  },
  {
    n: "3",
    title: "Upgrade when you're ready to grow",
    desc: "Enhanced adds your full gallery, branding, and inquiry capture. Premium adds clearly-labeled Featured placement. Flat monthly pricing, cancel anytime.",
  },
];

// The ladder itself lives in @/lib/provider-tiers so this page and every
// dashboard/admin surface quote the same prices and features. Only the visual
// accent is page-specific.
const TIER_ACCENTS: Record<string, string> = {
  basic: "var(--teal)",
  enhanced: "var(--gold)",
  premium: "var(--navy)",
};

const tiers = PROVIDER_TIERS.map((t) => ({
  name: t.name,
  price: t.price === 0 ? "Free" : `$${t.price}`,
  period: tierPricePeriod(t),
  accent: TIER_ACCENTS[t.id],
  tagline: t.tagline,
  features: t.features,
  footnote: t.footnote,
}));

const providerTypes = [
  { icon: "🏥", title: "Treatment centers", desc: "Inpatient, outpatient, detox, and residential programs" },
  { icon: "🏠", title: "Sober living homes", desc: "Transitional housing and recovery residences" },
  { icon: "💆", title: "Therapists & counselors", desc: "Addiction specialists, dual-diagnosis, family therapy" },
  { icon: "🍹", title: "Sober venues", desc: "Alcohol-free bars, cafes, and event spaces" },
  { icon: "💊", title: "Outpatient & telehealth", desc: "IOP programs and virtual treatment options" },
  { icon: "🎰", title: "Specialized programs", desc: "Gambling, eating disorders, behavioral health" },
];

const trustItems = [
  { icon: "⚖️", title: "Flat pricing, always", desc: "We never charge per lead, per call, or per admission — and we never sell inquiries. Your subscription is a flat monthly rate, full stop." },
  { icon: "🎯", title: "Ranking is never for sale", desc: "Organic search results are ordered by relevance and data quality — never by who pays. Paid visibility lives only in clearly-labeled Featured placements." },
  { icon: "❤️", title: "Built by people in recovery", desc: `We understand the space because we've lived it. SoberAnchor was founded by Angel J., ${angelYears}+ years sober.` },
  { icon: "🔒", title: "No contracts", desc: "Month-to-month on all upgrades. Cancel anytime and keep your free claimed listing." },
];

const faqs = [
  {
    q: "Is claiming my listing really free?",
    a: "Yes, permanently. Claiming is free forever — no trial period, no credit card, no surprise charges. You get the Claimed badge, full editing access, photos, and monthly view stats at no cost. It also protects your listing from unauthorized changes.",
  },
  {
    q: "Do you charge per lead or sell inquiries?",
    a: "Never. Our paid tiers are flat monthly subscriptions. When a family submits an inquiry through an Enhanced or Premium listing, it goes directly to your facility — and only to your facility. We do not sell, share, or broker inquiries, and we never charge referral fees of any kind.",
  },
  {
    q: "Does paying improve our search ranking?",
    a: "No — and we publish that policy. Organic results are ordered by relevance and data quality, never by payment. Premium buys clearly-labeled Featured placement in a separate band, so families always know what's sponsored and what isn't. We believe that honesty is exactly why they'll trust your listing.",
  },
  {
    q: "How does inquiry capture work?",
    a: "Enhanced and Premium listings include a callback-request form. When a visitor submits it, their information goes directly to you by email. You handle the follow-up — SoberAnchor never sits between you and the family. On every tier, including free, your real phone number and website are displayed prominently.",
  },
  {
    q: "How do you verify claims?",
    a: "We verify ownership through a domain-matched email address, a callback to your publicly listed phone number, or licensure documentation. Verification protects your facility and the families relying on accurate information.",
  },
  {
    q: "What if my facility isn't listed yet?",
    a: "Use the form on this page — it opens a pre-filled email in your mail app for you to send. We'll reply within one business day of receiving it to verify your details and get your listing added.",
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
            <ProviderSignupButton />
            <ProviderAuthButton />
          </div>
          <p className="text-[13px] text-mid">
            Flat pricing. Never per-lead. Cancel upgrades anytime.
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
            A directory families can trust — and providers can afford.
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
            Rehab keywords are among the most expensive clicks on the internet, and lead brokers in
            this industry have earned its worst headlines. SoberAnchor takes the other path: a
            complete, honest directory where your listing is found by families actively comparing
            options — and where your costs are flat, predictable, and never tied to a person seeking help.
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
            Three steps to a listing that works for you.
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

      {/* ── Pricing tiers ── */}
      <section className="bg-off-white py-[72px] px-6">
        <div className="max-w-[1120px] mx-auto">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2 text-center">
            Pricing
          </p>
          <h2
            className="text-[clamp(26px,3vw,36px)] font-semibold leading-[1.2] mb-3 text-center"
            style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-0.75px" }}
          >
            Simple, flat, and honest.
          </h2>
          <p className="text-[15px] text-mid text-center max-w-[560px] mx-auto mb-10">
            Founding Partner rates are locked for 12 months. Outpatient-only programs receive 50% off all paid tiers.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {tiers.map((t) => (
              <div key={t.name} className="card-hover bg-white rounded-[14px] border border-border overflow-hidden">
                <div className="p-7" style={{ borderLeft: `4px solid ${t.accent}` }}>
                  <h3
                    className="text-xl font-semibold mb-1"
                    style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
                  >
                    {t.name}
                  </h3>
                  <div className="mb-1">
                    <span
                      className="text-[34px] font-semibold"
                      style={{ fontFamily: "var(--font-display)", color: "var(--navy)", letterSpacing: "-1px" }}
                    >
                      {t.price}
                    </span>
                    <span className="text-[13px] text-mid ml-1">{t.period}</span>
                  </div>
                  <p className="text-sm font-semibold text-teal mb-5">{t.tagline}</p>
                  <ul className="space-y-3">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-dark">
                        <span className="font-bold mt-0.5 shrink-0" style={{ color: t.accent }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[12px] text-mid mt-6 pt-5 border-t border-border">
                    {t.footnote}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-mid text-center mt-8 max-w-[640px] mx-auto">
            Every listing — free or paid — always shows your facility&apos;s real phone number, website,
            and SAMHSA-sourced services. Paid tiers add presentation and reach, never access to facts.
          </p>
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
            Claim your free listing today, or reach out to learn about Enhanced and Premium.
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
