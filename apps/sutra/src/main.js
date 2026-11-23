import './style.css';
import {createReviewStore} from './review-store.js';
import {createReviewActions} from './review-actions.js';
import {createRunLifecycle} from './run-lifecycle.js';
import {createProvenanceStore} from './provenance-store.js';
import {createTranscriptIndex} from './transcript-index.js';
import timingFixture from './fixtures/timing-source.json';
import timingTranscriptMeta from './fixtures/timing-transcript.json';
import {loadLocalNetwork,runNetwork,executionLimits} from '../../../packages/sutra-runtime/index.js';
import {createScriptedModel,createSourceScriptedModel,createPeerScriptedModel} from '../../../packages/sutra-runtime/testing.js';
import {validateReceipt,validateAnnotationProfile,validateEvidenceBytes,sha256Integrity,cueHref,parseWebVtt} from '../../../packages/sutra-evidence/index.js';
import {createOpenRouterByokAdapter} from '../../../packages/sutra-inference/byok.js';
import evidenceAnnotation from '../../../packages/sutra-evidence/examples/annotation.json';
import evidenceManifest from '../../../packages/sutra-evidence/examples/integrity-manifest.json';
import {createConsentInspector} from '../../../packages/sutra-consent/index.js';
import receipt from '../../../packages/sutra-evidence/examples/receipt.json';
import sources from '../../../packages/sutra-evidence/examples/sources.json';
document.querySelector('#app').innerHTML=`<header><a class="brand" href="#main">SUTRA<span>Learning, linked to evidence</span></a><span class="stage">Local development shell</span></header>
<main id="main"><div class="eyebrow">A moment in the lesson. A source you can inspect.</div><h1>Find the moment.<br>Keep the evidence.</h1><p class="intro">Connect a lesson’s exact words to a reviewable record. Inspect where an answer comes from before you use it.</p>
<div class="notice"><strong>Synthetic example</strong> · No live agents or original lesson footage are connected. This example demonstrates source consistency, not factual verification.</div>
<div class="workspace"><section class="lesson" aria-labelledby="lesson-title"><div class="section-label">01 / LESSON</div><h2 id="lesson-title">Recording a reading</h2><div class="media-empty"><span class="media-label">Original lesson pending</span><h3>A real lesson belongs here.</h3><p>Rights-cleared footage and a factual reviewer are still needed. No playback or seek result is simulated.</p></div><button id="load-timing">Load synthetic timing fixture</button><p id="timing-status" role="status"></p><button id="seek-timing" hidden>Inspect timing cue at 00:02</button><button id="read-playback">Read current playback state</button><output id="playback-state" aria-live="polite"></output><section class="timing-transcript" aria-labelledby="timing-transcript-title"><h3 id="timing-transcript-title">Timing fixture transcript</h3><p id="transcript-meta" class="muted">Loading versioned synthetic transcript…</p><p id="caption-state" class="muted">Caption track state will be checked when timing media loads.</p><label for="transcript-search">Search timing transcript</label><input id="transcript-search" type="search" maxlength="80" autocomplete="off" placeholder="Search this synthetic transcript"><p id="transcript-status" role="status" aria-live="polite">Transcript loading.</p><ol id="transcript-results" aria-label="Timing transcript cues"></ol></section><div class="transcript"><h3>Separate evidence annotation excerpt</h3><button id="cue" class="cue" aria-pressed="false"><span>00:12–00:18</span><span id="cue-text"></span></button><p class="muted">Separate synthetic evidence fixture · this 12–18s annotation is not bound to the 8s timing video above.</p></div></section>
<section class="evidence" aria-labelledby="evidence-title"><div class="section-label">02 / INSPECT</div><h2 id="evidence-title">Follow the source.</h2><p>Validate a W3C Web Annotation media cue, recompute the transcript SHA-256 in this browser, and compare the exact WebVTT cue text and interval.</p><div class="actions"><button id="check" class="primary">Verify transcript evidence</button><button id="alter">Try altered quotation</button></div><div id="transcript-integrity" class="result" role="status" aria-live="polite">transcript v3 · integrity not checked yet.</div><div id="result" class="result" role="status" aria-live="polite">No annotation check run yet.</div><dl id="details" hidden><dt>Profile</dt><dd>W3C Web Annotation + Media Fragments</dd><dt>Source</dt><dd id="source"></dd><dt>Cue</dt><dd id="cue-id"></dd><dt>Cue link</dt><dd><code id="cue-href"></code></dd></dl><div class="boundary"><h3>Hash match means bytes match—not truth.</h3><p>SHA-256 can show that the transcript bytes agree with the supplied manifest. It does not establish factual accuracy, publisher trust, authorship, or semantic support for a claim.</p></div><details><summary>What remains to connect</summary><p>Rights-cleared lesson footage, factual review and final public origins remain pending. The current annotation/transcript are synthetic engineering fixtures.</p></details></section></div>
<section class="runtime-lab" aria-labelledby="runtime-title"><div class="section-label">03 / DEVELOPER PREVIEW</div><h2 id="runtime-title">Inspect browser orchestration.</h2><p>The local fixture uses deterministic model decisions. Peer composition can use the same fixture or an explicitly configured browser BYOK route; neither path changes the peer graph.</p><button id="run-network" class="primary">Run scripted network test</button><button id="run-source-network">Run scripted source retrieval</button><p id="source-network-result" role="status" aria-live="polite">Source retrieval not started. Live inference is disabled.</p><p id="network-result" role="status" aria-live="polite">Network test not started.</p><div class="peer-runner"><label for="peer-url">Peer network URL</label><input id="peer-url" inputmode="url" autocomplete="off" placeholder="https://peer.example/agents/checklist"><fieldset class="byok-box"><legend>Optional browser BYOK</legend><p class="muted">Candidate router: OpenRouter. The key is kept in memory only and sent only in the router Authorization header.</p><label for="byok-model">Model ID</label><input id="byok-model" autocomplete="off" placeholder="openrouter/free"><label for="byok-key">API key</label><input id="byok-key" type="password" autocomplete="off" spellcheck="false" placeholder="kept in memory only"><div class="actions"><button id="save-byok" type="button">Use key in memory</button><button id="clear-byok" type="button">Clear key</button></div><label class="inline-choice"><input id="use-byok" type="checkbox"> Use BYOK for peer composition</label><p id="byok-status" role="status" aria-live="polite">BYOK not configured. Scripted fixture remains available.</p></fieldset><div class="actions peer-run-controls"><button id="run-peer-network">Run consented peer composition</button><button id="cancel-peer-network" type="button" disabled>Cancel current run</button></div><p id="peer-run-lifecycle" class="run-lifecycle" role="status" aria-live="polite" data-state="idle">Run state: idle · Not started.</p><p class="muted">The peer receives public artifact GETs only. Model execution stays in the caller runtime; peer metadata cannot replace the caller-selected router/model.</p><p id="peer-network-result" role="status" aria-live="polite">Peer composition not started.</p></div><details class="provenance"><summary>Run provenance inspector</summary><dl><dt>Spec commit</dt><dd id="prov-spec"></dd><dt>Runtime SHA</dt><dd id="prov-runtime"></dd><dt>App build SHA</dt><dd id="prov-build"></dd><dt>Run status</dt><dd id="prov-status">not run</dd><dt>Graph SHA-256</dt><dd id="prov-graph">not run</dd><dt>Model ID</dt><dd id="prov-model">not run</dd><dt>Router</dt><dd id="prov-router">not run</dd><dt>Contacted origins</dt><dd id="prov-origins">none</dd><dt>Agents</dt><dd id="prov-agents">none</dd><dt>Tools</dt><dd id="prov-tools">none</dd><dt>Calls</dt><dd id="prov-calls">none</dd><dt>Timing / budgets</dt><dd id="prov-budget">not run</dd><dt>Consent decisions</dt><dd id="prov-consent">none</dd><dt>Action outcomes</dt><dd id="prov-actions">none</dd><dt>Errors</dt><dd id="prov-errors">none</dd></dl><div class="actions"><button id="export-provenance" type="button">Download redacted provenance JSON</button></div><p id="prov-export-status" class="muted" role="status" aria-live="polite">No provenance export created.</p></details><ol id="network-trace" aria-label="Sanitized orchestration trace"></ol><p class="muted">Provenance exposes public router/origin/call metadata and errors, never credentials, raw prompts or private-context values.</p></section><section class="consent-section" aria-labelledby="consent-title"><div class="section-label">04 / CONSENT</div><h2 id="consent-title">See the contact before it happens.</h2><p>External peer contact is denied by default. This preview shows the destination, purpose and public field labels before any artifact request can run.</p><button id="preview-peer-contact">Preview synthetic peer contact</button><p id="consent-status" role="status" aria-live="polite">No external contact requested.</p><details><summary>Inspect redacted consent events</summary><pre id="consent-events">[]</pre></details><dialog id="consent-dialog" aria-labelledby="consent-dialog-title"><h3 id="consent-dialog-title">External contact request</h3><dl><dt>Origin</dt><dd id="consent-origin"></dd><dt>Purpose</dt><dd id="consent-purpose"></dd><dt>Disclosure</dt><dd id="consent-disclosure"></dd></dl><p class="muted" id="consent-note">Synthetic policy exercise only. No third-party request is made.</p><div class="actions"><button id="deny-peer-contact">Deny</button><button id="allow-peer-once">Allow once</button><button id="allow-peer-session">Allow for this session</button></div></dialog></section><section class="review-section" aria-labelledby="review-title"><div class="section-label">05 / YOUR REVIEW</div><h2 id="review-title">Keep a reviewable reference.</h2><p>Preview the synthetic timing receipt before saving it in this browser. No account, server write or factual verification is involved.</p><div class="actions"><button id="prepare-review">Preview synthetic review card</button><button id="prepare-export">Preview receipt export</button></div><p id="review-status" role="status" aria-live="polite">No review action completed this session.</p><details><summary>Registered local write actions</summary><pre id="review-action-catalog"></pre></details><ul id="review-list"></ul><dialog id="review-dialog" aria-labelledby="review-dialog-title"><h3 id="review-dialog-title">Review local action</h3><p>Synthetic timing fixture · consistency only, not factual truth.</p><pre id="review-preview"></pre><div class="actions"><button id="confirm-review" class="primary">Confirm reviewed action</button><button id="cancel-review">Cancel</button></div></dialog></section><footer>Built for inspectable learning · English working shell · Local checks need no account · BYOK is optional and memory-only</footer></main>`;
document.querySelector('#cue-text').textContent=evidenceAnnotation.body.value;
let timingTranscriptIndex=null,timingTranscriptButtons=new Map();
const transcriptSearch=document.querySelector('#transcript-search'),transcriptStatus=document.querySelector('#transcript-status'),transcriptResults=document.querySelector('#transcript-results'),transcriptMeta=document.querySelector('#transcript-meta');
function renderTimingTranscript(query=transcriptSearch.value){
 transcriptResults.replaceChildren();timingTranscriptButtons=new Map();
 if(!timingTranscriptIndex){transcriptStatus.textContent='Timing transcript unavailable. No transcript cue is claimed.';return;}
 const rows=timingTranscriptIndex.search(query);
 if(!rows.length){transcriptStatus.textContent=query?'No transcript matches this search.':'This timing transcript has no cues.';return;}
 const fragment=document.createDocumentFragment();
 for(const row of rows){
  const item=document.createElement('li'),button=document.createElement('button'),range=document.createElement('span'),text=document.createElement('span');
  button.type='button';button.className='transcript-cue';button.dataset.cueId=row.id;button.setAttribute('aria-label',timingTranscriptIndex.label(row));button.disabled=!timingPlayer;
  range.className='transcript-time';range.textContent=timingTranscriptIndex.label(row).split(' · ')[0];text.textContent=row.text;button.append(range,text);item.append(button);fragment.append(item);timingTranscriptButtons.set(row.id,button);
 }
 transcriptResults.append(fragment);transcriptStatus.textContent=`${rows.length} of ${timingTranscriptIndex.size} synthetic transcript cues shown. Activation seeks only after the timing media is loaded.`;
 if(timingPlayer)updateTimingTranscriptActive();
}
function updateTimingTranscriptActive(){
 if(!timingTranscriptIndex||!timingPlayer)return;
 const active=timingTranscriptIndex.activeAt(timingPlayer.media.currentTime);
 for(const [id,button] of timingTranscriptButtons){button.toggleAttribute('aria-current',id===active);}
}
transcriptSearch.addEventListener('input',()=>renderTimingTranscript());
transcriptResults.addEventListener('keydown',event=>{
 const button=event.target instanceof Element?event.target.closest('button[data-cue-id]'):null;if(!button)return;
 const direction=event.key==='ArrowDown'?'next':event.key==='ArrowUp'?'previous':event.key==='Home'?'first':event.key==='End'?'last':null;if(!direction)return;
 const visible=[...transcriptResults.querySelectorAll('button[data-cue-id]')].map(node=>node.dataset.cueId),next=timingTranscriptIndex?.move(visible,button.dataset.cueId,direction);if(!next)return;
 event.preventDefault();timingTranscriptButtons.get(next)?.focus();
});
transcriptResults.addEventListener('click',async event=>{
 const button=event.target instanceof Element?event.target.closest('button[data-cue-id]'):null;if(!button||!timingPlayer||!timingTranscriptIndex)return;
 const cue=timingTranscriptIndex.all().find(row=>row.id===button.dataset.cueId);if(!cue)return;
 try{const actual=await timingPlayer.seek(cue.start);transcriptStatus.textContent=`Reached ${cue.id} at actual media time ${actual.toFixed(2)}s. Source ${timingTranscriptMeta.sourceId} ${timingTranscriptMeta.sourceVersion}; transcript ${timingTranscriptMeta.transcriptVersion}.`;updateTimingTranscriptActive();}
 catch(error){
  transcriptStatus.textContent=error?.reason==='live_or_unknown_duration'?'This media has no finite seekable duration. Transcript cue navigation is unavailable.':error?.reason==='no_seekable_range'?'This media currently exposes no seekable range. Transcript cue navigation is unavailable.':'This transcript cue is unavailable on the current media seek range. No successful seek is claimed.';
 }
});
(async()=>{
 try{
  const response=await fetch(new URL(`${import.meta.env.BASE_URL}media/timing-transcript.vtt`,location.origin),{credentials:'omit',redirect:'error',cache:'no-store'});
  if(!response.ok)throw Error('transcript fetch');
  const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.byteLength>128*1024)throw Error('transcript size');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==timingTranscriptMeta.transcriptHash)throw Error('transcript integrity');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),cues=parseWebVtt(text);
  timingTranscriptIndex=createTranscriptIndex({cues,meta:timingTranscriptMeta});
  transcriptMeta.textContent=`Source ${timingTranscriptMeta.sourceId} · source ${timingTranscriptMeta.sourceVersion} · transcript ${timingTranscriptMeta.transcriptVersion} · SHA-256 ${digest.slice(0,12)}… · ${timingTranscriptMeta.translated?'translated text; original wording is not replaced':'original synthetic English text, not a translation'}.`;
  renderTimingTranscript('');
 }catch{timingTranscriptIndex=null;transcriptMeta.textContent='Timing transcript identity unavailable.';renderTimingTranscript('');}
})();
let transcriptBytesPromise=null;
function transcriptBytes(){
 if(!transcriptBytesPromise)transcriptBytesPromise=fetch(new URL(`${import.meta.env.BASE_URL}evidence/transcript-v3.vtt`,location.origin),{credentials:'omit',redirect:'error',cache:'no-store'}).then(async response=>{if(!response.ok)throw Error('transcript');const bytes=await response.arrayBuffer();if(bytes.byteLength>256*1024)throw Error('transcript-size');return bytes;});
 return transcriptBytesPromise;
}
async function check(altered=false){
 const input=structuredClone(evidenceAnnotation);if(altered)input.body.value='This changed sentence is not in the source cue.';
 const transcript=evidenceManifest.resources.find(resource=>resource.role==='transcript'),panel=document.querySelector('#result'),integrity=document.querySelector('#transcript-integrity');
 try{
  const bytes=await transcriptBytes();const result=await validateEvidenceBytes(input,{manifest:evidenceManifest,resources:{[transcript.id]:bytes}});
  const digest=await sha256Integrity(bytes),matched=digest===transcript.integrity;
  integrity.dataset.state=matched?'matched':'invalid';integrity.textContent=matched?'transcript v3 ✓ matches manifest. Hash proves bytes, not truth.':'transcript v3 ✕ does not match manifest.';
  panel.dataset.state=result.valid?'matched':'invalid';
  panel.textContent=result.valid?'Annotation, transcript SHA-256, cue interval and exact quotation match. Factual truth has not been checked.':`Evidence rejected: ${result.errors.map(e=>e.code).join(', ')}.`;
 }catch{integrity.dataset.state='invalid';integrity.textContent='transcript v3 integrity unavailable.';panel.dataset.state='invalid';panel.textContent='Evidence check unavailable. No match is claimed.';}
 const shape=validateAnnotationProfile(input,{manifest:evidenceManifest});
 document.querySelector('#details').hidden=false;document.querySelector('#source').textContent=evidenceAnnotation.target.source.id;
 document.querySelector('#cue-id').textContent=`${evidenceAnnotation.body.id} · ${evidenceAnnotation.target.selector.value}`;document.querySelector('#cue-href').textContent=shape.valid?cueHref(input):'invalid cue';
 document.querySelector('#cue').setAttribute('aria-pressed',String(!altered));
}
document.querySelector('#cue').addEventListener('click',()=>void check());
document.querySelector('#check').addEventListener('click',()=>void check());
document.querySelector('#alter').addEventListener('click',()=>void check(true));
void check();

