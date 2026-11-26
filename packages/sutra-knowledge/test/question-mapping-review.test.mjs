import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {reviewQuestionMapping,exportQuestionMappingReview,replayQuestionMappingReview,compareQuestionMappingReviews} from '../question-mapping-review.js';
async function fixture(){
 const question='Is current higher than prior?',text='A: 12; B: 10; C: 8;',type={kind:'currency_amount',unit:'USD',scope:'same_company',dimension:[0,0,0]};
 const c=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'source',lineage:'root',text}],bindings:[['a','12'],['b','10'],['c','8']].map(([id,v])=>({id,sourceId:'source',start:text.indexOf(v),end:text.indexOf(v)+v.length,type}))}));
 const planText=JSON.stringify({version:1,contractDigest:c.pin,left:{start:3,end:10,bindingIds:['a','c']},right:{start:23,end:28,bindingIds:['b']}});
 return {contractText:c.contractText,contractPin:c.pin,planText,planPin:await casePin(planText)};
}
async function run(f,choices){const reviewText=JSON.stringify({version:1,contractPin:f.contractPin,planPin:f.planPin,choices});return reviewQuestionMapping({...f,reviewText,reviewPin:await casePin(reviewText)});}
test('partial human review preserves opposite results and unresolved alternatives',async()=>{
 const f=await fixture(),r=await run(f,[{id:'question_1',judgment:'plausible'}]);
 assert.equal(r.status,'REVIEW_INCOMPLETE');assert.equal(r.rows.length,2);assert.equal(r.rows[1].judgment,'unresolved');assert.notEqual(r.rows[0].conditionalState,r.rows[1].conditionalState);
 const complete=await run(f,[{id:'question_1',judgment:'plausible'},{id:'question_2',judgment:'excluded'}]);assert.equal(complete.status,'ONE_DECLARED_PLAUSIBLE');assert.equal(complete.semanticInterpretation,'UNVERIFIED');assert.equal(complete.rows.length,2);
});
test('unknown, duplicated, or forged review choices refuse',async()=>{
 const f=await fixture();for(const choices of [[{id:'unknown',judgment:'plausible'}],[{id:'question_1',judgment:'verified'}],[{id:'question_1',judgment:'plausible'},{id:'question_1',judgment:'excluded'}]])await assert.rejects(run(f,choices),/MAPPING_REVIEW_CHOICE/);
});


test('portable mapping review requires all independently retained pins and recomputes the complete result',async()=>{
 const f=await fixture(),reviewText=JSON.stringify({version:1,contractPin:f.contractPin,planPin:f.planPin,choices:[{id:'question_1',judgment:'plausible'}]}),reviewPin=await casePin(reviewText);
 const x=await exportQuestionMappingReview({...f,reviewText,reviewPin}),args={snapshotText:x.snapshotText,snapshotPin:x.snapshotPin,expectedContractPin:f.contractPin,expectedPlanPin:f.planPin,expectedReviewPin:reviewPin};
 assert.deepEqual(await replayQuestionMappingReview(args),x.result);
 await assert.rejects(replayQuestionMappingReview({...args,expectedReviewPin:'sha256:'+'0'.repeat(64)}),/MAPPING_REVIEW_SNAPSHOT_INPUT_PINS/);
 const mutant=JSON.parse(x.snapshotText);mutant.result.rows[1].judgment='excluded';const snapshotText=JSON.stringify(mutant);
 await assert.rejects(replayQuestionMappingReview({...args,snapshotText,snapshotPin:await casePin(snapshotText)}),/MAPPING_REVIEW_REPLAY_DIVERGENCE/);
 const stale=JSON.parse(x.snapshotText);stale.reviewText=JSON.stringify({...JSON.parse(reviewText),choices:[]});stale.reviewPin=await casePin(stale.reviewText);const staleText=JSON.stringify(stale);
 await assert.rejects(replayQuestionMappingReview({...args,snapshotText:staleText,snapshotPin:await casePin(staleText)}),/MAPPING_REVIEW_SNAPSHOT_INPUT_PINS/);
});

