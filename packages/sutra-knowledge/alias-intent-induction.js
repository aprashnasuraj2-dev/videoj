// Bounded question-to-mapping induction over caller-declared aliases.
// No arithmetic, approval, source retrieval, model contact, or fallback oracle.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {validateReviewedContract} from './reviewed-claim-compiler.js';
import {compileReviewedQuestion} from './reviewed-question.js';

export const VERSION='sutra-alias-intent-induction/v1';
const MAX=262144;
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const ALIAS=/^[\p{L}\p{M}\p{N}]+(?:[ _-][\p{L}\p{M}\p{N}]+)*$/u;
const RESERVED=/(?:^|[ _-])(?:not|no|and|or|if|unless|because|except|than|greater|higher|less|lower|equal|least|most|more|causes?|causal|afterwards|respectively)(?:$|[ _-])/iu;
const CHANGE_RESERVED=/(?:^|[ _-])(?:change|difference|signed|relative|from|to|between|percent|percentage|points?|absolute|growth|increase|decrease)(?:$|[ _-])/iu;
const RELATIONS=['not greater than','not higher than','not less than','not lower than','no more than','no less than','greater than','higher than','less than','lower than','at least','at most','equal to'];
const PREFIXES=[['Is the signed relative change from ',1],['Is the signed difference from ',1],['Is the change from ',2]];
const parse=(s,d=9)=>parseUniqueJson(s,{maxChars:MAX,maxDepth:d});
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const fail=c=>{throw TypeError('INDUCTION_'+c);};
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
const sort=(a,b)=>a<b?-1:a>b?1:0;
const legal=(s,change=false)=>typeof s==='string'&&s.length>0&&s.length<=128&&ALIAS.test(s)&&!RESERVED.test(s)&&!(change&&CHANGE_RESERVED.test(s));
const cancelled=signal=>{if(signal?.aborted)fail('CANCELLED');};

// Full-string parsing. Enumerate delimiter positions instead of accepting a
// partial parse. A second syntactically legal segmentation is a refusal.
function parseQuestion(q){
 if(typeof q!=='string'||q.length>1000||!q.endsWith('?')||!q.startsWith('Is '))return [];
 const end=q.length-1, change=PREFIXES.find(([p])=>q.startsWith(p)), prefix=change?.[0]??'Is ';
 const start=prefix.length, matches=[];
 function operand(a,b){const quote=q.slice(a,b);return legal(quote,!!change)?{start:a,end:b,quote}:null;}
 for(const relation of RELATIONS){
  const marker=' '+relation+' ';
  for(let i=q.indexOf(marker,start);i>=0&&i<end;i=q.indexOf(marker,i+1)){
   const right=operand(i+marker.length,end);if(!right)continue;
   if(!change){const left=operand(start,i);if(left)matches.push({version:1,modes:1,relation,operands:{left,right}});continue;}
   for(let j=q.indexOf(' to ',start);j>=0&&j<i;j=q.indexOf(' to ',j+1)){
    const baseline=operand(start,j),current=operand(j+4,i);
    if(baseline&&current)matches.push({version:2,modes:change[1],relation,operands:{baseline,current,threshold:right}});
   }
  }
 }
 return matches;
}
function aliases(c,known){
 if(!keys(c,['version','contractDigest','aliases'])||c.version!==1||!Array.isArray(c.aliases)||c.aliases.length>128)fail('CATALOG');
 const out=new Map();
 for(const a of c.aliases){
  if(!keys(a,['alias','bindingIds'])||!legal(a.alias)||out.has(a.alias)||!Array.isArray(a.bindingIds)||a.bindingIds.length===0||a.bindingIds.length>8)fail('ALIAS');
  if(a.bindingIds.some(id=>typeof id!=='string'||!ID.test(id)||!known.has(id))||new Set(a.bindingIds).size!==a.bindingIds.length)fail('BINDING');
  out.set(a.alias,a.bindingIds.slice().sort(sort));
 }
 return out;
}
export async function induceReviewedQuestion({contractText,contractPin,catalogText,catalogPin,signal}={}){
 cancelled(signal);
 if(typeof catalogPin!=='string'||await casePin(catalogText)!==catalogPin)fail('CATALOG_PIN');
 cancelled(signal);
 await validateReviewedContract(contractText,contractPin);
 cancelled(signal);
 const c=parse(contractText),catalog=parse(catalogText,6);
 if(catalog?.contractDigest!==contractPin)fail('STALE_CATALOG');
 const lookup=aliases(catalog,new Set(c.bindings.map(b=>b.id))),q=c.question.text;
 const common={version:VERSION,contractDigest:contractPin,catalogDigest:catalogPin,originalQuestion:q,decisionAuthority:'NONE',mappingAuthority:'CALLER_DECLARED_UNVERIFIED',reviewRequired:true};
 const matches=parseQuestion(q);
 if(matches.length!==1)return freeze({...common,state:matches.length?'AMBIGUOUS_GRAMMAR':'UNSUPPORTED_GRAMMAR',planText:null,planPin:null,candidateCount:null,unresolved:[]});
 const match=matches[0],plan={version:match.version,contractDigest:contractPin},unresolved=[];
 let count=match.modes;
 for(const [role,o] of Object.entries(match.operands)){
  const bindingIds=lookup.get(o.quote);
  if(!bindingIds){unresolved.push({role,quote:o.quote,start:o.start,end:o.end});continue;}
  count*=bindingIds.length;
  plan[role]={start:o.start,end:o.end,bindingIds};
 }
 if(unresolved.length)return freeze({...common,state:'UNRESOLVED_BINDING',planText:null,planPin:null,candidateCount:null,unresolved});
 if(count>8)return freeze({...common,state:'CANDIDATE_LIMIT',planText:null,planPin:null,candidateCount:count,unresolved:[]});
 const planText=JSON.stringify(plan),planPin=await casePin(planText);
 cancelled(signal);
 return freeze({...common,state:'UNREVIEWED_PLAN',relation:match.relation,candidateCount:count,unresolved:[],planText,planPin});
}

// Separate explicit computation step. Reconstruct from exact current inputs;
// never trust an imported plan or use a standalone fallback evaluator.
export async function computeInducedQuestion(input,expectedPlanPin){
 const preview=await induceReviewedQuestion(input);
 if(preview.state!=='UNREVIEWED_PLAN'||typeof expectedPlanPin!=='string'||preview.planPin!==expectedPlanPin)fail('PLAN_NOT_RETAINED');
 cancelled(input.signal);
 const result=await compileReviewedQuestion(input.contractText,input.contractPin,preview.planText,preview.planPin);
 cancelled(input.signal);
 if(result.decisionAuthority!=='NONE')fail('AUTHORITY');
 return freeze({version:VERSION,preview,result,decisionAuthority:'NONE',reviewRequired:true});
}
