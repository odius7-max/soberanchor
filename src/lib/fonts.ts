import { Literata } from "next/font/google";

/**
 * Editorial display face — homepage hero H1 only in this branch.
 *
 * Exposed as `--font-editorial` and applied by adding `literata.variable` to a
 * wrapper element, so it stays scoped to the surface that opts in. The global
 * `--font-display` alias (77 call sites) is deliberately untouched — see
 * docs/planning/homepage-type-decision.md.
 *
 * `axes: ['opsz']` ships the optical-size axis so call sites can PIN it.
 * Literata's auto optical sizing switches to a high-contrast display drawing at
 * hero sizes that was rejected on review: always set an explicit
 * `font-variation-settings: 'opsz' <42 desktop | 32 mobile>`. Never auto, never >= 60.
 */
export const literata = Literata({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-editorial",
});
