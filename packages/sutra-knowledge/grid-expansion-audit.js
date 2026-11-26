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
