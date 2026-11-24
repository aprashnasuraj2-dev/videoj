const EFFECTS=new Set(['read_local','write_local','download']);
const NAME=/^[a-z][a-z0-9_-]{0,63}$/;
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
 (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);

const MAX_ARGUMENT_BYTES=16384,MAX_PROPOSALS=4096;
const encoder=new TextEncoder();
function charge(budget,bytes){
 budget.remaining-=bytes;
 if(budget.remaining<0)throw new TypeError('Action arguments exceed 16 KiB.');
}
function chargeString(budget,value){
 // Bound before allocating an encoded or escaped copy of an oversized string.
 if(value.length>budget.remaining)throw new TypeError('Action arguments exceed 16 KiB.');
 charge(budget,encoder.encode(JSON.stringify(value)).length);
}
function cloneJsonData(value,budget,seen=new Set(),depth=0){
 if(value===null){charge(budget,4);return value;}
 if(typeof value==='string'){chargeString(budget,value);return value;}
 if(typeof value==='boolean'){charge(budget,value?4:5);return value;}
 if(typeof value==='number'){
  if(!Number.isFinite(value))throw new TypeError('Action arguments require finite JSON numbers.');
  charge(budget,JSON.stringify(value).length);return value;
 }
 if(typeof value!=='object'||depth>12||seen.has(value))throw new TypeError('Action arguments require bounded plain JSON data.');
 if(!Array.isArray(value)&&!plain(value))throw new TypeError('Action arguments require plain JSON objects.');
 seen.add(value);
 const array=Array.isArray(value);
 if(array&&(Object.getPrototypeOf(value)!==Array.prototype||value.length>256))throw new TypeError('Action arguments require bounded dense arrays.');
 const output=array?[]:{};
 const keys=Reflect.ownKeys(value);
 if(keys.length>256+(array?1:0))throw new TypeError('Action argument object is too large.');
 if(array&&keys.length!==value.length+1)throw new TypeError('Action arguments require bounded dense arrays.');
 charge(budget,2);let index=0;
 for(const key of keys){
  if(array&&key==='length')continue;
  if(array&&key!==String(index))throw new TypeError('Action arguments require bounded dense arrays.');
  if(index++)charge(budget,1);
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||
   !descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new TypeError('Executable action argument fields are not allowed.');
  if(!array){chargeString(budget,key);charge(budget,1);}
  output[key]=cloneJsonData(descriptor.value,budget,seen,depth+1);
 }
 seen.delete(value);
 return output;
}
function freezeDeep(value){
 if(value&&typeof value==='object'){
  for(const item of Object.values(value))freezeDeep(item);
  Object.freeze(value);
 }
 return value;
}
function boundedClone(value){
 return cloneJsonData(value,{remaining:MAX_ARGUMENT_BYTES});
}
export class LocalActionError extends Error{
 constructor(code,message){super(message);this.name='LocalActionError';this.code=code;}
}
export function createLocalActionRegistry(definitions,{idFactory=()=>globalThis.crypto?.randomUUID?.()}={}){
 if(!Array.isArray(definitions)||definitions.length<1||definitions.length>32)throw new TypeError('One to 32 local action definitions required.');
 const byName=new Map();
 for(const definition of definitions){
  if(!plain(definition)||!NAME.test(definition.name)||byName.has(definition.name)||
   !EFFECTS.has(definition.effect)||typeof definition.destination!=='string'||!definition.destination.trim()||definition.destination.length>160||
   typeof definition.description!=='string'||!definition.description.trim()||definition.description.length>300||
   typeof definition.validate!=='function'||typeof definition.execute!=='function')throw new TypeError('Invalid local action definition.');
  byName.set(definition.name,Object.freeze({...definition}));
 }
 const pending=new Map(),issued=new Set();
 const list=()=>[...byName.values()].map(definition=>Object.freeze({
  name:definition.name,effect:definition.effect,destination:definition.destination,description:definition.description
 }));
 return Object.freeze({
  list,
  prepare(name,args){
   const definition=byName.get(name);if(!definition)throw new LocalActionError('UNKNOWN_ACTION','Unknown local action.');
   if(pending.size>=8)throw new LocalActionError('PENDING_LIMIT','Too many unconfirmed local actions.');
   const snapshot=boundedClone(args);
   let accepted=false;try{accepted=definition.validate(snapshot)===true;}catch{}
   if(!accepted)throw new LocalActionError('ARGUMENTS','Local action arguments were rejected.');
   if(issued.size>=MAX_PROPOSALS)throw new LocalActionError('PROPOSAL_LIMIT','Local action session exhausted; reload before preparing another action.');
   const id=idFactory();
   if(typeof id!=='string'||! /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id)||issued.has(id))throw new LocalActionError('PROPOSAL_ID','Local action proposal identity unavailable.');
   const stored=freezeDeep(snapshot);issued.add(id);pending.set(id,{definition,args:stored});
   return freezeDeep({id,name:definition.name,effect:definition.effect,destination:definition.destination,
    description:definition.description,args:boundedClone(stored)});
  },
  cancel(id){return pending.delete(id);},
  async execute(id){
   const entry=pending.get(id);if(!entry)throw new LocalActionError('PROPOSAL_MISSING','Local action proposal is missing, cancelled or already consumed.');
   pending.delete(id); // Consume before side effect; ambiguous outcomes are never auto-replayed.
   return await entry.definition.execute(boundedClone(entry.args),Object.freeze({
    proposalId:id,name:entry.definition.name,effect:entry.definition.effect,destination:entry.definition.destination
   }));
  },
  pendingCount(){return pending.size;}
 });
}
