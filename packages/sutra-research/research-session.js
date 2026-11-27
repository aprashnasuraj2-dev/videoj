// Standalone public-research consent; never restores authority from a report.
import {createHash} from 'node:crypto';
const fail=code=>{throw Object.assign(Error('Research refused: '+code),{code});};
export const digest=v=>'sha256:'+createHash('sha256').update(v).digest('hex');
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const bounded=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const grants=new WeakSet();
export function assertResearchAuthorization(a){if(!a||!grants.has(a))fail('AUTHORIZATION');a.assertActive();}
export const secretLike=s=>/(?:\b(?:sk-(?:proj-)?|tvly-|gh[pousr]_|github_pat_|AKIA|AIza)[A-Za-z0-9_-]{12,}|\b(?:password|api[_ -]?key|secret|authorization)\s*[:=]\s*\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i.test(s);
export function admitManifest(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>16384)fail('MANIFEST');
 let p;try{p=JSON.parse(text);}catch{fail('MANIFEST');}
 if(!exact(p,['schema','objective','scope','budget','providers'])||p.schema!=='sutra-autonomous-research/v1'||typeof p.objective!=='string'||p.objective.trim()!==p.objective||!p.objective||p.objective.length>1000||secretLike(p.objective)||/[\u0000-\u001f\u007f]/.test(p.objective))fail('OBJECTIVE');
 if(!exact(p.scope,['publicWeb','queryDisclosureAllowed','allowPrivateNetworks','allowAuthentication','allowExternalWrites','privateEvidenceDisclosureAllowed'])||p.scope.publicWeb!==true||p.scope.queryDisclosureAllowed!==true||['allowPrivateNetworks','allowAuthentication','allowExternalWrites','privateEvidenceDisclosureAllowed'].some(k=>p.scope[k]!==false))fail('SCOPE');
 const limits={maxSearches:[2,30],maxDocuments:[1,60],maxLinkDepth:[0,3],maxDurationSeconds:[5,1200],maxDownloadBytes:[65536,52428800],maxCostMicros:[1,1000000]};
 if(!exact(p.budget,Object.keys(limits))||Object.entries(limits).some(([k,[a,b]])=>!bounded(p.budget[k],a,b)))fail('BUDGET');
 if(!Array.isArray(p.providers)||p.providers.length<1||p.providers.length>2||new Set(p.providers.map(x=>x?.id)).size!==p.providers.length||p.providers.some(x=>!exact(x,['id','estimatedMaxCostMicros'])||!['brave','tavily'].includes(x.id)||!bounded(x.estimatedMaxCostMicros,1,1000000)))fail('PROVIDERS');
 const plan=Object.freeze({...p,scope:Object.freeze(p.scope),budget:Object.freeze(p.budget),providers:Object.freeze(p.providers.map(Object.freeze))});
 return Object.freeze({plan,planPin:digest(text),costPolicy:'operator-supplied estimates; not a vendor invoice guarantee'});
}
export function authorizeResearch(manifest,{approvedPlanPin,approvePublicContact=false,approveEstimatedCost=false,signal,clock=()=>Date.now()}={}){
 // Input re-admission avoids accepting a caller-forged mutable manifest object.
 const p=admitManifest(manifest);
 if(approvedPlanPin!==p.planPin||approvePublicContact!==true||approveEstimatedCost!==true)fail('APPROVAL');
 const c=new AbortController(),started=clock(),expires=started+p.plan.budget.maxDurationSeconds*1000;
 const cancel=()=>c.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 const timer=setTimeout(cancel,p.plan.budget.maxDurationSeconds*1000);timer.unref?.();
 let closed=false;const usage={searches:0,documents:0,reservedBytes:0,reservedCostMicros:0};
 function assertActive(){if(closed||c.signal.aborted||clock()>=expires)fail('INACTIVE');}
 // Reservations are synchronous and conservative: failures are not refunded.
 function reserve(kind,{bytes,costMicros=0}={}){
  assertActive();if(!bounded(bytes,1,52428800)||!bounded(costMicros,0,1000000)||!['search','document','robots'].includes(kind))fail('RESERVATION');
  const b=p.plan.budget,k=kind==='search'?'searches':kind==='document'?'documents':null;
  if(k&&usage[k]>=b[k==='searches'?'maxSearches':'maxDocuments']||usage.reservedBytes+bytes>b.maxDownloadBytes||usage.reservedCostMicros+costMicros>b.maxCostMicros)fail('BUDGET_EXHAUSTED');
  if(k)usage[k]++;usage.reservedBytes+=bytes;usage.reservedCostMicros+=costMicros;
 }
 const grant=Object.freeze({...p,signal:c.signal,assertActive,reserve,usage:()=>Object.freeze({...usage}),close(){closed=true;cancel();clearTimeout(timer);signal?.removeEventListener('abort',cancel);}});grants.add(grant);return grant;
}
