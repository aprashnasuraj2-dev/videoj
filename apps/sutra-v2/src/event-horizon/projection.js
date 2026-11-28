// Read-only presentation of admitted task journals and bounded research telemetry.
// No execution, inference, network, storage, or permission authority.
const ID=/^[A-Za-z0-9_.:/-]{1,160}$/;
const valid=x=>typeof x==='string'&&ID.test(x);
const safe=(x,fallback='Unknown')=>valid(x)?x:fallback;
const terminal=new Set(['completed','failed','blocked','cancelled','refused','stopped','unknown']);
const states=new Set(['queued','executing','validating','completed','failed','blocked','cancelled','waiting','refused','idle','stopped','unknown','running','paused','working','not-run','incomplete','unadmitted']);
const state=x=>states.has(x)?x:'unknown';
const key=(...parts)=>parts.map(x=>encodeURIComponent(String(x))).join('/');
const entity=(run,kind,id,label,status,extra={})=>Object.freeze({key:key(run,kind,id),kind,id,label,status:state(status),...extra});
const relation=(from,to,kind,authority)=>Object.freeze({key:key(from,to,kind),from,to,kind,authority});
const freezeGraph=g=>Object.freeze({...g,nodes:Object.freeze(g.nodes),edges:Object.freeze(g.edges),events:Object.freeze(g.events??[])});
const origins=Object.freeze({'local-scripted':'Local scripted council','deterministic':'Local deterministic task graph','host-task':'Host task graph','authorized-provider':'Authorized provider task graph'});
export function projectTaskRun(run,events=[]){
 if(!run||!valid(run.runId)||!Object.hasOwn(origins,run.origin)||!Array.isArray(run.tasks)||!Array.isArray(run.agents))return null;
 const nodes=[],edges=[],agents=new Map(),tasks=new Map();
 for(const a of run.agents.slice(0,64)){
  if(!valid(a.id)||agents.has(a.id))continue;
  const n=entity(run.runId,'agent',a.id,a.id,a.status,{activeCount:Array.isArray(a.activeTaskIds)?a.activeTaskIds.length:null,taskCount:Array.isArray(a.taskIds)?a.taskIds.length:null});
  agents.set(a.id,n);nodes.push(n);
 }
 for(const t of run.tasks.slice(0,64)){
  if(!valid(t.id)||tasks.has(t.id))continue;
  const n=entity(run.runId,'task',t.id,t.id,t.status,{taskKind:safe(t.kind),agentId:safe(t.agentId),waitingFor:Array.isArray(t.waitingFor)?t.waitingFor.filter(valid):[],routeAttempts:Array.isArray(t.routeAttempts)?t.routeAttempts.slice(0,16).map(a=>({routeId:safe(a.routeId),phase:safe(a.phase??a.status)})):[],consultationSlots:Array.isArray(t.consultationSlots)?t.consultationSlots.slice(0,16).map(a=>({slotId:safe(a.slotId),phase:safe(a.phase??a.status)})):[]});
  tasks.set(t.id,n);nodes.push(n);
  if(agents.has(t.agentId))edges.push(relation(agents.get(t.agentId).key,n.key,'assignment','admitted manifest'));
 }
 for(const t of run.tasks.slice(0,64)){
  const target=tasks.get(t.id);if(!target||!Array.isArray(t.dependsOn))continue;
  for(const id of t.dependsOn){const source=tasks.get(id);if(source)edges.push(relation(source.key,target.key,'dependency','admitted manifest'));}
 }
 const journal=events.slice(-120).filter(e=>e.runId===run.runId&&e.version===run.version&&e.origin===run.origin).map(e=>Object.freeze({sequence:e.sequence,label:safe(e.type),detail:[e.payload?.taskId,e.payload?.agentId,e.payload?.phase,e.payload?.status].filter(valid).join(' · ')}));
 return freezeGraph({id:key('task',run.runId),label:origins[run.origin],runId:run.runId,version:run.version,journalBacked:true,status:state(run.status),nodes,edges,events:journal,agentCount:agents.size,invocationCount:null,qualification:'Recorded task manifest and validated journal. Assignment and dependency edges are not observed messages. Model independence and factual truth are not established.'});
}
export function createResearchProjection({maxNodes=512,maxEvents=120}={}){
 if(!Number.isInteger(maxNodes)||maxNodes<1||maxNodes>512||!Number.isInteger(maxEvents)||maxEvents<1||maxEvents>512)throw Error('PROJECTION_LIMIT');
 let generation=0,active=false,session=null,transport=null,seq=0,observed=0,overflow=false,runStatus='idle';
 const nodes=new Map(),edges=new Map(),events=[],spans=new Map();
 let pending=null;
 const allowed=new Set(['browser_runtime','local_host_transport','injected_fixture']);
 function begin(){
  generation++;active=true;session=null;transport=null;seq=0;observed=0;overflow=false;runStatus='running';pending=null;
  nodes.clear();edges.clear();events.length=0;spans.clear();
 }
 function add(kind,id,label,status,extra={}){
  const n=entity('research-'+generation,kind,id,label,status,extra);
  if(!nodes.has(n.key)&&nodes.size>=maxNodes){overflow=true;return null;}
  nodes.set(n.key,n);return n;
 }
 function update(n,status){return add(n.kind,n.id,n.label,status,{...Object.fromEntries(Object.entries(n).filter(([k])=>!['key','kind','id','label','status'].includes(k)))});}
 function link(a,b,kind,authority){
  if(!a||!b||a.key===b.key)return;
  const e=relation(a.key,b.key,kind,authority);if(edges.size>=maxNodes*2&&!edges.has(e.key)){overflow=true;return;}
  edges.set(e.key,e);
 }
 function log(label,detail){
  observed++;events.push(Object.freeze({sequence:observed,label,detail}));
  if(events.length>maxEvents)events.shift();
 }
 function browser(e){
  if(e.kind==='browser.peer_consent'){
   if(!valid(e.operation))return false;
   log('Peer consent',safe(e.operation)+' · '+safe(e.status));return true;
  }
  const kinds={'browser.agent':'invocation','browser.tool':'tool','browser.model_call':'operation'};
  if(!Object.hasOwn(kinds,e.kind)||!valid(e.id)||!['start','end'].includes(e.operation))return false;
  const kind=kinds[e.kind],prior=spans.get(e.id);
  if(e.operation==='start'){
   if(prior||spans.size>=maxNodes){if(!prior)overflow=true;return false;}
   const label=kind==='invocation'?safe(e.agent,'Unidentified agent'):kind==='tool'?safe(e.tool,'Registered tool'):'Model call';
   const n=add(kind,e.id,label,'executing',{definitionLabel:kind==='invocation'?label:null,parentId:valid(e.parent)?e.parent:null});
   if(!n)return false;
   spans.set(e.id,{key:n.key,kind,label,parent:valid(e.parent)?e.parent:null,closed:false});
   const parent=spans.get(e.parent);if(parent)link(nodes.get(parent.key),n,'invocation ancestry','recorded span parent');
   // An unmatched parent remains unknown; never assign a fictitious root.
   log('Invocation start',label+' · '+e.id);return true;
  }
  if(!prior||prior.closed||prior.kind!==kind)return false;
  if((valid(e.parent)?e.parent:null)!==prior.parent)return false;
  if(kind==='invocation'&&valid(e.agent)&&e.agent!==prior.label)return false;
  if(kind==='tool'&&valid(e.tool)&&e.tool!==prior.label)return false;
  prior.closed=true;update(nodes.get(prior.key),e.status==='ok'?'completed':'stopped');
  log('Invocation end',prior.label+' · '+safe(e.status));return true;
 }
 function host(e){
  // Host protocol currently reports sequential role/operation labels, not unique agent IDs.
  // Do not turn legacy role labels into agent instances.
  if(!valid(e.sessionId)||!Number.isSafeInteger(e.sequence)||e.sequence<1)return false;
  if(session===null){session=e.sessionId;seq=e.sequence-1;}
  if(e.sessionId!==session||e.sequence!==seq+1)return false;
  seq=e.sequence;
  if(['operation.pending','operation.completed','operation.failed'].includes(e.kind)){
   if(!['search','document','model'].includes(e.operation))return false;
   const label={search:'Public search',document:'Document retrieval',model:'Model transport'}[e.operation];
   if(e.kind==='operation.pending'){
    if(pending){const old=nodes.get(pending.key);if(old)update(old,'unknown');}
    const n=add('operation','op-'+seq,label,'executing',{reportedRole:safe(e.role),sourceSequence:seq});
    pending=n?{key:n.key,operation:e.operation,role:e.role}:null;
   }else if(pending&&pending.operation===e.operation&&pending.role===e.role){
    const old=nodes.get(pending.key);if(old)update(old,e.kind==='operation.completed'?'completed':'failed');pending=null;
   }else{
    // A retained cursor may start after a dispatch. A terminal receipt is not proof of a matched start.
    add('operation','receipt-'+seq,label+' receipt',e.kind==='operation.completed'?'completed':'failed',{reportedRole:safe(e.role),startUnknown:true,sourceSequence:seq});
   }
   log(e.kind,label+(valid(e.reason)?' · '+e.reason:''));return true;
  }
  if(e.kind==='evidence.admitted'&&valid(e.sourceId)){
   add('evidence',e.sourceId,e.sourceId,'completed',{passages:Number.isSafeInteger(e.passages)&&e.passages>=0?e.passages:null});
   log('Evidence admitted',e.sourceId+' · source truth unverified');return true;
  }
  if(['model.response','evidence.indexed','report.assembled','session.open','session.resume','session.pause','session.close'].includes(e.kind)){
   if(e.kind==='session.pause')runStatus='paused';
   if(e.kind==='session.resume')runStatus='running';
   if(e.kind==='session.close')runStatus='unknown';
   log(e.kind,[e.vendor,e.model,e.status,e.reason].filter(valid).join(' · '));return true;
  }
  return false;
 }
 function accept(e,mode){
  if(!active||!e||!allowed.has(mode)||typeof e.kind!=='string')return false;
  if(transport&&transport!==mode)return false;
  transport=mode;return mode==='browser_runtime'?browser(e):host(e);
 }
 function end(status='unknown'){
  active=false;runStatus=['completed','cancelled','refused','failed','paused'].includes(status)?status:'unknown';
  for(const n of nodes.values())if(!terminal.has(n.status))update(n,'unknown');
  pending=null;
 }
 function snapshot(){
  if(!generation)return null;
  const list=[...nodes.values()];
  return freezeGraph({id:key('research',generation),runId:session??'research-'+generation,label:transport==='browser_runtime'?'Browser runtime trace':transport==='injected_fixture'?'Injected research fixture':transport==='local_host_transport'?'Local host research':'Research observation',status:runStatus,nodes:list,edges:[...edges.values()],events:[...events],agentCount:null,invocationCount:list.filter(n=>n.kind==='invocation').length,qualification:'Observed invocation spans and operation receipts, not an admitted agent-instance manifest. Missing identity, ancestry, billing and terminal outcomes remain unknown.'+(overflow?' Display limit reached; some observations omitted.':'')});
 }
 return Object.freeze({begin,accept,end,snapshot});
}
export function emptyGraph(){
 return freezeGraph({id:'empty',label:'No recorded execution',runId:null,status:'idle',nodes:[],edges:[],events:[],agentCount:0,invocationCount:0,qualification:'Choose an objective or a local worked example. No agents have been instantiated by this view.'});
}

export function localToolGraph({id,label,status}){
 if(!valid(id)||typeof label!=='string'||label.length>120||!['executing','completed','refused'].includes(status))return null;
 const n=entity(id,'tool','exact_quantity',label,status);
 return freezeGraph({id:key('local-tool',id),runId:id,label:'Direct local computation',status,nodes:[n],edges:[],events:[],agentCount:0,invocationCount:0,qualification:'Actual local tool operation; no AI agent, model request or external contact. Exact proof is available in the computation view; this display is not itself a proof receipt.'});
}
