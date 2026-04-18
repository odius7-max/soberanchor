import { test, expect } from '@playwright/test'

/**
 * Smoke tests for the public surface + invite API contract.
 *
 * Notes on SoberAnchor's auth shape:
 *   - There is no /signup or /signin route. Auth is a modal rendered globally
 *     via <AuthModal /> in src/app/providers.tsx.
 *   - Protected routes `redirect('/?auth=required')` — the homepage then opens
 *     the modal in login mode based on the query param.
 *
 * To run against a live dev preview:
 *   PLAYWRIGHT_BASE_URL=https://dev.soberanchor.com npm run test:e2e
 */

test.describe('Public marketing surface — smoke', () => {
  test('homepage loads and shows the primary CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/SoberAnchor/i)
    // Hero primary CTA — the main "start here" path for anon users
    await expect(page.getByRole('button', { name: /Help Me Find Resources/i })).toBeVisible()
    // Secondary: directory link
    await expect(page.getByRole('link', { name: /Search the Directory/i })).toBeVisible()
  })

  test('directory page loads', async ({ page }) => {
    const response = await page.goto('/find')
    expect(response?.status()).toBeLessThan(500)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Auth gate', () => {
  test('unauthenticated /dashboard redirects to homepage with auth=required', async ({ page }) => {
    const response = await page.goto('/dashboard')
    await expect(page).toHaveURL(/\?auth=required/i, { timeout: 10_000 })
    expect(response?.status()).toBeLessThan(500)
  })

  test('unauthenticated /my-recovery/profile redirects to homepage with auth=required', async ({ page }) => {
    const response = await page.goto('/my-recovery/profile')
    await expect(page).toHaveURL(/\?auth=required/i, { timeout: 10_000 })
    expect(response?.status()).toBeLessThan(500)
  })
})

test.describe('Invite API — server-side contract', () => {
  test('/api/invite-sponsor rejects unauthenticated POST', async ({ request }) => {
    const res = await request.post('/api/invite-sponsor', {
      data: {
        to: 'smoke-test@example.com',
        subject: 'smoke',
        body: 'smoke',
        senderName: 'smoke',
      },
    })
    expect([401, 503]).toContain(res.status())
  })

  test('/api/invite-sponsee rejects unauthenticated POST', async ({ request }) => {
    const res = await request.post('/api/invite-sponsee', {
      data: {
        to: 'smoke-test@example.com',
        subject: 'smoke',
        body: 'smoke',
        sponsorName: 'smoke',
      },
    })
    expect([401, 503]).toContain(res.status())
  })
})
