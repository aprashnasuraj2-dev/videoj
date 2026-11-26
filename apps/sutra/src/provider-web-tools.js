import {readBoundedResponse,isFullJson} from '../../../packages/sutra-runtime/bounded-response.js';
import {parseUniqueJson} from '../../../packages/sutra-runtime/strict-json.js';
import {admitPublicWebUrl} from '../../../packages/sutra-runtime/web-access.js';

const fail=code=>{const error=new Error('Web research stopped ('+code+').');error.code=code;throw error;};
const exactRecord=(value,keys)=>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).sort().join(',')!==[...keys].sort().join(','))fail('WEB_RESPONSE');
 return value;
};
export const providerWebCallLimit=3;
export function createProviderWebTools({origin,fetchImpl,maxCalls=providerWebCallLimit}={}){
 if(typeof origin!=='string'||typeof fetchImpl!=='function'||!Number.isSafeInteger(maxCalls)||maxCalls<1||maxCalls>6)fail('WEB_CONFIG');
 const tokens=new Map();
 const call=async(path,body,signal)=>{
  const url=origin+path;
  let response,bytes;
  try{
   ({response,bytes}=await readBoundedResponse({
    url,fetchImpl,signal,maxBytes:65536,
    init:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},
    inspect:r=>{
     if(r.status!==200)return false;
     if(!isFullJson(r))fail('WEB_RESPONSE');
     return true;
    }
   }));
  }catch(error){
   if(signal?.aborted)fail('WEB_TIMEOUT');
   if(typeof error?.code==='string'&&error.code.startsWith('WEB_'))throw error;
   fail('WEB_UNAVAILABLE');
  }
  if(response.status!==200){
   if(response.status===429)fail('WEB_QUOTA');
   if(response.status===403&&path==='/api/web/read')fail('WEB_READ_REFUSED');
   if(response.status===409)fail('WEB_UNAVAILABLE');
   fail('WEB_UNAVAILABLE');
  }
  let value;try{value=parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes),{maxChars:65536,maxDepth:32});}catch{fail('WEB_RESPONSE');}
  return value;
 };
 return Object.freeze({
  allowExternalResearch:true,maxCalls,
  async search(query,{signal}={}){
   const root=exactRecord(await call('/api/web/search',{query},signal),['sources','status','truthStatus']);
   if(root.status!=='discovery_only'||root.truthStatus!=='unverified'||!Array.isArray(root.sources)||root.sources.length>4)fail('WEB_RESPONSE');
   const rows=[];
   for(const raw of root.sources){
    const row=exactRecord(raw,['snippet','title','token','url']);
    const url=admitPublicWebUrl(row.url);
    if(!url||url!==row.url||typeof row.title!=='string'||row.title.length>180||typeof row.snippet!=='string'||row.snippet.length>350||typeof row.token!=='string'||row.token.length>4096)fail('WEB_RESPONSE');
    if(tokens.has(url)&&tokens.get(url)!==row.token)fail('WEB_RESPONSE');
    tokens.set(url,row.token);rows.push({url,title:row.title,snippet:row.snippet});
   }
   return rows;
  },
  async read(url,{signal}={}){
   const admitted=admitPublicWebUrl(url),token=admitted&&tokens.get(admitted);
   if(!admitted||admitted!==url||!token)fail('WEB_READ_REFUSED');
   const root=exactRecord(await call('/api/web/read',{token},signal),['status','text','truthStatus','url']);
   if(root.status!=='source_claim'||root.truthStatus!=='unverified'||root.url!==admitted||typeof root.text!=='string'||!root.text.trim()||root.text.length>60000)fail('WEB_RESPONSE');
   return {url:admitted,text:root.text};
  }
 });
}
