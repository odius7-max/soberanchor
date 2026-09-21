// Read-only source inventory pinned to the production commit, not in-flight edits.
const ts=require('typescript');
const cp=require('node:child_process');
const fs=require('node:fs');
const sha='e6f192da22569a7d2b504cd75cbd43b706e21314';
const files=[
 ['https://soberanchor.com/for-providers','src/app/for-providers/page.tsx'],
 ['https://soberanchor.com/for-providers#claim','src/app/for-providers/ClaimSection.tsx'],
 ['https://soberanchor.com/dashboard (Plan & Billing)','src/components/providers/PlanTab.tsx'],
 ['https://soberanchor.com/dashboard (Overview)','src/components/providers/OverviewTab.tsx'],
 ['https://soberanchor.com/dashboard (My Listing)','src/components/providers/ListingTab.tsx'],
 ['https://soberanchor.com/dashboard (Leads)','src/components/providers/LeadsTab.tsx'],
 ['https://soberanchor.com/find/00000000-0000-4000-a000-000000000001 (listing template)','src/app/find/[id]/page.tsx'],
 ['https://soberanchor.com/providers/claim (claim template)','src/components/providers/ClaimFlow.tsx'],
 ['https://soberanchor.com/find (directory badges)','src/components/find/FacilitiesDirectory.tsx'],
 ['https://soberanchor.com/find (search badges)','src/app/find/page.tsx'],
 ['https://soberanchor.com/admin/facilities/[id] (source-only admin surface)','src/app/admin/facilities/[id]/page.tsx'],
 ['https://soberanchor.com/admin/facilities (source-only admin surface)','src/components/admin/FacilityTable.tsx'],
 ['https://soberanchor.com/program (separate Sponsor Pro ladder)','src/app/program/page.tsx'],
 ['https://soberanchor.com/upgrade (separate Sponsor Pro ladder)','src/app/upgrade/page.tsx'],
 ['https://soberanchor.com/dashboard (Sponsor Pro modal, separate product)','src/components/dashboard/UpgradeToProModal.tsx'],
 ['https://soberanchor.com/dashboard (sponsor capacity modal)','src/components/dashboard/AcceptAtCapModal.tsx'],
];
let out=`# Exact copy inventory — production ${sha}\n\nSource-derived coverage, not a claim that every conditional surface was rendered. Public /for-providers independently matched in the browser. Source line numbers refer to this pinned commit. JSX entities are preserved where present; adjacent text/dynamic values may render together. Includes nearby copy to avoid missing tier promises. Separate Sponsor Pro and admin surfaces are labeled explicitly.\n`;
for(const [url,file] of files){
 const source=cp.execFileSync('git',['show',`${sha}:${file}`],{encoding:'utf8'});
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const rows=[];
 function walk(n){
  if(ts.isJsxAttribute(n)&&['style','className','d','viewBox'].includes(n.name.getText(ast)))return;
  if(ts.isImportDeclaration(n))return;
  if(ts.isJsxText(n)||ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)){
   const value=(ts.isJsxText(n)?n.text:n.text).replace(/\s+/g,' ').trim();
   if(value && (/[a-zA-Z].*\s.*[a-zA-Z]/.test(value)||/\$\d|Featured|Verified|Premium|Enhanced|Claimed|Basic|Upgrade|Free|Recommended/.test(value)) && !/^(rgba?\(|linear-gradient|var\(|https?:|[a-z-]+:|[.#]|[0-9.]+(px|rem)|[a-z]+-[a-z]+\s)/.test(value)) {
    rows.push(`- L${ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1}: ${JSON.stringify(value)}`);
   }
  }
  ts.forEachChild(n,walk);
 }
 walk(ast);
 out+=`\n## ${url}\n\nSource: ${file}\n\n${rows.join('\n')}\n`;
}
fs.writeFileSync('docs/audits/2026-09-17-monetization-copy-inventory.md',out);
console.log(`Wrote source inventory for ${files.length} surfaces.`);
