import test from 'node:test';
import assert from 'node:assert/strict';
import {runTaskGraph} from '../investigation-tasks.js';
import {createExecutionJournal} from '../execution-events.js';
const turn=()=>new Promise(r=>setImmediate(r));
const rand=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
function fixture(seed){
 const rng=rand(seed),tasks=[],faults=new Set();
 for(let i=0;i<64;i++){
  const deps=[];
  for(let j=0;j<i;j++)if(deps.length<4&&rng()<.11)deps.push('t'+j);
  tasks.push({id:'t'+i,kind:'compute',agentId:'agent_'+Math.floor(rng()*6),dependsOn:deps});
  if(rng()<.09)faults.add('t'+i);
 }
 return {tasks,faults};
}
function oracle(tasks,faults){
 const states=new Map(),values=new Map();
 for(const t of tasks){
  const status=t.dependsOn.some(d=>states.get(d)!=='completed')?'blocked':faults.has(t.id)?'failed':'completed';
  states.set(t.id,status);
  if(status==='completed')values.set(t.id,(Number(t.id.slice(1))+1+t.dependsOn.reduce((n,d)=>n+values.get(d),0))%1000003);
 }
 return {states,values};
}
test('32 seeded maximum-size DAGs agree with independent failure/propagation oracle; actual concurrency and journal order bounded',async()=>{
 let total=0,executed=0,blocked=0,failed=0,peakGlobal=0;
 for(let seed=1;seed<=32;seed++){
  const {tasks,faults}=fixture(seed),expected=oracle(tasks,faults),j=createExecutionJournal(),events=[],rejected=[],activeByAgent=new Map(),attempts=new Map();
  let active=0,peak=0,agentPeak=0;
  const h={compute:{async execute({task,inputs}){
   attempts.set(task.id,(attempts.get(task.id)??0)+1);active++;peak=Math.max(peak,active);
   const a=(activeByAgent.get(task.agentId)??0)+1;activeByAgent.set(task.agentId,a);agentPeak=Math.max(agentPeak,a);
   try{await turn();if(faults.has(task.id))throw Error('injected fault');
    assert.deepEqual(inputs.map(x=>x.taskId),task.dependsOn);assert.ok(inputs.every(Object.isFrozen));
    return (Number(task.id.slice(1))+1+inputs.reduce((n,x)=>n+x.value,0))%1000003;
   }finally{active--;activeByAgent.set(task.agentId,activeByAgent.get(task.agentId)-1);}
  },admit:v=>{if(!Number.isSafeInteger(v))throw Error('value');return v;}}};
  // A throwing observer cannot influence the scheduler; second observer still
  // sees the canonical events. Collect rejection counts outside callbacks.
  j.subscribe(()=>{throw Error('observer fault');});j.subscribe(e=>events.push(e));
  const r=await runTaskGraph({tasks,handlers:h,runId:'stress_'+seed,version:'draft:stress',concurrency:8,maxPerAgent:2,timeoutMs:10000,onExecutionEvent:e=>{if(!j.accept(e))rejected.push(e);}});
  assert.deepEqual(rejected,[]);assert.equal(active,0);assert.ok(peak<=8);assert.ok(agentPeak<=2);peakGlobal=Math.max(peakGlobal,peak);
  assert.deepEqual(r.tasks.map(t=>[t.id,t.status]),[...expected.states]);assert.deepEqual(r.artifacts.map(a=>[a.taskId,a.value]),[...expected.values]);
  assert.ok([...attempts.values()].every(n=>n===1));assert.equal(r.status,faults.size?'partial':'completed');
  assert.equal(j.snapshot(r.runId).status,r.status);assert.deepEqual(events.map(e=>e.sequence),events.map((_,i)=>i+1));
  total+=tasks.length;executed+=attempts.size;blocked+=r.tasks.filter(t=>t.status==='blocked').length;failed+=r.tasks.filter(t=>t.status==='failed').length;
 }
 assert.equal(total,2048);assert.equal(executed+blocked,total);assert.ok(failed>0&&blocked>0&&peakGlobal>1);
 console.log(JSON.stringify({seededDags:32,tasks:total,executed,blocked,failed,peakGlobal,globalCap:8,perAgentCap:2}));
});
test('eight in-flight tasks with mixed late resolves/rejects cannot publish after abort or release dependents',async()=>{
 const c=new AbortController(),gates=[],events=[],j=createExecutionJournal();let entered,admitted=0,dependentCalls=0;
 const ready=new Promise(r=>entered=r);
 const roots=Array.from({length:8},(_,i)=>({id:'root_'+i,kind:'slow',agentId:'a'+i,dependsOn:[]}));
 const tasks=[...roots,{id:'join',kind:'join',agentId:'joiner',dependsOn:roots.map(t=>t.id)}];
 const p=runTaskGraph({tasks,handlers:{slow:{execute:()=>new Promise((resolve,reject)=>{gates.push({resolve,reject});if(gates.length===8)entered();}),admit:v=>{admitted++;return v;}},join:{execute:()=>{dependentCalls++;return 1;},admit:v=>v}},runId:'cancel_stress',version:'draft:stress',concurrency:8,signal:c.signal,onExecutionEvent:e=>{events.push(e);j.accept(e);}});
 await ready;c.abort();const result=await p,n=events.length;
 assert.equal(result.status,'cancelled');assert.deepEqual(result.artifacts,[]);assert.equal(j.snapshot(result.runId).status,'cancelled');
 gates.forEach((g,i)=>i%2?g.reject(Error('late failure')):g.resolve(i));await turn();await turn();
 assert.equal(admitted,0);assert.equal(dependentCalls,0);assert.equal(events.length,n);
});
test('abort from synchronous event subscriber fences all subsequent handler invocations and no duplicate sequences',async()=>{
 const c=new AbortController(),j=createExecutionJournal(),tasks=Array.from({length:64},(_,i)=>({id:'t'+i,kind:'work',agentId:'a'+(i%6),dependsOn:[]}));
 let calls=0;const events=[];
 j.subscribe(e=>{if(e.type==='task.state'&&e.payload.status==='executing')c.abort();});j.subscribe(e=>events.push(e));
 const result=await runTaskGraph({tasks,handlers:{work:{execute:()=>{calls++;return 1;},admit:v=>v}},runId:'subscriber_abort',version:'draft:stress',concurrency:8,signal:c.signal,onExecutionEvent:e=>j.accept(e)});
 assert.equal(calls,0);assert.equal(result.status,'cancelled');assert.equal(result.tasks.filter(t=>t.status==='cancelled').length,64);
 assert.deepEqual(events.map(e=>e.sequence),events.map((_,i)=>i+1));assert.equal(j.snapshot(result.runId).status,'cancelled');
});
