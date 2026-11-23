// Development-only browser workbench: every external peer contact requires an
// explicit visible decision. The chosen peer publishes data; all model steps are scripted.
import {loadLocalNetwork,runNetwork} from '../../../packages/sutra-runtime/index.js';
import {createScriptedModel} from '../../../packages/sutra-runtime/testing.js';
import {createConsentInspector} from '../../../packages/sutra-consent/index.js';
import {serializeSafeTraceReceipt} from '../../../packages/sutra-runtime/trace-export.js';

export function mountPeerWorkbench({root=document,baseUrl=new URL('./agents/',location.href).href}={}){
 const byId=id=>root.querySelector('#'+id);
 const urlInput=byId('peer-url'), runButton=byId('run-peer'),
  status=byId('peer-status'), trace=byId('peer-trace'), consentLog=byId('peer-consent-log');
 const dialog=byId('peer-consent-dialog'),exportButton=byId('export-peer-trace');
 let pendingDecision=null, running=false, activeController=null,lastReceipt=null;
 const finish=(decision,scope='once')=>{
  if(!pendingDecision)return;
  const resolve=pendingDecision;pendingDecision=null;
  if(dialog.open)dialog.close();
  resolve({decision,scope});
 };
 dialog.addEventListener('cancel',event=>{event.preventDefault();finish('deny');});
 byId('peer-deny').addEventListener('click',()=>finish('deny'));
 byId('peer-allow-once').addEventListener('click',()=>finish('allow','once'));
 byId('peer-allow-session').addEventListener('click',()=>finish('allow','session'));

 const inspector=createConsentInspector({decide:intent=>new Promise(resolve=>{
  if(pendingDecision){resolve({decision:'deny',scope:'once'});return;}
  pendingDecision=resolve;
  byId('peer-origin').textContent=intent.origin;
  byId('peer-purpose').textContent=intent.purpose;
  byId('peer-disclosure').textContent=intent.disclosure.join(', ');
  byId('peer-contact-kind').textContent=intent.kind==='peer_manifest'?'Manifest':'Declared graph';
  dialog.showModal();
 })});
 function renderConsentEvents(){
  // The inspector exports only public field labels and decisions, never the
  // full delegated request, credentials or result body.
  consentLog.textContent=JSON.stringify(inspector.exportEvents(),null,2);
 }
 function resetTrace(){trace.replaceChildren();}
 function appendTrace(event){
  if(event.kind!=='agent'||event.phase!=='start')return;
  const item=document.createElement('li');
  const label=event.network==='learner'?'Caller':'Loaded peer';
  item.textContent=label+' · '+(event.network??'network')+' / '+(event.agent??'agent')+' · scripted';
  if(trace.childElementCount<24)trace.append(item);
 }
 async function run(){
  if(running)return;
  const peerUrl=urlInput.value.trim();
  if(!peerUrl||peerUrl.length>2048){
   status.textContent='Enter one exact peer network URL (maximum 2,048 characters). No request was made.';
   return;
  }
  running=true;runButton.disabled=true;lastReceipt=null;exportButton.disabled=true;
  activeController=new AbortController();
  const currentEvents=[],consentStart=inspector.exportEvents().length;
  resetTrace();
  status.textContent='Checking the local learner network. No external contact occurs before approval.';
  try{
   // The publication loader and runtime validate the exact peer URL. Never
   // fetch an arbitrary user-provided destination on the workbench's behalf.
   const published=await loadLocalNetwork({
    baseUrl,expectedOrigin:location.origin,fetchImpl:fetch,signal:activeController.signal
   });
   published.definition.tools[0].tools=[peerUrl];
   const result=await runNetwork({
    ...published,
    request:'Inspect the synthetic checklist state; do not claim factual review.',
    model:createScriptedModel(),
    peerRuntime:{inspector},
    signal:activeController.signal,
    onEvent:event=>{if(currentEvents.length<512)currentEvents.push(event);appendTrace(event);}
   });
   lastReceipt={mode:result.mode,outcome:'completed',modelCalls:result.modelCalls,
    agentCalls:result.agentCalls,events:result.events,
    contactEvents:inspector.exportEvents().slice(consentStart)};
   status.textContent='Scripted peer test complete: '+result.agentCalls+
    ' caller-local agent invocations and '+result.modelCalls+
    ' scripted model steps. Public graph data only; no live inference or factual verification.';
  }catch(error){
   const code=typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]{1,50}$/.test(error.code)?error.code:'STOPPED';
   lastReceipt={mode:'scripted-test',
    outcome:code.includes('DENIED')?'denied':code==='CANCELLED'?'cancelled':'failed',
    modelCalls:null,agentCalls:null,events:currentEvents,
    contactEvents:inspector.exportEvents().slice(consentStart)};
   status.textContent='Peer test stopped ('+code+'). No completed peer result is claimed. Local lesson and evidence are unaffected.';
  }finally{
   running=false;runButton.disabled=false;activeController=null;
   exportButton.disabled=!lastReceipt;renderConsentEvents();
  }
 }
 runButton.addEventListener('click',run);
 exportButton.addEventListener('click',()=>{
  if(!lastReceipt)return;
  const json=serializeSafeTraceReceipt(lastReceipt);
  const objectUrl=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=objectUrl;link.download='sutra-peer-sanitized-trace.json';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
 });
 const unload=()=>{
  activeController?.abort();
  finish('deny');
  inspector.clearSession();
 };
 window.addEventListener('pagehide',unload);
 return {dispose(){unload();window.removeEventListener('pagehide',unload);}};
}
