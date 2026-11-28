// Shared, model-free, operator-approved web tool for user, deterministic engine and agent proposals.
// The three callers share ONE transport/evidence contract. A proposal never grants egress.
import {randomUUID} from 'node:crypto';
import {admitDocumentURL} from './dynamic-public-route-policy.js';
import {admitManifest,authorizeResearch,digest,secretLike} from './research-session.js';
import {createDocumentReader} from './document-reader.js';
import {createSearchProviders,SEARCH_BYTES} from './providers.js';
import {selectResearchBackends} from './research-source-router.js';
import {createObscuraEnhancedReader} from './obscura-adapter.js';

const fail=c=>{throw Object.assign(Error('SUTRA web access refused: '+c),{code:c});};
const EXACT=(v,fields)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===fields.length&&fields.every(k=>Object.hasOwn(v,k));
const active=s=>s&&['running','cancelling'].includes(s.state);
const safeCode=e=>typeof e?.code==='string'&&/^[A-Z_]{1,60}$/.test(e.code)?e.code:'WEB_OPERATION_FAILED';
const actors=Object.freeze(['user','engine','agent']);
const budget=Object.freeze({maxSearches:5,maxDocuments:3,maxLinkDepth:0,maxDurationSeconds:90,maxDownloadBytes:2097152,maxCostMicros:100000});
const SAFE_TYPES=new Set(['text/html','text/plain','application/json','text/csv']);
const MAX_RESULT_CHARS=100000;
const readInput=(input,actor,backends,hasRenderer)=>{
 if(!actors.includes(actor)||!EXACT(input,['operation','resource','backend','render']))fail('WEB_REQUEST');
 if(!['fetch','search'].includes(input.operation)||typeof input.resource!=='string'||input.resource.trim()!==input.resource||!input.resource||input.resource.length>1200||secretLike(input.resource)||/[\u0000-\u001f\u007f]/.test(input.resource)||typeof input.render!=='boolean')fail('WEB_REQUEST');
 if(input.operation==='fetch'){
  if(input.backend!==null||input.render&&!hasRenderer)fail('WEB_CAPABILITY');
  return Object.freeze({...input,resource:admitDocumentURL(input.resource,{allowQuery:true})});
 }
 if(!['auto',...backends].includes(input.backend)||input.render||input.resource.length>1000)fail('WEB_CAPABILITY');
 return Object.freeze({...input});
};
function sanitizedDocument(doc,request){
 if(!doc||doc.url!==request||typeof doc.text!=='string'||doc.textDigest!==digest(doc.text)||typeof doc.rawDigest!=='string'||!/^sha256:[0-9a-f]{64}$/.test(doc.rawDigest)||!SAFE_TYPES.has(doc.mediaType)||!Array.isArray(doc.links))fail('WEB_DOCUMENT');
 const final=admitDocumentURL(doc.finalUrl??doc.url,{allowQuery:true});
 const chain=doc.redirectChain??[];
 if(!Array.isArray(chain)||chain.length>3||chain.some((hop,i)=>!hop||![301,302,303,307,308].includes(hop.status)||admitDocumentURL(hop.from,{allowQuery:true})!==(i?chain[i-1].to:request)||admitDocumentURL(hop.to,{allowQuery:true})!==hop.to)||(chain.length&&chain.at(-1).to!==final)||!chain.length&&final!==request)fail('WEB_DOCUMENT');
 if(doc.links.length>40||typeof doc.retrievedAt!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(doc.retrievedAt)||!Number.isFinite(Date.parse(doc.retrievedAt)))fail('WEB_DOCUMENT');
 const links=[];
 for(const value of doc.links){const u=admitDocumentURL(value,{allowQuery:true});if(!links.includes(u))links.push(u);}
 const text=doc.text.slice(0,MAX_RESULT_CHARS),truncated=doc.text.length!==text.length;
 const metadata={};for(const key of ['title','author','article:published_time','date','og:title'])if(typeof doc.metadata?.[key]==='string'&&!secretLike(doc.metadata[key]))metadata[key]=doc.metadata[key].slice(0,300);
 const render=doc.render&&typeof doc.render==='object'?Object.fromEntries(['status','reason','engine','upstreamCommit','renderedDomDigest','staticTextDigest','binaryAttestation','durationMs','secondNavigation','secondNavigationPossible','subresourceBytesMetered','retrievedAt'].filter(k=>['string','boolean','number'].includes(typeof doc.render[k])&&String(doc.render[k]).length<=200).map(k=>[k,doc.render[k]])):null;
 return Object.freeze({id:'source_1',url:request,finalUrl:final,redirectChain:chain,mediaType:doc.mediaType,rawDigest:doc.rawDigest,fullTextDigest:doc.textDigest,textDigest:digest(text),text,extractionTruncated:truncated,links,metadata,parser:typeof doc.parser==='string'?doc.parser.slice(0,80):'unknown',retrievedAt:doc.retrievedAt,render,verificationStatus:'unverified_public_extraction'});
}
function sanitizedDiscovery(rows,backend){
 if(!Array.isArray(rows)||rows.length>10)fail('WEB_SEARCH_RESULT');
 const seen=new Set(),out=[];
 for(const row of rows){
  if(typeof row?.url!=='string')continue;
  let url;try{url=admitDocumentURL(row.url,{allowQuery:true});}catch{continue;}
  if(seen.has(url))continue;seen.add(url);
  const t=typeof row.title==='string'&&!secretLike(row.title)?row.title.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,300):'';
  out.push({url,title:t,provider:backend,rank:out.length+1,verificationStatus:'discovery_only_not_evidence'});
 }
 return out;
}
export function createOnDemandWebAccess({searchCredentials={},renderer=null,makeReader,makeProviders=createSearchProviders,clock=()=>Date.now(),isBusy=()=>false}={}){
 const available=Object.freeze(Object.keys(createSearchProviders({credentials:searchCredentials})));

 if(makeReader!==undefined&&typeof makeReader!=='function'||typeof makeProviders!=='function'||typeof clock!=='function'||typeof isBusy!=='function')fail('WEB_CONFIG');
 let previewed=null,current=null,closed=false;
 const check=()=>{if(closed)fail('WEB_CLOSED');};
 const capabilities=()=>Object.freeze({schema:'sutra-web-access-capabilities/v1',actors,operations:['fetch','search'],searchBackends:['auto',...available],staticHttp:'pinned_https_robots',jsRendering:renderer?'local_experimental':'unavailable',maxConcurrentOperations:1,authority:'NONE'});
 function preview(input,{actor='user'}={}){
  check();if(isBusy()||active(current))fail('WEB_BUSY');
  const q=readInput(input,actor,available,Boolean(renderer));
  const isSearch=q.operation==='search',raw=JSON.stringify({
   schema:'sutra-autonomous-research/v1',
   objective:isSearch?q.resource:'Operator-reviewed public source retrieval',
   scope:{publicWeb:true,queryDisclosureAllowed:true,allowPrivateNetworks:false,allowAuthentication:false,allowExternalWrites:false,privateEvidenceDisclosureAllowed:false,allowCrossOriginLinks:true,allowRedirects:true,allowPublicQueryParameters:true,allowDirectPublicUrls:true,...(q.render?{allowJsRendering:true}:{})},
   budget:{...budget},providers:isSearch?(q.backend==='auto'?selectResearchBackends(q.resource,available,{max:5}).providers:[q.backend]).map(id=>({id,estimatedMaxCostMicros:['brave','tavily'].includes(id)?5000:1})):[]
  });
  const manifest=admitManifest(raw),expiresAt=clock()+120000;
  if(!Number.isSafeInteger(expiresAt))fail('WEB_CLOCK');
  const approvalId=randomUUID(),requestPin=digest(JSON.stringify({actor,...q,planPin:manifest.planPin}));
  previewed={raw,request:q,actor,approvalId,requestPin,expiresAt,planPin:manifest.planPin};
  return Object.freeze({schema:'sutra-web-access-preview/v1',actor,request:q,planPin:manifest.planPin,requestPin,approvalId,expiresAt,scope:manifest.plan.scope,budget:manifest.plan.budget,disclosure:isSearch?'Public query disclosed only to the selected search backend':'Public HTTPS URL contacted without credentials',caveat:q.render?'A second native-browser navigation may fetch unmetered public subresources; local sandbox required':'No browser JavaScript executed',authority:'NONE'});
 }
 async function execute(session,proposal){
  let a;
  const operationStartedAt=performance.now();
  try{
   a=authorizeResearch(proposal.raw,{approvedPlanPin:proposal.planPin,approvePublicContact:true,approveEstimatedCost:true,signal:session.controller.signal});
   a.assertActive();
   let report;
   if(proposal.request.operation==='search'){
    const providers=makeProviders({credentials:searchCredentials});
    const selected=proposal.request.backend==='auto'
     ?selectResearchBackends(proposal.request.resource,available,{max:5}).providers
     :[proposal.request.backend];
    const failures=[],results=[],seen=new Set(),used=[];
    for(const id of selected){
     a.assertActive();
     const provider=providers[id];
     if(!provider||typeof provider.search!=='function'){failures.push({provider:id,code:'WEB_PROVIDER'});continue;}
     a.reserve('search',{bytes:SEARCH_BYTES,costMicros:['brave','tavily'].includes(id)?5000:1});
     used.push(id);session.dispatchAttempted=true;
     try{
      const rows=await provider.search(proposal.request.resource,{signal:a.signal});
      a.assertActive();
      const found=sanitizedDiscovery(rows,id);
      for(const row of found.slice(0,proposal.request.backend==='auto'?3:10)){
       if(!seen.has(row.url)&&results.length<15){seen.add(row.url);results.push(row);}
      }
     }catch(e){
      a.assertActive();failures.push({provider:id,code:safeCode(e)});
     }
    }
    if(!results.length&&failures.length===selected.length)fail('WEB_SEARCH_UNAVAILABLE');
    report={schema:'sutra-web-access-result/v1',actor:proposal.actor,operation:'search',request:proposal.request,results:results.slice(0,15),documents:[],searchedBackends:used,providerFailures:failures,qualification:'Federated searches are discovery candidates; publishers and full texts require subsequent public retrieval.'};
   }else{
    const reader=makeReader?makeReader({authorization:a,render:proposal.request.render}):proposal.request.render?createObscuraEnhancedReader({authorization:a,renderer,renderPolicy:'always'}):createDocumentReader({authorization:a});
    if(typeof reader!=='function')fail('WEB_READER');
    // The reader owns robots, redirect, DNS/TLS peer checks, reservations, and per-origin throttle.
    const doc=await reader(proposal.request.resource,{signal:a.signal,beforeDispatch:async()=>{session.dispatchAttempted=true;a.assertActive();}});
    a.assertActive();
    report={schema:'sutra-web-access-result/v1',actor:proposal.actor,operation:'fetch',request:proposal.request,results:[],documents:[sanitizedDocument(doc,proposal.request.resource)],qualification:'Exact public source extraction, not empirical truth, source authenticity, or permission for external action.'};
   }
   a.assertActive();if(session.controller.signal.aborted||session.state!=='running')return;
   report={...report,usage:a.usage(),metrics:{durationMs:Math.max(0,Math.round(performance.now()-operationStartedAt)),reservedResponseBytes:a.usage().reservedBytes,actualNetworkBytes:null,cacheStatus:'not_used',browserSubresourceBytesMeasured:false},retrievedAt:new Date(clock()).toISOString(),authority:'NONE'};
   const bytes=JSON.stringify(report);if(Buffer.byteLength(bytes)>524288)fail('WEB_REPORT_SIZE');
   session.report=report;session.reportPin=digest(bytes);session.state='closed';
  }catch(e){
   session.state=session.controller.signal.aborted?'cancelled':'failed';
   session.reason=session.controller.signal.aborted?'CANCELLED':safeCode(e);
   session.outcome=session.dispatchAttempted?'external_contact_attempted_outcome_may_be_unknown':'no_external_contact_attempted';
  }finally{a?.close();}
 }
 function start(input){
  check();if(isBusy()||active(current))fail('WEB_BUSY');
  if(!EXACT(input,['planPin','requestPin','approvalId','approvePublicContact','approveEstimatedCost'])||input.approvePublicContact!==true||input.approveEstimatedCost!==true||!previewed||previewed.planPin!==input.planPin||previewed.requestPin!==input.requestPin||previewed.approvalId!==input.approvalId||clock()>=previewed.expiresAt)fail('WEB_APPROVAL');
  const proposal=previewed;previewed=null;
  const session={sessionId:'web_'+randomUUID(),planPin:proposal.planPin,requestPin:proposal.requestPin,state:'running',controller:new AbortController(),report:null,reportPin:null,reason:null,outcome:null,dispatchAttempted:false};
  current=session;void execute(session,proposal);return Object.freeze({sessionId:session.sessionId,planPin:session.planPin,requestPin:session.requestPin,state:session.state});
 }

 // Runtime-owned scope: a trusted user/agent/engine session may invoke a public
 // read/search without manufacturing a new human approval on every tool call.
 // The local host must never accept an arbitrary caller-supplied actor.
 function autoStart(input,{actor='user'}={}){
  check();if(isBusy()||active(current))fail('WEB_BUSY');
  const p=preview(input,{actor});
  return start({planPin:p.planPin,requestPin:p.requestPin,approvalId:p.approvalId,approvePublicContact:true,approveEstimatedCost:true});
 }
 function status(sessionId){
  check();if(!current||sessionId!==current.sessionId)fail('WEB_SESSION');
  const s=current;return Object.freeze({sessionId:s.sessionId,planPin:s.planPin,requestPin:s.requestPin,state:s.state,reason:s.reason,outcome:s.outcome,report:s.state==='closed'?s.report:null,reportPin:s.state==='closed'?s.reportPin:null});
 }
 function cancel(sessionId){
  check();if(!current||sessionId!==current.sessionId)fail('WEB_SESSION');
  if(current.state==='running'){current.state='cancelling';current.controller.abort();}
  return {sessionId,state:current.state};
 }
 return Object.freeze({capabilities,preview,start,autoStart,status,cancel,isBusy:()=>active(current),close(){closed=true;previewed=null;if(active(current)){current.state='cancelling';current.controller.abort();}}});
}
