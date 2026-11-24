import {createHash} from 'node:crypto';

const caseId=/^H\d{3}$/;
const iso=value=>typeof value==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value));
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const exactKeys=(object,allowed,required=allowed)=>plain(object)&&Object.keys(object).every(key=>allowed.includes(key))&&required.every(key=>Object.hasOwn(object,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':
 plain(value)?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':
 JSON.stringify(value);
const hash=value=>createHash('sha256').update(canonical(value)).digest('hex');
const deepFreeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const key of Object.keys(value))deepFreeze(value[key]);
  Object.freeze(value);
 }
 return value;
};

export function validateEvaluationSet(set){
 const errors=[],fail=(code,path)=>errors.push({code,path});
 if(!exactKeys(set,['schema','version','status','purpose','cases']))return {valid:false,errors:[{code:'SET_SHAPE',path:''}]};
 if(set.schema!==1)fail('SET_SCHEMA','schema');
 if(typeof set.version!=='string'||!/^heldout-v\d+$/.test(set.version))fail('SET_VERSION','version');
 if(set.status!=='draft')fail('SET_STATUS','status');
 if(typeof set.purpose!=='string'||!set.purpose.includes('held-out')||set.purpose.length>300)fail('SET_PURPOSE','purpose');
 if(!Array.isArray(set.cases)||set.cases.length!==40){fail('CASE_COUNT','cases');return {valid:false,errors};}
 const seen=new Set(),counts={answerable:0,unanswerable:0,conflict:0};
 for(let index=0;index<set.cases.length;index++){
  const item=set.cases[index],path='cases['+index+']';
  if(!exactKeys(item,['id','kind','prompt','expected'])){fail('CASE_SHAPE',path);continue;}
  if(typeof item.id!=='string'||!caseId.test(item.id)||seen.has(item.id))fail('CASE_ID',path+'.id');else seen.add(item.id);
  if(!Object.hasOwn(counts,item.kind))fail('CASE_KIND',path+'.kind');else counts[item.kind]++;
  if(typeof item.prompt!=='string'||!item.prompt.trim()||item.prompt.length>1200)fail('CASE_PROMPT',path+'.prompt');
  const expected=item.expected;
  if(!plain(expected)||!['source_backed_unverified','abstain'].includes(expected.disposition)){fail('EXPECTED_SHAPE',path+'.expected');continue;}
  if(item.kind==='answerable'){
   if(expected.disposition!=='source_backed_unverified'||!Array.isArray(expected.cueRefs)||!expected.cueRefs.length||expected.cueRefs.length>5)fail('ANSWERABLE_EXPECTED',path+'.expected');
   else for(const [j,ref] of expected.cueRefs.entries()){
    if(!exactKeys(ref,['sourceId','cueId'])||typeof ref.sourceId!=='string'||!ref.sourceId||typeof ref.cueId!=='string'||!ref.cueId)fail('CUE_REF',path+'.expected.cueRefs['+j+']');
   }
  }else if(item.kind==='unanswerable'){
   if(expected.disposition!=='abstain'||Object.hasOwn(expected,'cueRefs')||Object.hasOwn(expected,'sourceRefs'))fail('UNANSWERABLE_EXPECTED',path+'.expected');
  }else if(item.kind==='conflict'){
   if(expected.disposition!=='abstain'||!Array.isArray(expected.sourceRefs)||expected.sourceRefs.length<2||expected.sourceRefs.length>5||expected.sourceRefs.some(x=>typeof x!=='string'||!x))fail('CONFLICT_EXPECTED',path+'.expected');
  }
 }
 if(counts.answerable!==20||counts.unanswerable!==10||counts.conflict!==10)fail('CASE_DISTRIBUTION','cases');
 return {valid:errors.length===0,errors,counts};
}

export function createBlindReviewPacket(set,{orderSeed}={}){
 const checked=validateEvaluationSet(set);if(!checked.valid)throw Error('Invalid held-out candidate: '+checked.errors[0].code);
 if(typeof orderSeed!=='string'||orderSeed.length<16||orderSeed.length>128)throw Error('A recorded 16-128 character blind-order seed is required.');
 const cases=set.cases.map(item=>({id:item.id,prompt:item.prompt,sort:hash(orderSeed+'\u0000'+item.id)})).sort((a,b)=>a.sort.localeCompare(b.sort)||a.id.localeCompare(b.id));
 return deepFreeze({schema:1,setVersion:set.version,packetHash:hash({version:set.version,orderSeed,cases:cases.map(({id,prompt})=>({id,prompt}))}),
  purpose:'Blind human review packet. Case kind, expected disposition and source/cue references are intentionally withheld.',
  cases:cases.map(({id,prompt})=>({id,prompt}))});
}

