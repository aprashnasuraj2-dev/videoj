import test from 'node:test';
import assert from 'node:assert/strict';
import {handleInference} from '../inference.js';
import {InferenceQuota} from '../quota.js';

function storage(){
 let value,tail=Promise.resolve();
 return {async transaction(fn){
  let release;const previous=tail;tail=new Promise(resolve=>{release=resolve;});
  await previous;
  try{const tx={get:async()=>structuredClone(value),put:async(_,v)=>{value=structuredClone(v);}};return await fn(tx);}
  finally{release();}
 },inspect:()=>structuredClone(value)};
}
const sse=text=>new Response(`data: ${JSON.stringify({choices:[{index:0,delta:{content:text},finish_reason:null}]})}\n\ndata: ${JSON.stringify({choices:[{index:0,delta:{},finish_reason:'stop'}]})}\n\ndata: [DONE]\n\n`,{headers:{'Content-Type':'text/event-stream'}});
const request=(i)=>new Request('https://sutra.test/api/infer',{method:'POST',headers:{
 'Content-Type':'application/json','Origin':'https://sutra.test','CF-Connecting-IP':`192.0.2.${i+1}`
},body:JSON.stringify({model:'operator-approved',messages:[{role:'user',content:`LOAD_SESSION_CANARY_${String(i).padStart(2,'0')}`}],tools:[],stream:true})});

test('20-session local lab preserves prompt isolation and enforces four active provider leases without retries',async()=>{
 const store=storage();
 const quota=new InferenceQuota({storage:store},{SUTRA_MAX_DAILY_CALLS:'40',SUTRA_MAX_CLIENT_CALLS:'2',SUTRA_MAX_CONCURRENT:'4'});
 const fetcher={fetch:(url,opts)=>quota.fetch(new Request(url,opts))};
 const env={
  SUTRA_ENABLE_INFERENCE:'true',SUTRA_PROVIDER_KEY:'SERVER_LOAD_TEST_KEY',
  SUTRA_CLIENT_HASH_SECRET:'c'.repeat(32),SUTRA_ALLOWED_ORIGIN:'https://sutra.test',
  SUTRA_MODELS:'operator-approved',SUTRA_MAX_OUTPUT_TOKENS:'512',SUTRA_MAX_CONCURRENT:'4',
  SUTRA_QUOTA:{idFromName:x=>x,get:()=>fetcher}
 };
 const bodies=[],providerCalls=new Map();
 const fetchImpl=async(url,opts)=>{
  const body=JSON.parse(opts.body);bodies.push(body);
  const canaries=body.messages.flatMap(m=>String(m.content??'').match(/LOAD_SESSION_CANARY_\d{2}/g)??[]);
  assert.equal(canaries.length,1,'provider payload must contain exactly one session canary');
  providerCalls.set(canaries[0],(providerCalls.get(canaries[0])??0)+1);
  return sse('synthetic load response for '+canaries[0]);
 };
 const responses=await Promise.all(Array.from({length:20},(_,i)=>handleInference(request(i),env,{fetchImpl})));
 const statuses=responses.map(r=>r.status);
 assert.equal(statuses.filter(x=>x===200).length,4,'active provider work is capped at four; statuses='+JSON.stringify(statuses));
 assert.equal(statuses.filter(x=>x===429).length,16,'excess simultaneous sessions are rejected instead of queued or retried');
 assert.equal(bodies.length,4);
 assert.equal(providerCalls.size,4);
 assert.ok([...providerCalls.values()].every(count=>count===1),'no automatic provider retries');
 for(let i=0;i<bodies.length;i++){
  const text=JSON.stringify(bodies[i]);
  const matches=text.match(/LOAD_SESSION_CANARY_\d{2}/g)??[];
  assert.equal(new Set(matches).size,1,'one session payload cannot contain another session canary');
  assert.ok(!text.includes('SERVER_LOAD_TEST_KEY'));
 }
 await Promise.all(responses.filter(r=>r.status===200).map(r=>r.text()));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(Object.keys(store.inspect().active??{}).length,0,'all active leases release after streams are consumed');
 assert.equal(store.inspect().total,4,'rejected concurrency requests do not consume daily reservations');
 console.log('LAB: 20 simultaneous synthetic direct-handler sessions -> 4 accepted, 16 concurrency-limited, 4 provider calls, 0 retries, 0 cross-session canary leakage. This is not staging or internet-scale capacity.');
});
