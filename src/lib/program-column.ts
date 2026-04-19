export function getProgramLabel(args: {
  fellowshipId: string | null
  activeSponseesInFellowship: number
  workbookName: string | null
  currentStep: number | null
  maxStep: number | null
}): string {
  if (args.activeSponseesInFellowship > 0) {
    return `Sponsor · ${args.activeSponseesInFellowship} active`
  }
  if (args.workbookName && args.currentStep && args.maxStep && args.currentStep > args.maxStep) {
    return `Step ${args.maxStep} · Complete`
  }
  if (args.workbookName && args.currentStep) {
    return `${args.workbookName} · Step ${args.currentStep}`
  }
  return 'Just Tracking'
}
