import {discoverProvider,runProviderLesson} from './provider-run.js';
import {applyScreenState} from './status-state.js';
import {createReceiptActionRow,createReceiptSeekScope} from './receipt-actions.js';
import {executionLimits} from '../../../packages/sutra-runtime/index.js';

export function mountProviderPanel({loadedContent,seekTo,prepareReview,origin=location.origin,onTelemetry=()=>{}}){
 const sources=loadedContent.sources;
 const $=id=>document.getElementById(id);
 const check=$('provider-check'),run=$('provider-run'),cancel=$('provider-cancel'),question=$('provider-question'),status=$('provider-status'),output=$('provider-output'),answer=$('provider-answer'),list=$('provider-receipts'),webList=$('provider-web-receipts'),metrics=$('provider-metrics'),resultContextLabel=$('provider-result-context'),actionStatus=$('provider-action-status');
 const consentDialog=$('provider-consent-dialog'),consentBackend=$('provider-consent-backend'),consentModel=$('provider-consent-model'),consentChars=$('provider-consent-chars'),consentQuestion=$('provider-consent-question'),consentBudget=$('provider-consent-budget'),consentResearch=$('provider-consent-research'),consentData=$('provider-consent-data'),consentDeny=$('provider-consent-deny'),consentAllow=$('provider-consent-allow');
 const runtimeBounds=executionLimits();
 let model=null,approvedContract=null,active=null,pendingApproval=null,epoch=0,resultContext=null,actionsRevoked=false;
 const set=(s,m)=>applyScreenState(status,s,m);
 const seekScope=createReceiptSeekScope();
 const clear=()=>{seekScope.cancel();epoch++;resultContext=null;actionsRevoked=false;output.hidden=true;answer.textContent='';list.replaceChildren();webList.replaceChildren();metrics.textContent='';actionStatus.textContent='';resultContextLabel.textContent='';};
 // Preserve earlier source text but do not resurrect its action authority after an edit or rediscovery.
 function revokeResultActions(){
  if(!resultContext||actionsRevoked)return;
  seekScope.cancel();actionsRevoked=true;epoch++;actionStatus.textContent='Earlier source excerpts remain visible; these actions are no longer active. Find the excerpt locally or run again explicitly.';
  for(const button of list.querySelectorAll('button')){button.dataset.sutraRevoked='true';button.disabled=true;}
 }
 function labelResult(){
  if(!resultContext)return;
  const context=resultContext,earlierQuestion=context.question!==question.value,earlierConfiguration=context.contract!==approvedContract;
  const scope=earlierQuestion?'Earlier run for a different question. Not an answer to the current question. ':earlierConfiguration?'Earlier run under its previously approved configuration. Not a result from the current configuration. ':active||pendingApproval?'Earlier run; the new run has not replaced it yet. ':'Last run for this question. ';
  resultContextLabel.textContent=scope+(context.complete?'Completed interpretation, unverified. ':'Incomplete run; independently matched receipts only. ')+context.contract.model+' ('+(context.contract.backend==='self_hosted'?'operator self-hosted':'external hosted')+').';
 }
 function identifyResult(approval,complete){resultContext=Object.freeze({question:approval.question,contract:approval.contract,complete});labelResult();}
 function renderReceipts(receipts){
  const current=epoch;
  for(const receipt of receipts){
   const row=createReceiptActionRow({receipt,sources,seekTo,prepareReview,actionStatus,seekScope,isCurrent:()=>current===epoch&&!active&&!pendingApproval,seekLabel:'Seek to retrieved cue',reviewLabel:'Preview retrieved review card'});
   if(row)list.append(row);
  }
  if(!list.children.length){const li=document.createElement('li');li.textContent='No current catalog-matched source receipt is available. Do not treat model interpretation as evidence.';list.append(li);}
 }
 function renderWebResearch(webResearch){
  webList.replaceChildren();
  const receipts=Array.isArray(webResearch?.receipts)?webResearch.receipts:[];
  for(const receipt of receipts){
   if(!receipt||typeof receipt.url!=='string'||typeof receipt.excerpt!=='string')continue;
   const li=document.createElement('li'),title=document.createElement('strong'),excerpt=document.createElement('p'),link=document.createElement('a');
   title.textContent=receipt.title||receipt.url;excerpt.textContent=receipt.excerpt;
   link.href=receipt.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open public source';
   li.append(title,document.createTextNode(' · '),link,excerpt);
   if(receipt.truncated){const note=document.createElement('p');note.className='muted';note.textContent='Displayed evidence is a bounded excerpt of the retrieved source.';li.append(note);}
   webList.append(li);
  }
  if(!webList.children.length){const li=document.createElement('li');li.textContent='No external public source was read during this run.';webList.append(li);}
 }
 function controls(){
  const waiting=!!pendingApproval;
  check.disabled=!!active||waiting;
  run.disabled=!!active||waiting||!model;
  cancel.disabled=!active||active.kind!=='run'||active.controller.signal.aborted;
  question.disabled=!!active||waiting||!model;
  labelResult();
 }
 function closeConsent(){
  pendingApproval=null;consentQuestion.textContent='';
  if(consentDialog.open)consentDialog.close();
  controls();
 }
 function denyConsent(){
  if(!pendingApproval)return;
  closeConsent();
  set('cancelled','Inference not started. Your question was not sent to a model. The local lesson remains available.');
  run.focus();
 }
 async function executeApprovedRun(approval){
  if(active||!approval||approval.contract!==approvedContract||approval.model!==model||approval.question!==question.value){
   set('error','Inference approval became stale. Check availability and review the run again. No model request was made.');
   model=null;approvedContract=null;controls();return;
  }
  if(seekScope.cancel())actionStatus.textContent='Earlier cue seek cancelled; no seek success is claimed.';
  const operation={kind:'run',controller:new AbortController(),started:false};active=operation;controls();
  set('running','Rechecking the approved configuration. Previous results remain visible until a new model request starts…');
  try{
   const result=await runProviderLesson({origin,approvedContract,loadedContent,question:approval.question,signal:operation.controller.signal,onModelStart:()=>{if(active!==operation)return;operation.started=true;clear();set('running','Running the configured model and bounded source tools…');}});
   if(active!==operation)return;
   if(operation.controller.signal.aborted)throw Error('cancelled');
   identifyResult(approval,true);answer.textContent=result.text;
   renderReceipts(result.receipts);renderWebResearch(result.webResearch);
   const u=result.usage,w=result.webResearch;metrics.textContent=result.agentCalls+' agent invocations · '+result.modelCalls+' model calls · '+u.reported+'/'+u.calls+' calls reported token usage. '+(u.complete?'Reported input/output/total tokens: '+u.promptTokens+'/'+u.completionTokens+'/'+u.totalTokens+'.':'Usage incomplete; total run cost is unknown.')+' Public web capability: '+(w?String(w.providerCalls)+' provider calls, '+String(w.receipts?.length??0)+' sources read.':'disabled or unused')+'. Per-call latency: '+u.requests.map(row=>row.latencyMs+' ms').join(', ')+'. No automatic retries.';
   try{onTelemetry({outcome:'completed',backend:approval.contract.backend,model:result.model,usage:u});}catch{}
   output.hidden=false;set('completed','Model run completed. Interpretation remains unverified; retrieved receipts establish catalog consistency only.');
  }catch(error){
   if(active!==operation)return;
   if(operation.started)clear();const cancelled=operation.controller.signal.aborted;const code=cancelled?'CANCELLED':error?.code??'RUN_FAILED';const partial=error?.partial;
   try{onTelemetry({outcome:cancelled?'cancelled':'failed',backend:approval.contract.backend,model:approval.contract.model,usage:partial?.usage??{calls:0,reported:0,promptTokens:0,completionTokens:0,totalTokens:0,requests:[]}});}catch{}
   if(code==='CONTENT_CHANGED'||code==='CONTRACT_CHANGED'){model=null;approvedContract=null;set('error',code==='CONTENT_CHANGED'?'Published lesson changed. Reload the lesson before using inference. No model request was made.':'Provider publication changed. Check inference availability again. No model request was made.');return;}
   if(code==='CONTENT_CHANGED_DURING_RUN'||code==='CONTRACT_CHANGED_DURING_RUN'){model=null;approvedContract=null;}
   if(partial?.receipts?.length){identifyResult(approval,false);answer.textContent='No completed answer. Only independently catalog-matched receipts from completed reads are preserved below.';renderReceipts(partial.receipts);metrics.textContent=partial.modelCalls+' model calls started; usage incomplete. No automatic retries.';output.hidden=false;}
   if(code==='CONTENT_CHANGED_DURING_RUN'){set('error','The server rejected the lesson version during this run. Earlier calls may have occurred. No completed answer is claimed; reload the lesson before checking inference again.');return;}
   if(code==='CONTRACT_CHANGED_DURING_RUN'){set('error','The server rejected the approved inference configuration during this run. Earlier calls may have occurred. No completed answer is claimed; check inference availability again.');return;}
   if(code==='SOURCE_EVIDENCE_INVALID'){set('error','Independent validation of retrieved source evidence failed. The model interpretation was discarded. Only still-valid receipts, if any, remain available.');return;}
   if(code==='SOURCE_EVIDENCE_REQUIRED'){set('empty','The model returned without any independently catalog-matched source receipt. Its interpretation was discarded; no completed answer is claimed.');return;}
   if(code==='SOURCE_EVIDENCE_LIMIT'){set('empty','Source retrieval exceeded the bounded evidence display. The model interpretation was discarded rather than hiding additional source cues. Narrow the question and run again explicitly.');return;}
   if(code==='SOURCE_QUOTA'){set('denied','The bounded source-read allowance is exhausted for now. No completed model answer is claimed. The already loaded lesson, transcript and local question path remain available.');return;}
   if(code==='SOURCE_UNAVAILABLE'){set('error','The source service is temporarily unavailable. No completed model answer is claimed. The already loaded local lesson remains available.');return;}
   if(code==='SOURCE_QUERY_TOO_BROAD'){set('empty','The model asked for a source search with more matches than the bounded evidence view can show. No excerpts or model interpretation from that incomplete search are presented. Ask a narrower question and run explicitly again.');return;}
   if(cancelled&&!operation.started){set('cancelled','Inference cancelled before a model request was attempted. Previous results, if any, remain unchanged.');return;}
   set(cancelled?'cancelled':'error',(cancelled?'Inference cancelled.':'Inference stopped ('+code+').')+' No completed answer is claimed. The local lesson remains available; retry only explicitly.');
  }finally{if(active===operation){active=null;controls();(run.disabled?check:run).focus();}}
 }
 check.addEventListener('click',async()=>{
  if(active||pendingApproval)return;revokeResultActions();model=null;approvedContract=null;
  const operation={kind:'check',controller:new AbortController()};active=operation;controls();set('loading','Checking configuration without calling a model…');
  try{const found=await discoverProvider({origin,loadedContent,signal:operation.controller.signal});
   if(active!==operation||operation.controller.signal.aborted)return;
   if(found.state==='configured'){model=found.model;approvedContract=found.contract;set('idle','Model configured: '+model+' ('+(found.backend==='self_hosted'?'operator self-hosted':'external hosted')+'). '+(found.contract.webResearch==='configured'?'Bounded public web research is available when the model decides lesson evidence is insufficient. ':'External web research is disabled; this run is limited to lesson evidence. ')+'A run may still be refused by quota or provider availability. No personal key is needed.');}
   else set('denied','Optional site-operated inference is disabled. The no-model source question, transcript and local review remain available.');
  }catch(error){if(active!==operation)return;set('error',error?.code==='CONTENT_CHANGED'?'Published lesson changed. Reload the lesson before checking inference again. No model request was made.':'Inference configuration could not be confirmed. No model request was made.');}
  finally{if(active===operation){active=null;controls();}}
 });
 run.addEventListener('click',()=>{
  if(active||pendingApproval||!model||!approvedContract)return;
  const value=question.value;
  if(!value.trim()||value.length>1200){set('input_error','Enter a question of 1–1200 characters.');return;}
  if(seekScope.cancel())actionStatus.textContent='Earlier cue seek cancelled; no seek success is claimed.';
  pendingApproval=Object.freeze({question:value,model,contract:approvedContract});
  consentBackend.textContent=approvedContract.backend==='self_hosted'?'Operator self-hosted gateway':'External hosted provider';
  consentModel.textContent=model;
  consentChars.textContent=String(value.length);consentQuestion.textContent=value;
  consentBudget.textContent='Up to '+runtimeBounds.maxModelCalls+' model calls, '+runtimeBounds.maxAgents+' agent invocations and '+Math.round(runtimeBounds.timeoutMs/1000)+' seconds for this run. No automatic retry.';
  const webEnabled=approvedContract.webResearch==='configured';
  consentResearch.textContent=webEnabled?'Available for this run. The model may choose bounded public search/read calls through this SUTRA site when lesson evidence is insufficient. Retrieved webpages are untrusted and may be wrong or malicious.':'Disabled for this run. Only the lesson source capability is granted.';
  consentData.textContent=webEnabled?'Question text, bounded agent instructions/messages, catalog-matched lesson results, and public research queries plus discovered public source URLs only when the model requests research.':'Question text, bounded agent instructions/messages, and catalog-matched lesson source results requested during this run.';
  controls();
  set('consent','Review the inference data flow. No model request has been made yet.');
  try{consentDialog.showModal();consentDeny.focus();}catch{closeConsent();set('error','Approval could not be displayed. No model request was made.');}
 });
 consentDeny.addEventListener('click',denyConsent);
 consentDialog.addEventListener('cancel',event=>{event.preventDefault();denyConsent();});
 consentDialog.addEventListener('close',()=>{if(!consentDialog.open&&pendingApproval)denyConsent();});
 consentAllow.addEventListener('click',()=>{
  if(!pendingApproval||!consentDialog.open){if(pendingApproval)denyConsent();return;}
  const approval=pendingApproval;
  closeConsent();
  void executeApprovedRun(approval);
 });
 question.addEventListener('input',()=>{
  revokeResultActions();
  if(pendingApproval){denyConsent();return;}
  if(!active){labelResult();if(model)set('idle','Question changed. Any visible earlier result belongs to its previous run. Submit explicitly to retrieve new model results.');}
 });
 cancel.addEventListener('click',()=>{if(active?.kind==='run'){active.controller.abort();controls();set('cancelling','Cancelling inference…');}});
 window.addEventListener('pagehide',()=>{const previous=active;active=null;previous?.controller.abort();closeConsent();model=null;approvedContract=null;clear();controls();set('idle','Inference approval cleared when leaving this page. Check availability again before a new run.');});
 controls();
}
