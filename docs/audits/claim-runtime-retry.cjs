// Bounded ODI-40 runtime probe. Never prints credentials or changes fixture setup.
require('@next/env').loadEnvConfig(process.cwd());
const { createClient } = require('@supabase/supabase-js');
const fs = require('node:fs');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const actor = '59fdecb5-804e-41c6-969e-e48eb5d850f9';
const account = 'd0ec2915-e46d-4aa6-bf06-1a6e04a0267e';
const email = 'odius7+providertest1@gmail.com';
const fixtures = [1,2,3].map(n => `00000000-0000-4000-a000-00000000000${n}`);
function assert(ok, message) { if (!ok) throw new Error(message); }
async function unwrap(query) { const r = await query; if(r.error) throw new Error(r.error.message); return r.data; }
async function snapshot() {
  const [facilities, provider, attempts, rejections] = await Promise.all([
    unwrap(db.from('facilities').select('id,source,website,is_claimed,is_verified,provider_account_id,listing_tier,is_featured').in('id',fixtures).order('id')),
    unwrap(db.from('provider_accounts').select('id,auth_user_id,is_active').eq('id',account).single()),
    unwrap(db.from('provider_claim_attempts').select('id,auth_user_id,facility_id,created_at').eq('auth_user_id',actor).order('id')),
    unwrap(db.from('facility_claim_rejections').select('id,facility_id,auth_user_id,provider_account_id,rejected_by,rejected_at').eq('auth_user_id',actor).in('facility_id',fixtures).order('id')),
  ]);
  return {facilities,provider,attempts,rejections};
}
(async()=>{
  const auth = await db.auth.admin.getUserById(actor);
  if(auth.error) throw new Error(auth.error.message);
  assert(auth.data.user.email === email && auth.data.user.email_confirmed_at, 'Controlled confirmed identity required');
  const before = await snapshot();
  assert(before.facilities.length===3 && before.facilities.every(f=>f.source==='demo'), 'Synthetic fixtures required');
  assert(before.provider.auth_user_id===actor && before.provider.is_active, 'Expected active provider required');
  assert(before.facilities[0].is_verified && before.facilities[0].provider_account_id===account, 'Owned verified fixture required');
  assert(before.rejections.some(r=>r.facility_id===fixtures[1] && r.provider_account_id===account), 'Existing rejection required');
  const results=[];
  for (const facility of [fixtures[0],fixtures[0],fixtures[1]]) {
    results.push(await unwrap(db.rpc('claim_facility',{p_auth_user_id:actor,p_user_email:email,p_facility_id:facility,p_rate_limit:5})));
  }
  const after=await snapshot();
  const pass=results.slice(0,2).every(r=>r.ok && r.status==='verified' && r.already_owned===true) && results[2].ok===false && results[2].code==='claim_rejected' && JSON.stringify(before)===JSON.stringify(after);
  const evidence={timestamp:new Date().toISOString(),scope:'Direct production RPC, not authenticated preview HTTP POST',actor,account,before,results,after,pass};
  fs.writeFileSync('docs/audits/2026-09-16-provider-claim-retry-evidence.json',JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
  assert(pass,'Runtime checks failed; preserve evidence');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
