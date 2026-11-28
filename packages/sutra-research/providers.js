import {pinnedPublicHttp} from './pinned-public-http.js';
import {secretLike} from './research-session.js';
const fail=code=>{throw Object.assign(Error('Research search refused: '+code),{code});};
export const SEARCH_BYTES=262144;
export function createSearchProviders({credentials={},transport=pinnedPublicHttp}={}){
 const providers={};
 for(const id of ['brave','tavily','wikipedia']){
  const key=credentials[id];if(key===undefined&&id!=='wikipedia')continue;
  if(id!=='wikipedia'&&(typeof key!=='string'||key.length<8||key.length>512||!/^[\x21-\x7e]+$/.test(key)))fail('CREDENTIAL');
  providers[id]=Object.freeze({id,async search(query,{signal}={}){
   if(typeof query!=='string'||!query.trim()||query.length>1200||secretLike(query)||/[\u0000-\u001f\u007f]/.test(query))fail('QUERY');
   let options;
   if(id==='wikipedia'){
    const url=new URL('https://en.wikipedia.org/w/api.php');for(const [k,v] of Object.entries({action:'query',list:'search',srsearch:query,srlimit:'10',format:'json',formatversion:'2'}))url.searchParams.set(k,v);
    options={url,headers:{Accept:'application/json'}};
   }else if(id==='brave'){
    const url=new URL('https://api.search.brave.com/res/v1/web/search');url.searchParams.set('q',query);url.searchParams.set('count','10');
    options={url,headers:{Accept:'application/json','X-Subscription-Token':key}};
   }else{
    const body=JSON.stringify({query,search_depth:'basic',max_results:10,include_answer:false,include_raw_content:false,auto_parameters:false});
    options={url:new URL('https://api.tavily.com/search'),method:'POST',headers:{Accept:'application/json',Authorization:'Bearer '+key,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)},body};
   }
   const r=await transport({...options,signal,maxBytes:SEARCH_BYTES,acceptedTypes:['application/json']});
   let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(r.body));}catch{fail('PROVIDER_RESPONSE');}
   const rows=id==='brave'?data?.web?.results:id==='wikipedia'?data?.query?.pages??data?.query?.search:data?.results;if(!Array.isArray(rows))fail('PROVIDER_RESPONSE');
   return rows.slice(0,10).flatMap((x,i)=>{
    const url=id==='wikipedia'&&typeof x?.title==='string'&&x.title.length<=250?'https://en.wikipedia.org/wiki/'+encodeURIComponent(x.title.replaceAll(' ','_')):x?.url;
    return typeof url==='string'&&url.length<=2048?[{url,title:typeof x.title==='string'?x.title.slice(0,300):'',provider:id,rank:i+1}]:[];
   });
  }});
 }
 return Object.freeze(providers);
}