const runButton=document.querySelector('#run-network');
runButton.addEventListener('click',async()=>{
 runButton.disabled=true;const status=document.querySelector('#network-result'),list=document.querySelector('#network-trace'),events=[];list.replaceChildren();status.textContent='Loading local data-only network…';
 const provId=beginProvenance({kind:'local_scripted',modelId:'fixture-only',router:'scripted local fixture',limits:DEFAULT_LIMITS});let graphSha='unknown';
 try{
  const baseUrl=new URL(`${import.meta.env.BASE_URL}agents/`,location.origin).href;
  const published=await loadLocalNetwork({baseUrl,expectedOrigin:location.origin});graphSha=await sha256Integrity(JSON.stringify(published.definition));
  const result=await runNetwork({...published,request:'Inspect synthetic source consistency.',model:createScriptedModel(),actionRegistry:getReviewActions().registry,onEvent:event=>{
   events.push(event);if(event.kind==='agent'&&event.phase==='start'){const item=document.createElement('li');item.textContent=`${event.agent} agent started in this browser (scripted driver)`;list.append(item);}
  }});
  status.textContent=`${result.text} ${result.agentCalls} agent invocations; ${result.modelCalls} scripted model steps.`;
  finishProvenance(provId,{graphSha,modelId:'fixture-only',router:'scripted local fixture',origins:[location.origin],runtimeEvents:result.events,agentCalls:result.agentCalls,modelCalls:result.modelCalls,remoteCalls:result.remoteCalls,status:'complete'});
 }catch(error){
  const budget=error.code==='COMPOSITION_LIMIT'?` Limit: ${error.limit||'composition'}. Incomplete partial output: ${error.partialText||'none'}.`:'';status.textContent=`Network test stopped (${error.code||'LOAD_FAILED'}).${budget} No completed result is claimed.`;
  const counts=countRuntimeEvents(events);finishProvenance(provId,{graphSha,modelId:'fixture-only',router:'scripted local fixture',origins:[location.origin],runtimeEvents:events,...counts,status:error.code==='COMPOSITION_LIMIT'?'partial':'failed',errorCode:error.code||'LOAD_FAILED'});
 }finally{runButton.disabled=false;}
});

