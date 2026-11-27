/* Non-authoritative, run-scoped projection of local scripted council activity. No evidence, credentials, or model text. */
export function createCouncilActivity(){
 const terminal=new Set(['completed','refused','cancelled']);
 const phases=new Set(['request','response','transport-refused','proposal','abstained','rejected']);
 let run=null;
 const snapshot=()=>run?{runId:run.id,status:run.status,sequence:run.sequence,agents:[...run.agents.values()].map(a=>({id:a.id,status:a.status,round:a.round,requests:a.requests,responses:a.responses,proposals:a.proposals}))}:null;
 function apply(e){
  if(!e||Object.getPrototypeOf(e)!==Object.prototype||Object.keys(e).sort().join(',')!=='agent,agentIds,origin,phase,round,runId,sequence,version'||e.version!==1||e.origin!=='local-scripted'||!Number.isSafeInteger(e.runId)||e.runId<1||!Number.isSafeInteger(e.sequence)||e.sequence<1)return false;
  if(e.phase==='started'){
   if(!Array.isArray(e.agentIds)||e.agentIds.length<1||e.agentIds.length>4||new Set(e.agentIds).size!==e.agentIds.length||Array.from(e.agentIds).some(id=>typeof id!=='string'||!/^[a-z][a-z0-9_-]{0,39}$/.test(id))||e.sequence!==1||e.agent!==null||e.round!==null||(run&&(!terminal.has(run.status)||e.runId<=run.id)))return false;
   run={id:e.runId,status:'running',sequence:1,agents:new Map(e.agentIds.map(id=>[id,{id,status:'queued',round:0,requests:0,responses:0,proposals:0,tasks:new Map()}]))};return true;
  }
  if(e.agentIds!==null||!run||terminal.has(run.status)||e.runId!==run.id||e.sequence<=run.sequence)return false;
  if(terminal.has(e.phase)){
   if(e.agent!==null||e.round!==null)return false;
   run.status=e.phase;run.sequence=e.sequence;
   for(const a of run.agents.values())a.status=e.phase==='completed'?(a.status==='queued'?'not-run':a.status==='working'?'incomplete':a.status==='validating'?'unadmitted':a.status):e.phase;
   return true;
  }
  if(!phases.has(e.phase)||!run.agents.has(e.agent)||!Number.isSafeInteger(e.round)||e.round<1||e.round>100)return false;
  const a=run.agents.get(e.agent),prev=a.tasks.get(e.round);
  if(e.phase==='request'&&prev)return false;
  if(['response','transport-refused'].includes(e.phase)&&prev!=='request')return false;
  if(e.phase==='proposal'&&prev!=='response')return false;
  if(['abstained','rejected'].includes(e.phase)&&prev&&!['request','response','transport-refused'].includes(prev))return false;
  a.tasks.set(e.round,e.phase);run.sequence=e.sequence;
  if(e.phase==='request')a.requests++;
  if(e.phase==='response')a.responses++;
  if(e.phase==='proposal')a.proposals++;
  // Admission events can arrive after later-round transport events; never regress the displayed round.
  if(e.round>=a.round){a.round=e.round;a.status=({request:'working',response:'validating','transport-refused':'refused',proposal:'proposal-admitted',abstained:'abstained',rejected:'rejected'})[e.phase];}
  return true;
 }
 return {apply,snapshot};
}

export function createCouncilEmitter(runId,publish,isCancelled,agentIds=['agent_one','agent_two']){
 const ids=[...agentIds];
 let sequence=0,closed=false;const seen=new Set();
 function send(phase,agent=null,round=null){
  if(closed||isCancelled())return false;
  const key=JSON.stringify([phase,agent,round]);if(seen.has(key))return false;seen.add(key);
  publish({version:1,origin:'local-scripted',runId,sequence:++sequence,phase,agent,round,agentIds:phase==='started'?[...ids]:null});return true;
 }
 function finish(phase){
  if(closed||!['completed','refused','cancelled'].includes(phase))return false;
  closed=true;publish({version:1,origin:'local-scripted',runId,sequence:++sequence,phase,agent:null,round:null,agentIds:null});return true;
 }
 return {send,finish};
}
