/**
 * ODI-102 alignment probe. Measures the hero copy block's left edge against the
 * site's standard content column (the nav logo and the "Find what you need."
 * section heading, both inside `max-w-[1120px] mx-auto px-6`) at each width.
 * Usage: node docs/audits/odi-102-align.cjs <label>
 */
const { chromium } = require('playwright'), fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const LABEL = process.argv[2] || 'run';
const WIDTHS = [320, 375, 700, 768, 1024, 1280, 1440, 1920, 2560];

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const rows = [];
  for (const w of WIDTHS) {
    await p.setViewportSize({ width: w, height: 1000 });
    await p.goto(BASE, { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => document.fonts.ready);
    // Poll for the decoded hero photograph; contrast/alignment both need it painted.
    for (let t = 0; t < 40; t++) {
      const ok = await p.evaluate(() => {
        const i = document.querySelector('h1')?.closest('section')?.querySelector('img');
        return !!(i && i.complete && i.naturalWidth > 0);
      });
      if (ok) break;
      await p.waitForTimeout(250);
    }
    await p.waitForTimeout(600);
    rows.push(await p.evaluate(() => {
      const r = (e) => (e ? e.getBoundingClientRect() : null);
      const h1 = document.querySelector('h1');
      const section = h1.closest('section');
      const copy = h1.parentElement;                 // the 680px-capped copy block
      const h2 = [...document.querySelectorAll('h2')].find((e) =>
        e.textContent.includes('Find what you need'));
      const logo = document.querySelector('nav a[href="/"]');
      let navRow = logo.parentElement;             // walk up to the 1120px container
      while (navRow && getComputedStyle(navRow).maxWidth !== '1120px') navRow = navRow.parentElement;
      const px = (e, s) => parseFloat(getComputedStyle(e)[s]);
      return {
        width: innerWidth,
        layoutWidth: document.documentElement.clientWidth,
        navLogoLeft: r(logo).x,
        navContainerContentLeft: r(navRow).x + px(navRow, 'paddingLeft'),
        sectionH2Left: r(h2).x,
        heroH1Left: r(h1).x,
        heroCopyLeft: r(copy).x,
        heroCopyWidth: r(copy).width,
        heroSearchLeft: r(section.querySelector('form')).x,
        heroTrustLeft: r([...section.querySelectorAll('p')].at(-1)).x,
        heroSectionHeight: r(section).height,
        docScrollWidth: document.documentElement.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    }));
    await p.screenshot({ path: `docs/audits/odi-102/${LABEL}-${w}.png` });
  }
  const out = rows.map((r) => ({
    ...r,
    deltaVsNavLogo: +(r.heroCopyLeft - r.navLogoLeft).toFixed(2),
    deltaVsSectionH2: +(r.heroCopyLeft - r.sectionH2Left).toFixed(2),
  }));
  fs.writeFileSync(`docs/audits/odi-102/${LABEL}-align.json`, JSON.stringify(out, null, 2));
  console.table(out.map((r) => ({
    w: r.width, navLogo: r.navLogoLeft, h2: r.sectionH2Left, heroCopy: r.heroCopyLeft,
    dLogo: r.deltaVsNavLogo, dH2: r.deltaVsSectionH2, copyW: Math.round(r.heroCopyWidth),
    overflow: r.horizontalOverflow,
  })));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
