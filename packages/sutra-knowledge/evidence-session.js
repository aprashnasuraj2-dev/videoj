// Host-approved finite investigation. Source hash authenticates bytes relative
// to an independently supplied pin, NOT factual truth, independence or publisher identity.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {createVerifier} from './index.js';
import {evaluateFrontier} from './frontier.js';
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const id=x=>typeof x==='string'&&ID.test(x);
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const fail=code=>{throw TypeError(code);};
const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
const dimension=d=>Array.isArray(d)&&d.length===3&&d.every(x=>Number.isInteger(x)&&x>=-16&&x<=16&&!Object.is(x,-0));
const sameDim=(a,b)=>a.every((x,i)=>x===b[i]);
export async function sourceDigest(text){
 if(typeof text!=='string'||text.length>65536||/[\ud800-\udfff]/u.test(text))fail('EVIDENCE_SIZE');
 return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
}
function exactValue(value){
 // Receipt rationals use the kernel's normalized representation. Do not
 // silently equate alternate wire encodings or float values.
 if(typeof value!=='string'||!/^(-?(?:0|[1-9]\d{0,154}))\/([1-9]\d{0,154})$/.test(value)||value.startsWith('-0'))fail('EVIDENCE_VALUE');
 const [a,b]=value.split('/').map(BigInt);let x=a<0n?-a:a,y=b;
 while(y){const r=x%y;x=y;y=r;}
 if(x!==1n||a.toString(2).replace('-','').length>512||b.toString(2).length>512)fail('EVIDENCE_VALUE');
 return value;
}
function unique(items,key){return new Set(items.map(x=>x[key])).size===items.length;}
function admit(text){
 const c=parseUniqueJson(text,{maxChars:262144,maxDepth:9});
 if(!keys(c,['version','decisionId','scope','costUnit','worlds','sources','offers'])||c.version!==1||!id(c.decisionId)||!id(c.scope)||!id(c.costUnit)||
 !Array.isArray(c.worlds)||c.worlds.length<1||c.worlds.length>12||!Array.isArray(c.sources)||c.sources.length<1||c.sources.length>8||
 !Array.isArray(c.offers)||c.offers.length>8)fail('EVIDENCE_CASE');
 for(const w of c.worlds)if(!keys(w,['id','graphText','constraintId'])||!id(w.id)||!id(w.constraintId)||typeof w.graphText!=='string'||w.graphText.length>65536)fail('EVIDENCE_WORLD');
 for(const s of c.sources)if(!keys(s,['id','version','digest','lineage'])||!id(s.id)||!id(s.version)||typeof s.digest!=='string'||!SHA.test(s.digest)||!id(s.lineage))fail('EVIDENCE_SOURCE_PIN');
 for(const o of c.offers)if(!keys(o,['id','nodeId','sourceId','cost','dimension'])||!id(o.id)||!id(o.nodeId)||!id(o.sourceId)||!Number.isSafeInteger(o.cost)||o.cost<1||o.cost>1000000||!dimension(o.dimension)||!c.sources.some(s=>s.id===o.sourceId))fail('EVIDENCE_OFFER');
 if(!unique(c.worlds,'id')||!unique(c.sources,'id')||!unique(c.offers,'id'))fail('EVIDENCE_DUPLICATE');
 // Duplicate source/node offers can disguise repeated reads as corroboration.
 if(new Set(c.offers.map(o=>o.sourceId+'|'+o.nodeId)).size!==c.offers.length)fail('EVIDENCE_DUPLICATE_OFFER');
 for(const k of ['worlds','sources','offers'])c[k].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 return c;
}
function valueLabel(index){return 'value_'+index;}
function activeMask(reads,all){return reads.reduce((m,r)=>m&r.mask,all);}
function minimalConflict(reads,all){
 // Enumerate by cardinality, stable ID order. Bounds: <= 8 active offers.
 const sorted=[...reads].sort((a,b)=>a.observationId<b.observationId?-1:1);
 for(let size=1;size<=sorted.length;size++){
  let found=null;
  function visit(start,chosen,mask){
   if(found)return;
   if(chosen.length===size){if(mask===0)found=chosen;return;}
   for(let i=start;i<=sorted.length-(size-chosen.length);i++)visit(i+1,[...chosen,sorted[i].observationId],mask&sorted[i].mask);
  }
  visit(0,[],all);if(found)return found;
 }
 return null;
}
export async function evaluateEvidenceSession(caseText,eventText='[]'){
 return (await evaluateEvidenceSessionWithProjection(caseText,eventText)).report;
}
// The projection is derived only from locally verified graph outcomes and
// admitted active evidence. It is not a peer-controlled support assertion.
export async function evaluateEvidenceSessionWithProjection(caseText,eventText='[]'){
 const c=admit(caseText);
 const events=parseUniqueJson(eventText,{maxChars:262144,maxDepth:6});
 if(!Array.isArray(events)||events.length>24)fail('EVIDENCE_EVENTS');
 const sources=new Map(c.sources.map(s=>[s.id,s])),offers=new Map(c.offers.map(o=>[o.id,o]));
 const worldReports=[];
 for(const w of c.worlds){
  const graph=parseUniqueJson(w.graphText,{maxChars:65536,maxDepth:12});
  if(!Array.isArray(graph?.nodes)||graph.nodes.filter(n=>n?.id===w.constraintId&&n.kind==='constraint').length!==1)fail('EVIDENCE_CONSTRAINT');
  const run=await createVerifier().evaluate(w.graphText);
  const byId=new Map(run.report.receipts.map(r=>[r.id,r]));
  for(const o of c.offers){
   const value=byId.get(o.nodeId)?.outcome;
   if(!value||typeof value.value!=='string'||!Array.isArray(value.dimension)||!sameDim(value.dimension,o.dimension))fail('EVIDENCE_WORLD_QUANTITY');
   exactValue(value.value);
  }
  const target=byId.get(w.constraintId);
  worldReports.push({world:w,byId,summary:{id:w.id,decision:target.outcome.status,graphDigest:run.report.graphDigest,receiptDigest:target.receiptDigest}});
 }
 const all=(1<<worldReports.length)-1,unavailable=new Set(),blockedLineages=new Set(),reads=new Map(),history=[];
 const sourceAvailable=s=>!unavailable.has(s.id)&&!blockedLineages.has(s.lineage);
 const dropInactive=()=>{for(const [id,r] of reads)if(!sourceAvailable(sources.get(r.sourceId)))reads.delete(id);};
 for(const e of events){
  if(e?.type==='read'){
   if(!keys(e,['type','observationId','sourceText'])||!offers.has(e.observationId)||reads.has(e.observationId)||typeof e.sourceText!=='string')fail('EVIDENCE_READ');
   const o=offers.get(e.observationId),s=sources.get(o.sourceId);
   if(!sourceAvailable(s))fail('EVIDENCE_SOURCE_UNAVAILABLE');
   if(await sourceDigest(e.sourceText)!==s.digest)fail('EVIDENCE_HASH_MISMATCH');
   const d=parseUniqueJson(e.sourceText,{maxChars:65536,maxDepth:7});
   if(!keys(d,['version','sourceId','sourceVersion','scope','values'])||d.version!==1||d.sourceId!==s.id||d.sourceVersion!==s.version||d.scope!==c.scope||
    !d.values||typeof d.values!=='object'||Array.isArray(d.values)||Object.keys(d.values).length>32)fail('EVIDENCE_SCOPE');
   for(const [node,v] of Object.entries(d.values)){
    if(!id(node)||!keys(v,['value','dimension'])||!dimension(v.dimension))fail('EVIDENCE_SOURCE_VALUE');
    exactValue(v.value);
   }
   const v=Object.hasOwn(d.values,o.nodeId)?d.values[o.nodeId]:null;
   if(!v||!sameDim(v.dimension,o.dimension))fail('EVIDENCE_OBSERVATION_DIMENSION');
   let mask=0;
   for(let i=0;i<worldReports.length;i++)if(worldReports[i].byId.get(o.nodeId).outcome.value===v.value)mask|=1<<i;
   const receipt={observationId:o.id,nodeId:o.nodeId,sourceId:s.id,sourceVersion:s.version,sourceDigest:s.digest,lineage:s.lineage,
    scope:c.scope,value:v.value,dimension:v.dimension,level:'host_pinned_bytes',truthStatus:'unverified',mask};
   reads.set(o.id,receipt);
   history.push({type:'read',receipt:{...receipt,mask:undefined}});
  }else if(e?.type==='withdraw_source'||e?.type==='restore_source'){
   if(!keys(e,['type','sourceId'])||!sources.has(e.sourceId))fail('EVIDENCE_SOURCE_EVENT');
   if(e.type==='withdraw_source'){if(unavailable.has(e.sourceId))fail('EVIDENCE_REPEAT_WITHDRAWAL');unavailable.add(e.sourceId);}
   else{if(!unavailable.has(e.sourceId))fail('EVIDENCE_NOT_WITHDRAWN');unavailable.delete(e.sourceId);}
   dropInactive();history.push({...e});
  }else if(e?.type==='withdraw_lineage'||e?.type==='restore_lineage'){
   if(!keys(e,['type','lineage'])||!c.sources.some(s=>s.lineage===e.lineage))fail('EVIDENCE_LINEAGE_EVENT');
   if(e.type==='withdraw_lineage'){if(blockedLineages.has(e.lineage))fail('EVIDENCE_REPEAT_WITHDRAWAL');blockedLineages.add(e.lineage);}
   else{if(!blockedLineages.has(e.lineage))fail('EVIDENCE_NOT_WITHDRAWN');blockedLineages.delete(e.lineage);}
   dropInactive();history.push({...e});
  }else fail('EVIDENCE_EVENT_TYPE');
 }
 const active=[...reads.values()],mask=activeMask(active,all);
 const alive=worldReports.filter((_,i)=>mask&(1<<i));
 const usable=c.offers.filter(o=>sourceAvailable(sources.get(o.sourceId))&&!reads.has(o.id));
 const lineageGroups=Object.fromEntries([...new Set(active.map(r=>r.lineage))].sort().map(l=>[l,active.filter(r=>r.lineage===l).map(r=>r.observationId).sort()]));
 const base={version:1,decisionId:c.decisionId,scope:c.scope,costUnit:c.costUnit,truthStatus:'unverified',
  qualification:'Conditional on the finite host-approved worlds, source pins and exact observations. Shared lineage is declared, not proof of independence. Costs are declared per observation; source bytes may contain multiple fields.',
  worlds:worldReports.map(w=>w.summary),survivingWorlds:alive.map(w=>w.world.id),
  unavailableSources:c.sources.filter(s=>!sourceAvailable(s)).map(s=>s.id),lineageGroups,
  activeEvidence:active.map(({mask,...rest})=>rest),history:history.map(h=>h.type==='read'?{type:'read',receipt:Object.fromEntries(Object.entries(h.receipt).filter(([k])=>k!=='mask'))}:h)};
 const projection={version:1,worlds:worldReports.map(w=>({id:w.world.id,decision:w.summary.decision})),
  observations:active.map(r=>({id:r.observationId,mask:r.mask})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)};
 if(!mask)return freeze({report:{...base,status:'inconsistent_observations',conflict:minimalConflict(active,all),frontier:null},projection});
 const observations=usable.map(o=>{
  const values=[...new Set(alive.map(w=>w.byId.get(o.nodeId).outcome.value))].sort();
  return {id:o.id,cost:o.cost,outcomes:Object.fromEntries(alive.map(w=>[w.world.id,valueLabel(values.indexOf(w.byId.get(o.nodeId).outcome.value))]))};
 });
 const frontier=await evaluateFrontier(JSON.stringify({version:1,decisionId:c.decisionId,costUnit:c.costUnit,worlds:alive.map(w=>w.world),observations}));
 return freeze({report:{...base,status:frontier.status,frontier},projection});
}
