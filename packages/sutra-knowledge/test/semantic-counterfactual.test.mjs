import {searchSemanticWitnesses} from '../semantic-witness-search.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft,selectedSpan} from '../reviewed-draft.js';
import {FACETS} from '../semantic-investigation.js';
import {challengeSemanticInterpretations} from '../semantic-counterfactual.js';
async function setup(){
 const question='Did current-year profit exceed the threshold?',source='Revenue 100; current expense 50; prior expense 50; threshold 40;';
 const type={kind:'currency_amount',unit:'USD',scope:'same_declared_scope',dimension:[0,0,0]};
 // Avoid accidental substring/decimal token truncation. Two equal numeric
 // tokens are independently selected and carry distinct binding IDs.
 const fields=[['revenue',source.indexOf('100'),3],['current',source.indexOf('50'),2],['prior',source.lastIndexOf('50'),2],['threshold',source.indexOf('40'),2]];
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'source',lineage:'synthetic',text:source}],bindings:fields.map(([id,start,n])=>({id,sourceId:'source',start,end:start+n,type}))}));
 const input=(id,bindingId=id)=>({id,kind:'input',bindingId});
 const proposal=expense=>JSON.stringify({version:1,contractDigest:pin,questionSpan:selectedSpan('question',question,0,question.length),claims:[],nodes:[input('revenue'),input('expense',expense),input('threshold'),{id:'profit',kind:'derive',op:'sub',args:['revenue','expense']},{id:'target',kind:'constraint',op:'gt',args:['profit','threshold']}],targetId:'target'});
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals:[{id:'current_year',proposalText:proposal('current')},{id:'prior_year',proposalText:proposal('prior')}]});
 const batchDigest=await casePin(batchText);
 const annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest,candidates:['current_year','prior_year'].map(id=>({id,meaning:id,facets:Object.fromEntries(FACETS.map(k=>[k,null]))}))});
 const plan={version:1,contractDigest:pin,batchDigest,scenarios:[{id:'current_up',replacements:[{bindingId:'current',value:'70/1'}]},{id:'prior_up',replacements:[{bindingId:'prior',value:'70/1'}]},{id:'both_up',replacements:[{bindingId:'current',value:'70/1'},{bindingId:'prior',value:'70/1'}]},{id:'unchanged',replacements:[{bindingId:'current',value:'100/2'}]}]};
 return {contractText,pin,batchText,annotationText,annotationPin:await casePin(annotationText),plan};
}
async function run(s,p){const text=JSON.stringify(s.plan);return challengeSemanticInterpretations(s.contractText,s.pin,s.batchText,s.annotationText,s.annotationPin,text,p??await casePin(text));}
test('accidental baseline agreement is broken by independent period perturbations',async()=>{
 const r=await run(await setup()),at=id=>r.scenarios.find(s=>s.id===id);
 assert.ok(r.baseline.every(x=>x.conditionalState==='constraint_satisfied'));
 assert.deepEqual(at('current_up').witnesses,[{left:'current_year',right:'prior_year',leftState:'constraint_refuted',rightState:'constraint_satisfied'}]);
 assert.deepEqual(at('prior_up').witnesses,[{left:'current_year',right:'prior_year',leftState:'constraint_satisfied',rightState:'constraint_refuted'}]);
 assert.deepEqual(at('both_up').witnesses,[]);assert.deepEqual(at('unchanged').witnesses,[]);
 assert.ok(at('unchanged').rows.every(x=>x.changedInputNodes.length===0));
 assert.ok(r.scenarios.flatMap(s=>s.rows).every(x=>x.incrementalMatchesFull));
 assert.ok(r.scenarios.flatMap(s=>s.rows).some(x=>x.reused>0));assert.equal(r.decisionAuthority,'NONE');
});
test('stale plans, unknown/duplicate bindings, fabricated status and invalid rational fail closed',async()=>{
 const s=await setup(),pin=await casePin(JSON.stringify(s.plan));s.plan.scenarios[0].replacements[0].value='80/1';await assert.rejects(run(s,pin),/PLAN_PIN/);
 for(const edit of [p=>p.scenarios[0].replacements[0].bindingId='missing',p=>p.scenarios[0].replacements.push(p.scenarios[0].replacements[0]),p=>p.scenarios[0].replacements[0].value='1/0',p=>p.scenarios[0].replacements[0].value='-0/1',p=>p.scenarios[0].status='VERIFIED',p=>p.scenarios[1].id=p.scenarios[0].id]){
  const f=await setup();edit(f.plan);await assert.rejects(run(f),/COUNTERFACTUAL_/);
 }
});

async function version(s){
 return sealInvestigationVersion({contractText:s.contractText,contractPin:s.pin,batchText:s.batchText,annotationText:s.annotationText,annotationPin:s.annotationPin});
}
test('automatic bounded search prioritizes differing period bindings and finds an accidental agreement witness',async()=>{
 const v=await version(await setup()),r=await searchSemanticWitnesses(v.versionText,v.digest,{maxScenarios:6});
 assert.deepEqual(r.rankedBindings.slice(0,2),['current','prior']);
 assert.equal(r.status,'DISTINGUISHING_SCENARIO_FOUND');assert.equal(r.possibleScenarioCount,8);assert.equal(r.evaluatedScenarioCount,6);assert.equal(r.truncated,true);
 assert.ok(r.witnesses.some(w=>w.replacements[0].bindingId==='current'||w.replacements[0].bindingId==='prior'));
 assert.equal(r.decisionAuthority,'NONE');assert.equal(await casePin(r.planText),r.planDigest);
 assert.deepEqual(await searchSemanticWitnesses(v.versionText,v.digest,{maxScenarios:6}),r);
});
test('no witness within a one-scenario budget is not proof of equivalence',async()=>{
 const v=await version(await setup()),r=await searchSemanticWitnesses(v.versionText,v.digest,{maxScenarios:1});
 // First probe changes current expense to zero; both programs still exceed 40.
 assert.equal(r.status,'NO_WITNESS_IN_SEARCHED_SCENARIOS');assert.equal(r.truncated,true);assert.equal(r.evaluatedScenarioCount,1);
});
test('identical typed copies are not treated as independent candidates for witness generation',async()=>{
 const s=await setup(),b=JSON.parse(s.batchText),a=JSON.parse(s.annotationText);
 b.proposals[1].proposalText=b.proposals[0].proposalText;s.batchText=JSON.stringify(b);a.batchDigest=await casePin(s.batchText);s.annotationText=JSON.stringify(a);s.annotationPin=await casePin(s.annotationText);
 const v=await version(s),r=await searchSemanticWitnesses(v.versionText,v.digest);
 assert.equal(r.status,'NO_ELIGIBLE_BINDING');assert.equal(r.evaluatedScenarioCount,0);assert.equal(r.planText,null);
 await assert.rejects(searchSemanticWitnesses(v.versionText,v.digest,{maxScenarios:17}),/WITNESS_BUDGET/);
 await assert.rejects(searchSemanticWitnesses(v.versionText,v.digest.replace(/.$/,v.digest.endsWith('0')?'1':'0')),/REVISION_PIN/);
});
