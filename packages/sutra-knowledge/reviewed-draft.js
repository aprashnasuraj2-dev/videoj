// A human-controlled draft is distinct from the model proposal.
// Browser textarea selections use UTF-16 indices; the pinned compiler uses bytes.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {validateSourceProvenance} from './source-provenance.js';
import {casePin} from './pinned-investigation.js';
import {validateReviewedContract} from './reviewed-claim-compiler.js';
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const fail=c=>{throw TypeError(c);};
const text=(x,max)=>typeof x==='string'&&x.length>0&&x.length<=max&&x.trim().length>0&&!/[\ud800-\udfff]/u.test(x);
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const enc=new TextEncoder();
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function boundary(s,n){return !(n>0&&n<s.length&&/[\ud800-\udbff]/.test(s[n-1])&&/[\udc00-\udfff]/.test(s[n]));}
export function selectedSpan(sourceId,source,start,end){
 if(!id(sourceId)||!text(source,16384)||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||Object.is(start,-0)||start<0||end<=start||end>source.length||!boundary(source,start)||!boundary(source,end))fail('DRAFT_SELECTION');
 const quote=source.slice(start,end),byteStart=enc.encode(source.slice(0,start)).length,byteEnd=byteStart+enc.encode(quote).length;
 return {sourceId,start:byteStart,end:byteEnd,quote};
}
export async function sealReviewedDraft(draftText){
 const d=parseUniqueJson(draftText,{maxChars:262144,maxDepth:8});
 if(!keys(d,['version','question','sources','bindings'])||d.version!==1||!text(d.question,8192)||!Array.isArray(d.sources)||d.sources.length>8||!Array.isArray(d.bindings)||d.bindings.length>64)fail('DRAFT_SHAPE');
 const docs=new Map([['question',d.question]]),sources=[];
 for(const s of d.sources){
  if(!(keys(s,['id','text','lineage'])||keys(s,['id','text','lineage','provenance']))||!id(s.id)||docs.has(s.id)||!id(s.lineage)||!text(s.text,16384))fail('DRAFT_SOURCE');
  docs.set(s.id,s.text);const digest=await casePin(s.text);sources.push({id:s.id,text:s.text,digest,lineage:s.lineage,...(Object.hasOwn(s,'provenance')?{provenance:validateSourceProvenance(s.provenance,s.text,digest)}:{})});
 }
 const bindings=[];
 for(const b of d.bindings){
  if(!keys(b,['id','sourceId','start','end','type'])||!id(b.id)||!docs.has(b.sourceId))fail('DRAFT_BINDING');
  bindings.push({id:b.id,span:selectedSpan(b.sourceId,docs.get(b.sourceId),b.start,b.end),type:b.type});
 }
 const contractText=JSON.stringify({version:1,question:{text:d.question,digest:await casePin(d.question)},sources,bindings}),pin=await casePin(contractText);
 const reviewed=await validateReviewedContract(contractText,pin);
 return freeze({contractText,pin,reviewed});
}
// Optional user-chosen starting comparison, not natural-language compilation.
// The comparison itself is still an untrusted proposal and may be irrelevant.
export async function draftComparisonProposal(contractText,pin,left,right,op){
 await validateReviewedContract(contractText,pin);
 const c=parseUniqueJson(contractText,{maxChars:262144,maxDepth:9});
 if(left===right||!c.bindings.some(b=>b.id===left)||!c.bindings.some(b=>b.id===right)||!['eq','lt','le','gt','ge'].includes(op))fail('DRAFT_COMPARISON');
 const questionSpan=selectedSpan('question',c.question.text,0,c.question.text.length);
 if(questionSpan.quote.length>2048||questionSpan.end>4096)fail('DRAFT_QUESTION_SPAN');
 return JSON.stringify({version:1,contractDigest:pin,questionSpan,claims:[],nodes:[{id:'left_value',kind:'input',bindingId:left},{id:'right_value',kind:'input',bindingId:right},{id:'target',kind:'constraint',op,args:['left_value','right_value']}],targetId:'target'},null,2);
}
