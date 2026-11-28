import test from 'node:test';
import assert from 'node:assert/strict';
import {createExecutionEmitter,createExecutionJournal} from '../execution-events.js';
import {runTaskGraph} from '../investigation-tasks.js';
const t=(id,dependsOn=[],agentId='planner')=>({id,kind:'local',agentId,dependsOn});
const setup=(journal,runId='run',origin='deterministic',version='draft:1')=>createExecutionEmitter({runId,version,origin,publish:e=>assert.equal(journal.accept(e),true)});
const state=(e,id,status,agentId='planner')=>e.emit('task.state',{taskId:id,agentId,kind:'local',status});
test('task DAG emits one canonical bounded stream, with real dependencies and terminal state',async()=>{
 const j=createExecutionJournal(),observed=[];
 j.subscribe((e,s)=>{observed.push([e.type,e.sequence,s.status]);assert.ok(Object.isFrozen(e.payload));});
 const r=await runTaskGraph({tasks:[t('a'),t('b',['a'],'critic')],handlers:{local:{execute:({inputs})=>inputs.length?inputs[0].value+1:1,admit:x=>x}},runId:'run',version:'draft:1',executionOrigin:'deterministic',onExecutionEvent:e=>assert.equal(j.accept(e),true)});
 assert.equal(r.status,'completed');assert.equal(j.snapshot('run').status,'completed');assert.equal(j.snapshot('run').agents[1].completed,1);assert.equal(observed.length,8);assert.deepEqual(observed.map(x=>x[1]),[1,2,3,4,5,6,7,8]);
});
test('refuse gaps, invalid dependencies, forged fields, foreign versions and post-terminal events without mutation',()=>{
 const j=createExecutionJournal(),e=setup(j);e.emit('run.open',{tasks:[t('a'),t('b',['a'])]});
 const bad=(p,extra={})=>({schema:'sutra-execution-event/v1',runId:'run',version:'draft:1',origin:'deterministic',sequence:2,type:'task.state',payload:p,...extra});
 const p={taskId:'a',agentId:'planner',kind:'local',status:'executing'};
 for(const x of [bad({...p,taskId:'b'}),bad({...p,secret:'x'}),bad(p,{sequence:3}),bad(p,{version:'draft:2'}),bad({...p,status:'completed'})])assert.equal(j.accept(x),false);
 let read=0;const hostile={...p,get status(){read++;return 'executing'}};assert.equal(j.accept(bad(hostile)),false);assert.equal(read,0);
 state(e,'a','executing');state(e,'a','validating');state(e,'a','completed');state(e,'b','cancelled');e.emit('run.close',{status:'cancelled'});
 assert.equal(j.accept({...bad(p),sequence:7}),false);assert.equal(j.events('run').length,6);
});
test('council transport is not admission, delayed older round does not regress the slot',()=>{
 const j=createExecutionJournal(),e=setup(j,'council','local-scripted');e.emit('run.open',{agents:['one','two']});
 const phase=(phase,round)=>e.emit('council.phase',{agentId:'one',round,phase});
 phase('request',1);phase('response',1);assert.equal(j.snapshot('council').agents[0].proposals,0);
 phase('request',2);phase('proposal',1);assert.equal(j.snapshot('council').agents[0].status,'working');
 phase('response',2);phase('proposal',2);e.emit('run.close',{status:'completed'});
 assert.equal(j.snapshot('council').agents[0].proposals,2);assert.equal(j.snapshot('council').agents[1].status,'not-run');
});
test('subscriber exceptions and reentrancy cannot reorder notifications; bounded completed-run eviction',()=>{
 const j=createExecutionJournal({maxRuns:1}),e=setup(j),seen=[];
 j.subscribe(x=>{if(x.type==='run.open')state(e,'a','executing');throw Error('observer');});j.subscribe(x=>seen.push(x.sequence));
 e.emit('run.open',{tasks:[t('a')]});state(e,'a','cancelled');e.emit('run.close',{status:'cancelled'});
 assert.deepEqual(seen,[1,2,3,4]);const n=setup(j,'new');n.emit('run.open',{tasks:[t('b')]});assert.equal(j.snapshot('run'),null);
 const old=j.events('new')[0];assert.equal(j.accept({...old,runId:'run'}),false);
});
test('real abort closes stream with no late admission even if handler ignores signal',async()=>{
 const j=createExecutionJournal(),ac=new AbortController();let release,enter;const ready=new Promise(r=>enter=r);
 const p=runTaskGraph({tasks:[t('a')],handlers:{local:{execute:()=>{enter();return new Promise(r=>release=r)},admit:x=>x}},runId:'run',version:'draft:1',signal:ac.signal,onExecutionEvent:e=>assert.equal(j.accept(e),true)});
 await ready;ac.abort();const result=await p;assert.equal(result.status,'cancelled');assert.equal(j.snapshot('run').status,'cancelled');const n=j.events('run').length;release(1);await Promise.resolve();await Promise.resolve();assert.equal(j.events('run').length,n);
});

