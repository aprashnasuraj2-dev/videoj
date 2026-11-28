import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {admitLiveSmokeManifest,runSearchSmoke} from '../live-search-smoke.js';
const raw=await readFile(new URL('../fixtures/live-smoke-manifest.json',import.meta.url),'utf8'),pin=admitLiveSmokeManifest(raw).planPin;
const credentials={brave:'test-brave-key',tavily:'test-tavily-key'};
const grant={raw,approvedPlanPin:pin,approvePublicContact:true,approveEstimatedCost:true,credentials};
test('smoke exercises both adapter wire formats and never labels injected responses live',async()=>{
 const contacted=[];const r=await runSearchSmoke({...grant,transport:async o=>{contacted.push(o.url.hostname);const rows=[{url:'https://public.org/report',title:'Public statistics'}];return {body:Buffer.from(JSON.stringify(o.method==='POST'?{results:rows}:{web:{results:rows}}))};}});
 assert.deepEqual(contacted,['api.search.brave.com','api.tavily.com']);assert.equal(r.mode,'injected_fixture');assert.equal(r.status,'passed');assert.equal(r.usage.searches,2);assert.ok(!JSON.stringify(r).includes('test-brave-key'));
});
test('missing credentials and wrong approval cause zero outbound calls',async()=>{
 let calls=0;const transport=async()=>{calls++;throw Error('unexpected');};
 await assert.rejects(runSearchSmoke({...grant,credentials:{brave:'test-brave-key'},transport}),/SMOKE_CREDENTIALS/);
 await assert.rejects(runSearchSmoke({...grant,approvedPlanPin:'wrong',transport}),/APPROVAL/);
 assert.equal(calls,0);
});
test('partial provider failure cannot pass smoke',async()=>{
 const r=await runSearchSmoke({...grant,transport:async o=>{if(o.method==='POST')throw Object.assign(Error('quota'),{code:'PROVIDER_QUOTA'});return {body:Buffer.from('{"web":{"results":[{"url":"https://public.org/"}]}}')};}});
 assert.equal(r.status,'failed');assert.deepEqual(r.checks.map(c=>c.status),['passed','failed']);assert.equal(r.usage.searches,2);
});
