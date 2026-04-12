'use client'

interface Prompt {
  id: string
  type: 'text' | 'yesno' | 'table' | 'scale'
  question: string
  hint?: string
  followup?: string
  columns?: string[]
  required?: boolean
  min?: number
  max?: number
  labels?: string[]
}

interface Workbook {
  title: string
  step_number: number | null
  description: string | null
  reference_text: string | null
  prompts: Prompt[]
}

// ─── HTML generation ──────────────────────────────────────────────────────────

function writingLines(count: number): string {
  return Array.from({ length: count }, () => '<div class="wl"></div>').join('')
}

function promptHTML(p: Prompt, idx: number): string {
  let input = ''

  if (p.type === 'text') {
    input = `
      <div class="writing-area">${writingLines(8)}</div>`
  } else if (p.type === 'yesno') {
    input = `
      <div class="yesno-row">
        <span class="yesno-opt">&#9634; &nbsp;Yes</span>
        <span class="yesno-opt">&#9634; &nbsp;No</span>
      </div>
      ${p.followup ? `<p class="followup-label">${p.followup}</p><div class="writing-area">${writingLines(5)}</div>` : ''}`
  } else if (p.type === 'scale') {
    const min = p.min ?? 1
    const max = p.max ?? 10
    const minLabel = p.labels?.[0] ?? ''
    const maxLabel = p.labels?.[1] ?? ''
    const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i)
      .map(n => `<span class="scale-tick">${n}</span>`).join('')
    input = `
      <div class="scale-wrap">
        <div class="scale-ticks">${ticks}</div>
        <div class="scale-labels">
          <span>${minLabel}</span>
          <span>${maxLabel}</span>
        </div>
        <div class="scale-circle">&#9675;</div>
      </div>`
  } else if (p.type === 'table') {
    const cols = p.columns ?? []
    const ths = cols.map(c => `<th>${c}</th>`).join('')
    const trs = Array.from({ length: 7 }, () =>
      `<tr>${cols.map(() => '<td></td>').join('')}</tr>`
    ).join('')
    input = `
      <table class="inv-table">
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>`
  }

  return `
    <div class="prompt">
      <div class="prompt-num">${idx + 1}.</div>
      <div class="prompt-body">
        <div class="prompt-q">${p.question}</div>
        ${p.hint ? `<p class="prompt-hint">${p.hint}</p>` : ''}
        ${input}
      </div>
    </div>`
}