let timingPlayer=null,timingObjectUrl=null;
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
  timingPlayer=mountTimingPlayer(mediaHost,{source:timingObjectUrl,chapters:new URL('timing-chapters.vtt',base).href,captions:new URL('timing-captions.vtt',base).href});
  mediaHost.classList.add('player-mounted');await timingPlayer.ready();if(Math.abs(timingPlayer.media.duration-timingFixture.source.duration)>.1)throw Error('Media duration mismatch.');
  timingPlayer.media.addEventListener('timeupdate',updateTimingTranscriptActive);timingPlayer.media.addEventListener('seeked',updateTimingTranscriptActive);renderTimingTranscript();
  const captionState=document.querySelector('#caption-state'),captionTrack=timingPlayer.media.querySelector('track[kind="captions"],track[kind="subtitles"]');
  if(!captionTrack)captionState.textContent='Captions unavailable. The versioned timing transcript remains separate and searchable.';
  else{
   const captionAvailable=()=>{captionState.textContent='Caption track available. Transcript version and integrity remain independently inspectable.';};
   const captionUnavailable=()=>{captionState.textContent='Captions unavailable. The versioned timing transcript remains separate and searchable.';};
   captionTrack.addEventListener('load',captionAvailable,{once:true});captionTrack.addEventListener('error',captionUnavailable,{once:true});
   if(captionTrack.readyState===2)captionAvailable();else if(captionTrack.readyState===3)captionUnavailable();
  }
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
 }catch(error){
  const reason=error?.reason;
  timingStatus.textContent=reason==='live_or_unknown_duration'?'This source has no finite seekable duration, so the evidence cue cannot be opened. No seek success is claimed.':reason==='no_seekable_range'?'This media currently exposes no seekable range. No seek success is claimed.':reason==='outside_seekable_range'?'The evidence cue is outside the media’s current seekable window. No seek success is claimed.':'The synthetic cue could not be reached. Check media availability; no seek success is claimed.';
 }
 finally{seekTiming.disabled=false;}
});

