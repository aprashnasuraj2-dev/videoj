import test from 'node:test';
import assert from 'node:assert/strict';
import {debuggerBaseline,debuggerCopies,debuggerRead,evaluateConclusionDebugger} from '../conclusion-debugger.js';
import {rootImpactVerifiedState} from '../debugger-root-impact.js';
const run=events=>evaluateConclusionDebugger(JSON.stringify(events));
const readings=[['read_a','sample_one'],['read_b','sample_two'],['read_c','sample_three'],['read_control','sample_control']];
const claims=['target','control_ok'];
test('every root preview agrees with an actual exact-kernel withdrawal across all 108 configurations',async()=>{
 const reads=await Promise.all(readings.map(r=>debuggerRead(r[0]))),copies=await debuggerCopies();let configurations=0,comparisons=0;
 for(let n=0;n<81;n++){
  const statuses=Array.from({length:4},(_,i)=>Math.floor(n/3**i)%3),base=[];
  for(let i=0;i<4;i++){if(statuses[i]===1)base.push(reads[i]);if(statuses[i]===2)base.push({type:'withdraw_lineage',lineage:readings[i][1]});}
  for(const cloned of statuses[0]===1?[false,true]:[false]){
   const events=cloned?[...base,copies]:base,result=await run(events),impacts=rootImpactVerifiedState(result);
   assert.equal(impacts.length,result.declaredRoots);
   for(const impact of impacts){
    const removed=await run([...events,{type:'withdraw_lineage',lineage:impact.lineage}]);
    assert.deepEqual(impact.survivingWorlds,removed.claims.target.survivingWorlds);
    assert.deepEqual(impact.newlyAdmitted,removed.claims.target.survivingWorlds.filter(id=>!result.claims.target.survivingWorlds.includes(id)));
    assert.deepEqual(impact.artifacts.map(a=>a.id).sort(),result.activeArtifacts.filter(a=>!removed.activeArtifacts.some(b=>b.id===a.id)).map(a=>a.id).sort());
    for(const claim of claims)assert.deepEqual(impact.claims[claim],{state:removed.claims[claim].state,changed:removed.claims[claim].state!==result.claims[claim].state});
    comparisons++;
   }
   assert.deepEqual(await run(events),result,'preview must not mutate replayed state');configurations++;
  }
 }
 assert.equal(configurations,108);assert.equal(comparisons,162);
});
test('copied evidence is one group and unrelated control is not silently discarded',async()=>{
 const base=await debuggerBaseline(),result=await run([...base,await debuggerCopies()]);const groups=rootImpactVerifiedState(result),root=groups.find(g=>g.lineage==='sample_one'),control=groups.find(g=>g.lineage==='sample_control');
 assert.equal(root.artifacts.length,10);assert.equal(root.artifacts[0].id,'lab_a');assert.ok(root.artifacts.slice(1).every(a=>a.parent==='lab_a'));
 assert.deepEqual(root.claims,{target:{state:'UNDERDETERMINED',changed:true},control_ok:{state:'SUPPORTED',changed:false}});
 assert.deepEqual(control.claims,{target:{state:'SUPPORTED',changed:false},control_ok:{state:'UNDERDETERMINED',changed:true}});
 const wrong=structuredClone(result);wrong.activeArtifacts.find(a=>a.id==='copy_01').parent='lab_b';assert.throws(()=>rootImpactVerifiedState(wrong),/DISAGREEMENT/);
 const bad=structuredClone(result);bad.activeArtifacts.push({...bad.activeArtifacts[0]});assert.throws(()=>rootImpactVerifiedState(bad),/DISAGREEMENT/);
});
