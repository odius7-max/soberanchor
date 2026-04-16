import { redirect } from 'next/navigation'

// Provider login has been unified with the main auth flow.
// Redirect any existing links/bookmarks to the main auth.
export default function ProviderLoginPage() {
  redirect('/?auth=required')
}
