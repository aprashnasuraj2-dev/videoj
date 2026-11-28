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

import {capabilityCatalog,composeAlternatives} from '../src/event-horizon/capabilities.js';
import {admittedStaticUrl,inspectManifest,staticInspectorFetch,inspectImportedNetwork,readPublishedIndex,inspectPublishedNetwork} from '../src/event-horizon/passports.js';
test('capability composition prefers no-model direct computation and leaves gaps explicit',()=>{
 const a=composeAlternatives(['exact_quantity']);assert.equal(a.alternatives[0].workflows[0].id,'direct_compute');assert.equal(a.alternatives[0].definitions,0);
 const b=composeAlternatives(['exact_quantity','peer_critique'],{allowPeer:false});assert.deepEqual(b.missing,['peer_critique']);assert.equal(b.alternatives[0].coverage,'partial');
 const c=composeAlternatives(['candidate_plan','challenge'],{allowModel:false,allowHost:false});assert.equal(c.alternatives.length,0);assert.equal(c.missing.length,2);
 assert.throws(()=>composeAlternatives(['constructor']));assert.throws(()=>composeAlternatives(['exact_quantity','exact_quantity']));
});
test('composition alternatives are coverage complete and inclusion minimal across every capability subset',()=>{
 const ids=capabilityCatalog.map(c=>c.id);
 for(let mask=0;mask<(1<<ids.length);mask++){
  const requirements=ids.filter((_,i)=>mask&(1<<i)),result=composeAlternatives(requirements,{allowPeer:true});
  for(const a of result.alternatives){
   assert.ok(requirements.filter(x=>!result.missing.includes(x)).every(x=>a.workflows.some(w=>w.capabilities.includes(x))));
   for(const w of a.workflows)assert.ok(requirements.some(x=>w.capabilities.includes(x)&&!a.workflows.some(o=>o!==w&&o.capabilities.includes(x))));
  }
 }
});
const passportOrigin='https://caller.example';
const agentDef=name=>({name,function:{description:'Bounded candidate '+name,parameters:{type:'object',properties:{request:{type:'string',minLength:1,maxLength:100}},required:['request'],additionalProperties:false}},instructions:'Return a bounded candidate. No factual verification.',tools:[]});
test('static artifact boundary refuses credential, route, redirect and cross-origin attempts',()=>{
 assert.equal(admittedStaticUrl('./investigation.network.json',passportOrigin),passportOrigin+'/agents/investigation.network.json');
 for(const u of ['/api/private','https://peer.example/agents/agent-manifest.json','./../api/private','./a.network.json?key=x','./a.network.json#x','https://user:pass@caller.example/agents/a.network.json'])assert.throws(()=>admittedStaticUrl(u,passportOrigin));
 let contacts=0;const f=staticInspectorFetch(passportOrigin,()=>{contacts++;});
 assert.throws(()=>f(passportOrigin+'/agents/agent-manifest.json',{method:'GET',credentials:'include',redirect:'error',referrerPolicy:'no-referrer',referrer:''}));assert.equal(contacts,0);
});
test('manifest index supports arbitrary exact network names; refuses duplicate and unsafe artifacts',()=>{
 const n={name:'custom_science',front_man:'specialist',hocon:'./custom.network.json'};
 assert.equal(inspectManifest({networks:[n]},passportOrigin).networks[0].name,'custom_science');
 assert.throws(()=>inspectManifest({networks:[n,n]},passportOrigin));assert.throws(()=>inspectManifest({networks:[{...n,hocon:'/api/model'}]},passportOrigin));
});
test('ten-definition local import compiled without a fixed role cast, no execution',async()=>{
 const agents=Array.from({length:10},(_,i)=>agentDef('specialist_'+i));agents[0].tools=agents.slice(1).map(a=>a.name);
 const bytes=new TextEncoder().encode(JSON.stringify({metadata:{description:'Ten definitions'},max_steps:2,tools:agents}));
 const p=await inspectImportedNetwork(bytes,{front:'specialist_0'});assert.equal(p.definitionCount,10);assert.equal(p.edges.length,9);assert.equal(p.origin,null);assert.match(p.digests.definition,/^sha256:[0-9a-f]{64}$/);
 const cycle={metadata:{description:'Cycle'},tools:[{...agentDef('a'),tools:['b']},{...agentDef('b'),tools:['a']}]};
 await assert.rejects(inspectImportedNetwork(new TextEncoder().encode(JSON.stringify(cycle)),{front:'a'}));
 const external={metadata:{description:'Unapproved external'},tools:[{...agentDef('a'),tools:['https://peer.example/agents/p']}]};
 await assert.rejects(inspectImportedNetwork(new TextEncoder().encode(JSON.stringify(external)),{front:'a'}));
});
test('publisher inspection reads only static JSON with credentialless GET and records exact digests',async()=>{
 const calls=[],manifest={networks:[{name:'custom',front_man:'specialist',hocon:'./custom.network.json'}]},definition={metadata:{description:'Single definition'},tools:[agentDef('specialist')]};
 const fetchImpl=async(url,init)=>{calls.push(url);assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');assert.equal(init.method,'GET');return new Response(JSON.stringify(url.endsWith('agent-manifest.json')?manifest:definition),{headers:{'Content-Type':'application/json'}});};
 const i=await readPublishedIndex(passportOrigin,{fetchImpl});assert.equal(i.networks.length,1);assert.equal(calls.length,1);
 const p=await inspectPublishedNetwork(passportOrigin,'custom',{fetchImpl});assert.equal(p.definitionCount,1);assert.match(p.digests.definition,/^sha256:[0-9a-f]{64}$/);assert.equal(calls.length,3);
});

import {fitViewport,zoomViewport,panViewport,centerViewport,viewBox,entityPage,projectGraphFilter} from '../src/event-horizon/navigation.js';
import {replayJournalPrefix} from '../src/event-horizon/replay.js';
test('viewport operations are finite, clamped and reversible at fit',()=>{
 const initial=fitViewport(720,420);let v=initial;
 for(let i=0;i<100;i++){v=zoomViewport(v,1.5);v=panViewport(v,100000,-100000);}
 assert.equal(v.zoom,5);assert.ok(v.x<=720&&v.y>=-420);assert.match(viewBox(v),/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/);
 const centered=centerViewport(v,360,210);assert.ok(Math.abs(centered.x+centered.width/2-360)<1e-8);
 v=zoomViewport(centered,.01);assert.equal(v.zoom,1);assert.deepEqual(v,initial);assert.throws(()=>zoomViewport(v,NaN));assert.throws(()=>panViewport(v,Infinity,0));
});
test('bounded entity pagination preserves all 500 entities and never hides filter matches',()=>{
 const nodes=Array.from({length:500},(_,i)=>({key:'n'+i,label:'entity '+i,kind:i%2?'agent':'task',status:'queued'})),graph={nodes,edges:[]};
 const all=[];for(let i=0;i<16;i++)all.push(...entityPage(nodes,i).nodes);assert.deepEqual(all,nodes);assert.equal(entityPage(nodes,1000).index,15);assert.equal(entityPage(nodes,-2).index,0);
 const filtered=projectGraphFilter(graph,{query:'499',kind:'participants'});assert.equal(filtered.nodes.length,1);assert.equal(filtered.nodes[0].key,'n499');
});
test('replay reconstructs exact journal prefix; rejects invalid or reordered history',()=>{
 const {journal,emitter}=journalRun(1);
 for(const status of ['executing','validating','completed'])assert.equal(emitter.emit('task.state',{taskId:'task_0',kind:'compute',agentId:'specialist_0',status}),true);
 assert.equal(emitter.emit('run.close',{status:'completed'}),true);
 const events=journal.events('dynamic_run'),before=JSON.stringify(journal.snapshot('dynamic_run'));
 assert.equal(replayJournalPrefix(events,0).nodes.length,0);
 assert.equal(replayJournalPrefix(events,1).nodes.find(n=>n.kind==='task').status,'queued');
 assert.equal(replayJournalPrefix(events,2).nodes.find(n=>n.kind==='task').status,'executing');
 assert.equal(replayJournalPrefix(events,events.length).nodes.find(n=>n.kind==='task').status,'completed');
 assert.throws(()=>replayJournalPrefix([events[0],events[2]],2));assert.throws(()=>replayJournalPrefix(events,99));assert.equal(JSON.stringify(journal.snapshot('dynamic_run')),before);
});
test('clustered layout retains each entity and all original relations',()=>{
 const graph={nodes:Array.from({length:8},(_,i)=>({key:'k'+i,id:'k'+i,kind:'task'})),edges:[{from:'k0',to:'k1',kind:'assignment'},{from:'k2',to:'k3',kind:'assignment'}]};
 const layout=layoutGraph(graph,'clustered');assert.equal(layout.mode,'clustered');assert.equal(layout.positions.length,8);assert.equal(new Set(layout.positions.map(x=>x.key)).size,8);
 assert.ok(layout.positions.every(p=>p.x>=0&&p.x<=layout.width&&p.y>=0&&p.y<=layout.height));
});

import {prepareLocalBatch} from '../src/event-horizon/local-batch.js';
const batchRow=(id,owner,from='mm',to='m',value='1000',predecessor=null)=>({id,owner,kind:'length',from,to,value,predecessor});
test('actual local DAG executes ten named deterministic owners and shares no model authority',async()=>{
 const j=createExecutionJournal(),rows=Array.from({length:10},(_,i)=>batchRow('task_'+i,'owner_'+i));
 const p=prepareLocalBatch(rows,{concurrency:4});assert.equal(p.plan.ownerCount,10);assert.equal(p.plan.modelCalls,0);assert.equal(j.runs().length,0);
 const r=await p.execute({runId:'actual_ten',onExecutionEvent:j.accept});
 assert.equal(r.result.status,'completed');assert.equal(r.result.artifacts.length,10);assert.ok(r.result.artifacts.every(a=>a.value.value==='1'));
 const g=projectTaskRun(j.snapshot('actual_ten'),j.events('actual_ten'));assert.equal(g.agentCount,10);assert.equal(g.nodes.filter(n=>n.kind==='task'&&n.status==='completed').length,10);
 assert.equal(j.events('actual_ten').filter(e=>e.type==='task.state'&&e.payload.status==='completed').length,10);
});
test('actual chained computation uses predecessor result and one logical owner',async()=>{
 const p=prepareLocalBatch([batchRow('a','owner'),batchRow('b','owner','m','cm',null,'a')]);
 const r=await p.execute({runId:'chain'});assert.equal(r.result.status,'completed');assert.equal(r.result.artifacts[1].value.value,'100');assert.equal(p.plan.ownerCount,1);
});
test('local plan rejects cycles, unit mismatch, ambiguous inputs, extra fields and limit overflow',()=>{
 assert.throws(()=>prepareLocalBatch([batchRow('a','owner','mm','m',null,'b'),batchRow('b','owner','m','mm',null,'a')]));
 assert.throws(()=>prepareLocalBatch([batchRow('a','owner'),batchRow('b','owner','cm','m',null,'a')]));
 assert.throws(()=>prepareLocalBatch([batchRow('a','owner','mm','m','1','a')]));
 assert.throws(()=>prepareLocalBatch([{...batchRow('a','owner'),url:'https://example.com'}]));
 assert.throws(()=>prepareLocalBatch(Array.from({length:13},(_,i)=>batchRow('a'+i,'owner'))));
});
test('pre-aborted local DAG publishes no results',async()=>{
 const abort=new AbortController();abort.abort();
 const p=prepareLocalBatch([batchRow('a','owner')]);const r=await p.execute({runId:'stopped',signal:abort.signal});
 assert.equal(r.result.status,'cancelled');assert.equal(r.result.artifacts.length,0);
});

import {starterGraph,graphText,parseGraph,editGraph,makeInput,createProofSession,dependencyTrace,exportProof,inspectProofArchive,formatDimension} from '../src/event-horizon/proof-model.js';
test('proof workbench evaluates, reuses and compares actual kernel receipts',async()=>{
 const s=createProofSession();
 const baseline=await s.evaluate();
 assert.equal(baseline.report.receipts.find(r=>r.id==='margin').outcome.value,'20/1');
 s.retain();
 const input=makeInput({id:'available',value:'90',dimension:[0,0,0],basis:'Declared available capacity'});
 s.edit({operation:'replace',id:'available',node:input});
 assert.equal(s.snapshot().current,null);
 assert.equal(s.snapshot().baseline.report.graphDigest,baseline.report.graphDigest);
 const after=await s.evaluate();
 assert.equal(after.report.receipts.find(r=>r.id==='sufficient').outcome.status,'constraint_refuted');
 assert.equal(after.report.receipts.find(r=>r.id==='margin').outcome.value,'-10/1');
 assert.deepEqual(after.stats.reused,['required']);
 const d=s.diff();
 assert.deepEqual(d.closure.affected,['available','margin','sufficient']);
 assert.equal(d.changes.find(c=>c.id==='required').relation,'unchanged');
 const imported=await inspectProofArchive(exportProof(after));
 assert.equal(imported.report.graphDigest,after.report.graphDigest);
 s.restore(1);
 assert.equal(s.snapshot().current,null);
 assert.equal((await s.evaluate()).report.graphDigest,baseline.report.graphDigest);
});
test('proof workbench refuses graph mutations with dangling dependencies, duplicate keys or cycles',()=>{
 const nodes=starterGraph();
 assert.throws(()=>editGraph(nodes,{operation:'remove',id:'available'}));
 assert.throws(()=>editGraph(nodes,{operation:'append',node:nodes[0]}));
 assert.throws(()=>editGraph(nodes,{operation:'replace',id:'available',node:{id:'available',kind:'derive',op:'add',args:['margin','required']}}));
 assert.throws(()=>parseGraph('{"schemaVersion":1,"schemaVersion":1,"nodes":[]}'));
 assert.deepEqual(dependencyTrace(nodes,'available').downstream,['margin','sufficient']);
 assert.equal(formatDimension([1,0,-1]),'m · s^-1');
 assert.equal(parseGraph(graphText(nodes)).nodes.length,4);
});
test('proof archive alteration is refused and inspection has no execution authority',async()=>{
 const s=createProofSession();
 const r=await s.evaluate();
 const archive=JSON.parse(exportProof(r));
 archive.reportText=archive.reportText.replace('20/1','21/1');
 await assert.rejects(inspectProofArchive(JSON.stringify(archive)));
 assert.equal(s.snapshot().current.report.graphDigest,r.report.graphDigest);
});

import {createNetworkDesigner,composeProfile,parseDesign,networkText,delegationAnalysis} from '../src/event-horizon/network-designer.js';
test('network designer admits variable topology definitions and exports actual compiler-compatible JSON',async()=>{
 for(const count of [1,2,6,10,12]){
  for(const profile of count===1?['single']:['parallel','hierarchy','challenge']){
   const d=composeProfile(profile,count);
   const a=delegationAnalysis(d);
   assert.equal(a.definitionCount,count);
   assert.equal(a.reachable.length,count);
   assert.equal(a.edgeCount,count-1);
   assert.ok(a.maxDepth<=3);
   const s=createNetworkDesigner(d);
   const out=await s.exportBundle();
   const passport=await inspectImportedNetwork(new TextEncoder().encode(out.text),{front:out.front});
   assert.equal(passport.definitionCount,count);
   assert.equal(passport.digests.definition,out.digest);
  }
 }
});
test('network edits are transactional; rename, undo, redo and invalid cycle',()=>{
 const d=createNetworkDesigner();
 d.edit({type:'add',name:'research'});
 d.edit({type:'connect',from:'specialist',to:'research'});
 assert.deepEqual(d.snapshot().analysis.reachable,['specialist','research']);
 const before=JSON.stringify(d.snapshot().definition);
 assert.throws(()=>d.edit({type:'connect',from:'research',to:'specialist'}));
 assert.equal(JSON.stringify(d.snapshot().definition),before);
 d.edit({type:'rename',name:'research',nextName:'evidence'});
 assert.deepEqual(d.snapshot().definition.tools[0].tools,['evidence']);
 d.undo();
 assert.deepEqual(d.snapshot().definition.tools[0].tools,['research']);
 d.redo();
 assert.deepEqual(d.snapshot().definition.tools[0].tools,['evidence']);
 d.edit({type:'remove',name:'evidence'});
 assert.equal(d.snapshot().analysis.edgeCount,0);
});
test('network designer refuses external references and executable or permissive schemas',()=>{
 const d=createNetworkDesigner();
 const before=d.snapshot().definition;
 assert.throws(()=>d.edit({type:'parameters',name:'specialist',text:'{"type":"object","additionalProperties":true}'}));
 const raw=JSON.parse(networkText(before));
 raw.tools[0].tools=['https://example.com/agents/peer'];
 assert.throws(()=>parseDesign(JSON.stringify(raw)));
 assert.throws(()=>parseDesign('{"tools":[],"tools":[]}'));
 assert.deepEqual(d.snapshot().definition,before);
});

import {captureNotebookSources,anchorSelection,inspectAnchor,createNotebook,exportNotebook,parseNotebook,filterNotes,notebookSummary} from '../src/event-horizon/notebook-model.js';
test('notebook source revisions never silently move exact selected annotations',async()=>{
 const source={id:'report',lineage:'original',text:'Capacity is 120 units.'};
 const a=await anchorSelection(source,12,15);
 assert.equal(a.quote,'120');
 assert.equal((await inspectAnchor(a,[source])).status,'exact_current');
 const shifted={...source,text:'Updated: Capacity is 120 units.'};
 const move=await inspectAnchor(a,[shifted]);
 assert.equal(move.status,'changed_unique_match');
 assert.deepEqual(move.positions,[21]);
 assert.equal(a.start,12);
 assert.equal((await inspectAnchor(a,[{...source,text:'120 and 120'}])).status,'changed_multiple_matches');
 assert.equal((await inspectAnchor(a,[{...source,text:'Capacity is 90 units.'}])).status,'quote_missing');
 assert.equal((await inspectAnchor(a,[])).status,'source_missing');
 await assert.rejects(anchorSelection({...source,text:'x😀y'},2,3));
});
test('notebook export/import preserves annotations, not evidence authority',async()=>{
 const s=createNotebook();
 const source=captureNotebookSources({question:'Test question',sources:[{id:'r',lineage:'l',text:'Evidence 42'}]})[1];
 const a=await anchorSelection(source,9,11);
 const n=s.add({kind:'hypothesis',body:'Potential explanation',anchor:a});
 s.update(n.id,{state:'reviewed'});
 s.add({kind:'counterexample',body:'Alternative scenario'});
 const saved=exportNotebook(s.snapshot().notes);
 const restored=parseNotebook(saved);
 assert.deepEqual(restored,s.snapshot().notes);
 assert.equal(notebookSummary(restored).anchored,1);
 assert.equal(filterNotes(restored,{state:'reviewed',query:'42'}).length,1);
 assert.throws(()=>parseNotebook('{"schema":"sutra-evidence-notebook/v1","notes":[],"notes":[]}'));
 assert.throws(()=>s.update(n.id,{authority:'approved'}));
 s.remove(n.id);
 assert.equal(s.snapshot().notes.length,1);
});

import {analyzeObjective,parseExactConversion,confirmRequirements} from '../src/event-horizon/objective-intake.js';
test('whole objective conversion routes only supported typed candidates',()=>{
 const p=analyzeObjective('Convert 2.5 kN to N');
 assert.equal(p.status,'closed_conversion');
 assert.deepEqual(p.conversion.candidates,[{kind:'force',value:'5/2',from:'kN',to:'N'}]);
 assert.equal(analyzeObjective('1000 kPa to MPa').conversion.candidates[0].kind,'pressure');
 assert.equal(analyzeObjective('1 MPa to Pa').status,'clarify_quantity');
 assert.equal(analyzeObjective('1 MPa to Pa as stress').status,'closed_conversion');
 assert.equal(analyzeObjective('1 m to kg').status,'unsupported_conversion');
 assert.equal(parseExactConversion('1 N*m to J as torque').status,'refused');
 assert.equal(parseExactConversion('1000 mm to m and find sources'),null);
 assert.equal(parseExactConversion('Do not convert 1000 mm to m'),null);
});
test('broad objective suggestions never silently grant authority',()=>{
 const a=analyzeObjective('Find a public source and challenge the interpretation.');
 assert.equal(a.status,'review_required');
 assert.ok(a.hints.some(h=>h.id==='public_sources'));
 assert.ok(a.hints.some(h=>h.id==='challenge'));
 assert.equal(confirmRequirements(a,[]).requirements.length,0);
 assert.equal(confirmRequirements(a,['challenge']).authority,'NONE');
 assert.throws(()=>confirmRequirements(a,['constructor']));
 assert.equal(analyzeObjective('hello').status,'unclassified');
});

import {createLazyViews,createCoalescedRefresh} from '../src/event-horizon/view-lifecycle.js';
test('lazy views mount once, isolate errors and suspend hidden state',()=>{
 const log=[];
 const entries=['a','b','bad'].map(id=>({id,panelId:'panel_'+id,mount(){
  log.push('mount:'+id);
  if(id==='bad')throw Error('FAIL');
  return {section:{id:'panel_'+id,hidden:true},setActive(v){log.push(id+':'+v);},destroy(){log.push('destroy:'+id);}};
 }}));
 const registry=createLazyViews(entries,{makePlaceholder:()=>({hidden:true}),removePlaceholder(){},onFailure:r=>log.push('failure:'+r.id)});
 assert.equal(registry.snapshot().views.filter(v=>v.mounted).length,0);
 const a=registry.show('a');
 assert.equal(a.section.hidden,false);
 assert.equal(registry.show('a'),a);
 assert.equal(log.filter(s=>s==='mount:a').length,1);
 assert.equal(registry.show('bad'),null);
 assert.equal(registry.snapshot().selected,'a');
 registry.show('b');
 assert.equal(a.section.hidden,true);
 registry.suspend();
 registry.resume();
 registry.destroy();
 assert.ok(log.includes('destroy:a'));assert.ok(log.includes('destroy:b'));
 assert.equal(registry.snapshot().closed,true);
});
test('coalesced renderer preserves last dirty notification and cancels stale callbacks',()=>{
 const queue=[],calls=[];
 const refresh=createCoalescedRefresh(value=>calls.push(value),fn=>queue.push(fn));
 for(let i=0;i<1000;i++)refresh.request(i);
 assert.equal(queue.length,1);
 queue.shift()();
 assert.deepEqual(calls,[999]);
 refresh.request('old');
 refresh.cancel();
 refresh.request('new');
 queue.shift()();
 queue.shift()();
 assert.deepEqual(calls,[999,'new']);
 refresh.request('flush');
 assert.equal(refresh.flush(),true);
 queue.shift()();
 assert.deepEqual(calls,[999,'new','flush']);
 refresh.destroy();
 assert.equal(refresh.request('closed'),false);
});

import {prepareScenarios,runScenarios,parseAxisValues,summarizeScenarios,resultMatrix,exportScenarioCase} from '../src/event-horizon/scenario-model.js';
test('scenario matrix evaluates exact constraints in all nine input combinations',async()=>{
 const plan=prepareScenarios({first:{id:'available',values:['80','100','120']},second:{id:'required',values:['90','100','110']},output:'sufficient'});
 assert.equal(plan.caseCount,9);
 const result=await runScenarios(plan);
 assert.equal(result.status,'completed');
 const summary=summarizeScenarios(result);
 assert.equal(summary.statuses.constraint_satisfied,5);
 assert.equal(summary.statuses.constraint_refuted,4);
 assert.equal(resultMatrix(result).length,3);
 assert.equal(resultMatrix(result)[0].cells[0].outcome.status,'constraint_refuted');
 const verified=await inspectProofArchive(exportScenarioCase(result,'case_2_2'));
 assert.equal(verified.report.graphDigest,result.outcomes.at(-1).graphDigest);
 assert.ok(result.stats.reused>0);
});
test('scenario exact numeric range, budgets, refusal and cancellation',async()=>{
 const plan=prepareScenarios({first:{id:'available',values:['80','100','120']},output:'margin'});
 const result=await runScenarios(plan);
 const summary=summarizeScenarios(result);
 assert.equal(summary.minimum.value,'-20/1');
 assert.equal(summary.maximum.value,'20/1');
 assert.throws(()=>parseAxisValues('1,1.0'));
 assert.throws(()=>prepareScenarios({first:{id:'margin',values:['1']},output:'margin'}));
 assert.throws(()=>prepareScenarios({first:{id:'available',values:['1']},second:{id:'available',values:['2']},output:'margin'}));
 const changed=JSON.parse(JSON.stringify(plan));changed.cases[0].graphText=changed.cases[1].graphText;
 await assert.rejects(runScenarios(changed));
 const controller=new AbortController();
 const stopped=await runScenarios(plan,{signal:controller.signal,onProgress:()=>controller.abort()});
 assert.equal(stopped.status,'cancelled');assert.equal(stopped.outcomes.length,1);
});

import {sealRunArchive,readRunArchive,eventAccounting,compareRunRecords,inspectRunEvents,createRunLibrary} from '../src/event-horizon/run-archive.js';
test('run archive validates metadata digest and exact historical transitions',async()=>{
 const {journal,emitter}=journalRun(1);
 for(const status of ['executing','validating','completed'])emitter.emit('task.state',{taskId:'task_0',agentId:'specialist_0',kind:'compute',status});
 emitter.emit('run.close',{status:'completed'});
 const archive=await sealRunArchive(journal.events('dynamic_run'));
 const recovered=await readRunArchive(archive.text);
 assert.equal(recovered.digest,archive.digest);
 assert.equal(recovered.snapshot.status,'completed');
 assert.equal(eventAccounting(recovered.events).taskCompleted,1);
 const altered=JSON.parse(archive.text);altered.events[1].payload.status='failed';
 await assert.rejects(readRunArchive(JSON.stringify(altered)));
 assert.throws(()=>inspectRunEvents([archive.events[0],archive.events[2]]));
 const lib=createRunLibrary();lib.add(archive,'local_feed');lib.add(recovered,'imported_file');assert.equal(lib.list().length,1);
 lib.remove(archive.digest);assert.equal(lib.list().length,0);
});
test('archive comparison distinguishes status and unknown post-dispatch outcome',async()=>{
 const j=createExecutionJournal(),e=createExecutionEmitter({runId:'provider_test',version:'v1',origin:'authorized-provider',publish:j.accept});
 e.emit('run.open',{tasks:[{id:'task',kind:'model',agentId:'owner',dependsOn:[]}]});
 e.emit('task.state',{taskId:'task',kind:'model',agentId:'owner',status:'executing'});
 const p={taskId:'task',kind:'model',agentId:'owner',routeId:'route',planPin:'sha256:'+'0'.repeat(64)};
 for(const phase of ['consent-requested','consent-granted','dispatch-attempt'])assert.equal(e.emit('provider.phase',{...p,phase}),true);
 const before=await sealRunArchive(j.events('provider_test'));
 assert.equal(eventAccounting(before.events).providerUnknown,1);
 assert.equal(e.emit('provider.phase',{...p,phase:'cancelled'}),true);
 assert.equal(e.emit('task.state',{taskId:'task',kind:'model',agentId:'owner',status:'cancelled'}),true);
 assert.equal(e.emit('run.close',{status:'cancelled'}),true);
 const after=await sealRunArchive(j.events('provider_test'));
 const counts=eventAccounting(after.events);
 assert.equal(counts.providerDispatchAttempts,1);assert.equal(counts.providerResponses,0);assert.equal(counts.providerUnknown,1);
 const diff=compareRunRecords(before,after);
 assert.equal(diff.tasks[0].relation,'status_changed');assert.equal(diff.sameVersion,true);
});

import {prepareDesignedExecution} from '../src/event-horizon/designed-execution.js';
function designedFixture(){
 const requests=[];
 const origin='http://127.0.0.1:8000';
 const route={inference:'configured',routerBase:'/api/v1',publisherFunded:true,byok:false,backend:'hosted',provider:'groq',model:'fixture-model',inferenceContractId:'a'.repeat(64)};
 const fetchImpl=async(url,init)=>{
  requests.push({url,init});
  if(url===origin+'/api/status')return new Response(JSON.stringify(route),{headers:{'content-type':'application/json'}});
  assert.equal(url,origin+'/api/v1/chat/completions');
  const body=JSON.parse(init.body);
  assert.equal(body.model,'fixture-model');
  assert.equal(init.headers['X-Sutra-Inference-Contract'],'a'.repeat(64));
  const chunk={choices:[{index:0,delta:{content:'A bounded fixture candidate.'},finish_reason:'stop'}]};
  return new Response('data: '+JSON.stringify(chunk)+'\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});
 };
 return {origin,fetchImpl,requests,route};
}
test('designed execution requires exact approval and performs actual bounded runtime calls',async()=>{
 const f=designedFixture(),definition=composeProfile('single',1),events=[];
 const p=await prepareDesignedExecution({...f,definition,objective:'Explain a candidate',maxModelCalls:1});
 assert.equal(f.requests.length,1);
 assert.equal(f.requests[0].init.method,'GET');
 assert.equal(f.requests[0].init.body,undefined);
 await assert.rejects(p.run({approvedPlanPin:'wrong'}),e=>e.code==='DESIGN_APPROVAL_REQUIRED');
 assert.equal(f.requests.length,1);
 const result=await p.run({approvedPlanPin:p.planPin,onEvent:e=>events.push(e)});
 assert.equal(result.receipt.agentCalls,1);
 assert.equal(result.receipt.modelCalls,1);
 assert.equal(result.receipt.attempted,1);
 assert.equal(result.receipt.authority,'NONE');
 assert.ok(events.some(e=>e.kind==='agent'&&e.agent==='specialist'));
 assert.equal(f.requests.length,2);
 await assert.rejects(p.run({approvedPlanPin:p.planPin}),e=>e.code==='DESIGN_PLAN_CONSUMED');
});
test('stale design and pre-cancelled run dispatch no model requests',async()=>{
 const f=designedFixture();let current=true;
 const p=await prepareDesignedExecution({...f,definition:composeProfile('single',1),objective:'Draft',isCurrent:()=>current});
 current=false;
 await assert.rejects(p.run({approvedPlanPin:p.planPin}),e=>e.code==='DESIGN_STALE'&&e.dispatch.attempted===0);
 assert.equal(f.requests.length,1);
 const q=await prepareDesignedExecution({...f,definition:composeProfile('single',1),objective:'Draft'});
 const abort=new AbortController();abort.abort();
 await assert.rejects(q.run({approvedPlanPin:q.planPin,signal:abort.signal}),e=>e.code==='CANCELLED'&&e.dispatch.attempted===0);
 assert.equal(f.requests.length,2);
});
test('external tools and unconfigured routes are refused before model calls',async()=>{
 const f=designedFixture(),definition=JSON.parse(JSON.stringify(composeProfile('single',1)));
 definition.tools[0].tools=['https://example.com/agents/peer'];
 await assert.rejects(prepareDesignedExecution({...f,definition,objective:'Draft'}));
 assert.equal(f.requests.length,0);
 f.route.inference='disabled';
 await assert.rejects(prepareDesignedExecution({...f,definition:composeProfile('single',1),objective:'Draft'}));
 assert.equal(f.requests.length,1);
});

import {workspaceCommands,searchWorkspaceCommands} from '../src/event-horizon/workspace-navigation.js';
test('workspace navigation preserves all registered tools and ranks exact local searches',()=>{
 const commands=workspaceCommands([{id:'proof',name:'Proof workbench'},{id:'notebook',name:'Notebook'},{id:'designer',name:'Network designer'},{id:'extra',name:'Extra'}]);
 assert.equal(commands.length,4);
 assert.equal(searchWorkspaceCommands(commands,'receipt')[0].id,'proof');
 assert.equal(searchWorkspaceCommands(commands,'agent build')[0].id,'designer');
 assert.equal(searchWorkspaceCommands(commands,'extra')[0].id,'extra');
 assert.equal(searchWorkspaceCommands(commands,'impossible').length,0);
 assert.throws(()=>workspaceCommands([{id:'a',name:'A'},{id:'a',name:'B'}]));
});

test('designed runtime performs two arbitrary named invocations and refuses undeclared tool calls',async()=>{
 const f=designedFixture(),design=createNetworkDesigner();
 design.edit({type:'rename',name:'specialist',nextName:'mission_driver'});
 design.edit({type:'add',name:'route_evaluator'});
 design.edit({type:'connect',from:'mission_driver',to:'route_evaluator'});
 let posts=0;
 const fetchImpl=async(url,init)=>{
  if(init.method==='GET')return f.fetchImpl(url,init);
  posts++;
  const body=JSON.parse(init.body);
  let delta,finish_reason;
  if(posts===1){
   assert.deepEqual(body.tools.map(t=>t.function.name),['route_evaluator']);
   delta={tool_calls:[{index:0,id:'call_1',type:'function',function:{name:'route_evaluator',arguments:'{"request":"Compare two candidate routes"}'}}]};
   finish_reason='tool_calls';
  }else{
   delta={content:posts===2?'A route candidate':'A conditional route conclusion'};
   finish_reason='stop';
  }
  return new Response('data: '+JSON.stringify({choices:[{index:0,delta,finish_reason}]})+'\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});
 };
 const p=await prepareDesignedExecution({origin:f.origin,fetchImpl,definition:design.snapshot().definition,objective:'Compare two routes',maxModelCalls:3});
 const r=await p.run({approvedPlanPin:p.planPin});
 assert.equal(posts,3);
 assert.equal(r.receipt.agentCalls,2);
 assert.equal(r.receipt.events.filter(e=>e.kind==='agent'&&e.phase==='start').length,2);
 assert.ok(r.receipt.events.some(e=>e.kind==='agent'&&e.agent==='route_evaluator'));
 const denied=await prepareDesignedExecution({origin:f.origin,definition:design.snapshot().definition,objective:'Compare two routes',fetchImpl:async(url,init)=>{
  if(init.method==='GET')return f.fetchImpl(url,init);
  const delta={tool_calls:[{index:0,id:'bad',type:'function',function:{name:'unregistered_tool',arguments:'{}'}}]};
  return new Response('data: '+JSON.stringify({choices:[{index:0,delta,finish_reason:'tool_calls'}]})+'\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});
 }});
 await assert.rejects(denied.run({approvedPlanPin:denied.planPin}),e=>e.code==='TOOL_UNAVAILABLE'&&e.dispatch.attempted===1);
});
