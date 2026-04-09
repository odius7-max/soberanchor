const tiers = [
  {
    icon: "📋",
    title: "Free Listing",
    desc: "Get listed in the directory with basic contact info and a lead capture form.",
    border: "",
  },
  {
    icon: "⭐",
    title: "Enhanced",
    desc: "Photos, verified badge, review responses, and basic analytics.",
    border: "border-teal",
  },
  {
    icon: "🏆",
    title: "Premium",
    desc: "Featured placement, full analytics, event posting, and priority support.",
    border: "border-gold",
  },
];

export default function ForProvidersPage() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-[800px] mx-auto">
        <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">
          For Providers
        </p>
        <h1
          className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.15] mb-3"
          style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
        >
          Reach people actively seeking help.
        </h1>
        <p className="text-mid text-base leading-relaxed max-w-[600px] mb-10">
          SoberAnchor connects treatment centers, sober living homes, and
          recovery professionals with high-intent visitors at the moment they
          need you most.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {tiers.map((t) => (
            <div
              key={t.title}
              className={`bg-white border rounded-[14px] p-6 text-center ${
                t.border || "border-border"
              }`}
            >
              <div className="text-[32px] mb-2">{t.icon}</div>
              <h3 className="text-base font-semibold text-navy mb-1.5">
                {t.title}
              </h3>
              <p className="text-sm text-mid leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-warm-gray rounded-[14px] p-7 max-w-[520px] mx-auto">
          <h3
            className="text-[22px] font-semibold mb-1"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--navy)",
            }}
          >
            Claim or Add Your Listing
          </h3>
          <p className="text-sm text-mid mb-5">
            Tell us about your facility and we&apos;ll get you set up.
          </p>

          {[
            { label: "Facility Name", type: "text", placeholder: "Your facility name" },
            { label: "Your Name", type: "text", placeholder: "Contact name" },
            { label: "Email", type: "email", placeholder: "your@email.com" },
            { label: "Phone", type: "tel", placeholder: "(555) 555-5555" },
          ].map((f) => (
            <div key={f.label} className="mb-4">
              <label className="block text-[13px] font-semibold text-navy mb-1.5">
                {f.label}
              </label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                className="w-full py-2.5 px-3.5 border-[1.5px] border-border rounded-lg text-sm bg-white outline-none focus:border-teal"
              />
            </div>
          ))}

          <label className="block text-[13px] font-semibold text-navy mb-1.5">
            Facility Type
          </label>
          <select className="w-full py-2.5 px-3.5 border-[1.5px] border-border rounded-lg text-sm bg-white outline-none focus:border-teal mb-4">
            <option>Treatment Center / Rehab</option>
            <option>Sober Living Home</option>
            <option>Therapist / Counselor</option>
            <option>Outpatient Program</option>
            <option>Sober Venue / Bar</option>
            <option>Other</option>
          </select>

          <button className="w-full bg-navy text-white font-semibold text-base py-3.5 rounded-xl hover:bg-navy-dark transition-colors mt-1">
            Get Started →
          </button>
        </div>
      </div>
    </section>
  );
}
