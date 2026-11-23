import './style.css';
import {createReviewStore} from './review-store.js';
import timingFixture from './fixtures/timing-source.json';
import {loadLocalNetwork,runNetwork} from '../../../packages/sutra-runtime/index.js';
import {createScriptedModel,createSourceScriptedModel} from '../../../packages/sutra-runtime/testing.js';
import {validateReceipt} from '../../../packages/sutra-evidence/index.js';
import {createConsentInspector} from '../../../packages/sutra-consent/index.js';
import {mountPeerWorkbench} from './peer-workbench.js';
import {mountTranscriptPanel} from './transcript-panel.js';
import {mountComparisonView} from './comparison-view.js';
import {serializeReviewExport} from './review-export.js';
import {serializeReviewAttemptReceipt} from './review-attempt.js';
import receipt from '../../../packages/sutra-evidence/examples/receipt.json';
import sources from '../../../packages/sutra-evidence/examples/sources.json';
document.querySelector('#app').innerHTML=`<header><a class="brand" href="#main">SUTRA<span>Learning, linked to evidence</span></a><span class="stage">Local development shell</span></header>
<main id="main"><div class="eyebrow">A moment in the lesson. A source you can inspect.</div><h1>Find the moment.<br>Keep the evidence.</h1><p class="intro">Connect a lesson’s exact words to a reviewable record. Inspect where an answer comes from before you use it.</p>
<div class="notice"><strong>Synthetic example</strong> · No live agents or original lesson footage are connected. This example demonstrates source consistency, not factual verification.</div>
<div class="workspace"><section class="lesson" aria-labelledby="lesson-title"><div class="section-label">01 / LESSON</div><h2 id="lesson-title">Recording a reading</h2><div class="media-empty"><span class="media-label">Original lesson pending</span><h3>A real lesson belongs here.</h3><p>Rights-cleared footage and a factual reviewer are still needed. No playback or seek result is simulated.</p></div><button id="load-timing">Load synthetic timing fixture</button><p id="timing-status" role="status"></p><div id="timing-transcript-panel" aria-label="Synthetic source transcript"><p class="muted">Load the synthetic timing fixture to inspect its exact cue.</p></div><button id="seek-timing" hidden>Inspect timing cue at 00:02</button><button id="read-playback">Read current playback state</button><output id="playback-state" aria-live="polite"></output><div class="transcript"><h3>Example transcript</h3><button id="cue" class="cue" aria-pressed="false"><span>00:12–00:18</span><span id="cue-text"></span></button><p class="muted">Synthetic cue · media identity is a fixture placeholder.</p></div></section>
<section class="evidence" aria-labelledby="evidence-title"><div class="section-label">02 / INSPECT</div><h2 id="evidence-title">Follow the source.</h2><p>Select the transcript cue to inspect its receipt, or run the example below.</p><div class="actions"><button id="check" class="primary">Check example</button><button id="alter">Try altered quotation</button></div><div id="result" class="result" role="status" aria-live="polite">No consistency check run yet.</div><dl id="details" hidden><dt>Source</dt><dd id="source"></dd><dt>Cue</dt><dd id="cue-id"></dd><dt>Reference checks</dt><dd>Version, media identity, exact interval and exact text</dd></dl><div class="boundary"><h3>Consistent is not necessarily true.</h3><p>A match means the receipt agrees with the supplied catalog. It does not prove the catalog’s accuracy, publisher trust, or semantic support for a claim.</p></div><details><summary>What remains to connect</summary><p>The local runtime, bounded source tools and review cards are implemented. Only the optional peer workbench may make explicitly approved public manifest and graph GETs; it does not send model inference or credentials to that peer. Funded inference, reviewed guide claims and original lesson media remain pending.</p></details></section></div>
<section class="runtime-lab" aria-labelledby="runtime-title"><div class="section-label">03 / DEVELOPER PREVIEW</div><h2 id="runtime-title">Inspect browser orchestration.</h2><p>This is an explicit scripted test of the pinned nsDeploy agent loop. It loads the published local graph, delegates from learner to evidence, and returns a test result. No live AI, external peer, or factual verification is involved.</p><button id="run-network" class="primary">Run scripted network test</button><button id="run-source-network">Run scripted source retrieval</button><p id="source-network-result" role="status" aria-live="polite">Source retrieval not started. Live inference is disabled.</p><p id="network-result" role="status" aria-live="polite">Network test not started.</p><ol id="network-trace" aria-label="Sanitized orchestration trace"></ol><p class="muted">Trace excludes request text, model content, tool arguments and credentials. A successful test does not establish challenge conformance.</p></section><section class="peer-workbench" aria-labelledby="peer-workbench-title"><div class="section-label">04 / PEER WORKBENCH · DEVELOPMENT ONLY</div><h2 id="peer-workbench-title">Inspect a published peer safely.</h2><p>This optional scripted test loads a peer's public network definition only after your explicit approval. The peer's agents run here in your browser using a deterministic test driver. No provider key or real lesson facts are used. Only enter a destination you trust to contact.</p><label for="peer-url"><strong>Exact peer network URL</strong></label><div class="peer-input-row"><input id="peer-url" type="url" inputmode="url" maxlength="2048" placeholder="https://peer.example/agents/checklist" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="peer-url-note"/><button id="run-peer" class="primary">Run scripted peer test</button></div><p id="peer-url-note" class="muted">This field does not initiate a request. Each permitted manifest and graph request is a separate, credentialless public GET; redirects are rejected.</p><p id="peer-status" data-state="idle" role="status" aria-live="polite">No external peer request has been made.</p><details id="peer-inspector"><summary>Inspect execution details</summary><dl class="peer-execution-summary"><dt>Execution state</dt><dd id="peer-exec-state">Idle</dd><dt>Router / model path</dt><dd id="peer-router">Scripted test driver · no live provider</dd><dt>Agent budget</dt><dd id="peer-agent-budget">0 / 12 used</dd><dt>Model-call budget</dt><dd id="peer-model-budget">0 / 8 used</dd><dt>Tool invocations observed</dt><dd id="peer-tool-count">0</dd><dt>Elapsed / hard limit</dt><dd id="peer-elapsed">0 ms / 60,000 ms</dd><dt>Approved external operations</dt><dd id="peer-contact-count">0 completed</dd></dl><h3>Sanitized caller and peer trace</h3><ol id="peer-trace" aria-label="Sanitized caller and peer trace"></ol><button id="export-peer-trace" disabled>Download redacted execution JSON</button><p class="muted">Export excludes prompts, tool arguments, raw responses and credentials. This is an execution record, not proof of source truth.</p><h3>Redacted external consent events</h3><pre id="peer-consent-log">[]</pre></details><dialog id="peer-consent-dialog" aria-labelledby="peer-consent-title"><h3 id="peer-consent-title">Approve real public artifact access?</h3><p>Approving will make a credentialless network GET to the displayed origin for the <strong id="peer-contact-kind">Manifest</strong>. This is a real request, not the synthetic policy preview below.</p><dl><dt>Destination origin</dt><dd id="peer-origin"></dd><dt>Purpose</dt><dd id="peer-purpose"></dd><dt>Data disclosure</dt><dd id="peer-disclosure"></dd></dl><p class="muted">External content may be untrustworthy. Allowing access is not endorsing its accuracy. Denying leaves your local lesson and evidence available.</p><div class="actions"><button id="peer-deny">Deny external request</button><button id="peer-allow-once">Allow this GET once</button><button id="peer-allow-session">Allow this exact contact for this session</button></div></dialog></section><section class="consent-section" aria-labelledby="consent-title"><div class="section-label">05 / CONSENT EXERCISE</div><h2 id="consent-title">See the contact before it happens.</h2><p>External peer and third-party MCP contact is denied by default. This preview shows the destination, purpose and public field labels before any operation can run.</p><button id="preview-peer-contact">Preview synthetic peer contact</button><p id="consent-status" role="status" aria-live="polite">No external contact requested.</p><details><summary>Inspect redacted consent events</summary><pre id="consent-events">[]</pre></details><dialog id="consent-dialog" aria-labelledby="consent-dialog-title"><h3 id="consent-dialog-title">External contact request</h3><dl><dt>Origin</dt><dd id="consent-origin"></dd><dt>Purpose</dt><dd id="consent-purpose"></dd><dt>Disclosure</dt><dd id="consent-disclosure"></dd></dl><p class="muted">Synthetic policy exercise only. Approval below runs a simulated operation and does not contact the displayed origin.</p><div class="actions"><button id="deny-peer-contact">Deny</button><button id="allow-peer-once">Allow once (simulate)</button><button id="allow-peer-session">Allow for this session (simulate)</button></div></dialog></section><section class="comparison-section" aria-labelledby="comparison-title"><div class="section-label">06 / SOURCE COMPARISON</div><h2 id="comparison-title">Preserve uncertainty between sources.</h2><p>See the actual synthetic timing cue alongside the missing written-guide evidence. A separate hypothetical conflict demonstrates how disagreement stays unresolved rather than being blended into a confident answer.</p><div id="comparison-body"></div></section><section class="review-section" aria-labelledby="review-title"><div class="section-label">07 / YOUR REVIEW</div><h2 id="review-title">Keep a reviewable reference.</h2><p>Preview the synthetic timing receipt before saving it in this browser. No account, server write or factual verification is involved.</p><button id="prepare-review">Preview synthetic review card</button><p id="review-status" role="status" aria-live="polite">No review card saved this session.</p><button id="download-review-attempt" hidden>Download last save outcome</button><ul id="review-list"></ul><dialog id="review-dialog" aria-labelledby="review-dialog-title"><h3 id="review-dialog-title">Review before local save</h3><p>Synthetic timing fixture · consistency only, not factual truth.</p><pre id="review-preview"></pre><div class="actions"><button id="confirm-review" class="primary">Confirm local save</button><button id="cancel-review">Cancel</button></div></dialog></section><footer>Built for inspectable learning · English working shell · No account or API key needed</footer></main>`;
document.querySelector('#cue-text').textContent=receipt.excerpt;
function check(altered=false){
 const input=structuredClone(receipt);
 if(altered)input.excerpt='This changed sentence is not in the source cue.';
 const result=validateReceipt(input,{sources});
 const panel=document.querySelector('#result');panel.dataset.state=result.valid?'matched':'invalid';
 panel.textContent=result.valid?'Catalog matched. References are consistent with the supplied synthetic source. Factual truth has not been checked.':`Receipt rejected: ${result.errors.map(e=>e.code).join(', ')}. The altered text does not match the source.`;
 document.querySelector('#details').hidden=false;
 document.querySelector('#source').textContent=`${receipt.sourceId} / ${receipt.sourceVersion}`;
 document.querySelector('#cue-id').textContent=`${receipt.cueId} · ${receipt.start}–${receipt.end} seconds`;
 document.querySelector('#cue').setAttribute('aria-pressed',String(!altered));
}
document.querySelector('#cue').addEventListener('click',()=>check());
document.querySelector('#check').addEventListener('click',()=>check());
document.querySelector('#alter').addEventListener('click',()=>check(true));