window.addEventListener('pagehide',()=>{if(timingObjectUrl)URL.revokeObjectURL(timingObjectUrl);});

let reviewStore=null,reviewActions=null,reviewAction=null;
const reviewDialog=document.querySelector('#review-dialog'),reviewStatus=document.querySelector('#review-status'),confirmReviewButton=document.querySelector('#confirm-review');
function getReviewStore(){if(!reviewStore)reviewStore=createReviewStore({storage:localStorage,sources:[timingFixture.source]});return reviewStore;}
async function exportReceiptFile(receipt){
 const filename=`sutra-${receipt.sourceId}-${receipt.cueId}.json`.replace(/[^A-Za-z0-9._-]/g,'_').slice(0,150);
 const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)+'\n'],{type:'application/json'}));
 try{const link=document.createElement('a');link.href=url;link.download=filename;link.hidden=true;document.body.append(link);link.click();link.remove();}
 finally{setTimeout(()=>URL.revokeObjectURL(url),0);}
 return filename;
}
function getReviewActions(){
 if(!reviewActions){
  reviewActions=createReviewActions({store:getReviewStore(),sources:[timingFixture.source],exporter:exportReceiptFile,baseOrigin:location.origin});
  document.querySelector('#review-action-catalog').textContent=JSON.stringify(reviewActions.catalog(),null,2);
 }
 return reviewActions;
}
function renderReviews(){
 const list=document.querySelector('#review-list');list.replaceChildren();
 for(const record of getReviewStore().list()){
  const item=document.createElement('li'),label=document.createElement('span'),remove=document.createElement('button');
  label.textContent=`Synthetic timing review · cue ${record.receipt.start}–${record.receipt.end}s · ${record.receipt.sourceVersion} `;remove.textContent='Delete local review';
  remove.addEventListener('click',()=>{try{getReviewStore().remove(record.id);renderReviews();reviewStatus.textContent='Local review deleted.';}catch{reviewStatus.textContent='Could not delete this local review; no successful deletion is claimed.';}});item.append(label,remove);list.append(item);
 }
}
function prepareReviewAction(kind){
 try{
  const actions=getReviewActions(),plan=kind==='export'?actions.prepareExport(timingFixture.receipt):actions.prepareSave(timingFixture.receipt),preview=actions.preview(plan);
  reviewAction={kind,plan,preview:JSON.stringify(preview)};
  document.querySelector('#review-dialog-title').textContent=kind==='export'?'Review before local export':'Review before local save';
  confirmReviewButton.textContent=kind==='export'?'Confirm receipt download':'Confirm local save';
  document.querySelector('#review-preview').textContent=JSON.stringify(preview,null,2);
  reviewDialog.showModal();
 }catch{reviewAction=null;reviewStatus.textContent='Local review action is unavailable. Nothing was changed.';}
}
function cancelReview(){reviewAction=null;reviewDialog.close();reviewStatus.textContent='Review cancelled. No local action was executed.';}
document.querySelector('#prepare-review').addEventListener('click',()=>prepareReviewAction('save'));
document.querySelector('#prepare-export').addEventListener('click',()=>prepareReviewAction('export'));
document.querySelector('#cancel-review').addEventListener('click',cancelReview);
reviewDialog.addEventListener('cancel',event=>{event.preventDefault();cancelReview();});
confirmReviewButton.addEventListener('click',async()=>{
 if(!reviewAction)return;const current=reviewAction;reviewAction=null;reviewDialog.close();
 try{
  const receipts=await getReviewActions().execute(current.plan,async summary=>JSON.stringify(summary)===current.preview,`review-ui-${crypto.randomUUID()}`);recordActionProvenance(receipts||[]);
  const receipt=receipts?.[0];
  if(!receipt){reviewStatus.textContent='Reviewed action was not confirmed. Nothing was changed.';return;}
  if(receipt.status==='unknown'){reviewStatus.textContent='Action outcome is unknown. Inspect local state before trying again; no automatic retry will occur.';return;}
  if(current.kind==='save'&&receipt.result?.outcome==='rejected'){reviewStatus.textContent='Local save was rejected. The action will not be automatically retried.';return;}
  if(current.kind==='save'){renderReviews();reviewStatus.textContent='Synthetic review saved in this browser. This is a source-consistency record, not factual verification.';return;}
  reviewStatus.textContent=`Receipt exported as ${receipt.result?.filename||'a local JSON file'}. This is consistency evidence, not factual verification.`;
 }catch{reviewStatus.textContent='Reviewed action stopped before a confirmed result. No automatic retry will occur.';}
});
try{getReviewActions();renderReviews();}catch{reviewStatus.textContent='Existing local review data could not be read. Other learning features remain available.';}

