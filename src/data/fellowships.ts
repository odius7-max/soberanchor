export type FellowshipTier = 'major' | 'specialty' | 'family';
export type FellowshipTagTone = 'primary' | 'secular' | 'faith' | 'neutral';

export interface FellowshipTag {
  label: string;
  tone: FellowshipTagTone;
}

export interface Fellowship {
  slug: string;
  name: string;
  abbreviation?: string;
  tier: FellowshipTier;
  tags: FellowshipTag[];
  shortDescription: string;
  founded?: number;
  reach?: string[];
  officialMeetingsUrl: string;
  officialHomepageUrl: string;
}

export const FELLOWSHIPS: Fellowship[] = [
  // ── MAJOR ──
  {
    slug: 'aa',
    name: 'Alcoholics Anonymous',
    abbreviation: 'AA',
    tier: 'major',
    tags: [{ label: '12-Step', tone: 'primary' }, { label: 'Alcohol', tone: 'neutral' }],
    shortDescription:
      'The original 12-step fellowship. Members share experience, strength, and hope to stay sober from alcohol. Anonymous, free, peer-led. Meetings available in most towns globally.',
    founded: 1935,
    reach: ['~2M members', '180+ countries'],
    officialMeetingsUrl: 'https://www.aa.org/find-aa',
    officialHomepageUrl: 'https://www.aa.org',
  },
  {
    slug: 'na',
    name: 'Narcotics Anonymous',
    abbreviation: 'NA',
    tier: 'major',
    tags: [{ label: '12-Step', tone: 'primary' }, { label: 'Any substance', tone: 'neutral' }],
    shortDescription:
      'A 12-step fellowship for anyone seeking recovery from drug addiction — broadly, not just one substance. "The only requirement is a desire to stop using."',
    founded: 1953,
    reach: ['~70k groups', '144 countries'],
    officialMeetingsUrl: 'https://www.na.org/meetingsearch/',
    officialHomepageUrl: 'https://www.na.org',
  },
  {
    slug: 'smart-recovery',
    name: 'SMART Recovery',
    tier: 'major',
    tags: [{ label: 'Secular', tone: 'secular' }, { label: 'Science-based', tone: 'neutral' }],
    shortDescription:
      'Self-Management and Recovery Training. A secular, CBT-based program with practical tools for managing urges, thoughts, and behaviors. No steps, no higher power, no sponsors.',
    founded: 1994,
    reach: ['3,000+ meetings', 'Online & in-person'],
    officialMeetingsUrl: 'https://meetings.smartrecovery.org/',
    officialHomepageUrl: 'https://smartrecovery.org',
  },
  {
    slug: 'refuge-recovery',
    name: 'Refuge Recovery',
    tier: 'major',
    tags: [{ label: 'Buddhist-informed', tone: 'neutral' }, { label: 'Secular', tone: 'secular' }],
    shortDescription:
      'A Buddhist-informed path to recovery grounded in the Four Noble Truths and the Eightfold Path. Meditation-centered meetings, open to all backgrounds — no Buddhist experience required.',
    founded: 2014,
    reach: ['Global online & in-person'],
    officialMeetingsUrl: 'https://refugerecovery.org/meetings',
    officialHomepageUrl: 'https://refugerecovery.org',
  },
  {
    slug: 'recovery-dharma',
    name: 'Recovery Dharma',
    tier: 'major',
    tags: [{ label: 'Buddhist', tone: 'neutral' }, { label: 'Peer-led', tone: 'neutral' }],
    shortDescription:
      'Peer-led fellowship using Buddhist practices — meditation, wise intention, and sangha (community) — to heal from addiction. Fully democratic structure, free, open to anyone.',
    founded: 2019,
    reach: ['500+ meetings'],
    officialMeetingsUrl: 'https://recoverydharma.org/find-a-meeting',
    officialHomepageUrl: 'https://recoverydharma.org',
  },
  {
    slug: 'celebrate-recovery',
    name: 'Celebrate Recovery',
    abbreviation: 'CR',
    tier: 'major',
    tags: [{ label: 'Christian', tone: 'faith' }, { label: '8 Principles', tone: 'neutral' }],
    shortDescription:
      'Christ-centered recovery program rooted in the Beatitudes and eight recovery principles. Hosted mainly by churches, open to any "hurts, habits, or hang-ups" — not just addiction.',
    founded: 1991,
    reach: ['35,000+ churches'],
    officialMeetingsUrl: 'https://www.celebraterecovery.com/crgroups',
    officialHomepageUrl: 'https://www.celebraterecovery.com',
  },
  {
    slug: 'lifering',
    name: 'LifeRing Secular Recovery',
    tier: 'major',
    tags: [{ label: 'Secular', tone: 'secular' }, { label: 'Self-directed', tone: 'neutral' }],
    shortDescription:
      'Secular, abstinence-based fellowship. Each person builds their own Personal Recovery Program — no steps, no doctrine, strong emphasis on strengthening your "sober self."',
    founded: 2001,
    reach: ['Online & in-person'],
    officialMeetingsUrl: 'https://lifering.org/meet-online',
    officialHomepageUrl: 'https://lifering.org',
  },
  {
    slug: 'women-for-sobriety',
    name: 'Women for Sobriety',
    abbreviation: 'WFS',
    tier: 'major',
    tags: [{ label: 'Women-only', tone: 'neutral' }, { label: 'Secular', tone: 'secular' }],
    shortDescription:
      'Designed specifically for women in recovery, using 13 Acceptance Statements and six levels of recovery. Positive-psychology focused, emphasizes competence and self-worth.',
    founded: 1975,
    reach: ['Online & in-person'],
    officialMeetingsUrl: 'https://womenforsobriety.org/online-support/face-to-face-meetings/',
    officialHomepageUrl: 'https://womenforsobriety.org',
  },

  // ── SPECIALTY ──
  {
    slug: 'cocaine-anonymous',
    name: 'Cocaine Anonymous',
    abbreviation: 'CA',
    tier: 'specialty',
    tags: [{ label: '12-Step', tone: 'primary' }],
    shortDescription:
      '12-step, open to anyone whose problem relates to cocaine, crack, or other mind-altering substances.',
    officialMeetingsUrl: 'https://ca.org/meetings/',
    officialHomepageUrl: 'https://ca.org',
  },
  {
    slug: 'crystal-meth-anonymous',
    name: 'Crystal Meth Anonymous',
    abbreviation: 'CMA',
    tier: 'specialty',
    tags: [{ label: '12-Step', tone: 'primary' }],
    shortDescription: '12-step, focused on recovery from crystal methamphetamine addiction.',
    officialMeetingsUrl: 'https://www.crystalmeth.org/meetings',
    officialHomepageUrl: 'https://www.crystalmeth.org',
  },
  {
    slug: 'heroin-anonymous',
    name: 'Heroin Anonymous',
    abbreviation: 'HA',
    tier: 'specialty',
    tags: [{ label: '12-Step', tone: 'primary' }],
    shortDescription: '12-step, for anyone seeking freedom from heroin addiction.',
    officialMeetingsUrl: 'https://heroinanonymous.org/meeting-finder/',
    officialHomepageUrl: 'https://heroinanonymous.org',
  },
  {
    slug: 'marijuana-anonymous',
    name: 'Marijuana Anonymous',
    abbreviation: 'MA',
    tier: 'specialty',
    tags: [{ label: '12-Step', tone: 'primary' }],
    shortDescription: '12-step program for cannabis addiction.',
    officialMeetingsUrl: 'https://marijuana-anonymous.org/meetings/',
    officialHomepageUrl: 'https://marijuana-anonymous.org',
  },
  {
    slug: 'gamblers-anonymous',
    name: 'Gamblers Anonymous',
    abbreviation: 'GA',
    tier: 'specialty',
    tags: [{ label: '12-Step', tone: 'primary' }],
    shortDescription: '12-step fellowship for compulsive gamblers.',
    officialMeetingsUrl: 'https://www.gamblersanonymous.org/ga/locations',
    officialHomepageUrl: 'https://www.gamblersanonymous.org',
  },
  {
    slug: 'overeaters-anonymous',
    name: 'Overeaters Anonymous',
    abbreviation: 'OA',
    tier: 'specialty',
    tags: [{ label: '12-Step', tone: 'primary' }],
    shortDescription: '12-step recovery from compulsive eating and food behaviors.',
    officialMeetingsUrl: 'https://oa.org/find-a-meeting/',
    officialHomepageUrl: 'https://oa.org',
  },
  {
    slug: 'sex-addicts-anonymous',
    name: 'Sex Addicts Anonymous',
    abbreviation: 'SAA',
    tier: 'specialty',
    tags: [{ label: '12-Step', tone: 'primary' }],
    shortDescription: '12-step, recovery from compulsive sexual behavior.',
    officialMeetingsUrl: 'https://saa-recovery.org/meetings/',
    officialHomepageUrl: 'https://saa-recovery.org',
  },
  {
    slug: 'sex-and-love-addicts-anonymous',
    name: 'Sex & Love Addicts Anonymous',
    abbreviation: 'SLAA',
    tier: 'specialty',
    tags: [{ label: '12-Step', tone: 'primary' }],
    shortDescription: '12-step, recovery from sex and love addiction patterns.',
    officialMeetingsUrl: 'https://slaafws.org/meetingfinder',
    officialHomepageUrl: 'https://slaafws.org',
  },
  {
    slug: 'debtors-anonymous',
    name: 'Debtors Anonymous',
    abbreviation: 'DA',
    tier: 'specialty',
    tags: [{ label: '12-Step', tone: 'primary' }],
    shortDescription: '12-step for compulsive debt and unclear money relationships.',
    officialMeetingsUrl: 'https://debtorsanonymous.org/meetings/',
    officialHomepageUrl: 'https://debtorsanonymous.org',
  },

  // ── FAMILY / LOVED ONES ──
  {
    slug: 'al-anon',
    name: 'Al-Anon',
    tier: 'family',
    tags: [{ label: 'Family', tone: 'neutral' }],
    shortDescription: 'For friends and families of alcoholics.',
    officialMeetingsUrl: 'https://al-anon.org/al-anon-meetings/find-an-al-anon-meeting/',
    officialHomepageUrl: 'https://al-anon.org',
  },
  {
    slug: 'nar-anon',
    name: 'Nar-Anon',
    tier: 'family',
    tags: [{ label: 'Family', tone: 'neutral' }],
    shortDescription: 'For families and friends of addicts.',
    officialMeetingsUrl: 'https://www.nar-anon.org/find-a-meeting',
    officialHomepageUrl: 'https://www.nar-anon.org',
  },
  {
    slug: 'adult-children-of-alcoholics',
    name: 'Adult Children of Alcoholics',
    abbreviation: 'ACA',
    tier: 'family',
    tags: [{ label: 'Family', tone: 'neutral' }],
    shortDescription: '12-step recovery from growing up in alcoholic or otherwise dysfunctional homes.',
    officialMeetingsUrl: 'https://adultchildren.org/meeting-search/',
    officialHomepageUrl: 'https://adultchildren.org',
  },
  {
    slug: 'families-anonymous',
    name: 'Families Anonymous',
    tier: 'family',
    tags: [{ label: 'Family', tone: 'neutral' }],
    shortDescription: "For families concerned about a loved one's drug use or related behavioral problems.",
    officialMeetingsUrl: 'https://www.familiesanonymous.org/meetings/',
    officialHomepageUrl: 'https://www.familiesanonymous.org',
  },
  {
    slug: 'coda',
    name: 'Codependents Anonymous',
    abbreviation: 'CoDA',
    tier: 'family',
    tags: [{ label: 'Family', tone: 'neutral' }],
    shortDescription: '12-step, recovery from codependent patterns in relationships.',
    officialMeetingsUrl: 'https://coda.org/find-a-meeting/',
    officialHomepageUrl: 'https://coda.org',
  },
  {
    slug: 'alateen',
    name: 'Alateen',
    tier: 'family',
    tags: [{ label: 'Teens', tone: 'neutral' }],
    shortDescription: "Part of Al-Anon, for teenagers affected by someone else's drinking.",
    officialMeetingsUrl: 'https://al-anon.org/newcomers/teen-corner-alateen/',
    officialHomepageUrl: 'https://al-anon.org/newcomers/teen-corner-alateen/',
  },
];

export const majorFellowships    = () => FELLOWSHIPS.filter(f => f.tier === 'major');
export const specialtyFellowships = () => FELLOWSHIPS.filter(f => f.tier === 'specialty');
export const familyFellowships   = () => FELLOWSHIPS.filter(f => f.tier === 'family');
export const getFellowshipBySlug = (slug: string) => FELLOWSHIPS.find(f => f.slug === slug);
