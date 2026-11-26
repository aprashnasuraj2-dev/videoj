import {createHash} from 'node:crypto';
const SHA40=/^[a-f0-9]{40}$/i,SHA256=/^[a-f0-9]{64}$/,RID=/^R\d{2}$/,DID=/^D\d{2}$/,ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const STATUS=new Set(['pass','fail','blocked']),STEPS=['findSource','compareEvidence','saveReview','consentBoundary'];
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys)=>plain(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':plain(v)?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const sha=v=>createHash('sha256').update(canonical(v)).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function validateReviewerFeedback(input){
 const top=['schema','reviewerId','deviceId','sourceRevision','deviceRecordHash','observedAt','steps','overall','notes'];
 if(!exact(input,top)||input.schema!==1||!RID.test(input.reviewerId)||!DID.test(input.deviceId)||!SHA40.test(input.sourceRevision)||!SHA256.test(input.deviceRecordHash)||!ISO.test(input.observedAt)||!Number.isFinite(Date.parse(input.observedAt))||!exact(input.steps,STEPS)||!['accept','reject','blocked'].includes(input.overall)||typeof input.notes!=='string'||input.notes.length>1500)throw Error('Invalid reviewer feedback.');
 const steps={};for(const key of STEPS){const row=input.steps[key];if(!exact(row,['status','detail'])||!STATUS.has(row.status)||typeof row.detail!=='string'||row.detail.length>500||(row.status!=='pass'&&!row.detail.trim()))throw Error('Invalid reviewer step: '+key);steps[key]={...row};}
 const failures=STEPS.filter(key=>steps[key].status!=='pass');
 if(input.overall==='accept'&&failures.length)throw Error('Acceptance cannot hide failed or blocked steps.');
 if(input.overall==='blocked'&&!STEPS.some(key=>steps[key].status==='blocked'))throw Error('Blocked overall result requires a blocked step.');
 const normalized={schema:1,reviewerId:input.reviewerId,deviceId:input.deviceId,sourceRevision:input.sourceRevision,deviceRecordHash:input.deviceRecordHash,observedAt:input.observedAt,steps,overall:input.overall,notes:input.notes};
 return freeze({...normalized,failures:Object.freeze(failures),recordHash:sha(normalized),limitation:'This validates a neutral reviewer record only; it cannot prove reviewer identity, physical execution or factual correctness.'});
}
