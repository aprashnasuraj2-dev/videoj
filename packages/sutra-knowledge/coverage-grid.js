// Bounded combinatorial coverage audit over values already present in the case.
// Cartesian closure is a hypothetical assumption, NOT evidence that inputs vary independently.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {alignedInvestigationExport} from './aligned-investigation.js';
import {createVerifier} from './index.js';
export const GRID_VERSION='sutra-observed-domain-grid/v1';
const LIMIT=12;
const QUAL='Hypothetical Cartesian closure over exact input values already present in the pinned model. Input independence, feasibility, empirical completeness and adoption are not established. No new observation policy or source availability is asserted.';
const sort=(a,b)=>a<b?-1:a>b?1:0;
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const rationalOrder=(a,b)=>{const [an,ad]=a.split('/').map(BigInt),[bn,bd]=b.split('/').map(BigInt);const d=an*bd-bn*ad;return d<0n?-1:d>0n?1:0;};
const state=outcomes=>!outcomes.length?'CONFLICTED':outcomes.some(x=>!['constraint_satisfied','constraint_refuted'].includes(x))?'UNVERIFIED':outcomes.every(x=>x==='constraint_satisfied')?'SUPPORTED':outcomes.every(x=>x==='constraint_refuted')?'REFUTED':'UNDERDETERMINED';
const compact=x=>JSON.stringify(x);
export async function auditObservedDomainGrid(caseText,pin,eventText){
 const original=await alignedInvestigationExport(caseText,pin,eventText),a=original.result;
 const c=parseUniqueJson(caseText,{maxChars:262144,maxDepth:9}),worlds=c.worlds.slice().sort((x,y)=>sort(x.id,y.id));
 const domains=new Map(),groups=new Map(),prepared=[];
 for(const w of worlds){
  const graph=parseUniqueJson(w.graphText,{maxChars:65536,maxDepth:12}),run=await createVerifier().evaluate(w.graphText),receipts=new Map(run.report.receipts.map(r=>[r.id,r]));
  const inputs=graph.nodes.filter(n=>n.kind==='input').sort((x,y)=>sort(x.id,y.id));
  const values=inputs.map(n=>{const v=receipts.get(n.id).outcome.value;if(!domains.has(n.id))domains.set(n.id,{dimension:n.dimension,raw:new Map()});const d=domains.get(n.id);if(!d.raw.has(v))d.raw.set(v,n.value);return v;});
  const key=compact(values);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(w.id);prepared.push({world:w,graph,values});
 }
 const axes=[...domains.entries()].map(([id,d])=>({id,dimension:d.dimension,values:[...d.raw.keys()].sort(rationalOrder)}));
 const gridSize=axes.reduce((n,d)=>n*BigInt(d.values.length),1n),missingCount=gridSize-BigInt(groups.size);
 const base={version:GRID_VERSION,caseDigest:pin,eventDigest:a.eventDigest,schemaDigest:original.alignment.schemaDigest,baseline:{state:a.state,survivingWorlds:a.report.survivingWorlds},axes,gridSize:gridSize.toString(),uniqueAssignments:groups.size,missingCount:missingCount.toString(),duplicateGroups:[...groups.values()].filter(g=>g.length>1),qualification:QUAL};
 if(gridSize>BigInt(LIMIT))return freeze({...base,status:'GRID_LIMIT_EXCEEDED',candidates:[],closureState:null});
 const grid=[[]];for(const axis of axes){const next=[];for(const prefix of grid)for(const value of axis.values)next.push([...prefix,value]);grid.splice(0,grid.length,...next);}
 const candidates=[];for(const values of grid){
  if(groups.has(compact(values)))continue;
  const closest=prepared.map(x=>({...x,distance:x.values.filter((v,i)=>v!==values[i]).length})).sort((x,y)=>x.distance-y.distance||sort(x.world.id,y.world.id))[0];
  const graph=structuredClone(closest.graph),changes=[];
  for(let i=0;i<axes.length;i++){const axis=axes[i];if(closest.values[i]!==values[i])changes.push({id:axis.id,from:closest.values[i],to:values[i]});graph.nodes.find(n=>n.id===axis.id).value=domains.get(axis.id).raw.get(values[i]);}
  const run=await createVerifier().evaluate(compact(graph)),receipts=new Map(run.report.receipts.map(r=>[r.id,r])),target=receipts.get(closest.world.constraintId);
  const invalidOffers=c.offers.filter(o=>{const v=receipts.get(o.nodeId)?.outcome;return typeof v?.value!=='string'||compact(v.dimension)!==compact(o.dimension);}).map(o=>o.id).sort(sort);
  const blockers=a.report.activeEvidence.filter(r=>receipts.get(r.nodeId).outcome.value!==r.value).map(r=>({observationId:r.observationId,lineage:r.lineage,expected:receipts.get(r.nodeId).outcome.value??null,observed:r.value})).sort((x,y)=>sort(x.observationId,y.observationId));
  candidates.push({assignment:axes.map((axis,i)=>({id:axis.id,value:values[i]})),nearestWorld:closest.world.id,changedInputs:changes,graphDigest:run.report.graphDigest,targetReceiptDigest:target.receiptDigest,decision:target.outcome.status,invalidOffers,blockers,compatible:invalidOffers.length?null:!blockers.length});
 }
 if(BigInt(candidates.length)!==missingCount)throw Error('GRID_COUNT_MISMATCH');
 const outcomes=a.report.worlds.filter(w=>a.report.survivingWorlds.includes(w.id)).map(w=>w.decision).concat(candidates.filter(x=>x.compatible===true).map(x=>x.decision));
 const closureState=candidates.some(x=>x.invalidOffers.length)?'UNVERIFIED':state(outcomes);
 return freeze({...base,status:missingCount?'MISSING_COMBINATIONS':'CLOSED_OVER_OBSERVED_VALUES',candidates,closureState});
}
export async function exportObservedDomainGrid(caseText,pin,eventText){
 const result=await auditObservedDomainGrid(caseText,pin,eventText);return freeze({version:GRID_VERSION,caseText,eventText,result});
}
