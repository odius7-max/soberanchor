/**
 * Server-only notification utility.
 * Checks user preferences, sends email via Resend, and logs to notification_log.
 *
 * Required env vars:
 *   RESEND_API_KEY        — Resend API key
 *   NEXT_PUBLIC_SITE_URL  — base URL for CTA links (defaults to https://soberanchor.com)
 */

import { Resend } from 'resend'
import { createAdminClient } from './supabase/admin'

// Lazy-init Resend so importing this module at build-time (e.g. during
// Next.js page-data collection for API routes) doesn't throw when
// RESEND_API_KEY isn't populated in that environment. Runtime calls
// still require the key to be set.
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not set')
    _resend = new Resend(key)
  }
  return _resend
}
const FROM    = 'SoberAnchor <no-reply@soberanchor.com>'
const BASE    = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://soberanchor.com').replace(/\/$/, '')

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'sponsor_feedback_on_step_work'
  | 'sponsee_submits_step_work'
  | 'sponsor_connection_request'
  | 'milestone_reminders'
  | 'sponsor_assigns_task'
  | 'sponsee_completes_task'

type DataMap = {
  sponsor_feedback_on_step_work: { sponsorName: string; stepNumber: number | null; sectionTitle: string }
  sponsee_submits_step_work:     { sponseeName: string; stepNumber: number | null; sectionTitle: string }
  sponsor_connection_request:    { requesterName: string; fellowship: string | null }
  milestone_reminders:           Record<string, never>
  sponsor_assigns_task:          { sponsorName: string; taskTitle: string; dueDate: string | null }
  sponsee_completes_task:        { sponseeName: string; taskTitle: string }
}

// Column name in notification_preferences that gates each type
const PREF_COL: Record<NotificationType, string> = {
  sponsor_feedback_on_step_work: 'sponsor_feedback_on_step_work',
  sponsee_submits_step_work:     'sponsee_submits_step_work',
  sponsor_connection_request:    'sponsor_connection_request',
  milestone_reminders:           'milestone_reminders',
  sponsor_assigns_task:          'sponsor_assigns_task',
  sponsee_completes_task:        'sponsee_completes_task',
}

// ─── Email template ───────────────────────────────────────────────────────────