async function saved(f,choices){const reviewText=JSON.stringify({version:1,contractPin:f.contractPin,planPin:f.planPin,choices}),reviewPin=await casePin(reviewText),x=await exportQuestionMappingReview({...f,reviewText,reviewPin});return {snapshotText:x.snapshotText,snapshotPin:x.snapshotPin,expectedContractPin:f.contractPin,expectedPlanPin:f.planPin,expectedReviewPin:reviewPin};}
test('review revisions do not transfer judgment through renumbered mapping or changed pinned plan',async()=>{
 const f=await fixture(),old=await saved(f,[{id:'question_1',judgment:'plausible'},{id:'question_2',judgment:'excluded'}]);
 const same=await saved(f,[{id:'question_1',judgment:'excluded'},{id:'question_2',judgment:'excluded'}]);
 const delta=await compareQuestionMappingReviews({before:old,after:same});assert.equal(delta.sameInputs,true);assert.deepEqual(delta.changes.map(x=>x.status),['JUDGMENT_CHANGED','UNCHANGED_DECLARATION']);
 const p=JSON.parse(f.planText);p.left.bindingIds=['c'];const planText=JSON.stringify(p),g={...f,planText,planPin:await casePin(planText)};
 const newer=await saved(g,[]),r=await compareQuestionMappingReviews({before:old,after:newer});assert.equal(r.sameInputs,false);assert.equal(r.changes[0].status,'REMOVED_MAPPING');assert.equal(r.changes[1].status,'REVIEW_CONTEXT_CHANGED');assert.equal(r.changes[1].before.id,'question_2');assert.equal(r.changes[1].after.id,'question_1');assert.equal(r.changes[1].after.judgment,'unresolved');assert.ok(r.changes.every(x=>x.reviewRequired));assert.equal(r.decisionAuthority,'NONE');
});

import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('independent Python finite grammar and review replay rejects self-repinned forged judgment',async()=>{
 const f=await fixture(),cases=[];
 for(const [id,choices] of [['unresolved',[]],['one',[{id:'question_1',judgment:'plausible'},{id:'question_2',judgment:'excluded'}]],['both',[{id:'question_1',judgment:'plausible'},{id:'question_2',judgment:'plausible'}]],['none',[{id:'question_1',judgment:'excluded'},{id:'question_2',judgment:'excluded'}]]]){
  const x=await saved(f,choices);cases.push({id,...x,expected:true});
 }
 const old=cases[1],changed=JSON.parse(old.snapshotText);changed.result.rows[1].judgment='plausible';const forged=JSON.stringify(changed);
 cases.push({id:'repinned_result',...old,snapshotText:forged,snapshotPin:await casePin(forged),expected:false});
 cases.push({id:'stale_review_pin',...old,expectedReviewPin:'sha256:'+'0'.repeat(64),expected:false});
 const duplicate=JSON.parse(old.snapshotText);duplicate.reviewText=JSON.stringify({version:1,contractPin:f.contractPin,planPin:f.planPin,choices:[{id:'question_1',judgment:'plausible'},{id:'question_1',judgment:'excluded'}]});duplicate.reviewPin=await casePin(duplicate.reviewText);const bad=JSON.stringify(duplicate);
 cases.push({id:'duplicate_judgment',...old,snapshotText:bad,snapshotPin:await casePin(bad),expectedReviewPin:duplicate.reviewPin,expected:false});
 const p=spawnSync('python3',[fileURLToPath(new URL('../reference/verify_question_mapping_review.py',import.meta.url))],{input:JSON.stringify(cases),encoding:'utf8',timeout:30000,maxBuffer:1048576});
 assert.equal(p.status,0,p.stderr||p.stdout||String(p.error));const r=JSON.parse(p.stdout);assert.equal(r.cases.filter(c=>c.accepted).length,4);assert.equal(r.cases.length,7);
});
