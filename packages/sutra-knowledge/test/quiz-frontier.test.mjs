import test from 'node:test';
import assert from 'node:assert/strict';
import {planQuiz,readQuizObservation,validateQuizCapability,quizTransfer} from '../quiz-frontier.js';
import {QUIZ_SOURCE_TEXT} from '../examples/quiz-source.mjs';
test('Simpson reversal: identical aggregates, opposite standardized decisions, redundant observation skipped',async()=>{
 const p=await planQuiz();
 assert.deepEqual(p.aggregates,[{id:'balanced',a:'4/5',b:'3/5'},{id:'reversal',a:'4/5',b:'3/5'}]);
 assert.equal(p.plan.worlds[0].decision,'constraint_satisfied');assert.equal(p.plan.worlds[1].decision,'constraint_refuted');
 assert.equal(p.plan.plan.observationId,'a_beginner_rate');assert.equal(p.plan.plan.worstCost,6);
});
test('new capability reduces worst-case cost from six to two without supplying a verdict',async()=>{
 const extra=[{nodeId:'a_beginner_n',cost:2}],p=await planQuiz(extra);
 assert.equal(p.plan.plan.observationId,'a_beginner_n');assert.equal(p.plan.plan.worstCost,2);
 const r=await readQuizObservation({extra,nodeId:'a_beginner_n',prediction:'a_higher'});
 assert.equal(r.value,'80/1');assert.equal(r.answer,'not_a_higher');assert.equal(r.feedback,'prediction_revised');
 assert.deepEqual(r.excludedWorlds,['balanced']);
 assert.deepEqual(r.standardized,{a_standardized:'13/20',b_standardized:'117/160',a_beginner_rate:'9/10',a_advanced_rate:'2/5',b_beginner_rate:'19/20',b_advanced_rate:'41/80'});
 assert.equal(r.remaining.plan.worstCost,0);assert.equal(r.truthStatus,'synthetic_model_only');assert.equal(r.evidence.level,'host_pinned_synthetic_source');
});
test('redundant distinct aggregate capability does not change optimal policy; duplicate, forged and wrong-scope offers refused',async()=>{
 const p=await planQuiz([{nodeId:'b_total_rate',cost:1}]);assert.equal(p.plan.plan.worstCost,6);
 await assert.rejects(()=>planQuiz([{nodeId:'a_total_rate',cost:1}]),/QUIZ_CAPABILITY_REFUSED/);
 const m={sutraObservation:{version:1,caseId:'quiz_strata_v1',scope:'synthetic_quiz_strata',costUnit:'synthetic_effort',nodeId:'a_beginner_n',cost:2}};
 assert.deepEqual(validateQuizCapability(m),{nodeId:'a_beginner_n',cost:2});
 for(const change of [{verified:true},{scope:'other'},{nodeId:'a_standardized_higher'},{cost:0},{costUnit:'USD'},{outcomes:{balanced:'x'}}]){
  assert.throws(()=>validateQuizCapability({sutraObservation:{...m.sutraObservation,...change}}),/QUIZ_CAPABILITY_REFUSED/);
 }
});
test('source tampering, unplanned reads and causal interpretation are refused',async()=>{
 const extra=[{nodeId:'a_beginner_n',cost:2}];
 await assert.rejects(()=>readQuizObservation({extra,nodeId:'a_beginner_n',prediction:'a_higher',sourceText:QUIZ_SOURCE_TEXT.replace('[72,80]','[71,80]')}),/QUIZ_CAPABILITY_REFUSED/);
 await assert.rejects(()=>readQuizObservation({extra,nodeId:'a_total_rate',prediction:'a_higher'}),/QUIZ_CAPABILITY_REFUSED/);
 assert.equal(quizTransfer('causal').correct,false);assert.equal(quizTransfer('standardized_only').correct,true);
});
