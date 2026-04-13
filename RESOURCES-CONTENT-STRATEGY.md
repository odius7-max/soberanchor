# SoberAnchor — Resources & Content Strategy
## Last Updated: April 10, 2026

---

## Purpose

The Resources section is SoberAnchor's SEO engine. Every piece of content has one job: capture a search query and funnel the reader into the directory. Articles link to listings. Guides link to meetings. Explainers link to relevant treatment centers.

**The flywheel:** Article ranks → links to directory → directory captures lead → revenue funds more content → more rankings → more leads.

---

## AI-Powered Smart Search

### Concept
A single search bar at the top of the Resources page (and the homepage) that understands natural language. Instead of clicking through the guided discovery flow, a user can type:

- "my son is addicted to pills"
- "help for gambling problem near me"
- "what's the difference between AA and SMART Recovery"
- "sober bars in San Diego"
- "how to help someone who relapsed"

The search bar interprets intent and returns personalized results across ALL content types: meetings, facilities, articles, guides, and crisis resources — on one results page.

### Technical Architecture

1. **User types query** in the search bar
2. **Frontend sends query to API route** (`/api/smart-search`)
3. **API route calls Claude (Anthropic API)** with a structured system prompt:
   - Classify: who is this for (self, loved one, professional)?
   - Classify: what type of addiction/issue?
   - Classify: what kind of help (meetings, treatment, information, crisis)?
   - Extract: location if mentioned
   - Return: structured JSON with intent classification
4. **API route queries Supabase** using the classified intent:
   - Meetings table (filtered by fellowship, location, format)
   - Facilities table (filtered by type, specialty, location)
   - Articles table (filtered by category, tags)
   - Crisis resources (always included if emotional distress detected)
5. **Frontend renders results** in sections: Crisis (if applicable), Meetings, Treatment, Articles, Guides

### Example Flow

**User types:** "my wife won't stop gambling and I don't know what to do"

**Claude classifies:**
```json
{
  "who": "loved_one",
  "issue": "gambling",
  "help_type": ["meetings", "information", "support_for_family"],
  "urgency": "moderate",
  "include_crisis": false
}
```

**Results page shows:**
- Gam-Anon meetings near user (for the spouse)
- GA meetings near user (for the wife)
- Article: "How to Help When Someone You Love Is Struggling"
- Article: "Is Gambling an Addiction? Understanding Gambling Disorder"
- Guide: "The CRAFT Method Explained"
- SAMHSA helpline (always visible)

### Implementation Notes
- Use `claude-haiku-4-5-20251001` for cost efficiency (~$0.0002 per query, ~$2/month at 10K searches). Haiku is fast enough for search classification and the structured JSON output is simple.
- Cache common query patterns (no need to call Claude for "AA meetings near me")
- Fallback to traditional keyword search if AI is unavailable
- Rate limit: 1 AI search per 3 seconds per user
- Show "searching..." animation while AI processes
- Traditional keyword search still available as filter chips below the search bar

---

## Content Architecture: 7 Tiers

### Tier 1: Fellowship Guides (Highest SEO Value)

One comprehensive page per fellowship. These are the hub pages that rank for "[fellowship name]" queries and funnel into the meeting finder.

**URL pattern:** `/resources/fellowships/[slug]`

