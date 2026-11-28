// Compact model wire adapter: derive offsets only from unique exact quotes.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {AMBIGUITY_FAMILIES} from './semantic-question-engine.js';
const fail=c=>{throw TypeError('COMPACT_SEMANTIC_'+c);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(v=>Object.hasOwn(x,v));
const str=(x,n)=>typeof x==='string'&&x===x.trim()&&x.length>0&&x.length<=n&&!/[\u0000-\u001f\u007f\ud800-\udfff]/u.test(x);
export function compactSemanticResponse(raw,packet,packetPin){
 if(typeof raw!=='string'||raw.length>8192||packet.conversation||packet.sources.length||packet.bindings.length)fail('PROFILE');
 const v=parseUniqueJson(raw,{maxChars:8192,maxDepth:8});
 if(!keys(v,['readings','clarification'])||!Array.isArray(v.readings)||v.readings.length>3||typeof v.clarification!=='string'||v.clarification.length>500||v.clarification!==v.clarification.trim()||v.clarification&&!str(v.clarification,500))fail('SCHEMA');
 const alternatives=v.readings.map((r,i)=>{
  if(!keys(r,['meaning','quote','family','interpretation'])||!str(r.meaning,1000)||!str(r.quote,1024)||!(r.family===null||AMBIGUITY_FAMILIES.includes(r.family))||!(r.family===null?r.interpretation===null:str(r.interpretation,400)))fail('READING');
  const start=packet.question.indexOf(r.quote);if(start<0||packet.question.indexOf(r.quote,start+1)!==-1)fail('QUOTE');
  return {id:'meaning_'+(i+1),meaning:r.meaning,questionSpans:[{start,end:start+r.quote.length,quote:r.quote}],evidenceSpans:[],facets:r.family?[{family:r.family,interpretation:r.interpretation}]:[],operation:null,missingContext:v.clarification?[v.clarification]:[]};
 });
 return JSON.stringify({version:1,packetDigest:packetPin,disposition:alternatives.length?'ALTERNATIVES':'ABSTAIN',alternatives,clarifications:v.clarification?[v.clarification]:[]});
}
