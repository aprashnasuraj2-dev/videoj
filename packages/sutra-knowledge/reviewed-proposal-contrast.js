// Compare admitted computations, never majority-vote or equate arithmetic with truth.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {compilePreparedReviewedProposal,prepareReviewedCompilerContract,createReviewedCompilerSession} from './reviewed-claim-compiler.js';
export const VERSION='sutra-reviewed-proposal-contrast/v1';
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const keys=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
const fail=code=>{throw TypeError(code);};
const sort=(a,b)=>a<b?-1:a>b?1:0;
const uniq=a=>[...new Set(a)].sort(sort);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const QUAL='Compares exact typed expression structure, reviewed input bindings and conditional arithmetic states. Equal structure is not semantic validity; distinct structure may be algebraically equivalent. Different targets are not a proven contradiction. Declared lineages and model labels are not independent evidence. No voting, adoption, causal conclusion or authority.';
const decisive=s=>['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED'].includes(s);
const intersection=(a,b)=>a.filter(i=>b.includes(i));
const difference=(a,b)=>a.filter(i=>!b.includes(i));
const compareSets=(a,b)=>({shared:intersection(a,b),onlyLeft:difference(a,b),onlyRight:difference(b,a)});
async function describe(result){
 const by=new Map(result.nodes.map(n=>[n.id,n])),memo=new Map();
 function signature(i){
  if(memo.has(i))return memo.get(i);
  // Cache the in-flight promise, not just its completed hash. Repeated shared
  // children otherwise expand exponentially under concurrent Promise.all.
  const work=(async()=>{
   const n=by.get(i);if(!n)throw Error('CONTRAST_NODE_MISSING');
   let shape;
   if(n.kind==='input')shape={kind:'input',bindingId:n.bindingId,type:n.type};
   else if(n.kind==='unknown')shape={kind:'unknown',proposalDigest:result.proposalDigest,id:n.id,type:n.type};
   else shape={kind:n.kind,op:n.op,args:await Promise.all(n.args.map(signature)),type:n.type};
   return casePin(JSON.stringify(shape));
  })();
  memo.set(i,work);return work;
 }
 const n=by.get(result.target.id),operandSignatures=await Promise.all(n.args.map(signature)),targetSignature=await signature(n.id);
 const sameOperand=operandSignatures[0]===operandSignatures[1];
 const bindingIds=n.bindings.slice(),used=result.bindings.filter(b=>bindingIds.includes(b.id));
 return {proposalDigest:result.proposalDigest,status:result.target.status,targetSignature,operandSignatures,signatureNodes:memo.size,targetOperator:n.op,selfComparison:sameOperand,bindingIds,sourceIds:result.target.sourceIds,declaredLineages:result.target.declaredLineages,sourceDigests:uniq(used.map(b=>b.span.sourceDigest)),missing:result.target.missing,typeBlockers:result.target.typeBlockers,questionRelevance:'UNVERIFIED',methodValidity:'UNVERIFIED'};
}
function pair(left,right){
 const a=left.computation,b=right.computation,same=a.targetSignature===b.targetSignature;
 if(same&&decisive(a.status)&&decisive(b.status)&&a.status!==b.status)throw Error('CONTRAST_SAME_EXPRESSION_DIVERGENCE');
 const stateRelation=decisive(a.status)&&decisive(b.status)?a.status===b.status?'SAME_CONDITIONAL_STATE':'OPPOSITE_CONDITIONAL_STATES':'AT_LEAST_ONE_UNRESOLVED';
 return {left:left.id,right:right.id,expressionRelation:same?'IDENTICAL_TYPED_STRUCTURE':'DIFFERENT_STRUCTURE_NOT_PROVEN_EQUIVALENT',stateRelation,bindingRelation:compareSets(a.bindingIds,b.bindingIds),sourceRelation:compareSets(a.sourceIds,b.sourceIds),sourceDigestRelation:compareSets(a.sourceDigests,b.sourceDigests),declaredLineageRelation:compareSets(a.declaredLineages,b.declaredLineages),semanticContradiction:'NOT_ESTABLISHED',independentEvidence:'NOT_ESTABLISHED'};
}
async function contrastWithCompiler(contractText,contractPin,batchText,compile){
 const contract=await prepareReviewedCompilerContract(contractText,contractPin);
 const b=parseUniqueJson(batchText,{maxChars:262144,maxDepth:5});
 if(!keys(b,['version','contractDigest','proposals'])||b.version!==1||b.contractDigest!==contractPin||!Array.isArray(b.proposals)||b.proposals.length<1||b.proposals.length>8)fail('CONTRAST_BATCH');
 const ids=new Set();
 for(const x of b.proposals){
  if(!keys(x,['id','proposalText'])||typeof x.id!=='string'||!ID.test(x.id)||ids.has(x.id)||typeof x.proposalText!=='string'||!x.proposalText.length||x.proposalText.length>65536)fail('CONTRAST_ENTRY');
  ids.add(x.id);
 }
 const entries=[];
 for(const x of b.proposals.slice().sort((a,b)=>sort(a.id,b.id))){
  let result;
  try{result=await compile(x.id,contract,x.proposalText);}
  catch(e){const reason=typeof e?.message==='string'&&/^COMPILER_[A-Z_]+$/.test(e.message)?e.message:'PROPOSAL_OR_RESOURCE_REFUSED';entries.push({id:x.id,admission:'REFUSED',reason,computation:null});continue;}
  // Internal invariants/signature failures must not be silently treated as bad agent input.
  entries.push({id:x.id,admission:'ADMITTED',reason:null,computation:await describe(result)});
 }
 const accepted=entries.filter(e=>e.admission==='ADMITTED'),pairs=[];
 for(let i=0;i<accepted.length;i++)for(let j=i+1;j<accepted.length;j++)pairs.push(pair(accepted[i],accepted[j]));
 function groups(field){
  const m=new Map();
  for(const x of accepted){const v=x.computation[field];if(!m.has(v))m.set(v,[]);m.get(v).push(x.id);}
  return [...m.entries()].sort(([a],[b])=>sort(a,b)).map(([digest,ids])=>({digest,ids}));
 }
 const targetGroups=groups('targetSignature'),proposalGroups=groups('proposalDigest');
 const counts={admitted:accepted.length,refused:entries.length-accepted.length,satisfied:accepted.filter(e=>e.computation.status==='CONDITIONALLY_SATISFIED').length,refuted:accepted.filter(e=>e.computation.status==='CONDITIONALLY_REFUTED').length,unresolved:accepted.filter(e=>!decisive(e.computation.status)).length,distinctTypedStructures:targetGroups.length,distinctProposalBytes:proposalGroups.length,selfComparisons:accepted.filter(e=>e.computation.selfComparison).length};
 return freeze({version:VERSION,contractDigest:contractPin,batchDigest:await casePin(batchText),entries,pairs,counts,targetGroups,duplicateProposalGroups:proposalGroups.filter(g=>g.ids.length>1),duplicateSourceBytes:contract.duplicateSourceBytes,decisionAuthority:'NONE',qualification:QUAL});
}
export async function contrastReviewedProposals(contractText,contractPin,batchText){return contrastWithCompiler(contractText,contractPin,batchText,(_id,...args)=>compilePreparedReviewedProposal(...args));}
// The trusted session never accepts a precomputed report or external callback.
// Only admitted candidates persist private local arithmetic state.
function contrastSession(initial=new Map()){
 let previous=new Map(initial),busy=false;
 return Object.freeze({async contrast(contractText,contractPin,batchText){
  if(busy)throw Error('CONTRAST_SESSION_BUSY');busy=true;
  try{
   const next=new Map(),rows=new Map();
   const result=await contrastWithCompiler(contractText,contractPin,batchText,async(id,...args)=>{
    const session=previous.has(id)?previous.get(id).session.fork():createReviewedCompilerSession();
    const {result,stats}=await session.compilePrepared(...args);
    next.set(id,{session,nodeIds:result.report?.receipts.map(r=>r.id)??[]});rows.set(id,{id,admission:'ADMITTED',...stats});
    return result;
   });
   const retired=[];
   for(const e of result.entries)if(e.admission!=='ADMITTED')rows.set(e.id,{id:e.id,admission:'REFUSED',executed:[],reusedOutcomes:[],reusedReceipts:[],rebuiltReceipts:[],removed:[]});
   const ids=new Set(result.entries.map(e=>e.id));
   for(const [id,old] of previous)if(!next.has(id))retired.push({id,nodeIds:old.nodeIds,reason:ids.has(id)?'PROPOSAL_REFUSED':'CANDIDATE_ABSENT'});
   const candidates=[...rows.values()].sort((a,b)=>sort(a.id,b.id));retired.sort((a,b)=>sort(a.id,b.id));
   const totals=Object.fromEntries(['executed','reusedOutcomes','reusedReceipts','rebuiltReceipts','removed'].map(k=>[k,candidates.reduce((n,r)=>n+r[k].length,0)]));
   totals.retired=retired.reduce((n,r)=>n+r.nodeIds.length,0);
   const stats=freeze({candidates,retired,totals,qualification:'Actual private compiler arithmetic and receipt operations in this replay. Not independent evidence of performance or authority.'});
   previous=next;return freeze({result,stats});
  }finally{busy=false;}
 },fork(){if(busy)throw Error('CONTRAST_SESSION_BUSY');return contrastSession(previous);}});
}
export function createReviewedContrastSession(){return contrastSession();}
export async function exportReviewedContrast(contractText,contractPin,batchText){return freeze({version:VERSION,contractText,batchText,result:await contrastReviewedProposals(contractText,contractPin,batchText)});}