const sourceButton=document.querySelector('#run-source-network');
sourceButton.addEventListener('click',async()=>{
 sourceButton.disabled=true;const status=document.querySelector('#source-network-result'),events=[];status.textContent='Loading the synthetic source network…';
 const provId=beginProvenance({kind:'source_scripted',modelId:'fixture-only',router:'scripted local fixture',limits:DEFAULT_LIMITS});let graphSha='unknown';
 try{
  const published=await loadLocalNetwork({baseUrl:new URL(`${import.meta.env.BASE_URL}agents/`,location.origin).href,networkName:'source_learner',expectedOrigin:location.origin,allowSourceTools:true});graphSha=await sha256Integrity(JSON.stringify(published.definition));
  const result=await runNetwork({...published,request:'Find the synthetic timing cue.',model:createSourceScriptedModel(),sourceTools:{origin:location.origin,sources:[timingFixture.source]},onEvent:event=>events.push(event)});
  status.textContent=`${result.text} ${result.agentCalls} agent invocations; ${result.modelCalls} scripted model steps; two source reads.`;
  finishProvenance(provId,{graphSha,modelId:'fixture-only',router:'scripted local fixture',origins:[location.origin],runtimeEvents:result.events,agentCalls:result.agentCalls,modelCalls:result.modelCalls,remoteCalls:result.remoteCalls,status:'complete'});
 }catch(error){status.textContent='Source retrieval unavailable. No completed source result is claimed. Live inference remains disabled.';const counts=countRuntimeEvents(events);finishProvenance(provId,{graphSha,modelId:'fixture-only',router:'scripted local fixture',origins:[location.origin],runtimeEvents:events,...counts,status:'failed',errorCode:error.code||'SOURCE_FAILED'});}
 finally{sourceButton.disabled=false;}
});

