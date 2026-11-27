// Caller-held portable history with bounded, single-process CAS transactions.
// No browser storage, cross-tab lock, automatic merge or external authority.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion} from './investigation-revision.js';
import {compareSiblingInvestigations} from './sibling-branch-contrast.js';
export const VERSION='sutra-investigation-history/v1';
export const MAX_VERSIONS=12,MAX_BRANCHES=8;
const fail=x=>{throw TypeError('HISTORY_'+x);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const pin=x=>typeof x==='string'&&/^sha256:[a-f0-9]{64}$/.test(x);
const name=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const sort=(a,b)=>a<b?-1:a>b?1:0;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
async function admit(historyText,expectedPin){
 if(typeof historyText!=='string'||historyText.length>262144||new TextEncoder().encode(historyText).length>262144)fail('SIZE');
 if(!pin(expectedPin)||await casePin(historyText)!==expectedPin)fail('PIN');
 const h=parseUniqueJson(historyText,{maxChars:262144,maxDepth:8});
 if(!keys(h,['version','versions','branches'])||h.version!==VERSION||!Array.isArray(h.versions)||!h.versions.length||h.versions.length>MAX_VERSIONS||!Array.isArray(h.branches)||!h.branches.length||h.branches.length>MAX_BRANCHES)fail('SHAPE');
 const versions=new Map(),reports=new Map();let root=null;
 for(const v of h.versions){
  if(!keys(v,['digest','versionText'])||!pin(v.digest)||versions.has(v.digest))fail('VERSION');
  const r=await replayInvestigationVersion(v.versionText,v.digest);
  if(r.previousDigest===null){if(root!==null)fail('MULTIPLE_ROOTS');root=v.digest;}
  else if(!versions.has(r.previousDigest))fail('PARENT_ORDER');
  // Topological parent order implies no cycles or disconnected non-root nodes.
  versions.set(v.digest,v.versionText);reports.set(v.digest,r);
 }
 if(root===null)fail('ROOT');
 const branches=new Map();
 for(const b of h.branches){
  if(!keys(b,['name','head'])||!name(b.name)||branches.has(b.name)||!versions.has(b.head))fail('BRANCH');
  branches.set(b.name,b.head);
 }
 const reachable=new Set();
 for(let head of branches.values())while(head!==null&&!reachable.has(head)){reachable.add(head);head=reports.get(head).previousDigest;}
 if(reachable.size!==versions.size)fail('UNREACHABLE_VERSION');
 const view=freeze({version:VERSION,digest:expectedPin,root,branches:h.branches.slice().sort((a,b)=>sort(a.name,b.name)),versions:h.versions.map(v=>{
  const r=reports.get(v.digest);return {digest:v.digest,parent:r.previousDigest,question:r.investigation.originalQuestion.text,triage:r.investigation.triage.state,
   candidates:r.investigation.candidates.map(c=>({id:c.id,status:c.computation?.status??'REFUSED'}))};
 }),decisionAuthority:'NONE',qualification:'Exact versions and declared branch heads replayed within a bounded single-parent history. No automatic merge, durable storage, cross-process concurrency, semantic truth or action authority.'});
 return {h,versions,reports,view,historyText,digest:expectedPin};
}
export async function replayInvestigationHistory(historyText,expectedPin){return (await admit(historyText,expectedPin)).view;}
function instance(initial){
 let state=initial,tail=Promise.resolve();
 const snapshot=()=>freeze({historyText:state.historyText,digest:state.digest,view:state.view});
 // All mutations serialize on this instance. Verify expected history digest at
 // execution, not submission; a failed transaction leaves the previous state.
 function transact(expectedPin,change){
  const next=tail.then(async()=>{
   if(expectedPin!==state.digest)fail('STALE_HISTORY');
   const h=await change(state),historyText=JSON.stringify(h),digest=await casePin(historyText);
   const admitted=await admit(historyText,digest);
   state=admitted;return snapshot();
  });
  tail=next.catch(()=>{});return next;
 }
 return Object.freeze({snapshot,
  restore(digest){
   if(!state.versions.has(digest))fail('UNKNOWN_VERSION');
   return freeze({versionText:state.versions.get(digest),digest,report:state.reports.get(digest)});
  },
  fork({expectedHistoryPin,branch,fromDigest}){
   return transact(expectedHistoryPin,s=>{
    if(!name(branch)||s.h.branches.some(b=>b.name===branch)||!s.versions.has(fromDigest)||s.h.branches.length>=MAX_BRANCHES)fail('FORK');
    return {...s.h,branches:[...s.h.branches,{name:branch,head:fromDigest}]};
   });
  },
  append({expectedHistoryPin,branch,expectedHead,versionText,versionPin}){
   return transact(expectedHistoryPin,async s=>{
    const b=s.h.branches.find(b=>b.name===branch);
    if(!b||b.head!==expectedHead)fail('STALE_BRANCH');
    const r=await replayInvestigationVersion(versionText,versionPin);
    if(r.previousDigest!==b.head||s.versions.has(versionPin)||s.h.versions.length>=MAX_VERSIONS)fail('APPEND');
    return {...s.h,versions:[...s.h.versions,{digest:versionPin,versionText}],branches:s.h.branches.map(x=>x.name===branch?{name:x.name,head:versionPin}:x)};
   });
  },
  async compareSiblings(base,left,right){
   const s=state;
   if([base,left,right].some(id=>!s.versions.has(id)))fail('UNKNOWN_VERSION');
   return compareSiblingInvestigations(s.versions.get(base),base,s.versions.get(left),left,s.versions.get(right),right);
  }
 });
}
export async function openInvestigationHistory(historyText,expectedPin){return instance(await admit(historyText,expectedPin));}
export async function createInvestigationHistory(versionText,versionPin,branch='main'){
 const r=await replayInvestigationVersion(versionText,versionPin);
 if(r.previousDigest!==null||!name(branch))fail('ROOT');
 const historyText=JSON.stringify({version:VERSION,versions:[{digest:versionPin,versionText}],branches:[{name:branch,head:versionPin}]});
 return openInvestigationHistory(historyText,await casePin(historyText));
}
