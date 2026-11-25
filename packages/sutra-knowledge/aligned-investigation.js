// A pinned digest cannot make different equations the same claim.
// Preserve the v1 general replay contract. This stricter product profile
// permits variation of input values only, not operators, meanings or units.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin,pinnedInvestigationExport} from './pinned-investigation.js';
export const ALIGNED_VERSION='sutra-aligned-investigation/v1';
const POLICY='identical-typed-graph-except-input-values/v1';
const QUAL='All declared worlds use the same typed graph, target, input basis and dimensions; only input values may vary. Structural alignment is not semantic or empirical validation.';
const fail=()=>{throw TypeError('CASE_GRAPH_ALIGNMENT');};
const sort=(a,b)=>a<b?-1:a>b?1:0;
const sameKeys=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
function profile(world){
 const graph=parseUniqueJson(world.graphText,{maxChars:65536,maxDepth:12});
 if(!sameKeys(graph,['schemaVersion','nodes'])||graph.schemaVersion!==1||!Array.isArray(graph.nodes)||!graph.nodes.length||graph.nodes.length>256)fail();
 const nodes=graph.nodes.map(n=>{
  if(n?.kind==='input'&&sameKeys(n,['id','kind','value','dimension','basis']))return {id:n.id,kind:n.kind,dimension:n.dimension,basis:n.basis};
  if(['derive','constraint'].includes(n?.kind)&&sameKeys(n,['id','kind','op','args']))return {id:n.id,kind:n.kind,op:n.op,args:n.args};
  fail();
 }).sort((a,b)=>sort(a.id,b.id));
 return {schemaVersion:graph.schemaVersion,targetId:world.constraintId,nodes};
}
export async function alignedInvestigationExport(caseText,pin,eventText='[]'){
 // The exact case pin and every graph and observation are first checked by
 // the established engine. No unvalidated skeleton is ever authoritative.
 const base=await pinnedInvestigationExport(caseText,pin,eventText);
 const c=parseUniqueJson(caseText,{maxChars:262144,maxDepth:9});
 const first=profile(c.worlds[0]),encoded=JSON.stringify(first);
 for(const w of c.worlds.slice(1))if(JSON.stringify(profile(w))!==encoded)fail();
 const alignment=Object.freeze({policy:POLICY,schemaDigest:await casePin(encoded),nodeCount:first.nodes.length,worldCount:c.worlds.length,qualification:QUAL});
 return Object.freeze({version:ALIGNED_VERSION,caseText:base.caseText,eventText:base.eventText,result:base.result,alignment});
}
