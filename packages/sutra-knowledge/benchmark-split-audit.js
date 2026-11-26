// Predeclared split audit. Exact text and caller-declared source ancestry
// collisions can be detected; hidden contamination and independent labels cannot.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
const fail=x=>{throw TypeError('BENCHMARK_SPLIT_'+x);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const pin=x=>typeof x==='string'&&/^sha256:[a-f0-9]{64}$/.test(x);
export async function auditBenchmarkSplit({manifestText,manifestPin,goldText,goldPin}={}){
 if(await casePin(manifestText)!==manifestPin||await casePin(goldText)!==goldPin)fail('PIN');
 const m=parseUniqueJson(manifestText,{maxChars:262144,maxDepth:6}),g=parseUniqueJson(goldText,{maxChars:262144,maxDepth:5});
 if(!keys(m,['version','heldOutGoldPin','cases'])||m.version!==1||m.heldOutGoldPin!==goldPin||!Array.isArray(m.cases)||m.cases.length<2||m.cases.length>1000)fail('MANIFEST');
 if(!keys(g,['version','cases'])||g.version!==1||!Array.isArray(g.cases)||!g.cases.length||g.cases.some(c=>!keys(c,['id','label'])||!id(c.id)||!['supported','refuted','underdetermined'].includes(c.label))||new Set(g.cases.map(c=>c.id)).size!==g.cases.length)fail('GOLD');
 const seen=new Set(),byContent=new Map(),byLineage=new Map(),held=[];
 for(const c of m.cases){
  if(!keys(c,['id','split','text','contentPin','lineage'])||!id(c.id)||seen.has(c.id)||!['development','held_out'].includes(c.split)||typeof c.text!=='string'||c.text.length>8192||!pin(c.contentPin)||!Array.isArray(c.lineage)||c.lineage.length>8||c.lineage.some(x=>!id(x))||new Set(c.lineage).size!==c.lineage.length)fail('CASE');
  if(await casePin(c.text)!==c.contentPin)fail('CONTENT_PIN');seen.add(c.id);if(c.split==='held_out')held.push(c.id);
  for(const [key,map] of [[c.contentPin,byContent],...c.lineage.map(x=>[x,byLineage])]){if(!map.has(key))map.set(key,new Set());map.get(key).add(c.split);}
 }
 const ids=new Set(g.cases.map(c=>c.id));if(held.length!==ids.size||held.some(id=>!ids.has(id))||m.cases.length===held.length)fail('CASE_SET');
 const contentCollisions=[...byContent].filter(([,s])=>s.size>1).map(([k])=>k),lineageCollisions=[...byLineage].filter(([,s])=>s.size>1).map(([k])=>k);
 const unknownLineage=m.cases.filter(c=>!c.lineage.length).map(c=>c.id);
 return {version:1,manifestPin,goldPin,heldOutCases:held.length,developmentCases:m.cases.length-held.length,contentCollisions,lineageCollisions,unknownLineage,status:contentCollisions.length||lineageCollisions.length?'CROSS_SPLIT_COLLISION':unknownLineage.length?'UNKNOWN_ANCESTRY':'NO_DECLARED_COLLISION',decisionAuthority:'NONE',qualification:'Exact text and declared source ancestry only. Paraphrase contamination, unreported common ancestry, prior model training, actual freeze time and independent labels are unverified.'};
}
