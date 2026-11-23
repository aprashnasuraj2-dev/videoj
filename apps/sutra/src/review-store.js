import {validateReceipt} from '../../../packages/sutra-evidence/index.js';
const KEY='sutra.synthetic-review-cards.v1';
const clone=value=>JSON.parse(JSON.stringify(value));
export class ReviewOutcomeError extends Error{constructor(outcome){super('Local persistence could not be confirmed.');this.outcome=outcome;}}
export function createReviewStore({storage,sources,idFactory=()=>crypto.randomUUID()}){
 const catalog=clone(sources),pending=new Map(),completed=new Map();
 function list(){
  const raw=storage.getItem(KEY);if(raw===null)return [];
  if(typeof raw!=='string'||raw.length>65536)throw Error('Local review data is unavailable or too large.');
  let records;try{records=JSON.parse(raw);}catch{throw Error('Local review data is unreadable.');}
  if(!Array.isArray(records)||records.length>10||records.some(r=>!r||typeof r.id!=='string'||r.id.length>100||r.synthetic!==true||!validateReceipt(r.receipt,{sources:catalog}).valid))throw Error('Local review data no longer matches this fixture.');
  return records;
 }
 return {
  list,
  prepare(receipt){
   if(!validateReceipt(receipt,{sources:catalog}).valid)throw Error('Receipt does not match the approved source catalog.');
   if(pending.size>=4)throw Error('Close existing review previews first.');
   const id=idFactory();if(typeof id!=='string'||!id||id.length>100||pending.has(id)||completed.has(id))throw Error('Review identifier unavailable.');
   const payload=clone(receipt);pending.set(id,payload);
   return Object.freeze({id,receipt:Object.freeze(clone(payload)),destination:'This browser only',synthetic:true});
  },
  cancel(id){pending.delete(id);},
  commit(id){
   if(completed.has(id))return clone(completed.get(id));
   if(!pending.has(id))throw Error('Review preview expired or was cancelled.');
   const receipt=pending.get(id);pending.delete(id); // Consume proposal before persistence; never automatically retry.
   if(!validateReceipt(receipt,{sources:catalog}).valid)throw Error('Source changed before confirmation.');
   const records=list();if(records.length>=10)throw Error('Ten fixture reviews are already saved. Delete one before saving again.');
   const record={id,receipt,synthetic:true,savedAt:new Date().toISOString()};
   const encoded=JSON.stringify([...records,record]);if(encoded.length>65536)throw Error('Local review data exceeds its limit.');
   try{storage.setItem(KEY,encoded);}catch(error){throw new ReviewOutcomeError(['QuotaExceededError','SecurityError'].includes(error?.name)?'rejected':'unknown');} // Never infer success from an attempted write.
   completed.set(id,record);while(completed.size>20)completed.delete(completed.keys().next().value);
   return clone(record);
  },
  remove(id){const records=list();const next=records.filter(record=>record.id!==id);if(records.length!==next.length)storage.setItem(KEY,JSON.stringify(next));},
 };
}
