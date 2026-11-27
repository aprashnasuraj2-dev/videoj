import {admitDocumentURL} from './dynamic-public-route-policy.js';
import {extractPdfDocument,PDF_INPUT_BYTES} from './pdf-parser.js';
import {scanHtml} from './html-parser.js';
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
export function extractDocument(body,mediaType,url,{allowCrossOriginLinks=false}={}){
 const original=utf8(body);let text=original,links=[],metadata={};
 if(mediaType==='text/html'){({text,links,metadata}=scanHtml(original,url,{allowCrossOriginLinks}));}
 else if(mediaType==='application/json'){JSON.parse(original);}
 if(!text.trim())fail('EMPTY');
 return Object.freeze({url,mediaType,rawDigest:digest(body),textDigest:digest(text),text,links:Object.freeze(links),metadata:Object.freeze(metadata),parser:mediaType==='text/html'?'bounded-html/v2':'bounded-text/v1',retrievedAt:new Date().toISOString()});
}
export function createDocumentReader({authorization,transport=pinnedPublicHttp,parsePdf}){
 assertResearchAuthorization(authorization);const robots=new Map();
 return async function read(raw){
  authorization.assertActive();const url=admitDocumentURL(raw);if(secretLike(url)||secretLike(decodeURIComponent(new URL(url).pathname)))fail('SENSITIVE_URL');
  const target=new URL(url),origin=target.origin;
  if(!robots.has(origin)){
   authorization.reserve('robots',{bytes:ROBOTS_BYTES});
   const r=await transport({url:new URL('/robots.txt',origin),signal:authorization.signal,maxBytes:ROBOTS_BYTES,acceptedTypes:['text/plain'],allowMissing:true});
   authorization.assertActive();robots.set(origin,r.status===200?utf8(r.body):'');
  }
  if(!robotsAllows(robots.get(origin),target.pathname))fail('ROBOTS');
  const allowPdf=authorization.plan.scope.allowPdf===true,maxBytes=allowPdf?PDF_INPUT_BYTES:DOCUMENT_BYTES,acceptedTypes=['text/html','text/plain','application/json','text/csv'];
  if(allowPdf)acceptedTypes.push('application/pdf');
  authorization.reserve('document',{bytes:maxBytes});
  const r=await transport({url:target,signal:authorization.signal,maxBytes,acceptedTypes});
  authorization.assertActive();if(r.mediaType==='application/pdf'){if(!allowPdf)fail('PDF_SCOPE');const pdf=await extractPdfDocument(r.body,url,{signal:authorization.signal,parse:parsePdf});authorization.assertActive();return pdf;}
  return extractDocument(r.body,r.mediaType,url,{allowCrossOriginLinks:authorization.plan.scope.allowCrossOriginLinks===true});
 };
}
