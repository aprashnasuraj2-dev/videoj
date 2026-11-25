// Host-pinned arbitrary finite cases. A case pin is not empirical validation.
// No fetch, no inference, no mutation of the flagship fixture or its capsule.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {evaluateEvidenceSessionWithProjection,sourceDigest} from './evidence-session.js';
import {createVerifier} from './index.js';
export const GENERAL_VERSION='sutra-pinned-investigation/v1';
const MAX=262144, HASH=/^sha256:[a-f0-9]{64}$/;
const fail=code=>{throw TypeError(code);};
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const sort=(a,b)=>a<b?-1:a>b?1:0;
const subset=(a,b)=>a.every(x=>b.includes(x));
export async function casePin(text){
 if(typeof text!=='string'||text.length>MAX||/[\ud800-\udfff]/u.test(text))fail('CASE_BYTES');
 const bytes=new TextEncoder().encode(text);
 if(!bytes.length||bytes.length>MAX)fail('CASE_BYTES');
 return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
}
const state=worlds=>{
 if(!worlds.length)return 'CONFLICTED';
 if(worlds.some(w=>!['constraint_satisfied','constraint_refuted'].includes(w.decision)))return 'UNVERIFIED';
 return worlds.every(w=>w.decision==='constraint_satisfied')?'SUPPORTED':worlds.every(w=>w.decision==='constraint_refuted')?'REFUTED':'UNDERDETERMINED';
};
export async function investigatePinnedCase(caseText,expectedPin,eventText='[]'){
 if(typeof expectedPin!=='string'||!HASH.test(expectedPin))fail('CASE_PIN_REQUIRED');
 if(await casePin(caseText)!==expectedPin)fail('CASE_PIN_MISMATCH');
 // Separate pin authenticates bytes relative to the caller's expectation.
 // Strict core admission validates every world, source, offer, and event.
 await casePin(eventText);
 const {report,projection}=await evaluateEvidenceSessionWithProjection(caseText,eventText);
 const c=parseUniqueJson(caseText,{maxChars:MAX,maxDepth:9});
 const events=parseUniqueJson(eventText,{maxChars:MAX,maxDepth:6});
 const worlds=projection.worlds,roots=Object.keys(report.lineageGroups).sort(sort),all=(1<<worlds.length)-1;
 const masks=Object.fromEntries(roots.map(r=>[r,all]));
 for(const o of projection.observations){
  const r=report.activeEvidence.find(x=>x.observationId===o.id);
  if(!r||!Object.hasOwn(masks,r.lineage))fail('PROJECTION_MISMATCH');
  masks[r.lineage]&=o.mask;
 }
 const combinations=[];
 for(let bits=0;bits<(1<<roots.length);bits++){
  const rs=roots.filter((_,i)=>bits&(1<<i));
  const mask=rs.reduce((m,r)=>m&masks[r],all);
  combinations.push({roots:rs,worlds:worlds.filter((_,i)=>mask&(1<<i))});
 }
 combinations.sort((a,b)=>a.roots.length-b.roots.length||sort(a.roots.join('|'),b.roots.join('|')));
 const minimum={support:[],refutation:[],conflict:[]};
 for(const x of combinations){
  const s=state(x.worlds),k=s==='SUPPORTED'?'support':s==='REFUTED'?'refutation':s==='CONFLICTED'?'conflict':null;
  if(k&&!minimum[k].some(y=>subset(y.roots,x.roots)))minimum[k].push({roots:x.roots,worlds:x.worlds.map(w=>w.id)});
 }
 const full=combinations.find(x=>x.roots.length===roots.length),current=state(full.worlds);
 if(JSON.stringify(full.worlds.map(w=>w.id))!==JSON.stringify(report.survivingWorlds))fail('PROJECTION_MISMATCH');
 const repairs=[];
 if(current==='CONFLICTED')for(const removed of combinations){
  const kept=roots.filter(r=>!removed.roots.includes(r)),candidate=combinations.find(x=>x.roots.length===kept.length&&subset(kept,x.roots));
  if(candidate.worlds.length&&!repairs.some(x=>subset(x.remove,removed.roots)))repairs.push({remove:removed.roots,state:state(candidate.worlds),worlds:candidate.worlds.map(w=>w.id)});
 }
 // Frontier labels are ordinal IDs, NOT observed numeric values. Recover
 // exact rationals over the full surviving set, using the same global
 // partition as the frontier, even for deeper policy branches.
 const available=c.offers.filter(o=>!report.unavailableSources.includes(o.sourceId)&&!report.activeEvidence.some(r=>r.observationId===o.id)).sort((a,b)=>sort(a.id,b.id));
 const values=new Map();
 if(full.worlds.length)for(const w of c.worlds.filter(w=>report.survivingWorlds.includes(w.id))){
  const run=await createVerifier().evaluate(w.graphText);
  values.set(w.id,new Map(run.report.receipts.map(r=>[r.id,r.outcome.value])));
 }
 const observationValues=full.worlds.length?available.map(o=>{
  const vs=[...new Set(full.worlds.map(w=>values.get(w.id).get(o.nodeId)))].sort(sort);
  return {id:o.id,dimension:o.dimension,outcomes:vs.map((v,i)=>({label:'value_'+i,value:v,worlds:full.worlds.filter(w=>values.get(w.id).get(o.nodeId)===v).map(w=>w.id)}))};
 }):[];
 const rootSummary=roots.map(root=>{
  const obs=report.activeEvidence.filter(r=>r.lineage===root);
  return {root,sourceIds:[...new Set(obs.map(r=>r.sourceId))].sort(sort),observationIds:obs.map(r=>r.observationId).sort(sort)};
 });
 return freeze({version:GENERAL_VERSION,caseDigest:expectedPin,eventDigest:await casePin(eventText),state:current,rootSummary,minimum,repairs,observationValues,report,
 qualification:'Conditional on the supplied finite case, declared source ancestry and exact pinned bytes. Neither model completeness, source truth, independence, freshness nor authorization to discard evidence is established.'});
}
export async function pinnedInvestigationExport(caseText,pin,eventText){
 const result=await investigatePinnedCase(caseText,pin,eventText);
 return freeze({version:GENERAL_VERSION,caseText,eventText,result});
}
export async function capacityExample(){
 const scope='synthetic_capacity',dimension=[0,0,0],worlds=[],sources=[],offers=[],reads={};
 const input=(id,v)=>({id,kind:'input',value:String(v),dimension,basis:'Synthetic capacity assumption'});
 for(const load of [10,20,30])for(const cap of [20,40]){
  const nodes=[input('load',load),input('capacity',cap),{id:'target',kind:'constraint',op:'le',args:['load','capacity']}];
  worlds.push({id:'load_'+load+'_cap_'+cap,graphText:JSON.stringify({schemaVersion:1,nodes}),constraintId:'target'});
 }
 for(const [id,node,v,root,observationId,cost] of [
  ['meter','load','30/1','meter_root','read_meter',1],['mirror','load','30/1','meter_root','read_mirror',1],
  ['alternate','load','10/1','alternate_root','read_alternate',2],['capacity_record','capacity','20/1','capacity_root','read_capacity',3]]){
  const sourceText=JSON.stringify({version:1,sourceId:id,sourceVersion:'v1',scope,values:{[node]:{value:v,dimension}}});
  sources.push({id,version:'v1',digest:await sourceDigest(sourceText),lineage:root});
  offers.push({id:observationId,nodeId:node,sourceId:id,cost,dimension});
  reads[observationId]={type:'read',observationId,sourceText};
 }
 const caseText=JSON.stringify({version:1,decisionId:'load_within_capacity',scope,costUnit:'synthetic_effort',worlds,sources,offers});
 return freeze({caseText,pin:await casePin(caseText),reads});
}
