// Explicit model-coverage counterexample. A finite case may omit a compatible
// hypothesis; a case pin and aligned graph do not prove completeness.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {alignedInvestigationExport} from './aligned-investigation.js';
import {casePin} from './pinned-investigation.js';
import {createVerifier} from './index.js';
export const COVERAGE_VERSION='sutra-world-coverage-attack/v1';
const QUAL='Hypothetical addition of one structurally aligned, nonduplicate input assignment. No empirical plausibility, model completeness, probability, evidence change or adoption is established.';
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const fail=()=>{throw TypeError('WORLD_COVERAGE_REFUSED');};
const keys=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const sort=(a,b)=>a<b?-1:a>b?1:0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
async function inputs(graphText){
 const graph=parseUniqueJson(graphText,{maxChars:65536,maxDepth:12}),run=await createVerifier().evaluate(graphText);
 const receipts=new Map(run.report.receipts.map(r=>[r.id,r.outcome]));
 const values=graph.nodes.filter(n=>n.kind==='input').sort((a,b)=>sort(a.id,b.id)).map(n=>({id:n.id,value:receipts.get(n.id).value,dimension:n.dimension}));
 return {values,receipts};
}
export async function coverageAttack(caseText,pin,eventText,requestText){
 const q=parseUniqueJson(requestText,{maxChars:4096,maxDepth:4});
 if(!keys(q,['worldId','baseWorldId','overrides'])||typeof q.worldId!=='string'||!ID.test(q.worldId)||typeof q.baseWorldId!=='string'||!ID.test(q.baseWorldId)||
    !q.overrides||typeof q.overrides!=='object'||Array.isArray(q.overrides)||!Object.keys(q.overrides).length||Object.keys(q.overrides).length>256||
    Object.entries(q.overrides).some(([k,v])=>!ID.test(k)||typeof v!=='string'))fail();
 const original=await alignedInvestigationExport(caseText,pin,eventText);
 const c=parseUniqueJson(caseText,{maxChars:262144,maxDepth:9});
 const base=c.worlds.find(w=>w.id===q.baseWorldId);
 if(!base||c.worlds.length>=12||c.worlds.some(w=>w.id===q.worldId))fail();
 const graph=parseUniqueJson(base.graphText,{maxChars:65536,maxDepth:12});
 if(Object.keys(q.overrides).some(id=>!graph.nodes.some(n=>n.id===id&&n.kind==='input')))fail();
 for(const n of graph.nodes)if(n.kind==='input'&&Object.hasOwn(q.overrides,n.id))n.value=q.overrides[n.id];
 const added={id:q.worldId,graphText:JSON.stringify(graph),constraintId:base.constraintId},candidate=await inputs(added.graphText);
 let baseInputs;
 for(const w of c.worlds){
  const existing=await inputs(w.graphText);
  if(same(existing.values,candidate.values))fail(); // exact normalized values, not wire spellings
  if(w.id===base.id)baseInputs=existing.values;
 }
 const changes=candidate.values.filter(n=>n.value!==baseInputs.find(o=>o.id===n.id).value).map(n=>({id:n.id,from:baseInputs.find(o=>o.id===n.id).value,to:n.value,dimension:n.dimension}));
 if(!changes.length)fail();
 c.worlds.push(added);
 const variantCaseText=JSON.stringify(c),variantPin=await casePin(variantCaseText),variant=await alignedInvestigationExport(variantCaseText,variantPin,eventText);
 const a=original.result,b=variant.result;
 if(a.eventDigest!==b.eventDigest||original.alignment.schemaDigest!==variant.alignment.schemaDigest||
    !same(a.report.activeEvidence,b.report.activeEvidence)||!same(a.report.history,b.report.history)||
    !same(a.report.unavailableSources,b.report.unavailableSources)||
    !same(a.report.worlds,b.report.worlds.filter(w=>w.id!==q.worldId))||
    !same(a.report.survivingWorlds,b.report.survivingWorlds.filter(w=>w!==q.worldId)))throw Error('COVERAGE_EXISTING_STATE_CHANGED');
 const blockers=a.report.activeEvidence.filter(r=>candidate.receipts.get(r.nodeId).value!==r.value).map(r=>({
  observationId:r.observationId,lineage:r.lineage,nodeId:r.nodeId,expected:candidate.receipts.get(r.nodeId).value,observed:r.value
 })).sort((a,b)=>sort(a.observationId,b.observationId));
 const compatible=b.report.survivingWorlds.includes(q.worldId);
 if(compatible!==!blockers.length)throw Error('COVERAGE_COMPATIBILITY_MISMATCH');
 return freeze({version:COVERAGE_VERSION,caseDigest:pin,eventDigest:a.eventDigest,schemaDigest:original.alignment.schemaDigest,requestDigest:await casePin(requestText),
  baseline:{state:a.state,survivingWorlds:a.report.survivingWorlds},
  candidate:{id:q.worldId,baseWorldId:q.baseWorldId,changes,compatible,decision:b.report.worlds.find(w=>w.id===q.worldId).decision,blockers},
  variantCaseText,variant:{caseDigest:variantPin,state:b.state,survivingWorlds:b.report.survivingWorlds,minimum:b.minimum,repairs:b.repairs,frontier:b.report.frontier,observationValues:b.observationValues},
  qualification:QUAL});
}
export async function exportCoverageAttack(caseText,pin,eventText,requestText){
 const result=await coverageAttack(caseText,pin,eventText,requestText);
 return freeze({version:COVERAGE_VERSION,caseText,eventText,requestText,result});
}
