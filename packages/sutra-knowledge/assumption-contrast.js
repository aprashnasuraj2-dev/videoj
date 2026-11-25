// Exact, finite assumption-contrast diagnostics. No new evidence, model adoption, or feasibility claim.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {alignedInvestigationExport} from './aligned-investigation.js';
import {auditObservedDomainGrid} from './coverage-grid.js';
import {createVerifier} from './index.js';
export const CONTRAST_VERSION='sutra-assumption-contrast/v1';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const sort=(a,b)=>a<b?-1:a>b?1:0;
const decisive=s=>s==='constraint_satisfied'||s==='constraint_refuted';
function analyzeAnchor(anchor,rows,axes,complete){
 const decisive=s=>s==='constraint_satisfied'||s==='constraint_refuted';
 const sort=(a,b)=>a<b?-1:a>b?1:0;
 const others=rows.filter(r=>r!==anchor).map(r=>({row:r,changes:r.values.flatMap((v,i)=>v===anchor.values[i]?[]:[{id:axes[i].id,from:anchor.values[i],to:v}])}));
 const opposite=x=>decisive(x.row.decision)&&x.row.decision!==anchor.decision;
 const singles=others.filter(x=>x.changes.length===1);
 const expected=axes.reduce((n,a)=>n+a.values.length-1,0);
 const oneFlip=singles.filter(opposite);
 const jointFlip=others.filter(x=>x.changes.length>1&&opposite(x));
 const witness=x=>({worldIds:x.row.worldIds,origin:x.row.origin,assignment:x.row.values,decision:x.row.decision,compatible:x.row.compatible,changes:x.changes,blockers:x.row.blockers,invalidOffers:x.row.invalidOffers});
 // Exact interventions are pairs (input ID, replacement rational), not just variable names.
 const subset=(a,b)=>a.every(x=>b.some(y=>x.id===y.id&&x.to===y.to));
 function frontier(xs){
  const ordered=xs.slice().sort((a,b)=>a.changes.length-b.changes.length||sort(JSON.stringify(a.changes),JSON.stringify(b.changes)));
  const mins=[];for(const x of ordered)if(!mins.some(y=>subset(y.changes,x.changes)))mins.push(x);
  return {count:xs.length,minimumChangedInputs:ordered.length?ordered[0].changes.length:null,minimalInterventions:mins.map(witness)};
 }
 let assessment='INCONCLUSIVE';
 if(oneFlip.length)assessment='SINGLE_FACTOR_FLIP_EXISTS';
 else if(complete&&singles.length===expected&&singles.every(x=>decisive(x.row.decision))){
  if(jointFlip.length)assessment='INTERACTION_ONLY_WITHIN_OBSERVED_DOMAINS';
  else if(others.every(x=>decisive(x.row.decision)))assessment='NO_FLIP_FOUND_IN_COMPLETE_GRID';
 }
 return {anchor:{worldIds:anchor.worldIds,assignment:anchor.values,decision:anchor.decision},oneFactor:{expected,evaluated:singles.length,unresolved:singles.filter(x=>!decisive(x.row.decision)).length,opposite:oneFlip.length,assessment},modelContrast:frontier(others.filter(opposite)),evidenceCompatibleContrast:frontier(others.filter(x=>opposite(x)&&x.row.compatible===true)),evidenceExcludedContrast:frontier(others.filter(x=>opposite(x)&&x.row.compatible===false)),admissionBlockedContrast:frontier(others.filter(x=>opposite(x)&&x.row.compatible===null)),unresolvedAssignments:others.filter(x=>!decisive(x.row.decision)||x.row.compatible===null).map(witness)};
}
export async function auditAssumptionContrast(caseText,pin,eventText='[]'){
 const aligned=await alignedInvestigationExport(caseText,pin,eventText),baseline=aligned.result;
 const grid=await auditObservedDomainGrid(caseText,pin,eventText);
 const c=parseUniqueJson(caseText,{maxChars:262144,maxDepth:9}),rows=[],groups=new Map();
 for(const w of c.worlds.slice().sort((a,b)=>sort(a.id,b.id))){
  const run=await createVerifier().evaluate(w.graphText),receipts=new Map(run.report.receipts.map(r=>[r.id,r.outcome]));
  const values=grid.axes.map(a=>receipts.get(a.id).value),key=JSON.stringify(values);
  const decision=receipts.get(w.constraintId).status;
  const blockers=baseline.report.activeEvidence.filter(r=>receipts.get(r.nodeId)?.value!==r.value).map(r=>({observationId:r.observationId,lineage:r.lineage,expected:receipts.get(r.nodeId)?.value??null,observed:r.value})).sort((a,b)=>sort(a.observationId,b.observationId));
  const compatible=baseline.report.survivingWorlds.includes(w.id);
  if(compatible!==!blockers.length)throw Error('CONTRAST_PROJECTION_MISMATCH');
  if(groups.has(key)){
   const r=groups.get(key);
   if(r.decision!==decision||r.compatible!==compatible||JSON.stringify(r.blockers)!==JSON.stringify(blockers))throw Error('CONTRAST_DUPLICATE_MISMATCH');
   r.worldIds.push(w.id);
  }else{const r={worldIds:[w.id],values,origin:'declared',decision,compatible,blockers,invalidOffers:[]};groups.set(key,r);rows.push(r);}
 }
 for(const x of grid.candidates){
  const values=x.assignment.map(a=>a.value),key=JSON.stringify(values);
  if(groups.has(key))throw Error('CONTRAST_DUPLICATE_MISMATCH');
  const r={worldIds:[],values,origin:'hypothetical',decision:x.decision,compatible:x.compatible,blockers:x.blockers,invalidOffers:x.invalidOffers};
  groups.set(key,r);rows.push(r);
 }
 rows.sort((a,b)=>sort(JSON.stringify(a.values),JSON.stringify(b.values)));
 const complete=grid.status!=='GRID_LIMIT_EXCEEDED';
 if(complete&&BigInt(rows.length)!==BigInt(grid.gridSize))throw Error('CONTRAST_GRID_MISMATCH');
 const anchors=rows.filter(r=>r.origin==='declared'&&r.compatible&&decisive(r.decision)).map(r=>analyzeAnchor(r,rows,grid.axes,complete));
 return freeze({version:CONTRAST_VERSION,caseDigest:pin,eventDigest:baseline.eventDigest,schemaDigest:aligned.alignment.schemaDigest,baselineState:baseline.state,axes:grid.axes,gridStatus:grid.status,gridSize:grid.gridSize,assignmentsEvaluated:rows.length,completeOverObservedValues:complete,anchors,qualification:'Exact discrete contrast relative to surviving declared anchors and represented input values. Model-only changes may contradict active readings; evidence-compatible means not excluded by admitted readings, not feasible, causal, independent, probable or recommended. A finite incomplete grid cannot establish absence of a reversal. No case, observation, availability or capsule mutation.'});
}

export async function exportAssumptionContrast(caseText,pin,eventText='[]'){
 return freeze({version:CONTRAST_VERSION,caseText,eventText,result:await auditAssumptionContrast(caseText,pin,eventText)});
}
