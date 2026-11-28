// Adapted from the epistemic-answer admission pattern in legacy PR #49.
// Citation validity establishes exact selected text, never entailment or truth.
import {parseUniqueJson} from './strict-json.js';
const fail=()=>{throw Error('REVIEWED_ANSWER_SCHEMA');};
const keys=(o,ks)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
const labels=Object.freeze({source_claim:'Reported by source (unverified)',inference:'Model inference',uncertainty:'Uncertainty'});
const boundary=(s,i)=>!(i>0&&i<s.length&&/[\ud800-\udbff]/.test(s[i-1])&&/[\udc00-\udfff]/.test(s[i]));
export function admitReviewedAnswer(raw,evidence){
 let v;try{v=parseUniqueJson(raw,{maxChars:12000,maxDepth:8});}catch{fail();}
 if(!keys(v,['claims'])||!Array.isArray(v.claims)||v.claims.length<2||v.claims.length>8)fail();
 let grounded=false,uncertain=false;
 const claims=v.claims.map(c=>{
  if(!keys(c,['kind','text','citation'])||!Object.hasOwn(labels,c.kind)||typeof c.text!=='string'||!c.text.trim()||c.text.length>1200||/[\u0000\ud800-\udfff]/u.test(c.text))fail();
  if(c.kind==='source_claim'){
   const p=c.citation;
   if(!keys(p,['sourceId','sourceDigest','start','end','quote'])||p.sourceId!==evidence.sourceId||p.sourceDigest!==evidence.sourceDigest||!Number.isSafeInteger(p.start)||!Number.isSafeInteger(p.end)||p.start<evidence.start||p.end>evidence.end||p.end<=p.start||typeof p.quote!=='string'||!p.quote.trim())fail();
   const a=p.start-evidence.start,b=p.end-evidence.start;
   if(!boundary(evidence.quote,a)||!boundary(evidence.quote,b)||p.quote!==evidence.quote.slice(a,b))fail();
   grounded=true;
  }else{if(c.citation!==null)fail();if(c.kind==='uncertainty')uncertain=true;}
  return Object.freeze({...c,citation:c.citation?Object.freeze({...c.citation}):null});
 });
 if(!grounded||!uncertain)fail();
 return Object.freeze({claims:Object.freeze(claims),text:claims.map(c=>labels[c.kind]+': '+c.text+(c.citation?' [Exact quote: “'+c.citation.quote+'” · UTF-16 '+c.citation.start+'–'+c.citation.end+']':'')).join('\n\n'),truthStatus:'UNVERIFIED',authority:'NONE'});
}
