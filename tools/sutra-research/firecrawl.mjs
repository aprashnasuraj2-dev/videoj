// Local operator adapter; no API key is exposed to browser, model or graph.
import {readBoundedResponse,isFullJson} from '../../packages/sutra-runtime/bounded-response.js';
import {parseUniqueJson} from '../../packages/sutra-runtime/strict-json.js';
import {admitPublicWebUrl} from '../../packages/sutra-runtime/web-access.js';
const origin='https://api.firecrawl.dev';
const fail=code=>{const e=new Error('Web provider stopped ('+code+').');e.code=code;throw e;};
export function createFirecrawlResearchAdapter({apiKey,fetchImpl=fetch}={}){
 if(typeof apiKey!=='string'||apiKey.length<12||apiKey.length>512||/[\s\u0000-\u001f\u007f]/.test(apiKey)||typeof fetchImpl!=='function')fail('WEB_CONFIG');
 async function request(path,payload,signal){
  let reply;
  try{
   reply=await readBoundedResponse({url:origin+path,fetchImpl,signal,maxBytes:65536,init:{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify(payload)},inspect(response){
    if(response.status===402||response.status===429)fail('WEB_QUOTA');
    if(response.status>=500)fail('WEB_UNAVAILABLE');
    if(!isFullJson(response))fail('WEB_RESPONSE');return true;
   }});
  }catch(error){if(['WEB_QUOTA','WEB_UNAVAILABLE','WEB_RESPONSE'].includes(error?.code))throw error;fail(signal?.aborted?'WEB_TIMEOUT':'WEB_UNAVAILABLE');}
  let result;
  try{result=parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(reply.bytes),{maxChars:65536,maxDepth:32});}catch{fail('WEB_RESPONSE');}
  if(result?.success!==true||!result.data||typeof result.data!=='object')fail('WEB_RESPONSE');
  return result.data;
 }
 return Object.freeze({
  async search(query,{signal}){
   const result=await request('/v2/search',{query,limit:4,sources:[{type:'web'}],domainTools:false,timeout:10000,safe:true},signal);
   if(!Array.isArray(result.web)||result.web.length>4)fail('WEB_RESPONSE');
   return result.web.map(row=>({url:row?.url,title:row?.title??'',snippet:row?.description??''}));
  },
  async read(url,{signal}){
   if(admitPublicWebUrl(url)!==url)fail('WEB_READ_REFUSED');
   const result=await request('/v2/scrape',{url,formats:['markdown'],onlyMainContent:true,timeout:10000},signal);
   const meta=result.metadata;
   // Do not silently attribute redirected or error-page material to the search URL.
   if(meta?.statusCode!==200||meta.error||admitPublicWebUrl(meta.sourceURL)!==url||admitPublicWebUrl(meta.url)!==url||typeof result.markdown!=='string')fail('WEB_READ_REFUSED');
   return {url,text:result.markdown};
  }
 });
}
