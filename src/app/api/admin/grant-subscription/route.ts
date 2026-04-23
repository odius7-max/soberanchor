import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  return adminIds.includes(user.id) ? user : null
}

export async function POST(request: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { target_user_id, plan, note } = body as { target_user_id?: string; plan?: string; note?: string }

  if (!target_user_id || !plan) {
    return NextResponse.json({ error: 'target_user_id and plan are required' }, { status: 400 })
  }
  if (!['free', 'pro', 'founding'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan — must be free, pro, or founding' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('user_subscriptions').upsert({
    user_id:      target_user_id,
    plan,
    granted_by:   'admin',
    granted_note: note ?? null,
    granted_at:   new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
