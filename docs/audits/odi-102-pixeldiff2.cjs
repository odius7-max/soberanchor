/**
 * ODI-102 gate-fix regression diff: the post-fix capture (fixed-*) against the
 * gated state (gated-*), both captured in one server session so the image
 * optimizer serves identical variants and only the CSS rule differs. Widths at and below 1440
 * must come back byte-identical; 1920/2560 are expected to differ.
 */
const sharp = require('sharp'), fs = require('fs');
const DIR = 'docs/audits/odi-102';
(async () => {
  const out = [];
  for (const w of [320, 375, 700, 768, 1024, 1280, 1440, 1920, 2560]) {
    const [a, b] = await Promise.all([
      sharp(`${DIR}/gated2-${w}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(`${DIR}/fixed2-${w}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    ]);
    if (a.data.length !== b.data.length) { out.push({ w, note: 'dimension mismatch' }); continue; }
    let diff = 0, maxd = 0;
    for (let i = 0; i < a.data.length; i++) {
      const d = Math.abs(a.data[i] - b.data[i]);
      if (d > 0) { diff++; if (d > maxd) maxd = d; }
    }
    out.push({ w, mustMatch: w <= 1440, differingSubpixels: diff, maxChannelDelta: maxd, identical: diff === 0 });
  }
  fs.writeFileSync(`${DIR}/pixeldiff-gatefix.json`, JSON.stringify(out, null, 2));
  console.table(out);
  const bad = out.filter((r) => r.mustMatch && !r.identical);
  console.log(bad.length ? `REGRESSION at ${bad.map((r) => r.w).join(', ')}` : 'OK: every width <=1440 is byte-identical to the gated build');
})().catch((e) => { console.error(e); process.exit(1); });
