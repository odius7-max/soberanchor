/**
 * ODI-102: proves the widths that must not move did not move, by differencing the
 * pre-fix and post-fix full-page screenshots captured by odi-102-align.cjs.
 */
const sharp = require('sharp'), fs = require('fs');
const DIR = 'docs/audits/odi-102';
(async () => {
  const out = [];
  for (const w of [320, 375, 700, 768, 1024, 1280, 1440, 1920, 2560]) {
    const [a, b] = await Promise.all([
      sharp(`${DIR}/before-${w}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(`${DIR}/after-${w}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    ]);
    if (a.data.length !== b.data.length) { out.push({ w, note: 'size differs' }); continue; }
    let diff = 0, maxd = 0;
    for (let i = 0; i < a.data.length; i++) {
      const d = Math.abs(a.data[i] - b.data[i]);
      if (d > 0) { diff++; if (d > maxd) maxd = d; }
    }
    out.push({
      w, dims: `${a.info.width}x${a.info.height}`, differingSubpixels: diff,
      pctDiffering: +((diff / a.data.length) * 100).toFixed(4), maxChannelDelta: maxd,
      identical: diff === 0,
    });
  }
  fs.writeFileSync(`${DIR}/pixeldiff.json`, JSON.stringify(out, null, 2));
  console.table(out);
})().catch((e) => { console.error(e); process.exit(1); });
