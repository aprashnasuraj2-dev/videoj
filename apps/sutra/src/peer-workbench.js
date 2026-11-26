// Development-only browser workbench: every external peer contact requires an
// explicit visible decision. The chosen peer publishes data; all model steps are scripted.
import {loadLocalNetwork,runNetwork} from '../../../packages/sutra-runtime/index.js';
import {createScriptedModel} from '../../../packages/sutra-runtime/testing.js';
import {createConsentInspector} from '../../../packages/sutra-consent/index.js';
import {serializeSafeTraceReceipt} from '../../../packages/sutra-runtime/trace-export.js';
import {applyScreenState} from './status-state.js';

export function mountPeerWorkbench({root=document,baseUrl=new URL('./agents/',location.href).href}={}){
 const byId=id=>root.querySelector('#'+id);
 const urlInput=byId('peer-url'), runButton=byId('run-peer'),cancelButton=byId('cancel-peer'),
  status=byId('peer-status'), trace=byId('peer-trace'), consentLog=byId('peer-consent-log');
 const dialog=byId('peer-consent-dialog'),exportButton=byId('export-peer-trace'),
  execState=byId('peer-exec-state'),outcomeState=byId('peer-outcome'),agentBudget=byId('peer-agent-budget'),
  modelBudget=byId('peer-model-budget'),toolCount=byId('peer-tool-count'),
  elapsed=byId('peer-elapsed'),contactCount=byId('peer-contact-count');
 let pendingDecision=null,activeRun=null,disposed=false,lastReceipt=null,runStarted=0,observedTools=0,runCompletedContacts=0;
 const listenerController=new AbortController(),listen=(node,event,fn)=>node.addEventListener(event,fn,{signal:listenerController.signal});
 const setRunning=running=>{runButton.disabled=running;urlInput.disabled=running;cancelButton.hidden=!running;cancelButton.disabled=false;};
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
  const elapsedMs=runStarted?Math.max(0,Math.round(performance.now()-runStarted)):0;
  elapsed.dataset.formatMsPair='true';elapsed.dataset.formatCurrentMs=String(elapsedMs);elapsed.dataset.formatLimitMs='60000';
  elapsed.textContent=elapsedMs+' ms / 60,000 ms';
  contactCount.textContent=runCompletedContacts+' completed this run';
 };
 const finish=(decision,scope='once',expected=pendingDecision)=>{
  if(!expected||pendingDecision!==expected)return;
  pendingDecision=null;expected.signal?.removeEventListener('abort',expected.abort);
  const allowed=decision==='allow'&&activeRun===expected.run&&!expected.signal?.aborted&&!expected.run.controller.signal.aborted;
  if(dialog.open)dialog.close();
  byId('peer-resource').textContent='';
  if(allowed){setState('loading');status.textContent='Approved public artifact read in progress…';}
  expected.resolve({decision:allowed?'allow':'deny',scope:allowed?scope:'once'});
 };
 listen(dialog,'cancel',event=>{event.preventDefault();finish('deny');});
 listen(dialog,'close',()=>{if(!dialog.open&&pendingDecision)finish('deny');});
 listen(byId('peer-deny'),'click',()=>finish('deny'));
 listen(byId('peer-allow-once'),'click',()=>finish('allow','once'));
 listen(byId('peer-allow-session'),'click',()=>finish('allow','session'));
 listen(cancelButton,'click',()=>{if(activeRun){activeRun.controller.abort();cancelButton.disabled=true;}});

 const inspector=createConsentInspector({decide:(intent,{signal}={})=>new Promise(resolve=>{
  const run=activeRun;
  if(!run||disposed||run.controller.signal.aborted||signal?.aborted||pendingDecision){resolve({decision:'deny',scope:'once'});return;}
  const entry={run,signal,resolve,abort:null};entry.abort=()=>finish('deny','once',entry);pendingDecision=entry;
  signal?.addEventListener('abort',entry.abort,{once:true});
  byId('peer-origin').textContent=intent.origin;
  byId('peer-resource').textContent=intent.resource??'Exact origin only';
  byId('peer-purpose').textContent=intent.purpose;
  byId('peer-disclosure').textContent=intent.disclosure.join(', ');
  byId('peer-contact-kind').textContent=intent.kind==='peer_manifest'?'Manifest':'Declared graph';
  setState('consent');
  try{dialog.showModal();byId('peer-deny').focus();}catch{finish('deny','once',entry);}
 })});
 function renderConsentEvents(events=[]){
  // Per-run observer, independent of the bounded history in the shared inspector.
  consentLog.textContent=JSON.stringify(events,null,2);
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
  if(activeRun||disposed)return;
  const peerUrl=urlInput.value.trim();
  if(!peerUrl||peerUrl.length>2048){
   status.textContent='Enter one exact peer network URL (maximum 2,048 characters). No request was made.';
   setState('input_error');return;
  }
  const op={controller:new AbortController(),events:[],contacts:[]};
  activeRun=op;setRunning(true);lastReceipt=null;exportButton.disabled=true;
  runStarted=performance.now();observedTools=0;runCompletedContacts=0;
  const current=()=>activeRun===op&&!disposed;
  // The session inspector remembers exact grants, but each operation receives
  // its own events even if the inspector's bounded global history is full.
  const runInspector=Object.freeze({perform(input,effect,options={}){
   return inspector.perform(input,effect,{...options,onEvent:event=>{if(op.contacts.length<512)op.contacts.push(event);}});
  }});
  resetTrace();renderConsentEvents();setState('loading');
  status.textContent='Checking the local learner network. No external contact occurs before approval.';
  try{
   const published=await loadLocalNetwork({baseUrl,expectedOrigin:location.origin,fetchImpl:fetch,signal:op.controller.signal});
   if(!current())return;op.controller.signal.throwIfAborted();
   published.definition.tools[0].tools=[peerUrl];
   const result=await runNetwork({
    ...published,request:'Inspect the synthetic checklist state; do not claim factual review.',model:createScriptedModel(),
    peerRuntime:{inspector:runInspector},signal:op.controller.signal,
    onEvent:event=>{if(!current()||op.controller.signal.aborted)return;if(op.events.length<512)op.events.push(event);appendTrace(event);}
   });
   if(!current())return;op.controller.signal.throwIfAborted();
   lastReceipt={mode:result.mode,outcome:'completed',modelCalls:result.modelCalls,agentCalls:result.agentCalls,events:result.events,contactEvents:[...op.contacts]};
   status.textContent='Scripted peer test complete: '+result.agentCalls+
    ' caller-local agent invocations and '+result.modelCalls+
    ' scripted model steps. Public graph data only; no live inference or factual verification.';
   runCompletedContacts=lastReceipt.contactEvents.filter(event=>event.type==='outcome'&&event.status==='completed').length;
   setState('completed',{agentCalls:result.agentCalls,modelCalls:result.modelCalls,outcome:'completed'});
  }catch(error){
   if(!current())return;
   const code=op.controller.signal.aborted?'CANCELLED':typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]{1,50}$/.test(error.code)?error.code:'STOPPED';
   const contactEvents=[...op.contacts];
   runCompletedContacts=contactEvents.filter(event=>event.type==='outcome'&&event.status==='completed').length;
   const outcome=code.includes('DENIED')?'denied':code==='CANCELLED'||code.endsWith('_CANCELLED')?'cancelled':runCompletedContacts?'partial':'failed';
   lastReceipt={mode:'scripted-test',outcome,modelCalls:error?.diagnostics?.modelCalls??null,agentCalls:error?.diagnostics?.agentCalls??null,reason:code,events:[...op.events],contactEvents};
   status.textContent='Peer test stopped ('+code+'). '+(runCompletedContacts?'Some approved public reads completed, but no peer result is claimed.':outcome==='cancelled'?'An already approved read may have been initiated; no completed peer result is claimed.':'No completed peer result is claimed.')+' Local lesson and evidence are unaffected.';
   setState(outcome==='denied'?'denied':outcome==='cancelled'?'cancelled':'error',{outcome});
  }finally{
   if(current()){
    finish('deny');activeRun=null;setRunning(false);
    exportButton.disabled=!lastReceipt;renderConsentEvents(lastReceipt?.contactEvents??[]);
    setState(status.dataset.state,{agentCalls:lastReceipt?.agentCalls??0,modelCalls:lastReceipt?.modelCalls??0,outcome:lastReceipt?.outcome??null});
    if(['denied','error','cancelled'].includes(status.dataset.state))runButton.focus({preventScroll:true});
   }
  }
 }
 listen(runButton,'click',run);
 listen(exportButton,'click',()=>{
  if(!lastReceipt)return;
  const json=serializeSafeTraceReceipt(lastReceipt);
  const objectUrl=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=objectUrl;link.download='sutra-peer-sanitized-trace.json';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
 });
 const unload=()=>{
  const previous=activeRun;activeRun=null;
  previous?.controller.abort();inspector.clearSession();finish('deny');
  setRunning(false);
  if(previous){
   lastReceipt=null;exportButton.disabled=true;resetTrace();renderConsentEvents();
   runCompletedContacts=0;observedTools=0;runStarted=0;
   setState('cancelled',{outcome:'cancelled'});
   status.textContent='Peer execution stopped on navigation. An already approved read may have occurred; no completed peer result is claimed.';
  }
 };
 listen(window,'pagehide',unload);
 setRunning(false);setState('idle');
 return {dispose(){if(disposed)return;unload();disposed=true;listenerController.abort();}};
}
