// Optional, operator-enabled JavaScript page rendering. No public egress authority.
// Upstream Rust engine is pinned under third_party/obscura; static reader remains default.
import {spawn as defaultSpawn} from 'node:child_process';
import {isAbsolute} from 'node:path';
import {admitDocumentURL} from './dynamic-public-route-policy.js';
import {createDocumentReader,extractDocument} from './document-reader.js';
import {assertResearchAuthorization,digest} from './research-session.js';

export const OBSCURA_UPSTREAM_COMMIT='efe1c95962b33935fe9c53851566211074efe147';
const MAX_DOM_BYTES=262144,MAX_STDOUT_BYTES=393216;
const CAPTURE='JSON.stringify({url:location.href,html:document.documentElement.outerHTML})';
const error=code=>Object.assign(Error('Obscura rendering refused: '+code),{code});
const refused=code=>{throw error(code);};
const validPath=p=>typeof p==='string'&&isAbsolute(p)&&p.length<=1024&&!/[\u0000-\u001f\u007f]/.test(p);
const safeCode=e=>typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'OBSCURA_FAILED';

export function createObscuraRenderer({binaryPath,spawnProcess=defaultSpawn,timeoutMs=12000}={}){
 if(!validPath(binaryPath)||typeof spawnProcess!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>20000)refused('OBSCURA_CONFIG');
 let active=false;
 async function render(raw,{signal,allowQuery=false}={}){
  const began=performance.now();
  const url=admitDocumentURL(raw,{allowQuery});
  if(signal?.aborted)refused('CANCELLED');
  if(active)refused('OBSCURA_BUSY');
  active=true;
  try{
   const seconds=Math.max(1,Math.ceil(timeoutMs/1000));
   const args=['--obey-robots','fetch',url,'--wait-until','domcontentloaded','--timeout',String(seconds),'--wait','1','--eval',CAPTURE,'--quiet'];
   // No inherited API keys, HOME, cookies, proxy settings, or private-network override.
   const env={PATH:'/usr/bin:/bin',LANG:'C.UTF-8',OBSCURA_ALLOW_PRIVATE_NETWORK:'0',OBSCURA_SCRIPT_DEADLINE_MS:'4000'};
   const rawResult=await new Promise((resolve,reject)=>{
    let child;try{child=spawnProcess(binaryPath,args,{env,shell:false,stdio:['ignore','pipe','ignore'],windowsHide:true});}catch{reject(error('OBSCURA_SPAWN'));return;}
    let done=false,total=0;const chunks=[];
    const finish=(e,result)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(e)reject(e);else resolve(result);};
    const stop=code=>{finish(error(code));try{child.kill('SIGKILL');}catch{}};
    const abort=()=>stop('CANCELLED');
    const timer=setTimeout(()=>stop('OBSCURA_TIMEOUT'),timeoutMs+1000);
    timer.unref?.();
    signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted){abort();return;}
    child.on('error',()=>finish(error('OBSCURA_SPAWN')));
    child.stdout?.on('data',chunk=>{if(done)return;total+=chunk.length;if(total>MAX_STDOUT_BYTES){stop('OBSCURA_OUTPUT_LIMIT');return;}chunks.push(chunk);});
    child.stdout?.on('error',()=>stop('OBSCURA_STREAM'));
    child.on('close',(code,signalName)=>{if(done)return;if(code!==0||signalName){finish(error('OBSCURA_EXIT'));return;}finish(null,Buffer.concat(chunks,total));});
   });
   let decoded;try{decoded=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(rawResult).trim());}catch{refused('OBSCURA_OUTPUT');}
   if(!decoded||typeof decoded.url!=='string'||decoded.url!==url||typeof decoded.html!=='string')refused('OBSCURA_NAVIGATION');
   const n=Buffer.byteLength(decoded.html);
   if(n<1||n>MAX_DOM_BYTES||!/^<html(?:\s|>)/i.test(decoded.html.trimStart()))refused('OBSCURA_DOM_LIMIT');
   if(signal?.aborted)refused('CANCELLED');
   return Object.freeze({url,html:decoded.html,renderedDomDigest:digest(decoded.html),engine:'obscura',upstreamCommit:OBSCURA_UPSTREAM_COMMIT,binaryAttestation:'not_verified',durationMs:Math.max(0,Math.round(performance.now()-began)),retrievedAt:new Date().toISOString()});
  }finally{active=false;}
 }
 return Object.freeze({render});
}

