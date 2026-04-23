export interface MeetingFinder {
  name: string;
  url: string;
  description: string;
  badge?: string;
}

export interface ImageRef {
  src: string;
  alt: string;
  credit?: string;
}

export interface FellowshipBook {
  title: string;
  year?: number;
  description: string;
  /** Public-relative path to a cover thumbnail. */
  coverImage?: string;
  /** Optional link to publisher / official source. */
  externalUrl?: string;
}

export interface FellowshipContent {
  slug: string;
  tagline: string;
  overview?: string;
  howItWorks?: string;
  whatToExpect?: string;
  bestFor?: string[];
  notIdealIf?: string[];
  meetingFinders: MeetingFinder[];
  faqs?: Array<{ question: string; answer: string }>;
  seeAlso?: string[];
  /** Typographic breakout quotes, rendered between sections. */
  pullQuotes?: string[];
  /** Foundational books, rendered as a cover-thumbnail grid. */
  literature?: FellowshipBook[];
  /** Hero illustration — schema-only until art is commissioned. */
  heroImage?: ImageRef;
}

export const FELLOWSHIP_CONTENT: Record<string, FellowshipContent> = {
  aa: {
    slug: 'aa',
    tagline: 'The original peer-led path out of alcoholism — free, anonymous, and available almost everywhere.',

    overview:
      'Alcoholics Anonymous was founded in 1935 in Akron, Ohio, when a stockbroker named Bill Wilson and a surgeon named Dr. Bob Smith discovered that one alcoholic talking to another could accomplish what doctors, willpower, and religion alone had not. That conversation became the seed of a worldwide fellowship now numbering roughly two million members across 180 countries.\n\n' +
      'The core of AA is simple: members share their experience, strength, and hope with each other in small, voluntary meetings. There are no dues, no fees, no professional staff, and no government oversight. Attendance and participation are always voluntary. The only requirement for membership is a desire to stop drinking.\n\n' +
      'The 12 Steps and the meetings are the two main pillars. The Steps are a sequence of personal and spiritual actions — admitting powerlessness, taking stock of one’s life, making amends, and helping other alcoholics — that members work through at their own pace, usually with a sponsor (a more experienced member who guides the process one-on-one). The meetings provide community: a regular room full of people who understand without explanation.\n\n' +
      'AA’s 12 Traditions govern how the fellowship runs: groups are self-supporting, avoid outside issues, maintain anonymity, and have no formal leadership hierarchy. This structure has kept AA decentralized and intact across nearly nine decades.',

    howItWorks:
      'The 12 Steps are the program’s backbone. They move in sequence: the first three involve admitting the problem and opening to help; Steps Four through Nine involve a searching personal inventory, confessing wrongs to another person, becoming willing to change, and making direct amends where possible; Steps Ten through Twelve are maintenance — daily inventory, deepening the spiritual practice, and carrying the message to other alcoholics.\n\n' +
      'A sponsor is the person who walks you through the Steps. Sponsors are not counselors or professionals — they are AA members who have worked the Steps themselves and are willing to share how they did it. The sponsor relationship is one-on-one, informal, and usually involves regular phone calls, coffee meetings, and working through the Big Book or Twelve Steps and Twelve Traditions together.\n\n' +
      'Meetings are where the community happens. Most groups meet weekly at the same time and place — a church basement, community center, hospital, or online. A typical meeting runs 60–90 minutes and includes readings from AA literature, a speaker or discussion topic, and open sharing. Some meetings close with the Serenity Prayer.\n\n' +
      'The 12 Traditions define how AA groups relate to the outside world and to each other. Groups accept no outside money, take no positions on outside issues, and maintain personal anonymity in public media. This keeps the program from being co-opted, politicized, or professionalized.',

    whatToExpect:
      'Your first meeting will probably feel like walking into someone else’s inside joke — the language, the slogans, the hand gestures are all unfamiliar. That’s normal. Most regulars remember their first meeting clearly and will be glad to explain anything afterward. You don’t have to share, identify yourself, or do anything except listen.\n\n' +
      'Meetings come in several formats. Open meetings welcome anyone curious about AA, including family members and friends. Closed meetings are for people who identify as alcoholics or think they might be. Speaker meetings feature one person telling their story (what it was like, what happened, what it’s like now). Discussion meetings invite everyone to share briefly on a topic. Big Book or Step study meetings read from AA literature and discuss.\n\n' +
      'The language in AA’s founding text, the Big Book, was written in the 1930s and reflects that era — including many references to God and “Him.” Modern AA has a range of interpretations: many members use a higher power that is abstract or non-theistic (nature, the group itself, a moral principle). The degree to which God language is front-and-center varies enormously by meeting and by region. Urban areas and college towns tend to have more secular or agnostic-friendly meetings; rural areas sometimes less so.\n\n' +
      'After the meeting, people usually linger, drink bad coffee, and talk. That after-meeting time is often where newcomers get the most practical help — phone numbers, meeting recommendations, straight talk from people who’ve been where you are.',

    bestFor: [
      'People whose primary substance is alcohol',
      'Those who want structured, sequential step work',
      'Anyone who benefits from a sponsor relationship',
      'People open to a spiritual (not necessarily religious) framework',
      'Those who value community accountability and regular meeting attendance',
      'Anyone who needs meetings — AA has the densest meeting schedule of any fellowship globally',
    ],

    notIdealIf: [
      'Your primary substance is drugs other than alcohol — consider NA instead',
      'You want a secular, non-spiritual program — consider SMART Recovery or LifeRing',
      'The word "God" in the Steps is a hard stop for you — LifeRing and SMART are fully secular',
      'You prefer a self-directed, no-sponsor approach — LifeRing is a good fit',
      'You have significant co-occurring mental health needs — professional treatment alongside any fellowship is important',
    ],

    pullQuotes: [
      'The only requirement for membership is a desire to stop drinking.',
      'One alcoholic talking to another could accomplish what doctors, willpower, and religion alone had not.',
      'After the meeting, people linger, drink bad coffee, and talk. That after-meeting time is often where newcomers get the most practical help.',
    ],

    literature: [
      {
        title: 'Alcoholics Anonymous (The Big Book)',
        year: 1939,
        description:
          'The foundational text, written by Bill Wilson with input from early members. The first 164 pages lay out the program; the rest are member stories.',
        coverImage: '/images/fellowships/aa/books/big-book.jpg',
        externalUrl: 'https://www.aa.org/the-big-book',
      },
      {
        title: 'Twelve Steps and Twelve Traditions',
        year: 1953,
        description: "Wilson’s essays on each step and tradition. Widely used during step work with a sponsor.",
        coverImage: '/images/fellowships/aa/books/12-and-12.jpg',
        externalUrl: 'https://www.aa.org/twelve-steps-twelve-traditions',
      },
      {
        title: 'Living Sober',
        year: 1975,
        description:
          'Practical, non-doctrinal advice on the everyday habits of staying sober — handling cravings, social situations, holidays, and more.',
        coverImage: '/images/fellowships/aa/books/living-sober.jpg',
        externalUrl: 'https://www.aa.org/living-sober-book',
      },
      {
        title: 'Daily Reflections',
        year: 1990,
        description: 'A year of short daily readings drawn from AA literature. Popular as a morning practice.',
        coverImage: '/images/fellowships/aa/books/daily-reflections.jpg',
        externalUrl: 'https://www.aa.org/daily-reflections',
      },
    ],

    meetingFinders: [
      {
        name: 'Meeting Guide App',
        url: 'https://www.aa.org/meeting-guide-app',
        description: 'The official AA app for iOS and Android. GPS-aware, shows in-person and online meetings, filters by type (open/closed/speaker/etc.).',
        badge: 'iOS & Android',
      },
      {
        name: 'AA.org Meeting Finder',
        url: 'https://www.aa.org/find-aa',
        description: 'The official web-based meeting search. Enter a city, zip code, or let it use your location. Maintained by AA’s General Service Office.',
        badge: 'Web',
      },
      {
        name: 'AA Online Intergroup',
        url: 'https://www.aa-intergroup.org/meetings',
        description: 'Comprehensive directory of online-only AA meetings (Zoom, phone). Active 24 hours a day. Good for travel, social anxiety, or late-night need.',
        badge: 'Online meetings',
      },
      {
        name: 'In The Rooms',
        url: 'https://www.intherooms.com',
        description: 'Secular platform hosting live-streamed AA and other fellowship meetings. Requires free account. Good for people who want video community alongside local meetings.',
        badge: 'Platform',
      },
    ],

    faqs: [
      {
        question: 'Do I have to believe in God to do AA?',
        answer: 'No. The Steps refer to "God as we understood Him" — that phrase was deliberately chosen to leave room for a higher power of your own understanding. Many members use a non-theistic concept: the group itself, nature, love, a moral principle, or simply something larger than their own thinking. Atheist and agnostic AA meetings exist in most major cities and can be found via the Meeting Guide app.',
      },
      {
        question: 'Is AA free?',
        answer: 'Yes. There are no dues or fees. Most meetings pass a basket to cover rent and coffee — a dollar or two is typical, and newcomers are generally told not to worry about it. AA is fully self-supporting through member contributions and refuses outside donations.',
      },
      {
        question: 'What does "anonymous" actually mean in practice?',
        answer: 'Two things. First, you’re not required to use your last name at meetings — first name only is the norm. Second, members are asked not to identify other members outside the meeting. In public media — social media, press, podcasts — members are asked to maintain full anonymity and not identify as AA members by full name. In daily life, you can tell whomever you want that you go to AA.',
      },
      {
        question: 'Do I have to work all 12 Steps?',
        answer: 'The program suggests all 12 Steps, and many members find the full sequence is what produced lasting change. But AA is a voluntary program — nobody checks your homework. Some people stay sober long-term attending meetings without formally working the Steps. Most old-timers will say the Steps are worth doing, but the choice is yours.',
      },
      {
        question: 'I’m not sure I’m an alcoholic. Can I still come?',
        answer: 'Open meetings are open to anyone curious about AA — you don’t have to identify as an alcoholic to attend. Closed meetings are for people who identify as alcoholics or think they might be. If you’re unsure, open meetings are a good place to listen and decide.',
      },
      {
        question: 'What’s the difference between an open and closed meeting?',
        answer: 'Open meetings welcome everyone — family members, students, journalists, the simply curious. Closed meetings are limited to people who identify as alcoholics or think they might be. Both types are listed in meeting finders; look for the "O" (open) or "C" (closed) tag.',
      },
      {
        question: 'What happens if I drink again (relapse)?',
        answer: 'You come back. AA does not kick people out for relapsing. Most long-term members have at least one relapse in their story. The meeting culture varies — some groups are matter-of-fact about it, a few can be harsh — but the official position is that the door is always open. Many people find their way to lasting sobriety after multiple attempts.',
      },
    ],

    seeAlso: ['na', 'smart-recovery', 'lifering', 'women-for-sobriety'],
  },
};
