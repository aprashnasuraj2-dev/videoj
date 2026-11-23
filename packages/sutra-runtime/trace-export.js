// Source-independent, browser-safe report of SUTRA execution. This intentionally
// does not copy raw TraceBus entries, requests, model messages or tool results.
const executionFields=['phase','kind','id','parent','status','agent','tool','network','origin'];
const contactFields=['at','type','origin','contactKind','purpose','network','decision','scope','source','status'];
const safeText=(value,max=100)=>typeof value==='string'?
 value.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max):null;
const clampCount=(n,max)=>Number.isInteger(n)&&n>=0?Math.min(n,max):null;
const knownOutcome=new Set(['completed','denied','failed','cancelled']);
const allowedMode=new Set(['scripted-test','provider']);
function safeObject(value,keys){
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const out={};
 for(const key of keys){
  const property=Object.getOwnPropertyDescriptor(value,key);
  if(!property||!Object.hasOwn(property,'value'))continue;
  const data=safeText(property.value,key==='purpose'?160:100);
  if(data!==null)out[key]=data;
 }
 return out;
}
export function createSafeTraceReceipt({events=[],contactEvents=[],outcome='failed',mode='scripted-test',modelCalls=0,agentCalls=0}={}){
 if(!Array.isArray(events)||!Array.isArray(contactEvents))throw Error('Trace inputs must be arrays.');
 if(!knownOutcome.has(outcome)||!allowedMode.has(mode))throw Error('Unsupported trace report state.');
 // Ignore unexpected fields even when they contain credentials, private prompts,
 // model output, request bodies or arbitrary serialized tool results.
 const limitedEvents=events.slice(0,128).map(item=>safeObject(item,executionFields));
 const limitedContacts=contactEvents.slice(0,128).map(item=>{
  const filtered=safeObject(item,contactFields);
  const property=item&&typeof item==='object'?Object.getOwnPropertyDescriptor(item,'disclosure'):null;
  if(property&&Object.hasOwn(property,'value')&&Array.isArray(property.value)){
   filtered.disclosure=property.value.slice(0,12).map(x=>safeText(x,80)).filter(x=>x!==null);
  }
  return filtered;
 });
 const core={schemaVersion:1,reportType:'sutra-sanitized-execution',mode,outcome,
  modelCalls:clampCount(modelCalls,8),agentCalls:clampCount(agentCalls,12),
  events:limitedEvents,consent:limitedContacts,
  truncated:events.length>128||contactEvents.length>128};
 // Guard against unusually long public labels combining into oversized exports.
 while(JSON.stringify(core).length>65536&&(core.events.length||core.consent.length)){
  if(core.events.length>=core.consent.length)core.events.pop();else core.consent.pop();
  core.truncated=true;
 }
 return structuredClone(core);
}
export function serializeSafeTraceReceipt(input){
 const result=createSafeTraceReceipt(input);
 return JSON.stringify(result,null,2)+'\n';
}
