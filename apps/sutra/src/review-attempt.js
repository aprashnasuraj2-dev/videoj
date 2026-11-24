import {validateReceipt} from '../../../packages/sutra-evidence/index.js';

const outcomes=new Set(['completed','rejected','unknown']);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
 (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const data=(object,key)=>{
 const descriptor=Object.getOwnPropertyDescriptor(object,key);
 if(!descriptor||!Object.hasOwn(descriptor,'value'))throw Error('Outcome receipt requires plain data fields.');
 return descriptor.value;
};
export function createReviewAttemptReceipt(attempt,{sources}={}){
 if(!plain(attempt))throw Error('Review attempt unavailable.');
 const requestId=data(attempt,'requestId'),receipt=data(attempt,'receipt'),outcome=data(attempt,'outcome'),observedAt=data(attempt,'observedAt');
 if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(requestId)||
  !plain(receipt)||!outcomes.has(outcome)||typeof observedAt!=='string'||observedAt.length>40||Number.isNaN(Date.parse(observedAt)))throw Error('Review attempt is malformed.');
 if(!validateReceipt(receipt,{sources}).valid)throw Error('Review attempt source receipt is stale or invalid.');
 return Object.freeze({
  reportVersion:1,type:'sutra-local-review-attempt',requestId,outcome,observedAt,
  retryPolicy:'never automatically retry an unknown or rejected local write',
  outcomeMeaning:outcome==='completed'?'Local storage write and exact readback were observed.':
   outcome==='rejected'?'The write was rejected before success was observed.':
   'The write may have happened before an exception; inspect current local records before any new action.',
  truthStatus:'unverified',synthetic:true,
  receipt:Object.freeze(structuredClone(receipt))
 });
}
export const serializeReviewAttemptReceipt=(attempt,options)=>JSON.stringify(createReviewAttemptReceipt(attempt,options),null,2)+'\n';
