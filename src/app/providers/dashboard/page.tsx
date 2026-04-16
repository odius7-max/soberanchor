import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProviderDashboardShell from '@/components/providers/ProviderDashboardShell'
import type { FacilityData } from '@/components/providers/ListingTab'
import type { Lead } from '@/components/providers/LeadsTab'

export default async function ProviderDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=required')

  // Get provider account
  const { data: providerAccount } = await supabase
    .from('provider_accounts')
    .select('id, subscription_tier')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!providerAccount) redirect('/providers/claim')

  // Get owned facilities
  const { data: facilitiesRaw } = await supabase
    .from('facilities')
    .select('id,name,description,phone,email,website,address_line1,city,state,zip,facility_type,listing_tier,is_verified,is_claimed,is_featured,avg_rating,review_count')
    .eq('provider_account_id', providerAccount.id)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!facilitiesRaw || facilitiesRaw.length === 0) redirect('/providers/claim')

  const facility = facilitiesRaw[0] as FacilityData

  // Parallel: amenities, insurance, leads
  const [amenitiesRes, insuranceRes, leadsRes] = await Promise.all([
    supabase.from('facility_amenities').select('amenity_name').eq('facility_id', facility.id),
    supabase.from('facility_insurance').select('insurance_name').eq('facility_id', facility.id),
    supabase.from('leads').select('id,first_name,phone,insurance_provider,seeking,who_for,notes,status,created_at')
      .eq('facility_id', facility.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const amenities = (amenitiesRes.data ?? []).map(r => r.amenity_name as string)
  const insurance = (insuranceRes.data ?? []).map(r => r.insurance_name as string)
  const leads: Lead[] = (leadsRes.data ?? []) as Lead[]

  // Lead stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const leadsThisMonth = leads.filter(l => new Date(l.created_at) >= startOfMonth).length
  const leadsLastMonth = leads.filter(l => {
    const d = new Date(l.created_at)
    return d >= startOfLastMonth && d < startOfMonth
  }).length

  return (
    <ProviderDashboardShell
      facility={facility}
      amenities={amenities}
      insurance={insurance}
      leads={leads}
      leadsThisMonth={leadsThisMonth}
      leadsLastMonth={leadsLastMonth}
    />
  )
}
