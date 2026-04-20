export interface CanSponsorInput {
  markedReadyAt: string | null
  workbookStepCount: number | null
  completedStepsCount: number
}

export function canSponsor(input: CanSponsorInput): boolean {
  if (input.markedReadyAt) return true
  if (input.workbookStepCount && input.completedStepsCount >= input.workbookStepCount) return true
  return false
}
