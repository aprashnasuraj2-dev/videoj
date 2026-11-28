// Controlled semantic reconstruction with explicit drift classes.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {verifySemanticIntentIR} from './semantic-intent-ir.js';

export const VERSION='sutra-controlled-intent/v1';
export const DRIFT_CLASSES=Object.freeze(['SCOPE_DRIFT','DEFINITION_DRIFT','NEGATION_DRIFT','DENOMINATOR_DRIFT','INVENTED_RELATION_DRIFT','UNIT_DRIFT','QUESTION_DRIFT']);
const fail=x=>{throw TypeError('CONTROLLED_INTENT_'+x);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const canonical=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(canonical).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
const line=(tag,value)=>tag+'\t'+JSON.stringify(value);
export async function renderControlledIntent(intentText,intentPin){
 const x=await verifySemanticIntentIR(intentText,intentPin),rows=['SUTRA_CONTROLLED_INTENT_V1',line('QUESTION',x.originalQuestion)];
 for(const c of x.candidates.slice().sort((a,b)=>a.id.localeCompare(b.id))){
  rows.push(line('CANDIDATE',{id:c.id,mode:c.mode,status:c.status,meaning:c.meaning}));
  rows.push(line('RELATION',{id:c.id,...c.relationship}));
  rows.push(line('OBLIGATIONS',{id:c.id,obligations:c.obligations}));
  rows.push('END\t'+c.id);
 }
 const controlledText=rows.join('\n')+'\n',controlledPin=await casePin(controlledText);
 return freeze({version:VERSION,intentDigest:intentPin,controlledText,controlledPin,decisionAuthority:'NONE',
  qualification:'Deterministic controlled reconstruction of the intent record. Round-trip consistency does not establish a unique meaning for unrestricted language.'});
}
export async function parseControlledIntent(controlledText,controlledPin){
 if(typeof controlledPin!=='string'||await casePin(controlledText)!==controlledPin)fail('PIN');
 const rows=controlledText.split('\n');if(rows.pop()!==''||rows.shift()!=='SUTRA_CONTROLLED_INTENT_V1')fail('HEADER');
 let question=null,current=null;const candidates=[];
 for(const row of rows){
  const tab=row.indexOf('\t');if(tab<1)fail('LINE');const tag=row.slice(0,tab),raw=row.slice(tab+1);
  if(tag==='QUESTION'){if(question)fail('QUESTION_DUP');question=parseUniqueJson(raw,{maxChars:8192,maxDepth:4});continue;}
  if(tag==='CANDIDATE'){if(current)fail('NESTING');const value=parseUniqueJson(raw,{maxChars:8192,maxDepth:5});current={...value,relationship:null,obligations:null};continue;}
  if(tag==='RELATION'){if(!current||current.relationship)fail('RELATION');const value=parseUniqueJson(raw,{maxChars:32768,maxDepth:8});if(value.id!==current.id)fail('RELATION_ID');delete value.id;current.relationship=value;continue;}
  if(tag==='OBLIGATIONS'){if(!current||current.obligations)fail('OBLIGATIONS');const value=parseUniqueJson(raw,{maxChars:32768,maxDepth:8});if(value.id!==current.id)fail('OBLIGATION_ID');current.obligations=value.obligations;continue;}
  if(tag==='END'){if(!current||raw!==current.id||!current.relationship||!current.obligations)fail('END');candidates.push(current);current=null;continue;}
  fail('TAG');
 }
 if(current||!question)fail('INCOMPLETE');
 return freeze({version:VERSION,question,candidates});
}
function push(drifts,candidateId,kind,before,after){drifts.push({candidateId,kind,before,after});}
export async function detectControlledIntentDrift(intentText,intentPin,controlledText,controlledPin){
 const baseline=await verifySemanticIntentIR(intentText,intentPin),round=await parseControlledIntent(controlledText,controlledPin),drifts=[];
 if(canonical(round.question)!==canonical(baseline.originalQuestion))push(drifts,null,'QUESTION_DRIFT',baseline.originalQuestion,round.question);
 const byId=new Map(round.candidates.map(c=>[c.id,c]));
 for(const b of baseline.candidates){
  const a=byId.get(b.id);if(!a){push(drifts,b.id,'INVENTED_RELATION_DRIFT',b.id,null);continue;}
  if(a.mode!==b.mode)push(drifts,b.id,'DEFINITION_DRIFT',b.mode,a.mode);
  if(a.relationship.negated!==b.relationship.negated)push(drifts,b.id,'NEGATION_DRIFT',b.relationship.negated,a.relationship.negated);
  if(a.relationship.denominatorBinding!==b.relationship.denominatorBinding)push(drifts,b.id,'DENOMINATOR_DRIFT',b.relationship.denominatorBinding,a.relationship.denominatorBinding);
  if(a.relationship.operator!==b.relationship.operator||canonical(a.relationship.roles)!==canonical(b.relationship.roles))push(drifts,b.id,'INVENTED_RELATION_DRIFT',{operator:b.relationship.operator,roles:b.relationship.roles},{operator:a.relationship.operator,roles:a.relationship.roles});
  const ids=new Set([...Object.keys(b.relationship.declaredTypes),...Object.keys(a.relationship.declaredTypes??{})]);
  for(const id of ids){
   const bt=b.relationship.declaredTypes[id],at=a.relationship.declaredTypes?.[id];
   if(!bt||!at){push(drifts,b.id,'INVENTED_RELATION_DRIFT',bt??null,at??null);continue;}
   if(bt.scope!==at.scope)push(drifts,b.id,'SCOPE_DRIFT',bt.scope,at.scope);
   if(bt.kind!==at.kind)push(drifts,b.id,'DEFINITION_DRIFT',bt.kind,at.kind);
   if(bt.unit!==at.unit)push(drifts,b.id,'UNIT_DRIFT',bt.unit,at.unit);
  }
 }
 for(const a of round.candidates)if(!baseline.candidates.some(b=>b.id===a.id))push(drifts,a.id,'INVENTED_RELATION_DRIFT',null,a.id);
 const classes=[...new Set(drifts.map(d=>d.kind))].sort();
 return freeze({version:VERSION,intentDigest:intentPin,controlledDigest:controlledPin,status:drifts.length?'DRIFT_DETECTED':'ROUNDTRIP_CLEAN',classes,drifts,decisionAuthority:'NONE'});
}
export async function verifyControlledIntentRoundtrip(intentText,intentPin){
 const rendered=await renderControlledIntent(intentText,intentPin);
 return detectControlledIntentDrift(intentText,intentPin,rendered.controlledText,rendered.controlledPin);
}
