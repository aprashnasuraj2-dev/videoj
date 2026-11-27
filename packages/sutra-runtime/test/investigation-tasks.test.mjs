import test from 'node:test';
import assert from 'node:assert/strict';
import {compileTaskGraph,runTaskGraph} from '../investigation-tasks.js';
const t=(id,dependsOn=[],kind='local')=>({id,kind,agentId:'planner',dependsOn});
const handler=(execute,admit=x=>x)=>({execute,admit});
const cfg=(tasks,handlers,extra={})=>({tasks,handlers,runId:'run',version:'draft:1',...extra});
test('DAG validates topology before executing any handler; rejects missing and cyclic dependencies',()=>{
 const h={local:handler(()=>1)};
 assert.deepEqual(compileTaskGraph([t('b',['a']),t('a')],h).order.map(x=>x.id),['a','b']);
 for(const tasks of [[t('a',['b'])],[t('a',['b']),t('b',['a'])],[t('a'),t('a')],[t('a',Array(1))]])assert.throws(()=>compileTaskGraph(tasks,h));
});
test('dependencies receive immutable admitted artifacts; concurrency bounded and unrelated failures isolated',async()=>{
 let active=0,peak=0;const events=[];
 const h={local:handler(async({task,inputs})=>{active++;peak=Math.max(peak,active);await Promise.resolve();active--;if(task.id==='bad')throw Error('private');return inputs.length?inputs[0].value+1:1;},v=>{assert.equal(typeof v,'number');return v;})};
 const r=await runTaskGraph(cfg([t('a'),t('b',['a']),t('bad'),t('blocked',['bad']),t('independent')],h,{concurrency:2,onEvent:e=>events.push(e)}));
 assert.equal(r.status,'partial');assert.equal(peak,2);assert.deepEqual(r.artifacts.map(x=>[x.taskId,x.value]),[['a',1],['b',2],['independent',1]]);
 assert.equal(r.tasks.find(x=>x.id==='blocked').status,'blocked');assert.equal(events.some(e=>JSON.stringify(e).includes('private')),false);assert.equal(Object.isFrozen(r.artifacts[0]),true);
});
test('late result after cancellation is never admitted or sent to a dependent task',async()=>{
 let release,entered,admitted=0;const gate=new Promise(r=>entered=r),controller=new AbortController(),events=[];
 const pending=runTaskGraph(cfg([t('a'),t('b',['a'])],{local:handler(()=>{entered();return new Promise(r=>release=r)},x=>{admitted++;return x})},{signal:controller.signal,onEvent:e=>events.push(e)}));
 await gate;controller.abort();const r=await pending;assert.equal(r.status,'cancelled');assert.deepEqual(r.artifacts,[]);const count=events.length;release(1);await new Promise(r=>setImmediate(r));assert.equal(admitted,0);assert.equal(events.length,count);
});
test('stale version refuses admission and discards partial artifacts',async()=>{
 let current=true;
 const r=await runTaskGraph(cfg([t('a'),t('b',['a'])],{local:handler(({task})=>{if(task.id==='b')current=false;return 1})},{assertCurrent:()=>{if(!current)throw Error('stale')}}));
 assert.equal(r.status,'stale');assert.deepEqual(r.artifacts,[]);
});
test('admission rejects executable or oversized artifacts, then blocks dependent work',async()=>{
 let getter=0;
 const r=await runTaskGraph(cfg([t('a'),t('b',['a'])],{local:handler(()=>({get secret(){getter++;return 1}}))}));
 assert.equal(getter,0);assert.equal(r.tasks[0].status,'failed');assert.equal(r.tasks[1].status,'blocked');
});
test('deadline returns without waiting for an uncooperative handler',async()=>{
 const r=await runTaskGraph(cfg([t('a')],{local:handler(()=>new Promise(()=>{}))},{timeoutMs:5}));
 assert.equal(r.status,'timeout');assert.deepEqual(r.artifacts,[]);
});
