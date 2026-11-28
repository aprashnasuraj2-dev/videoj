import test from 'node:test';
import assert from 'node:assert/strict';
import {projectTaskRun,createResearchProjection,emptyGraph} from '../src/event-horizon/projection.js';
import {layoutGraph,identityStyle} from '../src/event-horizon/layout.js';
import {createExecutionJournal,createExecutionEmitter} from '../../../packages/sutra-runtime/execution-events.js';
function journalRun(count){
 const journal=createExecutionJournal();
 const emitter=createExecutionEmitter({runId:'dynamic_run',version:'version1',origin:'deterministic',publish:journal.accept});
 const tasks=Array.from({length:count},(_,i)=>({id:'task_'+i,kind:'compute',agentId:'specialist_'+i,dependsOn:i?['task_'+(i-1)]:[]}));
 assert.equal(emitter.emit('run.open',{tasks}),true);
 return {journal,emitter,tasks};
}
test('empty projection has zero agent instances and no fictional nodes',()=>{const g=emptyGraph();assert.equal(g.agentCount,0);assert.equal(g.nodes.length,0);assert.equal(g.edges.length,0);});
for(const n of [1,2,6,10,12,32,64])test('admitted task manifest projects '+n+' arbitrary participants',()=>{
 const {journal}=journalRun(n),g=projectTaskRun(journal.snapshot('dynamic_run'),journal.events('dynamic_run'));
 assert.equal(g.agentCount,n);assert.equal(g.nodes.length,2*n);assert.equal(g.edges.length,2*n-1);
 assert.equal(new Set(g.nodes.map(n=>n.key)).size,g.nodes.length);
 assert.ok(g.edges.every(e=>e.authority==='admitted manifest'));assert.equal(g.invocationCount,null);
});
test('one actor multiple active tasks; run-scoped stable keys',()=>{
 const j=createExecutionJournal(),e=createExecutionEmitter({runId:'r1',version:'v1',origin:'deterministic',publish:j.accept});
 assert.equal(e.emit('run.open',{tasks:['a','b'].map(id=>({id,kind:'compute',agentId:'shared',dependsOn:[]}))}),true);
 for(const id of ['a','b'])assert.equal(e.emit('task.state',{taskId:id,kind:'compute',agentId:'shared',status:'executing'}),true);
 let g=projectTaskRun(j.snapshot('r1'));assert.equal(g.agentCount,1);assert.equal(g.nodes.find(n=>n.kind==='agent').activeCount,2);
 assert.equal(e.emit('task.state',{taskId:'a',kind:'compute',agentId:'shared',status:'validating'}),true);
 assert.equal(e.emit('task.state',{taskId:'a',kind:'compute',agentId:'shared',status:'completed'}),true);
 g=projectTaskRun(j.snapshot('r1'));assert.equal(g.nodes.find(n=>n.kind==='agent').activeCount,1);assert.equal(g.nodes.find(n=>n.kind==='agent').status,'executing');
 const g2=projectTaskRun({...j.snapshot('r1'),runId:'r2'});assert.notEqual(g.nodes[0].key,g2.nodes[0].key);
});
test('browser ancestry uses actual unknown agent names, not role slots',()=>{
 const p=createResearchProjection();p.begin();
 const send=(id,parent,agent,operation,status)=>p.accept({kind:'browser.agent',id,parent,agent,operation,status},'browser_runtime');
 assert.equal(send('p',null,'novel_specialist','start'),true);
 assert.equal(send('c','p','novel_specialist','start'),true);
 assert.equal(send('c','p','novel_specialist','start'),false);
 assert.equal(send('c','p','other','end','ok'),false);
 assert.equal(send('c','p','novel_specialist','end','ok'),true);
 assert.equal(send('c','p','novel_specialist','end','ok'),false);
 const g=p.snapshot();assert.equal(g.agentCount,null);assert.equal(g.invocationCount,2);assert.equal(g.edges.length,1);assert.notEqual(g.nodes[0].key,g.nodes[1].key);assert.equal(g.nodes[0].status,'executing');
 p.end();assert.equal(p.snapshot().nodes[0].status,'unknown');assert.equal(send('late',null,'other','start'),false);
});
test('missing parent not replaced by imaginary agent',()=>{
 const p=createResearchProjection();p.begin();assert.equal(p.accept({kind:'browser.tool',id:'t',parent:'missing',tool:'source_read',operation:'start'},'browser_runtime'),true);
 assert.equal(p.snapshot().nodes.length,1);assert.equal(p.snapshot().edges.length,0);assert.equal(p.snapshot().invocationCount,0);
});
test('host events are operations and evidence, never fabricated communication',()=>{
 const p=createResearchProjection();p.begin();
 const send=(sequence,kind,fields={})=>p.accept({sessionId:'session',sequence,kind,...fields},'local_host_transport');
 assert.equal(send(1,'session.open'),true);
 assert.equal(send(2,'operation.pending',{operation:'search',role:'drone'}),true);
 assert.equal(send(3,'operation.completed',{operation:'search',role:'drone'}),true);
 assert.equal(send(4,'evidence.admitted',{sourceId:'src1',passages:2}),true);
 assert.equal(send(4,'evidence.admitted',{sourceId:'duplicate'}),false);
 assert.equal(send(6,'report.assembled'),false);
 assert.equal(send(5,'report.assembled'),true);
 const g=p.snapshot();assert.equal(g.nodes.length,2);assert.equal(g.edges.length,0);assert.equal(g.agentCount,null);assert.equal(g.nodes[0].status,'completed');
});
test('bounded projection and session isolation',()=>{
 const p=createResearchProjection({maxNodes:2,maxEvents:2});p.begin();
 for(let i=0;i<3;i++)p.accept({kind:'browser.agent',id:'i'+i,agent:'a',operation:'start'},'browser_runtime');
 assert.equal(p.snapshot().nodes.length,2);assert.match(p.snapshot().qualification,/limit reached/);
 assert.equal(p.accept({kind:'session.open',sessionId:'s',sequence:1},'local_host_transport'),false);
 const key=p.snapshot().nodes[0].key;p.end();p.begin();p.accept({kind:'browser.agent',id:'i0',agent:'a',operation:'start'},'browser_runtime');assert.notEqual(p.snapshot().nodes[0].key,key);
});
test('layout deterministic, preserves graph, contains every small graph node',()=>{
 const {journal}=journalRun(10),g=projectTaskRun(journal.snapshot('dynamic_run'));const original=JSON.stringify(g);
 for(const mode of ['auto','radial','layered','grid']){const p=layoutGraph(g,mode);assert.deepEqual(p,layoutGraph(g,mode));assert.equal(p.positions.length,g.nodes.length);assert.ok(p.positions.every(n=>n.x>=0&&n.x<=p.width&&n.y>=0&&n.y<=p.height));}
 assert.equal(JSON.stringify(g),original);assert.deepEqual(identityStyle(g.nodes[0]),identityStyle(g.nodes[0]));
});
test('large graph falls back to accessible list',()=>{const {journal}=journalRun(64);assert.equal(layoutGraph(projectTaskRun(journal.snapshot('dynamic_run')),'radial').mode,'list');});
