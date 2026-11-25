import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {auditRevisionReuse} from '../revision-reuse-audit.js';
const audit=(a,b)=>auditRevisionReuse(a.versionText,a.digest,b.versionText,b.digest);
for(const domain of ['finance','engineering']){
 test(domain+': unchanged primary graph reuses all three nodes, corrected source invalidates dependent graph',async()=>{
  const a=await livingFixture(domain),b=await livingFixture(domain,{previousDigest:a.digest,revised:true}),r=await audit(a,b);
  assert.equal(r.rows[0].reused.length,3);assert.equal(r.rows[0].executed.length,0);
  assert.equal(r.rows[1].executed.length,3);assert.equal(r.rows[1].reused.length,0);
  assert.deepEqual(r.counts,{reused:3,executed:3,removed:0});
  assert.equal(r.rows[1].after,'CONDITIONALLY_REFUTED');assert.ok(r.rows.every(x=>x.freshCanonicalMatch&&x.compilerOutcomesMatch));
 });
 test(domain+': withdrawal removes previously executable graph without stale receipts',async()=>{
  const a=await livingFixture(domain),b=await livingFixture(domain,{previousDigest:a.digest,withdraw:true}),r=await audit(a,b);
  assert.equal(r.rows[1].after,'BLOCKED_MISSING_INPUT');
  assert.equal(r.rows[1].projectedReportDigest,null);assert.equal(r.rows[1].removed.length,3);assert.equal(r.rows[1].reused.length,0);
 });
}
test('irrelevant source revision reuses both graphs but not version identities',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{previousDigest:a.digest,irrelevant:true}),r=await audit(a,b);
 assert.notEqual(r.beforeDigest,r.afterDigest);assert.deepEqual(r.counts,{reused:6,executed:0,removed:0});
 assert.equal(r.decisionAuthority,'NONE');assert.equal(r.fullImpact.recomputation,'FULL_REPLAY_BOTH_VERSIONS');
});
test('wrong parent and stale version pin fail before reuse',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{revised:true});
 await assert.rejects(audit(a,b),/REVISION_PARENT/);
 await assert.rejects(auditRevisionReuse(a.versionText,a.digest,b.versionText,b.digest.replace(/.$/,b.digest.endsWith('0')?'1':'0')),/REVISION_PIN/);
});