// Performs existing pinned and robots-admitted retrieval first. Optional rendering is
// a SECOND network navigation, never a replacement for the canonical transport.
// The browser's subresource bytes are NOT covered by Sutra's fixed response ledger.
export function createObscuraEnhancedReader({authorization,renderer,readDocument,renderPolicy='shell'}={}){
 assertResearchAuthorization(authorization);
 if(authorization.plan.scope.allowJsRendering!==true||authorization.plan.scope.allowRedirects!==true||authorization.plan.scope.allowCrossOriginLinks!==true)refused('OBSCURA_SCOPE');
 if(!renderer||typeof renderer.render!=='function'||!['shell','always'].includes(renderPolicy)||readDocument!==undefined&&typeof readDocument!=='function')refused('OBSCURA_CONFIG');
 const staticRead=readDocument??createDocumentReader({authorization}),seenOrigins=new Set();
 let used=0;
 return async function read(raw,options={}){
  const result=await staticRead(raw,options);
  authorization.assertActive();
  if(result.mediaType!=='text/html')return result;
  const isShell=result.text.length<240||/\b(?:enable javascript|loading|requires javascript)\b/i.test(result.text);
  if(renderPolicy==='shell'&&!isShell)return result;
  const origin=new URL(result.finalUrl??result.url).origin;
  if(seenOrigins.has(origin)||used>=3)return result;
  seenOrigins.add(origin);used++;
  const signal=options.signal?AbortSignal.any([authorization.signal,options.signal]):authorization.signal;
  if(signal.aborted)refused('CANCELLED');
  // The byte ledger covers this extra document, not the browser's subresources.
  try{authorization.reserve('document',{bytes:MAX_DOM_BYTES});}
  catch(e){
   if(e?.code!=='BUDGET_EXHAUSTED')throw e;
   return Object.freeze({...result,render:Object.freeze({status:'static_fallback',reason:'BUDGET_EXHAUSTED',secondNavigationPossible:false})});
  }
  // A failing checkpoint/dispatch fence MUST propagate. Never treat it as a
  // harmless browser failure or navigate before this durable fence succeeds.
  if(typeof options.beforeDispatch==='function')await options.beforeDispatch({kind:'obscura_render',url:result.finalUrl??result.url});
  authorization.assertActive();
  try{
   const page=await renderer.render(result.finalUrl??result.url,{signal,allowQuery:authorization.plan.scope.allowPublicQueryParameters===true});
   authorization.assertActive();
   const extracted=extractDocument(Buffer.from(page.html,'utf8'),'text/html',page.url,{allowCrossOriginLinks:true,allowQuery:authorization.plan.scope.allowPublicQueryParameters===true});
   if(extracted.text.length<=result.text.length&&extracted.links.every(link=>result.links.includes(link)))
    return Object.freeze({...result,render:Object.freeze({status:'no_material_gain',engine:'obscura',durationMs:page.durationMs??null,secondNavigation:true,subresourceBytesMetered:false})});
   return Object.freeze({...result,text:extracted.text,textDigest:extracted.textDigest,links:extracted.links,metadata:extracted.metadata,parser:'obscura-dom/v1+bounded-html/v2',
    render:Object.freeze({status:'rendered_unverified',engine:'obscura',upstreamCommit:page.upstreamCommit,renderedDomDigest:page.renderedDomDigest,staticTextDigest:result.textDigest,binaryAttestation:page.binaryAttestation??'not_verified',durationMs:page.durationMs??null,secondNavigation:true,subresourceBytesMetered:false,retrievedAt:page.retrievedAt})});
  }catch(e){
   if(signal.aborted){throw error('CANCELLED');}
   authorization.assertActive();
   return Object.freeze({...result,render:Object.freeze({status:'static_fallback',reason:safeCode(e),secondNavigationPossible:true})});
  }
 };
}
