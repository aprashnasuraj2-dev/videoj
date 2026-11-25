// Counterfactual measurement-policy sensitivity, not new evidence admission.
// Preserve the exact original point observations, case, history and capsule.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {alignedInvestigationExport} from './aligned-investigation.js';
import {casePin} from './pinned-investigation.js';
import {createVerifier} from './index.js';
import {evaluateFrontier} from './frontier.js';
export const RANGE_VERSION='sutra-measurement-sensitivity/v1';
const QUAL='Hypothetical inclusive interval relaxation of admitted point readings in the same declared finite model. No measurement uncertainty, source truth, shared calibration, independence, freshness or permission to change evidence is established.';
const fail=()=>{throw TypeError('MEASUREMENT_RANGE_REFUSED');};
const sort=(a,b)=>a<b?-1:a>b?1:0;
const keys=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function rational(s){
 if(typeof s!=='string'||!/^(-?(?:0|[1-9]\d{0,154}))\/([1-9]\d{0,154})$/.test(s)||s.startsWith('-0'))fail();
 const [n,d]=s.split('/').map(BigInt);
 let a=n<0n?-n:n,b=d;
 if(a.toString(2).length>512||b.toString(2).length>512)fail();
 while(b){const t=a%b;a=b;b=t;}
 if(a!==1n)fail();
 return [n,d];
}
const cmp=(a,b)=>{const v=a[0]*b[1]-b[0]*a[1];return v<0n?-1:v>0n?1:0;};
const inRange=(x,lo,hi)=>cmp(x,lo)>=0&&cmp(x,hi)<=0;
function state(worlds,summary){
 if(!worlds.length)return 'CONFLICTED';
 const ds=worlds.map(w=>summary.get(w).decision);
 if(ds.some(x=>!['constraint_satisfied','constraint_refuted'].includes(x)))return 'UNVERIFIED';
 return ds.every(x=>x==='constraint_satisfied')?'SUPPORTED':ds.every(x=>x==='constraint_refuted')?'REFUTED':'UNDERDETERMINED';
}
export async function measurementSensitivity(caseText,pin,eventText,requestText){
 const q=parseUniqueJson(requestText,{maxChars:4096,maxDepth:3});
 if(!keys(q,['observationId','lower','upper'])||typeof q.observationId!=='string')fail();
 const lo=rational(q.lower),hi=rational(q.upper);
 if(cmp(lo,hi)>0)fail();
 const original=await alignedInvestigationExport(caseText,pin,eventText),report=original.result.report;
 const selected=report.activeEvidence.find(o=>o.observationId===q.observationId);
 if(!selected||!inRange(rational(selected.value),lo,hi))fail();
 const active=[...report.activeEvidence].sort((a,b)=>sort(a.observationId,b.observationId));
 // Explicit hypothetical cohort, not inferred copying or common calibration.
 const cohort=active.filter(r=>r.lineage===selected.lineage&&r.nodeId===selected.nodeId&&r.value===selected.value&&r.dimension.every((d,i)=>d===selected.dimension[i])).map(r=>r.observationId);
 const c=parseUniqueJson(caseText,{maxChars:262144,maxDepth:9});
 const worlds=[...c.worlds].sort((a,b)=>sort(a.id,b.id)),summary=new Map(report.worlds.map(w=>[w.id,w])),predictions=new Map();
 for(const w of worlds){
  const run=await createVerifier().evaluate(w.graphText);
  predictions.set(w.id,new Map(run.report.receipts.map(r=>[r.id,r.outcome.value])));
 }
 const available=c.offers.filter(o=>!report.unavailableSources.includes(o.sourceId)&&!active.some(r=>r.observationId===o.id)).sort((a,b)=>sort(a.id,b.id));
 const baseline=[...report.survivingWorlds];
 async function variant(relaxed){
  const blockers=worlds.map(w=>({world:w.id,observations:active.filter(r=>{
   const v=predictions.get(w.id).get(r.nodeId);
   return relaxed.includes(r.observationId)?!inRange(rational(v),lo,hi):v!==r.value;
  }).map(r=>r.observationId)}));
  const survivors=blockers.filter(x=>!x.observations.length).map(x=>x.world);
  if(!baseline.every(w=>survivors.includes(w)))throw Error('RANGE_MONOTONICITY');
  const observationValues=survivors.length?available.map(o=>{
   const vs=[...new Set(survivors.map(w=>predictions.get(w).get(o.nodeId)))].sort(sort);
   return {id:o.id,dimension:o.dimension,outcomes:vs.map((v,i)=>({label:'value_'+i,value:v,worlds:survivors.filter(w=>predictions.get(w).get(o.nodeId)===v)}))};
  }):[];
  const frontier=survivors.length?await evaluateFrontier(JSON.stringify({version:1,decisionId:c.decisionId,costUnit:c.costUnit,
   worlds:worlds.filter(w=>survivors.includes(w.id)),
   observations:observationValues.map(o=>({id:o.id,cost:available.find(a=>a.id===o.id).cost,outcomes:Object.fromEntries(o.outcomes.flatMap(v=>v.worlds.map(w=>[w,v.label])))}))})):null;
  return {relaxed,state:state(survivors,summary),survivingWorlds:survivors,readmittedWorlds:survivors.filter(w=>!baseline.includes(w)),blockers,frontier,observationValues};
 }
 const single=await variant([selected.observationId]),shared=await variant(cohort);
 if(!single.survivingWorlds.every(w=>shared.survivingWorlds.includes(w)))throw Error('RANGE_COHORT_MONOTONICITY');
 return freeze({version:RANGE_VERSION,caseDigest:pin,eventDigest:original.result.eventDigest,schemaDigest:original.alignment.schemaDigest,
  requestDigest:await casePin(requestText),baseline:{state:original.result.state,survivingWorlds:baseline},selected:{
   observationId:selected.observationId,lineage:selected.lineage,nodeId:selected.nodeId,value:selected.value,dimension:selected.dimension,lower:q.lower,upper:q.upper},
  cohort,single,shared,qualification:QUAL});
}
export async function exportMeasurementSensitivity(caseText,pin,eventText,requestText){
 const result=await measurementSensitivity(caseText,pin,eventText,requestText);
 return freeze({version:RANGE_VERSION,caseText,eventText,requestText,result});
}
