// Deliberately narrow MCP 2025-06-18 JSON-only POST profile.
// Not a general-purpose MCP client: no OAuth, sessions, SSE, server requests,
// filesystem access, writes, dynamic tools or arbitrary credentials.
import {validateData} from './vendor/nsdeploy/actions.js';

export class ExternalMcpError extends Error {
 constructor(code,message){super(message);this.name='ExternalMcpError';this.code=code;}
}
const fail=(code,message)=>{throw new ExternalMcpError(code,message);};
const readTool=Object.freeze({
 name:'read_public',
 description:'Read a bounded public record; third-party material is unverified.',
 inputSchema:{
  type:'object',
  properties:{query:{type:'string',minLength:1,maxLength:120}},
  required:['query'],additionalProperties:false
 }
});
export function validateExternalMcpConfig(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('MCP_CONFIG','External MCP configuration must be a plain object.');
 if(Object.keys(value).some(key=>!['url','inspector','fetchImpl'].includes(key)))fail('MCP_CONFIG','Unsupported external MCP host configuration.');
 if(typeof value.url!=='string'||value.url.length>2048)fail('MCP_URL','External MCP requires a fixed complete endpoint URL.');
 let parsed;
 try{parsed=new URL(value.url);}catch{fail('MCP_URL','External MCP endpoint URL is invalid.');}
 const loopback=['127.0.0.1','localhost','[::1]'].includes(parsed.hostname);
 if(parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/mcp'||parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&loopback))fail('MCP_URL','External MCP requires a fixed HTTPS /mcp endpoint (HTTP loopback for tests).');
 if(typeof value.inspector?.perform!=='function')fail('MCP_CONFIG','External MCP requires an explicit consent inspector.');
 if(value.fetchImpl!==undefined&&typeof value.fetchImpl!=='function')fail('MCP_CONFIG','External MCP transport must be callable.');
 return Object.freeze({url:parsed.href,origin:parsed.origin,inspector:value.inspector,fetchImpl:value.fetchImpl??fetch});
}
export function createExternalReadMcp(options,{signal}={}){
 const {url,origin,inspector,fetchImpl}=validateExternalMcpConfig(options);
 let sequence=0,rpcCount=0,initialized=false;
 const contact=(kind,purpose,disclosure)=>({origin,kind,purpose,disclosure});
 const stopped=(controller)=>{
  let onAbort;
  const promise=new Promise((_,reject)=>{
   onAbort=()=>reject(new ExternalMcpError('MCP_TIMEOUT','Approved third-party MCP operation was cancelled or timed out.'));
   controller.signal.addEventListener('abort',onAbort,{once:true});
   if(controller.signal.aborted)onAbort();
  });
  promise.catch(()=>{});
  return {promise,close:()=>controller.signal.removeEventListener('abort',onAbort)};
 };
 async function rpc(method,params,notification=false){
  if(signal?.aborted)fail('MCP_CANCELLED','Third-party MCP operation was cancelled.');
  if(++rpcCount>8)fail('MCP_LIMIT','External MCP request budget exceeded.');
  const controller=new AbortController(),cancel=()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});
  const timeout=setTimeout(cancel,5000),abort=stopped(controller);
  const id=++sequence;
  const body=JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id}),method,params});
  try{
   let response;
   try{response=await Promise.race([fetchImpl(url,{
     method:'POST',redirect:'error',credentials:'omit',cache:'no-store',signal:controller.signal,
     headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-06-18'},
     body
   }),abort.promise]);}
   catch{fail(signal?.aborted?'MCP_CANCELLED':'MCP_TRANSPORT','External MCP transport failed or timed out.');}
   if(response?.url){
    let actual;try{actual=new URL(response.url);}catch{fail('MCP_RESPONSE','Invalid MCP response URL.');}
    if(actual.href!==url)fail('MCP_REDIRECT','External MCP changed endpoint.');
   }
   if(notification){if(response.status!==202)fail('MCP_RESPONSE','Expected 202 for MCP notification.');return null;}
   if(!response?.ok||!/^application\/json(?:\s*;|$)/i.test(response.headers?.get('content-type')??'')||response.headers.get('mcp-session-id'))fail('MCP_RESPONSE','External MCP JSON-only stateless response unavailable.');
   const reader=response.body?.getReader();
   if(!reader)fail('MCP_RESPONSE','External MCP response body unavailable.');
   const chunks=[];let total=0;
   try{
    while(true){
     let next;
     try{next=await Promise.race([reader.read(),abort.promise]);}catch{fail(signal?.aborted?'MCP_CANCELLED':'MCP_TIMEOUT','Third-party MCP response was interrupted.');}
     if(next.done)break;
     total+=next.value.byteLength;
     if(total>32768)fail('MCP_SIZE','Third-party MCP response exceeded 32 KiB.');
     chunks.push(next.value);
    }
   }finally{void reader.cancel().catch(()=>{});reader.releaseLock();}
   const bytes=new Uint8Array(total);let offset=0;
   for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   let data;
   try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
   catch{fail('MCP_JSON','External MCP result is not valid UTF-8 JSON.');}
   if(!data||typeof data!=='object'||Array.isArray(data)||data.jsonrpc!=='2.0'||data.id!==id||data.error||!data.result||typeof data.result!=='object')fail('MCP_RPC','External MCP returned a mismatched or failed JSON-RPC response.');
   return data.result;
  }finally{
   clearTimeout(timeout);signal?.removeEventListener('abort',cancel);abort.close();controller.abort();
  }
 }
 async function discover(){
  if(initialized)return;
  // One approval covers initialization and read-only discovery only.
  await inspector.perform(contact('mcp_discovery','Discover one preapproved public read-only tool',['tool name']),async()=>{
   const init=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'sutra-read-only',version:'0.1.0'}});
   if(init.protocolVersion!=='2025-06-18'||init.capabilities?.tools===undefined)fail('MCP_PROTOCOL','Expected exact MCP version and tool capabilities.');
   await rpc('notifications/initialized',{},true);
   const catalog=await rpc('tools/list',{});
   if(!Array.isArray(catalog.tools)||catalog.tools.length!==1)fail('MCP_TOOLS','Unexpected tool discovery result.');
   const tool=catalog.tools[0];
   if(tool.name!==readTool.name||JSON.stringify(tool.inputSchema)!==JSON.stringify(readTool.inputSchema)||tool.annotations?.readOnlyHint!==true||tool.annotations?.destructiveHint===true)fail('MCP_TOOLS','External tool is outside the approved read-only contract.');
  });
  initialized=true;
 }
 return Object.freeze({
  url,
  async listTools(){
   await discover();
   return [structuredClone(readTool)];
  },
  async callTool(name,args){
   if(name!==readTool.name)fail('MCP_TOOL','Unapproved MCP tool name.');
   try{validateData(readTool.inputSchema,args);}catch{fail('MCP_ARGUMENTS','External MCP argument schema refused input.');}
   await discover();
   return inspector.perform(contact('mcp_call','Read a preapproved public data record',['tool name','query text']),async()=>{
    const response=await rpc('tools/call',{name,arguments:args});
    const payload=response.structuredContent;
    if(response.isError||!payload||payload.version!==1||payload.truthStatus!=='unverified'||!Array.isArray(payload.items)||payload.items.length>5)fail('MCP_RESULT','External read did not produce the expected bounded unverified records.');
    const items=payload.items.map(item=>{
     if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).sort().join(',')!=='excerpt,id'||typeof item.id!=='string'||item.id.length<1||item.id.length>80||typeof item.excerpt!=='string'||item.excerpt.length>1200)fail('MCP_RESULT','External read included unsupported content.');
     return {id:item.id,excerpt:item.excerpt};
    });
    return JSON.stringify({sourceType:'third_party_unverified',truthStatus:'unverified',items});
   });
  }
 });
}
