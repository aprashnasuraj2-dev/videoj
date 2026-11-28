import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {exportInducedQuestion,replayInducedQuestion} from '../alias-intent-artifact.js';
const verifier=fileURLToPath(new URL('../reference/verify_alias_intent.py',import.meta.url));
async function fixture(question,aliases){
 const {contractText,pin:contractPin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'record',lineage:'synthetic',text:'100; 120; 15;'}],bindings:[['prior',0,3],['now',5,8],['limit',10,12]].map(([id,start,end])=>({id,sourceId:'record',start,end,type:{kind:'currency_amount',unit:'USD',scope:'same_company',dimension:[0,0,0]}}))}));
 const catalogText=JSON.stringify({version:1,contractDigest:contractPin,aliases});
 return {contractText,contractPin,catalogText,catalogPin:await casePin(catalogText)};
}
const defaults=['prior','now','limit'].map(alias=>({alias,bindingIds:[alias]}));
function reference(a,x){
 return spawnSync('python3',[verifier,a.artifactPin,x.contractPin,x.catalogPin],{input:a.artifactText,encoding:'utf8',timeout:10000,maxBuffer:262144});
}
test('portable reconstruction agrees with independent Python on five states including Unicode spans',async()=>{
 const rows=[
 ['Is now greater than prior?',defaults,'UNREVIEWED_PLAN'],
 ['Is 𐐀 current not greater than 前期?',[{alias:'𐐀 current',bindingIds:['now']},{alias:'前期',bindingIds:['prior']}],'UNREVIEWED_PLAN'],
 ['Is revenue greater than prior?',defaults,'UNRESOLVED_BINDING'],
 ['Is now greater than prior and limit?',defaults,'UNSUPPORTED_GRAMMAR'],
 ['Is the change from prior to now greater than limit?',defaults.map(a=>({...a,bindingIds:['prior','now','limit']})),'CANDIDATE_LIMIT']
 ];
 for(const [q,aliases,state] of rows){
  const x=await fixture(q,aliases),a=await exportInducedQuestion(x);
  const r=await replayInducedQuestion({...a,expectedContractPin:x.contractPin,expectedCatalogPin:x.catalogPin});
  assert.equal(r.preview.state,state);assert.equal(r.decisionAuthority,'NONE');
  const py=reference(a,x);assert.equal(py.status,0,py.stderr);assert.equal(JSON.parse(py.stdout).state,state);
 }
});
test('self-repinned forged preview, authority and stale input pins refuse in both implementations',async()=>{
 const x=await fixture('Is now greater than prior?',defaults),a=await exportInducedQuestion(x);
 for(const alter of [p=>{p.preview.decisionAuthority='APPROVED'},p=>{p.preview.candidateCount=3},p=>{p.preview.candidateCount=true},p=>{p.preview.reviewRequired=1},p=>{p.preview.originalQuestion='Is now less than prior?'}]){
  const v=JSON.parse(a.artifactText);alter(v);const artifactText=JSON.stringify(v),artifactPin=await casePin(artifactText);
  const forged={artifactText,artifactPin};
  await assert.rejects(replayInducedQuestion({...forged,expectedContractPin:x.contractPin,expectedCatalogPin:x.catalogPin}),/PREVIEW_MISMATCH/);
  assert.equal(reference(forged,x).status,1);
 }
 await assert.rejects(replayInducedQuestion({...a,expectedContractPin:'sha256:'+'0'.repeat(64),expectedCatalogPin:x.catalogPin}),/EXPECTED_INPUTS/);
 assert.equal(reference(a,{...x,contractPin:'sha256:'+'0'.repeat(64)}).status,1);
});
