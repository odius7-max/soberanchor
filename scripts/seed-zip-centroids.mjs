// ODI-93: seed zip_centroids from zip_centroids.csv (GeoNames, CC BY 4.0).
// Runs on Travis's machine; reads Supabase URL + service key from the repo's
// .env.local (never printed). Idempotent: upserts on zip.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const repo = process.env.REPO_DIR || '.';
const env = {};
for (const line of readFileSync(path.join(repo, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error('missing url or service key in .env.local'); process.exit(1); }

const sb = createClient(url, key, { auth: { persistSession: false } });
const csv = readFileSync(path.join(repo, 'scripts', 'zip_centroids.csv'), 'utf8').trim().split('\n');
csv.shift(); // header
const recs = csv.map(l => {
  // city names contain no quotes/commas in this dataset except a few — parse defensively
  const parts = l.split(',');
  const zip = parts[0];
  const state = parts[parts.length - 3];
  const latitude = Number(parts[parts.length - 2]);
  const longitude = Number(parts[parts.length - 1]);
  const city = parts.slice(1, parts.length - 3).join(',').replace(/^"|"$/g, '').replace(/""/g, '"');
  return { zip, city, state, latitude, longitude };
});
console.log('parsed rows:', recs.length);

let done = 0;
for (let i = 0; i < recs.length; i += 2000) {
  const batch = recs.slice(i, i + 2000);
  const { error } = await sb.from('zip_centroids').upsert(batch, { onConflict: 'zip' });
  if (error) { console.error('batch', i / 2000, 'FAILED:', error.message); process.exit(1); }
  done += batch.length;
}
console.log('upserted rows:', done);
const { count, error: cErr } = await sb.from('zip_centroids').select('*', { count: 'exact', head: true });
console.log('table count:', cErr ? 'ERR ' + cErr.message : count);
