import {ActionRegistry} from '../../../packages/sutra-runtime/vendor/nsdeploy/actions.js';
import {validateReceipt} from '../../../packages/sutra-evidence/index.js';

const receiptSchema={
 type:'object',
 properties:{
  version:{type:'integer',minimum:1,maximum:1},
  sourceId:{type:'string',minLength:1,maxLength:128},
  sourceVersion:{type:'string',minLength:1,maxLength:128},
  mediaHash:{type:'string',minLength:64,maxLength:64},
  sourceHash:{type:'string',minLength:64,maxLength:64},
  cueId:{type:'string',minLength:1,maxLength:128},
  start:{type:'number',minimum:0},
  end:{type:'number',minimum:0},
  excerpt:{type:'string',minLength:1,maxLength:4000},
  retrievedAt:{type:'string',minLength:20,maxLength:64},
  verification:{type:'string',enum:['unverified']}
 },
 required:['version','sourceId','sourceVersion','mediaHash','sourceHash','cueId','start','end','excerpt','retrievedAt','verification'],
 additionalProperties:false
};
const actionInput={type:'object',properties:{receipt:receiptSchema},required:['receipt'],additionalProperties:false};
const saveOutput={type:'object',properties:{outcome:{type:'string',enum:['succeeded','rejected']},recordId:{type:'string',minLength:1,maxLength:100}},required:['outcome','recordId'],additionalProperties:false};
const exportOutput={type:'object',properties:{outcome:{type:'string',enum:['succeeded']},filename:{type:'string',minLength:1,maxLength:160}},required:['outcome','filename'],additionalProperties:false};
const clone=value=>JSON.parse(JSON.stringify(value));
function deepFreeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}return value;}

export function createReviewActions({store,sources,exporter,baseOrigin,network='learner'}={}){
 if(!store||typeof store.prepare!=='function'||typeof store.commit!=='function')throw new TypeError('Review store is required.');
 if(!Array.isArray(sources)||!sources.length)throw new TypeError('Source catalog is required.');
 if(typeof exporter!=='function')throw new TypeError('Receipt exporter is required.');
 const origin=new URL(baseOrigin);if(origin.origin!==baseOrigin||origin.pathname!=='/'||origin.search||origin.hash)throw new TypeError('Exact base origin is required.');
 const registry=new ActionRegistry(),scope={base:origin.origin,network};
 const saveRef=registry.register(scope,{
  name:'save-review-card',description:'Save the reviewed evidence receipt in this browser only.',inputSchema:actionInput,outputSchema:saveOutput,effect:'write',availability:'local-only',callerOrigins:[origin.origin],timeoutMs:5000
 },async({receipt})=>{
  if(!validateReceipt(receipt,{sources}).valid)throw new Error('Reviewed receipt no longer matches the approved source catalog.');
  const proposal=store.prepare(receipt);
  try{
   const record=store.commit(proposal.id);
   return {outcome:'succeeded',recordId:record.id};
  }catch(error){
   if(error?.outcome==='rejected')return {outcome:'rejected',recordId:proposal.id};
   throw error;
  }
 });
 const exportRef=registry.register(scope,{
  name:'export-receipt',description:'Download the reviewed evidence receipt as a local JSON file.',inputSchema:actionInput,outputSchema:exportOutput,effect:'write',availability:'local-only',callerOrigins:[origin.origin],timeoutMs:5000
 },async({receipt},{requestId})=>{
  if(!validateReceipt(receipt,{sources}).valid)throw new Error('Reviewed receipt no longer matches the approved source catalog.');
  const filename=await exporter(clone(receipt),{requestId});
  if(typeof filename!=='string'||!filename||filename.length>160)throw new Error('Receipt export outcome is unknown.');
  return {outcome:'succeeded',filename};
 });
 const prepare=(ref,receipt)=>{
  if(!validateReceipt(receipt,{sources}).valid)throw new Error('Receipt does not match the approved source catalog.');
  const plan=registry.prepare({kind:'action',action:ref,arguments:{receipt:clone(receipt)}});
  return deepFreeze(plan);
 };
 const preview=plan=>deepFreeze(plan.map(({entry,args})=>({action:entry.name,description:entry.description,origin:new URL(entry.base).origin,effect:entry.effect,arguments:clone(args)})));
 return Object.freeze({
  registry,saveRef,exportRef,
  catalog:()=>registry.catalog(scope),preview,
  prepareSave:receipt=>prepare(saveRef,receipt),
  prepareExport:receipt=>prepare(exportRef,receipt),
  execute:(plan,confirm,invocationId)=>registry.execute(plan,confirm,invocationId)
 });
}