const runButton=document.querySelector('#run-network');
runButton.addEventListener('click',async()=>{
 runButton.disabled=true;const status=document.querySelector('#network-result'),list=document.querySelector('#network-trace');list.replaceChildren();status.textContent='Loading local data-only network…';
 try{
  const baseUrl=new URL(`${import.meta.env.BASE_URL}agents/`,location.origin).href;
  const published=await loadLocalNetwork({baseUrl,expectedOrigin:location.origin});
  const result=await runNetwork({...published,request:'Inspect synthetic source consistency.',model:createScriptedModel(),onEvent:event=>{
   if(event.kind==='agent'&&event.phase==='start'){const item=document.createElement('li');item.textContent=`${event.agent} agent started in this browser (scripted driver)`;list.append(item);}
  }});
  status.textContent=`${result.text} ${result.agentCalls} agent invocations; ${result.modelCalls} scripted model steps.`;
 }catch(error){status.textContent=`Network test stopped (${error.code||'LOAD_FAILED'}). No completed result is claimed.`;}
 finally{runButton.disabled=false;}
});

let timingPlayer=null,timingObjectUrl=null,timingTranscript=null;
const transcriptHost=document.querySelector('#timing-transcript-panel');
timingTranscript=mountTranscriptPanel(transcriptHost,{
 source:timingFixture.source,onSeek:seconds=>{
  if(!timingPlayer)throw new Error('Native media is not loaded.');
  return timingPlayer.seek(seconds);
 }
});
mountComparisonView(document.querySelector('#comparison-body'),{
 receipt:timingFixture.receipt,seekTo:seconds=>timingPlayer?.seek(seconds)
});
const mediaHost=document.querySelector('.media-empty'),timingStatus=document.querySelector('#timing-status'),seekTiming=document.querySelector('#seek-timing');
document.querySelector('#load-timing').addEventListener('click',async event=>{
 const button=event.currentTarget;button.disabled=true;timingStatus.textContent='Loading a synthetic timing fixture, not the original lesson…';
 try{
  const {mountTimingPlayer}=await import('./player-adapter.js');
  const base=new URL(`${import.meta.env.BASE_URL}media/`,location.origin);
  const response=await fetch(new URL('timing-fixture.mp4',base),{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok||Number(response.headers.get('content-length'))>1024*1024)throw Error('Fixture download failed.');
  const bytes=await response.arrayBuffer();if(bytes.byteLength>1024*1024)throw Error('Fixture too large.');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==timingFixture.source.mediaHash)throw Error('Media version mismatch.');
  timingObjectUrl=URL.createObjectURL(new Blob([bytes],{type:'video/mp4'}));
  timingPlayer=mountTimingPlayer(mediaHost,{source:timingObjectUrl,poster:new URL('timing-poster.svg',base).href,chapters:new URL('timing-chapters.vtt',base).href,captions:new URL('timing-captions.vtt',base).href});
  mediaHost.classList.add('player-mounted');await timingPlayer.ready();if(Math.abs(timingPlayer.media.duration-timingFixture.source.duration)>.1)throw Error('Media duration mismatch.');
  timingTranscript?.dispose();
  timingTranscript=mountTranscriptPanel(transcriptHost,{
   source:timingFixture.source,media:timingPlayer.media,onSeek:seconds=>timingPlayer.seek(seconds)
  });
  timingStatus.textContent=`Synthetic timing fixture loaded. Actual media duration: ${timingPlayer.media.duration.toFixed(1)} seconds. Original lesson still pending.`;seekTiming.hidden=false;
 }catch{if(timingObjectUrl){URL.revokeObjectURL(timingObjectUrl);timingObjectUrl=null;}timingStatus.textContent='Timing fixture unavailable. No playback or seek success is claimed.';button.disabled=false;}
});
seekTiming.addEventListener('click',async()=>{
 seekTiming.disabled=true;
 try{
  const fixture=timingFixture;
  const result=validateReceipt(fixture.receipt,{sources:[fixture.source]});
  if(!result.valid)throw Error('Invalid fixture cue.');
  const actual=await timingPlayer.seek(fixture.receipt.start);
  timingStatus.textContent=`Synthetic cue reached. Actual native media time: ${actual.toFixed(2)} seconds. Consistency check only; no factual verification.`;
 }catch{timingStatus.textContent='The synthetic cue could not be reached. Check media availability; no seek success is claimed.';}
 finally{seekTiming.disabled=false;}
});

