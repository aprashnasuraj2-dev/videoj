import test from 'node:test';
import assert from 'node:assert/strict';
import {handleWebResearch} from '../web-research.js';
import {inferenceContractId,inferenceStatus} from '../inference.js';
import {webResearchConfig} from '../web-research-config.js';

function quota(reply=200){
 const paths=[];
 return {
  paths,
  binding:{
   idFromName(name){assert.equal(name,'sutra-inference-global-v1');return 'global';},
   get(id){assert.equal(id,'global');return {async fetch(url){paths.push(new URL(url).pathname);return reply===200?Response.json({allowed:true}):new Response('',{status:reply});}};}
  }
 };
}
function environment(q=quota()){
 return {
  SUTRA_ENABLE_INFERENCE:'true',
  SUTRA_INFERENCE_BACKEND:'hosted',
  SUTRA_PROVIDER_KEY:'provider-fixture',
  SUTRA_ALLOWED_ORIGIN:'https://sutra.test',
  SUTRA_MODELS:'gpt-fixture',
  SUTRA_MAX_OUTPUT_TOKENS:'512',
  SUTRA_MAX_DAILY_CALLS:'20',
  SUTRA_MAX_CLIENT_CALLS:'8',
  SUTRA_MAX_CONCURRENT:'2',
  SUTRA_CLIENT_HASH_SECRET:'c'.repeat(40),
  SUTRA_ENABLE_WEB_RESEARCH:'true',
  SUTRA_WEB_PROVIDER:'firecrawl',
  SUTRA_FIRECRAWL_API_KEY:'firecrawl-fixture-key',
  SUTRA_WEB_TOKEN_SECRET:'w'.repeat(40),
  SUTRA_MAX_DAILY_WEB_REQUESTS:'8',
  SUTRA_MAX_CLIENT_WEB_REQUESTS:'4',
  SUTRA_QUOTA:q.binding,
  _quota:q
 };
}
async function request(env,path,body,{ip='203.0.113.8',contract}={}){
 const id=contract??await inferenceContractId(env);
 return new Request('https://sutra.test'+path,{method:'POST',headers:{
  Origin:'https://sutra.test','Content-Type':'application/json','CF-Connecting-IP':ip,'X-Sutra-Inference-Contract':id
 },body:JSON.stringify(body)});
}
const source='https://example.org/article';
function provider(){
 const calls=[];
 const fetchImpl=async(url,init)=>{
  calls.push({url,init});
  assert.equal(init.redirect,'manual');assert.equal(init.credentials,'omit');
  assert.equal(init.headers.Authorization,'Bearer firecrawl-fixture-key');
  if(url.endsWith('/v2/search'))return Response.json({success:true,data:{web:[{url:source,title:'Independent source',description:'Discovery lead only'}]}});
  if(url.endsWith('/v2/scrape'))return Response.json({success:true,data:{markdown:'This retrieved passage is an unverified source claim.',metadata:{sourceURL:source,url:source,statusCode:200}}});
  throw Error('unexpected provider path');
 };
 return {calls,fetchImpl};
}

test('web research is fail-closed when explicitly enabled without complete secrets or bounded quota',()=>{
 const env=environment();assert.equal(inferenceStatus(env),true);assert.equal(webResearchConfig(env)?.provider,'firecrawl');
 for(const key of ['SUTRA_WEB_TOKEN_SECRET','SUTRA_FIRECRAWL_API_KEY','SUTRA_QUOTA']){
  const broken={...env};delete broken[key];assert.equal(webResearchConfig(broken),null);assert.equal(inferenceStatus(broken),false,key);
 }
 const bad={...env,SUTRA_MAX_CLIENT_WEB_REQUESTS:'9'};assert.equal(webResearchConfig(bad),null);assert.equal(inferenceStatus(bad),false);
});

test('search issues a short-lived opaque read grant and read uses only its admitted URL',async()=>{
 const env=environment(),p=provider();
 const search=await handleWebResearch(await request(env,'/api/web/search',{query:'unseen learning question'}),env,{fetchImpl:p.fetchImpl,clock:()=>1000});
 assert.equal(search.status,200);const discovery=await search.json();
 assert.equal(discovery.status,'discovery_only');assert.equal(discovery.truthStatus,'unverified');assert.equal(discovery.sources.length,1);
 assert.equal(discovery.sources[0].url,source);assert.ok(typeof discovery.sources[0].token==='string'&&discovery.sources[0].token.length>40);
 assert.deepEqual(env._quota.paths,['/web-request']);
 const read=await handleWebResearch(await request(env,'/api/web/read',{token:discovery.sources[0].token}),env,{fetchImpl:p.fetchImpl,clock:()=>2000});
 assert.equal(read.status,200);const evidence=await read.json();
 assert.deepEqual({status:evidence.status,truthStatus:evidence.truthStatus,url:evidence.url},{status:'source_claim',truthStatus:'unverified',url:source});
 assert.match(evidence.text,/unverified source claim/);
 assert.deepEqual(env._quota.paths,['/web-request','/web-request']);
 assert.deepEqual(p.calls.map(x=>x.url),['https://api.firecrawl.dev/v2/search','https://api.firecrawl.dev/v2/scrape']);
});

test('forged, expired and cross-client read grants fail before quota or provider contact',async()=>{
 const env=environment(),p=provider();
 const search=await handleWebResearch(await request(env,'/api/web/search',{query:'bounded evidence'}),env,{fetchImpl:p.fetchImpl,clock:()=>5000});
 const token=(await search.json()).sources[0].token;const initialQuota=env._quota.paths.length,initialCalls=p.calls.length;
 const forged=token.slice(0,-1)+(token.endsWith('A')?'B':'A');
 for(const [candidate,ip,now] of [[forged,'203.0.113.8',6000],[token,'203.0.113.9',6000],[token,'203.0.113.8',125001]]){
  const response=await handleWebResearch(await request(env,'/api/web/read',{token:candidate},{ip}),env,{fetchImpl:p.fetchImpl,clock:()=>now});
  assert.equal(response.status,403);
 }
 assert.equal(env._quota.paths.length,initialQuota);assert.equal(p.calls.length,initialCalls);
});

test('quota denial and provider rejection never become discovery or evidence',async()=>{
 const q=quota(429),env=environment(q),p=provider();
 const denied=await handleWebResearch(await request(env,'/api/web/search',{query:'budgeted question'}),env,{fetchImpl:p.fetchImpl});
 assert.equal(denied.status,429);assert.equal(p.calls.length,0);assert.deepEqual(q.paths,['/web-request']);

 const env2=environment(),contacts=[];
 const redirected=await handleWebResearch(await request(env2,'/api/web/search',{query:'redirect attack'}),env2,{fetchImpl:async(url,init)=>{
  contacts.push(url);assert.equal(init.redirect,'manual');return new Response('do not follow',{status:302,headers:{Location:'https://evil.example/steal'}});
 }});
 assert.equal(redirected.status,502);assert.equal(contacts.length,1);
 const body=await redirected.text();assert.doesNotMatch(body,/evil|do not follow|firecrawl/i);
});

test('stale inference contract rejects web contact before quota and provider work',async()=>{
 const env=environment(),p=provider();
 const response=await handleWebResearch(await request(env,'/api/web/search',{query:'question'},{contract:'0'.repeat(64)}),env,{fetchImpl:p.fetchImpl});
 assert.equal(response.status,409);assert.equal(env._quota.paths.length,0);assert.equal(p.calls.length,0);
});
