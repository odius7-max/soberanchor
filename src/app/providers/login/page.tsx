import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CONTINUATION_PARAM, WELCOME_PATH, validateContinuation } from '@/lib/claim-continuation'

export const dynamic = 'force-dynamic'

/**
 * /providers/login — provider-context auth alias (PROVIDER-PATH-SPEC §2, E14).
 *
 * Previously an unconditional redirect to generic `/?auth=required`, which lost
 * provider context and asked signed-in users to log in again. Now: a supplied
 * valid claim continuation is preserved, otherwise exact welcome; and a
 * signed-in user is routed without a modal.
 */
export default async function ProviderLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next: rawNext } = await searchParams
  const continuation = validateContinuation(rawNext) ?? WELCOME_PATH

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Signed in: go where they were headed. No modal, no second account.
  if (user) redirect(continuation)

  redirect(`/?auth=required&${CONTINUATION_PARAM}=${encodeURIComponent(continuation)}`)
}