| Page | Target Keywords | Monthly Search Volume | Links To |
|------|----------------|----------------------|----------|
| What is AA? | "what is aa", "alcoholics anonymous" | 40K+ | AA meetings finder |
| What is NA? | "what is na", "narcotics anonymous" | 22K+ | NA meetings finder |
| What is Al-Anon? | "al-anon", "al-anon meetings" | 33K+ | Al-Anon meetings finder |
| What is SMART Recovery? | "smart recovery", "smart recovery vs aa" | 8K+ | SMART meetings finder |
| What is Celebrate Recovery? | "celebrate recovery", "cr near me" | 12K+ | CR meetings finder |
| What is GA? | "gamblers anonymous" | 18K+ | GA meetings finder |
| What is OA? | "overeaters anonymous" | 9K+ | OA meetings finder |
| What is ACA? | "adult children of alcoholics" | 6K+ | ACA meetings finder |
| What is Nar-Anon? | "nar-anon" | 4K+ | Nar-Anon meetings finder |
| What is SAA? | "sex addicts anonymous" | 3K+ | SAA meetings finder |
| What is DA? | "debtors anonymous" | 2K+ | DA meetings finder |
| What is SLAA? | "sex and love addicts anonymous" | 2K+ | SLAA meetings finder |
| What is COSA? | "cosa meetings" | 1K+ | COSA meetings finder |
| What is CMA? | "crystal meth anonymous" | 1K+ | CMA meetings finder |
| What is CA? | "cocaine anonymous" | 1K+ | CA meetings finder |
| What is Families Anonymous? | "families anonymous" | 1K+ | FA meetings finder |
| What is Nicotine Anonymous? | "nicotine anonymous" | 500+ | NicA meetings finder |
| What is ITAA? | "internet technology addicts anonymous" | growing | ITAA meetings |
| What is Workaholics Anonymous? | "workaholics anonymous" | 500+ | WA meetings |

**Each page includes:**
- What the fellowship is and who it's for
- Brief history
- How meetings work (format, structure, what to expect)
- Open vs closed meetings (where applicable)
- The program structure (12 steps, 4-point, 8 principles, etc.)
- How to find meetings (link to meeting finder filtered by fellowship)
- FAQ (do I have to talk? do I have to believe in God? is it free?)
- Related resources (articles, books, videos)
- "Find [Fellowship] meetings near you" CTA

### Tier 2: Getting Help (Highest Commercial Value)

Guides for people actively seeking treatment. These pages capture high-intent traffic and link directly to treatment center listings.

**URL pattern:** `/resources/guides/[slug]`

| Page | Target Keywords | Links To |
|------|----------------|----------|
| How to choose a treatment center | "how to choose rehab", "best rehab" | Treatment center listings |
| Understanding treatment types | "inpatient vs outpatient", "types of rehab" | Treatment center listings |
| Insurance and treatment costs | "does insurance cover rehab", "how much is rehab" | Treatment centers (filtered by insurance) |
| What to expect in rehab | "what happens in rehab" | Treatment center listings |
| What to expect at your first meeting | "first aa meeting", "what happens at na meeting" | Meeting finder |
| What is detox? | "alcohol detox", "drug detox" | Detox facilities |
| What is sober living? | "sober living homes", "halfway house" | Sober living listings |
| Finding a therapist for addiction | "addiction therapist", "addiction counselor" | Therapist listings |
| Harm reduction explained | "harm reduction", "moderation management" | Relevant resources |
| Intervention: when and how | "how to do an intervention" | Treatment centers, therapists |

### Tier 3: Supporting a Loved One (Highest-Value Audience)

Content for families, friends, and caregivers. These people are often the decision-makers AND the payers for treatment.

**URL pattern:** `/resources/supporting/[slug]`

| Page | Target Keywords | Links To |
|------|----------------|----------|
| How to help someone who's struggling | "how to help an alcoholic", "how to help an addict" | Treatment centers, Al-Anon |
| The CRAFT method explained | "CRAFT method addiction", "community reinforcement" | Therapists, treatment centers |
| Taking care of yourself as a caregiver | "codependency", "caregiver burnout" | Al-Anon, Nar-Anon, therapists |
| How to talk to your kids about addiction | "explaining addiction to children" | Alateen, family therapists |
| What to do when someone relapses | "loved one relapsed" | Treatment centers, meetings |
| Setting boundaries with an addicted loved one | "boundaries addiction" | Therapists, support groups |
| Understanding codependency | "what is codependency", "codependent" | COSA, CoDA, therapists |
| How to stage an intervention | "intervention", "how to intervene" | Treatment centers |
| Financial impact of a loved one's addiction | "financial abuse addiction" | DA, financial counselors |
| Supporting recovery: the long game | "supporting someone in recovery" | Al-Anon, Nar-Anon |

### Tier 4: Understanding Addiction (Educational)

