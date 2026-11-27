import test from 'node:test';
import assert from 'node:assert/strict';
import {admitDocumentURL} from '../dynamic-public-route-policy.js';
import {admitManifest,authorizeResearch} from '../research-session.js';
import {createDocumentReader} from '../document-reader.js';
function grant(scope={}){
 const p={schema:'sutra-autonomous-research/v1',objective:'Compare battery storage costs',scope:{publicWeb:true,queryDisclosureAllowed:true,allowPrivateNetworks:false,allowAuthentication:false,allowExternalWrites:false,privateEvidenceDisclosureAllowed:false,...scope},budget:{maxSearches:2,maxDocuments:5,maxLinkDepth:1,maxDurationSeconds:60,maxDownloadBytes:5242880,maxCostMicros:10000},providers:[{id:'brave',estimatedMaxCostMicros:1000}]};const raw=JSON.stringify(p);
 return authorizeResearch(raw,{approvedPlanPin:admitManifest(raw).planPin,approvePublicContact:true,approveEstimatedCost:true});
}
test('query admission is opt-in, allowlisted, canonical and strips tracking',()=>{
 const url='https://public.org/report?id=123&utm_source=tracking#ref';
 assert.throws(()=>admitDocumentURL(url),/URL/);assert.equal(admitDocumentURL(url,{allowQuery:true}),'https://public.org/report?id=123');
 for(const q of ['token=abc','id=1&id=2','id=https%3A%2F%2Fprivate.org','id=abc%40example.com','redirect=localhost','id='+ 'A'.repeat(45)])assert.throws(()=>admitDocumentURL('https://public.org/?'+q,{allowQuery:true}),/QUERY_PARAMETERS/);
});
test('each redirect is re-admitted, robots-checked and charged; final provenance retained',async()=>{
 const a=grant({allowRedirects:true,allowPublicQueryParameters:true}),calls=[];
 try{
  const read=createDocumentReader({authorization:a,minIntervalMs:0,transport:async o=>{calls.push(o.url.href);if(o.url.pathname==='/robots.txt')return {status:404,body:Buffer.alloc(0)};if(o.url.pathname==='/start')return {status:302,location:'https://other.org/final?id=123'};return {status:200,mediaType:'text/plain',body:Buffer.from('Battery storage costs fell.')};}});
  const d=await read('https://public.org/start');assert.equal(d.url,'https://public.org/start');assert.equal(d.finalUrl,'https://other.org/final?id=123');assert.equal(d.redirectChain.length,1);
  assert.deepEqual(calls,['https://public.org/robots.txt','https://public.org/start','https://other.org/robots.txt','https://other.org/final?id=123']);assert.equal(a.usage().documents,2);assert.equal(a.usage().reservedBytes,2*262144+2*65536);
 }finally{a.close();}
});
test('private redirect and redirect without authorization never cause second document contact',async()=>{
 for(const scope of [{allowRedirects:true},{}]){
  const a=grant(scope),calls=[];
  try{
   const read=createDocumentReader({authorization:a,minIntervalMs:0,transport:async o=>{calls.push(o.url.href);return o.url.pathname==='/robots.txt'?{status:404,body:Buffer.alloc(0)}:{status:302,location:'https://127.0.0.1/private'};}});
   await assert.rejects(read('https://public.org/start'));assert.equal(calls.length,2);
  }finally{a.close();}
 }
});
test('robots denial at redirected destination prevents document contact',async()=>{
 const a=grant({allowRedirects:true}),calls=[];
 try{
  const read=createDocumentReader({authorization:a,minIntervalMs:0,transport:async o=>{calls.push(o.url.href);if(o.url.hostname==='other.org')return {status:200,mediaType:'text/plain',body:Buffer.from('User-agent: *\nDisallow: /private')};if(o.url.pathname==='/robots.txt')return {status:404};return {status:302,location:'https://other.org/private'};}});
  await assert.rejects(read('https://public.org/start'),/ROBOTS/);assert.ok(!calls.includes('https://other.org/private'));
 }finally{a.close();}
});
