import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {planInvestigationClarifications} from '../clarification-plan.js';
async function modify(v,edit){
 const raw=JSON.parse(v.versionText),b=JSON.parse(raw.batchText),a=JSON.parse(raw.annotationText);
 edit(b,a);
 raw.batchText=JSON.stringify(b);a.batchDigest=await casePin(raw.batchText);raw.annotationText=JSON.stringify(a);raw.annotationPin=await casePin(raw.annotationText);
 return sealInvestigationVersion({previousDigest:raw.previousDigest,contractText:raw.contractText,contractPin:raw.contractPin,batchText:raw.batchText,annotationText:raw.annotationText,annotationPin:raw.annotationPin});
}
const plan=(v,o)=>planInvestigationClarifications(v.versionText,v.digest,o);
const facet=s=>({statement:s,references:[]});
test('one question covers observed divergence without choosing a winner',async()=>{
 const v=await livingFixture('finance',{revised:true}),r=await plan(v,{maxQuestions:1,maxScenarios:1});
 assert.equal(r.counts.materialPairs,1);assert.equal(r.counts.coveredPairs,1);
 assert.equal(r.questions[0].facet,'definition');assert.equal(r.questions[0].answers.length,2);
 assert.equal(r.decisionAuthority,'NONE');assert.equal(r.uncoveredMaterialPairs.length,0);
});
test('duplicate proposals with identical declarations never amplify material pairs',async()=>{
 const v=await livingFixture('finance',{revised:true}),w=await modify(v,(b,a)=>{
  for(let i=0;i<5;i++){const id='copy_'+i;b.proposals.push({...b.proposals[0],id});a.candidates.push({...a.candidates[0],id});}
 });
 const r=await plan(w,{maxQuestions:1,maxScenarios:1});
 assert.equal(r.counts.candidateCount,7);assert.equal(r.counts.reviewClassCount,2);assert.equal(r.counts.materialPairs,1);
 assert.equal(r.questions[0].answers.flatMap(x=>x.alternatives.flatMap(y=>y.candidateIds)).length,7);
});
test('missing declarations leave divergent alternatives unresolved rather than inventing a question',async()=>{
 const v=await livingFixture('engineering',{revised:true}),w=await modify(v,(b,a)=>{for(const c of a.candidates)c.facets.definition=null;});
 const r=await plan(w,{maxQuestions:1,maxScenarios:1});
 assert.equal(r.questions.length,0);assert.equal(r.uncoveredMaterialPairs.length,1);
});
test('withdrawal retains unresolved candidate outside decisive pair planning',async()=>{
 const v=await livingFixture('engineering',{withdraw:true}),r=await plan(v,{maxQuestions:1,maxScenarios:1});
 assert.equal(r.unresolved.length,1);assert.equal(r.unresolved[0].state,'BLOCKED_MISSING_INPUT');assert.equal(r.questions.length,0);
});
test('bounded exact set selection chooses fewer questions and retains uncovered pairs',async()=>{
 const v=await livingFixture('finance',{revised:true}),w=await modify(v,(b,a)=>{
  const first=a.candidates[0],second=a.candidates[1];
  first.facets.definition=null;second.facets.definition=null;
  first.facets.time=facet('earlier');second.facets.time=facet('later');
  first.facets.method=facet('method A');second.facets.method=facet('method B');
 });
 const r=await plan(w,{maxQuestions:2,maxScenarios:1});
 assert.equal(r.questions.length,1);assert.equal(r.questions[0].facet,'time');assert.equal(r.counts.coveredObservedPairs,1);
 assert.deepEqual(await plan(w,{maxQuestions:2,maxScenarios:1}),r);
 await assert.rejects(plan(w,{maxQuestions:0}),/CLARIFICATION_BUDGET/);
 await assert.rejects(planInvestigationClarifications(w.versionText,'sha256:'+'0'.repeat(64)),/REVISION_PIN/);
});
