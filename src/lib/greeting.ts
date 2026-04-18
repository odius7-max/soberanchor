export type GreetingWord = 'morning' | 'afternoon' | 'evening'

export function getGreeting(date: Date): GreetingWord {
  const h = date.getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
