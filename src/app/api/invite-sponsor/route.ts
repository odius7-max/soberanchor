import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Mirror of /api/invite-sponsee, but for the sponsee→sponsor direction:
// a sponsee invites someone they want to have as their sponsor. On signup,
// src/app/dashboard/page.tsx converts the pending row into a
// sponsor_relationships row where the new user is the sponsor and the original
// sender is the sponsee, surfacing the incoming request in PendingRequests.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function buildEmailHtml(body: string, subject: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const bodyHtml = escape(body).replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede8;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,51,102,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#002244 0%,#003366 60%,#1a4a5e 100%);padding:32px 40px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;line-height:1;">⚓</div>
            <div style="color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">SoberAnchor</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 24px;">
            <p style="margin:0 0 24px;font-size:15px;color:#333333;line-height:1.75;">${bodyHtml}</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:8px 0 24px;">
                  <a href="https://soberanchor.com/signup"
                     style="display:inline-block;background:#2A8A99;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">
                    Create Your Free Account →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="border-top:1px solid #eeebe7;"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
              This invitation was sent by a SoberAnchor member.<br />
              If you didn&apos;t expect this email, you can safely ignore it.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate env — lazy so `next build` page-data collection doesn't crash
  // when RESEND_API_KEY is unset. (CLAUDE.md pitfall #13.)
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key_here') {
    return NextResponse.json({ error: 'Email sending is not configured.' }, { status: 503 })
  }

  // Parse body
  let to: string, subject: string, body: string, senderName: string
  try {
    ({ to, subject, body, senderName } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!to?.trim() || !subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Rate limit: max 5 invites per sponsee per 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('sponsor_invites')
    .select('id', { count: 'exact', head: true })
    .eq('sponsee_id', user.id)
    .gte('created_at', since)

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'Daily invite limit reached (5 per day). Try again tomorrow.' }, { status: 429 })
  }

  // Send email
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: sendError } = await resend.emails.send({
    from: 'SoberAnchor <no-reply@soberanchor.com>',
    to: to.trim(),
    subject: subject.trim(),
    html: buildEmailHtml(body.trim(), subject.trim()),
  })

  if (sendError) {
    console.error('[invite-sponsor] Resend error:', sendError)
    return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
  }

  // Record the invite — the dashboard's conversion step consumes this on
  // invitee's first load post-signup.
  await admin.from('sponsor_invites').insert({
    sponsee_id: user.id,
    invitee_email: to.trim().toLowerCase(),
    status: 'pending',
  })

  // senderName is accepted for API parity but not persisted; display name
  // gets resolved at conversion time from the sender's user_profiles row.
  void senderName

  return NextResponse.json({ success: true })
}
