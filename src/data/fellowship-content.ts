export interface MeetingFinder {
  name: string;
  url: string;
  description: string;
  badge?: string;
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
}

export const FELLOWSHIP_CONTENT: Record<string, FellowshipContent> = {
  aa: {
    slug: 'aa',
    tagline: 'The original peer-led path out of alcoholism \u2014 free, anonymous, and available almost everywhere.',

    overview:
      'Alcoholics Anonymous was founded in 1935 in Akron, Ohio, when a stockbroker named Bill Wilson and a surgeon named Dr. Bob Smith discovered that one alcoholic talking to another could accomplish what doctors, willpower, and religion alone had not. That conversation became the seed of a worldwide fellowship now numbering roughly two million members across 180 countries.\n\n' +
      'The core of AA is simple: members share their experience, strength, and hope with each other in small, voluntary meetings. There are no dues, no fees, no professional staff, and no government oversight. Attendance and participation are always voluntary. The only requirement for membership is a desire to stop drinking.\n\n' +
      'The 12 Steps and the meetings are the two main pillars. The Steps are a sequence of personal and spiritual actions \u2014 admitting powerlessness, taking stock of one\u2019s life, making amends, and helping other alcoholics \u2014 that members work through at their own pace, usually with a sponsor (a more experienced member who guides the process one-on-one). The meetings provide community: a regular room full of people who understand without explanation.\n\n' +
      'AA\u2019s 12 Traditions govern how the fellowship runs: groups are self-supporting, avoid outside issues, maintain anonymity, and have no formal leadership hierarchy. This structure has kept AA decentralized and intact across nearly nine decades.',

    howItWorks:
      'The 12 Steps are the program\u2019s backbone. They move in sequence: the first three involve admitting the problem and opening to help; Steps Four through Nine involve a searching personal inventory, confessing wrongs to another person, becoming willing to change, and making direct amends where possible; Steps Ten through Twelve are maintenance \u2014 daily inventory, deepening the spiritual practice, and carrying the message to other alcoholics.\n\n' +
      'A sponsor is the person who walks you through the Steps. Sponsors are not counselors or professionals \u2014 they are AA members who have worked the Steps themselves and are willing to share how they did it. The sponsor relationship is one-on-one, informal, and usually involves regular phone calls, coffee meetings, and working through the Big Book or Twelve Steps and Twelve Traditions together.\n\n' +
      'Meetings are where the community happens. Most groups meet weekly at the same time and place \u2014 a church basement, community center, hospital, or online. A typical meeting runs 60\u201390 minutes and includes readings from AA literature, a speaker or discussion topic, and open sharing. Some meetings close with the Serenity Prayer.\n\n' +
      'The 12 Traditions define how AA groups relate to the outside world and to each other. Groups accept no outside money, take no positions on outside issues, and maintain personal anonymity in public media. This keeps the program from being co-opted, politicized, or professionalized.',

    whatToExpect:
      'Your first meeting will probably feel like walking into someone else\u2019s inside joke \u2014 the language, the slogans, the hand gestures are all unfamiliar. That\u2019s normal. Most regulars remember their first meeting clearly and will be glad to explain anything afterward. You don\u2019t have to share, identify yourself, or do anything except listen.\n\n' +
      'Meetings come in several formats. Open meetings welcome anyone curious about AA, including family members and friends. Closed meetings are for people who identify as alcoholics or think they might be. Speaker meetings feature one person telling their story (what it was like, what happened, what it\u2019s like now). Discussion meetings invite everyone to share briefly on a topic. Big Book or Step study meetings read from AA literature and discuss.\n\n' +
      'The language in AA\u2019s founding text, the Big Book, was written in the 1930s and reflects that era \u2014 including many references to God and \u201cHim.\u201d Modern AA has a range of interpretations: many members use a higher power that is abstract or non-theistic (nature, the group itself, a moral principle). The degree to which God language is front-and-center varies enormously by meeting and by region. Urban areas and college towns tend to have more secular or agnostic-friendly meetings; rural areas sometimes less so.\n\n' +
      'After the meeting, people usually linger, drink bad coffee, and talk. That after-meeting time is often where newcomers get the most practical help \u2014 phone numbers, meeting recommendations, straight talk from people who\u2019ve been where you are.',

    bestFor: [
      'People whose primary substance is alcohol',
      'Those who want structured, sequential step work',
      'Anyone who benefits from a sponsor relationship',
      'People open to a spiritual (not necessarily religious) framework',
      'Those who value community accountability and regular meeting attendance',
      'Anyone who needs meetings \u2014 AA has the densest meeting schedule of any fellowship globally',
    ],

    notIdealIf: [
      'Your primary substance is drugs other than alcohol \u2014 consider NA instead',
      'You want a secular, non-spiritual program \u2014 consider SMART Recovery or LifeRing',
      'The word "God" in the Steps is a hard stop for you \u2014 LifeRing and SMART are fully secular',
      'You prefer a self-directed, no-sponsor approach \u2014 LifeRing is a good fit',
      'You have significant co-occurring mental health needs \u2014 professional treatment alongside any fellowship is important',
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
        description: 'The official web-based meeting search. Enter a city, zip code, or let it use your location. Maintained by AA\u2019s General Service Office.',
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
        answer: 'No. The Steps refer to "God as we understood Him" \u2014 that phrase was deliberately chosen to leave room for a higher power of your own understanding. Many members use a non-theistic concept: the group itself, nature, love, a moral principle, or simply something larger than their own thinking. Atheist and agnostic AA meetings exist in most major cities and can be found via the Meeting Guide app.',
      },
      {
        question: 'Is AA free?',
        answer: 'Yes. There are no dues or fees. Most meetings pass a basket to cover rent and coffee \u2014 a dollar or two is typical, and newcomers are generally told not to worry about it. AA is fully self-supporting through member contributions and refuses outside donations.',
      },
      {
        question: 'What does "anonymous" actually mean in practice?',
        answer: 'Two things. First, you\u2019re not required to use your last name at meetings \u2014 first name only is the norm. Second, members are asked not to identify other members outside the meeting. In public media \u2014 social media, press, podcasts \u2014 members are asked to maintain full anonymity and not identify as AA members by full name. In daily life, you can tell whomever you want that you go to AA.',
      },
      {
        question: 'Do I have to work all 12 Steps?',
        answer: 'The program suggests all 12 Steps, and many members find the full sequence is what produced lasting change. But AA is a voluntary program \u2014 nobody checks your homework. Some people stay sober long-term attending meetings without formally working the Steps. Most old-timers will say the Steps are worth doing, but the choice is yours.',
      },
      {
        question: 'I\u2019m not sure I\u2019m an alcoholic. Can I still come?',
        answer: 'Open meetings are open to anyone curious about AA \u2014 you don\u2019t have to identify as an alcoholic to attend. Closed meetings are for people who identify as alcoholics or think they might be. If you\u2019re unsure, open meetings are a good place to listen and decide.',
      },
      {
        question: 'What\u2019s the difference between an open and closed meeting?',
        answer: 'Open meetings welcome everyone \u2014 family members, students, journalists, the simply curious. Closed meetings are limited to people who identify as alcoholics or think they might be. Both types are listed in meeting finders; look for the "O" (open) or "C" (closed) tag.',
      },
      {
        question: 'What happens if I drink again (relapse)?',
        answer: 'You come back. AA does not kick people out for relapsing. Most long-term members have at least one relapse in their story. The meeting culture varies \u2014 some groups are matter-of-fact about it, a few can be harsh \u2014 but the official position is that the door is always open. Many people find their way to lasting sobriety after multiple attempts.',
      },
    ],

    seeAlso: ['na', 'smart-recovery', 'lifering', 'women-for-sobriety'],
  },
};
