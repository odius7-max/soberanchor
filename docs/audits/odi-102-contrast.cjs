/**
 * ODI-102 contrast re-measure at the hero copy's new position.
 *
 * Method is lifted unchanged from docs/audits/hero-contrast-retest.cjs (the script
 * behind the homepage hero gate) so the numbers are comparable to that gate's table:
 * paired screenshots at device scale 1, the second with hero text forced transparent,
 * differenced per pixel to recover each glyph's ideal composited color, sampling only
 * pixels with >85% glyph coverage (interior, not antialiased edge). Reported values are
 * minimum / 5th-percentile / median glyph-interior contrast ratio against the pixel
 * actually behind the glyph — image plus scrim plus text-shadow.
 *
 * Usage: node docs/audits/odi-102-contrast.cjs <label> [width ...]
 */
const { chromium } = require('playwright'), fs = require('fs'), sharp = require('sharp');
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const LABEL = process.argv[2] || 'run';
const WIDTHS = process.argv.slice(3).map(Number);
const DIR = 'docs/audits/odi-102';
const lum = (c) => c.map((v) => v / 255)
  .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ deviceScaleFactor: 1 });
  const results = [];
  for (const w of (WIDTHS.length ? WIDTHS : [1920])) {
    await p.setViewportSize({ width: w, height: 1000 });
    await p.goto(BASE, { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => document.fonts.ready);
    for (let t = 0; t < 40; t++) {
      const ok = await p.evaluate(() => {
        const i = document.querySelector('h1')?.closest('section')?.querySelector('img');
        return !!(i && i.complete && i.naturalWidth > 0);
      });
      if (ok) break;
      await p.waitForTimeout(250);
    }
    await p.waitForTimeout(400);

    // Record the live scrim gradients so the report can prove they were not touched.
    const gradients = await p.evaluate(() =>
      [...document.querySelector('h1').closest('section').querySelectorAll('div[aria-hidden]')]
        .filter((e) => e.style.background.includes('gradient'))
        .map((e) => ({ gradient: e.style.background, display: getComputedStyle(e).display })));

    // Same three texts the gate measured: subhead, trust line, discovery hint.
    // The H1 is included too — it moved furthest right, so it is worth a number.
    const rects = await p.evaluate(() => {
      const h = document.querySelector('h1').closest('section');
      return [
        h.querySelector('h1'),
        h.querySelector('h1+p'),
        [...h.querySelectorAll('p')].at(-1),
        [...h.querySelectorAll('span')].find((e) => e.textContent.includes('Not sure')),
      ].map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, color: getComputedStyle(e).color };
      });
    });

    const full = await p.screenshot({ path: `${DIR}/${LABEL}-${w}-contrast.png` });
    await p.evaluate(() => document.querySelector('h1').closest('section')
      .querySelectorAll('h1,p,span').forEach((e) => { e.style.color = 'transparent'; }));
    const back = await p.screenshot();

    const a = await sharp(full).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const z = await sharp(back).removeAlpha().raw().toBuffer();
    const rows = rects.map((r, k) => {
      const rgba = r.color.match(/[\d.]+/g).map(Number), alpha = rgba[3] ?? 1, vals = [];
      for (let y = Math.ceil(r.y); y < Math.min(1000, Math.floor(r.y + r.height)); y++) {
        for (let x = Math.ceil(r.x); x < Math.min(w, Math.floor(r.x + r.width)); x++) {
          const i = (y * w + x) * 3;
          const bg = [...z.subarray(i, i + 3)], fg = [...a.data.subarray(i, i + 3)];
          const ideal = bg.map((v, j) => v * (1 - alpha) + rgba[j] * alpha);
          const cov = fg.reduce((s, v, j) => s + v - bg[j], 0)
            / ideal.reduce((s, v, j) => s + v - bg[j], 0);
          if (cov > 0.85) vals.push((lum(ideal) + 0.05) / (lum(bg) + 0.05));
        }
      }
      vals.sort((x, y2) => x - y2);
      return {
        name: ['headline', 'subhead', 'trust', 'hint'][k],
        left: +r.x.toFixed(2), right: +(r.x + r.width).toFixed(2),
        pixels: vals.length,
        min: vals.length ? +vals[0].toFixed(3) : null,
        p05: vals.length ? +vals[Math.floor(vals.length * 0.05)].toFixed(3) : null,
        median: vals.length ? +vals[Math.floor(vals.length * 0.5)].toFixed(3) : null,
      };
    });
    results.push({ width: w, gradients, rows });
    console.log(`\n-- ${w}px --`);
    console.table(rows);
  }
  fs.writeFileSync(`${DIR}/${LABEL}-contrast.json`, JSON.stringify(results, null, 2));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
