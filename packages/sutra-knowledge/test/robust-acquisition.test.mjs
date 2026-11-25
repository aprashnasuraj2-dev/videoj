import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft,draftComparisonProposal} from '../reviewed-draft.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {FACETS} from '../semantic-investigation.js';
import {planRobustAcquisition} from '../robust-acquisition.js';
async function fixture(){
 const question='Does the supplied quantity exceed the limit?',source='Quantity: 2; Limit: 3;',type={kind:'ratio',unit:'one',scope:'synthetic',dimension:[0,0,0]};
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'source',lineage:'synthetic',text:source}],bindings:[['x',source.indexOf('2')],['limit',source.indexOf('3')]].map(([id,start])=>({id,sourceId:'source',start,end:start+1,type}))}));
 const proposal=await draftComparisonProposal(contractText,pin,'x','limit','gt');
 const candidates=['a','b'].map(id=>({id,meaning:id,facets:Object.fromEntries(FACETS.map(k=>[k,null]))}));
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals:candidates.map(c=>({id:c.id,proposalText:proposal}))});
 const annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 const v=await sealInvestigationVersion({contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
 const grid={version:1,versionDigest:v.digest,axes:[{bindingId:'x',values:['2/1','4/1']}],maxAssignments:16},gridText=JSON.stringify(grid),gridPin=await casePin(gridText);
 const policy={version:1,versionDigest:v.digest,gridDigest:gridPin,costUnit:'loss_units',exposureUnit:'abstract_units',exposureBudget:1,sourceCosts:[{id:'source',costUpper:1}],initiallyAcquired:[],
 decisions:[{id:'choose_true',loss:{constraint_satisfied:0,constraint_refuted:10}},{id:'choose_false',loss:{constraint_satisfied:10,constraint_refuted:0}},{id:'abstain',loss:{constraint_satisfied:6,constraint_refuted:6}}],
 actions:[{id:'read',sourceId:'source',bindingId:'x',readCostUpper:1,exposure:1,outcomes:[{value:'2/1',labels:['low']},{value:'4/1',labels:['high']}]}]};
 return {v,grid,gridText,gridPin,policy};
}
async function run(f,pin){const text=JSON.stringify(f.policy);return planRobustAcquisition(f.v.versionText,f.v.digest,f.gridText,f.gridPin,text,pin??await casePin(text));}
test('perfect observation reduces declared worst objective but exposure cap can force abstention',async()=>{
 const f=await fixture(),r=await run(f);
 assert.equal(r.status,'FINITE_DECLARED_POLICY');assert.equal(r.noObservation.decision,'abstain');assert.equal(r.noObservation.worstObjective,6);assert.equal(r.plan.kind,'observe');assert.equal(r.plan.worstObjective,2);assert.equal(r.worstCaseImprovement,4);
 assert.equal(r.perfectInformationLowerBound,0);assert.equal(r.plan.worstExposure,1);assert.equal(r.decisionAuthority,'NONE');
 f.policy.exposureBudget=0;const capped=await run(f);assert.equal(capped.plan.kind,'stop');assert.equal(capped.worstCaseImprovement,0);
});
test('failure outcome and overlapping noisy labels defeat worst-case value despite informative readings',async()=>{
 const f=await fixture();for(const o of f.policy.actions[0].outcomes)o.labels.push('failed');
 const r=await run(f);assert.equal(r.plan.kind,'stop');assert.equal(r.worstCaseImprovement,0);
 assert.equal(r.availableActions[0].outcomeCells.find(x=>x.label==='failed').cells.length,4);
 assert.equal(r.availableActions[0].outcomeCells.find(x=>x.label==='low').cells.length,2);
});
test('exact bounded objective equals independent one-read exhaustive oracle under varying costs and losses',async()=>{
 const f=await fixture();
 for(const acquisition of [0,2,5])for(const read of [0,2])for(const failure of [false,true]){
  f.policy.sourceCosts[0].costUpper=acquisition;f.policy.actions[0].readCostUpper=read;
  f.policy.actions[0].outcomes=[{value:'2/1',labels:failure?['low','failed']:['low']},{value:'4/1',labels:failure?['high','failed']:['high']}];
  const r=await run(f),expected=Math.min(6,acquisition+read+(failure?6:0));
  assert.equal(r.plan.worstObjective,expected);if(expected===6)assert.equal(r.plan.kind,'stop');
 }
});
test('truncation, stale pin and fabricated costs/labels fail closed',async()=>{
 const f=await fixture(),pin=await casePin(JSON.stringify(f.policy));f.policy.exposureBudget=0;await assert.rejects(run(f,pin),/ACQUISITION_PIN/);
 for(const edit of [p=>p.actions[0].sourceId='forged',p=>p.actions[0].outcomes[0].labels=[],p=>p.actions[0].outcomes[0].probability=.9,p=>p.decisions.pop(),p=>p.actions[0].readCostUpper=-1]){
  const s=await fixture();edit(s.policy);await assert.rejects(run(s),/ACQUISITION_/);
 }
 const s=await fixture();s.grid.maxAssignments=1;s.gridText=JSON.stringify(s.grid);s.gridPin=await casePin(s.gridText);s.policy.gridDigest=s.gridPin;
 const r=await run(s);assert.equal(r.status,'UNRESOLVED_OR_EXCESSIVE_GRID');assert.equal(r.plan,undefined);
});

async function twoAxisFixture(){
 const question='Does the synthetic product exceed the limit?',source='X: 2; Y: 2; Limit: 9;',type={kind:'ratio',unit:'one',scope:'synthetic',dimension:[0,0,0]};
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'source',lineage:'synthetic',text:source}],bindings:[['x',source.indexOf('2')],['y',source.lastIndexOf('2')],['limit',source.indexOf('9')]].map(([id,start])=>({id,sourceId:'source',start,end:start+1,type}))}));
 const proposal=JSON.stringify({version:1,contractDigest:pin,questionSpan:{sourceId:'question',start:0,end:question.length,quote:question},claims:[],nodes:[...['x','y','limit'].map(id=>({id,kind:'input',bindingId:id})),{id:'product',kind:'derive',op:'mul',args:['x','y']},{id:'target',kind:'constraint',op:'gt',args:['product','limit']}],targetId:'target'});
 const candidates=['a','b'].map(id=>({id,meaning:id,facets:Object.fromEntries(FACETS.map(k=>[k,null]))}));
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals:candidates.map(c=>({id:c.id,proposalText:proposal}))});
 const annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 const v=await sealInvestigationVersion({contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
 const grid={version:1,versionDigest:v.digest,axes:['x','y'].map(bindingId=>({bindingId,values:['2/1','4/1']})),maxAssignments:16},gridText=JSON.stringify(grid),gridPin=await casePin(gridText);
 const policy={...(await fixture()).policy,versionDigest:v.digest,gridDigest:gridPin,exposureBudget:2,sourceCosts:[{id:'source',costUpper:2}],
 actions:['x','y'].map(bindingId=>({id:'read_'+bindingId,sourceId:'source',bindingId,readCostUpper:1,exposure:1,outcomes:[{value:'2/1',labels:['low']},{value:'4/1',labels:['high']}]}))};
 return {v,grid,gridText,gridPin,policy};
}
// Independent brute-force recursion on arrays, no masks or memoization.
function oracle(worlds,actions,decisions,acquired,cost,budget){
 const stop=Math.min(...decisions.map(d=>Math.max(...worlds.map(w=>d.loss[w.state]))));
 let best=stop;
 for(const a of actions){
  if(a.exposure>budget)continue;
  const outcomes=new Set(worlds.flatMap(w=>a.outcomes.find(o=>o.value===w[a.bindingId]).labels));
  const branch=[...outcomes].map(label=>oracle(worlds.filter(w=>a.outcomes.find(o=>o.value===w[a.bindingId]).labels.includes(label)),actions.filter(x=>x!==a),decisions,true,cost,budget-a.exposure));
  best=Math.min(best,(acquired?0:cost)+a.readCostUpper+Math.max(...branch));
 }
 return best;
}
test('adaptive two-axis acquisition, shared cost, and noisy outcomes match independent exhaustive oracle',async()=>{
 const f=await twoAxisFixture(),worlds=[2,4].flatMap(x=>[2,4].map(y=>({x:x+'/1',y:y+'/1',state:x*y>9?'constraint_satisfied':'constraint_refuted'})));
 const baseline=await run(f);assert.equal(baseline.plan.worstObjective,4);assert.equal(baseline.plan.kind,'observe');assert.ok(baseline.plan.branches.some(b=>b.next.kind==='observe'&&b.next.acquisitionCostUpper===0));assert.ok(baseline.plan.branches.some(b=>b.next.kind==='stop'));
 for(const cost of [0,2,5])for(const budget of [0,1,2])for(const failed of [false,true]){
  f.policy.sourceCosts[0].costUpper=cost;f.policy.exposureBudget=budget;
  for(const a of f.policy.actions)a.outcomes=[{value:'2/1',labels:failed?['low','failed']:['low']},{value:'4/1',labels:failed?['high','failed']:['high']}];
  const r=await run(f);assert.equal(r.plan.worstObjective,oracle(worlds,f.policy.actions,f.policy.decisions,false,cost,budget));
  assert.ok(r.plan.worstExposure<=budget);
 }
});
