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

import {exactMagnitude,conversionGraph,convertQuantity} from '../src/event-horizon/local-computation.js';
import {knowledgeProjection,knowledgeRelations,declaredLineageGroups} from '../src/event-horizon/knowledge-model.js';
import {localToolGraph} from '../src/event-horizon/projection.js';
test('exact input normalization without floating point',()=>{
 for(const [value,expected] of [['1000','1000'],['0.25','1/4'],['-0.5','-1/2'],['4/8','1/2'],['-0','0']])assert.equal(exactMagnitude(value),expected);
 for(const invalid of ['Infinity','NaN','1e5','1/0','1.','1/02','1+2','01','<script>','1'.repeat(51)])assert.throws(()=>exactMagnitude(invalid));
});
test('closed quantity graph rejects kind/unit mismatch',()=>{
 assert.throws(()=>conversionGraph({kind:'torque',value:'1',from:'J',to:'N*m'}));
 assert.throws(()=>conversionGraph({kind:'__proto__',value:'1',from:'m',to:'mm'}));
 assert.throws(()=>conversionGraph({kind:'length',value:'1',from:'cm',to:'kg'}));
 const graph=JSON.parse(conversionGraph({kind:'length',value:'1000',from:'mm',to:'m'}));assert.equal(graph.nodes.at(-1).op,'div');
});
for(const [kind,value,from,to,expected] of [
 ['length','1000','mm','m','1'],['length','-0.5','m','mm','-500'],['mass','250','g','kg','1/4'],
 ['duration','1','min','s','60'],['force','2.5','kN','N','2500'],['pressure','1000','kPa','MPa','1'],
 ['energy','1/2','kJ','J','500'],['torque','2','kN*m','N*m','2000'],['stress','2','GPa','MPa','2000']
])test('kernel conversion '+kind+' '+from+' → '+to,async()=>{
 const r=await convertQuantity({kind,value,from,to});assert.equal(r.value,expected);assert.match(r.digest,/^sha256:[a-f0-9]{64}$/);assert.ok(r.reportText.length>0);
});
test('local tool projection has no synthetic AI participant',()=>{
 const g=localToolGraph({id:'local_1',label:'Exact conversion',status:'completed'});assert.equal(g.agentCount,0);assert.equal(g.invocationCount,0);assert.equal(g.nodes.length,1);assert.equal(g.nodes[0].kind,'tool');
 assert.equal(localToolGraph({id:'local_1',label:'x',status:'fabricated'}),null);
});
test('knowledge projection preserves exact source spans and declared lineage',()=>{
 const workspace={question:'Compare quantities',sources:[{id:'a',lineage:'shared',text:'Value: 100'},{id:'b',lineage:'shared',text:'Copy: 100'}],bindings:[{id:'q1',sourceId:'a',start:7,end:10,type:{kind:'length',unit:'m',scope:'same'}}]};
 const model=knowledgeProjection(workspace);assert.equal(model.nodes.find(n=>n.key==='binding:q1').binding.quote,'100');assert.deepEqual(declaredLineageGroups(model),[{lineage:'shared',sources:['a','b']}]);const rel=knowledgeRelations(model,'source:a');assert.ok(rel.upstream.has('lineage:shared'));assert.ok(rel.downstream.has('binding:q1'));assert.equal(model.version,null);
});
