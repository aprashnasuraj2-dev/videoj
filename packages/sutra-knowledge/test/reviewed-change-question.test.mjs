import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedQuestion,exportReviewedQuestion} from '../reviewed-question.js';
async function fixture(q,prior='100',now='120'){
 let text='';const bindings=[];
 for(const [id,value,kind,unit] of [['prior',prior,'currency_amount','USD'],['now',now,'currency_amount','USD'],['amount','15','currency_amount','USD'],['fraction','1/4','ratio','one']]){
  text+=id+': ';const start=text.length;text+=value;bindings.push({id,sourceId:'record',start,end:text.length,type:{kind,unit,scope:'same_company',dimension:[0,0,0]}});text+='; ';
 }
 const x=await sealReviewedDraft(JSON.stringify({version:1,question:q,sources:[{id:'record',lineage:'synthetic',text}],bindings}));
 const op=(alias,bindingIds)=>({start:q.indexOf(alias),end:q.indexOf(alias)+alias.length,bindingIds});
 return {...x,plan:{version:2,contractDigest:x.pin,baseline:op('前期',['prior']),current:op('𐐀 current',['now']),threshold:op('limit',['amount','fraction'])}};
}
async function run(x){const pt=JSON.stringify(x.plan);return compileReviewedQuestion(x.contractText,x.pin,pt,await casePin(pt));}
test('generic change preserves both signed interpretations and incompatible threshold types',async()=>{
 const q='Is the change from 前期 to 𐐀 current greater than limit?',x=await fixture(q),r=await run(x);
 assert.equal(r.candidates.length,4);assert.deepEqual(r.candidates.map(c=>c.conditionalState),['CONDITIONALLY_SATISFIED','BLOCKED_TYPE','BLOCKED_TYPE','CONDITIONALLY_REFUTED']);
 assert.equal(r.investigation.candidates.length,4);assert.equal(r.decisionAuthority,'NONE');
 assert.equal(r.current.span.end-r.current.span.start,new TextEncoder().encode('𐐀 current').length);
 assert.equal(r.change.span.quote,'change from');assert.match(r.qualification,/not complete meaning coverage/);
});
test('signed relative change leaves zero denominator unresolved and explicitly qualifies negative baseline',async()=>{
 const q='Is the signed relative change from 前期 to 𐐀 current at least limit?';
 for(const [prior,now,state] of [['0','120','UNRESOLVED_COMPUTATION'],['-100','-120','CONDITIONALLY_REFUTED'],['-100','-125','CONDITIONALLY_SATISFIED'],['100','125','CONDITIONALLY_SATISFIED']]){
  const x=await fixture(q,prior,now);x.plan.threshold.bindingIds=['fraction'];const r=await run(x);
  assert.equal(r.candidates[0].conditionalState,state);assert.equal(r.batchText,null);assert.match(r.candidates[0].facets.method.statement,/negative baseline is not conventional growth/);
  const pt=JSON.stringify(x.plan),e=await exportReviewedQuestion(x.contractText,x.pin,pt,await casePin(pt));assert.equal(e.portable,true);
 }
});
test('reject hidden clauses, unsupported percentage wording, malformed and overbudget mappings',async()=>{
 for(const q of ['Is the percentage change from 前期 to 𐐀 current greater than limit?','Is the change from 前期 to 𐐀 current greater than limit? Explain.','Is the change from 前期 to 𐐀 current greater than limit and cost?'])await assert.rejects(run(await fixture(q)),/QUESTION_/);
 const x=await fixture('Is the change from 前期 to 𐐀 current greater than limit?');
 for(const p of [{...x.plan,current:{...x.plan.current,start:x.plan.current.start+1}},{...x.plan,threshold:{...x.plan.threshold,bindingIds:['unknown']}},{...x.plan,baseline:{...x.plan.baseline,bindingIds:['prior','now','amount']}},{...x.plan,authority:'VERIFIED'}])await assert.rejects(run({...x,plan:p}),/QUESTION_|DRAFT_/);
});
