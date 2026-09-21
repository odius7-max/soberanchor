# Site copy audit — no-ai-slop detect pass

*Claude, 2026-09-21. Detect mode: each finding names the pattern, quotes the line, and gives the fix in a few words. Nothing has been rewritten. Surfaces: homepage (`page.tsx`), GuidedDiscovery, `/find`, `/fellowships`, `/program`, `/for-providers`, `/resources`, `/our-story`, Footer. Two claims verified against the production database.*

---

## Part 1 — Honesty findings (these outrank style; ODI-79 class)

### H1 · GuidedDiscovery results screen presents fabricated data as personalized results — **worst finding in the sweep**

The step-4 screen says **"Here's what we found for you"** and **"Resources personalized to your situation"** — but everything below is hardcoded: *"AA Meetings — San Diego · 47 meetings this week"*, *"SMART Recovery — San Diego · 8 meetings this week"*, *"Al-Anon Family Groups — San Diego · 12 meetings this week"*, *"San Diego area · Multiple options · Insurance accepted."* The counts are invented, the location is San Diego for every visitor, nothing uses the answers the person just gave, and **"Insurance accepted"** is an unverifiable claim. This screen is shown to a person in crisis who just told us who they are and what they're facing. It also slaps a **"Featured"** badge on a generic browse link — nobody paid for that placement, which undermines the labeled-paid-placement rule the provider pages promise ("Paid visibility lives only in clearly-labeled Featured placements").

Fix: until results are real, the screen must stop claiming personalization — link honestly to `/find`, `/fellowships` (with the family-fellowship link when "loved one" was selected), and crisis lines, with no invented counts, no hardcoded city, no insurance claim, and no Featured badge. The crisis-resources block (SAMHSA, real number) is the one part that's already honest — keep it.

### H2 · /program testimonials are placeholders asserted as real — with an invented quote from a named real person

The section heading: **"Real stories from active sponsors and sponsees."** Subhead: **"Shared with permission. First names only. Every story opt-in from real SoberAnchor members."** Then three fabricated quotes — one attributed to **"Angel J., Sponsor, AA · 4+ years sober"** — followed by a small italic line admitting *"Placeholder testimonials for initial launch — real opt-in quotes replacing these soon."* The footnote doesn't cure the heading; it contradicts it on the same screen. Fabricated endorsements presented as genuine are FTC territory, and putting invented words in Angel's mouth is exactly what the voice rules prohibit.

Fix: remove the section until real opt-in quotes exist. Do not "label it better" — a testimonial section with fake testimonials has no honest version.

### H3 · "Anonymous by default" appears on four surfaces as an absolute claim

Homepage trust line, `/program` hero badge + trust card + FAQ ("Is this really anonymous?"), `/fellowships` bottom CTA ("Free to start, anonymous by default"). Accounts require an email; sponsors see shared activity; server logs exist. The `/program` FAQ answer is actually the honest version (first name + email, private by default, you choose what to share) — the two-word badge is the overclaim. Fix: replace the badge phrase everywhere with the checkable behavior ("First name only — you choose what to share") and keep the FAQ's fuller answer as the canonical statement. Decision needed from Travis on the exact sentence (carried in the Concept B review, question 2).

### H4 · Footer "Legal" links are dead — and the privacy claims have no policy behind them

"Privacy Policy," "Terms of Service," "Contact Support" render as `<span cursor-pointer>` with no href — they look clickable and go nowhere. Meanwhile `/program` promises "encrypted at rest and in transit," "never sell or share your data," "permanent deletion, instantly." A site making privacy promises with a dead Privacy Policy link is a trust contradiction a provider or journalist will notice in ten seconds. Fix: real policy pages (even short honest ones), or remove the dead links until they exist.

### H5 · Verifiable claims — checked against production

- **"11,400+ facilities in the SoberAnchor directory"** (`/for-providers`): **TRUE** — live count 11,412. Keep.
- Homepage resource cards vs. real articles: close but off. Card says *"The First 30 Days: What to Expect"* / DB says *"The First 30 Days Sober: What to Expect"*; card says *"How to Help When Someone You Love Is Struggling"* / DB adds *"…with Alcohol"*; card says *"AA vs. SMART Recovery vs. Other Programs"* / DB says *"AA vs. SMART Recovery: Which Is Right for You?"*. All three cards link to `/resources` generically, not to the article. Fix: render the cards from the DB (title, author, real slug) instead of hardcoding paraphrases.
- `/program` FAQ: **"Permanent deletion happens instantly through Settings — no email to support, no waiting period."** Verify the Settings delete flow actually exists and cascades before this ships anywhere else; if it does, keep — it's the best kind of claim.
- `/program` trust card: **"encrypted at rest and in transit"** — supportable on current infrastructure; keep. The clause **"not a weekend project"** is a style cut (see below).
- `/for-providers` FAQ: **"We'll reply within one business day"** vs. footer CTA **"We typically respond within one business day."** Align on "typically" unless the SLA is real.
- `/for-providers` trust card: **"Built by people in recovery — we've lived it."** Plural. Confirm the "we" is accurate for the team, or make it singular about Angel.

### H6 · Product-preview mockups without an "example" label

Homepage and `/program` hero float check-in/sponsor-dashboard cards with invented names and stats (TJ, Sarah, Marcus, "127 days sober"). They're `aria-hidden` decoration today, but nothing tells a sighted visitor it's illustrative. Concept B's mockup already shows the fix: a small **"Example"** caption. Cheap insurance; apply when each surface is next touched.

