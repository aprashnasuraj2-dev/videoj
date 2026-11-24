import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runNetwork} from '../../../packages/sutra-runtime/index.js';
import {createProviderAdapter} from '../../../packages/sutra-inference/client.js';
import {handleInference,UPSTREAM} from '../inference.js';

const graph=JSON.parse(fs.readFileSync(new URL('../../../packages/sutra-runtime/examples/learner.network.json',import.meta.url)));
const encode=items=>new Response(items.map(item=>'data: '+JSON.stringify(item)+'\n\n').join('')+'data: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
const chunk=(delta,finish=null)=>({choices:[{index:0,delta,finish_reason:finish}]});
function upstreamFor(body){
 const hasToolResult=body.messages.some(message=>message.role==='tool');
 if(body.tools.length&&!hasToolResult){
  return encode([chunk({tool_calls:[{index:0,id:'call-evidence',type:'function',function:{name:'evidence',arguments:'{"request":"Inspect synthetic evidence."}'}}]},'tool_calls')]);
 }
 if(!body.tools.length)return encode([chunk({content:'Synthetic provider evidence helper: catalog consistency only.'},null),chunk({},'stop')]);
 return encode([chunk({content:'Synthetic provider learner completed after evidence delegation. No factual truth is claimed.'},null),chunk({},'stop')]);
}
function environment(events){
 let lease=0;
 return {
  SUTRA_ENABLE_INFERENCE:'true',SUTRA_PROVIDER_KEY:'SERVER_ONLY_INTEGRATION_KEY',
  SUTRA_CLIENT_HASH_SECRET:'b'.repeat(32),SUTRA_ALLOWED_ORIGIN:'https://sutra.test',
  SUTRA_MODELS:'operator-approved',SUTRA_MAX_OUTPUT_TOKENS:'512',SUTRA_MAX_DAILY_CALLS:'100',SUTRA_MAX_CLIENT_CALLS:'8',SUTRA_MAX_CONCURRENT:'2',
  SUTRA_QUOTA:{idFromName:x=>x,get:()=>({fetch:async(url,opts)=>{
   const path=new URL(url).pathname;events.push({kind:'quota',path});
   if(path==='/release')return Response.json({released:true});
   lease++;return Response.json({allowed:true,lease:'00000000-0000-4000-8000-'+String(lease).padStart(12,'0')});
  }})}
 };
}

test('real provider adapter contract drives multi-agent runtime through same-origin proxy without exposing server key',async()=>{
 const events=[],env=environment(events),upstreamModels=[];
 const adapter=createProviderAdapter({
  origin:'https://sutra.test',model:'operator-approved',
  fetchImpl:async(url,opts)=>{
   assert.equal(url,'https://sutra.test/api/infer');
   assert.equal(opts.credentials,'same-origin');assert.equal(opts.redirect,'error');
   assert.equal(opts.headers.Authorization,undefined);
   return handleInference(new Request(url,{...opts,headers:{...opts.headers,Origin:'https://sutra.test','CF-Connecting-IP':'192.0.2.44'}}),env,{
    fetchImpl:async(upstreamUrl,upstreamOpts)=>{
     assert.equal(upstreamUrl,UPSTREAM);
     assert.equal(upstreamOpts.headers.Authorization,'Bearer SERVER_ONLY_INTEGRATION_KEY');
     const body=JSON.parse(upstreamOpts.body);upstreamModels.push(body.model);
     assert.ok(!JSON.stringify(body).includes('SERVER_ONLY_INTEGRATION_KEY'));
     return upstreamFor(body);
    }
   });
  }
 });
 assert.equal(adapter.mode,'provider');assert.equal(adapter.approvedModel,'operator-approved');
 const result=await runNetwork({definition:graph,request:'Inspect synthetic source consistency.',model:adapter});
 assert.equal(result.mode,'provider');assert.equal(result.agentCalls,2);assert.equal(result.modelCalls,3);
 assert.match(result.text,/completed after evidence delegation/);
 assert.deepEqual(upstreamModels,['operator-approved','operator-approved','operator-approved']);
 assert.deepEqual(events.map(e=>e.path),['/reserve','/release','/reserve','/release','/reserve','/release']);
 assert.ok(!JSON.stringify(result).includes('SERVER_ONLY_INTEGRATION_KEY'));
});


test('network loss during delegated provider run fails incomplete and only explicit fresh retry succeeds',async()=>{
 const events=[],env=environment(events);let clientCalls=0;
 const flaky=createProviderAdapter({
  origin:'https://sutra.test',model:'operator-approved',
  fetchImpl:async(url,opts)=>{
   clientCalls++;
   if(clientCalls===2)throw new TypeError('synthetic caller-to-proxy network loss');
   return handleInference(new Request(url,{...opts,headers:{...opts.headers,Origin:'https://sutra.test','CF-Connecting-IP':'192.0.2.45'}}),env,{
    fetchImpl:async(upstreamUrl,upstreamOpts)=>upstreamFor(JSON.parse(upstreamOpts.body))
   });
  }
 });
 await assert.rejects(runNetwork({definition:graph,request:'Inspect synthetic source consistency.',model:flaky}),error=>error.code==='PROVIDER_TRANSPORT'&&error.diagnostics.modelCalls===2&&error.diagnostics.completedModelCalls===1);
 assert.equal(clientCalls,2);
 assert.equal(events.filter(e=>e.kind==='quota'&&e.path==='/reserve').length,1,'failed second client transport cannot reserve or spend');

 const retryEvents=[],retryEnv=environment(retryEvents);
 const working=createProviderAdapter({
  origin:'https://sutra.test',model:'operator-approved',
  fetchImpl:async(url,opts)=>handleInference(new Request(url,{...opts,headers:{...opts.headers,Origin:'https://sutra.test','CF-Connecting-IP':'192.0.2.46'}}),retryEnv,{
   fetchImpl:async(upstreamUrl,upstreamOpts)=>upstreamFor(JSON.parse(upstreamOpts.body))
  })
 });
 const result=await runNetwork({definition:graph,request:'Inspect synthetic source consistency.',model:working});
 assert.match(result.text,/completed after evidence delegation/);
 assert.equal(result.modelCalls,3);
 assert.equal(retryEvents.filter(e=>e.kind==='quota'&&e.path==='/reserve').length,3);
});
