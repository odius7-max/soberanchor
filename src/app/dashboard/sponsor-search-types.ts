// Shared types for sponsor-search / relationship flows.
// Lives outside actions.ts so both API routes (server) and the modal (client)
// can import these without pulling in server action boundaries.

export interface ExistingRelationship {
  relationshipId:  string
  direction:       'you_are_sponsor' | 'they_are_sponsor'
  fellowshipId:    string | null
  fellowshipAbbr:  string | null
  status:          'active' | 'pending'
}

export type SearchResult =
  | { found: false; reason: 'not_found' | 'no_profile' | 'self' }
  | { found: true; userId: string; email: string; displayName: string | null; existingRelationships: ExistingRelationship[] }