---

## Part 2 — Style findings by page (pattern · quote · fix)

### Homepage (`page.tsx`)

- **Binary contrast** · "Built from lived experience, not a boardroom." · Drop the boardroom clause; the Our Story page proves the first half.
- **Forced triplet** · "warm, comprehensive, and judgment-free" · Pick the one that matters or state behaviors.
- **Artificial parallel contrast** · "Whether you're at day one or year five — whether it's you or someone you love — we've got something that can help." · Name the three guides' actual audiences; the cards below already do.
- **Unsupported trust claim** · "Anonymous by default" (trust line) · See H3.
- **Portability** · "Find what you need." (directory band) · Low priority; "What kind of help are you looking for?" (ratified draft) is the stronger replacement and is already planned.

### GuidedDiscovery

- Besides H1: **"That's okay — we'll help you figure it out"** and the step questions are good — plain, kind, concrete. Keep the flow's voice; only the results screen lies.

### `/find`

- Clean. **"We're growing this directory. Try another category above, or search."** is honest and warm — keep. The detox footnote (explains why some facilities won't appear, links the full list) is the best microcopy on the site — it's the pattern the rest should copy.

### `/fellowships`

- Clean overall; the newcomer callout (*"Most newcomers try a few meetings across different fellowships before one clicks. That's normal."*) is exactly the right voice — keep untouched.
- **Unsupported trust claim** · "anonymous by default" (bottom CTA) · See H3.
- **Absolute** · metadata "Compare every major recovery fellowship" · True enough for the majors; fine to keep, noted for completeness.

### `/program`

- **Binary contrast** · "Anonymity isn't a feature. It's the foundation." · State it straight; also see H3.
- **Robotic slogan pair** · "Every day counts. Every milestone matters." · Cut; the tracker mock below carries it.
- **Empty adverb + portability** · "built for how recovery actually works" (hero + metadata) · Cut "actually"; the feature list is the proof.
- **Negative-contrast cliché** · "not from you being the product" · End at "Our revenue comes from the Pro tier."
- **Negative contrast** · "Industry-standard infrastructure, not a weekend project." · End at the encryption fact.
- **Redundant dramatic kicker** · "Never miss the moment when someone needs the call." · The preceding sentence already says exactly this concretely.
- **Fragment** · "Carry the message. Without losing track." · Join: "Carry the message without losing track." ("Carry the message" itself is authentic fellowship language — keep it.)
- Keeps worth protecting: **"Recovery work shouldn't hit a paywall"** paragraph (concrete, generous, human), the relapse FAQ (*"No guilt trip, no scolding copy, no shame"*), "Simple enough for day-one sobriety. Deep enough for the 10-year member still showing up" (contrast construction, but specific and true to audience — earns its shape).

### `/for-providers`

- **Marketing jargon + crisis leverage** · "high-intent visitors at the moment they need you most" · Replace with the page's own later phrasing: "families actively comparing options."
- **Self-award triplet** · "Simple, flat, and honest." · The policies substantiate it, but "honest" as a self-label invites scrutiny; "Flat pricing, no surprises" says it without grading ourselves.
- **Implied social proof** · "Why providers choose SoberAnchor." · Pre-launch there are no paying providers choosing anything; "How we treat providers" is claim-free.
- **Preachy meta** · "We believe that honesty is exactly why they'll trust your listing." · Cut; the policy sentence before it is the substance.
- **Filler stat** · "24/7 — your listing works around the clock" · True of every website; replace with a real number when one exists (never invent one).
- Keeps: the hero ("Families are searching for help. Make sure they find you."), the lead-broker paragraph, the entire FAQ tone, "Founding Partner rates are locked for 12 months" (pending the ODI-80 boundary decision).

### `/resources`

- Clean. Crisis block with real numbers — keep exactly as is.

### `/our-story`

- The body is the most human copy on the site (*"clicking through terrible websites, calling numbers that went to voicemail"*) — protect it from any editing pass. Two items only: confirm Angel wrote/approves the first-person account (voice rule: never invent lived experience — this reads real, but sign-off makes it so), and **negative listing** · "No accounts required. No ads. Just the help you need, when you need it." · Borderline — if this is Angel's cadence, keep; that's her call, not an editor's.

### Footer

- **Unsupportable superlative** · "The definitive resource for anyone whose life is touched by addiction and recovery." · No site is "the definitive"; say what it is: directory + program tools, for you or someone you love.
- **Sentimental filler** · "Built with love for the recovery community." · Harmless; Travis's call. Mild.
- Dead legal links: see H4. The crisis line block with the real SAMHSA number: keep.

---

## Part 3 — Suggested sequence

1. **Now, as small standalone fixes (before/independent of the redesign):** H1 (GuidedDiscovery results screen), H2 (testimonials section), H4 (dead legal links). These are honesty defects on the live site, not style preferences.
2. **With the homepage redesign copy pass:** everything in Part 2 for the homepage, plus H3's replacement sentence once Travis picks it.
3. **Per-page, as each surface gets its stage-2 restyle:** the `/program` and `/for-providers` style items ride along with their redesigns rather than as churn now.
4. **Founder inputs:** Angel's sign-off on the Our Story account; the "we" in "Built by people in recovery."

*What this audit deliberately did not do: rewrite anything, ban recovery vocabulary ("carry the message," "one day at a time," "working a program" all stay), or flag warmth as slop. The best copy on this site — the newcomer callout, the paywall paragraph, Angel's story — is warm AND specific. That's the bar for the new homepage copy too.*