export function freezeReviewedSet(set,attestation){
 const checked=validateEvaluationSet(set);if(!checked.valid)throw Error('Invalid held-out candidate: '+checked.errors[0].code);
 if(!exactKeys(attestation,['schema','setVersion','reviewedCaseIds','reviewedAt','reviewerCount','statement']))throw Error('Invalid review attestation shape.');
 if(attestation.schema!==1||attestation.setVersion!==set.version||!iso(attestation.reviewedAt)||!Number.isInteger(attestation.reviewerCount)||attestation.reviewerCount<1||attestation.reviewerCount>20)throw Error('Invalid review attestation.');
 if(attestation.statement!=='Human reviewers checked every expected outcome against the designated source material before freeze.')throw Error('Required attestation statement missing.');
 if(!Array.isArray(attestation.reviewedCaseIds)||attestation.reviewedCaseIds.length!==40||new Set(attestation.reviewedCaseIds).size!==40)throw Error('Attestation must cover all cases exactly once.');
 const expectedIds=new Set(set.cases.map(item=>item.id));
 for(const id of attestation.reviewedCaseIds)if(!expectedIds.has(id))throw Error('Attestation contains an unknown case.');
 const frozen=clone(set);frozen.status='frozen';deepFreeze(frozen);
 const setHash=hash(frozen);
 return deepFreeze({schema:1,version:set.version,status:'frozen',setHash,counts:checked.counts,reviewedAt:attestation.reviewedAt,reviewerCount:attestation.reviewerCount,
  attestationStatement:attestation.statement,caseIds:frozen.cases.map(item=>item.id),frozenSet:frozen,
  limitation:'This tool validates attestation structure and complete case coverage; it cannot prove reviewer identity, independence or review quality.'});
}

export function createCorrectionRecord({parentSetHash,parentVersion,newVersion,changedCaseIds,reason,recordedAt}){
 const parentNumber=/^heldout-v(\d+)$/.exec(parentVersion)?.[1],newNumber=/^heldout-v(\d+)$/.exec(newVersion)?.[1];
 if(typeof parentSetHash!=='string'||!/^[a-f0-9]{64}$/.test(parentSetHash)||!parentNumber||!newNumber||Number(newNumber)<=Number(parentNumber)||
  !Array.isArray(changedCaseIds)||!changedCaseIds.length||changedCaseIds.length>40||new Set(changedCaseIds).size!==changedCaseIds.length||
  changedCaseIds.some(id=>typeof id!=='string'||!caseId.test(id))||typeof reason!=='string'||reason.trim().length<20||reason.length>800||!iso(recordedAt))throw Error('Invalid correction record.');
 return deepFreeze({schema:1,parentSetHash,parentVersion,newVersion,changedCaseIds:[...changedCaseIds],reason:reason.trim(),recordedAt,
  policy:'Create a new version; never rewrite or delete the prior frozen set or its scored failures.'});
}

export function validateRunRecord(record,frozenManifest){
 if(!plain(record)||record.schema!==1||record.setHash!==frozenManifest.setHash||record.setVersion!==frozenManifest.version||!iso(record.observedAt)||!Array.isArray(record.rows))throw Error('Invalid evaluation run record.');
 if(record.rows.length!==40)throw Error('Every frozen case requires one retained row, including failures.');
 const expectedIds=new Set(frozenManifest.caseIds),seen=new Set();
 for(const row of record.rows){
  if(!exactKeys(row,['caseId','outcome','detail'])||!expectedIds.has(row.caseId)||seen.has(row.caseId)||!['pass','fail','error'].includes(row.outcome)||
   typeof row.detail!=='string'||!row.detail.trim()||row.detail.length>1000)throw Error('Invalid or missing run row.');
  seen.add(row.caseId);
 }
 return deepFreeze({valid:true,total:40,passed:record.rows.filter(row=>row.outcome==='pass').length,failed:record.rows.filter(row=>row.outcome==='fail').length,errors:record.rows.filter(row=>row.outcome==='error').length});
}
