import test from 'node:test';
import assert from 'node:assert/strict';
import {createProvenanceStore} from '../src/provenance-store.js';

const spec='a0ceda34e4f2e653223e13e63282abc9b60eaf7c';
const runtime='486ecf26aa8775963f9b765f894734bef1ac9817';

test('provenance store exports only allow-listed run metadata',()=>{
 let now=1000;const store=createProvenanceStore({specCommit:spec,runtimeSha:runtime,buildSha:'895d93698508a004d386c21ef2e34cd79efe4490',clock:()=>now,maxRuns:3});
 store.begin({kind:'peer',graphSha:'a'.repeat(64),modelId:'openrouter/free',router:'OpenRouter',limits:{maxAgents:12,timeoutMs:60000,unknown:999}});
 now=1325;
 const run=store.finish({
  origins:['https://peer.example/secret/path?token=x','https://openrouter.ai/api/v1'],
  consentEvents:[
   {type:'decision',origin:'https://peer.example',contactKind:'peer_manifest',decision:'allow',scope:'once',purpose:'synthetic-private-canary'},
   {type:'decision',origin:'https://blocked.example',contactKind:'peer_graph',decision:'deny',scope:'session',disclosure:['synthetic-secret']}
  ],
  runtimeEvents:[
   {phase:'start',kind:'agent',agent:'learner',prompt:'synthetic-private-canary'},
   {phase:'start',kind:'tool',tool:'evidence',arguments:'synthetic-private-canary'},
   {kind:'composition_limit',limit:'agent_calls',reason:'synthetic-private-canary'}
  ],
  agentCalls:3,modelCalls:5,remoteCalls:1,errorCode:'CANCELLED',status:'cancelled',
  actionReceipts:[{action:'https://sutra.test/learner#save-review-card',requestId:'invocation-1:0',status:'unknown',error:'synthetic-private-canary'}]
 });
 assert.equal(run.elapsedMs,325);assert.equal(run.status,'cancelled');assert.equal(run.error,'CANCELLED');
 assert.deepEqual(run.agents,['learner']);assert.deepEqual(run.tools,['evidence']);assert.deepEqual(run.limitStops,['agent_calls']);
 assert.deepEqual(run.origins,['https://openrouter.ai','https://peer.example']);
 assert.deepEqual(run.limits,{maxAgents:12,timeoutMs:60000});
 assert.equal(run.actions[0].status,'unknown');
 const text=JSON.stringify(store.exportData());
 assert.ok(!text.includes('synthetic-private-canary'));
 assert.ok(!text.includes('token=x'));assert.ok(!text.includes('/secret/path'));assert.ok(!text.includes('synthetic-secret'));
});

test('history is bounded and older runs are discarded',()=>{
 let now=0;const store=createProvenanceStore({specCommit:spec,runtimeSha:runtime,buildSha:'abcdef1',maxRuns:2,clock:()=>++now});
 for(let i=0;i<3;i++){store.begin({kind:'run',graphSha:String(i+1).repeat(64).slice(0,64)});store.finish();}
 assert.equal(store.size(),2);const data=store.exportData();assert.equal(data.runs.length,2);assert.deepEqual(data.runs.map(r=>r.id),['run-2','run-3']);
});

test('arbitrary model/router/error text is not exported verbatim',()=>{
 const secret='sk-synthetic-secret-123456';const store=createProvenanceStore({specCommit:spec,runtimeSha:runtime,buildSha:'abcdef1',clock:()=>100});
 store.begin({modelId:secret,router:'router '+secret,graphSha:'f'.repeat(64)});
 const run=store.finish({errorCode:'provider said '+secret,origins:['not a url'],runtimeEvents:[{phase:'start',kind:'agent',agent:secret}]});
 const text=JSON.stringify(run);assert.ok(!text.includes(secret));assert.equal(run.modelId,'unknown');assert.equal(run.router,'unknown');assert.equal(run.error,'none');assert.deepEqual(run.origins,[]);assert.deepEqual(run.agents,[]);
});

test('action outcomes can update latest run without exposing action result payload',()=>{
 const store=createProvenanceStore({specCommit:spec,runtimeSha:runtime,buildSha:'abcdef1',clock:()=>100});
 store.begin({graphSha:'f'.repeat(64)});store.finish();
 const updated=store.recordAction([{action:'https://sutra.test/learner#export-receipt',requestId:'run-1:0',status:'succeeded',result:{secret:'do-not-export'}}]);
 assert.equal(updated.actions[0].status,'succeeded');assert.ok(!JSON.stringify(updated).includes('do-not-export'));
});

test('invalid active-state and clock usage fail visibly without corrupting history',()=>{
 const store=createProvenanceStore({specCommit:spec,runtimeSha:runtime,buildSha:'abcdef1',clock:()=>42});
 assert.throws(()=>store.finish(),/No matching active provenance run/);assert.equal(store.size(),0);
 assert.throws(()=>createProvenanceStore({specCommit:spec,runtimeSha:runtime,buildSha:'abcdef1',maxRuns:0}),/maxRuns/);
});

test('overlapping runs remain isolated by run id and active memory is bounded',()=>{
 let now=10;const store=createProvenanceStore({specCommit:spec,runtimeSha:runtime,buildSha:'abcdef1',clock:()=>now});
 const first=store.begin({kind:'local',graphSha:'a'.repeat(64),modelId:'fixture-only',router:'fixture'});
 const second=store.begin({kind:'peer',graphSha:'b'.repeat(64),modelId:'openrouter/free',router:'OpenRouter'});
 assert.equal(store.activeSize(),2);
 now=25;const peer=store.finish({runId:second,modelCalls:5,status:'complete'});
 now=40;const local=store.finish({runId:first,modelCalls:3,status:'complete'});
 assert.equal(peer.kind,'peer');assert.equal(peer.graphSha,'b'.repeat(64));assert.equal(peer.modelId,'openrouter/free');
 assert.equal(local.kind,'local');assert.equal(local.graphSha,'a'.repeat(64));assert.equal(local.modelId,'fixture-only');
 assert.equal(store.activeSize(),0);
});
