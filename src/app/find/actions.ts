'use server'

import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// saveListing
// ---------------------------------------------------------------------------

/**
 * Saves a meeting or facility to the current user's saved_listings.
 * Throws if the user is not authenticated.
 */
export async function saveListing(params: {
  meetingId?: string
  facilityId?: string
  listType: 'favorite' | 'watchlist'
  note?: string
}): Promise<{ id: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('You must be signed in to save listings.')
  }

  const { data, error } = await supabase
    .from('saved_listings')
    .insert({
      user_id: user.id,
      meeting_id: params.meetingId ?? null,
      facility_id: params.facilityId ?? null,
      list_type: params.listType,
      note: params.note ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save listing.')
  }

  return { id: data.id as string }
}

// ---------------------------------------------------------------------------
// unsaveListing
// ---------------------------------------------------------------------------

/**
 * Removes a saved listing by its ID, scoped to the current user.
 * Throws if the user is not authenticated.
 */
export async function unsaveListing(savedId: string): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('You must be signed in to remove saved listings.')
  }

  const { error } = await supabase
    .from('saved_listings')
    .delete()
    .eq('id', savedId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}

// ---------------------------------------------------------------------------
// getUserSavedIds
// ---------------------------------------------------------------------------

export interface SavedListing {
  id: string
  meeting_id: string | null
  facility_id: string | null
  list_type: string
  note: string | null
}

/**
 * Returns all saved_listings rows for the current user.
 * Returns an empty array (no throw) when the user is not authenticated.
 */
export async function getUserSavedIds(): Promise<SavedListing[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('saved_listings')
    .select('id, meeting_id, facility_id, list_type, note')
    .eq('user_id', user.id)

  if (error || !data) return []

  return data as SavedListing[]
}
