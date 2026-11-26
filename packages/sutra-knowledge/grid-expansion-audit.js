// Compare actual independently recomputed grids at two review budgets.
import {evaluateSemanticWorldGrid} from './semantic-world-grid.js';
const fail=c=>{throw TypeError('GRID_EXPANSION_'+c);};
const pairKey=w=>JSON.stringify([w.left,w.right].sort());
export async function auditGridExpansion({versionText,versionPin,beforeText,beforePin,afterText,afterPin}={}){
 const [a,b]=await Promise.all([evaluateSemanticWorldGrid(versionText,versionPin,beforeText,beforePin),evaluateSemanticWorldGrid(versionText,versionPin,afterText,afterPin)]);
 if(JSON.stringify(a.axes)!==JSON.stringify(b.axes))fail('AXES');
 if(b.worlds.length<a.worlds.length)fail('SHRINK');
 for(let i=0;i<a.worlds.length;i++)if(JSON.stringify(a.worlds[i])!==JSON.stringify(b.worlds[i]))fail('PREFIX');
 const old=new Set(a.worlds.flatMap(w=>w.witnesses.map(pairKey))),newPairs=new Map();
 for(const w of b.worlds.slice(a.worlds.length))for(const pair of w.witnesses){const k=pairKey(pair);if(!old.has(k)&&!newPairs.has(k))newPairs.set(k,{left:pair.left,right:pair.right,worldId:w.id});}
 return {version:1,versionPin,beforePin,afterPin,prefixPreserved:true,newWorlds:b.worlds.length-a.worlds.length,newWitnessPairs:[...newPairs.values()],truncated:b.coverage.truncated,decisionAuthority:'NONE',qualification:'Exact prefix replay for the same declared axes/order. New witness pairs are conditional on evaluated synthetic assignments; no equivalence, empirical completeness or causality.'};
}

// Compare by normalized assignments, not the arbitrary order-local world IDs.
// An enlarged declared domain can still omit prior worlds due to truncation.
export async function auditGridDomainExpansion({versionText,versionPin,beforeText,beforePin,afterText,afterPin}={}){
 const [a,b]=await Promise.all([evaluateSemanticWorldGrid(versionText,versionPin,beforeText,beforePin),evaluateSemanticWorldGrid(versionText,versionPin,afterText,afterPin)]);
 if(a.axes.length!==b.axes.length||a.axes.some((x,i)=>x.bindingId!==b.axes[i].bindingId||x.values.some(v=>!b.axes[i].values.includes(v))))fail('DOMAIN_NOT_SUPERSET');
 const key=w=>JSON.stringify(w.assignment.map(x=>[x.bindingId,x.value]));
 const next=new Map(b.worlds.map(w=>[key(w),w])),old=new Set(a.worlds.map(key)),retained=[],missing=[];
 for(const w of a.worlds){const k=key(w),v=next.get(k);if(!v){missing.push(w.assignment);continue;}
  if(JSON.stringify(w.rows)!==JSON.stringify(v.rows)||JSON.stringify(w.witnesses)!==JSON.stringify(v.witnesses))fail('DOMAIN_REPLAY_DIVERGENCE');retained.push({before:w.id,after:v.id,assignment:w.assignment});}
 const novel=b.worlds.filter(w=>!old.has(key(w)));
 return {version:1,versionPin,beforePin,afterPin,declaredDomainSuperset:true,allPreviouslyEvaluatedRetained:missing.length===0,retained,missing,newWorlds:novel.length,newWitnesses:novel.flatMap(w=>w.witnesses.map(x=>({worldId:w.id,assignment:w.assignment,...x}))),truncated:b.coverage.truncated,decisionAuthority:'NONE',qualification:'Declared finite domain inclusion and exact common-world replay only. Previously evaluated worlds omitted by the new evaluation budget remain explicit; no empirical completeness or equivalence.'};
}
