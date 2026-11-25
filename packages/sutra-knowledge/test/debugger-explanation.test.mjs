import test from 'node:test';
import assert from 'node:assert/strict';
import {debuggerRead,debuggerCopies,debuggerBaseline} from '../conclusion-debugger.js';
import {evaluateDebuggerExplanation} from '../debugger-explanation.js';
const run=events=>evaluateDebuggerExplanation(JSON.stringify(events));
const sources=[['read_a','sample_one','lab_a',0,0],['read_b','sample_two','lab_b',0,1],['read_c','sample_three','lab_c',1,1],['read_control','sample_control','lab_control',2,1]];
const worldIds=Array.from({length:8},(_,i)=>'w'+i.toString(2).padStart(3,'0'));
const claims=['target','control_ok'];
const truth=(id,w)=>id==='target'?Number(w[1])+Number(w[2])<=1:w[3]==='1';
const state=(id,worlds)=>worlds.length===0?'CONFLICTED':worlds.every(w=>truth(id,w))?'SUPPORTED':worlds.every(w=>!truth(id,w))?'REFUTED':'UNDERDETERMINED';
const subset=(a,b)=>a.every(x=>b.includes(x));
const subsets=xs=>xs.reduce((a,x)=>[...a,...a.map(y=>[...y,x])],[[]]).sort((a,b)=>a.length-b.length||(a.join('|')<b.join('|')?-1:a.join('|')>b.join('|')?1:0));
function oracle(statuses){
 const active=sources.filter((_,i)=>statuses[i]===1),blocked=sources.filter((_,i)=>statuses[i]===2),available=sources.filter((_,i)=>statuses[i]===0);
 const alive=roots=>worldIds.filter(w=>active.filter(s=>roots.includes(s[1])).every(s=>Number(w[s[3]+1])===s[4]));
 const roots=active.map(s=>s[1]).sort(),worlds=alive(roots),global=Object.fromEntries(claims.map(id=>[id,{state:state(id,worlds),survivingWorlds:worlds}]));
 const support=Object.fromEntries(claims.map(id=>[id,{globalState:global[id].state,conditionalSupport:[],conditionalRefutation:[]}]));
 const conflicts=[];
 for(const r of subsets(roots)){
  const w=alive(r);
  if(!w.length){if(!conflicts.some(c=>subset(c,r)))conflicts.push(r);continue;}
  for(const id of claims){const s=state(id,w),key=s==='SUPPORTED'?'conditionalSupport':s==='REFUTED'?'conditionalRefutation':null;
   if(key&&!support[id][key].some(x=>subset(x.roots,r)))support[id][key].push({roots:r,survivingWorlds:w});}
 }
 const changes=subsets(roots).filter(r=>r.length&&state('target',alive(roots.filter(x=>!r.includes(x))))!==global.target.state);
 const cuts=['SUPPORTED','REFUTED','CONFLICTED'].includes(global.target.state)&&changes.length?changes.filter(r=>r.length===changes[0].length):[];
 const av=available.map(s=>s[0]),a=worlds.length&&new Set(worlds.map(w=>w[1])).size===1?worlds[0][1]:null,b=worlds.length&&new Set(worlds.map(w=>w[2])).size===1?worlds[0][2]:null;
 let plan=null;
 if(global.target.state==='UNDERDETERMINED'){
  const readA=['read_a','read_b'].find(x=>av.includes(x)),readB=av.includes('read_c');
  if(a===null&&b===null&&readA&&readB)plan={id:readA,cost:1,worstCost:4,bestCost:1};
  else if(a===null&&b==='1'&&readA)plan={id:readA,cost:1,worstCost:1,bestCost:1};
  else if(a==='1'&&b===null&&readB)plan={id:'read_c',cost:3,worstCost:3,bestCost:3};
 }
 return {active,blocked,worlds,global,support,conflicts,cuts,plan,available};
}
test('exhaustive fixture states: independent truth table, support, repairs and optimal observation cost',async()=>{
 let count=0;
 const reads=await Promise.all(sources.map(s=>debuggerRead(s[0]))),copies=await debuggerCopies();
 for(let n=0;n<81;n++){
  const statuses=Array.from({length:4},(_,i)=>Math.floor(n/3**i)%3),o=oracle(statuses);
  const events=[];for(let i=0;i<4;i++){if(statuses[i]===1)events.push(reads[i]);if(statuses[i]===2)events.push({type:'withdraw_lineage',lineage:sources[i][1]});}
  for(const cloned of statuses[0]===1?[false,true]:[false]){
   const {result,explanation}=await run(cloned?[...events,copies]:events);
   assert.deepEqual(result.claims,o.global,'global '+n);assert.deepEqual(explanation.claims,o.support,'conditional '+n);
   assert.deepEqual(explanation.minimalConflicts,o.conflicts,'conflicts '+n);
   assert.deepEqual(result.diagnostics.minimumCuts.map(c=>c.removed),o.cuts,'cuts '+n);
   assert.deepEqual(result.nextObservation,o.plan,'plan '+n);
   assert.equal(result.declaredRoots,o.active.length);assert.equal(result.activeArtifacts.length,o.active.length+(cloned?9:0));
   if(o.plan){assert.equal(explanation.next.kind,'observe');assert.equal(explanation.next.observationId,o.plan.id);}
   else if(o.global.target.state==='UNDERDETERMINED'){
    assert.equal(explanation.next.kind,'impossible_with_available_observations');
    const [a,b]=explanation.next.witness;assert.ok(o.worlds.includes(a)&&o.worlds.includes(b));assert.notEqual(truth('target',a),truth('target',b));
    for(const s of o.available)assert.equal(a[s[3]+1],b[s[3]+1]);
   }else if(o.global.target.state==='CONFLICTED')assert.equal(explanation.next.kind,'adjudicate_conflict');
   else assert.equal(explanation.next.kind,'decision');
   count++;
  }
 }
 assert.equal(count,108);
});
test('global conflict never erases or overstates conditional control support; opposite subsets remain visible',async()=>{
 const baseline=await debuggerBaseline(),copies=await debuggerCopies(),readB=await debuggerRead('read_b'),readC=await debuggerRead('read_c');
 const {result,explanation}=await run([...baseline,copies,readB,readC]);
 assert.equal(result.claims.target.state,'CONFLICTED');assert.equal(result.claims.control_ok.state,'CONFLICTED');
 assert.deepEqual(explanation.claims.target.conditionalSupport.map(x=>x.roots),[['sample_one']]);
 assert.deepEqual(explanation.claims.target.conditionalRefutation.map(x=>x.roots),[['sample_three','sample_two']]);
 assert.deepEqual(explanation.claims.control_ok.conditionalSupport.map(x=>x.roots),[['sample_control']]);
 assert.deepEqual(explanation.minimalConflicts,[['sample_one','sample_two']]);
 assert.equal(explanation.next.kind,'adjudicate_conflict');assert.equal(explanation.next.minimumRepairs.length,2);
 assert.ok(explanation.qualification.includes('not authorization'));
});
