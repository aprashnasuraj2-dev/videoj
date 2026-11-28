// Narrow question-only proposal adapter. Whole-input span is assigned by SUTRA,
// NOT an LLM quotation or proof that a reading is entailed. No evidence/operand use.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
const fail=c=>{throw TypeError('READING_ONLY_'+c);};
const exact=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(v=>Object.hasOwn(x,v));
const txt=(s,n)=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=n&&!/[\u0000-\u001f\u007f\ud800-\udfff]/u.test(s);
const norm=s=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function readingOnlyResponse(raw,packet,packetPin){
 if(typeof raw!=='string'||raw.length>8192||packet.sources.length||packet.bindings.length||packet.conversation||!txt(packet.question,1024))fail('PROFILE');
 const v=parseUniqueJson(raw,{maxChars:8192,maxDepth:5});
 if(!exact(v,['readings','clarification'])||!Array.isArray(v.readings)||v.readings.length>2||v.readings.some(x=>!txt(x,600))||new Set(v.readings.map(norm)).size!==v.readings.length||typeof v.clarification!=='string'||v.clarification.length>500||v.clarification&&!txt(v.clarification,500))fail('SCHEMA');
 if(v.readings.some(x=>/^(?:reading [12]|interpretation [12]|specific plausible paraphrase|paraphrase|meaning [12]|unclear|unknown|n\/a|none)$/i.test(x)))fail('PLACEHOLDER');
 const alternatives=v.readings.map((meaning,i)=>({id:'reading_'+(i+1),meaning,questionSpans:[{start:0,end:packet.question.length,quote:packet.question}],evidenceSpans:[],facets:[],operation:null,missingContext:v.clarification?[v.clarification]:[]}));
 return {responseText:JSON.stringify({version:1,packetDigest:packetPin,disposition:alternatives.length?'ALTERNATIVES':'ABSTAIN',alternatives,clarifications:v.clarification?[v.clarification]:[]}),grounding:'WHOLE_QUESTION_SCOPE_ASSIGNED_BY_ADAPTER_NOT_MODEL_EVIDENCE'};
}
