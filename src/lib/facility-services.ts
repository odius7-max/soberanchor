/**
 * Curates the raw SAMHSA `service_detail` (category code → { label, values[] })
 * into the family-facing groupings the facility detail page renders:
 * levels of care, MAT medications, detox types, populations served, payment,
 * accreditation, and the badge row. Keeps presentation logic out of the page.
 *
 * service_detail shape (populated by samhsa-transform / the SAMHSA re-import):
 *   { "SET": { label: "Service Setting", values: ["Outpatient", ...] }, ... }
 */

export type ServiceDetail = Record<string, { label: string; values: string[] }>

/** Values for a category code, or [] if absent. */
export function vals(sd: ServiceDetail | null | undefined, code: string): string[] {
  return sd?.[code]?.values ?? []
}

function has(sd: ServiceDetail | null | undefined, code: string, kw: string): boolean {
  return vals(sd, code).some(v => v.toLowerCase().includes(kw))
}

/** Family-friendly level-of-care labels derived from Service Setting (SET). */
export function levelsOfCare(sd: ServiceDetail | null | undefined): string[] {
  const out = new Set<string>()
  for (const v of vals(sd, 'SET')) {
    const l = v.toLowerCase()
    if (l.includes('residential detox')) out.add('Residential detox')
    else if (l.includes('residential')) out.add('Residential (24-hour)')
    else if (l.includes('hospital inpatient')) out.add('Hospital inpatient')
    else if (l.includes('intensive outpatient')) out.add('Intensive outpatient (IOP)')
    else if (l.includes('partial hospitalization') || l.includes('day treatment')) out.add('Partial hospitalization (PHP)')
    else if (l.includes('outpatient')) out.add('Outpatient')
    else out.add(v)
  }
  return [...out]
}

/** FDA-approved addiction medications offered or supported (from OM/PHR/OT). */
export function matMeds(sd: ServiceDetail | null | undefined): string[] {
  const out = new Set<string>()
  for (const v of [...vals(sd, 'OM'), ...vals(sd, 'PHR'), ...vals(sd, 'OT')]) {
    const l = v.toLowerCase()
    if (l.includes('buprenorphine')) out.add('Buprenorphine')
    if (l.includes('naltrexone')) out.add('Naltrexone')
    if (l.includes('methadone')) out.add('Methadone')
    if (l.includes('disulfiram')) out.add('Disulfiram (Antabuse)')
    if (l.includes('acamprosate')) out.add('Acamprosate')
    if (l.includes('naloxone') && !l.includes('with naloxone')) out.add('Naloxone')
  }
  return [...out]
}

/** Substances a facility offers medical detox for (from DETOX), cleaned up. */
export function detoxTypes(sd: ServiceDetail | null | undefined): string[] {
  return vals(sd, 'DETOX').map(v => v.replace(/ ?detoxification/i, '').trim()).filter(Boolean)
}

/** Populations/special programs (SG), minus the plain age/sex duplicates. */
export function populations(sd: ServiceDetail | null | undefined): string[] {
  return vals(sd, 'SG').filter(
    v => !/^(adult men|adult women|young adults|seniors or older adults)$/i.test(v.trim())
  )
}

/** Normalized payment/insurance chips (from PAY). */
export function paymentTypes(sd: ServiceDetail | null | undefined): string[] {
  const out = new Set<string>()
  for (const v of vals(sd, 'PAY')) {
    const l = v.toLowerCase()
    if (l.includes('medicaid')) out.add('Medicaid')
    else if (l.includes('medicare')) out.add('Medicare')
    else if (l.includes('private health insurance')) out.add('Private insurance')
    else if (l.includes('military') || l.includes('tricare')) out.add('Military / TRICARE')
    else if (l.includes('cash or self-payment') || l.includes('self-pay')) out.add('Self-pay')
    else if (l.includes('state-financed')) out.add('State-financed plans')
    else if (l.includes('federal') || l.includes('government') || l.includes('block grant')) out.add('Government funding')
  }
  return [...out]
}

export function accreditation(sd: ServiceDetail | null | undefined): string[] {
  return vals(sd, 'LCA')
}

/** Recovery-support + transitional/aftercare items (RSS + TRSRV). */
export function recoverySupport(sd: ServiceDetail | null | undefined): string[] {
  return [...vals(sd, 'RSS'), ...vals(sd, 'TRSRV')]
}

export type FacilityBadge = { label: string; kind: 'navy' | 'teal' | 'gold' }

/** Top-of-page badges summarizing the facility at a glance. */
export function facilityBadges(sd: ServiceDetail | null | undefined): FacilityBadge[] {
  const out: FacilityBadge[] = []
  const loc = levelsOfCare(sd)
  if (loc.some(l => l.includes('Residential'))) out.push({ label: 'Residential', kind: 'navy' })
  if (has(sd, 'TC', 'detox') || vals(sd, 'DETOX').length) out.push({ label: 'Detox', kind: 'navy' })
  if (loc.some(l => l.includes('Outpatient') || l.includes('IOP'))) out.push({ label: 'Outpatient', kind: 'navy' })
  if (matMeds(sd).length) out.push({ label: 'Medication-assisted treatment', kind: 'teal' })
  if (has(sd, 'LCA', 'carf')) out.push({ label: 'CARF Accredited', kind: 'gold' })
  else if (has(sd, 'LCA', 'joint commission')) out.push({ label: 'Joint Commission', kind: 'gold' })
  return out
}

/** True when a facility has any enriched detail worth rendering. */
export function hasServiceDetail(sd: ServiceDetail | null | undefined): boolean {
  return !!sd && Object.keys(sd).length > 0
}
