import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      // Force Next.js App Router to bypass its fetch cache for all admin queries.
      // @supabase/supabase-js uses the global fetch, which Next.js deduplicates/caches
      // unless explicitly opted out. Admin reads must always reflect live DB state.
      global: {
        fetch: (input, init) =>
          fetch(input as RequestInfo, { ...(init ?? {}), cache: 'no-store' }),
      },
    }
  )
}
