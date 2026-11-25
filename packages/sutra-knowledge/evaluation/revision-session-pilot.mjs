// Local engineering pilot: measure actual session path vs full independent-style
// fresh replay, not a claim of user/device speed or guaranteed latency gain.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {livingFixture} from '../examples/living-investigation.mjs';
import {createInvestigationReplaySession,replayInvestigationVersion,compareInvestigationVersions} from '../investigation-revision.js';
const comparable=x=>{const {recomputation,qualification,...rest}=x;return rest;};
const rows=[];
for(const domain of ['finance','engineering']){
 const a=await livingFixture(domain),b=await livingFixture(domain,{previousDigest:a.digest,revised:true}),c=await livingFixture(domain,{previousDigest:b.digest,withdraw:true});
 const versions=[a,b,c],session=createInvestigationReplaySession();let prior=null;
 for(const v of versions){
  const t0=performance.now(),r=await session.replay(v.versionText,v.digest),sessionMs=performance.now()-t0;
  const t1=performance.now(),fresh=await replayInvestigationVersion(v.versionText,v.digest),freshImpact=prior?await compareInvestigationVersions(prior.versionText,prior.digest,v.versionText,v.digest):null,freshMs=performance.now()-t1;
  assert.deepEqual(r.report,fresh);if(freshImpact)assert.deepEqual(comparable(r.impact),comparable(freshImpact));
  rows.push({domain,transition:prior?'revision':'initial',sessionMs,freshMs,...r.stats.totals});prior=v;
 }
}
console.log(JSON.stringify({profile:'revision-session-engineering-pilot/v1',rows,qualification:'Single synthetic process measurement. Counts are actual local operations. Fresh path includes independent full replay of both versions for impact; timings are not hardware or product performance claims.'},null,2));
