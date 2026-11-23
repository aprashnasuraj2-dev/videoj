import {validateReceipt} from '../../../packages/sutra-evidence/index.js';

const fields=['version','sourceId','sourceVersion','sourceHash','mediaHash','cueId','start','end','excerpt','retrievedAt','verification'];
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
 (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
function dataField(object,key){
 const descriptor=Object.getOwnPropertyDescriptor(object,key);
 if(!descriptor||!Object.hasOwn(descriptor,'value'))throw Error('Untrusted review data field.');
 return descriptor.value;
}
export function createReviewExport(record,{sources}={}){
 if(!plain(record))throw Error('Not a supported synthetic saved review.');
 const receiptData=dataField(record,'receipt'),synthetic=dataField(record,'synthetic');
 if(!plain(receiptData)||synthetic!==true)throw Error('Not a supported synthetic saved review.');
 const id=dataField(record,'id'),savedAt=dataField(record,'savedAt');
 if(typeof id!=='string'||! /^[A-Za-z0-9_-]{1,100}$/.test(id)||
  typeof savedAt!=='string'||savedAt.length>40||Number.isNaN(Date.parse(savedAt)))throw Error('Saved review identity or date is invalid.');
 const receipt={};
 for(const key of fields)receipt[key]=dataField(receiptData,key);
 if(!validateReceipt(receipt,{sources}).valid)throw Error('Saved review no longer matches the provided source catalog.');
 return Object.freeze({
  reportVersion:1,type:'sutra-local-review-export',id,
  savedAt,synthetic:true,truthStatus:'unverified',
  warning:'Local source-catalog consistency is not factual verification or proof of a real original lesson.',
  receipt:Object.freeze(receipt)
 });
}
export const serializeReviewExport=(record,options)=>JSON.stringify(createReviewExport(record,options),null,2)+'\n';
