// Data-only reviewed binding compiler. Models never supply executable code, numeric leaves or truth status.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {createVerifier} from './index.js';
export const VERSION='sutra-reviewed-claim-compiler/v1';
const HASH=/^sha256:[a-f0-9]{64}$/,ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const id=x=>typeof x==='string'&&ID.test(x);
const pin=x=>typeof x==='string'&&HASH.test(x);
const keys=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
const fail=code=>{throw TypeError(code);};
const sort=(a,b)=>a<b?-1:a>b?1:0;
const frozen=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(frozen);Object.freeze(x);}return x;};
const bytes=s=>new TextEncoder().encode(s);
const decode=b=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b);
const text=(x,max)=>typeof x==='string'&&x.length>0&&x.length<=max&&!/[\ud800-\udfff]/u.test(x)&&x.trim().length>0;
const boundedInt=x=>Number.isSafeInteger(x)&&x>=0&&!Object.is(x,-0);
const uniq=xs=>[...new Set(xs)].sort(sort);
const QUAL='Exact source spans and host-pinned bindings only. Quotation integrity is not source truth or semantic entailment. Quantity types and comparability scope are declared by the host, not established by the compiler. Proposed formulas and target relevance are unverified. No evidence independence, causal inference, professional advice or external action is established.';
function type(x){
 if(!keys(x,['kind','unit','scope','dimension'])||![x.kind,x.unit,x.scope].every(id)||!Array.isArray(x.dimension)||x.dimension.length!==3||!x.dimension.every(n=>Number.isInteger(n)&&n>=-16&&n<=16&&!Object.is(n,-0)))fail('COMPILER_TYPE');
 if(x.kind==='ratio'?(x.unit!=='one'||x.dimension.some(Boolean)):x.unit==='one')fail('COMPILER_RATIO_TYPE');
 return {kind:x.kind,unit:x.unit,scope:x.scope,dimension:x.dimension.slice()};
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const ratio=t=>t.kind==='ratio';
const ratioOf=t=>({kind:'ratio',unit:'one',scope:t.scope,dimension:[0,0,0]});
function opType(kind,op,a,b){
 if(!a||!b)return null;
 if(kind==='constraint'||op==='add'||op==='sub')return same(a,b)?a:null;
 if(a.scope!==b.scope)return null;
 if(op==='mul')return ratio(a)?b:ratio(b)?a:null;
 if(op==='div')return same(a,b)?ratioOf(a):ratio(b)?a:null;
 return null;
}
function exactNumber(lexeme,t){
 // No locale guessing, implicit scales, scientific notation, NaN or arbitrary expression.
 let n,d;
 if(/^-?(?:0|[1-9]\d{0,23})\/[1-9]\d{0,23}$/.test(lexeme)){[n,d]=lexeme.split('/').map(BigInt);}
 else{
  const m=/^(-?)(0|[1-9]\d{0,23})(?:\.(\d{1,12}))?(%)?$/.exec(lexeme);
  if(!m)fail('COMPILER_NUMBER');
  if(m[4]&&!ratio(t))fail('COMPILER_PERCENT_UNIT');
  const frac=m[3]??'';n=BigInt(m[2]+frac)*(m[1]?-1n:1n);d=10n**BigInt(frac.length)*(m[4]?100n:1n);
 }
 if(n===0n&&lexeme.startsWith('-'))fail('COMPILER_NEGATIVE_ZERO');
 let a=n<0n?-n:n,b=d;while(b){const q=a%b;a=b;b=q;}
 return (n/a).toString()+'/'+(d/a).toString();
}
function span(s,docs,numeric=false){
 if(!keys(s,['sourceId','start','end','quote'])||!docs.has(s.sourceId)||!boundedInt(s.start)||!boundedInt(s.end)||s.end<=s.start||s.end-s.start>4096||!text(s.quote,2048))fail('COMPILER_SPAN');
 const doc=docs.get(s.sourceId),raw=doc.bytes;
 if(s.end>raw.length)fail('COMPILER_SPAN_RANGE');
 let found;
 try{found=decode(raw.slice(s.start,s.end));}catch{fail('COMPILER_SPAN_BOUNDARY');}
 if(found!==s.quote)fail('COMPILER_QUOTE_MISMATCH');
 if(numeric){
  // Host-reviewed numeric token cannot be a truncated alphanumeric/decimal token.
  const before=Array.from(decode(raw.slice(0,s.start))).at(-1)??'',after=Array.from(decode(raw.slice(s.end)))[0]??'';
  if(/[\p{L}\p{N}.,/%+\-]/u.test(before)||/[\p{L}\p{N}.,/%+\-]/u.test(after))fail('COMPILER_NUMBER_BOUNDARY');
 }
 return {sourceId:s.sourceId,start:s.start,end:s.end,quote:found,sourceDigest:doc.digest,declaredLineage:doc.lineage,origin:doc.origin};
}
async function host(contractText,expectedPin){
 if(!pin(expectedPin))fail('COMPILER_CONTRACT_PIN_REQUIRED');
 if(await casePin(contractText)!==expectedPin)fail('COMPILER_CONTRACT_PIN_MISMATCH');
 const c=parseUniqueJson(contractText,{maxChars:262144,maxDepth:9});
 if(!keys(c,['version','question','sources','bindings'])||c.version!==1||!keys(c.question,['text','digest'])||!text(c.question.text,8192)||!pin(c.question.digest)||!Array.isArray(c.sources)||c.sources.length>8||!Array.isArray(c.bindings)||c.bindings.length>64)fail('COMPILER_CONTRACT');
 const docs=new Map();
 async function add(i,t,d,l,o){
  if(docs.has(i)||await casePin(t)!==d)fail('COMPILER_SOURCE_PIN');
  docs.set(i,{bytes:bytes(t),digest:d,lineage:l,origin:o});
 }
 await add('question',c.question.text,c.question.digest,'user_question','user_statement');
 for(const s of c.sources){
  if(!keys(s,['id','text','digest','lineage'])||!id(s.id)||s.id==='question'||!id(s.lineage)||!text(s.text,16384)||!pin(s.digest))fail('COMPILER_SOURCE');
  await add(s.id,s.text,s.digest,s.lineage,'source_assertion');
 }
 const bindings=new Map(),locations=new Set();
 for(const b of c.bindings){
  if(!keys(b,['id','span','type'])||!id(b.id)||bindings.has(b.id))fail('COMPILER_BINDING');
  const t=type(b.type),s=span(b.span,docs,true),loc=s.sourceId+'|'+s.start+'|'+s.end;
  if(locations.has(loc))fail('COMPILER_DUPLICATE_BINDING_SPAN');
  locations.add(loc);bindings.set(b.id,{id:b.id,span:s,type:t,value:exactNumber(s.quote,t)});
 }
 const digests=new Map();
 for(const [i,d] of docs)if(i!=='question'){
  if(!digests.has(d.digest))digests.set(d.digest,[]);
  digests.get(d.digest).push({id:i,lineage:d.lineage});
 }
 const duplicateSourceBytes=[...digests.entries()].filter(([,a])=>a.length>1).sort(([a],[b])=>sort(a,b)).map(([digest,sources])=>({digest,sources:sources.sort((a,b)=>sort(a.id,b.id))}));
 return {docs,bindings,duplicateSourceBytes};
}
function proposal(proposalText,contractDigest,docs,bindings){
 const p=parseUniqueJson(proposalText,{maxChars:65536,maxDepth:9});
 if(!keys(p,['version','contractDigest','questionSpan','claims','nodes','targetId'])||p.version!==1||p.contractDigest!==contractDigest||!Array.isArray(p.claims)||p.claims.length>32||!Array.isArray(p.nodes)||p.nodes.length<1||p.nodes.length>64||!id(p.targetId))fail('COMPILER_PROPOSAL');
 const question=span(p.questionSpan,docs);
 if(question.sourceId!=='question')fail('COMPILER_QUESTION_SPAN');
 const claims=[],claimIds=new Set();
 for(const c of p.claims){
  if(!id(c?.id)||claimIds.has(c.id))fail('COMPILER_CLAIM_ID');claimIds.add(c.id);
  if(c.kind==='quoted_assertion'&&keys(c,['id','kind','span']))claims.push({id:c.id,kind:c.kind,span:span(c.span,docs),status:'EXACT_QUOTE_ONLY'});
  else if(['hypothesis','assumption'].includes(c.kind)&&keys(c,['id','kind','text'])&&text(c.text,2048))claims.push({id:c.id,kind:c.kind,text:c.text,status:'PROPOSED_UNVERIFIED'});
  else fail('COMPILER_CLAIM');
 }
 const nodes=new Map();
 for(const n of p.nodes){
  if(!id(n?.id)||nodes.has(n.id))fail('COMPILER_NODE_ID');
  if(n.kind==='input'&&keys(n,['id','kind','bindingId'])&&bindings.has(n.bindingId))nodes.set(n.id,n);
  else if(n.kind==='unknown'&&keys(n,['id','kind','type','reason'])&&text(n.reason,512))nodes.set(n.id,{...n,type:type(n.type)});
  else if(['derive','constraint'].includes(n.kind)&&keys(n,['id','kind','op','args'])&&Array.isArray(n.args)&&n.args.length===2&&n.args.every(id)&&(n.kind==='derive'?['add','sub','mul','div']:['eq','lt','le','gt','ge']).includes(n.op))nodes.set(n.id,n);
  else fail('COMPILER_NODE');
 }
 if(nodes.get(p.targetId)?.kind!=='constraint')fail('COMPILER_TARGET');
 const ordered=[],degrees=new Map(),children=new Map(),depth=new Map();
 for(const i of nodes.keys()){degrees.set(i,0);children.set(i,[]);depth.set(i,1);}
 for(const [i,n] of nodes)for(const d of new Set(n.args??[])){
  if(!nodes.has(d)||nodes.get(d).kind==='constraint')fail('COMPILER_DEPENDENCY');
  degrees.set(i,degrees.get(i)+1);children.get(d).push(i);
 }
 const ready=[...nodes.keys()].filter(i=>!degrees.get(i)).sort(sort);
 while(ready.length){
  const i=ready.shift();ordered.push(nodes.get(i));
  for(const j of children.get(i)){
   depth.set(j,Math.max(depth.get(j),depth.get(i)+1));if(depth.get(j)>24)fail('COMPILER_DEPTH');
   degrees.set(j,degrees.get(j)-1);if(!degrees.get(j)){ready.push(j);ready.sort(sort);}
  }
 }
 if(ordered.length!==nodes.size)fail('COMPILER_CYCLE');
 return {question,claims,ordered,targetId:p.targetId};
}
export async function compileReviewedProposal(contractText,contractPin,proposalText){
 const h=await host(contractText,contractPin),p=proposal(proposalText,contractPin,h.docs,h.bindings),compiled=new Map(),executable=[];
 for(const n of p.ordered){
  let row;
  if(n.kind==='input'){
   const b=h.bindings.get(n.bindingId);
   row={id:n.id,kind:n.kind,type:b.type,status:'READY',bindingId:b.id,missing:[],typeBlockers:[],bindings:[b.id]};
   executable.push({id:n.id,kind:'input',value:b.value,dimension:b.type.dimension,basis:'compiler '+contractPin+' '+b.id});
  }else if(n.kind==='unknown'){
   row={id:n.id,kind:n.kind,type:n.type,status:'MISSING_INPUT',reason:n.reason,missing:[n.id],typeBlockers:[],bindings:[]};
  }else{
   const deps=n.args.map(i=>compiled.get(i)),t=opType(n.kind,n.op,deps[0].type,deps[1].type);
   const missing=uniq(deps.flatMap(d=>d.missing)),typeBlockers=uniq(deps.flatMap(d=>d.typeBlockers));
   if(!t&&!typeBlockers.length)typeBlockers.push(n.id);
   const status=typeBlockers.length?'BLOCKED_TYPE':missing.length?'BLOCKED_MISSING_INPUT':'READY';
   row={id:n.id,kind:n.kind,op:n.op,args:n.args,type:n.kind==='constraint'?null:t,status,missing,typeBlockers,bindings:uniq(deps.flatMap(d=>d.bindings))};
   if(status==='READY')executable.push({id:n.id,kind:n.kind,op:n.op,args:n.args});
  }
  compiled.set(n.id,row);
 }
 const graphText=executable.length?JSON.stringify({schemaVersion:1,nodes:executable}):null;
 const report=graphText?(await createVerifier().evaluate(graphText)).report:null,receipts=new Map((report?.receipts??[]).map(r=>[r.id,r]));
 const rows=[...compiled.values()].sort((a,b)=>sort(a.id,b.id)).map(n=>({...n,receipt:receipts.get(n.id)??null}));
 const target=rows.find(r=>r.id===p.targetId);
 const status=target.status!=='READY'?target.status:target.receipt?.outcome.status==='constraint_satisfied'?'CONDITIONALLY_SATISFIED':target.receipt?.outcome.status==='constraint_refuted'?'CONDITIONALLY_REFUTED':'UNRESOLVED_COMPUTATION';
 const used=target.bindings.map(i=>h.bindings.get(i));
 return frozen({version:VERSION,contractDigest:contractPin,proposalDigest:await casePin(proposalText),question:p.question,claims:p.claims,bindings:[...h.bindings.values()].sort((a,b)=>sort(a.id,b.id)),nodes:rows,graphText,report,target:{id:p.targetId,status,missing:target.missing,typeBlockers:target.typeBlockers,sourceIds:uniq(used.map(b=>b.span.sourceId)),declaredLineages:uniq(used.map(b=>b.span.declaredLineage)),questionRelevance:'UNVERIFIED',methodValidity:'UNVERIFIED'},duplicateSourceBytes:h.duplicateSourceBytes,qualification:QUAL});
}
export async function exportReviewedProposal(contractText,contractPin,proposalText){return frozen({version:VERSION,contractText,proposalText,result:await compileReviewedProposal(contractText,contractPin,proposalText)});}

export async function validateReviewedContract(contractText,contractPin){const h=await host(contractText,contractPin);return frozen({contractDigest:contractPin,bindingCount:h.bindings.size,duplicateSourceBytes:h.duplicateSourceBytes});}