function buildHTML(wb: Workbook): string {
  const allPrompts = wb.prompts.map((p, i) => promptHTML(p, i)).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${wb.title} — SoberAnchor</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
/* ── Reset ── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:11.5pt}
body{
  font-family:'EB Garamond',Georgia,serif;
  color:#1c1c1c;
  background:#fff;
  max-width:7.5in;
  margin:0 auto;
  padding:.8in .9in .75in;
  print-color-adjust:exact;
  -webkit-print-color-adjust:exact;
}

/* ── Screen-only toolbar ── */
@media screen{
  .toolbar{
    position:fixed;top:18px;right:20px;
    display:flex;gap:10px;z-index:200;
  }
  .btn-print{
    background:#003366;color:#fff;border:none;
    padding:9px 22px;border-radius:8px;
    font-family:'EB Garamond',Georgia,serif;
    font-size:12pt;cursor:pointer;
    box-shadow:0 2px 14px rgba(0,51,102,.22);
  }
  .btn-print:hover{background:#002244}
  .btn-close{
    background:none;color:#888;
    border:1.5px solid #ddd;
    padding:9px 14px;border-radius:8px;
    font-family:'EB Garamond',Georgia,serif;
    font-size:12pt;cursor:pointer;
  }
  .btn-close:hover{color:#333;border-color:#bbb}
}
@media print{.toolbar{display:none!important}}

/* ── Page header ── */
.pg-header{
  text-align:center;
  border-bottom:2px solid #003366;
  padding-bottom:18pt;
  margin-bottom:24pt;
}
.program-label{
  font-family:'Cormorant Garamond',Georgia,serif;
  font-size:8.5pt;font-weight:600;
  letter-spacing:4px;text-transform:uppercase;
  color:#2A8A99;margin-bottom:7pt;
}
.step-eyebrow{
  font-family:'Cormorant Garamond',Georgia,serif;
  font-size:10pt;font-weight:600;
  letter-spacing:3px;text-transform:uppercase;
  color:#999;margin-bottom:5pt;
}
.section-title{
  font-family:'Cormorant Garamond',Georgia,serif;
  font-size:29pt;font-weight:700;
  color:#003366;line-height:1.1;margin-bottom:10pt;
}
.section-desc{
  font-family:'EB Garamond',Georgia,serif;
  font-size:11.5pt;font-style:italic;
  color:#555;line-height:1.65;
  max-width:5.5in;margin:0 auto;
}
.ref-text{
  font-family:'EB Garamond',Georgia,serif;
  font-size:10pt;font-style:italic;color:#888;
  margin-top:9pt;
}

/* ── Prompts ── */
.prompt{
  display:flex;gap:11pt;
  margin-bottom:26pt;
  page-break-inside:avoid;
}
.prompt-num{
  font-family:'Cormorant Garamond',Georgia,serif;
  font-size:16pt;font-weight:700;
  color:#003366;flex-shrink:0;
  width:20pt;padding-top:1pt;
}
.prompt-body{flex:1;min-width:0}
.prompt-q{
  font-family:'Cormorant Garamond',Georgia,serif;
  font-size:14pt;font-weight:600;
  color:#003366;line-height:1.4;margin-bottom:5pt;
}
.prompt-hint{
  font-family:'EB Garamond',Georgia,serif;
  font-size:10.5pt;font-style:italic;
  color:#777;line-height:1.55;
  margin-bottom:9pt;
}

/* ── Writing lines ── */
.writing-area{margin-top:7pt}
.wl{height:22pt;border-bottom:1px solid #bbb}

/* ── Yes/No ── */
.yesno-row{
  display:flex;gap:30pt;
  margin:8pt 0 11pt;
  font-family:'EB Garamond',Georgia,serif;
  font-size:14pt;
}
.yesno-opt{letter-spacing:.5px}
.followup-label{
  font-family:'EB Garamond',Georgia,serif;
  font-size:10.5pt;font-style:italic;
  color:#666;margin-bottom:7pt;
}

/* ── Inventory table ── */
.inv-table{
  width:100%;border-collapse:collapse;
  font-family:'EB Garamond',Georgia,serif;
  font-size:10pt;margin-top:7pt;
}
.inv-table th{
  background:#f2f2f2;
  border:1px solid #bbb;
  padding:5pt 7pt;text-align:left;
  font-family:'Cormorant Garamond',Georgia,serif;
  font-size:9.5pt;font-weight:700;
  letter-spacing:.4px;color:#003366;
}
.inv-table td{
  border:1px solid #ccc;
  height:26pt;padding:2pt 5pt;
  vertical-align:bottom;
}
.inv-table tbody tr:nth-child(even) td{background:#fafafa}

/* ── Footer ── */
.pg-footer{
  margin-top:32pt;padding-top:12pt;
  border-top:1px solid #ddd;text-align:center;
}
.footer-anchor{
  font-family:'Cormorant Garamond',Georgia,serif;
  font-size:18pt;color:#003366;margin-bottom:3pt;
}
.footer-copy{
  font-family:'EB Garamond',Georgia,serif;
  font-size:9pt;color:#aaa;letter-spacing:.6px;
}

/* ── Scale ── */
.scale-wrap{margin-top:7pt}
.scale-ticks{
  display:flex;justify-content:space-between;
  border-top:1.5pt solid #003366;
  padding-top:5pt;margin-bottom:3pt;
}
.scale-tick{
  font-family:'Cormorant Garamond',Georgia,serif;
  font-size:12pt;font-weight:600;color:#003366;
  width:20pt;text-align:center;
}
.scale-labels{
  display:flex;justify-content:space-between;
  font-family:'EB Garamond',Georgia,serif;
  font-size:9.5pt;font-style:italic;color:#777;
  margin-bottom:6pt;
}
.scale-circle{
  font-size:22pt;color:#bbb;
  text-align:center;margin-top:4pt;
}

/* ── Print page setup ── */
@media print{
  @page{size:letter;margin:.85in .9in .8in}
  body{padding:0;max-width:100%}
  .prompt{page-break-inside:avoid}
  .inv-table tr{page-break-inside:avoid}
}
</style>
</head>
<body>

<div class="toolbar">
  <button class="btn-print" onclick="window.print()">🖨&nbsp; Print / Save as PDF</button>
  <button class="btn-close" onclick="window.close()">✕</button>
</div>

<header class="pg-header">
  <div class="program-label">Alcoholics Anonymous &nbsp;·&nbsp; Step Work</div>
  ${wb.step_number ? `<div class="step-eyebrow">Step ${wb.step_number}</div>` : ''}
  <h1 class="section-title">${wb.title}</h1>
  ${wb.description ? `<p class="section-desc">${wb.description}</p>` : ''}
  ${wb.reference_text ? `<p class="ref-text">${wb.reference_text}</p>` : ''}
</header>

<main>
  ${allPrompts}
</main>

<footer class="pg-footer">
  <div class="footer-anchor">⚓</div>
  <div class="footer-copy">SoberAnchor &nbsp;&middot;&nbsp; Your Anchor to Sober Living &nbsp;&middot;&nbsp; soberanchor.com</div>
</footer>

</body>
</html>`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrintButton({ workbook }: { workbook: Workbook }) {
  function handlePrint() {
    const html = buildHTML(workbook)
    const win = window.open('', '_blank', 'width=940,height=720,menubar=no,toolbar=no')
    if (!win) {
      // Pop-up blocked — fall back to a data URI
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      return
    }
    win.document.write(html)
    win.document.close()
    // Give fonts a moment to load before auto-printing
    win.addEventListener('load', () => setTimeout(() => win.print(), 400))
  }

  return (
    <button
      onClick={handlePrint}
      title="Open print-ready workbook page"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        border: '1.5px solid var(--border)', background: '#fff',
        color: 'var(--navy)', cursor: 'pointer', fontFamily: 'var(--font-body)',
        whiteSpace: 'nowrap',
      }}
    >
      🖨️ Print
    </button>
  )
}
