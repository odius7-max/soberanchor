# SOBERANCHOR.COM — Project Brief
## Last Updated: April 6, 2026

---

## ⚠️ IMPORTANT: This document supersedes all earlier wireframes and planning docs.
The original wireframes (Find/Recover/Connect/Learn/Shop with user accounts, sobriety tracker, community feed) have been replaced by the strategy below. If you have earlier context, ignore it in favor of this document.

---

## 1. WHAT IS SOBERANCHOR?

SoberAnchor.com is a **directory-first platform** — the definitive online hub for anyone whose life is touched by addiction and recovery. It covers the **full spectrum** of substances, behaviors, and compulsions — not just alcohol and drugs.

### What it IS:
- A vertical search and directory platform (think Autotrader/KBB for recovery)
- A guided discovery tool that helps people who don't know what they need find the right resources
- A comprehensive directory: treatment centers, sober living, meetings (AA through OSPA and beyond), therapists, sober venues, events
- An SEO-driven content authority for every recovery-related search query
- A lead generation engine connecting visitors with recovery facilities (primary revenue)
- A trusted brand built on Angel's authentic recovery story

### What it is NOT:
- Not a social network or community platform requiring daily engagement
- Not a sobriety tracking app (that's Soberthdays — a separate companion product)
- Not limited to alcohol — serves the full addiction/compulsive behavior spectrum
- Not clinical or institutional in tone — warm, human, judgment-free
- Not a merch store — Shop exists but is tertiary

### Usage Model:
People arrive with high intent ("find a sober living home near me"), get their answer, and leave. Like Cox Automotive or Zillow — high-intent, low-frequency traffic. No user accounts required for V1. No login walls. No engagement loops on the website.

---

## 2. KEY STRATEGIC INSIGHTS

### Insight 1: The most valuable audience isn't the person in recovery.
It's the people around them — the spouse, parent, friend, employer Googling at 2am. They're highly motivated, emotionally invested, and often the person choosing and paying for treatment. SoberAnchor serves both audiences.

### Insight 2: Addiction is a spectrum.
Beyond AA and NA, dozens of fellowships and treatment modalities exist for gambling, eating disorders, sex addiction, compulsive behaviors, and more. Most people don't know what's available. SoberAnchor bridges that knowledge gap.

### Insight 3: The directory must be organized by PROBLEM, not by PROGRAM.
Users don't search for "NA meeting" — they search "my son is addicted to pills" or "help for gambling problem." They don't know the acronyms. The guided discovery flow solves this.

---

## 3. TARGET AUDIENCES

### Consumer:
- **People exploring recovery or early in their journey** — may not identify as "addicted" yet, need inclusive language
- **Family, friends & support networks** — often the first to search, frequently the decision-maker/payer for treatment, highest-value leads
- **People in sustained recovery** — sober lifestyle resources, venues, events; natural cross-sell to Soberthdays

### B2B (Revenue Side):
- Treatment centers and rehab facilities (primary lead buyers)
- Sober living home operators
- Specialized treatment: eating disorder clinics, gambling programs, sex addiction specialists
- Therapists and counselors
- Sober venue owners
- Outpatient and telehealth providers

---

## 4. REVENUE MODEL

### Primary: Recovery Center Lead Generation
- "Contact This Facility" / "Request Info" forms on listing detail pages
- Lead value: $50–200+ per qualified lead
- Key form fields: First name, phone, insurance provider, what they're seeking, who is this for (myself/loved one)
- Trust signals near form: "Your information is confidential." SAMHSA helpline as alternative.
- Zero fulfillment — lead routes directly to facility

### Secondary: Featured Listings & Premium Placement
- Tiered listing model: Basic (free) → Enhanced → Premium
- Premium gets: featured badge, top placement, photos, verified badge, analytics, review responses, event posting

### Tertiary: Contextual Merch & Soberthdays Cross-Sell
- Products surface contextually, not as primary nav
- Soberthdays app drives its own revenue

---

## 5. SITE ARCHITECTURE

### Primary Navigation:
```
Find  |  Resources  |  Our Story
```
- "For Providers" as utility nav (top-right or footer)
- Shop, Legal, SAMHSA, Socials in footer

### Full Site Map:
```
SOBERANCHOR.COM (no login required)
│
├── HOME
│   ├── Guided Discovery Flow entry ("I need help" / "Someone I love needs help")
│   ├── Direct search bar (for users who know what they want)
│   ├── Featured content teasers
│   ├── Angel's Story callout
│   └── Trust signals
│
├── FIND (Unified Directory)
│   ├── Treatment Centers ← lead gen
│   ├── Sober Living Homes ← lead gen
│   ├── Therapists/Counselors ← lead gen
│   ├── Meetings (ALL fellowship types — see taxonomy)
│   ├── Sober Bars & Venues
│   ├── Sober Events
│   └── Detail Pages (each with Contact CTA / lead capture)
│
├── RESOURCES (Content/SEO Hub)
│   ├── Blog/Articles (organized by content pillars)
│   ├── Guides (Getting Sober, Early Recovery, Supporting Someone, etc.)
│   ├── Program Explainers ("What is SMART Recovery?" "How does Al-Anon work?")
│   ├── Video Library
│   └── Crisis Resources & Hotlines
│
├── OUR STORY
│   └── Angel's recovery journey, mission, team
│
├── SHOP (minimal nav presence)
│   └── Links to Shopify/Soberthdays store, contextual placement only
│
├── FOR PROVIDERS (B2B — separate from consumer UX)
│   ├── Value proposition landing page
│   ├── Claim/Add Your Listing
│   ├── Advertising & Featured Placement tiers
│   ├── Lead Generation Program details
│   └── Contact / Partner With Us
│
└── LEGAL / SUPPORT
    ├── Privacy Policy
    ├── Terms of Service
    ├── Contact Support
    └── Report Abuse
```

### What was REMOVED from original plan:
- User accounts / login (not needed for V1)
- Sobriety tracker (moved to Soberthdays app)
- Community feed / forums
- Daily check-in
- Shop in primary nav
- Separate Find + Recover sections (merged into unified directory)

---

## 6. THE FULL RECOVERY TAXONOMY

The directory covers the entire landscape, organized by what the user is experiencing.

### Top-Level Categories (user-facing):
1. **Alcohol**
2. **Drugs & Medications** (opioids, stimulants, meth, marijuana, polysubstance)
3. **Gambling**
4. **Food & Eating** (overeating, anorexia/bulimia, food addiction)
5. **Sex & Relationship Compulsions**
6. **Behavioral** (shopping/spending, internet/gaming, workaholism, hoarding, body-focused/BFRBs)
7. **Supporting a Loved One** (first-class category, not buried as sub-link)

### Substance-Based Fellowships & Programs:
| Category | Fellowships | Treatment Types |
|----------|------------|-----------------|
| Alcohol | AA, SMART Recovery, Women for Sobriety, LifeRing, Celebrate Recovery, Moderation Management | Inpatient, outpatient (IOP), detox, MAT (naltrexone/Vivitrol), therapy |
| Opioids & Pills | NA, Pills Anonymous, Heroin Anonymous, SMART Recovery | MAT (Suboxone, methadone, Vivitrol), inpatient, outpatient, detox |
| Stimulants | CA, CMA, NA | Inpatient, outpatient, CBT, contingency management |
| Marijuana | MA, NA, SMART Recovery | Outpatient, individual therapy, CBT |
| Nicotine | Nicotine Anonymous | NRT, prescription meds (Chantix), behavioral therapy |

### Behavioral & Process Addictions:
| Category | Fellowships | Treatment Types |
|----------|------------|-----------------|
| Gambling | GA, SMART Recovery | Specialized programs, CBT, financial counseling |
| Food & Eating | OA, FA, ABA, EDA | Eating disorder clinics, nutritional therapy, DBT |
| Sex & Love | SAA, SCA, SLAA | Specialized therapists, EMDR, couples therapy |
| Shopping/Spending | DA, Spenders Anonymous | Financial therapy, CBT |
| Internet/Gaming | ITAA, CGAA | Specialized programs (reSTART), CBT |
| Work | Workaholics Anonymous | Burnout therapy, CBT, occupational therapy |
| Body-Focused (BFRBs) | OSPA, TLC Foundation | HRT (Habit Reversal Training), CBT |
| Hoarding | Clutterers Anonymous | Specialized therapists, CBT |

### For Family & Loved Ones:
| Fellowship | Who It Serves |
|-----------|---------------|
| Al-Anon / Alateen | Families/teens affected by someone's drinking |
| Nar-Anon | Families affected by someone's drug use |
| Gam-Anon | Families affected by gambling |
| COSA / S-Anon | Partners of people with sex addiction |
| ACA / ACoA | Adult children of alcoholics/dysfunctional families |
| Families Anonymous | Families of anyone with any addiction |
| CRAFT Method | Evidence-based approach to motivate loved ones into treatment |

### Secular & Alternative Approaches:
| Program | Approach |
|---------|----------|
| SMART Recovery | Science-based, CBT tools, covers all addictions |
| Refuge / Dharma Recovery | Buddhist-inspired mindfulness |
| Celebrate Recovery | Christ-centered 12-step |
| LifeRing | Secular, self-directed |
| Women for Sobriety | Designed for women |
| Moderation Management | Exploring moderation vs. abstinence |
| Harm Reduction | Pragmatic approaches without requiring full abstinence |

---

## 7. GUIDED DISCOVERY FLOW (Key UX Feature)

The homepage presents TWO entry paths:

### Path 1: Guided Discovery ("I need help finding the right thing")

**Step 1 — Who is this for?**
- Myself
- A family member or loved one
- A friend or colleague
- I'm a professional looking for client resources

**Step 2 — What are you dealing with?**
- Alcohol
- Drugs or medications
- Gambling
- Food, eating, or body image
- Compulsive behavior (sex, spending, internet, etc.)
- I'm not sure / multiple things

*(If "loved one" selected in Step 1, language shifts: "What is your loved one struggling with?")*

**Step 3 — Narrow** (context-dependent based on Step 2)

**Step 4 — What kind of help?**
- Meetings & support groups near me
- Treatment centers & professional help
- Information & articles
- Support for me as a family member
- All of the above

**Step 5 — Personalized Results Page**
Shows: relevant meetings, treatment facilities, articles, crisis hotlines — all filtered for their situation, all on one page.

### Path 2: Direct Search ("I know what I'm looking for")
Traditional directory search with location + category + filters.

### Language Guidelines:
- AVOID: "What is your addiction?" "What substance do you abuse?"
- USE: "What are you dealing with?" "What is your loved one struggling with?"
- "I'm not sure" is always valid — leads to broader results, never a dead end
- No judgment, no clinical jargon, no assumptions

---

## 8. DESIGN DIRECTION

| Element | Direction |
|---------|-----------|
| Canvas | White/off-white dominant (80%+). Pages breathe. Not dark-heavy. |
| Navy (#003366) | Nav bar, headlines, key UI anchors. NOT section backgrounds. |
| Teal (#2A8A99) | Links, CTAs, accent elements. Warmth and hope. |
| Gold (#D4A574) | Milestones, featured badges, brand flourishes. Sparingly. |
| Nautical | Anchor icons, subtle rope/line textures, wave motifs. Undercurrent, not overwhelming. |
| Photography | Authentic, warm, diverse. Real people. No clinical imagery. |
| Typography | Display: distinctive serif (Playfair Display). Body: clean sans-serif. |
| Tone | Antithesis of clinical SEO-farm directories. Warm, trustworthy, human. |

---

## 9. TWO-PRODUCT ECOSYSTEM

| | SoberAnchor.com | Soberthdays (App) |
|---|---|---|
| Type | Website (responsive) | Mobile app |
| Purpose | Search, discover, research, connect with providers | Personal tracking, daily ritual, milestones |
| Engagement | High-intent, low-frequency | Daily check-ins, push notifications |
| Accounts | Not required (V1) | Required |
| Revenue | Lead gen, featured listings | Medallion sales, premium features |

### Cross-Promotion:
- **SoberAnchor → Soberthdays**: Subtle callouts on resource pages ("Track your journey with Soberthdays")
- **Soberthdays → SoberAnchor**: Milestone prompts ("Celebrate 90 days — find a sober bar near you")

---

## 10. CONTENT PILLARS (SEO Strategy)

| Pillar | Example Topics |
|--------|---------------|
| Getting Help | First 30 days. Choosing treatment. Insurance. Detox FAQ. |
| Understanding Addiction | What is process addiction? Signs of eating disorders. |
| Supporting Someone | How to help after relapse. CRAFT method. Caregiver self-care. |
| Life in Recovery | Sober dating. Career rebuilding. Mental health. |
| Sober Lifestyle | Sober bars. Mocktails. Sober travel. Fitness. Events. |
| Local Guides | "Best Sober Bars in [City]." "Treatment Centers in [State]." |
| Program Explainers | "What is SMART Recovery?" "AA vs NA vs SMART." |

### SEO Flywheel:
Article ranks → links to directory → directory captures lead → revenue funds more content → more rankings → more leads

---

## 11. BUILD PRIORITIES

### Phase 1: Foundation (Launch MVP)
- [ ] Guided discovery flow on homepage
- [ ] Directory infrastructure (unified "Find" with category filters, full taxonomy)
- [ ] Detail pages with lead capture forms
- [ ] Homepage (two entry paths, Angel's story, trust signals)
- [ ] 5–10 foundational SEO articles across multiple addiction categories
- [ ] Meeting finder (start with AA, NA, Al-Anon, SMART Recovery, GA, OA)
- [ ] Our Story page
- [ ] Crisis resources in footer

### Phase 2: Revenue Activation
- [ ] For Providers B2B landing page with listing tiers
- [ ] Lead routing and tracking
- [ ] Location-specific SEO content
- [ ] Expanded meeting finder (behavioral fellowships)
- [ ] Shop integration (contextual links)

### Phase 3: Scale
- [ ] 20–50+ articles across all pillars
- [ ] Provider analytics dashboard
- [ ] Reviews (optional — only feature that may need accounts)
- [ ] Soberthdays cross-promotion
- [ ] Program explainer content
- [ ] Sober venue/event expansion

---

## 12. MEETING FINDER (Competitive Advantage)

Most fellowship meeting finders are terrible. If SoberAnchor aggregates ALL fellowships into one clean, searchable experience, that alone is a major differentiator.

### Features:
- Search by location (auto-detect or manual)
- Filter by program type (AA, NA, GA, OA, Al-Anon, SMART Recovery, etc.)
- Filter by format: in-person, online, hybrid
- Filter by day/time
- Filter by specialty: women-only, LGBTQ+, young people, Spanish-language, etc.
- Map view and list view toggle
- "Add a Meeting" community submission form

### Data Sources:
- SAMHSA API (treatment facilities)
- Individual fellowship websites
- Community submissions with moderation
- Start with most popular fellowships, expand over time

---

## 13. BRAND CONTEXT

- **Co-founder**: Angel Johnson — 5+ years sober, recovery advocate, authentic personal story
- **Partner**: Travis Johnson (TJ) — product/analytics background (Director of Product Analytics at Cox Automotive), entrepreneur
- **Related business**: Soberthdays (sobriety milestone medallion ecommerce on Shopify)
- **Brand voice**: Warm, personal, non-clinical, inclusive, judgment-free
- **Tagline**: "Your Anchor to Sober Living"

---

## 14. TECH DECISIONS (Open)

- Tech stack TBD (Next.js/Astro vs CMS-driven)
- Database TBD (Supabase/Postgres vs curated content for V1)
- Lead routing TBD (email forwarding vs CRM vs third-party)
- Geographic focus TBD (national vs Southern California first)
- Content authorship TBD (Angel-written vs contributors vs AI-assisted)

---

*This document is the single source of truth for SoberAnchor. When in doubt, reference this over any earlier wireframes or planning docs.*
