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
  const nodes=new Map(compiled.nodes.map(n=>[n.id,n])),memo=new Map(),rows=[],used=new Set();
  function visit(id){
   if(memo.has(id))return memo.get(id);
   const n=nodes.get(id);
   let value=null,status='ENCLOSED',reason=null;
   if(n.kind==='input'){
    const point=baseline.get(n.bindingId);value=intervals.get(n.bindingId)??[point,point];
    if(intervals.has(n.bindingId))used.add(n.bindingId);
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
  const target=visit(compiled.target.id);
  // The original exact point lies inside every declared interval. A proven
  // opposite universal result is an invariant failure, never a new verdict.
  if((target.status==='HOLDS_FOR_ALL_DECLARED_VALUES'&&base==='CONDITIONALLY_REFUTED')||(target.status==='REFUTED_FOR_ALL_DECLARED_VALUES'&&base==='CONDITIONALLY_SATISFIED'))fail('POINT_CONTRADICTION');
  candidates.push({id:c.id,baseline:base,status:target.status,nodes:rows,usedRanges:[...used].sort(sort)});
 }
 return freeze({version:VERSION,versionDigest:versionPin,planDigest:planPin,ranges:[...intervals].sort(([a],[b])=>sort(a,b)).map(([bindingId,r])=>({bindingId,...range(r)})),
 candidates,decisionAuthority:'NONE',qualification:'Exact rational conservative interval enclosure over the admitted formulas and explicitly declared inclusive hypothetical input ranges. Repeated DAG identity permits narrow algebraic refinements only. Overlapping enclosures do not prove a reversal; shared dependency may overestimate uncertainty. A possible zero divisor is unresolved. No confidence interval, probability, calibration, empirical support, or professional authority.'});
}
