// Pluggable public-web and scholarly discovery, not a closed publisher allowlist.
// Only discovery metadata leaves this layer; article text must use source admission.
import {pinnedPublicHttp} from './pinned-public-http.js';
import {admitDocumentURL} from './dynamic-public-route-policy.js';
import {secretLike} from './research-session.js';
const fail=code=>{throw Object.assign(Error('Research search refused: '+code),{code});};
export const SEARCH_BYTES=262144;
export const DISCOVERY_BACKENDS=Object.freeze(['brave','tavily','openalex','crossref','europepmc','semanticscholar','arxiv','wikipedia']);
const PUBLIC=new Set(['openalex','crossref','europepmc','semanticscholar','arxiv','wikipedia']);
const keyOk=x=>typeof x==='string'&&x.length>=8&&x.length<=512&&/^[\x21-\x7e]+$/.test(x);
const trim=(x,n=300)=>typeof x==='string'?x.trim().slice(0,n):'';
const year=x=>Number.isSafeInteger(x)&&x>=1500&&x<=2200?x:null;
const DOI=x=>typeof x==='string'&&/^10\.\d{4,9}\/[A-Za-z0-9._;()/:+-]{1,190}$/i.test(x)?x:null;
function doiLink(raw){const doi=DOI(raw);return doi?'https://doi.org/'+doi:null;}
function safeLink(raw){
 if(typeof raw!=='string'||raw.length>2048)return null;
 try{return admitDocumentURL(raw,{allowQuery:true});}catch{return null;}
}
function record(url,title,provider,rank,extra={}){
 const admitted=safeLink(url);if(!admitted)return null;
 return {url:admitted,title:trim(title),provider,rank,...extra};
}
const urlFor=(origin,path,params)=>{const u=new URL(path,origin);for(const [k,v]of Object.entries(params))if(v!==undefined)u.searchParams.set(k,String(v));return u;};
const fromCrossref=(rows,id)=>rows.slice(0,10).map((x,i)=>{
 const link=safeLink(x?.URL)||doiLink(x?.DOI);
 return record(link,Array.isArray(x?.title)?x.title[0]:x?.title,id,i+1,
  {doi:DOI(x?.DOI),publisher:trim(x?.publisher,120),publicationYear:year(x?.published?.['date-parts']?.[0]?.[0]),sourceFamily:'scholarly_metadata'});
}).filter(Boolean);
const fromOpenAlex=(rows,id)=>rows.slice(0,10).map((x,i)=>{
 const preferred=x?.primary_location?.landing_page_url||x?.best_oa_location?.landing_page_url||x?.doi||x?.id;
 return record(preferred,x?.title||x?.display_name,id,i+1,
  {doi:DOI(typeof x?.doi==='string'?x.doi.replace(/^https?:\/\/doi\.org\//i,''):null),publisher:trim(x?.primary_location?.source?.display_name,120),publicationYear:year(x?.publication_year),sourceFamily:'scholarly_index',openAccessReported:x?.open_access?.is_oa===true});
}).filter(Boolean);
const fromEuropePmc=(rows,id)=>rows.slice(0,10).map((x,i)=>{
 const link=doiLink(x?.doi)||('https://europepmc.org/article/'+encodeURIComponent(x?.source??'MED')+'/'+encodeURIComponent(x?.id??''));
 return record(link,x?.title,id,i+1,{doi:DOI(x?.doi),publisher:trim(x?.journalTitle,120),publicationYear:year(Number(x?.pubYear)),sourceFamily:'biomedical_index',openAccessReported:x?.isOpenAccess==='Y'});
}).filter(Boolean);
const fromSemanticScholar=(rows,id)=>rows.slice(0,10).map((x,i)=>record(x?.url||doiLink(x?.externalIds?.DOI),x?.title,id,i+1,
 {doi:DOI(x?.externalIds?.DOI),publisher:trim(x?.venue,120),publicationYear:year(x?.year),sourceFamily:'citation_index',openAccessReported:x?.isOpenAccess===true})).filter(Boolean);
function xmlValue(raw,tag){
 const match=new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i').exec(raw);
 if(!match)return '';
 return match[1].replace(/<[^>]*>/g,' ').replace(/&(?:amp|lt|gt|quot|apos|#\d{1,7}|#x[0-9a-f]{1,6});/gi,x=>{
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"},v=x.slice(1,-1).toLowerCase();
  if(named[v])return named[v];
  if(v[0]==='#'){const num=v[1]==='x'?parseInt(v.slice(2),16):Number(v.slice(1));return Number.isInteger(num)&&num>0&&num<=0x10ffff&&!(num>=0xd800&&num<=0xdfff)?String.fromCodePoint(num):'';}
  return x;
 }).replace(/\s+/g,' ').trim().slice(0,300);
}
function fromArxivXml(text,id){
 if(/<!DOCTYPE|<!ENTITY/i.test(text))fail('PROVIDER_RESPONSE');
 const out=[];let index=0;
 while(out.length<10){
  const a=text.indexOf('<entry>',index);if(a<0)break;
  const b=text.indexOf('</entry>',a+7);if(b<0)fail('PROVIDER_RESPONSE');
  if(b-a>24000)fail('PROVIDER_RESPONSE');
  const entry=text.slice(a+7,b);index=b+8;
  const url=xmlValue(entry,'id'),title=xmlValue(entry,'title');
  const r=record(url,title,id,out.length+1,{publisher:'arXiv',sourceFamily:'preprint',publicationYear:year(Number(xmlValue(entry,'published').slice(0,4)))});
  if(r)out.push(r);
 }
 return out;
}
export function createSearchProviders({credentials={},transport=pinnedPublicHttp}={}){
 if(typeof transport!=='function')fail('TRANSPORT');
 const providers={};
 for(const id of DISCOVERY_BACKENDS){
  const key=credentials[id],requiresKey=!PUBLIC.has(id);
  if(requiresKey&&key===undefined)continue;
  if(key!==undefined&&!keyOk(key))fail('CREDENTIAL');
  providers[id]=Object.freeze({id,category:({brave:'general_web',tavily:'general_web',openalex:'scholarly_index',crossref:'publication_registry',europepmc:'biomedical',semanticscholar:'citation_index',arxiv:'preprint',wikipedia:'encyclopedia'})[id],
   async search(query,{signal}={}){
    if(typeof query!=='string'||!query.trim()||query.length>1200||secretLike(query)||/[\u0000-\u001f\u007f]/.test(query))fail('QUERY');
    let options,body,xml=false;
    if(id==='brave'){
     const u=urlFor('https://api.search.brave.com','/res/v1/web/search',{q:query,count:10});
     options={url:u,headers:{Accept:'application/json','X-Subscription-Token':key}};
    }else if(id==='tavily'){
     body=JSON.stringify({query,search_depth:'basic',max_results:10,include_answer:false,include_raw_content:false,auto_parameters:false});
     options={url:new URL('https://api.tavily.com/search'),method:'POST',headers:{Accept:'application/json',Authorization:'Bearer '+key,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)},body};
    }else if(id==='wikipedia'){
     options={url:urlFor('https://en.wikipedia.org','/w/api.php',{action:'query',list:'search',srsearch:query,srlimit:10,format:'json',formatversion:2}),headers:{Accept:'application/json'}};
    }else if(id==='crossref'){
     options={url:urlFor('https://api.crossref.org','/works',{'query.bibliographic':query,rows:8,select:'DOI,title,URL,publisher,issued,published'}),headers:{Accept:'application/json'}};
    }else if(id==='openalex'){
     options={url:urlFor('https://api.openalex.org','/works',{search:query,per_page:8,select:'id,title,display_name,doi,primary_location,publication_year,open_access',...(key?{api_key:key}:{})}),headers:{Accept:'application/json'}};
    }else if(id==='europepmc'){
     options={url:urlFor('https://www.ebi.ac.uk','/europepmc/webservices/rest/search',{query,format:'json',pageSize:8,resultType:'lite'}),headers:{Accept:'application/json'}};
    }else if(id==='semanticscholar'){
     options={url:urlFor('https://api.semanticscholar.org','/graph/v1/paper/search',{query,limit:8,fields:'title,url,externalIds,year,venue,isOpenAccess'}),headers:{Accept:'application/json',...(key?{'x-api-key':key}:{})}};
    }else if(id==='arxiv'){
     const terms=(query.match(/[\p{L}\p{N}]{3,}/gu)??[]).slice(0,5);
     if(!terms.length)fail('QUERY');
     options={url:urlFor('https://export.arxiv.org','/api/query',{search_query:terms.map(w=>'all:'+w).join(' AND '),start:0,max_results:8}),headers:{Accept:'application/atom+xml'}};xml=true;
    }
    const r=await transport({...options,signal,maxBytes:SEARCH_BYTES,acceptedTypes:xml?['application/atom+xml','application/xml','text/xml']:['application/json']});
    let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(r.body);}catch{fail('PROVIDER_RESPONSE');}
    if(xml)return fromArxivXml(text,id);
    let data;try{data=JSON.parse(text);}catch{fail('PROVIDER_RESPONSE');}
    let rows;
    if(id==='brave')rows=data?.web?.results;
    else if(id==='tavily')rows=data?.results;
    else if(id==='wikipedia')rows=data?.query?.pages??data?.query?.search;
    else if(id==='crossref')rows=data?.message?.items;
    else if(id==='openalex')rows=data?.results;
    else if(id==='europepmc')rows=data?.resultList?.result;
    else if(id==='semanticscholar')rows=data?.data;
    if(!Array.isArray(rows))fail('PROVIDER_RESPONSE');
    if(id==='brave'||id==='tavily')return rows.slice(0,10).map((x,i)=>record(x?.url,x?.title,id,i+1,{sourceFamily:'general_web'})).filter(Boolean);
    if(id==='wikipedia')return rows.slice(0,10).map((x,i)=>record(typeof x?.title==='string'&&x.title.length<=250?'https://en.wikipedia.org/wiki/'+encodeURIComponent(x.title.replaceAll(' ','_')):null,x?.title,id,i+1,{sourceFamily:'encyclopedia'})).filter(Boolean);
    if(id==='crossref')return fromCrossref(rows,id);
    if(id==='openalex')return fromOpenAlex(rows,id);
    if(id==='europepmc')return fromEuropePmc(rows,id);
    if(id==='semanticscholar')return fromSemanticScholar(rows,id);
    fail('PROVIDER_RESPONSE');
   }});
 }
 return Object.freeze(providers);
}
