export const TODAY_COPY = {
  headline: "Today's practice",
  subtitle: "Small things that keep you grounded. Your pace, your order — skip what doesn't fit today.",
  footer: "Come back tomorrow — practice updates daily.",
  overflowMore: (n: number) => `${n} more →`,

  subtitleSponsorAlert: (sponseeName: string) =>
    `${sponseeName} needs you first — then tend to yourself.`,

  caughtUpTitle: "Anchored for today.",
  caughtUpBody: "Come back tomorrow — practice updates daily.",
  caughtUpSummary: (parts: string[]) => `Today you · ${parts.join(' · ')}`,

  celebrateTitle: "Anchored in for today.",
  celebrateStreakBadge: (days: number) => `Day ${days} · +1 streak`,

  celebrateStruggling: "You showed up. That's the work.",
  celebrateHard: "Some days are heavier. You did this one anyway.",
  celebrateOkay: "Anchored in for today.",
  celebrateGood: "Anchored in for today.",
  celebrateGreat: "A great one. Anchored in.",

  calloutStruggling:
    "Even on the hardest days, checking in is the path. Keep walking it — things can shift when you let them.",
  calloutHard: "The work isn't feeling good. It's staying present. You stayed.",

  ctaKeepGoing: "Keep going",
  ctaDoneForToday: "Done for today",
  ctaCallSponsor: "Call my sponsor",
  autoDismissDefault: "Auto-closes in 8s · or press × to return to your day",
  autoDismissRough: "Auto-closes in 12s on rough days · or press × to return to your day",
} as const