function layout(subject: string, bodyHtml: string, ctaText: string, ctaUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f2f2f2;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="background:#003366;border-radius:12px 12px 0 0;padding:22px 32px;">
            <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">⚓ SoberAnchor</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
            ${bodyHtml}
            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:28px;">
              <tr>
                <td style="background:#2A8A99;border-radius:8px;">
                  <a href="${ctaUrl}"
                     style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;border-radius:8px;">
                    ${ctaText}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;border-radius:0 0 12px 12px;border:1px solid #e0e0e0;border-top:none;padding:18px 32px;">
            <p style="font-size:12px;color:#999999;margin:0;line-height:1.6;">
              You received this because you have notifications enabled on SoberAnchor.&nbsp;
              <a href="${BASE}/my-recovery/settings" style="color:#2A8A99;text-decoration:none;">Manage preferences →</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function p(text: string, style = ''): string {
  return `<p style="font-size:15px;color:#444444;margin:0;line-height:1.7;${style}">${text}</p>`
}

function h(text: string): string {
  return `<p style="font-size:16px;font-weight:600;color:#003366;margin:0 0 12px;">${text}</p>`
}

// ─── Per-type email builders ──────────────────────────────────────────────────

function buildEmail<T extends NotificationType>(
  type: T,
  data: DataMap[T],
): { subject: string; html: string } | null {
  const d = data as Record<string, unknown>

  switch (type) {
    case 'sponsor_feedback_on_step_work': {
      const sponsorName  = d.sponsorName  as string
      const sectionTitle = d.sectionTitle as string
      const stepNumber   = d.stepNumber   as number | null
      const stepLabel    = stepNumber ? `Step ${stepNumber}: ` : ''
      const subject = 'Your sponsor left feedback on your step work'
      return {
        subject,
        html: layout(
          subject,
          h(`${escHtml(sponsorName)} reviewed your step work`) +
          p(`${escHtml(sponsorName)} reviewed your work on <strong>${escHtml(stepLabel + sectionTitle)}</strong>. Log in to see their feedback.`),
          'View feedback →',
          `${BASE}/dashboard/step-work`,
        ),
      }
    }

    case 'sponsee_submits_step_work': {
      const sponseeName  = d.sponseeName  as string
      const sectionTitle = d.sectionTitle as string
      const stepNumber   = d.stepNumber   as number | null
      const stepLabel    = stepNumber ? `Step ${stepNumber}: ` : ''
      const subject = `${sponseeName} submitted step work for review`
      return {
        subject,
        html: layout(
          subject,
          h(`${escHtml(sponseeName)} completed step work`) +
          p(`<strong>${escHtml(sponseeName)}</strong> completed work on <strong>${escHtml(stepLabel + sectionTitle)}</strong> and it&rsquo;s ready for your review.`),
          'Review step work →',
          `${BASE}/dashboard/step-work/pending`,
        ),
      }
    }

    case 'sponsor_connection_request': {
      const requesterName  = d.requesterName as string
      const fellowship     = d.fellowship    as string | null
      const fellowshipText = fellowship ? ` ${escHtml(fellowship)}` : ''
      const subject = 'New sponsor connection request'
      return {
        subject,
        html: layout(
          subject,
          h('New connection request') +
          p(`<strong>${escHtml(requesterName)}</strong> would like you to be their${fellowshipText} sponsor. Log in to accept or decline.`),
          'View request →',
          `${BASE}/dashboard`,
        ),
      }
    }

    case 'sponsor_assigns_task': {
      const sponsorName = d.sponsorName as string
      const taskTitle   = d.taskTitle   as string
      const dueDate     = d.dueDate     as string | null
      const dueLine     = dueDate ? ` due <strong>${escHtml(new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))}</strong>` : ''
      const subject = `${sponsorName} assigned you a task`
      return {
        subject,
        html: layout(
          subject,
          h(`New task from ${escHtml(sponsorName)}`) +
          p(`Your sponsor assigned you: <strong>${escHtml(taskTitle)}</strong>${dueLine}. Log in to view details and mark it complete.`),
          'View tasks →',
          `${BASE}/dashboard?tab=tasks`,
        ),
      }
    }

    case 'sponsee_completes_task': {
      const sponseeName = d.sponseeName as string
      const taskTitle   = d.taskTitle   as string
      const subject = `${sponseeName} completed a task`
      return {
        subject,
        html: layout(
          subject,
          h(`${escHtml(sponseeName)} completed a task`) +
          p(`<strong>${escHtml(sponseeName)}</strong> marked <strong>${escHtml(taskTitle)}</strong> as complete.`),
          'View sponsee →',
          `${BASE}/my-recovery/sponsor/sponsee`,
        ),
      }
    }

    // milestone_reminders is handled by a scheduled job — no on-demand email
    default:
      return null
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check the user's notification preferences, send an email if enabled,
 * and log the send to notification_log.
 *
 * Always resolves — errors are logged but never thrown, so callers don't
 * need to handle notification failures.
 */
export async function sendNotification<T extends NotificationType>(
  userId: string,
  type: T,
  data: DataMap[T],
): Promise<void> {
  try {
    const admin = createAdminClient()

    // Fetch user email + preferences in parallel
    const [userRes, prefsRes] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle(),
    ])

    const email = userRes.data.user?.email
    if (!email) return

    // Evaluate preference (default: enabled for all types except weekly/meeting)
    const prefs = prefsRes.data
    const column = PREF_COL[type]
    const defaultEnabled = type !== 'milestone_reminders' // milestone_reminders is opt-in later via scheduler
    const isEnabled: boolean = prefs
      ? ((prefs as Record<string, unknown>)[column] as boolean ?? defaultEnabled)
      : defaultEnabled

    if (!isEnabled) return

    const built = buildEmail(type, data)
    if (!built) return  // type has no on-demand email (e.g. milestone_reminders)

    const { subject, html } = built

    await getResend().emails.send({ from: FROM, to: email, subject, html })

    // Log the send (non-fatal if this fails)
    await admin.from('notification_log').insert({
      user_id:           userId,
      notification_type: type,
      subject,
      metadata:          data as Record<string, unknown>,
    })
  } catch (err) {
    console.error('[notifications] send failed:', type, userId, err)
  }
}