Covers the full spectrum of substances AND behavioral addictions. Each page is an SEO target.

**URL pattern:** `/resources/understanding/[slug]`

**Substance-focused:**
| Page | Target Keywords |
|------|----------------|
| Understanding alcohol addiction | "am I an alcoholic", "signs of alcoholism" |
| Understanding opioid addiction | "opioid addiction", "painkiller addiction" |
| Understanding meth addiction | "meth addiction", "crystal meth help" |
| Understanding cocaine addiction | "cocaine addiction help" |
| Understanding marijuana dependency | "marijuana addiction", "can you be addicted to weed" |
| Understanding nicotine addiction | "quit smoking", "nicotine addiction" |
| What is medication-assisted treatment (MAT)? | "suboxone", "methadone", "vivitrol" |
| What is dual diagnosis? | "dual diagnosis", "co-occurring disorders" |

**Behavioral/process addictions:**
| Page | Target Keywords |
|------|----------------|
| Is gambling an addiction? | "gambling addiction", "problem gambling" |
| Understanding eating disorders in recovery | "eating disorder help", "food addiction" |
| What is sex addiction? | "sex addiction help", "compulsive sexual behavior" |
| Internet and gaming addiction | "internet addiction", "gaming addiction" |
| Shopping and spending addiction | "shopping addiction", "compulsive spending" |
| What is process addiction? | "process addiction", "behavioral addiction" |
| Understanding workaholism | "workaholic", "work addiction" |
| Body-focused repetitive behaviors | "skin picking", "trichotillomania", "BFRBs" |

### Tier 5: Life in Recovery (Brand & Shareability)

Personal, editorial content for people in sustained recovery. Angel's voice lives here. Lower commercial intent but high shareability.

**URL pattern:** `/resources/recovery-life/[slug]`

| Page | Author |
|------|--------|
| The first 30 days sober: what to expect | Angel J. |
| Sober dating guide | Angel J. |
| Rebuilding relationships in recovery | Angel J. |
| Mental health and recovery | SoberAnchor Team |
| Career rebuilding after addiction | SoberAnchor Team |
| Fitness and recovery | SoberAnchor Team |
| Sober travel tips | Angel J. |
| Managing triggers and cravings | SoberAnchor Team |
| Recovery and parenting | Angel J. |
| Celebrating milestones (cross-sell to Soberthdays) | Angel J. |
| Navigating holidays sober | Angel J. |
| Grief and loss in recovery | SoberAnchor Team |
| Spirituality without religion | SoberAnchor Team |
| Recovery and creativity | Angel J. |

### Tier 6: Local Guides (SEO Powerhouse)

City and state specific content. Each page ranks for "[service] in [city]" and links to filtered directory results.

**URL pattern:** `/resources/local/[city-slug]/[topic-slug]`

**Start with San Diego, then expand:**

| Page | Target Keywords |
|------|----------------|
| Recovery resources in San Diego (hub) | "rehab san diego", "addiction help san diego" |
| Treatment centers in San Diego | "drug rehab san diego", "alcohol rehab san diego" |
| AA meetings in San Diego | "aa meetings san diego" |
| NA meetings in San Diego | "na meetings san diego" |
| Sober living homes in San Diego | "sober living san diego" |
| Sober bars in San Diego | "sober bars san diego", "alcohol free bars san diego" |
| Therapists for addiction in San Diego | "addiction therapist san diego" |
| Best sober activities in San Diego | "sober things to do san diego" |
| Al-Anon meetings in San Diego | "al-anon san diego" |
| SMART Recovery in San Diego | "smart recovery san diego" |

**Expansion plan:** Replicate for: Los Angeles, Orange County, San Francisco, Sacramento → then top 25 US metros.

### Tier 7: Books, Media & Curated Resources

Curated lists of the best recovery content. Position SoberAnchor as the trusted curator.

**URL pattern:** `/resources/media/[slug]`

