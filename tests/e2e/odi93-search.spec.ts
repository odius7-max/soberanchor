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
    // ODI-99 item 3: the field follows the chosen town, so re-submitting
    // repeats the disambiguated search instead of reopening the chooser.
    await expect(page.locator('#directory-search')).toHaveValue('Springfield, IL')
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
      for (const url of ['/find', '/find?q=Springfield', '/find?q=Missoula%2C+MT', '/find?q=69201', '/find?q=99999', '/find?q=Faketown%2C+ME']) {
        await page.goto(BASE + url)
        const { scroll, client } = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }))
        expect(scroll, `${url} at ${w}px`).toBe(client)
      }
    })
  }

  // ── ODI-99 ─────────────────────────────────────────────────────────────────

  for (const q of ['Faketown, ME', 'Faketown, Maine']) {
    test(`unresolvable city in a named state is an honest failure: ${q}`, async ({ page }) => {
      await page.goto(`${BASE}/find?q=${encodeURIComponent(q)}#results`)

      await expect(page.getByText(`We couldn't find Faketown in Maine.`)).toBeVisible()
      // The old behaviour: an OR'd text filter returning every Maine listing.
      await expect(page.locator('ul[role="list"] a[href^="/find/"]')).toHaveCount(0)
      await expect(page.getByText(/Nearest listed centers to/)).toHaveCount(0)

      await expect(page.getByRole('link', { name: 'Browse all Maine listings' })).toBeVisible()
      await expect(page.getByRole('link', { name: /^Search .*Faketown.* as text$/ })).toBeVisible()
    })
  }

  test('honest failure: browse-all lands on the statewide page', async ({ page }) => {
    await page.goto(`${BASE}/find?q=Faketown%2C+ME#results`)
    await page.getByRole('link', { name: 'Browse all Maine listings' }).click()
    await expect(page.getByRole('heading', { name: 'Recovery services and places in Maine' })).toBeVisible()
    expect(await page.locator('ul[role="list"] a[href^="/find/"]').count()).toBeGreaterThan(0)
  })

  test('honest failure: search-as-text runs the text path for the city alone', async ({ page }) => {
    await page.goto(`${BASE}/find?q=Faketown%2C+ME#results`)
    await page.getByRole('link', { name: /^Search .*Faketown.* as text$/ }).click()
    await expect(page).toHaveURL(/q=Faketown&mode=text/)
    await expect(page.getByRole('heading', { name: 'Search results' })).toBeVisible()
    await expect(page.getByText('No matches.')).toBeVisible()
    // Explicitly chosen — never silently re-routed back into a location guess.
    await expect(page.getByText(`We couldn't find`)).toHaveCount(0)
  })

  test('a bare unrecognized word keeps the unchanged text behaviour', async ({ page }) => {
    await page.goto(`${BASE}/find?q=Faketown#results`)
    await expect(page.getByRole('heading', { name: 'Search results' })).toBeVisible()
    await expect(page.getByText('No matches.')).toBeVisible()
    await expect(page.getByText(/We couldn't find/)).toHaveCount(0)
  })

  test('statewide browse uses the ratified heading and no distance origin', async ({ page }) => {
    await page.goto(`${BASE}/find?q=California#results`)
    await expect(page.getByRole('heading', { name: 'Recovery services and places in California' })).toBeVisible()
    await expect(page.getByText(/Nearest listed centers to/)).toHaveCount(0)
    await expect(page.getByText(/Approximate straight-line distances/)).toHaveCount(0)
  })

  test('chooser options are a short tab route from the submit button', async ({ page }) => {
    await page.goto(`${BASE}/find`)
    const input = page.locator('#directory-search')
    await input.fill('Springfield')
    await input.press('Enter')
    await expect(page.getByRole('heading', { name: 'Which Springfield?' })).toBeVisible()

    const firstOption = 'a[href*="q=Springfield%2C"]'
    let stops = 0
    while (stops < 20) {
      const onOption = await page.evaluate(
        (sel) => !!document.activeElement?.matches(sel),
        firstOption,
      )
      if (onOption) break
      await page.keyboard.press('Tab')
      stops += 1
    }
    expect(stops, 'tab stops from submission to the first chooser option').toBeLessThanOrEqual(3)

    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: /Nearest listed centers to Springfield, [A-Z]{2}/ })).toBeVisible()
  })

  // ── ODI-99 gate, finding 4: focus has to survive chooser-to-chooser ────────

  /**
   * The id of the focused element, read straight from the document.
   * `toBeFocused` reports "inactive" for any page that does not hold the OS
   * window focus, which is most of them once the suite runs fullyParallel;
   * document.activeElement does not care.
   */
  const activeId = (page: import('@playwright/test').Page) =>
    page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName || '')

  /**
   * Focus arrives from a client effect, so it cannot be asserted until the page
   * has hydrated — and under `fullyParallel` every worker is queued behind the
   * same server, which pushes that well past the default 5s poll.
   */
  const expectFocus = (page: import('@playwright/test').Page, id: string) =>
    expect.poll(() => activeId(page), { timeout: 15_000 }).toBe(id)

  /** Resolves once the App Router client runtime is up. */
  async function waitForHydration(page: import('@playwright/test').Page) {
    await page.waitForFunction(
      () => !!(window as unknown as { next?: { router?: unknown } }).next?.router,
      null,
      { timeout: 20_000 },
    )
    await page.waitForTimeout(1000)
  }

  /** Tabs forward until a "City, ST" chooser option has focus. Returns the count. */
  async function tabsToChooserOption(page: import('@playwright/test').Page) {
    let stops = 0
    while (stops < 25) {
      if (await page.evaluate(() => !!document.activeElement?.matches('a[href*="%2C"]'))) break
      await page.keyboard.press('Tab')
      stops += 1
    }
    return stops
  }

  for (const [first, second, option] of [
    ['Springfield', 'san diego', 'San Diego, CA'],
    ['san diego', 'Springfield', 'Springfield, AR'],
  ] as const) {
    test(`a second ambiguous search refocuses the new heading: ${first} then ${second}`, async ({ page }) => {
      await page.goto(`${BASE}/find?q=${encodeURIComponent(first)}#results`)
      await expect(page.getByRole('heading', { name: `Which ${first}?` })).toBeVisible()
      await expectFocus(page, 'chooser-heading')

      // The chooser component stays mounted across this transition, so a
      // mount-only effect left focus in the field and the first option was 12
      // tabs away. Submitting from the field is the ordinary repeat-search path.
      const input = page.locator('#directory-search')
      await input.fill(second)
      await input.press('Enter')
      await expect(page.getByRole('heading', { name: `Which ${second}?` })).toBeVisible()
      await expectFocus(page, 'chooser-heading')

      expect(
        await tabsToChooserOption(page),
        'tab stops from the second chooser to its first option',
      ).toBeLessThanOrEqual(3)
      expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe(option)

      // Field sync survives the refocus.
      await expect(input).toHaveValue(second)
    })
  }

  test('typing a new query does not steal focus from the field', async ({ page }) => {
    await page.goto(`${BASE}/find?q=Springfield#results`)
    await expectFocus(page, 'chooser-heading')
    await page.locator('#directory-search').fill('Spring')
    await expectFocus(page, 'directory-search')
  })

  test('a direct visit without #results leaves initial focus alone', async ({ page }) => {
    // Nothing asked for the results region, so the page must not put the
    // keyboard on a heading ~1000px below an unscrolled viewport.
    await page.setViewportSize({ width: 1024, height: 900 })
    await page.goto(`${BASE}/find?q=Springfield`)
    await expect(page.getByRole('heading', { name: 'Which Springfield?' })).toBeVisible()
    await waitForHydration(page)

    expect(await activeId(page)).toBe('BODY')
    expect(await page.evaluate(() => window.scrollY)).toBe(0)

    // The heading is well below the fold on a cold visit, which is the whole
    // reason not to put the keyboard on it.
    expect(
      await page.locator('#chooser-heading').evaluate((e) => e.getBoundingClientRect().top),
    ).toBeGreaterThan(900)

    // And the negative above is about the hash, not about a dead page: the same
    // runtime does focus the heading the moment a search asks for results.
    const input = page.locator('#directory-search')
    await input.fill('san diego')
    await input.press('Enter')
    await expect(page.getByRole('heading', { name: 'Which san diego?' })).toBeVisible()
    await expectFocus(page, 'chooser-heading')
  })

  test('a direct visit with #results still focuses the heading', async ({ page }) => {
    await page.goto(`${BASE}/find?q=Springfield#results`)
    await expect(page.getByRole('heading', { name: 'Which Springfield?' })).toBeVisible()
    await expectFocus(page, 'chooser-heading')
  })

  test('returning to the chooser with Back refocuses its heading', async ({ page }) => {
    await page.goto(`${BASE}/find?q=Springfield#results`)
    await page.locator('a[href*="q=Springfield%2C"]').first().click()
    await page.waitForURL(/q=Springfield%2C/)
    await expect(page.locator('#directory-search')).toHaveValue(/^Springfield, [A-Z]{2}$/)

    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Which Springfield?' })).toBeVisible()
    await expectFocus(page, 'chooser-heading')
    await expect(page.locator('#directory-search')).toHaveValue('Springfield')
  })

  test('768 standing check', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 })
    for (const url of ['/find', '/']) {
      await page.goto(BASE + url)
      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }))
      expect(scroll, `${url} at 768px`).toBe(client)
    }
  })
})
