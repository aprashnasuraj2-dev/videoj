// Deliberately narrow MCP 2025-06-18 JSON-only POST profile.
// Not a general-purpose MCP client: no OAuth, sessions, SSE, server requests,
// filesystem access, writes, dynamic tools or arbitrary credentials.
import {validateData} from './vendor/nsdeploy/actions.js';
import {snapshotDataRecord} from '../sutra-evidence/index.js';
import {readBoundedResponse,BoundedResponseError,parseJsonRpcResult,isFullJson} from './bounded-response.js';

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
 let sequence=0,rpcCount=0,initialized=false,initialization=null;
 const contact=(kind,purpose,disclosure,preview)=>({origin,kind,purpose,disclosure,resource:url,...(preview?{preview}:{})});
 const check=active=>{if(active?.aborted)fail('MCP_CANCELLED','Third-party MCP operation was cancelled.');};
 async function rpc(method,params,notification=false,active=signal){
  check(active);if(++rpcCount>8)fail('MCP_LIMIT','External MCP request budget exceeded.');
  const controller=new AbortController(),cancel=()=>controller.abort();
  active?.addEventListener('abort',cancel,{once:true});if(active?.aborted)cancel();
  const timeout=setTimeout(cancel,5000),id=++sequence;
  try{
   const {bytes}=await readBoundedResponse({url,fetchImpl,signal:controller.signal,maxBytes:notification?0:32768,init:{
    method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-06-18'},
    body:JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id}),method,params})
   },inspect:response=>{
    if(response.headers.has('mcp-session-id'))fail('MCP_RESPONSE','External MCP requires stateless responses.');
    const protocol=response.headers.get('mcp-protocol-version');if(protocol&&protocol!=='2025-06-18')fail('MCP_PROTOCOL','Unexpected response protocol version.');
    if(notification){if(response.status!==202||response.headers.has('content-range')||response.headers.has('content-length')&&response.headers.get('content-length')!=='0')fail('MCP_RESPONSE','Expected empty 202 for MCP notification.');return response.body!==null;}
    if(!isFullJson(response))fail('MCP_RESPONSE','External MCP JSON-only stateless response unavailable.');
    return true;
   }});
   check(active);if(controller.signal.aborted)fail('MCP_TIMEOUT','Third-party MCP response exceeded the operation limit.');
   if(notification){if(bytes?.byteLength)fail('MCP_RESPONSE','Expected empty 202 for MCP notification.');return null;}
   return parseJsonRpcResult(bytes,id,code=>fail('MCP_'+code,'External MCP returned invalid or mismatched JSON-RPC data.'));
  }catch(error){
   if(active?.aborted)fail('MCP_CANCELLED','Third-party MCP operation was cancelled.');
   if(controller.signal.aborted)fail('MCP_TIMEOUT','Third-party MCP endpoint exceeded the five-second operation limit.');
   if(error instanceof BoundedResponseError)fail(error.code==='REDIRECT'?'MCP_REDIRECT':error.code==='SIZE'?'MCP_SIZE':error.code==='TRANSPORT'?'MCP_TRANSPORT':'MCP_RESPONSE','External MCP transport response was refused.');
   throw error;
  }finally{clearTimeout(timeout);active?.removeEventListener('abort',cancel);controller.abort();}
 }
 async function discover(){
  check(signal);if(initialized)return;
  if(!initialization)initialization=(async()=>{
   // One approval covers the fixed initialization/read-only discovery sequence.
   await inspector.perform(contact('mcp_discovery','Discover one preapproved public read-only tool',['tool name']),async(_contact,approvedSignal)=>{
    const active=signal&&approvedSignal?AbortSignal.any([signal,approvedSignal]):signal??approvedSignal;
    const init=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'sutra-read-only',version:'0.1.0'}},false,active);
    const capability=init.capabilities?.tools;
    if(init.protocolVersion!=='2025-06-18'||!capability||typeof capability!=='object'||Array.isArray(capability)||Object.hasOwn(capability,'listChanged')&&capability.listChanged!==false)fail('MCP_PROTOCOL','Expected exact MCP version and static tool capabilities.');
    await rpc('notifications/initialized',{},true,active);
    const catalog=await rpc('tools/list',{},false,active);
    if(Object.hasOwn(catalog,'nextCursor')||!Array.isArray(catalog.tools)||catalog.tools.length!==1||!catalog.tools[0]||typeof catalog.tools[0]!=='object'||Array.isArray(catalog.tools[0]))fail('MCP_TOOLS','Unexpected tool discovery result.');
    const tool=catalog.tools[0];
    if(tool.name!==readTool.name||JSON.stringify(tool.inputSchema)!==JSON.stringify(readTool.inputSchema)||tool.annotations?.readOnlyHint!==true||tool.annotations?.destructiveHint===true)fail('MCP_TOOLS','External tool is outside the approved read-only contract.');
    check(active);
   },{signal});
   check(signal);initialized=true;
  })();
  const pending=initialization;
  try{await pending;check(signal);}finally{if(initialization===pending)initialization=null;}
 }
 return Object.freeze({
  url,
  async listTools(){
   await discover();check(signal);
   return [structuredClone(readTool)];
  },
  async callTool(name,args){
   check(signal);if(name!==readTool.name)fail('MCP_TOOL','Unapproved MCP tool name.');
   try{args=Object.freeze(snapshotDataRecord(args,2));validateData(readTool.inputSchema,args);if(!args.query.trim()||/[\u0000-\u001f\u007f]/.test(args.query))throw Error('Invalid query');}catch{fail('MCP_ARGUMENTS','External MCP argument schema refused input.');}
   await discover();check(signal);
   return inspector.perform(contact('mcp_call','Read a preapproved public data record',['tool name','query text'],{'tool name':name,'query text':args.query}),async(_contact,approvedSignal)=>{
    const active=signal&&approvedSignal?AbortSignal.any([signal,approvedSignal]):signal??approvedSignal;
    const response=await rpc('tools/call',{name,arguments:args},false,active);check(active);
    const payload=response.structuredContent;
    if(response.isError||!payload||payload.version!==1||payload.truthStatus!=='unverified'||!Array.isArray(payload.items)||payload.items.length>5)fail('MCP_RESULT','External read did not produce the expected bounded unverified records.');
    const ids=new Set(),items=payload.items.map(item=>{
     if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).sort().join(',')!=='excerpt,id'||typeof item.id!=='string'||!item.id.trim()||item.id.length>80||ids.has(item.id)||typeof item.excerpt!=='string'||!item.excerpt.trim()||item.excerpt.length>1200)fail('MCP_RESULT','External read included unsupported content.');
     ids.add(item.id);return {id:item.id,excerpt:item.excerpt};
    });
    check(active);return JSON.stringify({sourceType:'third_party_unverified',truthStatus:'unverified',items});
   },{signal});
  }
 });
}