| Page | Format |
|------|--------|
| Best books on recovery | Curated list with reviews, by category |
| Best books for families of addicts | Curated list |
| Recovery podcasts worth listening to | Curated list with descriptions |
| YouTube channels for recovery | Curated list with embeds |
| Recovery documentaries and films | Curated list |
| Sober curious: books and resources | Curated list (Annie Grace, Ruby Warrington, etc.) |
| Recovery apps worth trying | Curated list (I Am Sober, Nomo, etc. — and Soberthdays) |
| Free online recovery resources | Curated links |

---

## Resources Page UX Structure

### Navigation
```
/resources (hub page)
├── /resources/fellowships      ← Tier 1: Fellowship guides
├── /resources/guides           ← Tier 2: Getting help
├── /resources/supporting       ← Tier 3: For loved ones
├── /resources/understanding    ← Tier 4: Education
├── /resources/recovery-life    ← Tier 5: Life in recovery
├── /resources/local            ← Tier 6: Local guides
└── /resources/media            ← Tier 7: Books & media
```

### Hub Page Layout
1. **AI Smart Search bar** (prominent, top of page)
   - "What are you looking for?" with example suggestions
2. **Category cards** (7 cards, one per tier)
   - Each card shows category name, description, article count
3. **Featured/latest articles** (3-4 cards)
4. **Crisis resources** (always visible, pinned)

### Category Page Layout
1. **Category title and description**
2. **Filter chips** (subcategories within the tier)
3. **Article cards** (title, excerpt, author, read time, relevant badges)
4. **Related directory links** (contextual CTAs to Find section)

### Article Page Layout
1. **Breadcrumb** (Resources > Fellowship Guides > What is AA?)
2. **Title, author, date, read time**
3. **Article body** (rich text, images, embedded videos)
4. **Key takeaways box** (highlighted summary)
5. **Related resources CTA** (links to relevant directory listings)
6. **Related articles** (3-4 suggestions)
7. **Crisis resources** (footer)

---

## Content Production Plan

### Phase 1 (Launch — existing content + fellowship guides)
- Clean up existing 10 articles
- Write 5 fellowship guides: AA, NA, Al-Anon, SMART Recovery, GA
- Write 3 "Getting Help" guides
- Write 2 "Supporting a Loved One" guides
- Build the Resources hub page with category navigation

### Phase 2 (Month 2-3 — expand coverage)
- Remaining fellowship guides (OA, CR, ACA, SA, etc.)
- Full "Getting Help" section (10 guides)
- Full "Supporting a Loved One" section (10 articles)
- San Diego local guides (10 pages)
- 5 "Understanding Addiction" articles

### Phase 3 (Month 4-6 — scale and SEO)
- Complete "Understanding Addiction" section (16 articles)
- "Life in Recovery" editorial content (Angel's writing)
- Books and media curated lists
- Expand local guides to LA, Orange County
- AI Smart Search implementation

### Content Authorship
- **Angel J.** writes: personal essays (Tier 5), first-person guides, brand voice pieces
- **SoberAnchor Team** writes: educational guides (Tiers 2-4), fellowship explainers (Tier 1)
- **AI-assisted drafts** with Angel's editorial review for factual/educational content
- **Guest contributors** from specific fellowships for authenticity (future)

---

## SEO Technical Requirements

- Each article has: title tag, meta description, Open Graph tags, structured data (Article schema)
- Fellowship guide pages have: FAQ schema markup (for Google "People Also Ask")
- Local guides have: LocalBusiness schema, city-specific title tags
- Internal linking: every article links to at least 2 directory pages and 2 other articles
- Sitemap: auto-generated, submitted to Google Search Console
- Page speed: target <3s load time (Next.js static generation for articles)
- Mobile-first: all content responsive, no horizontal scroll

---

## Measurement

- **Traffic:** Google Analytics / Search Console — organic traffic by tier
- **Funnel:** Article view → directory click → lead form submission
- **Rankings:** Track target keywords per tier (Ahrefs or SEMrush)
- **Engagement:** Time on page, scroll depth, related article clicks
- **Revenue attribution:** Which articles drive the most lead form submissions

---

*This document is the content strategy for SoberAnchor's Resources section. It should be referenced alongside DECISIONS.md and SOBERANCHOR-PROJECT-BRIEF.md.*
