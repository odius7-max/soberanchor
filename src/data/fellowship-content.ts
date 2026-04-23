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

  'na': {
    slug: 'na',
    tagline: 'A 12-step fellowship for anyone whose primary struggle is drug addiction — any drug, any addict.',

    overview:
      'Narcotics Anonymous was founded in Los Angeles in 1953 by a small group of people who had gotten sober in AA but felt their experience as drug addicts wasn’t fully captured in rooms focused on alcohol. Jimmy Kinnon and a handful of others began meeting separately, using AA’s 12 Steps as a framework but reframing the problem as addiction itself rather than any single substance. The fellowship grew slowly for its first two decades, then expanded rapidly after the publication of the Basic Text in 1983. Today NA reports approximately 70,000 groups across 144 countries and is the largest recovery fellowship for drug addiction in the world.\n\n' +
      'NA’s central premise is that addiction is a disease, not a relationship with one particular drug. That’s why NA members identify as "addicts" rather than as alcoholics or heroin addicts or cocaine users — the specific substance is almost beside the point. The understanding is that the addictive pattern is the same regardless of what was used. Many members cycled through multiple substances before finding NA; others came after AA rooms told them they didn’t belong because their drug of choice wasn’t alcohol.\n\n' +
      'Structurally, NA is nearly identical to AA: 12 Steps (adapted with new wording), 12 Traditions (almost identical), and 12 Concepts for service. Groups are autonomous, self-supporting, and non-professional. There are no fees, no leadership hierarchy, and no central authority. The Basic Text — NA’s equivalent of AA’s Big Book — is treated as the authoritative program description, though the fellowship continues to produce new literature through a democratic approval process.\n\n' +
      'NA uses "clean" rather than "sober" — a small but meaningful language choice. Sobriety historically meant not drinking; "clean" captures the broader sense of being free from any drug, including alcohol (which NA considers a drug). If you’ve been to AA and heard someone say "I have 30 days sober," in NA you’ll hear "I have 30 days clean." The open-ended membership — "the only requirement is a desire to stop using" — means anyone who struggles with any substance is welcome, regardless of what they used.',

    howItWorks:
      'The 12 Steps are NA’s backbone. Adapted from AA, they follow the same sequence: admitting powerlessness, taking personal inventory, making amends to people harmed, and developing ongoing spiritual practice. The wording is changed to reference addiction rather than alcohol — Step One reads, "We admitted that we were powerless over our addiction, that our lives had become unmanageable." Members work the Steps with a sponsor, at their own pace, usually over months or years.\n\n' +
      'A sponsor in NA is a more experienced member who has worked the Steps themselves and is willing to guide a newcomer through the same process. Sponsor relationships are informal, one-on-one, and free. Most members find a sponsor by attending meetings regularly, identifying someone whose recovery they want, and asking directly. The sponsor-sponsee relationship often involves regular phone calls, coffee meetings, and working through NA literature together.\n\n' +
      'Meetings are where the community happens. Typical meetings run 60 to 90 minutes and follow a format: opening readings (often "Who Is an Addict?", "What Is the NA Program?", and "Why Are We Here?"), a main share (either one speaker’s story or topic-based discussion), and a closing prayer or reading. Most meetings offer chips or keychains to acknowledge milestones: 24 hours, 30 days, 60 days, 90 days, six months, nine months, one year, and multi-year anniversaries.\n\n' +
      'The 12 Traditions govern how groups relate to each other and to the outside world. NA is self-supporting through member contributions, takes no positions on outside issues, and maintains personal anonymity in public media. These principles keep NA decentralized — each group is autonomous — and resistant to professionalization or politicization.',

    whatToExpect:
      'Your first NA meeting will look a lot like an AA meeting: a circle or rows of chairs, a secretary or chairperson at the front, readings at the start, a speaker or topic, and open sharing. What’s different is the language. People identify as addicts. They talk about clean time rather than sobriety. And the specific substance history is often not the focus — members share about what their life was like, what happened to bring them in, and what it’s like now, without much dwelling on the particular drugs.\n\n' +
      'Meeting formats vary. Speaker meetings feature one member telling their story (30–45 minutes, followed by time for others to share briefly). Discussion meetings invite everyone to share on a topic someone raises. Literature study meetings read from the Basic Text or other NA literature and discuss. Step study meetings focus on one Step at a time, reading from NA’s Step Working Guides and discussing personal experience.\n\n' +
      'On Medication-Assisted Treatment (MAT) — methadone, buprenorphine (Suboxone), or naltrexone — NA’s official position is nuanced and often misunderstood. Under Tradition 3, anyone with a desire to stop using is welcome to attend. However, NA’s official literature (Bulletin #29, 1996) does not recognize members taking MAT as "clean" — in NA’s view, substituting one substance for another doesn’t constitute abstinence. In practice, members on MAT may be asked not to share during meetings, not to count clean time publicly, and not to hold service positions. Individual meetings vary widely: urban and more progressive meetings are often welcoming, while stricter groups adhere closely to the literature. If you’re on MAT, it’s worth calling the local NA helpline or trying a few meetings to find one that fits. This is one of the most debated topics inside NA right now, and the culture is slowly shifting.\n\n' +
      'After the meeting, people linger — same as AA. Phone numbers get exchanged. Newcomers are often told to call someone before they pick up. That after-meeting time, along with the sponsorship relationship and the steady rhythm of meetings, is where recovery actually happens. The meeting itself is a setup for those connections.',

    bestFor: [
      'People whose primary substances are anything other than alcohol alone',
      'Anyone who attended AA and felt their experience as a drug user wasn’t fully addressed',
      'People who see addiction itself — not a specific drug — as the problem',
      'Those who want the 12-step framework (sponsor, Steps, meetings) adapted for any substance',
      'Anyone looking for the largest recovery fellowship for drug addiction globally',
      'People who want access to meetings covering multiple substances in a single room',
    ],

    notIdealIf: [
      'Your primary substance is alcohol alone — AA may feel more specific and well-matched',
      'You want a secular, non-spiritual framework — consider SMART Recovery or LifeRing',
      'You prefer science-based cognitive tools over peer sharing and Steps — SMART Recovery',
      'You want a Buddhist-informed approach — Refuge Recovery or Recovery Dharma',
      'You’re on MAT and your local NA community isn’t welcoming — attitudes vary widely; shop around',
    ],

    meetingFinders: [
      {
        name: 'NA Meeting Search',
        url: 'https://www.na.org/meetingsearch/',
        description: 'The official NA.org meeting finder. Search by city, zip, or country. Covers in-person and online meetings globally.',
        badge: 'Web',
      },
      {
        name: 'NA Meeting Search app',
        url: 'https://www.na.org/?ID=mbnabic',
        description: 'Official NA mobile app for iOS and Android. Location-aware, filters by meeting type and format.',
        badge: 'iOS & Android',
      },
      {
        name: 'Virtual NA',
        url: 'https://virtual-na.org/meetings/',
        description: 'Directory of online-only NA meetings from around the world. Useful for odd hours, travel, or when a local meeting isn’t a fit.',
        badge: 'Online meetings',
      },
    ],

    faqs: [
      {
        question: 'Can I attend NA if I’m on Suboxone or methadone?',
        answer: 'Yes. NA’s official literature states that members taking medication prescribed by a doctor for a legitimate condition are still considered clean. Some meetings are more welcoming of MAT than others — attitudes vary by region and individual. If one group isn’t a fit, try another.',
      },
      {
        question: 'How is NA different from AA?',
        answer: 'The structures are nearly identical — 12 Steps, sponsorship, meetings, Traditions. The difference is framing. AA centers alcohol; NA centers addiction itself. NA uses "clean" instead of "sober," welcomes any substance, and tends to be more focused on the disease concept than the specific drug.',
      },
      {
        question: 'Do I have to call myself an addict at my first meeting?',
        answer: 'No. You don’t have to speak, identify, or share at all. If you do share, you can just give your first name. Identifying as an addict is part of the program for most members, but it’s not a requirement for attendance.',
      },
      {
        question: 'What if alcohol is my main drug — should I go to NA or AA?',
        answer: 'Either can work. NA considers alcohol a drug and welcomes people whose primary substance is alcohol. AA is more targeted if alcohol is your only issue. Many people try both and see which room feels more like home.',
      },
      {
        question: 'Do I need a sponsor right away?',
        answer: 'No. Most newcomers spend a few weeks or months attending meetings, getting to know people, and finding someone whose recovery they want before asking for sponsorship. A sponsor isn’t required for attendance — but most long-term members say sponsorship was essential to working the Steps.',
      },
    ],

    seeAlso: ['aa', 'smart-recovery', 'heroin-anonymous', 'crystal-meth-anonymous', 'cocaine-anonymous'],

    pullQuotes: [
      'The only requirement for membership is a desire to stop using.',
      'We are not interested in what or how much you used, but only in what you want to do about your problem and how we can help.',
      'Just for today, I will do one thing for my recovery.',
    ],

    literature: [
      {
        title: 'Narcotics Anonymous (The Basic Text)',
        year: 1983,
        description: 'The foundational text, written collectively by NA members through 17 drafts over a decade. Contains the program description and dozens of personal stories.',
        coverImage: '/images/fellowships/na/books/basic-text.jpg',
        externalUrl: 'https://www.na.org/?ID=bt',
      },
      {
        title: 'It Works: How and Why',
        year: 1993,
        description: 'NA’s detailed interpretation of the 12 Steps and 12 Traditions. Widely used during step work with a sponsor.',
        coverImage: '/images/fellowships/na/books/it-works.jpg',
        externalUrl: 'https://www.na.org/?ID=itw',
      },
      {
        title: 'Just for Today',
        year: 1992,
        description: 'Daily meditation book with a reading for every day of the year. Popular as a morning practice.',
        coverImage: '/images/fellowships/na/books/just-for-today.jpg',
        externalUrl: 'https://www.na.org/?ID=JFT',
      },
      {
        title: 'Narcotics Anonymous Step Working Guides',
        year: 1998,
        description: 'Practical workbook for working each of the 12 Steps with a sponsor. Questions and exercises for each Step.',
        coverImage: '/images/fellowships/na/books/step-working-guides.jpg',
        externalUrl: 'https://www.na.org/?ID=stepwg',
      },
    ],
  },

  'smart-recovery': {
    slug: 'smart-recovery',
    tagline: 'A secular, science-based program using cognitive-behavioral tools to change the behavior of addiction. No Steps, no sponsor, no higher power.',

    overview:
      'SMART Recovery — Self-Management and Recovery Training — was founded in 1994 in Mentor, Ohio. It grew out of Rational Recovery, a 1980s secular alternative to AA. SMART’s founders wanted to separate the evolving body of secular, evidence-based recovery work from Rational Recovery’s specific approach and founder personality. Today SMART operates roughly 3,000 weekly meetings globally, with a strong online presence — meetings run seven days a week on Zoom, often around the clock.\n\n' +
      'SMART differs from 12-step fellowships in almost every structural way. It does not use the disease model of addiction. It treats addictive behavior as a learned pattern that can be changed through cognitive-behavioral techniques. There are no Steps, no sponsors, no higher power, and no lifetime commitment. Graduation is an explicit goal — members are expected to build the tools they need and eventually move on, optionally staying connected to the community to help others.\n\n' +
      'Meetings are facilitated by trained volunteers — often people in recovery themselves, sometimes mental health professionals. Facilitators aren’t sponsors and don’t maintain an ongoing one-on-one relationship with members. Meetings are conversational and tool-focused: someone raises a challenge, the group works through it using SMART’s tools, and everyone leaves with something practical to try.\n\n' +
      'The program draws from Cognitive Behavioral Therapy (CBT), Rational Emotive Behavior Therapy (REBT), and Motivational Interviewing. It treats every member as capable of managing their own recovery with practical skills. That orientation makes SMART a natural fit for people who bristle at 12-step language — "powerless," "higher power," "character defects" — and want tools they can understand, measure, and control.',

    howItWorks:
      'SMART’s curriculum is the 4-Point Program: (1) Building and maintaining motivation, (2) Coping with urges, (3) Managing thoughts, feelings, and behaviors, and (4) Living a balanced life. The Points aren’t sequential Steps. You work on whichever is most relevant to what you’re facing today. Motivation and urges tend to dominate early recovery; behavior and balance tend to take over later on.\n\n' +
      'SMART teaches specific tools with acronym-heavy names that sound corporate but work. The ABC Model (Activating event → Beliefs → Consequences) comes from REBT and helps members see how thoughts drive emotions and behavior. DISARM (Destructive Images and Self-talk Awareness and Refusal Method) is a tool for catching and reframing urge-related thinking. The Cost-Benefit Analysis is a written exercise for examining why you want to use versus why you want to quit. The Change Plan Worksheet formalizes goals and tracking.\n\n' +
      'Meetings are conversational and structured around the tools. A facilitator opens by checking in, asks who has something to work on, and the group applies SMART tools to the situation. Members may discuss homework from prior meetings or raise new challenges. Most meetings end with a brief "commitment to action" — one thing each member will do before next week.\n\n' +
      'There’s no sponsor system. Members are encouraged to build social support through the group, use SMART’s online forums and chat rooms, and contact a facilitator between meetings if helpful. SMART publishes a workbook, audio lessons, and online courses — the program can be worked independently by people who can’t attend meetings or want to supplement them.',

    whatToExpect:
      'A SMART meeting feels like a support group crossed with a workshop. Usually 60 to 90 minutes, held in community centers, libraries, addiction treatment centers, or (very commonly) online on Zoom. The facilitator introduces the format, welcomes newcomers, and opens the floor. You don’t have to share. You don’t identify as anything — no "I’m Travis, and I’m an alcoholic." Members introduce themselves by first name if they choose.\n\n' +
      'The atmosphere is notably different from 12-step. There’s no prayer at the beginning or end. The facilitator might say things like "What tool could we use here?" or "What belief was underneath that feeling?" Members share specific situations and work through them together. The energy is practical, not confessional. Humor is common. Skepticism is welcome.\n\n' +
      'After the meeting, there’s usually a brief social window — less formal than AA’s "coffee after" but similar in spirit. SMART also maintains a large online community with 24/7 chat rooms, message boards, and numerous online meetings. Members often combine a local in-person meeting with one or two online ones per week, plus self-study from the SMART Recovery Handbook.',

    bestFor: [
      'People who want a secular, non-spiritual program',
      'Those who prefer science-based cognitive tools over peer sharing and confession',
      'Anyone who bristles at 12-step language ("powerless," "higher power," "character defects")',
      'People who want a program they can potentially graduate from',
      'Self-directed learners comfortable working with structured tools and worksheets',
      'Anyone who wants online meetings available at essentially any hour',
    ],

    notIdealIf: [
      'You want the intimacy and peer accountability of a sponsor relationship — consider AA, NA, or LifeRing',
      'You find structured cognitive tools alienating and prefer emotional processing — AA, NA, or Recovery Dharma',
      'You want a spiritually or religiously grounded framework — AA, NA, Celebrate Recovery, or Refuge Recovery',
      'You’re looking for the densest possible in-person meeting network near you — AA has far more meetings',
      'You prefer a women-only space — Women for Sobriety',
    ],

    meetingFinders: [
      {
        name: 'SMART Recovery Meeting Finder',
        url: 'https://meetings.smartrecovery.org/',
        description: 'Primary meeting finder. Filter by in-person, online, language, and specialty focus (family/friends, teens, LGBTQ+, etc.).',
        badge: 'Web',
      },
      {
        name: 'SMART Recovery mobile app',
        url: 'https://smartrecovery.org/smart-recovery-app',
        description: 'Official iOS and Android app. Meeting search, tool library, progress tracking.',
        badge: 'iOS & Android',
      },
      {
        name: 'SMART Recovery Online Community',
        url: 'https://smartrecovery.org/community',
        description: '24/7 chat rooms, message boards, and online meetings. Free to join, requires account.',
        badge: 'Online community',
      },
    ],

    faqs: [
      {
        question: 'Do I need to be a CBT expert to use SMART?',
        answer: 'No. The tools are designed to be learned in the meetings themselves. Most members pick up the basics in a few weeks of regular attendance, then deepen their practice over time.',
      },
      {
        question: 'Can I do SMART and AA at the same time?',
        answer: 'Yes, and many people do. The frameworks aren’t mutually exclusive — some members use SMART’s cognitive tools for daily practice and attend AA for community and sponsorship.',
      },
      {
        question: 'Is SMART against abstinence?',
        answer: 'Not at all. Most SMART members aim for complete abstinence. The program does, however, recognize harm reduction and moderation as legitimate goals when appropriate, which differs from the 12-step abstinence-only model.',
      },
      {
        question: 'How do I know when I’m "done" with SMART?',
        answer: 'Graduation is a personal decision. Members typically consider graduating when they’ve consistently applied the tools, feel confident managing their recovery independently, and no longer feel the meetings are their primary support. Many stay involved as facilitators to help others.',
      },
      {
        question: 'Is there a sponsor-like relationship in SMART?',
        answer: 'Not formally. SMART’s model assumes members can self-manage with tools and community support. That said, facilitators are available between meetings, and some members build informal mentoring relationships with each other.',
      },
    ],

    seeAlso: ['aa', 'lifering', 'na', 'women-for-sobriety'],

    pullQuotes: [
      'SMART treats addictive behavior as something you can change, not a disease you carry for life.',
      'Recovery is something you can graduate from.',
      'What tool could we use here?',
    ],

    literature: [
      {
        title: 'SMART Recovery Handbook (3rd ed.)',
        year: 2013,
        description: 'The core workbook for the 4-Point Program. Covers every tool with exercises. Used in meetings and for self-study.',
        coverImage: '/images/fellowships/smart-recovery/books/handbook.jpg',
        externalUrl: 'https://smartrecovery.org/product/smart-recovery-handbook',
      },
      {
        title: 'From This Day Forward',
        year: 2015,
        description: 'A SMART-aligned guide by Tom Horvath, written for members and their families. Practical cognitive approach to recovery.',
        coverImage: '/images/fellowships/smart-recovery/books/from-this-day-forward.jpg',
      },
      {
        title: 'Recovery Unleashed',
        year: 2019,
        description: 'Newer, more accessible introduction by Hank Robb and Tom Horvath. Good first read for newcomers curious about SMART.',
        coverImage: '/images/fellowships/smart-recovery/books/recovery-unleashed.jpg',
      },
    ],
  },

  'refuge-recovery': {
    slug: 'refuge-recovery',
    tagline: 'A Buddhist-informed path to recovery grounded in the Four Noble Truths. Meditation-centered, secular, open to all backgrounds.',

    overview:
      'Refuge Recovery was founded in 2014 by Noah Levine, a Buddhist teacher and author of the memoir "Dharma Punx." Levine adapted the Buddha’s Four Noble Truths and Eightfold Path into a recovery framework, drawing on his own experience moving through addiction into long-term sobriety via Buddhist practice. The fellowship grew rapidly through the late 2010s, with meetings across North America, Europe, and Australia.\n\n' +
      'The central premise is taken directly from Buddhism: addiction is a form of suffering (dukkha), it has identifiable causes (craving, aversion, delusion), freedom from it is possible, and there is a path of practice that leads to that freedom. That path is the Eightfold Path — wise understanding, intention, speech, action, livelihood, effort, mindfulness, and concentration — adapted for the specifics of recovery.\n\n' +
      'Refuge Recovery is secular in the sense that it requires no religious belief, but it is explicitly grounded in Buddhist teachings. You don’t need to be Buddhist to attend or benefit. Many members have no prior exposure to Buddhism and treat the practices as practical tools for understanding the mind. Others deepen their engagement with Buddhism through the fellowship.\n\n' +
      'In 2019–2020 the organization went through a significant split. A large portion of members and meetings left to form Recovery Dharma over governance concerns and serious allegations against Levine. Refuge Recovery continues to operate, though smaller than before the split. If you’re researching Buddhist-informed recovery, it’s worth looking at both Refuge Recovery and Recovery Dharma and choosing what fits your values and the local community you find.',

    howItWorks:
      'The program is organized around the Four Noble Truths and the Eightfold Path. The first three Truths are understood: addiction is suffering, it has causes, and liberation is possible. The fourth Truth — the Eightfold Path — is the method. Members work each Path element in sequence over months, using questions and exercises from the Refuge Recovery book. The path isn’t walked alone; a mentor (similar to a sponsor) guides the process.\n\n' +
      'Meditation is the core daily practice. Members are encouraged to sit daily, using breath-awareness and metta (loving-kindness) as foundations. Specific meditations are introduced as members move through the Path — forgiveness meditations, meditations on craving, body-scan practices. Meditation is not a side activity; it’s treated as the primary tool for changing the relationship with craving and reactivity.\n\n' +
      'Meetings combine silent meditation with readings and sharing. A typical meeting opens with a 20-minute guided or silent sit, moves into a reading from the Refuge Recovery book or a dharma talk, then opens for sharing. Members share from their practice and experience, often in relation to the topic. There’s no speaker format in the AA sense; the meditation is the speaker.\n\n' +
      'The mentor relationship is similar to AA sponsorship but with a Buddhist overlay. Mentors are experienced members who guide newcomers through the Path. The relationship often includes meditation instruction, periodic one-on-one meetings, and ongoing support. As with 12-step sponsorship, you choose your mentor based on connection and the quality of recovery you see in them.',

    whatToExpect:
      'Your first Refuge Recovery meeting will feel calm and quiet compared to most 12-step rooms. The space often has a low-key altar — a candle, perhaps a small Buddha statue, meditation cushions along with chairs. Shoes off is common but not required. The tone is contemplative rather than energetic.\n\n' +
      'Meetings typically open with a bell or short welcome, then move straight into 15–20 minutes of meditation, sometimes guided, sometimes silent. You don’t need to know how to meditate — instructions are usually offered for newcomers. After the sit there’s a reading, brief teaching, and open sharing. People share about their practice and their lives. Cross-talk isn’t done. Closing is usually a dedication of merit and a group bow.\n\n' +
      'The language differs from 12-step in important ways. There’s no talk of powerlessness or higher power; instead, the vocabulary is about craving, aversion, mindfulness, compassion, and the mind’s habits. Members sometimes identify by practice milestones rather than clean time ("I’ve been meditating daily for six months"). The culture is gentler, more introspective, and tends to attract people who found 12-step rooms too intense or too faith-based.\n\n' +
      'After meetings, people often linger and talk. Many local Refuge Recovery groups organize day-long retreats, meditation sits, and occasional longer retreats with dharma teachers. These deeper-practice opportunities are where many members build their commitment to the path.',

    bestFor: [
      'People drawn to meditation and contemplative practice',
      'Those who want a recovery framework grounded in a coherent philosophical tradition',
      'Anyone turned off by 12-step language around powerlessness and higher power',
      'People who want to work with craving and reactivity at the level of the mind itself',
      'Newcomers to Buddhism who want practical, recovery-focused introduction',
      'Experienced Buddhists integrating their practice with specific addiction work',
    ],

    notIdealIf: [
      'You want a talkative, high-energy fellowship with lots of sharing — AA or NA',
      'You’re put off by the controversies around Noah Levine — consider Recovery Dharma, which has similar content under a more democratic structure',
      'You want a secular but non-Buddhist framework — SMART Recovery or LifeRing',
      'You need the density of nightly meetings everywhere — AA or NA have much wider reach',
      'A sponsor-led, Steps-based approach feels right for you — AA or NA',
    ],

    meetingFinders: [
      {
        name: 'Refuge Recovery Meeting Finder',
        url: 'https://refugerecovery.org/meetings',
        description: 'Primary meeting finder on the Refuge Recovery website. Search by country, region, or online.',
        badge: 'Web',
      },
      {
        name: 'Refuge Recovery app',
        url: 'https://refugerecovery.org/rr-app',
        description: 'Official mobile app with meeting finder, guided meditations, and literature.',
        badge: 'iOS & Android',
      },
    ],

    faqs: [
      {
        question: 'Do I need to be Buddhist to attend?',
        answer: 'No. The program uses Buddhist teachings as a framework, but no belief or identity is required. Many members come in with no prior Buddhism background. Others are longtime practitioners.',
      },
      {
        question: 'What’s the difference between Refuge Recovery and Recovery Dharma?',
        answer: 'Both use Buddhist teachings for recovery. Recovery Dharma was formed in 2019 by members who left Refuge Recovery over governance and allegations against Refuge’s founder. Recovery Dharma is peer-led and democratic; Refuge Recovery retains its original structure. The practices are similar.',
      },
      {
        question: 'Do I have to meditate?',
        answer: 'Meditation is core to the program. If you’ve never meditated, the meetings themselves teach you how, and you can start very small. Sitting in a meeting with others is a lower bar than daily solo practice — that can build over time.',
      },
      {
        question: 'Is there a mentor/sponsor system?',
        answer: 'Yes, called a mentor. Mentors are experienced members who guide newer members through the Eightfold Path and offer meditation instruction. The relationship is similar to a sponsor but with a Buddhist overlay.',
      },
      {
        question: 'Can I do Refuge Recovery alongside AA or NA?',
        answer: 'Yes. Many members pair Refuge Recovery’s meditation-focused practice with 12-step meetings for community and sponsorship. The frameworks complement each other well.',
      },
    ],

    seeAlso: ['recovery-dharma', 'smart-recovery', 'aa', 'na'],

    pullQuotes: [
      'Addiction is suffering. Recovery is the path of liberation.',
      'The meditation is the speaker.',
      'Not a religion, but a practice.',
    ],

    literature: [
      {
        title: 'Refuge Recovery: A Buddhist Path to Recovering from Addiction',
        year: 2014,
        description: 'The foundational text by Noah Levine. Lays out the Four Noble Truths and Eightfold Path as a recovery framework with exercises for each.',
        coverImage: '/images/fellowships/refuge-recovery/books/refuge-recovery.jpg',
      },
      {
        title: 'Dharma Punx',
        year: 2003,
        description: 'Levine’s memoir of addiction, punk rock, and Buddhist awakening. Context for how Refuge Recovery came to be.',
        coverImage: '/images/fellowships/refuge-recovery/books/dharma-punx.jpg',
      },
    ],
  },

  'recovery-dharma': {
    slug: 'recovery-dharma',
    tagline: 'Peer-led Buddhist recovery. Same core practices as Refuge Recovery, democratic structure, no central founder figure.',

    overview:
      'Recovery Dharma was formed in 2019 by members who left Refuge Recovery over governance concerns and serious allegations against Refuge’s founder. The new fellowship kept the core Buddhist framework — the Four Noble Truths, the Eightfold Path, and meditation as primary practice — but restructured itself to be fully peer-led and democratic, with no central teacher or founder personality. The Recovery Dharma book was written collectively by members and is freely available online.\n\n' +
      'The premise is the same as in Refuge Recovery: addiction is a form of suffering rooted in craving, aversion, and delusion; freedom is possible; the Eightfold Path is the method. What differs is governance, tone, and literature. Recovery Dharma’s decentralization is a direct response to what members saw as the risks of founder-driven organizations. Every significant decision is made democratically at the local and international levels.\n\n' +
      'Growth has been rapid. Within a few years of founding, Recovery Dharma had over 500 meetings globally, strong online presence, and an active publishing arm. The culture skews younger and more politically progressive than many 12-step rooms, though this varies by location.\n\n' +
      'If you’re choosing between Refuge Recovery and Recovery Dharma, the practice content is similar; the difference is culture and governance. Recovery Dharma emphasizes collective authorship, peer authority, and democratic process. Refuge Recovery retains more of a traditional teacher-student lineage model. Try a meeting of each if both are available in your area.',

    howItWorks:
      'The program centers on the Four Noble Truths and the Eightfold Path, same as Refuge Recovery. Members work through the Path element by element, using the Recovery Dharma book’s questions and exercises. Progress isn’t measured in days clean; it’s measured in depth of practice and clarity of understanding.\n\n' +
      'Meditation is the daily foundation. The program teaches breath meditation, metta (loving-kindness), body scan, forgiveness practices, and specific meditations for working with craving and reactivity. Members are encouraged to sit daily and deepen their practice through retreats, dharma talks, and study.\n\n' +
      'Instead of sponsors, Recovery Dharma uses mentors (sometimes called "wise friends"). Mentors are experienced members who guide newcomers through the Path. The relationship is informal, mutual, and emphasizes collaboration over hierarchy. Many members work with multiple mentors over time — the program explicitly discourages over-reliance on any single teacher.\n\n' +
      'Service and community are central. Meetings are run entirely by members. Service positions rotate. Decisions about literature, meeting formats, and organizational direction are made through member votes. This peer-led structure is considered essential to the integrity of the program — a direct lesson from the 2019 split.',

    whatToExpect:
      'A Recovery Dharma meeting feels similar to a Refuge Recovery meeting but often with a slightly more contemporary, collaborative atmosphere. Meetings usually open with a short welcome, move into 15–20 minutes of meditation (sometimes guided, sometimes silent), followed by a reading from the Recovery Dharma book and open sharing.\n\n' +
      'The atmosphere is quiet, contemplative, and inclusive. People share about their practice, their struggles, and how the teachings are landing in daily life. There’s no talk of powerlessness or higher power. The vocabulary is Buddhist: suffering, craving, mindfulness, compassion, sangha (community). Cross-talk isn’t done.\n\n' +
      'Newcomers are welcome and often specifically acknowledged at the start. You don’t need to know meditation to attend. Instructions are offered; sitting in a group is easier than sitting alone. Many members come from 12-step backgrounds and use Recovery Dharma as a complement; others come with no prior recovery experience and find the Buddhist frame more accessible than AA.\n\n' +
      'The Recovery Dharma book is free online in both text and audio form — a deliberate decision, since cost shouldn’t be a barrier to practice. This openness extends to the rest of the program: online meetings are abundant, retreats are often by donation, and the culture emphasizes accessibility.',

    bestFor: [
      'People drawn to meditation and Buddhist teachings',
      'Those who want a peer-led, democratic fellowship without a central founder figure',
      'Anyone who appreciated Refuge Recovery’s content but left over governance issues',
      'People who prefer collaborative learning to hierarchical teacher-student models',
      'Newcomers to Buddhism who want accessible, practical introduction alongside recovery',
      'Members of online sanghas (practice communities) — Recovery Dharma has a strong online footprint',
    ],

    notIdealIf: [
      'You want the density of nightly meetings everywhere — AA or NA have much wider geographic reach',
      'You prefer a teacher-led lineage model — Refuge Recovery retains more of that structure',
      'You want secular cognitive tools rather than Buddhist framing — SMART Recovery or LifeRing',
      'You want a Steps-based, sponsor-led approach — AA or NA',
      'You’re looking for a Christian framework — Celebrate Recovery',
    ],

    meetingFinders: [
      {
        name: 'Recovery Dharma Meeting Finder',
        url: 'https://recoverydharma.org/meetings',
        description: 'Primary meeting finder on the Recovery Dharma website. Search by country, state, or online.',
        badge: 'Web',
      },
      {
        name: 'Recovery Dharma Online',
        url: 'https://recoverydharma.online/',
        description: 'Dedicated portal for online meetings, including 24/7 offerings across time zones.',
        badge: 'Online meetings',
      },
    ],

    faqs: [
      {
        question: 'How is Recovery Dharma different from Refuge Recovery?',
        answer: 'The practice content — Four Noble Truths, Eightfold Path, meditation — is nearly identical. The difference is governance. Recovery Dharma is peer-led and democratic; Refuge Recovery retains a more traditional teacher-founder structure. Recovery Dharma was formed in 2019 by members who left Refuge Recovery.',
      },
      {
        question: 'Do I need to be Buddhist?',
        answer: 'No. The program is grounded in Buddhist teachings but requires no religious belief or identity. Many members come in with no prior Buddhism background.',
      },
      {
        question: 'Is the book really free?',
        answer: 'Yes. The Recovery Dharma book is available as a free PDF and audiobook on the website. Print copies can be purchased at cost. Accessibility is a deliberate design choice.',
      },
      {
        question: 'Can I do Recovery Dharma alongside AA or NA?',
        answer: 'Yes, many members do. The frameworks complement each other — use Recovery Dharma for meditation and Buddhist-informed practice, and 12-step rooms for community, sponsorship, and Steps.',
      },
      {
        question: 'Is there sponsorship?',
        answer: 'Not in the 12-step sense. Recovery Dharma uses mentors, sometimes called "wise friends," who guide newer members through the Path. The relationship is informal and mutual; members often work with multiple mentors over time.',
      },
    ],

    seeAlso: ['refuge-recovery', 'smart-recovery', 'aa', 'na'],

    pullQuotes: [
      'No one is going to save us. We save ourselves through community, meditation, and wise intention.',
      'The book is free because cost shouldn’t be a barrier to practice.',
      'Every decision is made by the members. That’s the point.',
    ],

    literature: [
      {
        title: 'Recovery Dharma',
        year: 2019,
        description: 'The foundational text, written collectively by members. Lays out the program and the Eightfold Path as applied to recovery. Free online.',
        coverImage: '/images/fellowships/recovery-dharma/books/recovery-dharma.jpg',
        externalUrl: 'https://recoverydharma.org/the-book',
      },
    ],
  },

  'celebrate-recovery': {
    slug: 'celebrate-recovery',
    tagline: 'A Christ-centered recovery program hosted by churches worldwide. Built on 8 Recovery Principles and a Christian reading of the 12 Steps.',

    overview:
      'Celebrate Recovery was founded in 1991 by John Baker at Saddleback Church in Lake Forest, California — Pastor Rick Warren’s megachurch. Baker, a recovering alcoholic, wanted a program that was explicitly Christ-centered rather than using the more ambiguous "higher power" language of AA. He developed 8 Recovery Principles based on the Beatitudes (from Jesus’s Sermon on the Mount) and paired them with a Christian reading of the 12 Steps.\n\n' +
      'The program grew quickly through the evangelical church network. Today Celebrate Recovery is hosted by roughly 35,000 churches worldwide, mostly in the United States but with significant presence in Canada, Australia, the UK, and other countries. It’s arguably the most widely available Christian recovery program in the world.\n\n' +
      'CR casts a wide net: its stated focus is "hurts, habits, and hang-ups" rather than addiction specifically. Members work the program for alcohol and drug addiction, eating disorders, codependency, anger management, anxiety, grief, abuse recovery, and more. This broader scope means CR rooms often include a mix of people working on very different issues, which can be either a strength or a limitation depending on what you’re looking for.\n\n' +
      'CR is unambiguously Christian. Jesus is named as the "one true higher power." Scripture is central. Meetings include worship music, teaching, and prayer. If that framing works for you, CR offers a large, well-resourced community. If it doesn’t, a different fellowship will likely fit better.',

    howItWorks:
      'The program is organized around 8 Recovery Principles, each drawn from a Beatitude and paired with a specific Step from the 12. Principle 1 ("Realize I’m not God") maps to Step 1; Principle 2 ("Earnestly believe God exists") maps to Steps 2 and 3; and so on through Principle 8 ("Yield myself to God") and Step 12. Members work through the Principles sequentially with a sponsor-like accountability partner.\n\n' +
      'CR’s sponsor equivalents are called accountability partners and sponsors — the terminology varies by group. The relationship is similar to 12-step sponsorship: a more experienced member guides a newer member through the program, often with weekly check-ins and work through CR’s four Participant’s Guides. Same-gender sponsorship is the norm.\n\n' +
      'The meeting format is distinctive and different from 12-step rooms. A CR gathering typically runs about two hours and has three parts: a large group service with worship music and a teaching (similar to a short sermon), a break with coffee, and then small group meetings organized by issue and gender (men’s chemical dependency, women’s codependency, etc.). The small groups are where sharing happens; the large group is where teaching happens.\n\n' +
      'Literature centers on the Celebrate Recovery Bible, the four Participant’s Guides (Stepping Out of Denial into God’s Grace; Taking an Honest and Spiritual Inventory; Getting Right with God, Yourself, and Others; and Growing in Christ While Helping Others), and materials by John Baker. The Bible and scripture readings are central — CR is not secular and doesn’t pretend to be.',

    whatToExpect:
      'A Celebrate Recovery gathering usually takes place at a church on a weeknight. You walk into a sanctuary or large room, there’s worship music playing, and the service starts with singing — typically contemporary Christian worship music, sometimes with a band. A leader welcomes everyone, says a prayer, and introduces a teaching (a short message, often pre-recorded video from CR leadership or delivered live by a local leader).\n\n' +
      'After the large-group teaching, there’s usually a 15-minute break for coffee and socializing. Then small groups form. Small groups are organized by issue and gender — men’s chemical dependency, women’s codependency, men’s sexual integrity, women’s food issues, and so on. These are the peer-sharing groups. They’re 45–60 minutes, confidential, and led by a trained facilitator.\n\n' +
      'The vibe is warmer and more overtly Christian than 12-step. People pray, quote scripture, and speak openly about their relationship with Jesus. Worship music is part of the experience. For people who find this natural and meaningful, CR is a strong community. For people who don’t, it can feel like too much — and that’s useful to know upfront.\n\n' +
      'After the gathering, many groups go to a nearby diner for dessert and continued conversation — similar in spirit to AA’s after-meeting coffee. Because CR is hosted by churches, it often integrates with the broader life of the congregation, which can be a source of ongoing community beyond the program itself.',

    bestFor: [
      'People whose faith is central to their recovery and want an explicitly Christian framework',
      'Anyone already connected to (or open to) a local church community',
      'Those working on "hurts, habits, or hang-ups" beyond just addiction — CR addresses a wide range',
      'People who want a program with strong teaching and structured curriculum',
      'Women and men seeking same-gender small groups for sensitive topics',
      'Families where multiple members can attend together (CR has Celebration Place for kids, The Landing for teens)',
    ],

    notIdealIf: [
      'You’re not Christian and don’t want Christian framing — AA or NA accept any higher power; SMART and LifeRing are fully secular',
      'You want meetings focused only on one issue (e.g. alcohol only) — AA is more targeted',
      'You’re uncomfortable in evangelical church environments specifically — the hosting style can be intense',
      'You need meeting availability outside weeknights — most CR meets once per week on a set night',
      'You want a peer-only, non-teaching format — AA/NA small-group meetings are more conversational',
    ],

    meetingFinders: [
      {
        name: 'Celebrate Recovery Group Finder',
        url: 'https://www.celebraterecovery.com/crgroups',
        description: 'Primary meeting finder. Search by zip code, city, or country. Shows in-person and online groups hosted by churches worldwide.',
        badge: 'Web',
      },
      {
        name: 'Celebrate Recovery app',
        url: 'https://www.celebraterecovery.com/app',
        description: 'Official mobile app with group finder, daily devotional readings, and access to program content.',
        badge: 'iOS & Android',
      },
    ],

    faqs: [
      {
        question: 'Do I have to be Christian to attend?',
        answer: 'No, you don’t have to identify as Christian to attend. But the program is explicitly Christian — Jesus is named as the higher power, worship and scripture are central, and meetings are hosted in churches. If that framing feels wrong to you, another fellowship will likely fit better.',
      },
      {
        question: 'How is CR different from AA?',
        answer: 'CR is unambiguously Christian; AA uses more open "higher power" language. CR’s meeting format is different: a two-hour gathering with worship, teaching, and then small groups, rather than AA’s single one-hour meeting. CR also addresses a broader range of issues, not just alcohol.',
      },
      {
        question: 'What are the 8 Principles?',
        answer: 'Eight statements drawn from the Beatitudes, each paired with one or more of the 12 Steps. They move from admitting your need for God through daily practice of reliance on God and helping others. The full list is on the Celebrate Recovery website.',
      },
      {
        question: 'Is CR only for addiction?',
        answer: 'No. CR explicitly addresses "hurts, habits, and hang-ups" — a broad scope covering addiction, codependency, anger, anxiety, grief, abuse recovery, eating issues, and more. Small groups are organized by specific issue.',
      },
      {
        question: 'Can I bring my family?',
        answer: 'Yes. CR has parallel programs for kids (Celebration Place, ages 5–13) and teens (The Landing, ages 13–18). Many families attend together.',
      },
    ],

    seeAlso: ['aa', 'na', 'smart-recovery', 'coda'],

    pullQuotes: [
      'Hurts, habits, and hang-ups — the whole range, not just addiction.',
      'Jesus is named as the one true higher power. That framing is either the right fit or the wrong one.',
      'Worship, teaching, then small groups. Not the AA meeting you might be picturing.',
    ],

    literature: [
      {
        title: 'Celebrate Recovery Bible (NIV)',
        year: 2007,
        description: 'A study Bible with added recovery-focused devotionals, 8 Principles, and lessons drawn from the program. The primary daily text for most members.',
        coverImage: '/images/fellowships/celebrate-recovery/books/cr-bible.jpg',
      },
      {
        title: 'Participant’s Guides (1–4)',
        year: 1994,
        description: 'Four workbooks moving through the 8 Principles: Stepping Out of Denial, Taking an Honest Inventory, Getting Right, and Growing in Christ. Used with a sponsor.',
        coverImage: '/images/fellowships/celebrate-recovery/books/participants-guides.jpg',
      },
      {
        title: 'Life’s Healing Choices',
        year: 2007,
        description: 'John Baker’s book-length introduction to the 8 Principles. Often used as a newcomer’s first read.',
        coverImage: '/images/fellowships/celebrate-recovery/books/lifes-healing-choices.jpg',
      },
    ],
  },

  'lifering': {
    slug: 'lifering',
    tagline: 'Secular, abstinence-based recovery built on three S’s — Sobriety, Secularity, Self-Help. Each member builds their own program.',

    overview:
      'LifeRing Secular Recovery was founded in 2001, growing out of Secular Organizations for Sobriety (SOS) following internal organizational changes. Its founders wanted a secular, abstinence-based fellowship that treated each member as a self-directed adult capable of designing their own recovery rather than following a prescribed sequence of Steps.\n\n' +
      'The core philosophy is summarized in three S’s: Sobriety (complete abstinence from alcohol and other addictive drugs), Secularity (no religious or spiritual framework required, though members are free to bring their own), and Self-Help (each member develops a Personal Recovery Program that fits them). There are no Steps, no sponsors, no higher power, and no prescribed path. What there is: a supportive community and a practical conceptual model.\n\n' +
      'The distinctive concept in LifeRing is the "Sober Self" versus "Addict Self." Each member is understood to have both inside them — the part that wants sobriety and a full life (the S) and the part that wants to keep using (the A). Recovery is the work of strengthening the Sober Self and weakening the Addict Self, day by day. This is a metaphor, not a literal diagnosis, but it gives members a shared vocabulary for talking about internal conflict.\n\n' +
      'LifeRing is smaller than AA, NA, or SMART — a few hundred meetings globally, most in the US with a growing online presence. The smaller size means the community tends to be tight-knit, and online meetings have become a strong part of the offering, making LifeRing accessible even where there’s no local in-person group.',

    howItWorks:
      'There is no sequential program in the 12-step sense. Each member builds a Personal Recovery Program (PRP) — a written set of commitments, strategies, and supports that fits their life. The PRP might include meeting attendance, therapy, exercise, specific people they’ll call in a crisis, triggers they’ll avoid, and practices that support sobriety. Members share their PRPs with the group, refine them over time, and use them as an active recovery plan rather than a one-time exercise.\n\n' +
      'Meetings are facilitated by convenors — volunteer members trained in LifeRing’s approach. Convenors aren’t therapists or sponsors; they keep meetings moving, model the approach, and welcome newcomers. The facilitation is light-touch. Meetings emphasize peer support: what happened this week, what’s coming up, what help do you need, what’s working.\n\n' +
      'The "How was your week?" format is central. LifeRing meetings typically go around the room, each member sharing briefly about their week — what challenges came up, how they handled them, what’s on the horizon. Cross-talk is allowed and often helpful: members offer specific practical suggestions, share what worked for them, and problem-solve together. This is different from 12-step’s no-cross-talk norm and is core to LifeRing’s practical, peer-help ethos.\n\n' +
      'There’s no sponsor system. Members are encouraged to build support networks through the group, use LifeRing’s online forums, and develop their own advisors — friends in recovery, therapists, family, anyone their PRP says matters. The absence of formal sponsorship is deliberate: LifeRing treats every member as the authority on their own recovery.',

    whatToExpect:
      'A LifeRing meeting feels like a practical support group. Usually 60–90 minutes, held in community centers, libraries, or on Zoom. The convenor welcomes everyone, asks newcomers to introduce themselves (no required "I’m X, I’m an alcoholic" language), and opens the floor. Most meetings use the "How was your week?" format as the main organizing question.\n\n' +
      'Sharing is conversational. Someone describes a situation from their week; others may offer specific suggestions, share their own experience, or ask clarifying questions. The tone is collaborative and pragmatic — less confessional than AA, less tool-driven than SMART. The goal is practical peer support from people in the same situation.\n\n' +
      'There’s no prayer, no reading from a scripted text, no prescribed opening or closing. Meetings end when time’s up, often with a quick round of "what are you committed to this week?" or just a thank-you and goodbye. The informality is deliberate: LifeRing trusts its members to be adults without needing ritual to hold the space.\n\n' +
      'After meetings, there’s often social time — coffee, a diner, or just lingering. LifeRing’s online community is active between meetings and is where many members do significant connection work. The fellowship’s smaller size means people tend to get to know each other well; the flip side is that some geographic areas have no in-person option and rely entirely on online meetings.',

    bestFor: [
      'People who want a fully secular, non-spiritual program',
      'Anyone who values building their own path rather than following prescribed Steps',
      'Those who find AA’s "powerless" framing unhelpful and want a "sober self" framework instead',
      'People who want active problem-solving cross-talk rather than strict no-cross-talk norms',
      'Self-directed members comfortable designing their own recovery plan',
      'Those who prefer a smaller, tight-knit community over the scale of AA or NA',
    ],

    notIdealIf: [
      'You want the density of meetings everywhere you travel — AA or NA have much wider footprints',
      'You value a structured, sequential program with clear milestones — AA, NA, or SMART',
      'You want a sponsor-led one-on-one relationship — AA, NA, or Refuge Recovery',
      'You prefer science-based cognitive tools — SMART Recovery is more tool-structured',
      'You want a women-only space — Women for Sobriety',
      'A spiritual framework fits you — AA, NA, Celebrate Recovery, or Refuge Recovery',
    ],

    meetingFinders: [
      {
        name: 'LifeRing Meeting Finder',
        url: 'https://lifering.org/meetings',
        description: 'Primary meeting finder. Search for in-person meetings by location or browse LifeRing’s online meeting schedule.',
        badge: 'Web',
      },
      {
        name: 'LifeRing Online Meetings',
        url: 'https://lifering.org/meet-online',
        description: 'Dedicated schedule of online meetings running throughout the week. Free, requires no account.',
        badge: 'Online meetings',
      },
    ],

    faqs: [
      {
        question: 'Is LifeRing really fully secular?',
        answer: 'Yes. There’s no higher power, no prayer, no spiritual framework required. Members are free to bring their own beliefs, but the program itself makes no spiritual claims.',
      },
      {
        question: 'If there are no Steps, how does the program work?',
        answer: 'Each member builds a Personal Recovery Program — a written set of commitments, strategies, and supports that fits their life. The PRP is active, revised, and shared with the group. Recovery is work you do, not a path you follow.',
      },
      {
        question: 'Is there sponsorship?',
        answer: 'No formal sponsor system. Members are encouraged to build support networks through the group, develop their own advisors, and use LifeRing’s online community between meetings.',
      },
      {
        question: 'Can I do LifeRing and AA?',
        answer: 'Yes, many members do. LifeRing’s practical, secular focus complements AA’s sponsor and community system well. No contradiction.',
      },
      {
        question: 'What’s the Sober Self vs. Addict Self concept?',
        answer: 'A metaphor for the internal conflict between the part of you that wants sobriety and a full life (S) and the part that wants to keep using (A). Recovery is strengthening S and weakening A over time. It’s a framework for talking about internal conflict, not a literal diagnosis.',
      },
    ],

    seeAlso: ['smart-recovery', 'women-for-sobriety', 'aa', 'na'],

    pullQuotes: [
      'Sobriety, Secularity, Self-Help — three words that define how we work.',
      'Your recovery is yours to build. We help you find your way.',
      'Strengthen the Sober Self. Weaken the Addict Self. That’s the whole program.',
    ],

    literature: [
      {
        title: 'Empowering Your Sober Self',
        year: 2008,
        description: 'Martin Nicolaus’s book-length introduction to LifeRing’s approach. The Sober Self / Addict Self framework in depth.',
        coverImage: '/images/fellowships/lifering/books/empowering-your-sober-self.jpg',
      },
      {
        title: 'Recovery by Choice: Living and Enjoying Life Free of Alcohol and Drugs',
        year: 2003,
        description: 'LifeRing’s workbook for building a Personal Recovery Program. Questions and exercises members use to design their own recovery plan.',
        coverImage: '/images/fellowships/lifering/books/recovery-by-choice.jpg',
      },
    ],
  },

  'women-for-sobriety': {
    slug: 'women-for-sobriety',
    tagline: 'A women-only recovery program designed around how women experience addiction and recovery. Positive-psychology focused, secular but spiritually open.',

    overview:
      'Women for Sobriety was founded in 1975 by Jean Kirkpatrick, PhD, a sociologist in recovery who had tried AA in the 1950s and 1960s and concluded that its approach — designed in the 1930s by and primarily for men — did not address what she saw as the specific psychological and social needs of women in recovery. She developed a new program grounded in positive psychology, emphasizing competence, self-worth, and emotional growth rather than powerlessness and defect inventory.\n\n' +
      'WFS is women-only by design. Both cisgender and transgender women are welcome. The rationale is that recovery spaces centered on women’s specific experiences — including trauma, body image, caregiving burden, financial stress, and the social stigma still disproportionately faced by women who drink or use — can move faster and deeper when mixed-gender dynamics aren’t in the room.\n\n' +
      'The program centers on the 13 Acceptance Statements — originally called 13 Affirmations, then Statements of Competency. These are positive assertions members work to internalize: "I am a capable, competent woman and I can cope with whatever comes my way." "Happiness is a habit I am developing." "I am what I think." Members read and reflect on the Statements daily as a way of rebuilding the self-concept that addiction eroded.\n\n' +
      'WFS has a smaller footprint than AA or SMART but a devoted community. Online meetings have become central to the offering, and the fellowship’s online community platform, My Sober Space, extends connection between meetings. The program is secular but spiritually open — some members bring a personal faith; others don’t.',

    howItWorks:
      'The 13 Acceptance Statements are the core. Members are encouraged to read them daily and, over time, internalize them as genuine beliefs. The Statements cover self-worth ("I am a capable, competent woman"), emotional responsibility ("I am what I think"), spiritual openness ("The fundamental object of life is emotional and spiritual growth"), forgiveness, resilience, and purpose. The Statements replace the inventory-and-defect framing of 12-step with a competence-and-growth framing.\n\n' +
      'The 6 Levels of Recovery describe a progression members work through over time: Acceptance of alcoholism as a problem, early abstinence, cognitive restructuring, emotional growth, spiritual growth, and transcendence. Progression is internal rather than measured by external markers. Many members revisit earlier Levels as life circumstances change.\n\n' +
      'Meetings are led by certified moderators — experienced members trained in the WFS approach. Moderators aren’t therapists or sponsors but are the primary facilitators and keepers of the program’s tone. There is no formal sponsor system; the expectation is that members build peer relationships through the group and through My Sober Space, WFS’s online community.\n\n' +
      'Meeting format is distinctive. Most meetings open with a reading of the 13 Acceptance Statements, followed by introductions and a topic-based discussion. Members often read a Statement that resonated with them that week and reflect on it. Cross-talk is permitted and often gentle: members offer support, share their own experience, and encourage each other.',

    whatToExpect:
      'A Women for Sobriety meeting has a distinctive warmth. The room (or Zoom) is all women. A moderator opens with a welcome and a reading of the 13 Acceptance Statements, often with members taking turns reading a Statement aloud. The statements are affirmations, not laments — the opening tone is different from AA.\n\n' +
      'Sharing is conversational and supportive. Someone might share about a hard week at work, a difficult conversation with a family member, an emotional trigger they worked through. Other members respond with encouragement, specific suggestions, and relevant Statements. The tone is emotionally expressive and explicitly affirming — not in a performative way, but in a way that treats building self-worth as central work.\n\n' +
      'The focus on women’s specific experience shows up throughout. Trauma, caregiving, body image, the social cost of being a woman who drinks or uses — these come up directly, without the filter that mixed-gender rooms sometimes require. Newcomers often report that this focus lets them talk about things they wouldn’t have raised elsewhere.\n\n' +
      'After meetings, members often continue connecting through My Sober Space (WFS’s online community platform) and occasional in-person gatherings. The fellowship is smaller than AA or NA, which means the community tends to be closer-knit; the flip side is that geographic density is lower and online meetings are a large part of most members’ experience.',

    bestFor: [
      'Women who want a recovery program designed around women’s specific needs',
      'Anyone who tried AA and found the mixed-gender dynamic or defect-inventory framing unhelpful',
      'People drawn to a positive-psychology, competence-building framework',
      'Those comfortable with secular but spiritually open language',
      'Members looking for a tight-knit, emotionally expressive community',
      'Women working on trauma, caregiving stress, or identity alongside addiction — WFS addresses these directly',
    ],

    notIdealIf: [
      'You’re not a woman — WFS is women-only by design; LifeRing or SMART are secular co-ed alternatives',
      'You want a large meeting footprint with many options per day — AA or SMART have far more meetings',
      'You prefer a structured cognitive tool kit — SMART Recovery is more tool-driven',
      'You want a 12-step, sponsor-led program — AA (co-ed) or women-only AA meetings may fit better',
      'You’re drawn to a specifically Christian framework — Celebrate Recovery',
    ],

    meetingFinders: [
      {
        name: 'Women for Sobriety Meeting Finder',
        url: 'https://womenforsobriety.org/meetings',
        description: 'Primary meeting finder. Search for in-person and online meetings. All meetings are women-only.',
        badge: 'Web',
      },
      {
        name: 'My Sober Space',
        url: 'https://mysoberspace.com',
        description: 'WFS’s online community platform. Daily discussions, online meetings, and member connections. Free account required.',
        badge: 'Online community',
      },
    ],

    faqs: [
      {
        question: 'Is WFS only for women?',
        answer: 'Yes. All meetings are women-only by design. Both cisgender and transgender women are welcome. The rationale is that recovery work focused on women’s specific experiences goes deeper and faster in women-only space.',
      },
      {
        question: 'What are the 13 Acceptance Statements?',
        answer: 'Thirteen positive assertions members work to internalize over time — about competence, self-worth, emotional responsibility, and growth. They replace AA’s 12 Steps as the program’s backbone. The full list is on the WFS website.',
      },
      {
        question: 'Is WFS religious?',
        answer: 'No. WFS is secular but spiritually open. Members are free to bring their own spiritual or religious beliefs, but nothing is required. The program makes no religious claims.',
      },
      {
        question: 'Is there sponsorship?',
        answer: 'No formal sponsor system. Meetings are led by trained moderators. Members build peer relationships through the group and through My Sober Space, WFS’s online community. Some members develop informal mentoring relationships on their own.',
      },
      {
        question: 'Can I attend WFS alongside AA?',
        answer: 'Yes, many members do. WFS’s women-only, positive-psychology focus complements 12-step community well for women who find something missing in mixed-gender rooms.',
      },
    ],

    seeAlso: ['lifering', 'smart-recovery', 'aa'],

    pullQuotes: [
      'I am a capable, competent woman and I can cope with whatever comes my way.',
      'Designed for how women actually experience addiction and recovery — not retrofitted.',
      'Happiness is a habit I am developing.',
    ],

    literature: [
      {
        title: 'Turnabout: New Help for the Woman Alcoholic',
        year: 1977,
        description: 'Jean Kirkpatrick’s foundational book. Lays out the WFS philosophy and the 13 Acceptance Statements in depth.',
        coverImage: '/images/fellowships/women-for-sobriety/books/turnabout.jpg',
      },
      {
        title: 'Goodbye Hangovers, Hello Life',
        year: 1986,
        description: 'Kirkpatrick’s practical guide to using WFS in daily life. Often recommended as a newcomer’s first read.',
        coverImage: '/images/fellowships/women-for-sobriety/books/goodbye-hangovers.jpg',
      },
      {
        title: 'The Program of Women for Sobriety',
        year: 2001,
        description: 'Current program handbook covering the 13 Statements, 6 Levels of Recovery, and meeting format.',
        coverImage: '/images/fellowships/women-for-sobriety/books/program-of-wfs.jpg',
      },
    ],
  },
};
