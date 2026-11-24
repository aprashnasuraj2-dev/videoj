import {createHash} from 'node:crypto';
const id=/^[A-Z][A-Z0-9_-]{1,31}$/;
const iso=v=>typeof v==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exactKeys=(o,allowed,required=allowed)=>plain(o)&&Object.keys(o).every(k=>allowed.includes(k))&&required.every(k=>Object.hasOwn(o,k));
const clone=v=>JSON.parse(JSON.stringify(v));
const canonical=v=>JSON.stringify(v,Object.keys(v).sort());
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

export function validateEvaluationSet(set){
 const errors=[],fail=(code,path)=>errors.push({code,path});
 if(!exactKeys(set,['schema','version','status','purpose','cases'],['schema','version','status','purpose','cases']))return {valid:false,errors:[{code:'SET_SHAPE',path:''}]};
 if(set.schema!==1)fail('SET_SCHEMA','schema');
 if(typeof set.version!=='string'||!/^heldout-v\d+$/.test(set.version))fail('SET_VERSION','version');
 if(set.status!=='draft')fail('SET_STATUS','status');
 if(typeof set.purpose!=='string'||!set.purpose.includes('held-out')||set.purpose.length>300)fail('SET_PURPOSE','purpose');
 if(!Array.isArray(set.cases)||set.cases.length!==40){fail('CASE_COUNT','cases');return {valid:false,errors};}
 const seen=new Set(),counts={answerable:0,unanswerable:0,conflict:0};
 for(let i=0;i<set.cases.length;i++){
  const c=set.cases[i],path='cases['+i+']';
  if(!exactKeys(c,['id','kind','prompt','expected'],['id','kind','prompt','expected'])){fail('CASE_SHAPE',path);continue;}
  if(typeof c.id!=='string'||!id.test(c.id)||seen.has(c.id))fail('CASE_ID',path+'.id');else seen.add(c.id);
  if(!Object.hasOwn(counts,c.kind))fail('CASE_KIND',path+'.kind');else counts[c.kind]++;
  if(typeof c.prompt!=='string'||!c.prompt.trim()||c.prompt.length>1200)fail('CASE_PROMPT',path+'.prompt');
  const e=c.expected;
  if(!plain(e)||!['source_backed_unverified','abstain'].includes(e.disposition)){fail('EXPECTED_SHAPE',path+'.expected');continue;}
  if(c.kind==='answerable'){
   if(e.disposition!=='source_backed_unverified'||!Array.isArray(e.cueRefs)||!e.cueRefs.length||e.cueRefs.length>5)fail('ANSWERABLE_EXPECTED',path+'.expected');
   else for(const [j,r] of e.cueRefs.entries())if(!exactKeys(r,['sourceId','cueId'],['sourceId','cueId'])||typeof r.sourceId!=='string'||!r.sourceId||typeof r.cueId!=='string'||!r.cueId)fail('CUE_REF',path+'.expected.cueRefs['+j+']');
  }else if(c.kind==='unanswerable'){
   if(e.disposition!=='abstain'||Object.hasOwn(e,'cueRefs')||Object.hasOwn(e,'sourceRefs'))fail('UNANSWERABLE_EXPECTED',path+'.expected');
  }else if(c.kind==='conflict'){
   if(e.disposition!=='abstain'||!Array.isArray(e.sourceRefs)||e.sourceRefs.length<2||e.sourceRefs.length>5||e.sourceRefs.some(x=>typeof x!=='string'||!x))fail('CONFLICT_EXPECTED',path+'.expected');
  }
 }
 if(counts.answerable!==20||counts.unanswerable!==10||counts.conflict!==10)fail('CASE_DISTRIBUTION','cases');
 return {valid:errors.length===0,errors,counts};
}
export function createBlindReviewPacket(set){
 const checked=validateEvaluationSet(set);if(!checked.valid)throw Error('Invalid held-out candidate: '+checked.errors[0].code);
 return Object.freeze({schema:1,setVersion:set.version,purpose:'Blind human review packet. Expected answers intentionally withheld.',cases:Object.freeze(set.cases.map(c=>Object.freeze({id:c.id,kind:c.kind,prompt:c.prompt})))});
}
export function freezeReviewedSet(set,attestation){
 const checked=validateEvaluationSet(set);if(!checked.valid)throw Error('Invalid held-out candidate: '+checked.errors[0].code);
 if(!exactKeys(attestation,['schema','setVersion','reviewedCaseIds','reviewedAt','reviewerCount','statement']))throw Error('Invalid review attestation shape.');
 if(attestation.schema!==1||attestation.setVersion!==set.version||!iso(attestation.reviewedAt)||!Number.isInteger(attestation.reviewerCount)||attestation.reviewerCount<1||attestation.reviewerCount>20)throw Error('Invalid review attestation.');
 if(attestation.statement!=='Human reviewers checked every expected outcome against the designated source material before freeze.')throw Error('Required attestation statement missing.');
 if(!Array.isArray(attestation.reviewedCaseIds)||attestation.reviewedCaseIds.length!==40||new Set(attestation.reviewedCaseIds).size!==40)throw Error('Attestation must cover all cases exactly once.');
 const expected=new Set(set.cases.map(c=>c.id));for(const caseId of attestation.reviewedCaseIds)if(!expected.has(caseId))throw Error('Attestation contains an unknown case.');
 const frozen=clone(set);frozen.status='frozen';
 const setHash=hash(frozen);
 return Object.freeze({schema:1,version:set.version,status:'frozen',setHash,counts:checked.counts,reviewedAt:attestation.reviewedAt,reviewerCount:attestation.reviewerCount,
  attestationStatement:attestation.statement,caseIds:Object.freeze(frozen.cases.map(c=>c.id)),frozenSet:Object.freeze(frozen),
  limitation:'This tool validates attestation structure and complete case coverage; it cannot prove reviewer identity, independence or review quality.'});
}
export function createCorrectionRecord({parentSetHash,parentVersion,newVersion,changedCaseIds,reason,recordedAt}){
 if(typeof parentSetHash!=='string'||!/^[a-f0-9]{64}$/.test(parentSetHash)||typeof parentVersion!=='string'||!/^heldout-v\d+$/.test(parentVersion)||
  typeof newVersion!=='string'||!/^heldout-v\d+$/.test(newVersion)||newVersion===parentVersion||!Array.isArray(changedCaseIds)||!changedCaseIds.length||
  changedCaseIds.length>40||new Set(changedCaseIds).size!==changedCaseIds.length||changedCaseIds.some(x=>typeof x!=='string'||!id.test(x))||
  typeof reason!=='string'||reason.trim().length<20||reason.length>800||!iso(recordedAt))throw Error('Invalid correction record.');
 return Object.freeze({schema:1,parentSetHash,parentVersion,newVersion,changedCaseIds:Object.freeze([...changedCaseIds]),reason:reason.trim(),recordedAt,
  policy:'Create a new version; never rewrite or delete the prior frozen set or its scored failures.'});
}
export function validateRunRecord(record,frozenManifest){
 if(!plain(record)||record.schema!==1||record.setHash!==frozenManifest.setHash||record.setVersion!==frozenManifest.version||!iso(record.observedAt)||!Array.isArray(record.rows))throw Error('Invalid evaluation run record.');
 if(record.rows.length!==40)throw Error('Every frozen case requires one retained row, including failures.');
 const expected=new Set(frozenManifest.caseIds),seen=new Set();
 for(const row of record.rows){
  if(!exactKeys(row,['caseId','outcome','detail'],['caseId','outcome','detail'])||!expected.has(row.caseId)||seen.has(row.caseId)||!['pass','fail','error'].includes(row.outcome)||typeof row.detail!=='string'||row.detail.length>1000)throw Error('Invalid or missing run row.');
  seen.add(row.caseId);
 }
 return Object.freeze({valid:true,total:40,passed:record.rows.filter(r=>r.outcome==='pass').length,failed:record.rows.filter(r=>r.outcome==='fail').length,errors:record.rows.filter(r=>r.outcome==='error').length});
}
