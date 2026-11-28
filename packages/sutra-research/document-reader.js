import {setTimeout as delay} from 'node:timers/promises';
import {admitDocumentURL} from './dynamic-public-route-policy.js';
import {extractPdfDocument,PDF_INPUT_BYTES} from './pdf-parser.js';
import {scanHtml} from './html-parser.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {pinnedPublicHttp} from './pinned-public-http.js';
import {secretLike,digest,assertResearchAuthorization} from './research-session.js';
const fail=code=>{throw Object.assign(Error('Research document refused: '+code),{code});};
const ROBOTS_BYTES=65536,DOCUMENT_BYTES=262144;
const utf8=b=>new TextDecoder('utf-8',{fatal:true}).decode(b);
function patternMatch(pattern,path){
 const anchored=pattern.endsWith('$');if(anchored)pattern=pattern.slice(0,-1);else pattern+='*';
 // Dynamic programming rather than compiling untrusted rules to a regex.
 let prior=new Uint8Array(path.length+1);prior[0]=1;
 for(const ch of pattern){const next=new Uint8Array(path.length+1);if(ch==='*'){next[0]=prior[0];for(let i=1;i<=path.length;i++)next[i]=prior[i]||next[i-1];}else for(let i=1;i<=path.length;i++)next[i]=prior[i-1]&&path[i-1]===ch;prior=next;}
 return Boolean(prior[path.length]);
}
export function robotsAllows(text,path){
 if(text.length>ROBOTS_BYTES||/[^\x09\x0a\x0d\x20-\x7e]/.test(text))return false;
 const groups=[];let totalRules=0;let current={agents:[],rules:[],delay:false},seenRule=false;
 const flush=()=>{if(current.agents.length)groups.push(current);current={agents:[],rules:[],delay:false};seenRule=false;};
 for(const line of text.split(/\r?\n/)){
  const clean=line.split('#')[0].trim();if(!clean)continue;
  const i=clean.indexOf(':');if(i<0)return false;const key=clean.slice(0,i).trim().toLowerCase(),value=clean.slice(i+1).trim();
  if(key==='user-agent'){if(seenRule)flush();current.agents.push(value.toLowerCase());}
  else if(['allow','disallow','crawl-delay'].includes(key)&&current.agents.length){seenRule=true;if(key==='crawl-delay'){current.delay=true;continue;}if(value){if(value.length>256||++totalRules>64||value.includes('%'))return false;current.rules.push({allow:key==='allow',value});}}
 }
 flush();const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&'sutraresearch'.includes(a)&&a.length));const matching=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
 if(matching.some(g=>g.delay)||path.length>1024||path.includes('%'))return false;
 const rules=matching.flatMap(g=>g.rules).filter(r=>patternMatch(r.value,path)).sort((a,b)=>b.value.replace(/[*$]/g,'').length-a.value.replace(/[*$]/g,'').length||Number(b.allow)-Number(a.allow));
 return !rules.length||rules[0].allow;
}
export function extractDocument(body,mediaType,url,{allowCrossOriginLinks=false,allowQuery=false}={}){
 if(!Buffer.isBuffer(body)||body.length<1||body.length>1048576)fail('EXTRACTION_SIZE');
 if(!['text/html','text/plain','application/json','text/csv'].includes(mediaType))fail('EXTRACTION_MEDIA');
 const original=utf8(body);let text=original,links=[],metadata={};
 if(mediaType==='text/html'){({text,links,metadata}=scanHtml(original,url,{allowCrossOriginLinks,allowQuery}));}
 else if(mediaType==='application/json'){try{parseUniqueJson(original,{maxChars:1048576,maxDepth:32});}catch{fail('EXTRACTION_JSON');}}
 if(!text.trim())fail('EMPTY');
 return Object.freeze({url,mediaType,rawDigest:digest(body),textDigest:digest(text),text,links:Object.freeze(links),metadata:Object.freeze(metadata),parser:mediaType==='text/html'?'bounded-html/v2':'bounded-text/v1',retrievedAt:new Date().toISOString()});
}
export function createDocumentReader({authorization,transport=pinnedPublicHttp,parsePdf,minIntervalMs=750}){
 assertResearchAuthorization(authorization);
 if(!Number.isSafeInteger(minIntervalMs)||minIntervalMs<0||minIntervalMs>5000)fail('THROTTLE_CONFIG');
 const scope=authorization.plan.scope,allowQuery=scope.allowPublicQueryParameters===true,allowRedirects=scope.allowRedirects===true,routeOptions={allowQuery};
 const robots=new Map(),lastRequest=new Map(),documentRequests=new Map(),throttleTail=new Map();
 const activeCheck=signal=>{authorization.assertActive();if(signal?.aborted)fail('CANCELLED');};
 async function throttle(origin,signal){
  const prior=throttleTail.get(origin)??Promise.resolve();
  const next=prior.catch(()=>{}).then(async()=>{activeCheck(signal);const wait=minIntervalMs-(performance.now()-(lastRequest.get(origin)??-Infinity));if(wait>0)await delay(wait,undefined,{signal});activeCheck(signal);lastRequest.set(origin,performance.now());});
  throttleTail.set(origin,next);try{await next;}finally{if(throttleTail.get(origin)===next)throttleTail.delete(origin);}
 }
 function redirectTarget(current,location){
  if(!allowRedirects||typeof location!=='string')fail('REDIRECT_SCOPE');
  let absolute;try{absolute=new URL(location,current).href;}catch{fail('REDIRECT_LOCATION');}
  return admitDocumentURL(absolute,routeOptions);
 }
 async function readRobots(origin,signal,beforeDispatch){
  activeCheck(signal);
  if(robots.has(origin))return robots.get(origin);
  let current=new URL('/robots.txt',origin).href;const seen=new Set();
  for(let hop=0;hop<=3;hop++){
   if(seen.has(current))fail('ROBOTS_REDIRECT_LOOP');seen.add(current);
   authorization.reserve('robots',{bytes:ROBOTS_BYTES});await beforeDispatch({kind:'robots',url:current});await throttle(new URL(current).origin,signal);activeCheck(signal);
   const r=await transport({url:new URL(current),signal,maxBytes:ROBOTS_BYTES,acceptedTypes:['text/plain'],allowMissing:true,allowRedirectResponse:allowRedirects,documentOnly:true});
   activeCheck(signal);
   if([301,302,303,307,308].includes(r.status)){if(hop===3)fail('ROBOTS_REDIRECT_LIMIT');current=redirectTarget(current,r.location);continue;}
   if(![200,404,410].includes(r.status))fail('ROBOTS_RESPONSE');
   const text=r.status===200?utf8(r.body):'';robots.set(origin,text);return text;
  }
  fail('ROBOTS_REDIRECT_LIMIT');
 }
 return async function read(raw,{signal:callerSignal,beforeDispatch=async()=>{}}={}){
  if(typeof beforeDispatch!=='function')fail('DISPATCH_FENCE');
  const signal=callerSignal?AbortSignal.any([authorization.signal,callerSignal]):authorization.signal;
  activeCheck(signal);const requested=admitDocumentURL(raw,routeOptions);let current=requested;
  const chain=[],seen=new Set(),allowPdf=scope.allowPdf===true,maxBytes=allowPdf?PDF_INPUT_BYTES:DOCUMENT_BYTES,acceptedTypes=['text/html','text/plain','application/json','text/csv'];
  if(allowPdf)acceptedTypes.push('application/pdf');
  for(let hop=0;hop<=3;hop++){
   if(seen.has(current))fail('REDIRECT_LOOP');seen.add(current);
   const target=new URL(current),origin=target.origin,host=target.hostname,count=documentRequests.get(host)??0;
   if(count>=3)fail('DOMAIN_LIMIT');
   const rules=await readRobots(origin,signal,beforeDispatch);
   if(!robotsAllows(rules,target.pathname+target.search))fail('ROBOTS');
   const latestCount=documentRequests.get(host)??0;if(latestCount>=3)fail('DOMAIN_LIMIT');
   authorization.reserve('document',{bytes:maxBytes});documentRequests.set(host,latestCount+1);await beforeDispatch({kind:'document',url:current});await throttle(origin,signal);activeCheck(signal);
   const r=await transport({url:target,signal,maxBytes,acceptedTypes,allowRedirectResponse:allowRedirects,documentOnly:true});
   authorization.assertActive();
   if([301,302,303,307,308].includes(r.status)){
    if(hop===3)fail('REDIRECT_LIMIT');const next=redirectTarget(current,r.location);chain.push({from:current,to:next,status:r.status});current=next;continue;
   }
   if(r.status!==200)fail('DOCUMENT_RESPONSE');
   let d;if(r.mediaType==='application/pdf'){if(!allowPdf)fail('PDF_SCOPE');d=await extractPdfDocument(r.body,current,{signal,parse:parsePdf});}
   else d=extractDocument(r.body,r.mediaType,current,{allowCrossOriginLinks:scope.allowCrossOriginLinks===true,allowQuery});
   activeCheck(signal);return Object.freeze({...d,url:requested,finalUrl:current,redirectChain:Object.freeze(chain.map(Object.freeze))});
  }
  fail('REDIRECT_LIMIT');
 };
}
