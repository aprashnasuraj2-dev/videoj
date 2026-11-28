import {createExecutionJournal} from '../../../../packages/sutra-runtime/execution-events.js';
import {parseUniqueJson} from '../../../../packages/sutra-consent/strict-json.js';

export const RUN_ARCHIVE_LIMITS=Object.freeze({events:2048,chars:262144,retained:8});
const fail=code=>{throw Error(code);};
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
function freeze(value){
 if(value&&typeof value==='object'){
  for(const x of Object.values(value))freeze(x);
  Object.freeze(value);
 }
 return value;
}
async function hash(text){
 const bytes=new TextEncoder().encode(text);
 return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
}
export function inspectRunEvents(events){
 if(!Array.isArray(events)||events.length<1||events.length>RUN_ARCHIVE_LIMITS.events)fail('RUN_ARCHIVE_EVENTS');
 const first=events[0];
 if(first?.type!=='run.open'||first.sequence!==1||typeof first.runId!=='string')fail('RUN_ARCHIVE_MANIFEST');
 const journal=createExecutionJournal({maxRuns:1,maxEvents:2048});
 for(const [i,e] of events.entries()){
  if(e.runId!==first.runId||e.version!==first.version||e.origin!==first.origin||e.sequence!==i+1||!journal.accept(e))fail('RUN_ARCHIVE_EVENT_REFUSED');
 }
 return freeze({snapshot:journal.snapshot(first.runId),events:journal.events(first.runId)});
}
export async function sealRunArchive(events){
 const inspected=inspectRunEvents(events);
 const body=JSON.stringify({schema:'sutra-execution-archive/v1',events:inspected.events});
 const digest=await hash(body);
 const text=JSON.stringify({schema:'sutra-execution-archive/v1',events:inspected.events,digest});
 if(text.length>RUN_ARCHIVE_LIMITS.chars)fail('RUN_ARCHIVE_SIZE');
 return freeze({...inspected,digest,text});
}
export async function readRunArchive(text){
 const raw=parseUniqueJson(text,{maxChars:RUN_ARCHIVE_LIMITS.chars,maxDepth:16});
 if(!exact(raw,['schema','events','digest'])||raw.schema!=='sutra-execution-archive/v1'||typeof raw.digest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(raw.digest))fail('RUN_ARCHIVE_SCHEMA');
 const canonical=await sealRunArchive(raw.events);
 if(canonical.digest!==raw.digest)fail('RUN_ARCHIVE_DIGEST');
 return canonical;
}
export function eventAccounting(events){
 const report={
  events:events.length,
  taskExecutions:0,taskCompleted:0,taskFailed:0,taskBlocked:0,taskCancelled:0,restored:0,
  consentRequested:0,consentGranted:0,consentDenied:0,skipped:0,
  providerDispatchAttempts:0,providerResponses:0,providerRefusedAfterDispatch:0,providerUnknown:0,
  consultationDispatchAttempts:0,consultationResponses:0,consultationAdmitted:0,consultationUnknown:0,
  scriptedRequests:0,scriptedResponses:0,scriptedProposals:0
 };
 const provider=new Map(),consultation=new Map();
 for(const e of events){
  const p=e.payload;
  if(e.type==='task.state'){
   const key={executing:'taskExecutions',completed:'taskCompleted',failed:'taskFailed',blocked:'taskBlocked',cancelled:'taskCancelled'}[p.status];
   if(key)report[key]++;
  }else if(e.type==='task.restore')report.restored++;
  else if(e.type==='provider.phase'){
   const key=p.taskId+'/'+p.routeId;
   if(p.phase==='consent-requested')report.consentRequested++;
   if(p.phase==='consent-granted')report.consentGranted++;
   if(p.phase==='consent-denied')report.consentDenied++;
   if(['skip-budget','skip-profile'].includes(p.phase))report.skipped++;
   if(p.phase==='dispatch-attempt'){
    report.providerDispatchAttempts++;
    provider.set(key,'pending');
   }
   if(p.phase==='response'){
    report.providerResponses++;
    provider.set(key,'response');
   }
   if(['refused','cancelled'].includes(p.phase)&&provider.get(key)==='pending'){
    report.providerRefusedAfterDispatch++;
    provider.set(key,'unknown');
   }
  }else if(e.type==='consultation.phase'){
   const key=p.taskId+'/'+p.slotId+'/'+p.round;
   if(p.phase==='dispatch-attempt'){
    report.consultationDispatchAttempts++;
    consultation.set(key,'pending');
   }
   if(p.phase==='transport-response'){
    report.consultationResponses++;
    consultation.set(key,'response');
   }
   if(p.phase==='proposal-admitted')report.consultationAdmitted++;
   if(p.phase==='rejected'&&consultation.get(key)==='pending')consultation.set(key,'unknown');
  }else if(e.type==='council.phase'){
   if(p.phase==='request')report.scriptedRequests++;
   if(p.phase==='response')report.scriptedResponses++;
   if(p.phase==='proposal')report.scriptedProposals++;
  }
 }
 report.providerUnknown=[...provider.values()].filter(x=>x!=='response').length;
 report.consultationUnknown=[...consultation.values()].filter(x=>x!=='response').length;
 return freeze(report);
}
export function compareRunRecords(a,b){
 const left=a.snapshot,right=b.snapshot;
 const old=new Map(left.tasks.map(t=>[t.id,t]));
 const now=new Map(right.tasks.map(t=>[t.id,t]));
 const tasks=[];
 for(const id of [...new Set([...old.keys(),...now.keys()])].sort()){
  const before=old.get(id),after=now.get(id);
  const same=before&&after&&before.kind===after.kind&&before.agentId===after.agentId&&JSON.stringify(before.dependsOn)===JSON.stringify(after.dependsOn);
  tasks.push({id,relation:!before?'added':!after?'removed':!same?'declaration_changed':before.status!==after.status?'status_changed':'same_metadata',before:before?.status??null,after:after?.status??null});
 }
 const oldAccounting=eventAccounting(a.events),newAccounting=eventAccounting(b.events);
 return freeze({
  sameVersion:left.version===right.version,sameOrigin:left.origin===right.origin,
  before:{runId:left.runId,version:left.version,origin:left.origin,status:left.status},
  after:{runId:right.runId,version:right.version,origin:right.origin,status:right.status},
  tasks,
  accounting:Object.keys(oldAccounting).map(key=>({key,before:oldAccounting[key],after:newAccounting[key],delta:newAccounting[key]-oldAccounting[key]})),
  qualification:'Metadata comparison only. Matching IDs or states do not establish equal artifacts, execution authenticity, model independence or actual billing.'
 });
}
export function eventDescription(e){
 const p=e.payload;
 if(e.type==='run.open')return {title:'Manifest admitted',detail:e.origin==='local-scripted'?p.agents.length+' declared participants':p.tasks.length+' declared tasks'};
 if(e.type==='run.close')return {title:'Run closed',detail:p.status};
 if(e.type==='task.state')return {title:p.taskId,detail:p.agentId+' · '+p.status};
 if(e.type==='task.restore')return {title:p.taskId+' restored',detail:'Prior run '+p.priorRunId+' · '+p.artifactDigest};
 if(e.type==='provider.phase')return {title:p.taskId+' / '+p.routeId,detail:p.phase};
 if(e.type==='consultation.phase')return {title:p.taskId+' / '+p.slotId,detail:'Round '+p.round+' · '+p.phase};
 if(e.type==='council.phase')return {title:p.agentId,detail:'Scripted round '+p.round+' · '+p.phase};
 return {title:'Recorded event',detail:e.type};
}
export function createRunLibrary(){
 let records=[];
 function add(record,origin){
  if(!record?.digest||!['local_feed','imported_file'].includes(origin))fail('RUN_LIBRARY_RECORD');
  const entry=freeze({record,origin});
  records=[entry,...records.filter(x=>x.record.digest!==record.digest)].slice(0,RUN_ARCHIVE_LIMITS.retained);
  return entry;
 }
 function remove(digest){records=records.filter(x=>x.record.digest!==digest);}
 function list(){return Object.freeze([...records]);}
 return Object.freeze({add,remove,list});
}
