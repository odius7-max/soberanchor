import Image from "next/image";
import Link from "next/link";
import { literata } from "@/lib/fonts";
import DiscoveryButton from "./DiscoveryButton";

/**
 * Full-bleed homepage hero — implements docs/planning/hero-fullbleed-comp.html
 * (amber CTA variant, tree-path photograph). Composition, geometry and colors
 * are taken from that comp; the comp's image/CTA picker bars are review
 * apparatus and deliberately not reproduced.
 *
 * Tokens here are scoped to this section on purpose: --font-editorial comes in
 * via `literata.variable`, and --cta/--cta-ink/--cta-hover are set inline.
 * Nothing is added to the global :root token set.
 */

const CREAM = "#FAF7F2";

/**
 * The comp shadows the H1 and the subhead but leaves the 13.5px trust line and the
 * discovery hint bare — they sit over the bright leaf litter in the lower third and
 * measured 1.8–3.5:1 there. Same navy-glow idiom, tighter radius. The ratified scrim
 * and every ratified color are untouched; see the handoff note on residual contrast.
 */
const SMALL_TEXT_SHADOW = "0 1px 3px rgba(11,47,74,0.95), 0 0 12px rgba(11,47,74,0.8)";
// Declared in the scoped style block below, the way the comp declares it, so the ring
// stays one rule shared by every hero control instead of four utility strings.
const FOCUS_RING = "sa-hero-focus";

