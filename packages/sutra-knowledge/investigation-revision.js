// Versioned, caller-pinned semantic investigations. Closed data-only inputs.
// Full replay is the baseline; a dependency impact report is not a cache proof.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {evaluateSemanticInvestigation,createSemanticInvestigationSession,FACETS} from './semantic-investigation.js';
export const VERSION='sutra-investigation-version/v1';
const HASH=/^sha256:[a-f0-9]{64}$/;
const pin=x=>typeof x==='string'&&HASH.test(x);
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const fail=x=>{throw TypeError('REVISION_'+x);};
const parse=(s,depth=12)=>parseUniqueJson(s,{maxChars:262144,maxDepth:depth});
const sort=(a,b)=>a<b?-1:a>b?1:0;
const ordered=xs=>[...new Set(xs)].sort(sort);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
// Canonical structural comparison within admitted restricted data, not semantic equivalence.
function canonical(x){if(x===null||typeof x!=='object')return JSON.stringify(x);if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';return '{'+Object.keys(x).sort(sort).map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';}
const same=(a,b)=>canonical(a)===canonical(b);
const sourceNode=id=>'source:'+id,bindingNode=id=>'binding:'+id,candidateNode=id=>'candidate:'+id,lineageNode=id=>'lineage:'+id;
function graphFor(c,result){
 const nodes=[],edges=[],add=(id,kind,identity)=>nodes.push({id,kind,identity});
 const depend=(dependent,dependency,relation,authority)=>edges.push({dependent,dependency,relation,authority});
 add(sourceNode('question'),'question',c.question.digest);
 const roots=new Set(c.sources.map(s=>s.lineage));
 for(const root of [...roots].sort(sort))add(lineageNode(root),'declared_lineage',root);
 for(const s of c.sources){add(sourceNode(s.id),'evidence',s.digest);depend(sourceNode(s.id),lineageNode(s.lineage),'declared_ancestry','HOST_DECLARATION');}
 for(const b of c.bindings){add(bindingNode(b.id),'reviewed_quantity',b.span.quote);depend(bindingNode(b.id),sourceNode(b.span.sourceId),'exact_source_span','COMPILER_ADMISSION');}
 for(const a of result.candidates){
  add(candidateNode(a.id),'candidate_interpretation',a.computation?.proposalDigest??'REFUSED');
  depend(candidateNode(a.id),sourceNode('question'),'interprets','PROPOSAL');
  if(a.admission!=='ADMITTED')continue;
  for(const b of a.computation.bindingIds)depend(candidateNode(a.id),bindingNode(b),'target_depends_on','COMPILER_ADMISSION');
  for(const k of FACETS)for(const r of a.facets[k].references){
   if(!r.span)continue;
   const dependency=r.kind==='binding'?bindingNode(r.id):sourceNode(r.span.sourceId);
   depend(candidateNode(a.id),dependency,'facet_'+k,'PROPOSED_CONTEXT');
  }
 }
 nodes.sort((a,b)=>sort(a.id,b.id));edges.sort((a,b)=>sort(canonical(a),canonical(b)));
 const unique=[...new Map(edges.map(e=>[canonical(e),e])).values()];
 return {nodes,edges:unique,qualification:'Declared ancestry is not evidence independence; contextual links do not prove entailment. Edges cover admitted target dependencies and supplied facet links, not every real-world dependency.'};
}
function projection(p){
 // Ignore only the mandatory new contract pin. Everything else—including exact
 // question/claim spans—is retained. A changed byte span can require review.
 const q=parse(p,9);const {contractDigest,...rest}=q;return rest;
}
async function admitVersion(versionText,expectedPin){
 if(!pin(expectedPin)||await casePin(versionText)!==expectedPin)fail('PIN');
 const v=parse(versionText,6);
 if(!keys(v,['version','previousDigest','contractText','contractPin','batchText','annotationText','annotationPin'])||v.version!==VERSION||!(v.previousDigest===null||pin(v.previousDigest))||v.previousDigest===expectedPin||!pin(v.contractPin)||!pin(v.annotationPin)||![v.contractText,v.batchText,v.annotationText].every(s=>typeof s==='string'))fail('SHAPE');
 return v;
}
function versionReport(v,expectedPin,investigation){return freeze({version:VERSION,digest:expectedPin,previousDigest:v.previousDigest,investigation,graph:graphFor(parse(v.contractText,9),investigation)});}
export async function replayInvestigationVersion(versionText,expectedPin){
 const v=await admitVersion(versionText,expectedPin);
 const investigation=await evaluateSemanticInvestigation(v.contractText,v.contractPin,v.batchText,v.annotationText,v.annotationPin);
 return versionReport(v,expectedPin,investigation);
}
// Sealing is not authorization, source authenticity or truth; it binds exact input
// bytes. The caller retains the pin independently from the artifact.
function versionWire({previousDigest=null,contractText,contractPin,batchText,annotationText,annotationPin}){return JSON.stringify({version:VERSION,previousDigest,contractText,contractPin,batchText,annotationText,annotationPin});}
export async function sealInvestigationVersion(input){
 const versionText=versionWire(input);
 const digest=await casePin(versionText);
 const report=await replayInvestigationVersion(versionText,digest);
 return freeze({versionText,digest,report});
}
function mapBy(xs){return new Map(xs.map(x=>[x.id,x]));}
function changes(before,after,project=x=>x){
 const a=mapBy(before),b=mapBy(after),ids=ordered([...a.keys(),...b.keys()]),out=[];
 for(const id of ids){
  const left=a.get(id),right=b.get(id);
  if(!left)out.push({id,change:'ADDED'});
  else if(!right)out.push({id,change:'WITHDRAWN'});
  else if(!same(project(left),project(right)))out.push({id,change:'CHANGED'});
 }
 return out;
}
function descendants(graph,roots){
 const reverse=new Map();
 for(const e of graph.edges){if(!reverse.has(e.dependency))reverse.set(e.dependency,[]);reverse.get(e.dependency).push(e.dependent);}
 const seen=new Set(roots),queue=[...seen];
 for(let i=0;i<queue.length;i++)for(const x of reverse.get(queue[i])??[])if(!seen.has(x)){seen.add(x);queue.push(x);}
 return seen;
}
const decisive=s=>s==='CONDITIONALLY_SATISFIED'||s==='CONDITIONALLY_REFUTED';
export async function compareInvestigationVersions(beforeText,beforePin,afterText,afterPin){
 const before=await replayInvestigationVersion(beforeText,beforePin);
 const after=await replayInvestigationVersion(afterText,afterPin);
 return impactFromReports(beforeText,beforePin,afterText,afterPin,before,after,false);
}
function impactFromReports(beforeText,beforePin,afterText,afterPin,before,after,session){
 if(beforePin===afterPin||after.previousDigest!==beforePin)fail('PARENT');
 const v1=parse(beforeText,6),v2=parse(afterText,6),c1=parse(v1.contractText,9),c2=parse(v2.contractText,9);
 const b1=parse(v1.batchText,5),b2=parse(v2.batchText,5),p1=mapBy(b1.proposals),p2=mapBy(b2.proposals);
 const a1=parse(v1.annotationText),a2=parse(v2.annotationText),ann1=mapBy(a1.candidates),ann2=mapBy(a2.candidates);
 const questionChanged=c1.question.digest!==c2.question.digest;
 const sourceChanges=changes(c1.sources,c2.sources,s=>({digest:s.digest,lineage:s.lineage}));
 const bindingChanges=changes(c1.bindings,c2.bindings);
 const roots=[...sourceChanges.map(x=>sourceNode(x.id)),...bindingChanges.map(x=>bindingNode(x.id)),...(questionChanged?[sourceNode('question')]:[])];
 const affectedBefore=descendants(before.graph,roots),affectedAfter=descendants(after.graph,roots);
 const old=mapBy(before.investigation.candidates),next=mapBy(after.investigation.candidates);
 const candidates=[];
 for(const id of ordered([...old.keys(),...next.keys()])){
  const left=old.get(id),right=next.get(id);
  const oldState=left?.computation?.status??(left?'REFUSED':'ABSENT');
  const newState=right?.computation?.status??(right?'REFUSED':'ABSENT');
  const affected=affectedBefore.has(candidateNode(id))||affectedAfter.has(candidateNode(id));
  const annotationChanged=!left||!right||!same(ann1.get(id),ann2.get(id));
  // Invalid proposal bytes are never parsed as trusted structure.
  const proposalChanged=!left||!right||left.admission!=='ADMITTED'||right.admission!=='ADMITTED'?
    p1.get(id)?.proposalText!==p2.get(id)?.proposalText:
    !same(projection(p1.get(id).proposalText),projection(p2.get(id).proposalText));
  let outcome;
  if(!left)outcome='NEW_CANDIDATE';
  else if(!right)outcome='CANDIDATE_WITHDRAWN';
  else if(decisive(oldState)&&!decisive(newState))outcome='PREVIOUS_CONDITIONAL_RESULT_UNRESOLVED';
  else if(!decisive(oldState)&&decisive(newState))outcome='NEW_CONDITIONAL_RESULT';
  else if(decisive(oldState)&&decisive(newState)&&oldState!==newState)outcome='CONDITIONAL_RESULT_REVERSED';
  else if(decisive(oldState)&&oldState===newState)outcome='CONDITIONAL_RESULT_SURVIVES';
  else outcome='STILL_UNRESOLVED';
  candidates.push({id,before:oldState,after:newState,outcome,dependencyAffected:affected,annotationChanged,proposalChanged,
   reviewRequired:questionChanged||affected||annotationChanged||proposalChanged||!decisive(newState)});
 }
 const oldTriage=before.investigation.triage.state,newTriage=after.investigation.triage.state;
 const missing=after.investigation.candidates.filter(c=>c.admission!=='ADMITTED'||!decisive(c.computation?.status)).map(c=>({id:c.id,reason:c.reason??c.computation?.status??'UNRESOLVED',missing:c.computation?.missing??[],typeBlockers:c.computation?.typeBlockers??[]}));
 const nextReview=candidates.filter(c=>c.reviewRequired).map(c=>c.id);
 return freeze({version:'sutra-investigation-impact/v1',beforeDigest:beforePin,afterDigest:afterPin,questionChanged,sourceChanges,bindingChanges,
  affectedDependencyNodes:ordered([...affectedBefore,...affectedAfter]),candidates,triage:{before:oldTriage,after:newTriage,newDivergence:oldTriage!=='DIVERGENT_CONDITIONAL_OUTCOMES'&&newTriage==='DIVERGENT_CONDITIONAL_OUTCOMES'},
  missing,nextReview,decisionAuthority:'NONE',recomputation:session?'PROVENANCE_BOUND_SESSION_REPLAY':'FULL_REPLAY_BOTH_VERSIONS',
  qualification:session?'Survival means only matching conditional outcomes; the prior exact local report is retained and the current version re-admitted with provenance-bound arithmetic reuse. Source, meaning, method and applicability remain unverified. No independent cache or speedup claim.':'Survival means only matching conditional outcomes; source, meaning, method and applicability remain unverified. Source withdrawal does not establish falsity. Dependency impact is scoped to admitted target and supplied context; no incremental speedup or global completeness claimed.'});
}

// A session is a private, bounded, linear version cursor. Fork explicitly to
// pursue sibling hypotheses. Replaying a historical version in a fresh session
// anchors only its exact bytes, not an independently established history.
function replaySession(semantic,head=null){
 let busy=false;
 async function run(versionText,expectedPin){
  const v=await admitVersion(versionText,expectedPin);
  if(head&&head.digest!==expectedPin&&v.previousDigest!==head.digest)fail('SESSION_PARENT');
  const next=semantic.fork(),out=await next.evaluate(v.contractText,v.contractPin,v.batchText,v.annotationText,v.annotationPin);
  const report=versionReport(v,expectedPin,out.result);
  const impact=head&&head.digest!==expectedPin?impactFromReports(head.versionText,head.digest,versionText,expectedPin,head.report,report,true):null;
  const version=freeze({versionText,digest:expectedPin,report});
  // Commit only after version admission, annotation reconstruction, graph and
  // impact all succeed. No public or imported report can seed the cache.
  semantic=next;head=version;return freeze({...version,impact,stats:out.stats});
 }
 return Object.freeze({
  async replay(versionText,expectedPin){if(busy)throw Error('REVISION_SESSION_BUSY');busy=true;try{return await run(versionText,expectedPin);}finally{busy=false;}},
  async seal(input){if(busy)throw Error('REVISION_SESSION_BUSY');busy=true;try{const wire=versionWire(input);return await run(wire,await casePin(wire));}finally{busy=false;}},
  fork(){if(busy)throw Error('REVISION_SESSION_BUSY');return replaySession(semantic.fork(),head);},
  head(){return head?.digest??null;}
 });
}
export function createInvestigationReplaySession(){return replaySession(createSemanticInvestigationSession());}
