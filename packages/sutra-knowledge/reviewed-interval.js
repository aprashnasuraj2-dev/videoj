// Conservative continuous interval extension of admitted point computations.
// Exact rational bounds; no statistical coverage, distribution, or new evidence.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion} from './investigation-revision.js';
import {compileReviewedProposal} from './reviewed-claim-compiler.js';
export const VERSION='sutra-reviewed-interval/v1';
const fail=x=>{throw TypeError('INTERVAL_'+x);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const sort=(a,b)=>a<b?-1:a>b?1:0;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const parse=(s,d=9)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const abs=n=>n<0n?-n:n;
function rat(n,d){
 if(d===0n)fail('ZERO_DIVISOR');
 if(d<0n){n=-n;d=-d;}
 let a=abs(n),b=d;while(b)[a,b]=[b,a%b];
 n/=a;d/=a;if(abs(n).toString(2).length>512||d.toString(2).length>512)fail('ARITHMETIC_LIMIT');
 return [n,d];
}
function read(s){
 if(typeof s!=='string'||!/^(-?(?:0|[1-9]\d{0,47}))\/([1-9]\d{0,47})$/.test(s)||s.startsWith('-0'))fail('RATIONAL');
 return rat(...s.split('/').map(BigInt));
}
const cmp=(a,b)=>{const x=a[0]*b[1]-b[0]*a[1];return x<0n?-1:x>0n?1:0;};
const add=(a,b)=>rat(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const sub=(a,b)=>rat(a[0]*b[1]-b[0]*a[1],a[1]*b[1]);
const mul=(a,b)=>rat(a[0]*b[0],a[1]*b[1]);
const div=(a,b)=>rat(a[0]*b[1],a[1]*b[0]);
const zero=[0n,1n],one=[1n,1n];
const containsZero=x=>cmp(x[0],zero)<=0&&cmp(x[1],zero)>=0;
const text=x=>x[0]+'/'+x[1];
const range=x=>({lower:text(x[0]),upper:text(x[1])});
const minmax=xs=>[xs.reduce((a,b)=>cmp(a,b)<=0?a:b),xs.reduce((a,b)=>cmp(a,b)>=0?a:b)];
function derive(op,a,b,same){
 // Only exact DAG node identity authorizes this narrow dependency refinement.
 // Equal numeric values or similar-looking formulas are not identity.
 if(op==='div'&&containsZero(b))fail('ZERO_POSSIBLE');
 if(same&&op==='sub')return [zero,zero];
 if(same&&op==='div')return [one,one];
 if(op==='add')return [add(a[0],b[0]),add(a[1],b[1])];
 if(op==='sub')return [sub(a[0],b[1]),sub(a[1],b[0])];
 if(op==='mul'&&same){
  const ends=[mul(a[0],a[0]),mul(a[1],a[1])],bounds=minmax(ends);
  return [containsZero(a)?zero:bounds[0],bounds[1]];
 }
 if(op==='mul'||op==='div'){const opfn=op==='mul'?mul:div;return minmax(a.flatMap(x=>b.map(y=>opfn(x,y))));}
 fail('OP');
}
function compare(op,a,b,same){
 if(same)return ['eq','le','ge'].includes(op)?'HOLDS_FOR_ALL_DECLARED_VALUES':'REFUTED_FOR_ALL_DECLARED_VALUES';
 const lowerUpper=cmp(a[0],b[1]),upperLower=cmp(a[1],b[0]);
 let yes=false,no=false;
 if(op==='gt'){yes=lowerUpper>0;no=upperLower<=0;}
 else if(op==='ge'){yes=lowerUpper>=0;no=upperLower<0;}
 else if(op==='lt'){yes=upperLower<0;no=lowerUpper>=0;}
 else if(op==='le'){yes=upperLower<=0;no=lowerUpper>0;}
 else if(op==='eq'){yes=cmp(a[0],a[1])===0&&cmp(b[0],b[1])===0&&cmp(a[0],b[0])===0;no=lowerUpper>0||upperLower<0;}
 else fail('OP');
 return yes?'HOLDS_FOR_ALL_DECLARED_VALUES':no?'REFUTED_FOR_ALL_DECLARED_VALUES':'NOT_RESOLVED_BY_INTERVAL_ENCLOSURE';
}
function visitIntervalCone(nodes,targetId,inputRange){
 const byId=new Map(nodes.map(n=>[n.id,n])),memo=new Map(),rows=[];
  function visit(id){
   if(memo.has(id))return memo.get(id);
   const n=byId.get(id);
   let value=null,status='ENCLOSED',reason=null;
   if(n.kind==='input'){
    value=inputRange(n);
   }else{
    const [a,b]=n.args.map(visit);
    if(!a.value||!b.value){status='UNRESOLVED_INTERVAL';reason='DEPENDENCY_UNRESOLVED';}
    else if(n.kind==='constraint')status=compare(n.op,a.value,b.value,n.args[0]===n.args[1]);
    else try{value=derive(n.op,a.value,b.value,n.args[0]===n.args[1]);}
    catch(e){if(!['INTERVAL_ZERO_POSSIBLE','INTERVAL_ARITHMETIC_LIMIT'].includes(e.message))throw e;status='UNRESOLVED_INTERVAL';reason=e.message;}
   }
   const result={value,status,reason};memo.set(id,result);
   rows.push({id,kind:n.kind,operator:n.op??null,bounds:value?range(value):null,status,reason});
   return result;
  }
 return {target:visit(targetId),rows};
}

export function intersectReviewedRanges(left,right){
 const alo=read(left.lower),ahi=read(left.upper),blo=read(right.lower),bhi=read(right.upper);
 const low=cmp(alo,blo)>=0?alo:blo,high=cmp(ahi,bhi)<=0?ahi:bhi;
 const order=cmp(low,high);
 return order>0?null:{lower:text(low),upper:text(high),singleton:order===0};
}

export function reviewedRangeContains(lower,upper,point,{requireWidth=false}={}){
 const lo=read(lower),hi=read(upper),value=read(point);
 return (!requireWidth||cmp(lo,hi)<0)&&cmp(lo,value)<=0&&cmp(value,hi)<=0;
}

// A caller admits the projected point graph before interval evaluation.
export function evaluateQuantityConeIntervals(nodes,targetId,intervals){
 const inputRange=n=>{
  const declared=intervals.get(n.id);
  if(declared)return [read(declared.lower),read(declared.upper)];
  const value=read(n.value);return [value,value];
 };
 return visitIntervalCone(nodes,targetId,inputRange).target.status;
}
// Exact extrema of the affine difference preserve shared-input cancellation.
// A nonlinear subexpression is unsupported even if another branch would
// multiply its result by zero, because it could be undefined in the domain.
function affineQuantityDifference(nodes,targetId,intervals){
 const forms=new Map();
 const scale=(form,factor)=>({
  offset:mul(form.offset,factor),
  terms:new Map([...form.terms].flatMap(([id,value])=>{
   const product=mul(value,factor);return product[0]===0n?[]:[[id,product]];
  }))
 });
 const combine=(left,right,subtract)=>{
  const terms=new Map(left.terms);
  for(const [id,coefficient] of right.terms){
   const next=(subtract?sub:add)(terms.get(id)??zero,coefficient);
   if(next[0]===0n)terms.delete(id);else terms.set(id,next);
  }
  return {offset:(subtract?sub:add)(left.offset,right.offset),terms};
 };
 // Kernel admission permits shuffled inputs. Process dependencies recursively,
 // memoizing shared nodes; the admitted graph depth is bounded.
 const byId=new Map(nodes.map(node=>[node.id,node]));
 function visit(id){
  if(forms.has(id))return forms.get(id);
  const node=byId.get(id);
  let form=null;
  if(node.kind==='input')form=intervals.has(id)
   ?{offset:zero,terms:new Map([[id,one]])}
   :{offset:read(node.value),terms:new Map()};
  else{
   const [a,b]=node.args.map(visit);
   if(a&&b){
    if(node.op==='add'||node.op==='sub')form=combine(a,b,node.op==='sub');
    if(node.op==='mul'&&!a.terms.size)form=scale(b,a.offset);
    else if(node.op==='mul'&&!b.terms.size)form=scale(a,b.offset);
    if(node.op==='div'&&!b.terms.size&&b.offset[0]!==0n)form=scale(a,div(one,b.offset));
   }
  }
  forms.set(id,form);return form;
 }
 const target=byId.get(targetId),[left,right]=target.args.map(visit);
 if(!left||!right)return null;
 return {op:target.op,form:combine(left,right,true)};
}
function affineBounds({offset,terms},intervals){
 let lo=offset,hi=offset;
 for(const [id,coefficient] of terms){
  const {lower,upper}=intervals.get(id);
  const a=mul(coefficient,read(lower)),b=mul(coefficient,read(upper));
  if(cmp(a,b)<=0){lo=add(lo,a);hi=add(hi,b);}
  else{lo=add(lo,b);hi=add(hi,a);}
 }
 return [lo,hi];
}

// Preserve every input as a variable; only value-independent arithmetic may
// contribute a public coefficient or offset to a private proof.
export function projectPrivateAffineStatement(nodes,targetId){
 const ids=new Map(nodes.filter(node=>node.kind==='input').map(node=>[node.id,null]));
 const difference=affineQuantityDifference(nodes,targetId,ids);
 if(!difference)return null;
 const {op,form}=difference;
 return {operator:op,offset:text(form.offset),terms:nodes.filter(node=>form.terms.has(node.id))
  .map(node=>({id:node.id,weight:text(form.terms.get(node.id))}))};
}

export function evaluateAffineQuantityCone(nodes,targetId,intervals){
 const difference=affineQuantityDifference(nodes,targetId,intervals);
 return difference?compare(difference.op,affineBounds(difference.form,intervals),[zero,zero],false):null;
}

// Vary one coordinate while holding the other declared ranges fixed. Because
// the affine image of a box is an interval, its exact endpoints attain both
// extremes and the two crossings partition all rational values of this input.
export function partitionAffineCounterfactual(nodes,targetId,intervals,nodeId){
 const difference=affineQuantityDifference(nodes,targetId,intervals);
 if(!difference)return null;
 const {op,form}=difference,coefficient=form.terms.get(nodeId);
 const context={offset:form.offset,terms:new Map(form.terms)};
 context.terms.delete(nodeId);
 const [lo,hi]=affineBounds(context,intervals);
 if(!coefficient)return [{from:null,to:null,includeFrom:false,includeTo:false,status:compare(op,[lo,hi],[zero,zero],false)}];
 const crossings=[div(sub(zero,lo),coefficient),div(sub(zero,hi),coefficient)].sort(cmp);
 if(cmp(crossings[0],crossings[1])===0)crossings.pop();
 const region=(from,to,inclusive,sample)=>{
  const delta=mul(coefficient,sample);
  return {from:from?text(from):null,to:to?text(to):null,includeFrom:inclusive,includeTo:inclusive,
   status:compare(op,[add(lo,delta),add(hi,delta)],[zero,zero],false)};
 };
 const regions=[region(null,crossings[0],false,sub(crossings[0],one))];
 for(let i=0;i<crossings.length;i++){
  const point=crossings[i],next=crossings[i+1];
  regions.push(region(point,point,true,point));
  if(next)regions.push(region(point,next,false,div(add(point,next),[2n,1n])));
 }
 regions.push(region(crossings.at(-1),null,false,add(crossings.at(-1),one)));
 return regions;
}

export async function evaluateReviewedIntervals(versionText,versionPin,planText,planPin){
 if(typeof planPin!=='string'||await casePin(planText)!==planPin)fail('PIN');
 const replay=await replayInvestigationVersion(versionText,versionPin),raw=parse(versionText,6),contract=parse(raw.contractText),batch=parse(raw.batchText,5),p=parse(planText,6);
 const ids=new Set(contract.bindings.map(b=>b.id));
 if(!keys(p,['version','versionDigest','ranges'])||p.version!==1||p.versionDigest!==versionPin||!Array.isArray(p.ranges)||p.ranges.length<1||p.ranges.length>8)fail('PLAN');
 const intervals=new Map();
 for(const r of p.ranges){
  if(!keys(r,['bindingId','lower','upper'])||!ids.has(r.bindingId)||intervals.has(r.bindingId))fail('BINDING');
  const lower=read(r.lower),upper=read(r.upper);if(cmp(lower,upper)>0)fail('ORDER');
  intervals.set(r.bindingId,[lower,upper]);
 }
 // Validate baseline containment against the compiler's admitted quantities,
 // even for unused bindings. A valid contract is not empirical calibration.
 const first=replay.investigation.candidates.find(c=>c.admission==='ADMITTED');
 if(!first)fail('NO_ADMITTED_CANDIDATE');
 const compiledFirst=await compileReviewedProposal(raw.contractText,raw.contractPin,batch.proposals.find(x=>x.id===first.id).proposalText);
 const baseline=new Map(compiledFirst.bindings.map(b=>[b.id,read(b.value)]));
 for(const [id,r] of intervals){const point=baseline.get(id);if(cmp(point,r[0])<0||cmp(point,r[1])>0)fail('POINT_OUTSIDE_RANGE');}
 const candidates=[];
 for(const c of replay.investigation.candidates){
  const base=c.computation?.status??'REFUSED';
  if(!['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED'].includes(base)){candidates.push({id:c.id,baseline:base,status:'BASELINE_UNRESOLVED_NOT_EVALUATED',nodes:[],usedRanges:[]});continue;}
  const compiled=c.id===first.id?compiledFirst:await compileReviewedProposal(raw.contractText,raw.contractPin,batch.proposals.find(x=>x.id===c.id).proposalText);
  const used=new Set();
  const {target,rows}=visitIntervalCone(compiled.nodes,compiled.target.id,n=>{
   const point=baseline.get(n.bindingId),declared=intervals.get(n.bindingId);
   if(declared)used.add(n.bindingId);
   return declared??[point,point];
  });
  // The original exact point lies inside every declared interval. A proven
  // opposite universal result is an invariant failure, never a new verdict.
  if((target.status==='HOLDS_FOR_ALL_DECLARED_VALUES'&&base==='CONDITIONALLY_REFUTED')||(target.status==='REFUTED_FOR_ALL_DECLARED_VALUES'&&base==='CONDITIONALLY_SATISFIED'))fail('POINT_CONTRADICTION');
  candidates.push({id:c.id,baseline:base,status:target.status,nodes:rows,usedRanges:[...used].sort(sort)});
 }
 return freeze({version:VERSION,versionDigest:versionPin,planDigest:planPin,ranges:[...intervals].sort(([a],[b])=>sort(a,b)).map(([bindingId,r])=>({bindingId,...range(r)})),
 candidates,decisionAuthority:'NONE',qualification:'Exact rational conservative interval enclosure over the admitted formulas and explicitly declared inclusive hypothetical input ranges. Repeated DAG identity permits narrow algebraic refinements only. Overlapping enclosures do not prove a reversal; shared dependency may overestimate uncertainty. A possible zero divisor is unresolved. No confidence interval, probability, calibration, empirical support, or professional authority.'});
}
