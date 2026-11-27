// Standalone public-research consent; never restores authority from a report.
import {createHash} from 'node:crypto';
const fail=code=>{throw Object.assign(Error('Research refused: '+code),{code});};
export const digest=v=>'sha256:'+createHash('sha256').update(v).digest('hex');
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const bounded=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const grants=new WeakSet(),restored=new WeakMap(),claimed=new WeakSet();
export function claimResearchRun(a){assertResearchAuthorization(a);if(claimed.has(a))fail('CONSUMED');claimed.add(a);}
export function researchResumeState(a){assertResearchAuthorization(a);return restored.has(a)?structuredClone(restored.get(a)):null;}
export function assertResearchAuthorization(a){if(!a||!grants.has(a))fail('AUTHORIZATION');a.assertActive();}
export const secretLike=s=>/(?:\b(?:sk-(?:proj-)?|tvly-|gh[pousr]_|github_pat_|AKIA|AIza)[A-Za-z0-9_-]{12,}|\b(?:password|api[_ -]?key|secret|authorization)\s*[:=]\s*\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i.test(s);
export function admitManifest(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>16384)fail('MANIFEST');
 let p;try{p=JSON.parse(text);}catch{fail('MANIFEST');}
 if(!exact(p,['schema','objective','scope','budget','providers'])||p.schema!=='sutra-autonomous-research/v1'||typeof p.objective!=='string'||p.objective.trim()!==p.objective||!p.objective||p.objective.length>1000||secretLike(p.objective)||/[\u0000-\u001f\u007f]/.test(p.objective))fail('OBJECTIVE');
 const scopeKeys=['publicWeb','queryDisclosureAllowed','allowPrivateNetworks','allowAuthentication','allowExternalWrites','privateEvidenceDisclosureAllowed'];
 if(Object.hasOwn(p.scope??{},'allowCrossOriginLinks'))scopeKeys.push('allowCrossOriginLinks');
 if(Object.hasOwn(p.scope??{},'allowPdf'))scopeKeys.push('allowPdf');
 if(!exact(p.scope,scopeKeys)||Object.hasOwn(p.scope,'allowCrossOriginLinks')&&typeof p.scope.allowCrossOriginLinks!=='boolean'||Object.hasOwn(p.scope,'allowPdf')&&typeof p.scope.allowPdf!=='boolean'||p.scope.publicWeb!==true||p.scope.queryDisclosureAllowed!==true||['allowPrivateNetworks','allowAuthentication','allowExternalWrites','privateEvidenceDisclosureAllowed'].some(k=>p.scope[k]!==false))fail('SCOPE');
 const limits={maxSearches:[2,30],maxDocuments:[1,60],maxLinkDepth:[0,3],maxDurationSeconds:[5,1200],maxDownloadBytes:[65536,52428800],maxCostMicros:[1,1000000]};
 if(!exact(p.budget,Object.keys(limits))||Object.entries(limits).some(([k,[a,b]])=>!bounded(p.budget[k],a,b)))fail('BUDGET');
 if(!Array.isArray(p.providers)||p.providers.length<1||p.providers.length>2||new Set(p.providers.map(x=>x?.id)).size!==p.providers.length||p.providers.some(x=>!exact(x,['id','estimatedMaxCostMicros'])||!['brave','tavily'].includes(x.id)||!bounded(x.estimatedMaxCostMicros,1,1000000)))fail('PROVIDERS');
 const plan=Object.freeze({...p,scope:Object.freeze(p.scope),budget:Object.freeze(p.budget),providers:Object.freeze(p.providers.map(Object.freeze))});
 return Object.freeze({plan,planPin:digest(text),costPolicy:'operator-supplied estimates; not a vendor invoice guarantee'});
}
function admitResume(text,expected,p){
 if(typeof text!=='string'||Buffer.byteLength(text)>32*1024*1024||typeof expected!=='string'||!/^sha256:[0-9a-f]{64}$/.test(expected))fail('RESUME_PIN');
 let envelope,s;try{envelope=JSON.parse(text);if(envelope?.schema!=='sutra-checkpoint-envelope/v1'||envelope.digest!==expected||typeof envelope.payload!=='string'||digest(envelope.payload)!==expected)fail('RESUME_PIN');s=JSON.parse(envelope.payload);}catch{fail('RESUME_PIN');}
 if(s?.schema!=='sutra-autonomous-research-checkpoint/v1'||s.planPin!==p.planPin||s.authority!=='NONE'||s.state!=='paused'||s.pending!==null||typeof s.sessionId!=='string'||!/^research_[0-9a-f-]{36}$/.test(s.sessionId)||!bounded(s.sequence,1,100000)||!['search','documents'].includes(s.phase)||!bounded(s.slots,0,2)||s.phase==='search'&&s.slots!==0||!bounded(s.startedAt,0,Number.MAX_SAFE_INTEGER)||s.expiresAt!==s.startedAt+p.plan.budget.maxDurationSeconds*1000)fail('RESUME_STATE');
 const b=p.plan.budget,u=s.usage;
 if(!exact(u,['searches','documents','reservedBytes','reservedCostMicros'])||!bounded(u.searches,0,b.maxSearches)||!bounded(u.documents,0,b.maxDocuments)||!bounded(u.reservedBytes,0,b.maxDownloadBytes)||!bounded(u.reservedCostMicros,0,b.maxCostMicros)||!Array.isArray(s.queries)||s.queries.length!==u.searches||!Array.isArray(s.documents)||s.documents.length>u.documents||!Array.isArray(s.passages)||s.passages.length>s.documents.length*8||!Array.isArray(s.frontier)||s.frontier.length>240||!Array.isArray(s.seen)||s.seen.length>5000||!Array.isArray(s.domainAttempts)||s.domainAttempts.length>500||!Array.isArray(s.failures)||s.failures.length>500)fail('RESUME_STATE');
 let cost=0;for(const q of s.queries){const provider=p.plan.providers.find(x=>x.id===q?.provider);if(!provider||typeof q.query!=='string'||!q.query.startsWith(p.plan.objective)||q.query.length>1200||secretLike(q.query))fail('RESUME_STATE');cost+=provider.estimatedMaxCostMicros;}
 if(cost!==u.reservedCostMicros||u.reservedBytes<u.searches*262144)fail('RESUME_USAGE');
 return s;
}
export function authorizeResearch(manifest,{approvedPlanPin,approvePublicContact=false,approveEstimatedCost=false,signal,clock=()=>Date.now(),resumeText,resumePin}={}){
 // Input re-admission avoids accepting a caller-forged mutable manifest object.
 const p=admitManifest(manifest);
 if(approvedPlanPin!==p.planPin||approvePublicContact!==true||approveEstimatedCost!==true)fail('APPROVAL');
 const prior=resumeText!==undefined||resumePin!==undefined?admitResume(resumeText,resumePin,p):null;
 const c=new AbortController(),now=clock(),started=prior?.startedAt??now,expires=prior?.expiresAt??(started+p.plan.budget.maxDurationSeconds*1000);
 if(!Number.isSafeInteger(now)||now<started||now>=expires)fail('INACTIVE');
 const cancel=()=>c.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 const timer=setTimeout(cancel,expires-now);timer.unref?.();
 let closed=false;const usage=prior?{...prior.usage}:{searches:0,documents:0,reservedBytes:0,reservedCostMicros:0};
 function assertActive(){if(closed||c.signal.aborted||clock()>=expires)fail('INACTIVE');}
 // Reservations are synchronous and conservative: failures are not refunded.
 function reserve(kind,{bytes,costMicros=0}={}){
  assertActive();if(!bounded(bytes,1,52428800)||!bounded(costMicros,0,1000000)||!['search','document','robots'].includes(kind))fail('RESERVATION');
  const b=p.plan.budget,k=kind==='search'?'searches':kind==='document'?'documents':null;
  if(k&&usage[k]>=b[k==='searches'?'maxSearches':'maxDocuments']||usage.reservedBytes+bytes>b.maxDownloadBytes||usage.reservedCostMicros+costMicros>b.maxCostMicros)fail('BUDGET_EXHAUSTED');
  if(k)usage[k]++;usage.reservedBytes+=bytes;usage.reservedCostMicros+=costMicros;
 }
 const grant=Object.freeze({...p,startedAt:started,expiresAt:expires,signal:c.signal,assertActive,reserve,usage:()=>Object.freeze({...usage}),close(){closed=true;cancel();clearTimeout(timer);signal?.removeEventListener('abort',cancel);}});grants.add(grant);if(prior)restored.set(grant,prior);return grant;
}
