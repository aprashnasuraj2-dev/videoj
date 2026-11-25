import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateFrontier} from '../frontier.js';
import {frontierCase,demonstrateFrontier} from '../examples/frontier.mjs';
const graph=pass=>JSON.stringify({schemaVersion:1,nodes:[
 {id:'a',kind:'input',value:pass?'0':'2',dimension:[0,0,0],basis:'synthetic assumption'},
 {id:'b',kind:'input',value:'1',dimension:[0,0,0],basis:'synthetic limit'},
 {id:'c',kind:'constraint',op:'le',args:['a','b']}
]});
test('beam worlds evaluated by kernel; optimal adaptive plan and concrete impossibility witness',async()=>{
 const {result,insufficient}=await demonstrateFrontier();
 assert.equal(result.worlds.filter(w=>w.decision==='constraint_satisfied').length,1);
 assert.equal(result.plan.branches.find(b=>b.outcome==='low').next.kind,'decision');
 assert.equal(result.plan.branches.find(b=>b.outcome==='high').next.observationId,'measure_load');
 assert.deepEqual(insufficient.witness,['high_heavy','high_light']);
 assert.ok(result.worlds.every(w=>/^sha256:[a-f0-9]{64}$/.test(w.receiptDigest)));
 assert.ok(Object.isFrozen(result.plan.branches[0].next));
});
test('invariant decisions need zero observations; unknown result cannot be promoted',async()=>{
 const c=JSON.parse(frontierCase());c.worlds=c.worlds.filter(w=>w.id.startsWith('low'));c.observations=[];
 const r=await evaluateFrontier(JSON.stringify(c));assert.equal(r.status,'invariant_decision');assert.equal(r.plan.worstCost,0);
 const g=JSON.parse(c.worlds[0].graphText);g.nodes.find(n=>n.id==='E').value='0';c.worlds[0].graphText=JSON.stringify(g);
 const bad=await evaluateFrontier(JSON.stringify(c));assert.equal(bad.status,'unresolved_worlds');assert.equal(bad.plan,null);
});
test('closed admission rejects forged verdict, invalid cost and incomplete partition',async()=>{
 for(const mutate of [c=>c.worlds[0].decision='constraint_satisfied',c=>c.observations[0].cost=0,c=>delete c.observations[0].outcomes.low_light,c=>c.worlds[0].constraintId='E',c=>c.observations[0].outcomes.extra='x']){
  const c=JSON.parse(frontierCase());mutate(c);await assert.rejects(()=>evaluateFrontier(JSON.stringify(c)),/FRONTIER_PROFILE_REFUSED/);
 }
});
// Independent exhaustive recursive oracle with explicit remaining-test sets,
// not the kernel's memoized mask recurrence. Test deterministic small cases.
function brute(worlds,tests,decisions){
 if(worlds.every(w=>decisions[w]===decisions[worlds[0]]))return 0;
 let best=Infinity;
 for(const t of tests){
  const groups={};for(const w of worlds)(groups[t.outcomes[w]]??=[]).push(w);
  if(Object.keys(groups).length<2)continue;
  best=Math.min(best,t.cost+Math.max(...Object.values(groups).map(g=>brute(g,tests.filter(x=>x!==t),decisions))));
 }
 return best;
}
test('36 finite cases match independent exhaustive worst-cost oracle',async()=>{
 let seed=193;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed>>>8)%n;};
 for(let k=0;k<36;k++){
  const ids=['a','b','c','d','e'],decisions=Object.fromEntries(ids.map(i=>[i,rand(2)]));
  const observations=Array.from({length:4},(_,i)=>({id:'t'+i,cost:1+rand(9),outcomes:Object.fromEntries(ids.map(w=>[w,'v'+rand(3)]))}));
  const c={version:1,decisionId:'d',costUnit:'effort',worlds:ids.map(id=>({id,graphText:graph(Boolean(decisions[id])),constraintId:'c'})),observations};
  const r=await evaluateFrontier(JSON.stringify(c)),expected=brute(ids,observations,decisions);
  assert.equal(r.plan?.worstCost??Infinity,expected);
 }
});
