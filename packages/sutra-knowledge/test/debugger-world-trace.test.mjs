import test from 'node:test';
import assert from 'node:assert/strict';
import {debuggerRead,debuggerCopies,debuggerBaseline} from '../conclusion-debugger.js';
import {evaluateWorldTrace,traceVerifiedDebuggerState} from '../debugger-world-trace.js';
const run=events=>evaluateWorldTrace(JSON.stringify(events));
const readings=[['read_a','sample_one','a',0],['read_b','sample_two','a',1],['read_c','sample_three','b',1],['read_control','sample_control','c',1]];
const ids=Array.from({length:8},(_,i)=>'w'+i.toString(2).padStart(3,'0'));
const variableIndex={a:1,b:2,c:3};
test('world trace matches direct binary oracle, unique minimum blocker set and copy invariance over all 108 configurations',async()=>{
 const reads=await Promise.all(readings.map(r=>debuggerRead(r[0]))),copies=await debuggerCopies();let count=0;
 for(let n=0;n<81;n++){
  const statuses=Array.from({length:4},(_,i)=>Math.floor(n/3**i)%3),active=readings.filter((_,i)=>statuses[i]===1),events=[];
  for(let i=0;i<4;i++){if(statuses[i]===1)events.push(reads[i]);if(statuses[i]===2)events.push({type:'withdraw_lineage',lineage:readings[i][1]});}
  let original;
  for(const cloned of statuses[0]===1?[false,true]:[false]){
   const {result,trace}=await run(cloned?[...events,copies]:events);
   assert.deepEqual(trace.worlds.map(w=>w.id),ids);
   assert.equal(trace.historyDigest,result.historyDigest);assert.equal(trace.caseDigest,result.caseDigest);
   const expected=ids.map(id=>{
    const checks=active.map(([observationId,lineage,variable,value])=>({observationId,lineage,variable,expectedValue:id[variableIndex[variable]]+'/1',observedValue:value+'/1',compatible:Number(id[variableIndex[variable]])===value})).sort((a,b)=>a.observationId.localeCompare(b.observationId));
    const blockingRoots=checks.filter(c=>!c.compatible).map(c=>c.lineage).sort();
    return {id,assumptions:{a:id[1]+'/1',b:id[2]+'/1',c:id[3]+'/1'},decisions:{target:Number(id[1])+Number(id[2])<=1?'constraint_satisfied':'constraint_refuted',control_ok:id[3]==='1'?'constraint_satisfied':'constraint_refuted'},survives:!blockingRoots.length,blockingRoots,checks};
   });
   assert.deepEqual(trace.worlds,expected);
   // Test every removal subset: a world returns iff all its blockers are removed.
   for(let mask=0;mask<2**active.length;mask++){
    const removed=active.filter((_,i)=>mask&(1<<i)).map(r=>r[1]);
    for(const w of trace.worlds){const admitted=active.filter(r=>!removed.includes(r[1])).every(r=>Number(w.id[variableIndex[r[2]]])===r[3]);assert.equal(w.blockingRoots.every(r=>removed.includes(r)),admitted);}
   }
   if(cloned)assert.deepEqual(trace.worlds,original);else original=trace.worlds;
   count++;
  }
 }
 assert.equal(count,108);
});
test('contradiction, withdrawal and altered projection',async()=>{
 const baseline=await debuggerBaseline(),b=await debuggerRead('read_b');
 const {result,trace}=await run([...baseline,await debuggerCopies(),b]);
 assert.equal(trace.worlds.filter(w=>w.survives).length,0);
 assert.deepEqual(trace.worlds.find(w=>w.id==='w001').blockingRoots,['sample_two']);
 assert.deepEqual(trace.worlds.find(w=>w.id==='w111').blockingRoots,['sample_one']);
 const repaired=await run([...baseline,await debuggerCopies(),b,{type:'withdraw_lineage',lineage:'sample_one'}]);
 assert.deepEqual(repaired.trace.worlds.filter(w=>w.survives).map(w=>w.id),['w101','w111']);
 const bad=structuredClone(result);bad.projection.observations[0].mask^=1;assert.throws(()=>traceVerifiedDebuggerState(bad),/DISAGREEMENT/);
 const missing=structuredClone(result);missing.projection.observations.pop();assert.throws(()=>traceVerifiedDebuggerState(missing),/DISAGREEMENT/);
});
