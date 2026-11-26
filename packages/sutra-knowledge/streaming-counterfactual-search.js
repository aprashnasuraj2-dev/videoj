// Resumable streaming counterfactual search over a large declared finite domain.
// It never treats an incomplete prefix as evidence of equivalence.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion} from './investigation-revision.js';
import {compileReviewedProposal} from './reviewed-claim-compiler.js';
import {createVerifier} from './index.js';
const VERSION='sutra-streaming-counterfactual-search/v1',ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const fail=c=>{throw TypeError('COUNTERFACTUAL_SEARCH_'+c);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const parse=(s,d=8)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const decisive=s=>s==='constraint_satisfied'||s==='constraint_refuted';
const fromCompiler=s=>s==='CONDITIONALLY_SATISFIED'?'constraint_satisfied':s==='CONDITIONALLY_REFUTED'?'constraint_refuted':null;
const rat=/^(-?(?:0|[1-9]\d{0,47}))\/([1-9]\d{0,47})$/;
function rational(v){if(typeof v!=='string'||!rat.test(v)||v.startsWith('-0'))fail('VALUE');const [n,d]=v.split('/').map(BigInt);let a=n<0n?-n:n,b=d;while(b)[a,b]=[b,a%b];return (n/a).toString()+'/'+(d/a).toString();}
function readDomain(text,versionPin,bindingIds){
 const d=parse(text,7);if(!keys(d,['version','versionDigest','axes'])||d.version!==1||d.versionDigest!==versionPin||!Array.isArray(d.axes)||!d.axes.length||d.axes.length>6)fail('DOMAIN');
 const seen=new Set(),axes=d.axes.map(a=>{if(!keys(a,['bindingId','values'])||!bindingIds.has(a.bindingId)||seen.has(a.bindingId)||!Array.isArray(a.values)||a.values.length<2||a.values.length>32)fail('AXIS');seen.add(a.bindingId);const values=a.values.map(rational);if(new Set(values).size!==values.length)fail('AXIS');return {bindingId:a.bindingId,values};}).sort((a,b)=>a.bindingId.localeCompare(b.bindingId));
 let total=1;for(const a of axes){total*=a.values.length;if(!Number.isSafeInteger(total)||total>1000000000)fail('DOMAIN_SIZE');}
 return {axes,total};
}
function assignmentAt(axes,index){const out=new Array(axes.length);let n=index;for(let i=axes.length-1;i>=0;i--){const a=axes[i],j=n%a.values.length;n=Math.floor(n/a.values.length);out[i]={bindingId:a.bindingId,value:a.values[j]};}return out;}
const targetState=(run,target)=>run.report.receipts.find(x=>x.id===target)?.outcome.status??'unresolved';
const pairKey=(a,b)=>a<b?a+'\0'+b:b+'\0'+a;
function pairRow(key){const [left,right]=key.split('\0');return {left,right};}
async function prepare(versionText,versionPin,domainText,domainPin){
 if(await casePin(domainText)!==domainPin)fail('PIN');const version=await replayInvestigationVersion(versionText,versionPin),raw=parse(versionText,6),contract=parse(raw.contractText,9),batch=parse(raw.batchText,5);
 const {axes,total}=readDomain(domainText,versionPin,new Set(contract.bindings.map(b=>b.id))),axisIds=new Set(axes.map(a=>a.bindingId)),runs=[];
 for(const candidate of version.investigation.candidates){
  const baseline=fromCompiler(candidate.computation?.status);if(!baseline||candidate.admission!=='ADMITTED')continue;
  const proposal=batch.proposals.find(p=>p.id===candidate.id);if(!proposal)fail('PROPOSAL');
  const compiled=await compileReviewedProposal(raw.contractText,raw.contractPin,proposal.proposalText),graph=JSON.parse(compiled.graphText),bindingByNode=new Map(compiled.nodes.filter(n=>n.kind==='input').map(n=>[n.id,n.bindingId])),used=new Set(compiled.target.bindings),dynamic=[...used].some(x=>axisIds.has(x));
  for(const n of graph.nodes)if(n.kind==='input')n.basis='streaming synthetic counterfactual '+bindingByNode.get(n.id);
  runs.push({id:candidate.id,baseline,graph,bindingByNode,target:compiled.target.id,dynamic,verifier:createVerifier()});
 }
 if(runs.length<2||runs.length>8)fail('CANDIDATES');
 const eligible=[];for(let i=0;i<runs.length;i++)for(let j=i+1;j<runs.length;j++)if(runs[i].baseline===runs[j].baseline)eligible.push(pairKey(runs[i].id,runs[j].id));
 return {raw,axes,total,runs,eligible};
}
export async function searchSemanticCounterfactualChunk({versionText,versionPin,domainText,domainPin,cursor=0,maxEvaluations=256,stopWhenAllPairsFound=false}={}){
 if(!Number.isSafeInteger(cursor)||cursor<0||!Number.isSafeInteger(maxEvaluations)||maxEvaluations<1||maxEvaluations>4096||typeof stopWhenAllPairsFound!=='boolean')fail('REQUEST');
 const p=await prepare(versionText,versionPin,domainText,domainPin);if(cursor>p.total)fail('CURSOR');
 const end=Math.min(p.total,cursor+maxEvaluations),found=new Map(),states=new Map(p.runs.map(r=>[r.id,r.baseline])),executions={fresh:0,baselineReused:0};let evaluated=0,stopReason='CHUNK_LIMIT';
 for(let index=cursor;index<end;index++){
  const assignment=assignmentAt(p.axes,index),replace=new Map(assignment.map(x=>[x.bindingId,x.value]));
  for(const r of p.runs){
   if(!r.dynamic){states.set(r.id,r.baseline);executions.baselineReused++;continue;}
   const graph=structuredClone(r.graph);
   for(const n of graph.nodes)if(n.kind==='input'&&replace.has(r.bindingByNode.get(n.id)))n.value=replace.get(r.bindingByNode.get(n.id));
   const run=await r.verifier.evaluate(JSON.stringify(graph)),state=targetState(run,r.target);states.set(r.id,state);executions.fresh++;
  }
  for(const key of p.eligible)if(!found.has(key)){const {left,right}=pairRow(key),a=states.get(left),b=states.get(right);if(decisive(a)&&decisive(b)&&a!==b)found.set(key,{left,right,index,assignment,leftState:a,rightState:b});}
  evaluated++;
  if(stopWhenAllPairsFound&&found.size===p.eligible.length){stopReason='ALL_ELIGIBLE_PAIRS_DISTINGUISHED';break;}
 }
 const nextCursor=cursor+evaluated,complete=nextCursor===p.total;
 if(complete)stopReason='DOMAIN_EXHAUSTED';
 return Object.freeze({version:VERSION,versionPin,domainPin,axes:p.axes,coverage:{totalAssignments:p.total,fromIndex:cursor,evaluatedAssignments:evaluated,nextCursor,complete},eligiblePairs:p.eligible.map(pairRow),witnesses:[...found.values()],executions,stopReason,decisionAuthority:'NONE',qualification:complete?'Entire declared finite domain exhausted for supplied admitted candidate programs. Absence of a witness is only within that declared domain, not semantic equivalence or empirical truth.':'Only a contiguous declared-domain chunk was evaluated. Absence of a witness is not evidence of equivalence. Results are synthetic counterfactual calculations, not source revisions or physical claims.'});
}
export function mergeSemanticCounterfactualChunks(chunks){
 if(!Array.isArray(chunks)||!chunks.length||chunks.length>100000)fail('CHUNKS');let cursor=0,base=null;const witnesses=new Map(),eligible=new Map();let fresh=0,reused=0;
 for(const c of chunks){if(!c||c.version!==VERSION||!c.coverage||c.coverage.fromIndex!==cursor||!Number.isSafeInteger(c.coverage.evaluatedAssignments)||c.coverage.evaluatedAssignments<1)fail('CHUNK_ORDER');if(!base)base={versionPin:c.versionPin,domainPin:c.domainPin,total:c.coverage.totalAssignments,axes:JSON.stringify(c.axes)};if(c.versionPin!==base.versionPin||c.domainPin!==base.domainPin||c.coverage.totalAssignments!==base.total||JSON.stringify(c.axes)!==base.axes)fail('CHUNK_IDENTITY');cursor=c.coverage.nextCursor;fresh+=c.executions.fresh;reused+=c.executions.baselineReused;for(const p of c.eligiblePairs)eligible.set(pairKey(p.left,p.right),p);for(const w of c.witnesses)if(!witnesses.has(pairKey(w.left,w.right)))witnesses.set(pairKey(w.left,w.right),w);}
 const complete=cursor===base.total,missing=[...eligible].filter(([k])=>!witnesses.has(k)).map(([,v])=>v);
 return Object.freeze({version:VERSION,versionPin:base.versionPin,domainPin:base.domainPin,coverage:{totalAssignments:base.total,evaluatedAssignments:cursor,complete},witnesses:[...witnesses.values()],undistinguishedPairs:missing,executions:{fresh,baselineReused:reused},decisionAuthority:'NONE',qualification:complete?'Contiguous chunks exhaust the declared finite domain; undistinguished pairs have no witness only in this domain.':'Merged chunks are still incomplete; undistinguished pairs remain unknown, never equivalent.'});
}
