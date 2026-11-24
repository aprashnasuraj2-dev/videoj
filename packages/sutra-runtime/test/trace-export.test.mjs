import test from 'node:test';
import assert from 'node:assert/strict';
import {createSafeTraceReceipt,serializeSafeTraceReceipt} from '../trace-export.js';

const canary='BYOK_PRIVATE_TOKEN_CANNOT_EXPORT_123';
test('trace export strips model content, hidden prompts, credentials, tool args, contact payloads',()=>{
 const result=createSafeTraceReceipt({
  mode:'provider',outcome:'completed',modelCalls:5,agentCalls:3,
  events:[
   {phase:'start',kind:'agent',agent:'learner',network:'learner',origin:'sutra-local',
    content:canary,prompt:canary,apiKey:canary,args:{secret:canary},headers:{Authorization:canary}},
   {phase:'end',kind:'tool',tool:'checklist',status:'ok',toolOutput:canary,privateContext:canary}
  ],
  contactEvents:[{at:'2026-11-23T00:00:00Z',type:'decision',origin:'https://peer.example',
   contactKind:'peer_graph',purpose:'Read public data',disclosure:['network name'],decision:'allow',
   privateArgs:{value:canary},body:canary,authorization:canary}]
 });
 const text=JSON.stringify(result);
 assert.ok(!text.includes(canary));
 assert.deepEqual(result.events[0],{phase:'start',kind:'agent',agent:'learner',network:'learner',origin:'sutra-local'});
 assert.equal(result.consent[0].decision,'allow');
 assert.equal(result.consent[0].origin,'https://peer.example');
 assert.equal(result.consent[0].disclosure[0],'network name');
 assert.equal(result.modelCalls,5);assert.equal(result.agentCalls,3);
 assert.equal(result.truncated,false);
});
test('malicious accessor properties are never evaluated',()=>{
 let calls=0;
 const event={kind:'agent'};
 Object.defineProperty(event,'agent',{enumerable:true,get(){calls++;return canary;}});
 const contact={type:'intent'};
 Object.defineProperty(contact,'disclosure',{enumerable:true,get(){calls++;return [canary];}});
 const result=createSafeTraceReceipt({events:[event],contactEvents:[contact]});
 assert.equal(calls,0);
 assert.ok(!JSON.stringify(result).includes(canary));
});
test('bounded exporter truncates large public events and never copies arbitrary properties',()=>{
 const events=Array.from({length:700},(_,i)=>({id:'id'+i,kind:'agent',network:'n'.repeat(200),secret:canary}));
 const consent=Array.from({length:200},()=>({origin:'https://peer.example',purpose:'x'.repeat(400),result:canary,disclosure:['name']}));
 const out=createSafeTraceReceipt({events,contactEvents:consent});
 const text=serializeSafeTraceReceipt({events,contactEvents:consent});
 assert.equal(out.truncated,true);
 assert.ok(out.events.length<=128&&out.consent.length<=128);
 assert.ok(text.length<=65540);
 assert.ok(!text.includes(canary));
 assert.ok(out.events[0].network.length<=100);
 assert.ok(out.consent[0].purpose.length<=160);
});
test('partial and unknown outcomes remain distinct from completed or failed',()=>{
 const partial=createSafeTraceReceipt({outcome:'partial',events:[{kind:'tool',status:'failed'}],contactEvents:[]});
 const unknown=createSafeTraceReceipt({outcome:'unknown',events:[],contactEvents:[]});
 assert.equal(partial.outcome,'partial');
 assert.equal(unknown.outcome,'unknown');
 assert.notEqual(partial.outcome,'completed');assert.notEqual(partial.outcome,'failed');
 assert.notEqual(unknown.outcome,'completed');assert.notEqual(unknown.outcome,'failed');
});
test('refuses unsupported report modes, outcomes or non-array inputs',()=>{
 assert.throws(()=>createSafeTraceReceipt({mode:'secret-provider'}));
 assert.throws(()=>createSafeTraceReceipt({outcome:'unproven-success'}));
 assert.throws(()=>createSafeTraceReceipt({events:{privatePrompt:canary}}));
});
