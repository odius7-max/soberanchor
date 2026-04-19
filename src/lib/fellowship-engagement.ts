export interface WorkingProgram {
  fellowshipId: string
  fellowshipAbbr: string
  workbookId: string | null
  currentStep: number | null
  maxStep: number | null
}

export interface EngagementInput {
  milestoneFellowshipIds: string[]
  activeSponsorRels: Array<{ fellowship_id: string | null }>
  activeSponseeRels: Array<{ fellowship_id: string | null }>
  stepCompletionFellowshipIds: string[]
  fellowships: Array<{ id: string; abbreviation: string | null; name: string }>
}

/** A fellowship is "working" if the user has declared it (milestone) AND either
 *  has an active sponsor relationship there OR has step completions there OR is sponsoring there. */
export function deriveWorkingFellowshipIds(input: EngagementInput): string[] {
  const declared = new Set(input.milestoneFellowshipIds)
  const engaged = new Set<string>()
  input.activeSponsorRels.forEach(r => r.fellowship_id && engaged.add(r.fellowship_id))
  input.activeSponseeRels.forEach(r => r.fellowship_id && engaged.add(r.fellowship_id))
  input.stepCompletionFellowshipIds.forEach(id => engaged.add(id))
  return Array.from(declared).filter(id => engaged.has(id))
}
