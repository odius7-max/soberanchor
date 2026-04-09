const articles = [
  {
    badge: "Early Recovery",
    title: "The First 30 Days: What to Expect",
    desc: "An honest, personal guide to the hardest and most rewarding month of your life. No sugarcoating, no clinical jargon.",
    author: "Angel Johnson",
    time: "6 min",
  },
  {
    badge: "Supporting Someone",
    title: "How to Help When Someone You Love Is Struggling",
    desc: "A compassionate guide for families and friends navigating addiction — what to say, what not to say, and how to take care of yourself.",
    author: "SoberAnchor Team",
    time: "8 min",
  },
  {
    badge: "Program Explainer",
    title: "AA vs. SMART Recovery: Which Is Right for You?",
    desc: "A side-by-side comparison of the two most popular recovery programs — philosophy, structure, and what to expect at your first meeting.",
    author: "SoberAnchor Team",
    time: "10 min",
  },
  {
    badge: "Understanding Addiction",
    title: "What Is Process Addiction? A Guide Beyond Substances",
    desc: "Gambling, eating, sex, shopping — why behavioral addictions are real, how they work, and what help exists.",
    author: "SoberAnchor Team",
    time: "7 min",
  },
];

const pillars = [
  "All",
  "Getting Help",
  "Understanding Addiction",
  "Supporting Someone",
  "Life in Recovery",
  "Sober Lifestyle",
  "Program Explainers",
];

export default function ResourcesPage() {
  return (
    <section className="pt-12 px-6 pb-16">
      <div className="max-w-[1120px] mx-auto">
        <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">
          Resources
        </p>
        <h1
          className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.15] mb-2.5"
          style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
        >
          Guides, articles &amp; expert advice.
        </h1>
        <p className="text-mid text-base leading-relaxed max-w-[600px] mb-8">
          Real talk about recovery — written by people who&apos;ve been there.
        </p>

        <div className="flex gap-2 flex-wrap mb-7">
          {pillars.map((p, i) => (
            <span
              key={p}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium cursor-pointer transition-all ${
                i === 0
                  ? "bg-navy text-white border border-navy"
                  : "bg-warm-gray border border-border text-dark hover:bg-navy hover:text-white hover:border-navy"
              }`}
            >
              {p}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {articles.map((a) => (
            <div
              key={a.title}
              className="bg-white border border-border rounded-[14px] p-7 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <span className="inline-block bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-medium rounded-full px-3 py-1 mb-2.5">
                {a.badge}
              </span>
              <h3
                className="text-[22px] font-semibold mb-2"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--navy)",
                }}
              >
                {a.title}
              </h3>
              <p className="text-sm text-mid leading-relaxed mb-3">{a.desc}</p>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-mid">
                  {a.author} · {a.time}
                </span>
                <span className="text-teal font-semibold text-sm">Read →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