window.addEventListener('pagehide',()=>{timingTranscript?.dispose();if(timingObjectUrl)URL.revokeObjectURL(timingObjectUrl);});

let reviewStore=null,reviewProposal=null,lastReviewAttempt=null;
const reviewDialog=document.querySelector('#review-dialog'),reviewStatus=document.querySelector('#review-status'),reviewAttemptButton=document.querySelector('#download-review-attempt');
function setReviewAttempt(proposal,outcome){
 lastReviewAttempt={requestId:proposal.id,receipt:proposal.receipt,outcome,observedAt:new Date().toISOString()};
 reviewAttemptButton.hidden=false;
}
reviewAttemptButton.addEventListener('click',()=>{
 if(!lastReviewAttempt)return;
 try{
  const json=serializeReviewAttemptReceipt(lastReviewAttempt,{sources:[timingFixture.source]});
  const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='sutra-review-save-outcome.json';
  document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch{reviewStatus.textContent='The last save outcome could not be validated for download.';}
});
function getReviewStore(){if(!reviewStore)reviewStore=createReviewStore({storage:localStorage,sources:[timingFixture.source]});return reviewStore;}
function renderReviews(){
 const list=document.querySelector('#review-list');list.replaceChildren();
 for(const record of getReviewStore().list()){
  const item=document.createElement('li'),label=document.createElement('span'),remove=document.createElement('button'),download=document.createElement('button');
  label.textContent=`Synthetic timing review · cue ${record.receipt.start}–${record.receipt.end}s · ${record.receipt.sourceVersion} `;remove.textContent='Delete local review';
  download.textContent='Download saved receipt';download.className='review-action';
  download.addEventListener('click',()=>{
   try{
    const json=serializeReviewExport(record,{sources:[timingFixture.source]});
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download='sutra-synthetic-review.json';
    document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    reviewStatus.textContent='Synthetic receipt download requested. This does not confirm the browser saved the file or that the source is factually true.';
   }catch{reviewStatus.textContent='This receipt could not be validated for download. No export success is claimed.';}
  });
  remove.addEventListener('click',()=>{try{getReviewStore().remove(record.id);renderReviews();reviewStatus.textContent='Local review deleted.';}catch{reviewStatus.textContent='Could not delete this local review; no successful deletion is claimed.';}});
  item.append(label,download,remove);list.append(item);
 }
}
function cancelReview(){if(reviewProposal){getReviewStore().cancel(reviewProposal.id);reviewProposal=null;}reviewDialog.close();reviewStatus.textContent='Review cancelled. No card was saved.';}
document.querySelector('#prepare-review').addEventListener('click',()=>{
 try{reviewProposal=getReviewStore().prepare(timingFixture.receipt);document.querySelector('#review-preview').textContent=JSON.stringify(reviewProposal,null,2);reviewDialog.showModal();}
 catch{reviewStatus.textContent='Local review is unavailable. Nothing was saved.';}
});
document.querySelector('#cancel-review').addEventListener('click',cancelReview);
reviewDialog.addEventListener('cancel',event=>{event.preventDefault();cancelReview();});
document.querySelector('#confirm-review').addEventListener('click',()=>{
 if(!reviewProposal)return;const proposal=reviewProposal;reviewProposal=null;reviewDialog.close();
 let saved;
 try{saved=getReviewStore().commit(proposal.id);}
 catch(error){
  const outcome=error.outcome==='unknown'?'unknown':'rejected';setReviewAttempt(proposal,outcome);
  reviewStatus.textContent=outcome==='unknown'?'Save outcome is unknown. Inspect local reviews before trying again; no automatic retry will occur.':'Local save was rejected before confirmation. The action will not be automatically retried.';
  return;
 }
 setReviewAttempt(proposal,'completed');
 try{renderReviews();reviewStatus.textContent='Synthetic review saved in this browser. This is a source-consistency record, not factual verification.';}catch{reviewStatus.textContent='The local save returned successfully, but the review list could not be refreshed.';}
});
try{renderReviews();}catch{reviewStatus.textContent='Existing local review data could not be read. Other learning features remain available.';}

const sourceButton=document.querySelector('#run-source-network');
sourceButton.addEventListener('click',async()=>{
 sourceButton.disabled=true;const status=document.querySelector('#source-network-result');status.textContent='Loading the synthetic source network…';
 try{
  const published=await loadLocalNetwork({baseUrl:new URL(`${import.meta.env.BASE_URL}agents/`,location.origin).href,networkName:'source_learner',expectedOrigin:location.origin,allowSourceTools:true});
  const result=await runNetwork({...published,request:'Find the synthetic timing cue.',model:createSourceScriptedModel(),sourceTools:{origin:location.origin,sources:[timingFixture.source]}});
  status.textContent=`${result.text} ${result.agentCalls} agent invocations; ${result.modelCalls} scripted model steps; two source reads.`;
 }catch{status.textContent='Source retrieval unavailable. No completed source result is claimed. Live inference remains disabled.';}
 finally{sourceButton.disabled=false;}
});

document.querySelector('#read-playback').addEventListener('click',()=>{document.querySelector('#playback-state').textContent=JSON.stringify(timingPlayer?.readState()??{available:false,reason:'media_not_loaded'});});

mountPeerWorkbench({baseUrl:new URL(`${import.meta.env.BASE_URL}agents/`,location.origin).href});

const consentDialog=document.querySelector('#consent-dialog'),consentStatus=document.querySelector('#consent-status'),consentEvents=document.querySelector('#consent-events');
let resolveConsent=null,simulatedPeerOperations=0;
const peerContact={origin:'https://peer.invalid/',kind:'peer_manifest',purpose:'Load a declared public peer manifest',disclosure:['network name','requested capability'],network:'checklist'};
const consentInspector=createConsentInspector({decide:intent=>new Promise(resolve=>{
 resolveConsent=resolve;document.querySelector('#consent-origin').textContent=intent.origin;document.querySelector('#consent-purpose').textContent=intent.purpose;document.querySelector('#consent-disclosure').textContent=intent.disclosure.join(', ');consentDialog.showModal();
})});
function finishConsent(decision,scope='once'){if(!resolveConsent)return;const resolve=resolveConsent;resolveConsent=null;consentDialog.close();resolve({decision,scope});}
document.querySelector('#deny-peer-contact').addEventListener('click',()=>finishConsent('deny','once'));
document.querySelector('#allow-peer-once').addEventListener('click',()=>finishConsent('allow','once'));
document.querySelector('#allow-peer-session').addEventListener('click',()=>finishConsent('allow','session'));
document.querySelector('#preview-peer-contact').addEventListener('click',async()=>{
 consentStatus.textContent='Evaluating consent before any simulated peer operation…';
 try{
  await consentInspector.perform(peerContact,async()=>{simulatedPeerOperations++;return {simulated:true};});
  consentStatus.textContent='Consent allowed the simulated operation. No external request was made. Simulated operations: '+simulatedPeerOperations+'.';
 }catch(error){
  consentStatus.textContent=error.code==='CONSENT_DENIED'?'Contact denied before the simulated operation. Local lesson and evidence remain available.':'Consent flow stopped. No external request was made.';
 }
 consentEvents.textContent=JSON.stringify(consentInspector.exportEvents(),null,2);
});