document.querySelector('#read-playback').addEventListener('click',()=>{document.querySelector('#playback-state').textContent=JSON.stringify(timingPlayer?.readState()??{available:false,reason:'media_not_loaded'});});

const consentDialog=document.querySelector('#consent-dialog'),consentStatus=document.querySelector('#consent-status'),consentEvents=document.querySelector('#consent-events');
let resolveConsent=null,simulatedPeerOperations=0,consentMode='synthetic';
const peerContact={origin:'https://peer.invalid/',kind:'peer_manifest',purpose:'Load a declared public peer manifest',disclosure:['network name','requested capability'],network:'checklist'};
const consentInspector=createConsentInspector({decide:intent=>new Promise(resolve=>{
 resolveConsent=resolve;document.querySelector('#consent-origin').textContent=intent.origin;document.querySelector('#consent-purpose').textContent=intent.purpose;document.querySelector('#consent-disclosure').textContent=intent.disclosure.join(', ');
 document.querySelector('#consent-note').textContent=consentMode==='external'?'Approval permits the displayed public artifact contact. Model execution and credentials remain on the caller origin.':'Synthetic policy exercise only. No third-party request is made.';
 consentDialog.showModal();
})});
function finishConsent(decision,scope='once'){if(!resolveConsent)return;const resolve=resolveConsent;resolveConsent=null;consentDialog.close();resolve({decision,scope});}
document.querySelector('#deny-peer-contact').addEventListener('click',()=>finishConsent('deny','once'));
document.querySelector('#allow-peer-once').addEventListener('click',()=>finishConsent('allow','once'));
document.querySelector('#allow-peer-session').addEventListener('click',()=>finishConsent('allow','session'));
document.querySelector('#preview-peer-contact').addEventListener('click',async()=>{
 consentMode='synthetic';consentStatus.textContent='Evaluating consent before any simulated peer operation…';
 try{
  await consentInspector.perform(peerContact,async()=>{simulatedPeerOperations++;return {simulated:true};});
  consentStatus.textContent='Consent allowed the simulated operation. No external request was made. Simulated operations: '+simulatedPeerOperations+'.';
 }catch(error){
  consentStatus.textContent=error.code==='CONSENT_DENIED'?'Contact denied before the simulated operation. Local lesson and evidence remain available.':'Consent flow stopped. No external request was made.';
 }
 consentEvents.textContent=JSON.stringify(consentInspector.exportEvents(),null,2);
});


