// Shared narrow host transport. The caller owns status/protocol policy and
// deadlines; this boundary owns credentialless exact-URL reads and disposal.
export class BoundedResponseError extends Error{
 constructor(code){super('Bounded response stopped ('+code+').');this.name='BoundedResponseError';this.code=code;}
}
const bad=code=>{throw new BoundedResponseError(code);};
const cancelBody=body=>{try{void Promise.resolve(body?.cancel()).catch(()=>{});}catch{}};
export async function readBoundedResponse({url,fetchImpl=fetch,init={},signal,maxBytes,inspect}={}){
 if(typeof url!=='string'||typeof fetchImpl!=='function'||typeof inspect!=='function'||!Number.isSafeInteger(maxBytes)||maxBytes<0||maxBytes>65536)bad('CONFIG');
 const check=()=>{if(signal?.aborted)bad('ABORTED');};check();
 let stop,received,reader,finished=false;
 const stopped=new Promise((_,reject)=>{stop=()=>reject(new BoundedResponseError('ABORTED'));signal?.addEventListener('abort',stop,{once:true});});
 stopped.catch(()=>{});
 try{
  const incoming=Promise.resolve().then(()=>{
   check();return fetchImpl(url,{...init,credentials:'omit',redirect:'error',cache:'no-store',signal});
  }).then(value=>{
   if(finished||signal?.aborted){cancelBody(value?.body);bad('ABORTED');}
   received=value;return value;
  });
  let response;
  try{response=await Promise.race([incoming,stopped]);}
  catch(error){if(signal?.aborted||error instanceof BoundedResponseError&&error.code==='ABORTED')bad('ABORTED');bad('TRANSPORT');}
  check();
  if(!response||!response.headers||!Number.isInteger(response.status))bad('RESPONSE');
  if(response.redirected||response.url&&response.url!==url)bad('REDIRECT');
  // Unavailable statuses may skip their body, but a zero-byte budget
  // explicitly validates an acknowledgement stream to EOF. Any first byte
  // fails immediately; a held-open empty stream remains deadline-bound.
  if(inspect(response)===false)return {response,bytes:null};
  if(Number(response.headers.get('content-length'))>maxBytes)bad('SIZE');
  reader=response.body?.getReader();if(!reader)bad('BODY');
  const bytes=new Uint8Array(maxBytes);let total=0,empty=0,chunks=0;
  for(;;){
   check();
   // A fresh abort race per read avoids retaining one reaction on a
   // single pending cancellation promise for every incoming fragment.
   let interrupt;
   const interrupted=new Promise((_,reject)=>{interrupt=()=>reject(new BoundedResponseError('ABORTED'));signal?.addEventListener('abort',interrupt,{once:true});});
   let result;try{result=await Promise.race([reader.read(),interrupted]);}finally{signal?.removeEventListener('abort',interrupt);}
   check();const {done,value}=result;
   if(done)break;
   if(!(value instanceof Uint8Array))bad('BODY');
   if(value.byteLength>maxBytes-total||!value.byteLength&&++empty>256)bad('SIZE');
   // Give timers and user cancellation a chance to run during microtask-only pulls.
   if(++chunks%1024===0){await new Promise(resolve=>setTimeout(resolve,0));check();}
   bytes.set(value,total);total+=value.byteLength;
  }
  return {response,bytes:bytes.subarray(0,total)};
 }finally{
  finished=true;signal?.removeEventListener('abort',stop);
  if(reader){cancelBody(reader);try{reader.releaseLock();}catch{}}
  else cancelBody(received?.body);
 }
}
export function parseJsonRpcResult(bytes,id,invalid){
 let data;
 try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{invalid('JSON');}
 if(!data||typeof data!=='object'||Array.isArray(data)||data.jsonrpc!=='2.0'||data.id!==id||Object.hasOwn(data,'error')||!data.result||typeof data.result!=='object'||Array.isArray(data.result))invalid('RPC');
 return data.result;
}
export const isFullJson=response=>response.status===200&&!response.headers.has('content-range')&&/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??'');
