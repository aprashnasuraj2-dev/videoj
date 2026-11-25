// Three-way sibling revision comparison. No automatic merge or truth resolution.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion,compareInvestigationVersions} from './investigation-revision.js';
export const VERSION='sutra-sibling-branch-contrast/v1';
const parse=(s,d=9)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const sort=(a,b)=>a<b?-1:a>b?1:0;
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const canonical=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(canonical).join(',')+']':'{'+Object.keys(x).sort(sort).map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const fail=x=>{throw TypeError('BRANCH_'+x);};
const same=(a,b)=>canonical(a)===canonical(b);
function project(versionText,report){
 const v=parse(versionText,6),c=parse(v.contractText),b=parse(v.batchText,5),a=parse(v.annotationText,12),ann=new Map(a.candidates.map(x=>[x.id,x]));
 const admitted=new Set(report.investigation.candidates.filter(x=>x.admission==='ADMITTED').map(x=>x.id));
 const proposals=b.proposals.map(p=>{
  // Exclude only the mandatory contract digest for already admitted data.
  // Never reinterpret a refused proposal as a trusted graph.
  let body=p.proposalText;
  if(admitted.has(p.id)){const {contractDigest,...rest}=parse(p.proposalText);body=rest;}
  return {id:p.id,proposal:body,annotation:ann.get(p.id),admission:admitted.has(p.id)?'ADMITTED':'REFUSED'};
 });
 return {question:[{id:'question',...c.question}],sources:c.sources,bindings:c.bindings,candidates:proposals};
}
async function summarize(value){
 if(value===null)return null;
 return await casePin(canonical(value));
}
async function compareKind(kind,base,left,right){
 const maps=[base,left,right].map(xs=>new Map(xs.map(x=>[x.id,x]))),ids=[...new Set(maps.flatMap(m=>[...m.keys()]))].sort(sort),rows=[];
 for(const id of ids){
  const [b,l,r]=maps.map(m=>m.get(id)??null),lc=!same(b,l),rc=!same(b,r);
  if(!lc&&!rc)continue;
  const classification=lc&&rc?same(l,r)?'SAME_CHANGE':'CONFLICTING_CHANGES':lc?'LEFT_ONLY':'RIGHT_ONLY';
  const operation=x=>x===null?'WITHDRAWN':b===null?'ADDED':'CHANGED';
  rows.push({kind,id,classification,leftOperation:lc?operation(l):'UNCHANGED',rightOperation:rc?operation(r):'UNCHANGED',
   baseIdentity:await summarize(b),leftIdentity:await summarize(l),rightIdentity:await summarize(r)});
 }
 return rows;
}
export async function compareSiblingInvestigations(baseText,basePin,leftText,leftPin,rightText,rightPin){
 const [base,left,right]=await Promise.all([replayInvestigationVersion(baseText,basePin),replayInvestigationVersion(leftText,leftPin),replayInvestigationVersion(rightText,rightPin)]);
 if(new Set([basePin,leftPin,rightPin]).size!==3||left.previousDigest!==basePin||right.previousDigest!==basePin)fail('SIBLING_PARENT');
 const p=[project(baseText,base),project(leftText,left),project(rightText,right)];
 const changes=(await Promise.all(['question','sources','bindings','candidates'].map(k=>compareKind(k,...p.map(x=>x[k]))))).flat();
 const conflicts=changes.filter(x=>x.classification==='CONFLICTING_CHANGES');
 const [leftImpact,rightImpact]=await Promise.all([compareInvestigationVersions(baseText,basePin,leftText,leftPin),compareInvestigationVersions(baseText,basePin,rightText,rightPin)]);
 const stateMap=r=>new Map(r.investigation.candidates.map(c=>[c.id,c.computation?.status??'REFUSED']));
 const maps=[base,left,right].map(stateMap),ids=[...new Set(maps.flatMap(m=>[...m.keys()]))].sort(sort);
 const outcomes=ids.map(id=>{const [b,l,r]=maps.map(m=>m.get(id)??'ABSENT');return {id,base:b,left:l,right:r,branchesDiffer:l!==r};});
 return freeze({version:VERSION,baseDigest:basePin,leftDigest:leftPin,rightDigest:rightPin,
  changes,conflicts,outcomes,branchImpacts:{left:leftImpact,right:rightImpact},
  status:conflicts.length?'EXPLICIT_CONFLICTS_REQUIRE_REVIEW':'NO_CONFLICTS_IN_COMPARED_OBJECTS',
  decisionAuthority:'NONE',
  qualification:'Three-way comparison of direct children of one exact pinned parent. Conflicts are differing object changes, not proof of empirical contradiction; nonoverlap does not establish a safe merge. All three versions remain intact. No automatic merge, source choice, logical equivalence, identity or authority.'});
}
