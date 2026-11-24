import {createSourceTools} from '../sutra-source-tools/index.js';
import {validateReceipt} from '../sutra-evidence/index.js';
import {validateData} from './vendor/nsdeploy/actions.js';
export class SourceMcpError extends Error{constructor(code){super('Bounded source capability stopped ('+code+').');this.name='SourceMcpError';this.code=code;}}
const bad=code=>{throw new SourceMcpError(code??'SOURCE_CAPABILITY');};
export function createSourceMcp({origin,sources,fetchImpl=fetch,signal,onReceipt,maxReceipts=20}={}){
 const base=new URL(origin);if(base.origin!==origin||base.protocol!=='https:'&&!(base.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(base.hostname))||!Number.isInteger(maxReceipts)||maxReceipts<1||maxReceipts>20)bad('SOURCE_CONFIG');
 const local=createSourceTools(sources),definitions=local.list(),seenReceiptKeys=new Set();let sequence=0,initialized=false,calls=0;
 async function rpc(method,params,notification=false){
  if(++calls>12)bad();const controller=new AbortController(),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();const timer=setTimeout(cancel,5000);let rejectAbort;const stopped=new Promise((_,reject)=>{rejectAbort=()=>reject(Error('Source request cancelled.'));controller.signal.addEventListener('abort',rejectAbort,{once:true});if(controller.signal.aborted)rejectAbort();});stopped.catch(()=>{});
  try{
   const id=++sequence;
   const response=await Promise.race([fetchImpl(`${origin}/api/source-tools`,{method:'POST',redirect:'error',credentials:'omit',signal:controller.signal,headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-06-18'},body:JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id}),method,params})}),stopped]);
   if(notification){if(response.status!==202)bad();return;}
   if(!response.ok){
    if(response.status===429)bad('SOURCE_QUOTA');
    if(response.status===409)bad('SOURCE_VERSION');
    if(response.status===503)bad('SOURCE_UNAVAILABLE');
    bad('SOURCE_RESPONSE');
   }
   if(!response.headers.get('content-type')?.includes('application/json')||response.url&&new URL(response.url).origin!==origin)bad('SOURCE_RESPONSE');
   const reader=response.body?.getReader();if(!reader)bad();const chunks=[];let count=0;
   try{for(;;){const {done,value}=await Promise.race([reader.read(),stopped]);if(done)break;count+=value.byteLength;if(count>32768)bad();chunks.push(value);}}finally{void reader.cancel().catch(()=>{});}
   const bytes=new Uint8Array(count);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
   const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(data.jsonrpc!=='2.0'||data.id!==id||data.error||!data.result)bad();return data.result;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);controller.signal.removeEventListener('abort',rejectAbort);controller.abort();}
 }
 async function ready(){if(initialized)return;const result=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'sutra-bounded-host',version:'0.1.0'}});if(result.protocolVersion!=='2025-06-18')bad();await rpc('notifications/initialized',{},true);initialized=true;}
 return {
  async listTools(){await ready();const result=await rpc('tools/list',{});if(!Array.isArray(result.tools)||result.tools.length!==definitions.length)bad();for(const d of definitions){const matches=result.tools.filter(t=>t.name===d.name);if(matches.length!==1||JSON.stringify(matches[0].inputSchema)!==JSON.stringify(d.inputSchema))bad();}return structuredClone(definitions);},
  async callTool(name,args){const d=definitions.find(t=>t.name===name);if(!d)bad();validateData(d.inputSchema,args);const expected=local.call(name,args);await ready();const result=await rpc('tools/call',{name,arguments:args});const output=result.structuredContent;
   const allowed=name==='search_lesson'?['version','receipts','limit','truthStatus','filters','returnedCount','truncated']:['version','receipts','limit','truthStatus'];
   if(result.isError||!output||typeof output!=='object'||Array.isArray(output)||Object.keys(output).some(k=>!allowed.includes(k))||output.version!==1||output.truthStatus!=='unverified'||output.limit!==expected.limit||!Array.isArray(output.receipts)||output.receipts.length>(name==='read_cue'?1:5)||name==='read_cue'&&output.receipts.length!==1)bad();
   if(output.receipts.length!==expected.receipts.length)bad();
   if(name==='search_lesson'){
    if(!Number.isInteger(output.returnedCount)||output.returnedCount!==output.receipts.length||output.returnedCount!==expected.returnedCount||typeof output.truncated!=='boolean'||output.truncated!==expected.truncated||JSON.stringify(output.filters)!==JSON.stringify(expected.filters))bad();
   }
   for(const [index,receipt] of output.receipts.entries()){
    if(!validateReceipt(receipt,{sources}).valid||Object.keys(expected.receipts[index]).some(key=>key!=='retrievedAt'&&expected.receipts[index][key]!==receipt[key]))bad();
   }
   const nextKeys=output.receipts.map(receipt=>receipt.sourceId+'\u0000'+receipt.cueId),prospective=new Set(seenReceiptKeys);
   for(const key of nextKeys)prospective.add(key);
   if(prospective.size>maxReceipts)bad('SOURCE_EVIDENCE_LIMIT');
   for(const key of nextKeys)seenReceiptKeys.add(key);
   for(const receipt of output.receipts){try{onReceipt?.(structuredClone(receipt));}catch{/* Observer does not control source capability. */}}
   const safe={version:1,receipts:output.receipts,truthStatus:'unverified',...(name==='search_lesson'?{returnedCount:output.returnedCount,truncated:output.truncated,filters:output.filters}:{})};
   return JSON.stringify(safe);
  },
 };
}