export default function HomeHero({ facilityCount }: { facilityCount: number }) {
  return (
    <section
      className={`${literata.variable} relative isolate overflow-hidden grid grid-cols-[minmax(0,1fr)] items-center min-h-[min(88svh,760px)] pt-[72px] pb-[84px] px-5`}
      style={
        {
          "--cta": "#D9A441",
          "--cta-ink": "#2A1F0F",
          "--cta-hover": "#C89334",
        } as React.CSSProperties
      }
    >
      {/*
        The optical-size pin is a hard rule (docs/planning/homepage-type-decision.md):
        Literata's auto optical sizing switches to a rejected high-contrast display
        cut at hero sizes. 42 desktop / 32 mobile, never auto, never >= 60. A media
        query is the only way to express it, so it lives here rather than inline.
      */}
      <style>{`
        .sa-hero-h1 { font-optical-sizing: none; font-variation-settings: 'opsz' 32; }
        @media (min-width: 701px) { .sa-hero-h1 { font-variation-settings: 'opsz' 42; } }
        .sa-hero-focus:focus-visible,
        .sa-hero-search:focus-within { outline: 3px solid #7FD4C1; outline-offset: 3px; }
        /*
          ODI-102. The copy column is inset to the site's content container — the same
          max-w-[1120px] box and 24px gutter Nav uses — so the headline starts on the nav
          logo's vertical instead of drifting to the viewport edge as the window widens.
          50% is of this grid item's containing block, i.e. the section's content box
          (viewport minus the section's 2×20px padding), so 50% - 536px resolves to the
          container's left gutter measured from that box's own left edge.
          max() keeps the comp's original clamp wherever the clamp is the larger of the
          two — every width up to ~1264px — so 1024 and below, mobile included, stay
          pixel-identical, and nothing ever moves left of where it sits today.
          A media query can't express this (the crossover is continuous) and a Tailwind
          arbitrary value can't hold the spaces max() needs, so it lives here.
        */
        .sa-hero-copy { padding-left: max(clamp(4px, 6vw, 90px), 50% - 536px); }
      `}</style>

      {/* Decorative: the photograph carries no information the copy doesn't. */}
      <Image
        src="/hero-tree-lined-path.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[68%_center] min-[701px]:object-[right_center]"
      />

      {/*
        Scrim — vertical on mobile, raking left-to-right on desktop, per the comp.
        Opacity stops raised from the comp's originals per the gate audit
        (docs/audits/homepage-hero-4a40813-gate.md, check 3): the comp's values left
        the subhead and trust line at 2.94–4.14:1 over bright image detail. These exact
        stops were browser-trialed to a 6.45:1 sampled minimum with the walkers still
        visible. Gradient stops only — every other ratified value is unchanged.
      */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 min-[701px]:hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,47,74,0.80) 0%, rgba(11,47,74,0.78) 55%, rgba(14,58,91,0.76) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 hidden min-[701px]:block"
        style={{
          background:
            "linear-gradient(100deg, rgba(11,47,74,0.86) 0%, rgba(11,47,74,0.80) 46%, rgba(14,58,91,0.74) 78%, rgba(14,58,91,0.66) 100%)",
        }}
      />

      {/*
        Two boxes so the comp's geometry survives border-box: the outer one carries the
        left inset (.sa-hero-copy above — the site content container's gutter), the inner
        one caps the copy at 680px inside it. min-w-0 (plus the section's
        grid-cols-[minmax(0,1fr)]) stops the column being sized by its min-content and
        overflowing narrow viewports.
      */}
      <div className="sa-hero-copy relative min-w-0 text-left">
        <div className="max-w-[680px]">
          <div
            aria-hidden
            className="w-11 h-[3px] rounded-[2px] mb-[26px]"
            style={{ background: "#C97B4F" }}
          />

          <h1
            className="sa-hero-h1 text-[clamp(34px,5.4vw,64px)] leading-[1.1] tracking-[-0.025em] text-balance m-0"
            style={{
              fontFamily: "var(--font-editorial), Georgia, serif",
              fontWeight: 500,
              color: CREAM,
              textShadow: "0 2px 24px rgba(11,47,74,0.45)",
            }}
          >
            From finding treatment to tracking your recovery.
          </h1>

          <p
            className="text-[clamp(15.5px,1.5vw,18.5px)] leading-[1.6] max-w-[560px] mt-5"
            style={{
              color: "rgba(250,247,242,0.94)",
              textShadow: "0 1px 12px rgba(11,47,74,0.5)",
            }}
          >
            SoberAnchor is a free treatment center directory for yourself or
            someone you love — and a private home for check-ins, milestones,
            step work, and the meetings you attend, whether you&apos;re working
            a program, counting days, or sponsoring someone who is.
          </p>

          {/* Primary act. Plain GET so the query lands on /find?q=…#results. */}
          <form
            action="/find#results"
            method="GET"
            role="search"
            aria-label="Search treatment centers"
            className="sa-hero-search flex max-w-[500px] mt-7 rounded-[10px] overflow-hidden"
            style={{
              background: CREAM,
              boxShadow: "0 8px 28px rgba(11,47,74,0.3)",
            }}
          >
            <input
              type="search"
              name="q"
              placeholder="City, state, or facility name"
              aria-label="City, state, or facility name"
              maxLength={100}
              className="w-0 flex-1 min-w-0 border-0 bg-transparent px-[18px] py-[15px] text-[15px] leading-none focus:outline-none"
              style={{ color: "#10344E" }}
            />
            <button
              type="submit"
              className={`border-0 px-6 text-[15px] font-semibold leading-none cursor-pointer bg-[var(--cta)] text-[var(--cta-ink)] hover:bg-[var(--cta-hover)] transition-colors ${FOCUS_RING}`}
            >
              Search
            </button>
          </form>

          <DiscoveryButton
            className={`mt-2.5 text-[13.5px] underline underline-offset-4 decoration-[rgba(250,247,242,0.5)] hover:decoration-[rgba(250,247,242,0.9)] rounded-[2px] ${FOCUS_RING}`}
          >
            <span style={{ color: "rgba(250,247,242,0.82)", textShadow: SMALL_TEXT_SHADOW }}>
              Not sure where to start?
            </span>
          </DiscoveryButton>

          <div className="flex flex-wrap gap-3 mt-[18px]">
            <Link
              href="/find#results"
              className={`h-11 px-[22px] rounded-lg inline-flex items-center justify-center gap-1.5 text-[15px] font-semibold tracking-[0.01em] no-underline max-[700px]:flex-[1_1_100%] bg-[var(--cta)] text-[var(--cta-ink)] hover:bg-[var(--cta-hover)] transition-colors ${FOCUS_RING}`}
              style={{ boxShadow: "0 2px 10px rgba(11,47,74,0.35)" }}
            >
              Find treatment near me <span aria-hidden>→</span>
            </Link>
            <Link
              href="/program"
              className={`h-11 px-[22px] rounded-lg inline-flex items-center justify-center gap-1.5 text-[15px] font-semibold tracking-[0.01em] no-underline max-[700px]:flex-[1_1_100%] border hover:bg-[#0E3A5B] transition-colors ${FOCUS_RING}`}
              style={{
                color: CREAM,
                background: "rgba(14,58,91,0.85)",
                borderColor: "rgba(250,247,242,0.25)",
              }}
            >
              Explore recovery tools <span aria-hidden>→</span>
            </Link>
          </div>

          <p
            className="text-[13.5px] mt-4"
            style={{ color: "rgba(250,247,242,0.82)", textShadow: SMALL_TEXT_SHADOW }}
          >
            Free to browse — no account needed
            {facilityCount > 0 &&
              ` · ${facilityCount.toLocaleString("en-US")}+ treatment centers listed`}
          </p>
        </div>
      </div>
    </section>
  );
}
