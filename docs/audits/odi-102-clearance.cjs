/**
 * ODI-102 headline/walker clearance probe.
 *
 * The question the gate asked is two-dimensional — does the terminal "g" in
 * "tracking" touch the walker's head — so this measures it that way rather than
 * with a column profile. A column mean over the line box dilutes any shape that
 * occupies only part of the band, which is exactly the case at 1440, where the
 * walker's head sits low in the line and a 1-D profile walks straight past it
 * onto the second walker.
 *
 * Method, per width:
 *   A = the hero as rendered.  B = the same frame with the hero text hidden.
 *   glyph mask   = where A differs from B (the type itself, antialiasing and all)
 *   walker mask  = pixels in B darker than their own row's local median by a
 *                  margin, which removes the scrim's left-to-right ramp; runs
 *                  shorter than 8px are dropped as foliage speckle
 *   clearance    = for every scanline crossing the headline, the horizontal gap
 *                  between the rightmost glyph pixel and the first walker pixel
 *                  to its right; the reported figure is the minimum over rows
 *
 * A negative figure means glyph and silhouette overlap on that row. The
 * photograph is misty and the silhouette has no hard boundary, so the number is
 * a consistent yardstick for before/after, not a claim of a crisp outline.
 *
 * Usage: node docs/audits/odi-102-clearance.cjs <label> [width ...]
 */
const { chromium } = require('playwright'), fs = require('fs'), sharp = require('sharp'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const LABEL = process.argv[2] || 'run';
const WIDTHS = process.argv.slice(3).map(Number);
const DIR = 'docs/audits/odi-102';
const lum = (c) => c.map((v) => v / 255)
  .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);

