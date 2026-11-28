import {quantityUnits,exactMagnitude,conversionGraph} from './local-computation.js';
import {capabilityCatalog} from './capabilities.js';

const MAX_OBJECTIVE=1000;
const kinds=Object.keys(quantityUnits);
const units=[...new Set(Object.values(quantityUnits).flat())].sort((a,b)=>b.length-a.length);
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const valuePattern='(-?(?:0|[1-9]\\d{0,23})(?:\\.\\d{1,23}|/[1-9]\\d{0,23})?)';
const unitPattern='('+units.map(escape).join('|')+')';
// The whole utterance must match a deliberately closed conversion grammar.
// In particular, do not extract a conversion from a multi-part objective.
const conversionPattern=new RegExp('^(?:[Cc]onvert\\s+)?'+valuePattern+'\\s*'+unitPattern+'\\s*(?:to|into|in|→|->)\\s*'+unitPattern+'(?:\\s+as\\s+('+kinds.join('|')+'))?\\s*[?.]?$');
const evidenceRules=Object.freeze([
 {id:'public_sources',terms:/\b(?:find|search|retrieve|look up|latest|current|recent|public sources?|citations?|research)\b/gi,reason:'Explicit acquisition or freshness language'},
 {id:'semantic_intake',terms:/\b(?:meaning|ambiguit(?:y|ies)|interpret(?:ation|ations)?|scope|compare|difference|distinguish)\b/gi,reason:'Interpretation or comparison language'},
 {id:'source_interpretation',terms:/\b(?:source span|quote|quotation|passage|document|evidence|report|excerpt)\b/gi,reason:'Evidence interpretation language'},
 {id:'challenge',terms:/\b(?:challenge|counterexample|falsif(?:y|ication)|critique|disagree|alternative explanation|refute|contradict)\b/gi,reason:'Challenge or disagreement language'},
 {id:'revision',terms:/\b(?:revise|revision|withdraw|correct|correction|update the source|replace the source)\b/gi,reason:'Revision language'},
 {id:'proof_replay',terms:/\b(?:proof|replay|recompute|verify the calculation|check the arithmetic|receipt)\b/gi,reason:'Conditional verification language'},
 {id:'candidate_plan',terms:/\b(?:plan|investigat(?:e|ion)|design|strategy|how should|propose|outline)\b/gi,reason:'Candidate planning language'},
 {id:'peer_critique',terms:/\b(?:published peer|peer network|another publisher|external agent)\b/gi,reason:'Explicit peer-capability language'},
 {id:'exact_quantity',terms:/\b(?:calculate|convert|conversion|unit conversion|arithmetic|compute|sum|ratio)\b/gi,reason:'Calculation language'}
]);
function freeze(value){
 if(value&&typeof value==='object'){
  for(const x of Object.values(value))freeze(x);
  Object.freeze(value);
 }
 return value;
}
function validateObjective(raw){
 if(typeof raw!=='string'||raw.length>MAX_OBJECTIVE||/[\ud800-\udfff]/u.test(raw))throw Error('OBJECTIVE_LIMIT');
 return raw.trim();
}
export function parseExactConversion(raw){
 const objective=validateObjective(raw);
 const m=conversionPattern.exec(objective);
 if(!m)return null;
 const [,magnitude,from,to,explicitKind]=m;
 let value;
 try{value=exactMagnitude(magnitude);}catch{return {status:'refused',reason:'invalid_magnitude',candidates:[]};}
 const options=kinds.filter(kind=>quantityUnits[kind].includes(from)&&quantityUnits[kind].includes(to)&&(!explicitKind||kind===explicitKind));
 if(!options.length)return {status:'refused',reason:'incompatible_or_unsupported_kind',candidates:[]};
 const candidates=[];
 for(const kind of options){
  try{
   conversionGraph({kind,value,from,to});
   candidates.push({kind,value,from,to});
  }catch{}
 }
 if(!candidates.length)return {status:'refused',reason:'kernel_profile_refused',candidates:[]};
 return freeze({status:candidates.length===1?'exact_candidate':'ambiguous_kind',candidates});
}
function collectHints(text){
 const hints=[];
 for(const rule of evidenceRules){
  const matches=[...text.matchAll(rule.terms)].slice(0,5).map(m=>({start:m.index,end:m.index+m[0].length,text:m[0]}));
  if(matches.length)hints.push({id:rule.id,reason:rule.reason,matches});
 }
 return hints;
}
export function analyzeObjective(raw){
 const text=validateObjective(raw);
 if(!text)return freeze({text,status:'empty',hints:[],conversion:null,qualification:'Enter an explicit objective.'});
 const conversion=parseExactConversion(text);
 if(conversion){
  const status=conversion.status==='exact_candidate'?'closed_conversion':conversion.status==='ambiguous_kind'?'clarify_quantity':'unsupported_conversion';
  return freeze({text,status,conversion,hints:[{id:'exact_quantity',reason:'Complete objective matches closed conversion grammar',matches:[{start:0,end:text.length,text}]}],qualification:'The exact quantity profile must be explicitly confirmed. This does not verify a real measurement or authorize execution.'});
 }
 const hints=collectHints(text);
 return freeze({text,status:hints.length?'review_required':'unclassified',conversion:null,hints,qualification:'Bounded lexical suggestions only; negation, context, implied capabilities and domain semantics are not resolved. Review the complete objective and choose requirements explicitly.'});
}
export function confirmRequirements(analysis,chosen){
 if(!analysis||typeof analysis.text!=='string'||!Array.isArray(chosen)||chosen.length>capabilityCatalog.length||new Set(chosen).size!==chosen.length)throw Error('OBJECTIVE_REQUIREMENTS');
 const ids=new Set(capabilityCatalog.map(c=>c.id));
 if(chosen.some(id=>!ids.has(id)))throw Error('OBJECTIVE_REQUIREMENTS');
 return freeze({objective:analysis.text,requirements:[...chosen].sort(),status:'user_selected',authority:'NONE'});
}
