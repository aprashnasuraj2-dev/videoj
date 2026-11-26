import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {createInvestigationHistory,openInvestigationHistory} from '../investigation-history.js';
import {compareInvestigationVersions,replayInvestigationVersion} from '../investigation-revision.js';
async function append(h,v){const s=h.snapshot();return h.append({expectedHistoryPin:s.digest,branch:'main',expectedHead:s.view.branches.find(x=>x.name==='main').head,versionText:v.versionText,versionPin:v.digest});}
for(const domain of ['finance','engineering'])test(domain+' multi-generation correction, withdrawal, restoration and retained history',async()=>{
 const a=await livingFixture(domain),b=await livingFixture(domain,{revised:true,previousDigest:a.digest}),c=await livingFixture(domain,{withdraw:true,previousDigest:b.digest}),d=await livingFixture(domain,{previousDigest:c.digest});
 const h=await createInvestigationHistory(a.versionText,a.digest);
 for(const v of [b,c,d])await append(h,v);
 const s=h.snapshot(),recovered=await openInvestigationHistory(s.historyText,s.digest);
 assert.equal(s.view.versions.length,4);assert.equal(recovered.restore(a.digest).versionText,a.versionText);
 const state=v=>v.report.investigation.candidates.find(x=>x.id==='secondary_view').computation.status;
 assert.deepEqual([a,b,c,d].map(state),['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED','BLOCKED_MISSING_INPUT','CONDITIONALLY_SATISFIED']);
 for(const [old,next] of [[a,b],[b,c],[c,d]]){const impact=await compareInvestigationVersions(old.versionText,old.digest,next.versionText,next.digest);assert.equal(impact.decisionAuthority,'NONE');assert.equal(impact.candidates.find(x=>x.id==='primary_view').dependencyAffected,false);assert.equal(impact.candidates.find(x=>x.id==='secondary_view').reviewRequired,true);}
 assert.deepEqual(await replayInvestigationVersion(b.versionText,b.digest),b.report);
 assert.equal(s.view.decisionAuthority,'NONE');
});
