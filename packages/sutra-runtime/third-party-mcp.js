const fail=()=>{throw Error('Third-party MCP capability unavailable.');};
const loopback=host=>['localhost','127.0.0.1','[::1]'].includes(host);
async function boundedJson(response,maxBytes,signal){
 if(!response?.ok||!response.headers?.get('content-type')?.toLowerCase().includes('application/json'))fail();
 const reader=response.body?.getReader();if(!reader)fail();let total=0;const chunks=[];
 try{for(;;){signal?.throwIfAborted();const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes)fail();chunks.push(value);}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail();}
}
export function createThirdPartyMcp({url,fetchImpl=fetch,signal,timeoutMs=5000,maxBytes=32768}={}){
 let endpoint;try{endpoint=new URL(url);}catch{fail();}
 if(endpoint.username||endpoint.password||endpoint.search||endpoint.hash||endpoint.protocol!=='https:'&&!(endpoint.protocol==='http:'&&loopback(endpoint.hostname)))fail();
 if(typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000||!Number.isInteger(maxBytes)||maxBytes<1024||maxBytes>32768)fail();
 let sequence=0,initialized=false,calls=0;
 async function rpc(method,params,notification=false){
  if(++calls>12)fail();
  const controller=new AbortController(),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();const timer=setTimeout(cancel,timeoutMs);
  let rejectAbort;const stopped=new Promise((_,reject)=>{rejectAbort=()=>reject(Error('cancelled'));controller.signal.addEventListener('abort',rejectAbort,{once:true});if(controller.signal.aborted)rejectAbort();});stopped.catch(()=>{});
  try{
   const id=++sequence,body=JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id}),method,params});
   if(body.length>16384)fail();
   let response;try{response=await Promise.race([fetchImpl(endpoint.href,{method:'POST',redirect:'error',credentials:'omit',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json',Accept:'application/json','MCP-Protocol-Version':'2025-06-18'},body}),stopped]);}catch{fail();}
   if(response.url&&new URL(response.url).origin!==endpoint.origin)fail();
   if(notification){if(response.status!==202)fail();return;}
   const data=await boundedJson(response,maxBytes,controller.signal);
   if(data?.jsonrpc!=='2.0'||data.id!==id||data.error||!data.result)fail();
   return data.result;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);controller.signal.removeEventListener('abort',rejectAbort);controller.abort();}
 }
 async function ready(){
  if(initialized)return;
  const result=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'sutra-browser-host',version:'0.1.0'}});
  if(result.protocolVersion!=='2025-06-18')fail();
  await rpc('notifications/initialized',{},true);initialized=true;
 }
 return Object.freeze({
  url:endpoint.href,
  async listTools(){await ready();const result=await rpc('tools/list',{});if(!Array.isArray(result.tools)||result.tools.length>32)fail();return structuredClone(result.tools);},
  async callTool(name,args){if(typeof name!=='string'||!name||name.length>60||args===null||typeof args!=='object'||Array.isArray(args))fail();let encoded;try{encoded=JSON.stringify({name,arguments:args});}catch{fail();}if(!encoded||new TextEncoder().encode(encoded).length>12000)fail();await ready();const result=await rpc('tools/call',{name,arguments:args});if(result.isError)fail();return structuredClone(result.structuredContent??result.content??result);}
 });
}
