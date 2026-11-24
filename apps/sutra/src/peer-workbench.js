// Development-only browser workbench: every external peer contact requires an
// explicit visible decision. The chosen peer publishes data; all model steps are scripted.
import {loadLocalNetwork,runNetwork} from '../../../packages/sutra-runtime/index.js';
import {createScriptedModel} from '../../../packages/sutra-runtime/testing.js';
import {createConsentInspector} from '../../../packages/sutra-consent/index.js';
import {serializeSafeTraceReceipt} from '../../../packages/sutra-runtime/trace-export.js';
import {applyScreenState} from './status-state.js';

export function mountPeerWorkbench({root=document,baseUrl=new URL('./agents/',location.href).href}={}){
 const byId=id=>root.querySelector('#'+id);
 const urlInput=byId('peer-url'), runButton=byId('run-peer'),
  status=byId('peer-status'), trace=byId('peer-trace'), consentLog=byId('peer-consent-log');
 const dialog=byId('peer-consent-dialog'),exportButton=byId('export-peer-trace'),
  execState=byId('peer-exec-state'),outcomeState=byId('peer-outcome'),agentBudget=byId('peer-agent-budget'),
  modelBudget=byId('peer-model-budget'),toolCount=byId('peer-tool-count'),
  elapsed=byId('peer-elapsed'),contactCount=byId('peer-contact-count');
 let pendingDecision=null, running=false, activeController=null,lastReceipt=null,runStarted=0,observedTools=0,runCompletedContacts=0;
 const setState=(state,{agentCalls=0,modelCalls=0,outcome=null}={})=>{
  const labels={idle:'Idle',loading:'Loading local network',consent:'Awaiting external approval',completed:'Completed',denied:'Denied',cancelled:'Cancelled',error:'Stopped with error',input_error:'Input required'};
  const outcomes={
   completed:'Completed',
   denied:'Denied before a completed peer result',
   cancelled:'Cancelled before a completed peer result',
   failed:'Failed before a completed peer result',
   partial:'Partial failure — some approved reads completed; no peer result',
   unknown:'Unknown — a side effect may have happened',
  };
  execState.textContent=labels[state]??'Stopped';
  outcomeState.textContent=outcome?outcomes[outcome]??'Stopped without a completed result':
   state==='loading'||state==='consent'?'In progress':state==='input_error'?'Rejected before execution':'Not started';
  applyScreenState(status,state);
  agentBudget.textContent=Math.min(Number.isInteger(agentCalls)?agentCalls:0,12)+' / 12 used';
  modelBudget.textContent=Math.min(Number.isInteger(modelCalls)?modelCalls:0,8)+' / 8 used';
  toolCount.textContent=String(observedTools);
  elapsed.textContent=(runStarted?Math.max(0,Math.round(performance.now()-runStarted)):0)+' ms / 60,000 ms';
  contactCount.textContent=runCompletedContacts+' completed this run';
 };
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
  setState('consent');dialog.showModal();
 })});
 function renderConsentEvents(){
  // The inspector exports only public field labels and decisions, never the
  // full delegated request, credentials or result body.
  consentLog.textContent=JSON.stringify(inspector.exportEvents(),null,2);
 }
 function resetTrace(){trace.replaceChildren();}
 function appendTrace(event){
  if(event.phase!=='start'||!['agent','tool'].includes(event.kind))return;
  const item=document.createElement('li');
  if(event.kind==='agent'){
   const label=event.network==='learner'?'Caller':'Loaded peer';
   item.textContent=label+' · '+(event.network??'network')+' / '+(event.agent??'agent')+' · scripted';
  }else{
   observedTools++;
   item.textContent='Tool · '+(event.tool??'unnamed')+' · '+(event.origin??'local');
  }
  if(trace.childElementCount<24)trace.append(item);
 }
 async function run(){
  if(running)return;
  const peerUrl=urlInput.value.trim();
  if(!peerUrl||peerUrl.length>2048){
   status.textContent='Enter one exact peer network URL (maximum 2,048 characters). No request was made.';
   setState('input_error');return;
  }
  running=true;runButton.disabled=true;lastReceipt=null;exportButton.disabled=true;
  runStarted=performance.now();observedTools=0;runCompletedContacts=0;activeController=new AbortController();
  const currentEvents=[],consentStart=inspector.exportEvents().length;
  resetTrace();setState('loading');
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
   runCompletedContacts=lastReceipt.contactEvents.filter(event=>event.type==='outcome'&&event.status==='completed').length;
   setState('completed',{agentCalls:result.agentCalls,modelCalls:result.modelCalls,outcome:'completed'});
  }catch(error){
   const code=typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]{1,50}$/.test(error.code)?error.code:'STOPPED';
   const contactEvents=inspector.exportEvents().slice(consentStart);
   runCompletedContacts=contactEvents.filter(event=>event.type==='outcome'&&event.status==='completed').length;
   const outcome=code.includes('DENIED')?'denied':code==='CANCELLED'?'cancelled':runCompletedContacts?'partial':'failed';
   lastReceipt={mode:'scripted-test',outcome,
    modelCalls:null,agentCalls:null,events:currentEvents,contactEvents};
   status.textContent='Peer test stopped ('+code+'). '+(outcome==='partial'?'Some approved public reads completed, but no peer result is claimed.':'No completed peer result is claimed.')+' Local lesson and evidence are unaffected.';
   setState(code.includes('DENIED')?'denied':code==='CANCELLED'?'cancelled':'error',{outcome});
  }finally{
   running=false;runButton.disabled=false;activeController=null;
   exportButton.disabled=!lastReceipt;renderConsentEvents();
   setState(status.dataset.state,{agentCalls:lastReceipt?.agentCalls??0,modelCalls:lastReceipt?.modelCalls??0,outcome:lastReceipt?.outcome??null});
   // Return keyboard users to the control that initiated the modal flow.
   if(['denied','error','cancelled'].includes(status.dataset.state))runButton.focus({preventScroll:true});
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
 setState('idle');
 return {dispose(){unload();window.removeEventListener('pagehide',unload);}};
}
