// Only the fixed internal quota binding, never a caller-selected URL.
// Own bounded replies even when an injected transport ignores cancellation.
// Ambiguous admissions retain their conservative resource charge and lease TTL.
import {readBoundedResponse,isFullJson} from '../../packages/sutra-runtime/bounded-response.js';
export async function readQuotaReply(quota,path,payload,signal){
 if(!['/reserve','/release','/source-read','/web-request'].includes(path))throw Error('Quota path');
 const {response,bytes}=await readBoundedResponse({
  // Workerd does not implement Fetch's redirect:'error'. Manual is the
  // runtime-supported non-following mode; the exact status/URL checks below
  // still reject every redirect without contacting its Location.
  url:'https://quota.internal'+path,fetchImpl:(url,{referrer,referrerPolicy,...init})=>quota.fetch(url,{...init,redirect:'manual'}),signal,maxBytes:512,
  init:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},
  inspect:response=>{if(response.status!==200)return false;if(!isFullJson(response))throw Error('Quota response');return true;}
 });
 signal?.throwIfAborted();
 if(response.status!==200)return {status:response.status};
 const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Quota response');
 if(path==='/reserve'){
  if(Object.keys(data).length!==2||data.allowed!==true||typeof data.lease!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.lease))throw Error('Quota reservation');
 }else if(Object.keys(data).length!==1||data[path==='/release'?'released':'allowed']!==true)throw Error('Quota response');
 return {status:200,data};
}
