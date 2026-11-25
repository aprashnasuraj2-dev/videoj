import test from 'node:test';
import assert from 'node:assert/strict';
import {disclosureFixture as fixture} from '../examples/disclosure-frontier.mjs';
import {solveDisclosure} from '../disclosure-frontier.js';
test('explicit bundle versus staged reads: cap changes optimum, not evidence',async()=>{
 const open=await fixture(4),bounded=await fixture(2),refused=await fixture(1);
 assert.equal(open.unrestricted.plan.actionId,'bundle_both');assert.equal(open.constrained.plan.worstCost,3);assert.equal(open.constrained.plan.worstExposure,4);
 assert.deepEqual(open.constrained.plan.observationIds,['bundle_capacity','bundle_load']);
 assert.equal(bounded.unrestricted.plan.worstCost,3);assert.equal(bounded.constrained.plan.worstCost,4);assert.equal(bounded.constrained.plan.worstExposure,2);
 assert.equal(refused.constrained.status,'exposure_budget_infeasible');assert.equal(refused.constrained.plan,null);assert.equal(refused.constrained.witness,null);
 assert.deepEqual(open.survivingWorlds,bounded.survivingWorlds);assert.deepEqual(bounded.survivingWorlds,refused.survivingWorlds);
});
test('withdrawal excludes entire bundle; missing actions yield genuine indistinguishability',async()=>{
 const r=await fixture(4,[{type:'withdraw_source',sourceId:'bundle'}]);
 assert.equal(r.constrained.plan.worstCost,4);assert.deepEqual(r.excludedActions,[{id:'bundle_both',unavailableObservationIds:['bundle_capacity','bundle_load']}]);
 const missing=await fixture(4,[],p=>({...p,actions:p.actions.filter(a=>a.id==='single_load')}));
 assert.equal(missing.constrained.status,'insufficient_observations');assert.ok(missing.constrained.witness);
});
test('closed profile: no cross-source bundle, repeated fields, unpinned action or negative cost',async()=>{
 for(const m of [
 p=>({...p,actions:[{...p.actions[0],observationIds:['bundle_load','read_capacity']}]}),
 p=>({...p,actions:[{...p.actions[0],observationIds:['bundle_load','bundle_load']}]}),
 p=>({...p,actions:[{...p.actions[0],observationIds:['unknown']}]}),
 p=>({...p,actions:[{...p.actions[0],exposure:-1}]}),
 p=>({...p,actions:[p.actions[0],p.actions[0]]}),
 p=>({...p,eventDigest:'sha256:'+'0'.repeat(64)}),
 p=>({...p,exposureBudget:8000001}),
 p=>({...p,actions:[{...p.actions[0],authorized:true}]})
 ])await assert.rejects(()=>fixture(4,[],m),/DISCLOSURE_/);
});
// Independent sequence enumeration, no memoization or bit masks.
function brute(worlds,actions,sourceCosts,acquired,budget){
 if(worlds.every(w=>w.decision===worlds[0].decision))return 0;
 let best=Infinity;
 for(const a of actions){
  if(a.exposure>budget)continue;
  const labels=[...new Set(worlds.map(w=>a.outcomes[w.id]))];if(labels.length<2)continue;
  const cost=a.readCost+(acquired.has(a.sourceId)?0:sourceCosts.find(s=>s.id===a.sourceId).cost);
  best=Math.min(best,cost+Math.max(...labels.map(l=>brute(worlds.filter(w=>a.outcomes[w.id]===l),actions.filter(x=>x!==a),sourceCosts,new Set([...acquired,a.sourceId]),budget-a.exposure))));
 }
 return best;
}
test('512 sequence-oracle controls, including zero cost and hard worst-branch cap',()=>{
 for(let k=0;k<512;k++){
  const worlds=Array.from({length:4},(_,i)=>({id:'w'+i,decision:(k>>i)&1?'constraint_satisfied':'constraint_refuted'}));
  const sources=[{id:'s0',cost:(k>>4)&3},{id:'s1',cost:(k>>6)&3}];
  const actions=[0,1,2].map(t=>({id:'a'+t,sourceId:t===1?'s1':'s0',observationIds:['f'+t],readCost:(k+t)%3,exposure:(k+t)%4,outcomes:Object.fromEntries(worlds.map((w,i)=>[w.id,'v'+(t===0?i&1:t===1?i>>1:i)]))}));
  const budget=(k>>5)%6,acq=k&256?['s0']:[];
  const expected=brute(worlds,actions,sources,new Set(acq),budget),actual=solveDisclosure(worlds,actions,sources,acq,budget);
  assert.equal(actual.plan?.worstCost??Infinity,expected,'case '+k);
  if(actual.plan)assert.ok(actual.plan.worstExposure<=budget);
  assert.ok(actual.statesEvaluated<=3072);
 }
});
