export const CATEGORIES = [
  {
    slug: "fellowships",
    label: "Fellowship Guides",
    description:
      "Everything you need to know about AA, NA, Al-Anon, SMART Recovery, and dozens more programs.",
    icon: "🤝",
    pillars: [] as string[],
  },
  {
    slug: "guides",
    label: "Getting Help",
    description:
      "Guides for people actively seeking treatment — choosing a rehab, understanding options, what to expect.",
    icon: "🏥",
    pillars: ["getting_help", "explainer"] as string[],
  },
  {
    slug: "supporting",
    label: "Supporting a Loved One",
    description:
      "For families, friends, and caregivers navigating a loved one's addiction with empathy and boundaries.",
    icon: "❤️",
    pillars: ["supporting"] as string[],
  },
  {
    slug: "understanding",
    label: "Understanding Addiction",
    description:
      "Science, symptoms, and substance-specific guides for alcohol, opioids, gambling, eating disorders, and more.",
    icon: "🔍",
    pillars: ["understanding"] as string[],
  },
  {
    slug: "recovery-life",
    label: "Life in Recovery",
    description:
      "Sober dating, rebuilding relationships, navigating holidays, and everything in between.",
    icon: "✨",
    pillars: ["sober_lifestyle"] as string[],
  },
  {
    slug: "local",
    label: "Local Guides",
    description:
      "City-specific recovery resources, meetings, sober venues, and therapists near you.",
    icon: "📍",
    pillars: ["local_guide"] as string[],
  },
  {
    slug: "media",
    label: "Books & Media",
    description:
      "The best books, podcasts, documentaries, and apps for recovery — curated by SoberAnchor.",
    icon: "📚",
    pillars: [] as string[],
  },
];

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function getPillarsForCategory(slug: string): string[] {
  return getCategoryBySlug(slug)?.pillars ?? [];
}

export function pillarToCategory(pillar: string): string {
  for (const cat of CATEGORIES) {
    if (cat.pillars.includes(pillar)) return cat.slug;
  }
  return "guides";
}

export function readTime(body: string | null): number {
  if (!body) return 1;
  return Math.max(1, Math.ceil(body.split(" ").length / 200));
}

export type ArticleRow = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  author: string | null;
  body: string | null;
  pillar: string | null;
  published_at: string | null;
};

// ─── Smart Search types ──────────────────────────────────────────────────────

export type SearchIntent = {
  who: "self" | "loved_one" | "professional";
  issue: string;
  help_type: string[];
  location: string | null;
  urgency: "low" | "moderate" | "high";
  include_crisis: boolean;
  fellowship_slugs: string[];
  facility_types: string[];
  query_intent: "meeting_search" | "informational" | "facility_search" | "crisis";
};

export type MeetingResult = {
  id: string;
  name: string;
  fellowship_name: string;
  fellowship_slug: string;
  city: string | null;
  state: string | null;
  format: string | null;
  day_of_week: string | null;
  start_time: string | null;
  meeting_url: string | null;
  slug: string | null;
};

export type FacilityResult = {
  id: string;
  name: string;
  facility_type: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  accepts_insurance: boolean | null;
  slug: string | null;
  is_verified: boolean | null;
};

export type ArticleResult = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  author: string | null;
  body: string | null;
  pillar: string | null;
};

export type SmartSearchResponse = {
  query: string;
  intent: SearchIntent | null;
  meetings: MeetingResult[];
  facilities: FacilityResult[];
  articles: ArticleResult[];
  crisis: boolean;
  ai_powered: boolean;
  cached?: boolean;
  error?: string;
};
