import test from 'node:test';
import assert from 'node:assert/strict';
import {debuggerRead,debuggerCopies,debuggerBaseline} from '../conclusion-debugger.js';
import {evaluateAssumptionSensitivity,assumptionVariants,LIMITS} from '../debugger-assumptions.js';
const run=e=>evaluateAssumptionSensitivity(JSON.stringify(e));
const sources=[['read_a','sample_one',1,0],['read_b','sample_two',1,1],['read_c','sample_three',2,1],['read_control','sample_control',3,1]];
const worlds=Array.from({length:8},(_,i)=>'w'+i.toString(2).padStart(3,'0'));
const state=(ws,truth)=>!ws.length?'CONFLICTED':ws.every(truth)?'SUPPORTED':ws.every(w=>!truth(w))?'REFUTED':'UNDERDETERMINED';
const sum=w=>Number(w[1])+Number(w[2]);
test('all 108 configurations against a direct threshold truth table; unchanged control and evidence',async()=>{
 const reads=await Promise.all(sources.map(s=>debuggerRead(s[0]))),copies=await debuggerCopies();let count=0;
 for(let n=0;n<81;n++){
  const statuses=Array.from({length:4},(_,i)=>Math.floor(n/3**i)%3),active=sources.filter((_,i)=>statuses[i]===1),events=[];
  for(let i=0;i<4;i++){if(statuses[i]===1)events.push(reads[i]);if(statuses[i]===2)events.push({type:'withdraw_lineage',lineage:sources[i][1]});}
  const alive=worlds.filter(w=>active.every(s=>Number(w[s[2]])===s[3]));let original;
  for(const cloned of statuses[0]===1?[false,true]:[false]){
   const {result,sensitivity:s}=await run(cloned?[...events,copies]:events),baseline=state(alive,w=>sum(w)<=1);
   assert.equal(s.caseDigest,result.caseDigest);assert.equal(s.historyDigest,result.historyDigest);assert.equal(s.baselineLimit,'1/1');
   assert.deepEqual(s.boundaries,alive.length?{minSum:Math.min(...alive.map(sum))+'/1',maxSum:Math.max(...alive.map(sum))+'/1'}:null);
   assert.deepEqual(s.variants.map(v=>v.limit),LIMITS);assert.equal(s.variants[2].caseDigest,result.caseDigest);
   for(const [i,v] of s.variants.entries()){
    const truth=w=>2*sum(w)<=i;
    assert.equal(v.targetState,state(alive,truth));assert.equal(v.controlState,state(alive,w=>w[3]==='1'));assert.deepEqual(v.survivingWorlds,alive);
    assert.deepEqual(v.changedSurvivingWorlds,alive.filter(w=>truth(w)!==(sum(w)<=1)));
    assert.deepEqual(v.worlds.map(w=>w.target),worlds.map(w=>truth(w)?'constraint_satisfied':'constraint_refuted'));
   }
   const distances=s.variants.map((v,i)=>v.targetState===baseline?Infinity:Math.abs(i-2)),minimum=Math.min(...distances);
   assert.deepEqual(s.minimumSampledChange,Number.isFinite(minimum)?{halfUnits:minimum,limits:LIMITS.filter((_,i)=>distances[i]===minimum)}:null);
   if(cloned)assert.deepEqual(s.variants,original);else original=s.variants;count++;
  }
 }
 assert.equal(count,108);
});
test('counterexample shared one node: target change cannot alter control receipts; conflict cannot be fixed by limit',async()=>{
 const variants=await assumptionVariants(),base=variants[2];assert.equal(new Set(variants.map(v=>v.caseDigest)).size,5);
 for(const v of variants)for(const [i,w] of v.worlds.entries()){
  assert.equal(w.controlReceiptDigest,base.worlds[i].controlReceiptDigest);assert.deepEqual(w.observed,base.worlds[i].observed);
 }
 const baseline=await debuggerBaseline(),b=await debuggerRead('read_b'),c=await debuggerRead('read_c');
 const conflict=await run([...baseline,b]);assert.equal(conflict.sensitivity.boundaries,null);assert.ok(conflict.sensitivity.variants.every(v=>v.targetState==='CONFLICTED'));assert.equal(conflict.sensitivity.minimumSampledChange,null);
 const resolved=await run([...baseline,b,{type:'withdraw_lineage',lineage:'sample_one'},c]);assert.equal(resolved.result.claims.target.state,'REFUTED');
 assert.deepEqual(resolved.sensitivity.boundaries,{minSum:'2/1',maxSum:'2/1'});
 assert.deepEqual(resolved.sensitivity.minimumSampledChange,{halfUnits:2,limits:['2/1']});assert.equal(resolved.sensitivity.variants[4].targetState,'SUPPORTED');
 assert.equal(resolved.sensitivity.variants[4].controlState,'SUPPORTED');assert.deepEqual(resolved.sensitivity.variants[4].survivingWorlds,['w111']);
});