test('provider phase admission rejects simultaneous recipients, consent denial bypass and post-attempt fallback without a sequence gap',()=>{
 const j=createExecutionJournal(),e=setup(j,'provider','authorized-provider');e.emit('run.open',{tasks:[t('a')]});state(e,'a','executing');
 const planPin='sha256:'+'a'.repeat(64),phase=(routeId,phase)=>e.emit('provider.phase',{taskId:'a',agentId:'planner',kind:'local',routeId,planPin,phase});
 assert.equal(phase('local','consent-requested'),true);assert.equal(phase('remote','consent-requested'),false);assert.equal(phase('local','consent-denied'),true);assert.equal(phase('remote','consent-requested'),false);
 state(e,'a','failed');e.emit('run.close',{status:'partial'});assert.equal(j.snapshot('provider').status,'partial');assert.deepEqual(j.events('provider').map(e=>e.sequence),[1,2,3,4,5,6]);
 const f=setup(j,'other','authorized-provider');f.emit('run.open',{tasks:[t('a')]});state(f,'a','executing');
 const note=(routeId,phase)=>f.emit('provider.phase',{taskId:'a',agentId:'planner',kind:'local',routeId,planPin,phase});
 note('local','consent-requested');note('local','consent-granted');note('local','dispatch-attempt');assert.equal(note('remote','consent-requested'),false);note('local','refused');state(f,'a','failed');f.emit('run.close',{status:'partial'});
 assert.equal(j.snapshot('other').status,'partial');
});

test('hybrid consultation slots require running owner, exact plan, ordered rounds and distinct final admission',()=>{
 const j=createExecutionJournal(),e=setup(j,'hybrid','host-task'),task={id:'consult',kind:'model_consult',agentId:'critic',dependsOn:[]};
 const state=status=>e.emit('task.state',{taskId:task.id,agentId:task.agentId,kind:task.kind,status});
 const planPin='sha256:'+'a'.repeat(64),note=(phase,extra={})=>e.emit('consultation.phase',{taskId:task.id,agentId:task.agentId,kind:task.kind,slotId:'one',round:1,planPin,phase,...extra});
 e.emit('run.open',{tasks:[task]});assert.equal(note('dispatch-attempt'),false);state('executing');
 assert.equal(note('transport-response'),false);assert.equal(note('dispatch-attempt',{round:2}),false);
 assert.equal(note('dispatch-attempt'),true);assert.equal(note('proposal-admitted'),false);
 assert.equal(note('transport-response',{planPin:'sha256:'+'b'.repeat(64)}),false);
 assert.equal(note('transport-response'),true);assert.equal(note('proposal-admitted'),true);assert.equal(note('rejected'),false);
 assert.equal(note('dispatch-attempt',{round:2}),true);assert.equal(note('rejected',{round:2}),true);assert.equal(note('dispatch-attempt',{round:3}),false);
 for(const slotId of ['two','three','four','five','six'])assert.equal(note('rejected',{slotId}),true);
 assert.equal(note('rejected',{slotId:'seven'}),false);
 state('validating');assert.equal(note('dispatch-attempt',{slotId:'two',round:2}),false);state('completed');e.emit('run.close',{status:'completed'});
 assert.equal(j.snapshot('hybrid').tasks[0].consultationSlots.length,7);assert.equal(j.snapshot('hybrid').status,'completed');assert.equal(note('rejected',{slotId:'seven'}),false);
});