const SPEC_COMMIT='a0ceda34e4f2e653223e13e63282abc9b60eaf7c',RUNTIME_SHA='486ecf26aa8775963f9b765f894734bef1ac9817';
const appBuild=typeof __SUTRA_BUILD_SHA__==='string'?__SUTRA_BUILD_SHA__:'local-dev',DEFAULT_LIMITS=executionLimits();
const provenanceStore=createProvenanceStore({specCommit:SPEC_COMMIT,runtimeSha:RUNTIME_SHA,buildSha:appBuild,maxRuns:12});
document.querySelector('#prov-spec').textContent=SPEC_COMMIT;document.querySelector('#prov-runtime').textContent=RUNTIME_SHA;document.querySelector('#prov-build').textContent=appBuild;
let byokAdapter=null,activeOriginSink=null;
const byokStatus=document.querySelector('#byok-status');
function setProv(id,value){const node=document.querySelector(id);if(node)node.textContent=String(value);}
function renderProvenance(snapshot=provenanceStore.latest()){
 try{
  if(!snapshot)return;
  setProv('#prov-status',`${snapshot.kind} / ${snapshot.status}`);setProv('#prov-graph',snapshot.graphSha);setProv('#prov-model',snapshot.modelId);setProv('#prov-router',snapshot.router);
  setProv('#prov-origins',snapshot.origins.length?snapshot.origins.join(', '):'none');setProv('#prov-agents',snapshot.agents.length?snapshot.agents.join(', '):'none');setProv('#prov-tools',snapshot.tools.length?snapshot.tools.join(', '):'none');
  setProv('#prov-calls',`${snapshot.calls.agent} agent / ${snapshot.calls.model} model / ${snapshot.calls.remote} remote`);
  const stops=snapshot.limitStops.length?`; stops ${snapshot.limitStops.join(', ')}`:'';
  setProv('#prov-budget',`${snapshot.elapsedMs} ms; maxAgents ${snapshot.limits.maxAgents??'n/a'}; maxModelCalls ${snapshot.limits.maxModelCalls??'n/a'}; maxRemoteCalls ${snapshot.limits.maxRemoteCalls??'n/a'}${stops}`);
  setProv('#prov-consent',snapshot.consent.length?snapshot.consent.map(item=>`${item.kind}:${item.decision}/${item.scope}@${item.origin||'unknown'}${item.remembered?'(remembered)':''}`).join('; '):'none');
  setProv('#prov-actions',snapshot.actions.length?snapshot.actions.map(item=>`${item.status} ${item.action} [${item.requestId}]`).join('; '):'none');setProv('#prov-errors',snapshot.error);
 }catch{const status=document.querySelector('#prov-export-status');if(status)status.textContent='Provenance inspector unavailable. Learning and playback remain independent.';}
}
function beginProvenance(input){try{return provenanceStore.begin(input);}catch{return null;}}
function countRuntimeEvents(events=[]){return {agentCalls:events.filter(e=>e.kind==='agent'&&e.phase==='start').length,modelCalls:events.filter(e=>e.kind==='model_call'&&e.phase==='start').length,remoteCalls:events.some(e=>e.kind==='agent'&&e.phase==='start'&&e.origin&&e.origin!=='sutra-local')?1:0};}
function finishProvenance(runId,input){
 try{const snapshot=provenanceStore.finish({runId,...input});renderProvenance(snapshot);return snapshot;}
 catch{const status=document.querySelector('#prov-export-status');if(status)status.textContent='Provenance update failed. The underlying run result is unchanged.';return null;}
}
function recordActionProvenance(receipts){
 try{
  let snapshot=provenanceStore.recordAction(receipts);
  if(!snapshot){const runId=provenanceStore.begin({kind:'review_action',limits:DEFAULT_LIMITS});snapshot=provenanceStore.finish({runId,status:receipts?.some(r=>r.status==='unknown')?'partial':'complete',actionReceipts:receipts,errorCode:receipts?.some(r=>r.status==='unknown')?'ACTION_UNKNOWN':'none'});}
  renderProvenance(snapshot);
 }catch{const status=document.querySelector('#prov-export-status');if(status)status.textContent='Action provenance unavailable. The reviewed action outcome is unchanged.';}
}
document.querySelector('#export-provenance').addEventListener('click',()=>{
 const status=document.querySelector('#prov-export-status');
 try{
  const body=JSON.stringify(provenanceStore.exportData(),null,2)+'\n',url=URL.createObjectURL(new Blob([body],{type:'application/json'})),link=document.createElement('a');
  link.href=url;link.download='sutra-run-provenance.json';link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);status.textContent='Redacted provenance JSON downloaded.';
 }catch{status.textContent='Provenance export failed. Playback and evidence remain available.';}
});
document.querySelector('#save-byok').addEventListener('click',()=>{
 const keyInput=document.querySelector('#byok-key'),model=document.querySelector('#byok-model').value.trim();
 try{
  byokAdapter?.clear();byokAdapter=createOpenRouterByokAdapter({key:keyInput.value,model,fetchImpl:async(url,options)=>{activeOriginSink?.add(new URL(url).origin);return fetch(url,options);}});
  keyInput.value='';byokStatus.textContent=`BYOK ready in memory for ${model}. The key is not written to browser storage.`;
 }catch(error){byokAdapter=null;keyInput.value='';byokStatus.textContent=`BYOK setup rejected (${error.code||'BYOK_CONFIG'}). No key was stored.`;}
});
document.querySelector('#clear-byok').addEventListener('click',()=>{byokAdapter?.clear();byokAdapter=null;document.querySelector('#byok-key').value='';byokStatus.textContent='BYOK key cleared from memory.';});
const peerRunButton=document.querySelector('#run-peer-network'),cancelPeerRunButton=document.querySelector('#cancel-peer-network'),peerLifecycleStatus=document.querySelector('#peer-run-lifecycle');
let activePeerRunController=null;
const peerLifecycle=createRunLifecycle({onChange:({state,detail})=>{
 peerLifecycleStatus.dataset.state=state;peerLifecycleStatus.textContent=`Run state: ${state} · ${detail}`;
 const active=state==='running'||state==='cancelling';peerRunButton.disabled=active;cancelPeerRunButton.disabled=state!=='running';
}});
cancelPeerRunButton.addEventListener('click',()=>{
 if(!activePeerRunController||peerLifecycle.snapshot().state!=='running')return;
 peerLifecycle.cancel('Cancellation requested. Current output is incomplete and is not verified.');
 statusPeerRun('Cancelling peer composition… current output is incomplete.');
 activePeerRunController.abort();
 if(consentDialog.open)finishConsent('deny','once');
});
function statusPeerRun(message){document.querySelector('#peer-network-result').textContent=message;}
peerRunButton.addEventListener('click',async()=>{
 const status=document.querySelector('#peer-network-result'),list=document.querySelector('#network-trace'),raw=document.querySelector('#peer-url').value.trim(),useByok=document.querySelector('#use-byok').checked;
 const controller=new AbortController(),events=[];activePeerRunController=controller;
 list.replaceChildren();consentMode='external';status.textContent='Validating the peer URL before any contact…';peerLifecycle.start('Validating the peer URL before any external contact.');
 const origins=new Set();activeOriginSink=origins;const consentStart=consentInspector.exportEvents().length;
 const selectedModel=useByok?(byokAdapter?.model||'not configured'):'fixture-only',selectedRouter=useByok?'OpenRouter (browser BYOK)':'scripted local fixture';
 const provId=beginProvenance({kind:'peer_composition',modelId:selectedModel,router:selectedRouter,limits:DEFAULT_LIMITS});let callerHash='unknown',peerHash='not observed';
 try{
  if(useByok&&(!byokAdapter||!byokAdapter.configured())){const error=new Error('Configure BYOK before selecting it.');error.code='BYOK_SETUP';throw error;}
  const target=new URL(raw);
  const callerDefinition={metadata:{description:'SUTRA browser caller for an explicitly entered peer network.'},max_steps:6,tools:[{name:'learner',function:{description:'Delegate a narrow checklist request to the approved peer.',parameters:{type:'object',properties:{request:{type:'string',minLength:1,maxLength:1200}},required:['request'],additionalProperties:false}},instructions:'Use the declared peer when available. Report denial or load failure exactly; do not invent peer results.',tools:[target.href]}]};
  callerHash=await sha256Integrity(JSON.stringify(callerDefinition));
  const fetchPeer=async(url,options)=>{origins.add(new URL(url).origin);const response=await fetch(url,options);if(response.ok&&url.endsWith('.network.json'))peerHash=await sha256Integrity(await response.clone().arrayBuffer());return response;};
  const model=useByok?byokAdapter:createPeerScriptedModel(),modelName=useByok?byokAdapter.model:'';
  const result=await runNetwork({definition:callerDefinition,request:'Inspect the peer publication state.',model,modelName,signal:controller.signal,external:{baseOrigin:location.origin,inspector:consentInspector,fetchImpl:fetchPeer},onEvent:event=>{
   events.push(event);if(event.kind==='agent'&&event.phase==='start'){const item=document.createElement('li');item.textContent=`${event.network||'network'} / ${event.agent} @ ${event.origin||'caller'}`;list.append(item);}
  }});
  const modeText=useByok?`${result.modelCalls} BYOK model calls via OpenRouter`:`${result.modelCalls} scripted model steps`;
  status.textContent=`${result.text} ${result.agentCalls} agent invocations; ${result.remoteCalls} peer call; ${modeText}. Factual truth was not verified.`;
  peerLifecycle.complete('Completed. The displayed result is complete for this controlled run; factual truth is still unverified.');
  finishProvenance(provId,{graphSha:callerHash,modelId:useByok?byokAdapter.model:'fixture-only',router:selectedRouter,origins:[...origins],consentEvents:consentInspector.exportEvents().slice(consentStart),runtimeEvents:result.events,agentCalls:result.agentCalls,modelCalls:result.modelCalls,remoteCalls:result.remoteCalls,status:'complete'});
 }catch(error){
  const code=error.code||'PEER_FAILED',cancelled=controller.signal.aborted||code==='CANCELLED';
  status.textContent=cancelled?'Peer composition cancelled. The interrupted output is incomplete and is not a verified result.':code==='COMPOSITION_LIMIT'?`Peer composition stopped at ${error.limit||'composition'} limit. Incomplete partial output: ${error.partialText||'none'}. No completed peer result is claimed.`:`Peer composition stopped (${code}). No completed peer result is claimed.`;
  peerLifecycle.fail(cancelled?'Cancelled. Incomplete result; nothing from this interrupted run is verified.':`Failed (${code}). No completed result is claimed.`);
  const counts=countRuntimeEvents(events);finishProvenance(provId,{graphSha:callerHash,modelId:useByok?(byokAdapter?.model||'not configured'):'fixture-only',router:selectedRouter,origins:[...origins],consentEvents:consentInspector.exportEvents().slice(consentStart),runtimeEvents:events,...counts,status:cancelled?'cancelled':code==='COMPOSITION_LIMIT'?'partial':'failed',errorCode:cancelled?'CANCELLED':code});
 }finally{
  activePeerRunController=null;activeOriginSink=null;consentEvents.textContent=JSON.stringify(consentInspector.exportEvents(),null,2);consentMode='synthetic';
 }
});

