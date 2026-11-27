import test from 'node:test';
import assert from 'node:assert/strict';
import {admitManifest,authorizeResearch,digest} from '../research-session.js';
import {runAutonomousResearch,verifyPassage} from '../research-supervisor.js';
const manifest=JSON.stringify({schema:'sutra-autonomous-research/v1',objective:'Compare battery storage costs',scope:{publicWeb:true,queryDisclosureAllowed:true,allowPrivateNetworks:false,allowAuthentication:false,allowExternalWrites:false,privateEvidenceDisclosureAllowed:false},budget:{maxSearches:3,maxDocuments:6,maxLinkDepth:1,maxDurationSeconds:60,maxDownloadBytes:5242880,maxCostMicros:100000},providers:[{id:'brave',estimatedMaxCostMicros:1000},{id:'tavily',estimatedMaxCostMicros:1000}]});
const grant=(extra={})=>authorizeResearch(manifest,{approvedPlanPin:admitManifest(manifest).planPin,approvePublicContact:true,approveEstimatedCost:true,...extra});
const envelope=s=>{const payload=JSON.stringify(s),pin=digest(payload);return {resumeText:JSON.stringify({schema:'sutra-checkpoint-envelope/v1',digest:pin,payload}),resumePin:pin};};
function fixture(){
 const calls=[],reads=[],providers={brave:{search:async q=>{calls.push(q);return [{url:'https://primary.org/a'}];}},tavily:{search:async q=>{calls.push(q);return [{url:'https://independent.org/b'}];}}};
 function reader(a){return async url=>{reads.push(url);a.reserve('document',{bytes:262144});const text=url.endsWith('/a')?'Battery storage costs fell.':'Battery storage costs rose in another region.';return {url,text,textDigest:digest(text),rawDigest:digest(text),links:[],mediaType:'text/plain'};};}
 return {calls,reads,providers,reader};
}
test('pause after a search, continue the retained frontier without repeating search or resetting budget',async()=>{
 const f=fixture(),a=grant();let saved;
 const first=await runAutonomousResearch({authorization:a,providers:f.providers,readDocument:f.reader(a),pauseAfterOperations:1,onCheckpoint:async s=>{saved=s;}});
 assert.equal(first.state,'paused');assert.equal(saved.phase,'documents');assert.equal(saved.pending,null);assert.equal(f.calls.length,1);assert.equal(f.reads.length,0);assert.equal(first.usage.searches,1);a.close();
 const resumed=grant(envelope(saved));try{
  assert.equal(resumed.usage().searches,1);assert.equal(resumed.expiresAt,saved.expiresAt);
  const second=await runAutonomousResearch({authorization:resumed,providers:f.providers,readDocument:f.reader(resumed),pauseAfterOperations:1,onCheckpoint:async s=>{saved=s;}});
  assert.equal(second.sessionId,first.sessionId);assert.equal(f.calls.length,1);assert.deepEqual(f.reads,['https://primary.org/a']);assert.equal(second.usage.documents,1);assert.ok(second.passages.every(p=>verifyPassage(p,second.documents[0])));
  await assert.rejects(runAutonomousResearch({authorization:resumed,providers:f.providers,readDocument:f.reader(resumed)}),/CONSUMED/);
 }finally{resumed.close();}
 const final=grant(envelope(saved));try{const result=await runAutonomousResearch({authorization:final,providers:f.providers,readDocument:f.reader(final)});assert.equal(result.state,'closed');assert.equal(f.calls.length,3);assert.equal(f.reads.filter(x=>x.endsWith('/a')).length,1);assert.equal(result.usage.reservedCostMicros,3000);assert.equal(result.documents.length,2);}finally{final.close();}
});
test('wrong digest, unknown dispatch, reset ledger, expired approval and closed state refuse',async()=>{
 const f=fixture(),a=grant();let saved;
 try{await runAutonomousResearch({authorization:a,providers:f.providers,readDocument:f.reader(a),pauseAfterOperations:1,onCheckpoint:async s=>{saved=s;}});}finally{a.close();}
 assert.throws(()=>grant({...envelope(saved),resumePin:'sha256:'+'0'.repeat(64)}),/RESUME_PIN/);
 assert.throws(()=>grant(envelope({...saved,pending:{state:'dispatch_unknown'}})),/RESUME_STATE/);
 assert.throws(()=>grant(envelope({...saved,state:'closed'})),/RESUME_STATE/);
 assert.throws(()=>grant(envelope({...saved,usage:{...saved.usage,reservedCostMicros:0}})),/RESUME_USAGE/);
 assert.throws(()=>grant({...envelope(saved),clock:()=>saved.expiresAt}),/INACTIVE/);
 assert.throws(()=>authorizeResearch(manifest,{approvedPlanPin:admitManifest(manifest).planPin,approvePublicContact:false,approveEstimatedCost:true,...envelope(saved)}),/APPROVAL/);
});
