import './style.css';
import {createReviewStore} from './review-store.js';
import timingFixture from './fixtures/timing-source.json';
import {loadLocalNetwork,runNetwork} from '../../../packages/sutra-runtime/index.js';
import {createScriptedModel,createSourceScriptedModel,createPeerScriptedModel} from '../../../packages/sutra-runtime/testing.js';
import {validateReceipt,validateAnnotationProfile,validateEvidenceBytes,sha256Integrity,cueHref} from '../../../packages/sutra-evidence/index.js';
import {createOpenRouterByokAdapter} from '../../../packages/sutra-inference/byok.js';
import evidenceAnnotation from '../../../packages/sutra-evidence/examples/annotation.json';
import evidenceManifest from '../../../packages/sutra-evidence/examples/integrity-manifest.json';
import {createConsentInspector} from '../../../packages/sutra-consent/index.js';
import receipt from '../../../packages/sutra-evidence/examples/receipt.json';
import sources from '../../../packages/sutra-evidence/examples/sources.json';
document.querySelector('#app').innerHTML=`<header><a class="brand" href="#main">SUTRA<span>Learning, linked to evidence</span></a><span class="stage">Local development shell</span></header>
<main id="main"><div class="eyebrow">A moment in the lesson. A source you can inspect.</div><h1>Find the moment.<br>Keep the evidence.</h1><p class="intro">Connect a lesson’s exact words to a reviewable record. Inspect where an answer comes from before you use it.</p>
<div class="notice"><strong>Synthetic example</strong> · No live agents or original lesson footage are connected. This example demonstrates source consistency, not factual verification.</div>
<div class="workspace"><section class="lesson" aria-labelledby="lesson-title"><div class="section-label">01 / LESSON</div><h2 id="lesson-title">Recording a reading</h2><div class="media-empty"><span class="media-label">Original lesson pending</span><h3>A real lesson belongs here.</h3><p>Rights-cleared footage and a factual reviewer are still needed. No playback or seek result is simulated.</p></div><button id="load-timing">Load synthetic timing fixture</button><p id="timing-status" role="status"></p><button id="seek-timing" hidden>Inspect timing cue at 00:02</button><button id="read-playback">Read current playback state</button><output id="playback-state" aria-live="polite"></output><div class="transcript"><h3>Example transcript</h3><button id="cue" class="cue" aria-pressed="false"><span>00:12–00:18</span><span id="cue-text"></span></button><p class="muted">Synthetic cue · media identity is a fixture placeholder.</p></div></section>
<section class="evidence" aria-labelledby="evidence-title"><div class="section-label">02 / INSPECT</div><h2 id="evidence-title">Follow the source.</h2><p>Validate a W3C Web Annotation media cue, recompute the transcript SHA-256 in this browser, and compare the exact WebVTT cue text and interval.</p><div class="actions"><button id="check" class="primary">Verify transcript evidence</button><button id="alter">Try altered quotation</button></div><div id="transcript-integrity" class="result" role="status" aria-live="polite">transcript v3 · integrity not checked yet.</div><div id="result" class="result" role="status" aria-live="polite">No annotation check run yet.</div><dl id="details" hidden><dt>Profile</dt><dd>W3C Web Annotation + Media Fragments</dd><dt>Source</dt><dd id="source"></dd><dt>Cue</dt><dd id="cue-id"></dd><dt>Cue link</dt><dd><code id="cue-href"></code></dd></dl><div class="boundary"><h3>Hash match means bytes match—not truth.</h3><p>SHA-256 can show that the transcript bytes agree with the supplied manifest. It does not establish factual accuracy, publisher trust, authorship, or semantic support for a claim.</p></div><details><summary>What remains to connect</summary><p>Rights-cleared lesson footage, factual review and final public origins remain pending. The current annotation/transcript are synthetic engineering fixtures.</p></details></section></div>
<section class="runtime-lab" aria-labelledby="runtime-title"><div class="section-label">03 / DEVELOPER PREVIEW</div><h2 id="runtime-title">Inspect browser orchestration.</h2><p>The local fixture uses deterministic model decisions. Peer composition can use the same fixture or an explicitly configured browser BYOK route; neither path changes the peer graph.</p><button id="run-network" class="primary">Run scripted network test</button><button id="run-source-network">Run scripted source retrieval</button><p id="source-network-result" role="status" aria-live="polite">Source retrieval not started. Live inference is disabled.</p><p id="network-result" role="status" aria-live="polite">Network test not started.</p><div class="peer-runner"><label for="peer-url">Peer network URL</label><input id="peer-url" inputmode="url" autocomplete="off" placeholder="https://peer.example/agents/checklist"><fieldset class="byok-box"><legend>Optional browser BYOK</legend><p class="muted">Candidate router: OpenRouter. The key is kept in memory only and sent only in the router Authorization header.</p><label for="byok-model">Model ID</label><input id="byok-model" autocomplete="off" placeholder="openrouter/free"><label for="byok-key">API key</label><input id="byok-key" type="password" autocomplete="off" spellcheck="false" placeholder="kept in memory only"><div class="actions"><button id="save-byok" type="button">Use key in memory</button><button id="clear-byok" type="button">Clear key</button></div><label class="inline-choice"><input id="use-byok" type="checkbox"> Use BYOK for peer composition</label><p id="byok-status" role="status" aria-live="polite">BYOK not configured. Scripted fixture remains available.</p></fieldset><button id="run-peer-network">Run consented peer composition</button><p class="muted">The peer receives public artifact GETs only. Model execution stays in the caller runtime; peer metadata cannot replace the caller-selected router/model.</p><p id="peer-network-result" role="status" aria-live="polite">Peer composition not started.</p></div><details class="provenance" open><summary>Run provenance</summary><dl><dt>Spec commit</dt><dd id="prov-spec"></dd><dt>Runtime build</dt><dd id="prov-runtime"></dd><dt>Graph SHA-256</dt><dd id="prov-graph">not run</dd><dt>Model ID</dt><dd id="prov-model">not run</dd><dt>Router</dt><dd id="prov-router">not run</dd><dt>Contacted origins</dt><dd id="prov-origins">none</dd><dt>Calls</dt><dd id="prov-calls">none</dd><dt>Consent decisions</dt><dd id="prov-consent">none</dd><dt>Errors</dt><dd id="prov-errors">none</dd></dl></details><ol id="network-trace" aria-label="Sanitized orchestration trace"></ol><p class="muted">Provenance exposes public router/origin/call metadata and errors, never credentials, raw prompts or private-context values.</p></section><section class="consent-section" aria-labelledby="consent-title"><div class="section-label">04 / CONSENT</div><h2 id="consent-title">See the contact before it happens.</h2><p>External peer contact is denied by default. This preview shows the destination, purpose and public field labels before any artifact request can run.</p><button id="preview-peer-contact">Preview synthetic peer contact</button><p id="consent-status" role="status" aria-live="polite">No external contact requested.</p><details><summary>Inspect redacted consent events</summary><pre id="consent-events">[]</pre></details><dialog id="consent-dialog" aria-labelledby="consent-dialog-title"><h3 id="consent-dialog-title">External contact request</h3><dl><dt>Origin</dt><dd id="consent-origin"></dd><dt>Purpose</dt><dd id="consent-purpose"></dd><dt>Disclosure</dt><dd id="consent-disclosure"></dd></dl><p class="muted" id="consent-note">Synthetic policy exercise only. No third-party request is made.</p><div class="actions"><button id="deny-peer-contact">Deny</button><button id="allow-peer-once">Allow once</button><button id="allow-peer-session">Allow for this session</button></div></dialog></section><section class="review-section" aria-labelledby="review-title"><div class="section-label">05 / YOUR REVIEW</div><h2 id="review-title">Keep a reviewable reference.</h2><p>Preview the synthetic timing receipt before saving it in this browser. No account, server write or factual verification is involved.</p><button id="prepare-review">Preview synthetic review card</button><p id="review-status" role="status" aria-live="polite">No review card saved this session.</p><ul id="review-list"></ul><dialog id="review-dialog" aria-labelledby="review-dialog-title"><h3 id="review-dialog-title">Review before local save</h3><p>Synthetic timing fixture · consistency only, not factual truth.</p><pre id="review-preview"></pre><div class="actions"><button id="confirm-review" class="primary">Confirm local save</button><button id="cancel-review">Cancel</button></div></dialog></section><footer>Built for inspectable learning · English working shell · Local checks need no account · BYOK is optional and memory-only</footer></main>`;
document.querySelector('#cue-text').textContent=evidenceAnnotation.body.value;
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

