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

async function branchingFixture(){
 const question='Does the explicitly selected synthetic quantity exceed the limit?',source='Selector: 0; One: 1; Y: 2; Z: 2; Limit: 3;',type={kind:'ratio',unit:'one',scope:'synthetic',dimension:[0,0,0]};
 const markers={x:'Selector: 0',one:'One: 1',y:'Y: 2',z:'Z: 2',limit:'Limit: 3'};
 const bindings=Object.entries(markers).map(([id,m])=>{const start=source.indexOf(m)+m.length-1;return {id,sourceId:'source',start,end:start+1,type};});
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'source',lineage:'synthetic',text:source}],bindings}));
 // x is a declared 0/1 selector, not an empirically inferred causal relation.
 // selected = (1-x)*y + x*z. Both alternative programs are deliberately identical.
 const proposal=JSON.stringify({version:1,contractDigest:pin,questionSpan:{sourceId:'question',start:0,end:question.length,quote:question},claims:[],nodes:[...Object.keys(markers).map(id=>({id,kind:'input',bindingId:id})),
 {id:'complement',kind:'derive',op:'sub',args:['one','x']},{id:'left',kind:'derive',op:'mul',args:['complement','y']},{id:'right',kind:'derive',op:'mul',args:['x','z']},
 {id:'selected',kind:'derive',op:'add',args:['left','right']},{id:'target',kind:'constraint',op:'gt',args:['selected','limit']}],targetId:'target'});
 const candidates=['a','b'].map(id=>({id,meaning:id,facets:Object.fromEntries(FACETS.map(k=>[k,null]))}));
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals:candidates.map(c=>({id:c.id,proposalText:proposal}))});
 const annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 const v=await sealInvestigationVersion({contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
 const axes=[{bindingId:'x',values:['0/1','1/1']},...['y','z'].map(bindingId=>({bindingId,values:['2/1','4/1']}))];
 const grid={version:1,versionDigest:v.digest,axes,maxAssignments:16},gridText=JSON.stringify(grid),gridPin=await casePin(gridText);
 const policy={...(await fixture()).policy,versionDigest:v.digest,gridDigest:gridPin,exposureBudget:2,sourceCosts:[{id:'source',costUpper:0}],
 actions:axes.map(a=>({id:'read_'+a.bindingId,sourceId:'source',bindingId:a.bindingId,readCostUpper:1,exposure:1,outcomes:a.values.map((value,i)=>({value,labels:[i?'high':'low']}))}))};
 return {v,grid,gridText,gridPin,policy};
}
// Independent fixed-subset baseline: enumerate every subset and every outcome
// partition from the declared truth table. No production plan is read.
function fixedSubsetObjective(worlds,actions,budget){
 let best=6;
 for(let mask=1;mask<(1<<actions.length);mask++){
  const chosen=actions.filter((_,i)=>mask&(1<<i)),exposure=chosen.reduce((s,a)=>s+a.exposure,0);
  if(exposure>budget)continue;
  let parts=[worlds];
  for(const a of chosen){
   const next=[];
   for(const group of parts){
    const labels=new Set(group.flatMap(w=>a.outcomes.find(o=>o.value===w[a.bindingId]).labels));
    for(const label of labels)next.push(group.filter(w=>a.outcomes.find(o=>o.value===w[a.bindingId]).labels.includes(label)));
   }
   parts=next;
  }
  const terminal=Math.max(...parts.map(g=>new Set(g.map(w=>w.state)).size===1?0:6));
  best=Math.min(best,chosen.reduce((s,a)=>s+a.readCostUpper,0)+terminal);
 }
 return best;
}
test('branch-dependent evidence acquisition strictly beats matched fixed subsets on declared selector model',async()=>{
 const f=await branchingFixture(),worlds=[0,1].flatMap(x=>[2,4].flatMap(y=>[2,4].map(z=>({x:x+'/1',y:y+'/1',z:z+'/1',state:(x===0?y:z)>3?'constraint_satisfied':'constraint_refuted'}))));
 for(const budget of [1,2,3]){
  f.policy.exposureBudget=budget;const r=await run(f),fixed=fixedSubsetObjective(worlds,f.policy.actions,budget);
  assert.equal(r.cells.length,16);assert.equal(r.coverage.truncated,false);assert.equal(r.decisionAuthority,'NONE');
  for(const c of r.cells){const a=Object.fromEntries(c.assignment.map(x=>[x.bindingId,x.value]));assert.equal(c.state,worlds.find(w=>w.x===a.x&&w.y===a.y&&w.z===a.z).state);}
  assert.equal(r.plan.worstObjective,oracle(worlds,f.policy.actions,f.policy.decisions,false,0,budget));
  assert.equal(r.plan.worstObjective,budget===1?6:2);assert.equal(fixed,budget===3?3:6);
  if(budget>=2){
   assert.equal(r.plan.actionId,'read_x');assert.equal(r.plan.worstExposure,2);
   assert.deepEqual(r.plan.branches.map(b=>[b.outcome,b.next.actionId]),[['high','read_z'],['low','read_y']]);
  }
 }
 f.policy.exposureBudget=3;f.policy.actions[0].outcomes.forEach(o=>o.labels.push('failed'));
 const failed=await run(f);assert.equal(failed.plan.kind,'stop');assert.equal(failed.plan.worstObjective,6);
});

import {replayAcquisitionPath,replaySourceBoundAcquisitionPath} from '../acquisition-path.js';
async function path(f,events){const policyText=JSON.stringify(f.policy),policyPin=await casePin(policyText),traceText=JSON.stringify({version:1,policyPin,events});return replayAcquisitionPath({versionText:f.v.versionText,versionPin:f.v.digest,gridText:f.gridText,gridPin:f.gridPin,policyText,policyPin,traceText,tracePin:await casePin(traceText)});}
test('replay an explicitly declared observation path, preserve surviving worlds and charge shared costs',async()=>{
 const f=await fixture(),initial=await path(f,[]),r=await path(f,[{actionId:'read',outcome:'high'}]);
 assert.equal(initial.status,'AWAITING_DECLARED_OBSERVATION');assert.equal(r.status,'DECLARED_TERMINAL');assert.equal(r.declaredDecision,'choose_true');assert.equal(r.survivingCells.length,2);assert.equal(r.costUpper,2);assert.equal(r.exposure,1);assert.equal(r.decisionAuthority,'NONE');
 for(const events of [[{actionId:'read',outcome:'unknown'}],[{actionId:'forged',outcome:'high'}],[{actionId:'read',outcome:'high'},{actionId:'read',outcome:'low'}]])await assert.rejects(path(f,events),/ACQUISITION_PATH_/);
 const g=await fixture();g.policy.exposureBudget=0;await assert.rejects(path(g,[{actionId:'read',outcome:'high'}]),/ACQUISITION_PATH_/);
});

test('observation receipt binds exact Unicode source span without claiming measurement authenticity',async()=>{
 const f=await fixture(),policyText=JSON.stringify(f.policy),policyPin=await casePin(policyText),traceText=JSON.stringify({version:1,policyPin,events:[{actionId:'read',outcome:'high'}]}),tracePin=await casePin(traceText),sourceText='測定: high';
 const receipt={actionId:'read',outcome:'high',sourceId:'measurement',sourceText,sourcePin:await casePin(sourceText),start:4,end:8};
 const wire={version:1,tracePin,receipts:[receipt]};
 const run=async w=>{const receiptsText=JSON.stringify(w);return replaySourceBoundAcquisitionPath({versionText:f.v.versionText,versionPin:f.v.digest,gridText:f.gridText,gridPin:f.gridPin,policyText,policyPin,traceText,tracePin,receiptsText,receiptsPin:await casePin(receiptsText)});};
 const result=await run(wire);assert.equal(result.path.declaredDecision,'choose_true');assert.equal(result.observationAuthentication,'NOT_ESTABLISHED');assert.equal(result.decisionAuthority,'NONE');
 await assert.rejects(run({...wire,receipts:[{...receipt,sourceText:'測定: high amended'}]}),/ACQUISITION_PATH_RECEIPT_SOURCE_PIN/);
 await assert.rejects(run({...wire,receipts:[{...receipt,start:3}]}),/ACQUISITION_PATH_RECEIPT_MAPPING/);
 await assert.rejects(run({...wire,receipts:[]}),/ACQUISITION_PATH_RECEIPT_SHAPE/);
});
