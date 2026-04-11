const angelYears = Math.floor((Date.now() - new Date('2021-12-04').getTime()) / (365.25 * 24 * 60 * 60 * 1000))

export default function OurStoryPage() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-[720px] mx-auto">
        <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">
          Our Story
        </p>
        <h1
          className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.15] mb-5"
          style={{ fontFamily: "var(--font-display)", color: "var(--navy)" }}
        >
          Built from lived experience.
        </h1>

        <div className="flex gap-6 items-center flex-wrap mb-8">
          <div
            className="w-20 h-20 rounded-full shrink-0 flex items-center justify-center text-4xl"
            style={{
              background: "linear-gradient(135deg, var(--teal), var(--navy))",
            }}
          >
            👩
          </div>
          <div>
            <div
              className="text-[22px] font-semibold"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--navy)",
              }}
            >
              Angel J.
            </div>
            <div className="text-sm text-mid">
              Co-Founder · Recovery Advocate · {angelYears}+ Years Sober
            </div>
          </div>
        </div>

        <article className="text-base text-dark leading-[1.85] space-y-5">
          <p>
            When I got sober, I couldn&apos;t find what I needed in one place.
            Treatment center directories felt clinical and impersonal. Meeting
            finders were outdated. Nobody talked about the sober lifestyle stuff
            — where to go on a Friday night, how to date without drinking, what
            to do when your family doesn&apos;t get it.
          </p>
          <p>
            I spent hours Googling, clicking through terrible websites, calling
            numbers that went to voicemail. And I was just dealing with alcohol.
            I later learned that people facing gambling, eating disorders,
            compulsive behaviors — they had it even worse. Most didn&apos;t even
            know programs existed for their situation.
          </p>
          <p>
            SoberAnchor is the site I wish had existed when I started my
            journey. A single place that feels warm, covers the full spectrum of
            addiction and recovery, and actually helps you find the right
            resource without judgment or jargon.
          </p>
          <p>
            We built this for you, or for someone you love. No accounts
            required. No ads. Just the help you need, when you need it.
          </p>
          <p className="font-medium text-navy">— Angel</p>
        </article>
      </div>
    </section>
  );
}
