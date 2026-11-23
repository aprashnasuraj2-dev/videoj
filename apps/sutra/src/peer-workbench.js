// Development-only browser workbench: every external peer contact requires an
// explicit visible decision. The chosen peer publishes data; all model steps are scripted.
import {loadLocalNetwork,runNetwork} from '../../../packages/sutra-runtime/index.js';
import {createScriptedModel} from '../../../packages/sutra-runtime/testing.js';
import {createConsentInspector} from '../../../packages/sutra-consent/index.js';

export function mountPeerWorkbench({root=document,baseUrl=new URL('./agents/',location.href).href}={}){
 const byId=id=>root.querySelector('#'+id);
 const urlInput=byId('peer-url'), runButton=byId('run-peer'),
  status=byId('peer-status'), trace=byId('peer-trace'), consentLog=byId('peer-consent-log');
 const dialog=byId('peer-consent-dialog');
 let pendingDecision=null, running=false, activeController=null;
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
  running=true;runButton.disabled=true;
  activeController=new AbortController();
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
    onEvent:appendTrace
   });
   status.textContent='Scripted peer test complete: '+result.agentCalls+
    ' caller-local agent invocations and '+result.modelCalls+
    ' scripted model steps. Public graph data only; no live inference or factual verification.';
  }catch(error){
   const code=typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]{1,50}$/.test(error.code)?error.code:'STOPPED';
   status.textContent='Peer test stopped ('+code+'). No completed peer result is claimed. Local lesson and evidence are unaffected.';
  }finally{
   running=false;runButton.disabled=false;activeController=null;
   renderConsentEvents();
  }
 }
 runButton.addEventListener('click',run);
 const unload=()=>{
  activeController?.abort();
  finish('deny');
  inspector.clearSession();
 };
 window.addEventListener('pagehide',unload);
 return {dispose(){unload();window.removeEventListener('pagehide',unload);}};
}
