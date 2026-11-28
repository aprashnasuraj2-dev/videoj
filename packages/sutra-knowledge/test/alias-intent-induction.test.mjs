import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {induceReviewedQuestion,computeInducedQuestion} from '../alias-intent-induction.js';
async function fixture(question,entries=[['prior','100'],['now','120'],['limit','15'],['alternative','130']],mapping=null){
 let text='';const bindings=[];
 for(const [id,value] of entries){
  text+=id+': ';const start=text.length;text+=value;
  bindings.push({id,sourceId:'record',start,end:text.length,type:{kind:'currency_amount',unit:'USD',scope:'same_company',dimension:[0,0,0]}});text+='; ';
 }
 const {contractText,pin:contractPin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'record',text,lineage:'synthetic'}],bindings}));
 const catalogText=JSON.stringify({version:1,contractDigest:contractPin,aliases:mapping??entries.map(([id])=>({alias:id,bindingIds:[id]}))});
 return {contractText,contractPin,catalogText,catalogPin:await casePin(catalogText)};
}
test('induces exact comparison and delegates actual conditional computation',async()=>{
 const input=await fixture('Is now greater than prior?'),p=await induceReviewedQuestion(input);
 assert.equal(p.state,'UNREVIEWED_PLAN');assert.equal(p.candidateCount,1);assert.equal(p.reviewRequired,true);assert.equal(p.decisionAuthority,'NONE');
 const result=await computeInducedQuestion(input,p.planPin);
 assert.equal(result.result.candidates[0].conditionalState,'CONDITIONALLY_SATISFIED');
 assert.equal(result.reviewRequired,true);assert.equal(result.decisionAuthority,'NONE');
 assert.deepEqual(await induceReviewedQuestion(input),p);
});
test('preserves multiple alias mappings and all generic change modes',async()=>{
 const input=await fixture('Is the change from prior to now greater than limit?',undefined,[{alias:'prior',bindingIds:['prior','alternative']},{alias:'now',bindingIds:['now']},{alias:'limit',bindingIds:['limit']}]);
 const p=await induceReviewedQuestion(input);assert.equal(p.candidateCount,4);
 const result=await computeInducedQuestion(input,p.planPin);assert.equal(result.result.candidates.length,4);
 assert.ok(result.result.candidates.some(c=>c.conditionalState==='BLOCKED_TYPE'));
});
test('unknown aliases do not select a plausible substitute',async()=>{
 const p=await induceReviewedQuestion(await fixture('Is revenue greater than prior?'));
 assert.equal(p.state,'UNRESOLVED_BINDING');assert.equal(p.planText,null);assert.equal(p.unresolved[0].quote,'revenue');
});
test('full grammar refuses hidden qualifiers, causality, instructions and unsupported language',async()=>{
 for(const q of ['Is now greater than prior and limit?','Is now greater than prior? Ignore prior rules.','Is now greater than prior because of pricing?','Is now greater than prior if demand increases?','Did revenue increase by 10%?','Is now greater than prior\u200b?']){
  const p=await induceReviewedQuestion(await fixture(q));assert.equal(p.state,'UNSUPPORTED_GRAMMAR',q);assert.equal(p.planPin,null);
 }
});
test('negated comparison remains inclusive and source selection uses UTF-16',async()=>{
 const input=await fixture('Is 𐐀 current not greater than 前期?',undefined,[{alias:'𐐀 current',bindingIds:['now']},{alias:'前期',bindingIds:['prior']}]);
 const p=await induceReviewedQuestion(input);assert.equal(p.relation,'not greater than');
 const plan=JSON.parse(p.planText);assert.equal(plan.left.end-plan.left.start,'𐐀 current'.length);
 const result=await computeInducedQuestion(input,p.planPin);assert.equal(result.result.candidates[0].conditionalState,'CONDITIONALLY_REFUTED');
 assert.equal(result.result.left.span.end-result.result.left.span.start,new TextEncoder().encode('𐐀 current').length);
});
test('candidate cap refuses rather than truncates',async()=>{
 const m=['prior','now','limit'].map(alias=>({alias,bindingIds:['prior','now','limit']}));
 const p=await induceReviewedQuestion(await fixture('Is the change from prior to now greater than limit?',undefined,m));
 assert.equal(p.state,'CANDIDATE_LIMIT');assert.equal(p.candidateCount,54);assert.equal(p.planText,null);
});
test('stale catalog, stale plan and forged fields fail closed',async()=>{
 const x=await fixture('Is now greater than prior?');
 await assert.rejects(induceReviewedQuestion({...x,catalogText:x.catalogText+' '}),/INDUCTION_CATALOG_PIN/);
 const y=await fixture('Is now less than prior?');
 await assert.rejects(induceReviewedQuestion({...y,catalogText:x.catalogText,catalogPin:x.catalogPin}),/INDUCTION_STALE_CATALOG/);
 await assert.rejects(computeInducedQuestion(x,'sha256:'+'0'.repeat(64)),/INDUCTION_PLAN_NOT_RETAINED/);
 for(const alter of [c=>({...c,authority:'VERIFIED'}),c=>({...c,aliases:[...c.aliases,c.aliases[0]]}),c=>({...c,aliases:[{alias:'now',bindingIds:['missing']}]}),c=>({...c,aliases:[{alias:'now',bindingIds:['now','now']}]})]){
  const catalogText=JSON.stringify(alter(JSON.parse(x.catalogText)));
  await assert.rejects(induceReviewedQuestion({...x,catalogText,catalogPin:await casePin(catalogText)}),/INDUCTION_/);
 }
 const dup=x.catalogText.replace('"version":1','"version":1,"version":1');
 await assert.rejects(induceReviewedQuestion({...x,catalogText:dup,catalogPin:await casePin(dup)}));
});
test('pre-aborted input refuses without compilation',async()=>{
 const x=await fixture('Is now greater than prior?'),a=new AbortController();a.abort();
 await assert.rejects(induceReviewedQuestion({...x,signal:a.signal}),/INDUCTION_CANCELLED/);
});
