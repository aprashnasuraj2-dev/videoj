import {createSourceTools} from '../sutra-source-tools/index.js';
import {validateReceipt,snapshotDataRecord} from '../sutra-evidence/index.js';
import {validateData} from './vendor/nsdeploy/actions.js';
import {snapshotContactConfig} from './external-mcp.js';
import {readBoundedResponse,BoundedResponseError,parseJsonRpcResult,isFullJson} from './bounded-response.js';
export class SourceMcpError extends Error{constructor(code){super('Bounded source capability stopped ('+code+').');this.name='SourceMcpError';this.code=code;}}
const bad=code=>{throw new SourceMcpError(code??'SOURCE_CAPABILITY');};
export function admitSourceConfig(input){
 let config;try{config=snapshotContactConfig(input,['origin','sources','fetchImpl','signal','onReceipt','maxReceipts'],'SOURCE_CONFIG');}catch{bad('SOURCE_CONFIG');}
 const {origin,sources,fetchImpl=fetch,signal,onReceipt,maxReceipts=20}=config;
 if(typeof origin!=='string'||!origin||origin.length>2048||/[\u0000-\u0020\u007f]/.test(origin)||typeof fetchImpl!=='function'||onReceipt!==undefined&&typeof onReceipt!=='function'||!Number.isInteger(maxReceipts)||maxReceipts<1||maxReceipts>20)bad('SOURCE_CONFIG');
 let base;try{base=new URL(origin);}catch{bad('SOURCE_CONFIG');}
 if(base.origin!==origin||base.protocol!=='https:'&&!(base.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(base.hostname)))bad('SOURCE_CONFIG');
 return Object.freeze({origin,sources,fetchImpl,signal,onReceipt,maxReceipts});
}
export function createSourceMcp(input={}){
 const {origin,sources,fetchImpl,signal,onReceipt,maxReceipts}=admitSourceConfig(input);
 const local=createSourceTools(sources),definitions=local.list(),seenReceiptKeys=new Set();let sequence=0,initialized=false,initialization=null,calls=0;
 const checkCancelled=()=>{if(signal?.aborted)bad('SOURCE_CANCELLED');};
 async function rpc(method,params,notification=false){
  checkCancelled();if(++calls>12)bad();
  const controller=new AbortController(),cancel=()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  const timer=setTimeout(cancel,5000),id=++sequence;
  try{
   const {bytes}=await readBoundedResponse({url:`${origin}/api/source-tools`,fetchImpl,signal:controller.signal,maxBytes:notification?0:32768,init:{
    method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-06-18'},
    body:JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id}),method,params})
   },inspect:response=>{
    if(response.headers.has('mcp-session-id'))bad('SOURCE_RESPONSE');
    const protocol=response.headers.get('mcp-protocol-version');if(protocol&&protocol!=='2025-06-18')bad('SOURCE_RESPONSE');
    if(notification){if(response.status!==202||response.headers.has('content-range')||response.headers.has('content-length')&&response.headers.get('content-length')!=='0')bad('SOURCE_RESPONSE');return response.body!==null;}
    if(response.status===429)bad('SOURCE_QUOTA');
    if(response.status===409)bad('SOURCE_VERSION');
    if(response.status===503)bad('SOURCE_UNAVAILABLE');
    if(!isFullJson(response))bad('SOURCE_RESPONSE');return true;
   }});
   if(controller.signal.aborted)bad('SOURCE_CANCELLED');
   if(notification){if(bytes?.byteLength)bad('SOURCE_RESPONSE');return;}
   return parseJsonRpcResult(bytes,id,()=>bad());
  }catch(error){
   if(controller.signal.aborted)bad('SOURCE_CANCELLED');
   if(error instanceof BoundedResponseError)bad(error.code==='REDIRECT'?'SOURCE_RESPONSE':'SOURCE_CAPABILITY');
   throw error;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);controller.abort();}
 }
 async function ready(){
  checkCancelled();if(initialized)return;
  if(!initialization)initialization=(async()=>{
   const result=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'sutra-bounded-host',version:'0.1.0'}});
   // An explicitly declared tool catalog must be static. Older narrow
   // source fixtures omit capabilities; independent catalog checks still
   // protect their results. No dynamic discovery or server callbacks.
   const cap=result.capabilities,toolCap=cap?.tools;
   if(result.protocolVersion!=='2025-06-18'||cap!==undefined&&(!cap||typeof cap!=='object'||Array.isArray(cap)||!toolCap||typeof toolCap!=='object'||Array.isArray(toolCap)||Object.hasOwn(toolCap,'listChanged')&&toolCap.listChanged!==false))bad();
   await rpc('notifications/initialized',{},true);checkCancelled();initialized=true;
  })();
  const pending=initialization;try{await pending;checkCancelled();}finally{if(initialization===pending)initialization=null;}
 }
 return {
  async listTools(){await ready();const result=await rpc('tools/list',{});checkCancelled();if(Object.hasOwn(result,'nextCursor')||!Array.isArray(result.tools)||result.tools.length!==definitions.length||result.tools.some(t=>!t||typeof t!=='object'||Array.isArray(t)))bad();for(const d of definitions){const matches=result.tools.filter(t=>t.name===d.name);if(matches.length!==1||JSON.stringify(matches[0].inputSchema)!==JSON.stringify(d.inputSchema))bad();}return structuredClone(definitions);},
  async callTool(name,args){checkCancelled();const d=definitions.find(t=>t.name===name);if(!d)bad();try{args=Object.freeze(snapshotDataRecord(args,8));validateData(d.inputSchema,args);}catch{bad('SOURCE_ARGUMENTS');}const expected=local.call(name,args);if(name==='search_lesson'&&expected.truncated)bad('SOURCE_QUERY_TOO_BROAD');await ready();const result=await rpc('tools/call',{name,arguments:args});checkCancelled();const output=result.structuredContent;
   const allowed=name==='search_lesson'?['version','receipts','limit','truthStatus','filters','returnedCount','matchCount','truncated']:['version','receipts','limit','truthStatus'];
   if(result.isError||!output||typeof output!=='object'||Array.isArray(output)||Object.keys(output).some(k=>!allowed.includes(k))||output.version!==1||output.truthStatus!=='unverified'||output.limit!==expected.limit||!Array.isArray(output.receipts)||output.receipts.length>(name==='read_cue'?1:5)||name==='read_cue'&&output.receipts.length!==1)bad();
   if(output.receipts.length!==expected.receipts.length)bad();
   if(name==='search_lesson'){
    if(!Number.isInteger(output.returnedCount)||output.returnedCount!==output.receipts.length||output.returnedCount!==expected.returnedCount||!Number.isInteger(output.matchCount)||output.matchCount!==expected.matchCount||typeof output.truncated!=='boolean'||output.truncated!==expected.truncated||JSON.stringify(output.filters)!==JSON.stringify(expected.filters))bad();
    if(output.truncated)bad('SOURCE_QUERY_TOO_BROAD');
   }
   for(const [index,receipt] of output.receipts.entries()){
    // The independently indexed catalog produced expected.receipts. Shape plus
    // exact equality (except the observation timestamp) avoids re-reading a mutable
    // caller-owned catalog after asynchronous transport.
    if(validateReceipt(receipt).level!=='shape_only'||Object.keys(expected.receipts[index]).some(key=>key!=='retrievedAt'&&expected.receipts[index][key]!==receipt[key]))bad();
   }
   // The server timestamp is shape-checked above, but is not the caller's
   // observation. Stamp the verified response at local receipt admission.
   const observedAt=new Date().toISOString();
   const receipts=output.receipts.map(receipt=>({...receipt,retrievedAt:observedAt}));
   const nextKeys=receipts.map(receipt=>receipt.sourceId+'\u0000'+receipt.cueId),prospective=new Set(seenReceiptKeys);
   for(const key of nextKeys)prospective.add(key);
   if(prospective.size>maxReceipts)bad('SOURCE_EVIDENCE_LIMIT');
   checkCancelled();for(const key of nextKeys)seenReceiptKeys.add(key);
   for(const receipt of receipts){checkCancelled();try{onReceipt?.(structuredClone(receipt));}catch{/* Observer does not control source capability. */}}
   checkCancelled();
   const safe={version:1,receipts,truthStatus:'unverified',...(name==='search_lesson'?{returnedCount:output.returnedCount,matchCount:output.matchCount,truncated:output.truncated,filters:output.filters}:{})};
   return JSON.stringify(safe);
  },
 };
}
