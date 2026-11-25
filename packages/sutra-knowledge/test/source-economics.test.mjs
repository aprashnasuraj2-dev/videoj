import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin,capacityExample} from '../pinned-investigation.js';
import {sourceDigest} from '../evidence-session.js';
import {sourceEconomicsExport,solveSourcePolicy} from '../source-economics.js';
import {pinnedInvestigationExport} from '../pinned-investigation.js';
import {economicsFixture} from '../examples/source-economics.mjs';
test('shared source acquisition: exact 4 -> 3 units; no evidence mutation',async()=>{
 const f=await economicsFixture(),r=await f.run();
 assert.deepEqual(r.comparison,{legacyDeclaredWorstCost:4,perFieldCounterfactualWorstCost:4,sharedAcquisitionWorstCost:3,avoidedCost:1});
 assert.equal(r.result.plan.sourceId,'bundle');
 const costs=[];function walk(p){if(p.kind==='observe'){costs.push([p.acquisitionCost,p.readCost]);p.branches.forEach(b=>walk(b.next));}}walk(r.result.plan);
 assert.deepEqual(costs,[[3,0],[0,0]]);
 assert.equal((await pinnedInvestigationExport(f.caseText,f.pin)).result.report.activeEvidence.length,0);
 assert.ok(Object.isFrozen(r.result.plan));
 const acquired=await f.run([],['bundle']);assert.equal(acquired.result.plan.worstCost,0);assert.equal(acquired.comparison.perFieldCounterfactualWorstCost,0);assert.equal(acquired.comparison.avoidedCost,0);
 const withdrawn=await f.run([{type:'withdraw_source',sourceId:'bundle'}],['bundle']);assert.equal(withdrawn.result.plan.worstCost,4);assert.ok(!withdrawn.availableObservationIds.some(x=>x.startsWith('bundle_')));
 const known=await f.run([f.reads.read_meter]);assert.equal(known.result.plan.worstCost,2);
 const invariant=await f.run([f.reads.read_meter,f.reads.read_capacity]);assert.equal(invariant.result.plan.worstCost,0);
});
test('fail closed cost pins, scope, missing/duplicate schedules, malformed costs',async()=>{
 const f=await economicsFixture(),r=await f.run();
 await assert.rejects(()=>sourceEconomicsExport(f.caseText,f.pin,'[]',r.economicText,'sha256:'+'0'.repeat(64)),/ECON_PIN_MISMATCH/);
 for(const mutate of [
  e=>({...e,eventDigest:'sha256:'+'0'.repeat(64)}),
  e=>({...e,costUnit:'dollars'}),
  e=>({...e,sourceCosts:e.sourceCosts.slice(1)}),
  e=>({...e,sourceCosts:e.sourceCosts.map((s,i)=>i?{...s,id:e.sourceCosts[0].id}:s)}),
  e=>({...e,fieldCosts:e.fieldCosts.map(s=>({...s,cost:-1}))}),
  e=>({...e,initiallyAcquired:['imaginary']}),
  e=>({...e,initiallyAcquired:['bundle','bundle']}),
  e=>({...e,unexpected:true}),
 ])await assert.rejects(()=>f.run([],[],mutate),/ECON_/);
});
test('indistinguishability and unresolved inputs are not resolved by cheap offers',()=>{
 const worlds=[{id:'a',decision:'constraint_satisfied'},{id:'b',decision:'constraint_refuted'}];
 const r=solveSourcePolicy(worlds,[{id:'t',sourceId:'s',readCost:0,outcomes:{a:'same',b:'same'}}],[{id:'s',cost:0}]);
 assert.equal(r.status,'insufficient_observations');assert.deepEqual(r.witness,['a','b']);
 assert.equal(solveSourcePolicy([{id:'a',decision:'unknown'}],[],[]).status,'unresolved_worlds');
 assert.equal(solveSourcePolicy([],[],[]).status,'inconsistent_observations');
});
// Independent oracle: enumerate sequences of unused tests with explicit
// acquisition sets and world arrays, no bitmask or memoized recurrence.
function brute(worlds,offers,sources,acquired){
 if(worlds.every(w=>w.decision===worlds[0].decision))return 0;
 let best=Infinity;
 for(const o of offers){
  const labels=new Set(worlds.map(w=>o.outcomes[w.id]));
  if(labels.size<2)continue;
  const next=new Set([...acquired,o.sourceId]);
  const cost=o.readCost+(acquired.has(o.sourceId)?0:sources.find(s=>s.id===o.sourceId).cost);
  const worst=Math.max(...[...labels].map(l=>brute(worlds.filter(w=>o.outcomes[w.id]===l),offers.filter(x=>x!==o),sources,next)));
  best=Math.min(best,cost+worst);
 }
 return best;
}
test('exhaustive independent oracle: 256 truth/partition/cost combinations with acquisition state',()=>{
 for(let k=0;k<256;k++){
  const worlds=Array.from({length:4},(_,i)=>({id:'w'+i,decision:(k>>i)&1?'constraint_satisfied':'constraint_refuted'}));
  const sources=[{id:'s0',cost:(k>>4)&3},{id:'s1',cost:(k>>6)&3}];
  const offers=[0,1,2].map((t)=>({id:'t'+t,sourceId:t===1?'s1':'s0',readCost:(k+t)%3,outcomes:Object.fromEntries(worlds.map((w,i)=>[w.id,'v'+(t===0?i&1:t===1?i>>1:(i^(i>>1))&1)]))}));
  const acquired=k&128?['s0']:[];
  const expected=brute(worlds,offers,sources,new Set(acquired));
  const actual=solveSourcePolicy(worlds,offers,sources,acquired);
  assert.equal(actual.plan?.worstCost??Infinity,expected,'case '+k);
  assert.ok(actual.statesEvaluated<=3072);
 }
});
