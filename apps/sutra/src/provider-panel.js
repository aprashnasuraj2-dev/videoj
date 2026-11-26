import {discoverProvider,runProviderLesson,snapshotPeerComposition,snapshotLearningContext,snapshotConversationTurns,learningContextMessage} from './provider-run.js';
import {createConsentInspector} from '../../../packages/sutra-consent/index.js';
import {applyScreenState} from './status-state.js';
import {createReceiptActionRow,createReceiptSeekScope} from './receipt-actions.js';
import {executionLimits} from '../../../packages/sutra-runtime/index.js';
import {providerWebCallLimit} from './provider-web-tools.js';

export function mountProviderPanel({loadedContent,seekTo,prepareReview,origin=location.origin,onTelemetry=()=>{},getLearningContext=()=>null}){
 const sources=loadedContent.sources;
 const $=id=>document.getElementById(id);
 const check=$('provider-check'),run=$('provider-run'),cancel=$('provider-cancel'),question=$('provider-question'),status=$('provider-status'),output=$('provider-output'),answer=$('provider-answer'),list=$('provider-receipts'),webList=$('provider-web-receipts'),peerList=$('provider-peer-receipts'),metrics=$('provider-metrics'),resultContextLabel=$('provider-result-context'),actionStatus=$('provider-action-status');
 const peerUrl=$('provider-peer-url'),peerSource=$('provider-peer-source'),peerWeb=$('provider-peer-web');
 const consentDialog=$('provider-consent-dialog'),consentBackend=$('provider-consent-backend'),consentModel=$('provider-consent-model'),consentChars=$('provider-consent-chars'),consentQuestion=$('provider-consent-question'),consentBudget=$('provider-consent-budget'),consentResearch=$('provider-consent-research'),consentPeer=$('provider-consent-peer'),consentContext=$('provider-consent-context'),consentData=$('provider-consent-data'),consentDeny=$('provider-consent-deny'),consentAllow=$('provider-consent-allow');
 const peerDialog=$('provider-peer-contact-dialog'),peerContactOrigin=$('provider-peer-contact-origin'),peerContactResource=$('provider-peer-contact-resource'),peerContactPurpose=$('provider-peer-contact-purpose'),peerContactDisclosure=$('provider-peer-contact-disclosure'),peerContactDeny=$('provider-peer-contact-deny'),peerContactAllow=$('provider-peer-contact-allow');
 const runtimeBounds=executionLimits();
 let model=null,approvedContract=null,configuredPeerUrl=null,active=null,pendingApproval=null,pendingPeerDecision=null,epoch=0,resultContext=null,actionsRevoked=false,turns=[];
 if(typeof getLearningContext!=='function')throw Error('Learning context reader is required.');
 const continuityKey=contract=>contract?contract.inferenceContractId+':'+contract.graphSha256+':'+contract.content.catalogSha256:'';
 const set=(s,m)=>applyScreenState(status,s,m);
 const seekScope=createReceiptSeekScope();
 const clear=()=>{seekScope.cancel();epoch++;resultContext=null;actionsRevoked=false;output.hidden=true;answer.textContent='';list.replaceChildren();webList.replaceChildren();peerList.replaceChildren();metrics.textContent='';actionStatus.textContent='';resultContextLabel.textContent='';};
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
 function renderPeerResearch(peerResearch){
  peerList.replaceChildren();
  const receipts=Array.isArray(peerResearch?.receipts)?peerResearch.receipts:[];
  for(const receipt of receipts){
   if(!receipt||typeof receipt.origin!=='string'||typeof receipt.excerpt!=='string')continue;
   const li=document.createElement('li'),title=document.createElement('strong'),excerpt=document.createElement('p');
   title.textContent=(receipt.network??'peer')+' @ '+receipt.origin+' · unverified peer claim';excerpt.textContent=receipt.excerpt;li.append(title,excerpt);
   if(receipt.truncated){const note=document.createElement('p');note.className='muted';note.textContent='Displayed peer claim is a bounded excerpt of the returned text.';li.append(note);}
   peerList.append(li);
  }
  if(!peerList.children.length){const li=document.createElement('li');li.textContent='No compatible peer claim was returned during this run.';peerList.append(li);}
 }
 function controls(){
  const waiting=!!pendingApproval;
  check.disabled=!!active||waiting;
  run.disabled=!!active||waiting||!model;
  cancel.disabled=!active||active.kind!=='run'||active.controller.signal.aborted;
  question.disabled=!!active||waiting||!model;
  peerUrl.disabled=!!active||waiting;peerSource.disabled=!!active||waiting;peerWeb.disabled=!!active||waiting||approvedContract?.webResearch!=='configured';
  labelResult();
 }
 function closeConsent(){
  pendingApproval=null;consentQuestion.textContent='';
  if(consentDialog.open)consentDialog.close();
  controls();
 }
 function finishPeerContact(decision,expected=pendingPeerDecision){
  if(!expected||pendingPeerDecision!==expected)return;
  pendingPeerDecision=null;expected.signal?.removeEventListener('abort',expected.abort);
  const allowed=decision==='allow'&&active===expected.operation&&!expected.signal?.aborted&&!expected.operation.controller.signal.aborted;
  if(peerDialog.open)peerDialog.close();
  expected.resolve({decision:allowed?'allow':'deny',scope:'once'});
 }
 peerContactDeny.addEventListener('click',()=>finishPeerContact('deny'));
 peerContactAllow.addEventListener('click',()=>finishPeerContact('allow'));
 peerDialog.addEventListener('cancel',event=>{event.preventDefault();finishPeerContact('deny');});
 peerDialog.addEventListener('close',()=>{if(!peerDialog.open&&pendingPeerDecision)finishPeerContact('deny');});
 const peerInspector=createConsentInspector({decide:(intent,{signal}={})=>new Promise(resolve=>{
  const operation=active;
  if(!operation||operation.kind!=='run'||operation.controller.signal.aborted||signal?.aborted||pendingPeerDecision){resolve({decision:'deny',scope:'once'});return;}
  const entry={operation,signal,resolve,abort:null};entry.abort=()=>finishPeerContact('deny',entry);pendingPeerDecision=entry;signal?.addEventListener('abort',entry.abort,{once:true});
  peerContactOrigin.textContent=intent.origin;peerContactResource.textContent=intent.resource??'Exact published artifact';peerContactPurpose.textContent=intent.purpose;peerContactDisclosure.textContent=intent.disclosure.join(', ');
  try{peerDialog.showModal();peerContactDeny.focus();}catch{finishPeerContact('deny',entry);}
 })});
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
   const result=await runProviderLesson({origin,approvedContract,loadedContent,question:approval.question,history:approval.history,learningContext:approval.learningContext,peerComposition:approval.peerComposition,peerInspector,signal:operation.controller.signal,onModelStart:()=>{if(active!==operation)return;operation.started=true;clear();set('running','Running the configured model and bounded source tools…');}});
   if(active!==operation)return;
   if(operation.controller.signal.aborted)throw Error('cancelled');
   identifyResult(approval,true);answer.textContent=result.text;
   renderReceipts(result.receipts);renderWebResearch(result.webResearch);renderPeerResearch(result.peerResearch);
   turns=[...turns,{question:approval.question,answer:result.text.slice(0,3000)}].slice(-2);
   const u=result.usage,w=result.webResearch,p=result.peerResearch;metrics.textContent=result.agentCalls+' agent invocations · '+result.modelCalls+' model calls · '+u.reported+'/'+u.calls+' calls reported token usage. '+(u.complete?'Reported input/output/total tokens: '+u.promptTokens+'/'+u.completionTokens+'/'+u.totalTokens+'.':'Usage incomplete; total run cost is unknown.')+' Public web capability: '+(w?String(w.providerCalls)+' provider calls, '+String(w.receipts?.length??0)+' sources read.':'disabled or unused')+'. Peer claims returned: '+String(p?.receipts?.length??0)+'. Per-call latency: '+u.requests.map(row=>row.latencyMs+' ms').join(', ')+'. No automatic retries.';
   try{onTelemetry({outcome:'completed',backend:approval.contract.backend,model:result.model,usage:u});}catch{}
   output.hidden=false;set('completed','Model run completed. Interpretation remains unverified. Lesson receipts establish catalog consistency only; public web and peer receipts establish only what was retrieved or returned, not factual truth.');
  }catch(error){
   if(active!==operation)return;
   if(operation.started)clear();const cancelled=operation.controller.signal.aborted;const code=cancelled?'CANCELLED':error?.code??'RUN_FAILED';const partial=error?.partial;
   try{onTelemetry({outcome:cancelled?'cancelled':'failed',backend:approval.contract.backend,model:approval.contract.model,usage:partial?.usage??{calls:0,reported:0,promptTokens:0,completionTokens:0,totalTokens:0,requests:[]}});}catch{}
   if(code==='CONTENT_CHANGED'||code==='CONTRACT_CHANGED'){model=null;approvedContract=null;turns=[];set('error',code==='CONTENT_CHANGED'?'Published lesson changed. Reload the lesson before using inference. No model request was made.':'Provider publication changed. Check inference availability again. No model request was made.');return;}
   if(code==='CONTENT_CHANGED_DURING_RUN'||code==='CONTRACT_CHANGED_DURING_RUN'){model=null;approvedContract=null;turns=[];}
   if(partial?.receipts?.length){identifyResult(approval,false);answer.textContent='No completed answer. Only independently catalog-matched receipts from completed reads are preserved below.';renderReceipts(partial.receipts);metrics.textContent=partial.modelCalls+' model calls started; usage incomplete. No automatic retries.';output.hidden=false;}
   if(code==='CONTENT_CHANGED_DURING_RUN'){set('error','The server rejected the lesson version during this run. Earlier calls may have occurred. No completed answer is claimed; reload the lesson before checking inference again.');return;}
   if(code==='CONTRACT_CHANGED_DURING_RUN'){set('error','The server rejected the approved inference configuration during this run. Earlier calls may have occurred. No completed answer is claimed; check inference availability again.');return;}
   if(code==='SOURCE_EVIDENCE_INVALID'){set('error','Independent validation of retrieved source evidence failed. The model interpretation was discarded. Only still-valid receipts, if any, remain available.');return;}
   if(code==='SOURCE_EVIDENCE_REQUIRED'){set('empty','The model returned without any independently catalog-matched source receipt. Its interpretation was discarded; no completed answer is claimed.');return;}
   if(code==='EVIDENCE_REQUIRED'){set('empty','The model returned without an independently catalog-matched lesson receipt or an actually read public web source. Search snippets do not count as evidence. Its interpretation was discarded; no completed answer is claimed.');return;}
   if(code==='SOURCE_EVIDENCE_LIMIT'){set('empty','Source retrieval exceeded the bounded evidence display. The model interpretation was discarded rather than hiding additional source cues. Narrow the question and run again explicitly.');return;}
   if(code==='SOURCE_QUOTA'){set('denied','The bounded source-read allowance is exhausted for now. No completed model answer is claimed. The already loaded lesson, transcript and local question path remain available.');return;}
   if(code==='SOURCE_UNAVAILABLE'){set('error','The source service is temporarily unavailable. No completed model answer is claimed. The already loaded local lesson remains available.');return;}
   if(code==='SOURCE_QUERY_TOO_BROAD'){set('empty','The model asked for a source search with more matches than the bounded evidence view can show. No excerpts or model interpretation from that incomplete search are presented. Ask a narrower question and run explicitly again.');return;}
   if(['ANSWER_FORMAT','CITATION_REQUIRED','CITATION_FORBIDDEN','CITATION_INVALID','INDEPENDENCE_REQUIRED','EVIDENCE_FORMAT'].includes(code)){set('empty','The research answer failed the quotation/provenance contract ('+code+'). Its model text was discarded rather than presenting unsupported source claims. Retrieved receipts, if any, remain unverified source material.');return;}
   if(code==='WEB_QUOTA'){set('denied','The bounded public-web allowance is exhausted for now. No completed research answer is claimed; lesson evidence and local tools remain available.');return;}
   if(['WEB_UNAVAILABLE','WEB_TIMEOUT','WEB_READ_REFUSED','WEB_RESPONSE'].includes(code)){set('error','Public research stopped safely ('+code+'). No completed research answer is claimed; lesson evidence and local tools remain available.');return;}
   if(code==='PEER_CONSENT_DENIED'){set('cancelled','The compatible peer artifact request was denied. The run stopped without turning the denied peer into answer text. Local lesson evidence remains available.');return;}
   if(code.startsWith('PEER_')){set('error','Compatible peer composition stopped safely ('+code+'). No completed peer-assisted answer is claimed; local lesson evidence remains available.');return;}
   if(cancelled&&!operation.started){set('cancelled','Inference cancelled before a model request was attempted. Previous results, if any, remain unchanged.');return;}
   set(cancelled?'cancelled':'error',(cancelled?'Inference cancelled.':'Inference stopped ('+code+').')+' No completed answer is claimed. The local lesson remains available; retry only explicitly.');
  }finally{if(active===operation){active=null;controls();(run.disabled?check:run).focus();}}
 }
 check.addEventListener('click',async()=>{
  if(active||pendingApproval)return;revokeResultActions();const previousContract=approvedContract;model=null;approvedContract=null;configuredPeerUrl=null;
  const requestedPeer=peerUrl.value.trim()||null;
  const operation={kind:'check',controller:new AbortController()};active=operation;controls();set('loading','Checking configuration without calling a model or contacting the optional peer…');
  try{const found=await discoverProvider({origin,loadedContent,peerUrl:requestedPeer,signal:operation.controller.signal});
   if(active!==operation||operation.controller.signal.aborted)return;
   if(found.state==='configured'){if(previousContract&&continuityKey(previousContract)!==continuityKey(found.contract))turns=[];model=found.model;approvedContract=found.contract;configuredPeerUrl=requestedPeer;if(found.contract.webResearch!=='configured'){peerWeb.checked=false;}set('idle','Model configured: '+model+' ('+(found.backend==='self_hosted'?'operator self-hosted':'external hosted')+'). '+(found.contract.webResearch==='configured'?'Bounded public web research is available when the model decides lesson evidence is insufficient. ':'External web research is disabled. ')+(configuredPeerUrl?'The exact peer slot is locally resolved; no peer request has occurred. ':'No compatible peer is configured for this run. ')+'A run may still be refused by quota, provider availability or denied peer contact. No personal key is needed.');}
   else{turns=[];set('denied','Optional site-operated inference is disabled. The no-model source question, transcript and local review remain available.');}
  }catch(error){if(active!==operation)return;set('error',error?.code==='CONTENT_CHANGED'?'Published lesson changed. Reload the lesson before checking inference again. No model request was made.':'Inference configuration could not be confirmed. No model request was made.');}
  finally{if(active===operation){active=null;controls();}}
 });
 run.addEventListener('click',()=>{
  if(active||pendingApproval||!model||!approvedContract)return;
  const value=question.value;
  if(!value.trim()||value.length>1200){set('input_error','Enter a question of 1–1200 characters.');return;}
  if(seekScope.cancel())actionStatus.textContent='Earlier cue seek cancelled; no seek success is claimed.';
  let learningContext,history,peerComposition=null;
  try{
   learningContext=snapshotLearningContext(getLearningContext());history=snapshotConversationTurns(turns);
   if(configuredPeerUrl)peerComposition=snapshotPeerComposition({peerUrl:configuredPeerUrl,capabilities:[...(peerSource.checked?['source']:[]),...(peerWeb.checked?['web']:[])]},{webResearch:approvedContract.webResearch});
  }
  catch{set('error','Learning or peer composition context could not be safely captured. No model request was made.');return;}
  pendingApproval=Object.freeze({question:value,model,contract:approvedContract,learningContext,history,peerComposition});
  consentBackend.textContent=approvedContract.backend==='self_hosted'?'Operator self-hosted gateway':'External hosted provider';
  consentModel.textContent=model;
  consentChars.textContent=String(value.length);consentQuestion.textContent=value;
  consentBudget.textContent='Up to '+runtimeBounds.maxModelCalls+' model calls, '+runtimeBounds.maxAgents+' agent invocations'+(approvedContract.webResearch==='configured'?', '+providerWebCallLimit+' public web tool calls':'')+' and '+Math.round(runtimeBounds.timeoutMs/1000)+' seconds for this run. No automatic retry.';
  consentContext.textContent=learningContextMessage(learningContext)??'No learning-state message will be sent.';
  const webEnabled=approvedContract.webResearch==='configured';
  consentResearch.textContent=webEnabled?'Available for this run. The model may choose bounded public search/read calls through this SUTRA site when lesson evidence is insufficient. Retrieved webpages are untrusted and may be wrong or malicious.':'Disabled for this run. Only the lesson source capability is granted.';
  consentPeer.textContent=peerComposition?peerComposition.peerUrl+' · caller grants: '+(peerComposition.capabilities.length?peerComposition.capabilities.join(', '):'no lesson/web capability')+'. Peer manifest and graph are not contacted unless the model chooses this peer, and each GET requires another approval.':'Disabled for this run.';
  consentData.textContent=(webEnabled?'Question text, bounded agent instructions/messages, approved playback/cue metadata, up to two prior completed question/answer turns, catalog-matched lesson results, and public research queries plus discovered public source URLs only when the model requests research.':'Question text, bounded agent instructions/messages, approved playback/cue metadata, up to two prior completed question/answer turns, and catalog-matched lesson source results requested during this run.')+(peerComposition?' If the model chooses the approved peer, only its network name is disclosed to its public artifact origin; model prompts and provider credentials are not sent there.':'');
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
 peerUrl.addEventListener('input',()=>{
  revokeResultActions();if(active||pendingApproval)return;
  if((peerUrl.value.trim()||null)!==configuredPeerUrl){model=null;approvedContract=null;configuredPeerUrl=null;turns=[];peerWeb.checked=false;set('idle','Peer URL changed. Check inference availability again; no peer request was made.');controls();}
 });
 question.addEventListener('input',()=>{
  revokeResultActions();
  if(pendingApproval){denyConsent();return;}
  if(!active){labelResult();if(model)set('idle','Question changed. Any visible earlier result belongs to its previous run. Submit explicitly to retrieve new model results.');}
 });
 cancel.addEventListener('click',()=>{if(active?.kind==='run'){active.controller.abort();controls();set('cancelling','Cancelling inference…');}});
 window.addEventListener('pagehide',()=>{const previous=active;active=null;previous?.controller.abort();if(pendingPeerDecision)finishPeerContact('deny');closeConsent();model=null;approvedContract=null;configuredPeerUrl=null;turns=[];clear();controls();set('idle','Inference approval cleared when leaving this page. Check availability again before a new run.');});
 controls();
}
