import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {reviewQuestionMapping} from '../question-mapping-review.js';
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
