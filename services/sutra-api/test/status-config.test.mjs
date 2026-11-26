import test from 'node:test';import assert from 'node:assert/strict';import worker from '../worker.js';import {configuredModels,inferenceStatus,inferenceContractId} from '../inference.js';
const env={SUTRA_ENABLE_INFERENCE:'true',SUTRA_INFERENCE_BACKEND:'hosted',SUTRA_MODELS:'approved-one,approved-two',SUTRA_PROVIDER_KEY:'SERVER_ONLY_TEST_KEY',SUTRA_CLIENT_HASH_SECRET:'x'.repeat(32),SUTRA_ALLOWED_ORIGIN:'https://sutra.test',SUTRA_MAX_OUTPUT_TOKENS:'512',SUTRA_MAX_DAILY_CALLS:'100',SUTRA_MAX_CLIENT_CALLS:'8',SUTRA_MAX_CONCURRENT:'2',SUTRA_CONTENT_VERSION:'synthetic-timing-v1',SUTRA_CONTENT_MODE:'synthetic',SUTRA_CATALOG_SHA256:'a12d95aab97bbc047a2b88d73f4814072c48c3f2e55adeb0381a7b8d36c45333',SUTRA_TRANSCRIPT_SHA256:'a1930687d25bfe7fe8f2483c55d1aca83cdc3f4dcc39424dd6569aea9fe9660d',SUTRA_QUOTA:{}};
test('status discloses only configured default model, never key or secret',async()=>{const r=await worker.fetch(new Request('https://sutra.test/api/status'),env);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{inference:'configured',model:'approved-one',routerBase:'/api/v1',publisherFunded:true,byok:false,backend:'hosted',inferenceContractId:await inferenceContractId(env),sourceTools:'catalog',webResearch:'disabled',content:{mode:'synthetic',contentVersion:'synthetic-timing-v1',catalogSha256:'a12d95aab97bbc047a2b88d73f4814072c48c3f2e55adeb0381a7b8d36c45333',primarySourceId:'synthetic-timing-fixture'},factualTruth:'unverified'});});
test('malformed/duplicate/placeholder models fail closed without throwing',async()=>{for(const models of [undefined,12,'','bad model','mock-1','a,a','a,b,c,d']){const bad={...env,SUTRA_MODELS:models};assert.deepEqual(configuredModels(bad),[]);assert.equal(inferenceStatus(bad),false);const status=await worker.fetch(new Request('https://sutra.test/api/status'),bad);assert.deepEqual(await status.json(),{inference:'disabled',sourceTools:'catalog',webResearch:'disabled',content:{mode:'synthetic',contentVersion:'synthetic-timing-v1',catalogSha256:'a12d95aab97bbc047a2b88d73f4814072c48c3f2e55adeb0381a7b8d36c45333',primarySourceId:'synthetic-timing-fixture'},factualTruth:'unverified'});}});

test('snapshot-aware inference and source tools reject stale or malformed catalog before quota or upstream',async()=>{
 const origin='https://sutra.test',active='a12d95aab97bbc047a2b88d73f4814072c48c3f2e55adeb0381a7b8d36c45333';
 let quotaTouches=0;const guarded={...env,SUTRA_QUOTA:{idFromName(){quotaTouches++;throw Error('stale request reached quota');}}};
 for(const path of ['/api/infer','/api/v1/chat/completions','/api/source-tools']){
  for(const version of ['f'.repeat(64),'bad','']){
   const response=await worker.fetch(new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Sutra-Catalog-Sha256':version},body:'{}'}),guarded);
   assert.equal(response.status,409);assert.deepEqual(await response.json(),{error:{code:'CONTENT_VERSION_MISMATCH'}});assert.equal(response.headers.get('cache-control'),'no-store');
  }
 }
 assert.equal(quotaTouches,0);
 for(const version of [active,null]){
  const headers={Origin:origin,'Content-Type':'application/json'};
  if(version!==null)headers['X-Sutra-Catalog-Sha256']=version;
  const response=await worker.fetch(new Request(origin+'/api/source-tools',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{}})}),guarded);
  assert.equal(response.status,200);assert.ok((await response.json()).result.tools.length>0);
 }
});
