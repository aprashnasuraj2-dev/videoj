// Presentation projection only. No simulated thinking, token counts or
// inferred completion. Browser delegation edges come from recorded ancestry.
const roles=Object.freeze({bot:0,drone:1,gear:2,orb:3,node:4,spark:5});
const agentRoles=Object.freeze({planner:0,critic:5,checklist:5,source_select:1});
const stations=[0,1,4,3,8,5];
const own=(table,key)=>typeof key==='string'&&Object.hasOwn(table,key)?table[key]:null;
const safe=(s,max=100)=>typeof s==='string'&&s.length<=max&&/^[A-Za-z0-9_./:-]+$/.test(s)?s:null;
export function createResearchActivityProjector(){
 const spans=new Map();
 const parentRole=id=>{const seen=new Set();while(id&&spans.has(id)&&!seen.has(id)){seen.add(id);const s=spans.get(id);if(s.role!==null)return s.role;id=s.parent;}return null;};
 function project(e,transport){
  if(!e||typeof e.kind!=='string')return null;
  const label=transport==='browser_runtime'?'BROWSER NETWORK':transport==='injected_fixture'?'RESEARCH FIXTURE':transport==='local_host_transport'?'HOST RESEARCH':null;if(!label)return null;
  let role=null,to=null,state=null,station=null,detail=null;
  if(transport==='browser_runtime'){
   const parent=parentRole(e.parent),phase=e.operation;
   if(e.kind==='browser.agent'){
    role=own(agentRoles,e.agent);if(role===null)return null;
    if(phase==='start'){if(!safe(e.id)||spans.size>=512||spans.has(e.id))return null;spans.set(e.id,{role,parent:e.parent});state='working';station=stations[role];detail='Agent invocation started: '+e.agent;if(parent!==null&&parent!==role){to=role;role=parent;return {label,role,to,state:null,station:null,updateRole:to,updateState:'working',updateStation:stations[to],detail};}}
    else if(phase==='end'){if(!spans.has(e.id))return null;state='idle';detail='Agent invocation '+(e.status==='ok'?'completed':'stopped')+': '+e.agent;if(e.status==='ok'&&parent!==null&&parent!==role)to=parent;}else return null;
   }else if(e.kind==='browser.tool'){
    role=parent;if(role===null)return null;
    if(phase==='start'){if(!safe(e.id)||spans.size>=512||spans.has(e.id))return null;spans.set(e.id,{role:null,parent:e.parent});detail='Tool invocation started: '+(safe(e.tool)??'registered tool');}
    else if(phase==='end'&&spans.has(e.id)){detail='Tool invocation '+(e.status==='ok'?'completed':'stopped')+': '+(safe(e.tool)??'registered tool');if(e.status==='ok'&&e.tool==='mcp_inspect_evidence'){to=role;role=2;detail='Approved workspace evidence read completed; exact span returned.';}}
    else return null;
   }else if(e.kind==='browser.model_call'){
    role=parent;if(role===null)return null;
    if(phase==='start')detail='Model-call boundary entered; transport outcome not yet known.';
    else if(phase==='end')detail=e.status==='ok'?'Model transport response admitted; not verification.':'Model transport stopped; billing unverified.';
    else return null;
   }else if(e.kind==='browser.peer_consent'){
    role=4;detail='Peer contact '+(safe(phase)??'event')+' · '+(safe(e.status)??'recorded');station=9;
   }else return null;
  }else{
   role=own(roles,e.role);
   if(e.kind==='operation.pending'||e.kind==='operation.completed'||e.kind==='operation.failed'){
    if(role===null||!['model','search','document'].includes(e.operation))return null;
    state=e.kind==='operation.pending'?'working':'idle';station=state==='working'?(e.operation==='model'?stations[role]:1):null;
    detail=(e.operation==='model'?'Model transport':e.operation==='search'?'Public search':'Source retrieval')+' · '+e.kind.split('.')[1]+(safe(e.reason)?' · '+e.reason:'');
   }else if(e.kind==='model.response'){
    if(role===null)return null;detail='Model response receipt · '+(safe(e.vendor)??'provider')+' / '+(safe(e.model)??'model')+' · not evidence verification';
   }else if(e.kind==='evidence.admitted'){
    role=1;to=2;detail='Extracted source '+(safe(e.sourceId)??'record')+' admitted · '+(Number.isSafeInteger(e.passages)&&e.passages>=0?e.passages:0)+' exact passages; truth unverified.';
   }else if(e.kind==='evidence.indexed'){
    role=2;to=4;state='idle';detail='Deterministic evidence index completed · '+(Number.isSafeInteger(e.passages)&&e.passages>=0?e.passages:0)+' passages; not empirical verification.';
   }else if(e.kind==='report.assembled'){
    role=4;state='idle';detail='Report assembled · '+(safe(e.status)??'recorded')+' · authority NONE.';
   }else if(['session.open','session.resume','session.pause','session.close'].includes(e.kind)){
    role=4;detail='Host '+e.kind.replace('.',' ')+' · '+(safe(e.reason)??'recorded');
   }else return null; // task bookkeeping is not a separate observed handoff
  }
  return {label,role,to,state,station,updateRole:role,updateState:state,updateStation:station,detail};
 }
 return Object.freeze({project,reset(){spans.clear();}});
}
