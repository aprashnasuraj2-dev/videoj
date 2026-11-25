import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {createInvestigationReplaySession,replayInvestigationVersion,compareInvestigationVersions} from '../investigation-revision.js';
const comparable=x=>{const {recomputation,qualification,...rest}=x;return rest;};
async function exact(session,v){
 const r=await session.replay(v.versionText,v.digest);
 assert.deepEqual(r.report,await replayInvestigationVersion(v.versionText,v.digest));return r;
}
async function alter(v,change){
 const x=JSON.parse(v.versionText);await change(x);const versionText=JSON.stringify(x);return {versionText,digest:await casePin(versionText)};
}
for(const domain of ['finance','engineering'])test(domain+': complete version replay reuses actual arithmetic, rebinds exact report and derives matching impact',async()=>{
 const a=await livingFixture(domain),b=await livingFixture(domain,{previousDigest:a.digest,revised:true}),c=await livingFixture(domain,{previousDigest:b.digest,withdraw:true});
 const s=createInvestigationReplaySession(),first=await exact(s,a);assert.equal(first.stats.totals.executed,6);assert.equal(first.impact,null);
 const next=await exact(s,b);assert.equal(next.stats.totals.executed,3);assert.equal(next.stats.totals.reusedOutcomes,3);assert.equal(next.stats.totals.rebuiltReceipts,6);
 assert.equal(next.impact.recomputation,'PROVENANCE_BOUND_SESSION_REPLAY');
 assert.deepEqual(comparable(next.impact),comparable(await compareInvestigationVersions(a.versionText,a.digest,b.versionText,b.digest)));
 const withdrawn=await exact(s,c);assert.equal(withdrawn.stats.totals.removed,3);assert.equal(withdrawn.stats.totals.reusedOutcomes,3);
 assert.deepEqual(comparable(withdrawn.impact),comparable(await compareInvestigationVersions(b.versionText,b.digest,c.versionText,c.digest)));
 assert.equal(s.head(),c.digest);assert.equal((await exact(s,c)).stats.totals.reusedReceipts,3);
});
test('sibling fork and failed annotation transaction preserve exact previous cursor and cache',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{previousDigest:a.digest,revised:true}),sibling=await livingFixture('finance',{previousDigest:a.digest,irrelevant:true});
 const s=createInvestigationReplaySession();await exact(s,a);const branch=s.fork();
 const invalid=await alter(b,async x=>{const a=JSON.parse(x.annotationText);a.candidates[0].facets.method={statement:'bad reference',references:[{kind:'binding',id:'absent'}]};x.annotationText=JSON.stringify(a);x.annotationPin=await casePin(x.annotationText);});
 await assert.rejects(s.replay(invalid.versionText,invalid.digest),/SEMANTIC_UNKNOWN_BINDING/);assert.equal(s.head(),a.digest);
 const next=await exact(s,b);assert.equal(next.stats.totals.executed,3);assert.equal(next.stats.totals.reusedOutcomes,3);
 await assert.rejects(s.replay(sibling.versionText,sibling.digest),/REVISION_SESSION_PARENT/);assert.equal(s.head(),b.digest);
 const other=await exact(branch,sibling);assert.equal(other.stats.totals.executed,0);assert.equal(other.stats.totals.reusedOutcomes,6);
 assert.equal(branch.head(),sibling.digest);assert.equal(s.head(),b.digest);
 const fresh=createInvestigationReplaySession();assert.equal((await exact(fresh,a)).stats.totals.executed,6);
});
test('refused candidate cache is retired and not reused if it later becomes admitted',async()=>{
 const a=await livingFixture(),s=createInvestigationReplaySession();await exact(s,a);
 const refused=await alter(a,async x=>{x.previousDigest=a.digest;const b=JSON.parse(x.batchText);b.proposals[0].proposalText='{}';x.batchText=JSON.stringify(b);const n=JSON.parse(x.annotationText);n.batchDigest=await casePin(x.batchText);x.annotationText=JSON.stringify(n);x.annotationPin=await casePin(x.annotationText);});
 const r=await exact(s,refused);assert.equal(r.stats.totals.retired,3);assert.deepEqual(r.stats.retired.map(x=>[x.id,x.reason]),[['primary_view','PROPOSAL_REFUSED']]);
 const restored=await alter(a,x=>{x.previousDigest=refused.digest;});const rr=await exact(s,restored);
 assert.equal(rr.stats.candidates.find(x=>x.id==='primary_view').executed.length,3);
 assert.equal(rr.stats.candidates.find(x=>x.id==='secondary_view').reusedReceipts.length,3);
});
test('session sealing is exact, and concurrent calls and stale pins are rejected',async()=>{
 const a=await livingFixture(),s=createInvestigationReplaySession(),x=JSON.parse(a.versionText);
 const p=s.seal(x);await assert.rejects(s.replay(a.versionText,a.digest),/REVISION_SESSION_BUSY/);assert.throws(()=>s.fork(),/REVISION_SESSION_BUSY/);
 const r=await p;assert.equal(r.versionText,a.versionText);assert.equal(r.digest,a.digest);assert.deepEqual(r.report,a.report);
 await assert.rejects(s.replay(a.versionText,'sha256:'+'0'.repeat(64)),/REVISION_PIN/);assert.equal(s.head(),a.digest);
});
