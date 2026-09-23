import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:3100'

test.describe('ODI-93 location search', () => {
  test('ambiguous town is fully keyboard-operable', async ({ page }) => {
    await page.goto(`${BASE}/find?q=Springfield#results`)
    await expect(page.getByRole('heading', { name: 'Which Springfield?' })).toBeVisible()
    // No geographic results before the place is settled.
    await expect(page.getByText(/Nearest listed centers to/)).toHaveCount(0)

    const first = page.getByRole('link', { name: 'Springfield, AR' })
    await first.focus()
    await expect(first).toBeFocused()
    await page.keyboard.press('Enter')
    await page.waitForURL(/q=Springfield%2C(%20|\+)AR/)
    await expect(page.getByRole('heading', { name: 'Nearest listed centers to Springfield, AR' })).toBeVisible()
  })

  test('back and refresh reproduce results', async ({ page }) => {
    await page.goto(`${BASE}/find?q=Springfield#results`)
    await page.getByRole('link', { name: 'Springfield, IL' }).click()
    await expect(page.getByRole('heading', { name: 'Nearest listed centers to Springfield, IL' })).toBeVisible()
    const firstCard = await page.locator('a[href^="/find/"]').first().getAttribute('href')

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Nearest listed centers to Springfield, IL' })).toBeVisible()
    expect(await page.locator('a[href^="/find/"]').first().getAttribute('href')).toBe(firstCard)

    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Which Springfield?' })).toBeVisible()
  })

  test('rapid consecutive searches: the last query wins', async ({ page }) => {
    await page.goto(`${BASE}/find`)
    const input = page.locator('#directory-search')
    for (const q of ['Missoula, MT', 'Chicago', '10001', 'Portland ME']) {
      await input.fill(q)
      await input.press('Enter')
    }
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Nearest listed centers to Portland, ME' })).toBeVisible()
    await expect(page).toHaveURL(/q=Portland(%20|\+)ME/)
    // No stale heading from an earlier submission survived.
    await expect(page.getByText(/Nearest listed centers to (Missoula|Chicago|New York)/)).toHaveCount(0)
  })

  test('show more continues past 25 without repeating', async ({ page }) => {
    await page.goto(`${BASE}/find?q=Missoula%2C+MT#results`)
    const ids = async () =>
      (await page.locator('ul[role="list"] a[href^="/find/"]').evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute('href')),
      )).filter((h): h is string => !!h && /\/find\/[0-9a-f-]{36}$/.test(h))
    const page1 = await ids()
    expect(page1.length).toBe(25)
    await page.getByRole('link', { name: 'Show more' }).click()
    await expect(page).toHaveURL(/page=2/)
    const page2 = await ids()
    expect(page2.length).toBe(50)
    expect(page2.slice(0, 25)).toEqual(page1)
    expect(new Set(page2).size).toBe(50)
  })

  for (const w of [320, 375, 768, 1024]) {
    test(`no horizontal overflow at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 })
      for (const url of ['/find', '/find?q=Springfield', '/find?q=Missoula%2C+MT', '/find?q=69201', '/find?q=99999']) {
        await page.goto(BASE + url)
        const { scroll, client } = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }))
        expect(scroll, `${url} at ${w}px`).toBe(client)
      }
    })
  }
})
