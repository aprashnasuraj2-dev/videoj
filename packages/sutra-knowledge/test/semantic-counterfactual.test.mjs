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
