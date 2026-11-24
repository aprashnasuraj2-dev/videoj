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

test('failure reason is a bounded stable code, not arbitrary private data',()=>{assert.equal(createSafeTraceReceipt({outcome:'partial',reason:'MODEL_LIMIT',modelCalls:4}).reason,'MODEL_LIMIT');assert.equal(createSafeTraceReceipt({outcome:'partial',reason:canary}).reason,null);});

test('trace array accessors, caller methods and nested disclosure getters never execute',()=>{
 let calls=0;
 const events=[{kind:'agent',agent:'learner'},{kind:'tool'}];
 Object.defineProperty(events,'1',{get(){calls++;return {kind:canary};}});
 Object.defineProperty(events,'slice',{value(){calls++;throw Error('must not execute');}});
 Object.defineProperty(events,'constructor',{get(){calls++;throw Error('must not execute');}});
 const labels=['network name','hidden'];
 Object.defineProperty(labels,'1',{get(){calls++;return canary;}});
 Object.defineProperty(labels,'slice',{value(){calls++;throw Error('must not execute');}});
 const contacts=[{type:'intent',disclosure:labels}];
 const out=createSafeTraceReceipt({events,contactEvents:contacts});
 assert.equal(calls,0);assert.deepEqual(out.events,[{kind:'agent',agent:'learner'}]);
 assert.deepEqual(out.consent,[{type:'intent',disclosure:['network name']}]);assert.equal(out.truncated,true);
 assert.doesNotMatch(JSON.stringify(out),new RegExp(canary));
 const top={};Object.defineProperty(top,'events',{get(){calls++;return events;}});
 assert.throws(()=>createSafeTraceReceipt(top),/own data/);assert.equal(calls,0);
});
test('the downloaded formatted UTF-8 report is bounded, even with non-ASCII public labels',()=>{
 const unicode='नेपाल😀'.repeat(80);
 const event={phase:unicode,kind:unicode,id:unicode,parent:unicode,status:unicode,agent:unicode,tool:unicode,network:unicode,origin:unicode};
 const contact={at:unicode,type:unicode,origin:unicode,contactKind:unicode,purpose:unicode,network:unicode,decision:unicode,scope:unicode,source:unicode,status:unicode,disclosure:Array(12).fill(unicode)};
 const input={events:Array(128).fill(event),contactEvents:Array(128).fill(contact),reason:'PEER_'+'A'.repeat(100000)};
 const text=serializeSafeTraceReceipt(input),bytes=new TextEncoder().encode(text),out=JSON.parse(text);
 assert.ok(bytes.length<=65536);assert.equal(out.truncated,true);assert.equal(out.reason,null);
 assert.ok(out.events.length&&out.consent.length);assert.ok(text.endsWith('\n'));
 assert.deepEqual(out,createSafeTraceReceipt(input));
});