window.addEventListener('pagehide',()=>{if(timingObjectUrl)URL.revokeObjectURL(timingObjectUrl);});

let reviewStore=null,reviewProposal=null;
const reviewDialog=document.querySelector('#review-dialog'),reviewStatus=document.querySelector('#review-status');
function getReviewStore(){if(!reviewStore)reviewStore=createReviewStore({storage:localStorage,sources:[timingFixture.source]});return reviewStore;}
function renderReviews(){
 const list=document.querySelector('#review-list');list.replaceChildren();
 for(const record of getReviewStore().list()){
  const item=document.createElement('li'),label=document.createElement('span'),remove=document.createElement('button');
  label.textContent=`Synthetic timing review · cue ${record.receipt.start}–${record.receipt.end}s · ${record.receipt.sourceVersion} `;remove.textContent='Delete local review';
  remove.addEventListener('click',()=>{try{getReviewStore().remove(record.id);renderReviews();reviewStatus.textContent='Local review deleted.';}catch{reviewStatus.textContent='Could not delete this local review; no successful deletion is claimed.';}});item.append(label,remove);list.append(item);
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
 try{getReviewStore().commit(proposal.id);}
 catch(error){reviewStatus.textContent=error.outcome==='unknown'?'Save outcome is unknown. Inspect local reviews before trying again; no automatic retry will occur.':'Local save was rejected before confirmation. The action will not be automatically retried.';return;}
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


const SPEC_COMMIT='a0ceda34e4f2e653223e13e63282abc9b60eaf7c';
const runtimeBuild=typeof __SUTRA_BUILD_SHA__==='string'?__SUTRA_BUILD_SHA__:'local-dev';
document.querySelector('#prov-spec').textContent=SPEC_COMMIT;document.querySelector('#prov-runtime').textContent=runtimeBuild;
let byokAdapter=null,activeOriginSink=null;
const byokStatus=document.querySelector('#byok-status');
function setProvenance({graph='not run',model='not run',router='not run',origins=[],calls='none',consent='none',errors='none'}={}){
 document.querySelector('#prov-graph').textContent=graph;document.querySelector('#prov-model').textContent=model;document.querySelector('#prov-router').textContent=router;
 document.querySelector('#prov-origins').textContent=origins.length?origins.join(', '):'none';document.querySelector('#prov-calls').textContent=calls;document.querySelector('#prov-consent').textContent=consent;document.querySelector('#prov-errors').textContent=errors;
}
function consentSummary(start){
 const decisions=consentInspector.exportEvents().slice(start).filter(event=>event.type==='decision');
 return decisions.length?decisions.map(event=>`${event.contactKind}:${event.decision}/${event.scope}`).join('; '):'none';
}
document.querySelector('#save-byok').addEventListener('click',()=>{
 const keyInput=document.querySelector('#byok-key'),model=document.querySelector('#byok-model').value.trim();
 try{
  byokAdapter?.clear();byokAdapter=createOpenRouterByokAdapter({key:keyInput.value,model,fetchImpl:async(url,options)=>{activeOriginSink?.add(new URL(url).origin);return fetch(url,options);}});
  keyInput.value='';byokStatus.textContent=`BYOK ready in memory for ${model}. The key is not written to browser storage.`;
 }catch(error){byokAdapter=null;keyInput.value='';byokStatus.textContent=`BYOK setup rejected (${error.code||'BYOK_CONFIG'}). No key was stored.`;}
});
document.querySelector('#clear-byok').addEventListener('click',()=>{byokAdapter?.clear();byokAdapter=null;document.querySelector('#byok-key').value='';byokStatus.textContent='BYOK key cleared from memory.';});
const peerRunButton=document.querySelector('#run-peer-network');
peerRunButton.addEventListener('click',async()=>{
 const status=document.querySelector('#peer-network-result'),list=document.querySelector('#network-trace'),raw=document.querySelector('#peer-url').value.trim(),useByok=document.querySelector('#use-byok').checked;
 peerRunButton.disabled=true;list.replaceChildren();consentMode='external';status.textContent='Validating the peer URL before any contact…';
 const origins=new Set();activeOriginSink=origins;const consentStart=consentInspector.exportEvents().length;let graphLabel='not run';
 try{
  if(useByok&&(!byokAdapter||!byokAdapter.configured())){const error=new Error('Configure BYOK before selecting it.');error.code='BYOK_SETUP';throw error;}
  const target=new URL(raw);
  const callerDefinition={metadata:{description:'SUTRA browser caller for an explicitly entered peer network.'},max_steps:6,tools:[{name:'learner',function:{description:'Delegate a narrow checklist request to the approved peer.',parameters:{type:'object',properties:{request:{type:'string',minLength:1,maxLength:1200}},required:['request'],additionalProperties:false}},instructions:'Use the declared peer when available. Report denial or load failure exactly; do not invent peer results.',tools:[target.href]}]};
  const callerHash=await sha256Integrity(JSON.stringify(callerDefinition));let peerHash='not observed';
  const fetchPeer=async(url,options)=>{origins.add(new URL(url).origin);const response=await fetch(url,options);if(response.ok&&url.endsWith('.network.json'))peerHash=await sha256Integrity(await response.clone().arrayBuffer());return response;};
  const model=useByok?byokAdapter:createPeerScriptedModel(),modelName=useByok?byokAdapter.model:'';
  const result=await runNetwork({definition:callerDefinition,request:'Inspect the peer publication state.',model,modelName,external:{baseOrigin:location.origin,inspector:consentInspector,fetchImpl:fetchPeer},onEvent:event=>{
   if(event.kind==='agent'&&event.phase==='start'){const item=document.createElement('li');item.textContent=`${event.network||'network'} / ${event.agent} @ ${event.origin||'caller'}`;list.append(item);}
  }});
  graphLabel=`caller ${callerHash}; peer ${peerHash}`;
  const modeText=useByok?`${result.modelCalls} BYOK model calls via OpenRouter`:`${result.modelCalls} scripted model steps`;
  status.textContent=`${result.text} ${result.agentCalls} agent invocations; ${result.remoteCalls} peer call; ${modeText}. Factual truth was not verified.`;
  setProvenance({graph:graphLabel,model:useByok?byokAdapter.model:'fixture-only',router:useByok?'OpenRouter (browser BYOK)':'scripted local fixture',origins:[...origins].sort(),calls:`${result.agentCalls} agent / ${result.modelCalls} model / ${result.remoteCalls} peer`,consent:consentSummary(consentStart),errors:'none'});
 }catch(error){
  status.textContent=`Peer composition stopped (${error.code||'PEER_FAILED'}). No completed peer result is claimed.`;
  setProvenance({graph:graphLabel,model:useByok?(byokAdapter?.model||'not configured'):'fixture-only',router:useByok?'OpenRouter (browser BYOK)':'scripted local fixture',origins:[...origins].sort(),calls:'incomplete',consent:consentSummary(consentStart),errors:error.code||'PEER_FAILED'});
 }finally{
  activeOriginSink=null;consentEvents.textContent=JSON.stringify(consentInspector.exportEvents(),null,2);consentMode='synthetic';peerRunButton.disabled=false;
 }
});