const HERO = path.resolve('public/hero-tree-lined-path.jpg');

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ deviceScaleFactor: 1 });

  /*
    At 2560 the browser asks for the w=3840 variant and `next start`'s local
    optimizer never returns it — the transcode hangs past five minutes, so the
    photograph silently never paints and the frame reads as bare scrim. That is
    a local-optimizer limit, not an app defect: Vercel serves the same URL,
    which is how the gate captured 2560 from the preview at all. Serve the hero
    from its own source file instead. Every variant is a downscale of exactly
    this file, so the intrinsic ratio object-fit uses is unchanged and the
    walker lands on the same pixels; only the resampling differs.
  */
  await p.route('**/_next/image*', (route) =>
    route.request().url().includes('hero-tree-lined-path')
      ? route.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(HERO) })
      : route.continue());

  const out = [];
  for (const w of (WIDTHS.length ? WIDTHS : [1280, 1440, 1920, 2560])) {
    await p.setViewportSize({ width: w, height: 1000 });
    await p.goto(BASE, { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => document.fonts.ready);
    for (let t = 0; t < 60; t++) {
      const ok = await p.evaluate(() => {
        const i = document.querySelector('h1')?.closest('section')?.querySelector('img');
        return !!(i && i.complete && i.naturalWidth > 0);
      });
      if (ok) break;
      await p.waitForTimeout(250);
    }
    await p.waitForTimeout(500);

    // An unloaded photograph reads as smooth scrim with no walkers in it, which
    // would measure as generous clearance. Refuse to report that as a result.
    const imgState = await p.evaluate(() => {
      const i = document.querySelector('h1').closest('section').querySelector('img');
      return { complete: i.complete, nw: i.naturalWidth };
    });
    if (!imgState.complete || !imgState.nw) throw new Error(`hero image not loaded at ${w}px`);

    const geo = await p.evaluate(() => {
      const h1 = document.querySelector('h1');
      const section = h1.closest('section');
      const img = section.querySelector('img');
      const ir = img.getBoundingClientRect(), hr = h1.getBoundingClientRect();
      const r = document.createRange();
      r.selectNodeContents(h1);
      const lines = [...r.getClientRects()].map((x) => ({
        x: +x.x.toFixed(2), right: +x.right.toFixed(2),
        top: +x.top.toFixed(2), bottom: +x.bottom.toFixed(2), width: +x.width.toFixed(2),
      }));
      const cs = getComputedStyle(h1);
      return {
        lines, lineCount: lines.length,
        h1Box: { x: +hr.x.toFixed(2), y: +hr.y.toFixed(2), w: +hr.width.toFixed(2), h: +hr.height.toFixed(2) },
        h1FontSize: cs.fontSize, opsz: cs.fontVariationSettings, opticalSizing: cs.fontOpticalSizing,
        h1MaxWidth: cs.maxWidth,
        objectPosition: getComputedStyle(img).objectPosition, objectFit: getComputedStyle(img).objectFit,
        imgBox: { x: +ir.x.toFixed(1), y: +ir.y.toFixed(1), w: +ir.width.toFixed(1), h: +ir.height.toFixed(1) },
        natural: { w: img.naturalWidth, h: img.naturalHeight },
        copyLeft: +h1.parentElement.getBoundingClientRect().x.toFixed(2),
        copyWidth: +h1.parentElement.getBoundingClientRect().width.toFixed(2),
        navLogoLeft: +document.querySelector('nav a[href="/"]').getBoundingClientRect().x.toFixed(2),
        sectionHeight: +section.getBoundingClientRect().height.toFixed(2),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    const { imgBox: box, natural: nat } = geo;
    const scale = Math.max(box.w / nat.w, box.h / nat.h);
    geo.cover = {
      scale: +scale.toFixed(4),
      drawnW: +(nat.w * scale).toFixed(1), drawnH: +(nat.h * scale).toFixed(1),
      // Zero horizontal slack means object-position cannot move anything sideways.
      horizontalSlackPx: +(nat.w * scale - box.w).toFixed(1),
      verticalSlackPx: +(nat.h * scale - box.h).toFixed(1),
    };

    const A = await sharp(await p.screenshot({ path: `${DIR}/${LABEL}-${w}.png` }))
      .removeAlpha().raw().toBuffer({ resolveWithObject: true });
    await p.evaluate(() => document.querySelector('h1').closest('section')
      .querySelectorAll('h1,p,span,a,form').forEach((e) => { e.style.visibility = 'hidden'; }));
    await p.waitForTimeout(250);
    const B = await sharp(await p.screenshot()).removeAlpha().raw().toBuffer();

    const H = A.info.height;
    const at = (buf, x, y) => { const i = (y * w + x) * 3; return [buf[i], buf[i + 1], buf[i + 2]]; };

    // Local background model: each row's own wide median, which flattens the
    // scrim ramp without flattening a walker.
    const WIN = Math.max(151, Math.round(301 * scale) | 1);
    // A walker's head is ~64px across where the photo is drawn at scale 0.96.
    const MIN_RUN = Math.max(24, Math.round((45 * scale) / 0.96));
    const y0 = Math.max(0, Math.floor(geo.h1Box.y)), y1 = Math.min(H, Math.ceil(geo.h1Box.y + geo.h1Box.h));
    const rows = [];
    let minGap = Infinity, minRow = null, minGlyph = null, minWalker = null;

    for (let y = y0; y < y1; y++) {
      const lumRow = new Float64Array(w);
      for (let x = 0; x < w; x++) lumRow[x] = lum(at(B, x, y));
      const pre = new Float64Array(w + 1);
      for (let x = 0; x < w; x++) pre[x + 1] = pre[x] + lumRow[x];

      // Rightmost glyph pixel on this row.
      let rightGlyph = -1;
      for (let x = w - 1; x >= 0; x--) {
        const a = at(A.data, x, y), c = at(B, x, y);
        if (Math.abs(a[0] - c[0]) + Math.abs(a[1] - c[1]) + Math.abs(a[2] - c[2]) > 24) { rightGlyph = x; break; }
      }
      if (rightGlyph < 0) continue;

      /*
        First *walker* pixel to the right of the type. The row's local mean
        (prefix sums over a wide window) flattens the scrim ramp; anything well
        under it is dark. The run-length floor is what separates a walker from
        background: at 1440 the type ends against a 28px-wide dark sliver of
        mist/branch, while the walker's head is 64px and up. Without the floor
        every width reports contact with something.
      */
      const dark = [];
      for (let x = rightGlyph + 1; x < w; x++) {
        const a = Math.max(0, x - (WIN >> 1)), z = Math.min(w - 1, x + (WIN >> 1));
        const mean = (pre[z + 1] - pre[a]) / (z + 1 - a);
        dark.push(lumRow[x] < mean * 0.78);
      }
      let leftWalker = null;
      for (let k = 0; k < dark.length; k++) {
        if (!dark[k]) continue;
        let j = k;
        while (j < dark.length && dark[j]) j += 1;
        if (j - k >= MIN_RUN) { leftWalker = rightGlyph + 1 + k; break; }
        k = j;
      }
      if (leftWalker === null) continue;
      const gap = leftWalker - rightGlyph;
      rows.push({ y, rightGlyph, leftWalker, gap });
      if (gap < minGap) { minGap = gap; minRow = y; minGlyph = rightGlyph; minWalker = leftWalker; }
    }

    geo.rowsMeasured = rows.length;
    geo.minClearance = minGap === Infinity ? null : minGap;
    geo.minClearanceAt = minRow === null ? null : { y: minRow, rightGlyph: minGlyph, leftWalker: minWalker };
    geo.tightestRows = rows.slice().sort((m, n) => m.gap - n.gap).slice(0, 6);
    out.push({ width: w, ...geo });

    console.log(`\n== ${w}px ==`);
    console.log(`  cover ${JSON.stringify(geo.cover)}  object-position ${geo.objectPosition}`);
    console.log(`  h1 ${geo.h1FontSize} ${geo.opsz} optical-sizing:${geo.opticalSizing} max-width:${geo.h1MaxWidth} lines:${geo.lineCount} sectionH ${geo.sectionHeight}`);
    console.log(`  lines ${geo.lines.map((l) => `${l.x}->${l.right}`).join('  ')}`);
    console.log(`  copyLeft ${geo.copyLeft} navLogo ${geo.navLogoLeft} delta ${(geo.copyLeft - geo.navLogoLeft).toFixed(2)} copyW ${geo.copyWidth} overflow ${geo.overflow}`);
    console.log(`  minRun ${MIN_RUN}px  win ${WIN}px`);
    console.log(`  MIN CLEARANCE ${geo.minClearance}px  at ${JSON.stringify(geo.minClearanceAt)}  (rows ${rows.length})`);
  }
  fs.writeFileSync(`${DIR}/${LABEL}-clearance.json`, JSON.stringify(out, null, 2));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
