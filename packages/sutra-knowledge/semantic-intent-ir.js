// Canonical versioned semantic intent IR. Records obligations without resolving them by assertion.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {previewSemanticQuestion} from './semantic-question-engine.js';

export const VERSION='sutra-semantic-intent-ir/v1';
export const OBLIGATIONS=Object.freeze(['source','extraction','entityResolution','scope','relationship','method','computation','empiricalValidity','applicability']);
const HASH=/^sha256:[a-f0-9]{64}$/;
const fail=x=>{throw TypeError('INTENT_IR_'+x);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const parse=(s,d=14)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const sort=(a,b)=>a<b?-1:a>b?1:0;
function operator(expression){return typeof expression==='string'?(expression.match(/(>=|<=|==|>|<)(?=\[)/)?.[1]??null):null;}
function relationship(candidate,question,types){
 const roles=Object.fromEntries(Object.entries(candidate.mapping??{}).sort(([a],[b])=>sort(a,b)));
 const mode=candidate.mode;
 const denominatorBinding=mode==='RATIO'?roles.denominator??null:['SIGNED_RELATIVE_CHANGE','TEMPORAL_RELATIVE_CHANGE'].includes(mode)?roles.prior??null:null;
 const baselineBinding=['SIGNED_DIFFERENCE','SIGNED_RELATIVE_CHANGE','TEMPORAL_RELATIVE_CHANGE','PERCENTAGE_POINT_CHANGE'].includes(mode)?roles.prior??null:null;
 const declaredTypes=Object.fromEntries([...new Set(Object.values(roles))].sort(sort).map(id=>[id,types.get(id)??null]));
 return {mode,operator:operator(candidate.expression),negated:/\b(?:not|no)\s+(?:greater|less|more|higher|lower)\b/i.test(question),denominatorBinding,baselineBinding,roles,declaredTypes};
}
function obligations(candidate){
 const executable=candidate.status==='KERNEL_READY';
 return {
  source:{state:'PINNED_BYTES_ONLY',note:'Byte identity and declared lineage only; authenticity and truth remain unverified.'},
  extraction:{state:'EXACT_REVIEWED_SPANS',note:'Only already reviewed binding spans are referenced.'},
  entityResolution:{state:'CALLER_DECLARED_UNVERIFIED',note:'Alias-to-binding mappings are declarations, not established identity.'},
  scope:{state:'DECLARED_NOT_ESTABLISHED',note:'Declared type scopes are retained without external applicability inference.'},
  relationship:{state:executable?'PROPOSED_UNREVIEWED':'UNSUPPORTED_OR_PORTABLE_ONLY',note:'Candidate relationship is generated but not approved as intended meaning.'},
  method:{state:'UNVERIFIED',note:'Method validity is not established by parsing or arithmetic.'},
  computation:{state:executable?'KERNEL_READY':'NOT_KERNEL_READY',note:'Kernel readiness is distinct from semantic correctness.'},
  empiricalValidity:{state:'UNVERIFIED',note:'No empirical truth or study validity is inferred.'},
  applicability:{state:'UNVERIFIED',note:'No external or professional applicability is inferred.'}
 };
}
function validateObligations(o){
 if(!keys(o,OBLIGATIONS))fail('OBLIGATIONS');
 for(const k of OBLIGATIONS)if(!keys(o[k],['state','note'])||typeof o[k].state!=='string'||!o[k].state||typeof o[k].note!=='string'||!o[k].note)fail('OBLIGATION_'+k);
}
export async function buildSemanticIntentIR(input){
 const preview=await previewSemanticQuestion(input),c=parse(input.contractText,10),types=new Map(c.bindings.map(b=>[b.id,b.type]));
 const sources=c.sources.map(s=>({id:s.id,digest:s.digest,lineage:s.lineage})).sort((a,b)=>sort(a.id,b.id));
 const bindings=c.bindings.map(b=>({id:b.id,sourceId:b.sourceId,span:b.span,type:b.type})).sort((a,b)=>sort(a.id,b.id));
 const candidates=preview.candidates.map(x=>({id:x.id,meaning:x.mode.replaceAll('_',' ').toLowerCase(),mode:x.mode,status:x.status,expression:x.expression,
  relationship:relationship(x,c.question.text,types),obligations:obligations(x),decisionAuthority:'NONE'}));
 const intent={version:VERSION,contractDigest:input.contractPin,semanticPreviewDigest:preview.previewPin,originalQuestion:{text:c.question.text,digest:c.question.digest},
  sources,bindings,candidates,unresolved:preview.unresolved,ambiguities:preview.ambiguities,reviewState:'REQUIRED',decisionAuthority:'NONE',
  qualification:'Versioned semantic intent record only. Source, extraction, entity, scope, relationship, method, computation, empirical-validity and applicability obligations remain separate; no unresolved obligation becomes approval.'};
 const intentText=JSON.stringify(intent),intentPin=await casePin(intentText);return freeze({...intent,intentText,intentPin});
}
export async function verifySemanticIntentIR(intentText,intentPin){
 if(typeof intentPin!=='string'||!HASH.test(intentPin)||await casePin(intentText)!==intentPin)fail('PIN');
 const x=parse(intentText,16);
 if(!keys(x,['version','contractDigest','semanticPreviewDigest','originalQuestion','sources','bindings','candidates','unresolved','ambiguities','reviewState','decisionAuthority','qualification'])||x.version!==VERSION||x.decisionAuthority!=='NONE'||x.reviewState!=='REQUIRED'||!HASH.test(x.contractDigest)||!HASH.test(x.semanticPreviewDigest))fail('ROOT');
 if(!keys(x.originalQuestion,['text','digest'])||typeof x.originalQuestion.text!=='string'||!HASH.test(x.originalQuestion.digest)||await casePin(x.originalQuestion.text)!==x.originalQuestion.digest)fail('QUESTION');
 if(!Array.isArray(x.sources)||!Array.isArray(x.bindings)||!Array.isArray(x.candidates)||!Array.isArray(x.unresolved)||!Array.isArray(x.ambiguities))fail('ARRAYS');
 const sourceIds=new Set();for(const s of x.sources){if(!keys(s,['id','digest','lineage'])||sourceIds.has(s.id)||!HASH.test(s.digest))fail('SOURCE');sourceIds.add(s.id);}
 const bindingIds=new Set();for(const b of x.bindings){if(!keys(b,['id','sourceId','span','type'])||bindingIds.has(b.id)||!sourceIds.has(b.sourceId))fail('BINDING');bindingIds.add(b.id);}
 const candidateIds=new Set();for(const c of x.candidates){
  if(!keys(c,['id','meaning','mode','status','expression','relationship','obligations','decisionAuthority'])||candidateIds.has(c.id)||c.decisionAuthority!=='NONE')fail('CANDIDATE');candidateIds.add(c.id);validateObligations(c.obligations);
  if(!keys(c.relationship,['mode','operator','negated','denominatorBinding','baselineBinding','roles','declaredTypes'])||c.relationship.mode!==c.mode||typeof c.relationship.negated!=='boolean')fail('RELATIONSHIP');
  for(const id of Object.values(c.relationship.roles))if(!bindingIds.has(id))fail('ROLE_BINDING');
  for(const id of Object.keys(c.relationship.declaredTypes))if(!bindingIds.has(id))fail('TYPE_BINDING');
 }
 return freeze(x);
}
