// Source-independent, browser-safe report of SUTRA execution. This intentionally
// does not copy raw TraceBus entries, requests, model messages or tool results.
// Public field labels come from the host. This is not a secret scanner.
const executionFields=['phase','kind','id','parent','status','agent','tool','network','origin'];
const contactFields=['at','type','origin','contactKind','purpose','network','decision','scope','source','status'];
const MAX_BYTES=65536,MAX_EVENTS=128,encoder=new TextEncoder();
const own=(value,key)=>{
 const property=value&&typeof value==='object'?Object.getOwnPropertyDescriptor(value,key):null;
 return property&&Object.hasOwn(property,'value')?property.value:undefined;
};
// Bound the scan before allocating a sanitized copy of a caller-sized string.
const safeText=(value,max=100)=>typeof value==='string'?
 value.slice(0,max).replace(/[\u0000-\u001f\u007f]/g,''):null;
const clampCount=(n,max)=>Number.isInteger(n)&&n>=0?Math.min(n,max):null;
const knownOutcome=new Set(['completed','denied','failed','cancelled','partial','unknown']);
const allowedMode=new Set(['scripted-test','provider']);
function safeObject(value,keys){
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const out={};
 for(const key of keys){
  const data=safeText(own(value,key),key==='purpose'?160:100);
  if(data!==null)out[key]=data;
 }
 return out;
}
// Inspect only a bounded prefix of ordinary own data elements. Do not invoke
// caller array methods, accessors, species constructors or serialization hooks.
function prefix(array,max,project){
 const length=array.length,values=[];let truncated=length>max;
 for(let i=0;i<Math.min(length,max);i++){
  const d=Object.getOwnPropertyDescriptor(array,String(i));
  if(!d||!Object.hasOwn(d,'value')){truncated=true;continue;}
  const value=project(d.value);
  if(value===null){truncated=true;continue;}
  values.push(value);
 }
 return {values,truncated};
}
const encoded=value=>JSON.stringify(value,null,2)+'\n';
export function createSafeTraceReceipt(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Trace report input must be a data record.');
 const get=(key,fallback)=>{const d=Object.getOwnPropertyDescriptor(input,key);if(!d)return fallback;if(!Object.hasOwn(d,'value'))throw Error('Trace report fields require own data.');return d.value===undefined?fallback:d.value;};
 const events=get('events',[]),contactEvents=get('contactEvents',[]),outcome=get('outcome','failed'),mode=get('mode','scripted-test'),modelCalls=get('modelCalls',0),agentCalls=get('agentCalls',0),reason=get('reason',null);
 if(!Array.isArray(events)||!Array.isArray(contactEvents))throw Error('Trace inputs must be arrays.');
 if(!knownOutcome.has(outcome)||!allowedMode.has(mode))throw Error('Unsupported trace report state.');
 const limitedEvents=prefix(events,MAX_EVENTS,item=>safeObject(item,executionFields));
 let disclosureTruncated=false;
 const limitedContacts=prefix(contactEvents,MAX_EVENTS,item=>{
  const filtered=safeObject(item,contactFields),labels=own(item,'disclosure');
  if(Array.isArray(labels)){
   const safe=prefix(labels,12,x=>safeText(x,80));
   filtered.disclosure=safe.values;disclosureTruncated||=safe.truncated;
  }
  return filtered;
 });
 const core={schemaVersion:1,reportType:'sutra-sanitized-execution',mode,outcome,
  modelCalls:clampCount(modelCalls,8),agentCalls:clampCount(agentCalls,12),
  reason:typeof reason==='string'&&reason.length<=80&&/^(?:MODEL_LIMIT|AGENT_LIMIT|REMOTE_LIMIT|OUTPUT_LIMIT|TIMEOUT|CANCELLED|INCOMPLETE|RUN_FAILED|STOPPED|PEER_[A-Z_]+|EXTERNAL_[A-Z_]+|PROVIDER_[A-Z_]+)$/.test(reason)?reason:null,
  events:limitedEvents.values,consent:limitedContacts.values,
  truncated:limitedEvents.truncated||limitedContacts.truncated||disclosureTruncated};
 // Enforce the actual downloadable UTF-8 bytes, including pretty formatting
 // and trailing LF. Do not use UTF-16 length or compact JSON as a proxy.
 while(encoder.encode(encoded(core)).byteLength>MAX_BYTES&&(core.events.length||core.consent.length)){
  if(core.events.length>=core.consent.length)core.events.pop();else core.consent.pop();
  core.truncated=true;
 }
 return core;
}
export function serializeSafeTraceReceipt(input){return encoded(createSafeTraceReceipt(input));}
