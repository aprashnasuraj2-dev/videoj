import {isNativeCueReached} from './seek-policy.js';
import './style.css';
import {createReviewStore,REVIEW_STORAGE_KEY,LEGACY_REVIEW_STORAGE_KEY} from './review-store.js';
import {createReviewMutationQueue} from './review-mutation.js';
import {createScriptedRunAuthority} from './scripted-run-authority.js';
import {createReviewActions} from './review-actions.js';
import {loadLocalNetwork,runNetwork} from '../../../packages/sutra-runtime/index.js';
import {createScriptedModel,createSourceScriptedModel} from '../../../packages/sutra-runtime/testing.js';
import {validateReceipt} from '../../../packages/sutra-evidence/index.js';
import {createConsentInspector} from '../../../packages/sutra-consent/index.js';
import {mountPeerWorkbench} from './peer-workbench.js';
import {mountTranscriptPanel} from './transcript-panel.js';
import {mountComparisonView} from './comparison-view.js';
import {serializeReviewAttemptReceipt} from './review-attempt.js';
import {applyScreenState} from './status-state.js';
import {mountProviderPanel} from './provider-panel.js';
import {mountDirectLookup} from './direct-lookup.js';
import {mountLocalAnswer} from './local-answer.js';
import {applyLocale,localeMeta} from './localization.js';
import {loadContentProfile,receiptForFeatured,receiptForCue,readVerifiedLessonMedia,deriveReviewedTracks} from '../../../packages/sutra-content-profile/index.js';

const contentBase=new URL(`${import.meta.env.BASE_URL}content/`,location.origin).href;
let content;
try{content=await loadContentProfile({baseUrl:contentBase});}
catch{
 document.querySelector('#app').innerHTML='<main id="main"><section class="runtime-lab" aria-labelledby="content-unavailable-title"><h1 id="content-unavailable-title" tabindex="-1">Source content unavailable</h1><p role="status" aria-live="polite">The lesson, catalog or transcript could not be validated. No lesson evidence, model context, review action or playback result is available.</p><button id="retry-content" class="primary">Reload and check lesson</button></section></main>';
 document.querySelector('#retry-content').addEventListener('click',()=>location.reload(),{once:true});
 // Stop initialization without an uncaught rejection or stale fallback.
 document.querySelector('#content-unavailable-title').focus();
}
if(content){
const timingFixture=Object.freeze({source:content.source,receipt:receiptForFeatured(content)}),sources=content.sources,receipt=timingFixture.receipt;
document.querySelector('#app').innerHTML=`<header><a class="brand" href="#main">SUTRA<span>Learning, linked to evidence</span></a><div class="header-tools"><span id="content-stage" class="stage">Content loading</span><label class="language-control"><span data-i18n="language.label">Language</span><select id="language-select" aria-describedby="language-review-note"><option value="en" data-i18n="language.en">English</option><option value="ne" data-i18n="language.ne">नेपाली (draft)</option></select></label></div></header>
<main id="main"><p id="language-review-note" class="language-review-note" data-i18n="language.review">Nepali terminology is a working draft pending human review.</p><div class="eyebrow" data-i18n="hero.eyebrow">A moment in the lesson. A source you can inspect.</div><h1><span data-i18n="hero.title.primary">Find the moment.</span><br><span data-i18n="hero.title.secondary">Keep the evidence.</span></h1><p class="intro" data-i18n="hero.intro">Connect a lesson’s exact words to a reviewable record. Inspect where a source excerpt comes from before relying on it.</p>
<div class="notice"><strong id="content-notice-title">Source content</strong> · <span id="content-notice-body">Inspect the active source profile before using evidence.</span></div><nav class="journey-map" aria-label="Learning workflow"><a href="#local-answer"><strong data-i18n="journey.find.title">1 · Ask locally</strong><span data-i18n="journey.find.body">Ask a question for exact source cues. No model call.</span></a><a href="#comparison-title"><strong data-i18n="journey.compare.title">2 · Compare evidence</strong><span data-i18n="journey.compare.body">Keep missing or conflicting sources visibly separate.</span></a><a href="#review-title"><strong data-i18n="journey.keep.title">3 · Keep a reviewed reference</strong><span data-i18n="journey.keep.body">Preview the exact receipt before anything is saved.</span></a></nav><p class="journey-note" data-i18n="journey.note">No account · no personal API key · optional inference requires separate approval for every run.</p>
<section id="local-answer" class="runtime-lab" aria-labelledby="local-answer-title"><div class="section-label" data-i18n="local.section">ASK LOCALLY · NO MODEL OR NETWORK</div><h2 id="local-answer-title" data-i18n="local.title">Ask the source without a model.</h2><p data-i18n="local.description">Use your own words to find matching excerpts from the lesson. This searches for words, not meaning, and does not generate an answer or advice. A match does not establish relevance or factual truth.</p><form id="local-answer-form"><label for="local-answer-query" data-i18n="local.label">Question for local source lookup</label><div class="peer-input-row"><input id="local-answer-query" type="search" maxlength="240" autocomplete="off" data-i18n-placeholder="local.placeholder" placeholder="e.g. Where is the timing marker?"/><button type="submit" class="primary" data-i18n="local.submit">Find cited source locally</button></div></form><p id="local-answer-status" role="status" aria-live="polite" data-state="idle" data-i18n="local.status.idle">No model or network request will be made.</p><ul id="local-answer-results"></ul><p id="local-answer-action-status" role="status" aria-live="polite"></p></section>
<div class="workspace"><section class="lesson" aria-labelledby="lesson-title"><div class="section-label" data-i18n="lesson.section">01 / LESSON</div><h2 id="lesson-title">Source lesson</h2><div class="media-empty"><span id="content-media-label" class="media-label">Source media</span><h3 id="content-media-heading">Load the source media when you need playback.</h3><p id="content-media-body">Transcript and evidence remain inspectable before media is loaded.</p></div><button id="load-timing">Load source media</button><button id="cancel-timing" hidden>Cancel media load</button><p id="timing-status" data-state="empty" role="status" aria-live="polite">Source media not loaded.</p><div id="timing-transcript-panel" aria-label="Source transcript"><p class="muted">The source transcript is available independently of media playback.</p></div><button id="seek-timing" hidden>Inspect featured source cue</button><button id="read-playback" data-i18n="lesson.playback">Read current playback state</button><output id="playback-state" aria-live="polite"></output><div class="transcript"><h3>Featured source cue</h3><button id="cue" class="cue" aria-pressed="false"><span id="cue-range"></span><span id="cue-text"></span></button><p id="cue-mode-note" class="muted">Source consistency only; factual truth remains a separate review question.</p></div></section>
<section class="evidence" aria-labelledby="evidence-title"><div class="section-label" data-i18n="evidence.section">02 / INSPECT</div><h2 id="evidence-title" data-i18n="evidence.title">Follow the source.</h2><p data-i18n="evidence.body">Select the transcript cue to inspect its receipt, or run the example below.</p><div class="actions"><button id="check" class="primary" data-i18n="evidence.check">Check example</button><button id="alter" data-i18n="evidence.alter">Try altered quotation</button></div><div id="result" class="result" role="status" aria-live="polite">No consistency check run yet.</div><dl id="details" hidden><dt>Source</dt><dd id="source"></dd><dt>Cue</dt><dd id="cue-id"></dd><dt>Reference checks</dt><dd>Version, media identity, exact interval and exact text</dd></dl><div class="boundary"><h3>Consistent is not necessarily true.</h3><p>A match means the receipt agrees with the supplied catalog. It does not prove the catalog’s accuracy, publisher trust, or semantic support for a claim.</p></div><details><summary>What remains to connect</summary><p>The local runtime, bounded source tools and review cards are implemented. Only the optional peer workbench may make explicitly approved public manifest and graph GETs; it does not send model inference or credentials to that peer. Site-funded inference is checked on demand. Media and written-guide availability come from the active content profile; missing evidence stays explicit.</p></details></section></div>
<section id="direct-lookup" class="runtime-lab" aria-labelledby="direct-title"><div class="section-label">FIND THE SOURCE · NO MODEL CALLS</div><h2 id="direct-title">Find exact words in the lesson.</h2><p>Use literal cue wording when you know what to look for. This searches only the active local source catalog and makes no model or external network request. A match is a source-consistency result, not a factual answer.</p><form id="direct-form"><label for="direct-query">Exact source wording</label><div class="peer-input-row"><input id="direct-query" type="search" maxlength="120" placeholder="e.g. timing marker" autocomplete="off" /><button id="direct-submit" type="submit" class="primary">Find source cues</button></div></form><p id="direct-status" data-state="idle" role="status" aria-live="polite">Enter a literal phrase from the source.</p><ul id="direct-results"></ul><p id="direct-action-status" role="status" aria-live="polite"></p></section>
<section class="comparison-section" aria-labelledby="comparison-title"><div class="section-label" data-i18n="comparison.section">03 / SOURCE COMPARISON</div><h2 id="comparison-title" data-i18n="comparison.title">Preserve uncertainty between sources.</h2><p data-i18n="comparison.body">See the active source cue alongside the available or missing written-guide evidence. A separate hypothetical conflict demonstrates how disagreement stays unresolved rather than being blended into a confident answer.</p><div id="comparison-body"></div></section><section class="review-section" aria-labelledby="review-title"><div class="section-label" data-i18n="review.section">04 / YOUR REVIEW</div><h2 id="review-title" data-i18n="review.title">Keep a reviewable reference.</h2><p data-i18n="review.body">Preview the active source receipt before saving it in this browser. No account, server write or factual verification is involved.</p><button id="prepare-review" data-i18n="review.preview">Preview source review card</button><p id="review-status" data-state="empty" role="status" aria-live="polite">No review card saved this session.</p><button id="download-review-attempt" hidden>Download last save outcome</button><ul id="review-list"></ul><button id="clear-local-reviews">Clear all local review data</button><p class="muted">Deletes only SUTRA review data in this browser. Previously downloaded files are not deleted. Direct BYOK is not supported; no personal API key is stored.</p><dialog id="clear-review-dialog" aria-labelledby="clear-review-title"><h3 id="clear-review-title">Clear local review data?</h3><p>All saved and unreadable SUTRA review cards and the last in-page save outcome will be removed. Downloaded files remain outside this app.</p><div class="actions"><button id="confirm-clear-reviews">Confirm clear local reviews</button><button id="cancel-clear-reviews">Keep local reviews</button></div></dialog><dialog id="review-dialog" aria-labelledby="review-dialog-title"><h3 id="review-dialog-title">Review before local save</h3><p>Source receipt · consistency only, not factual truth.</p><pre id="review-preview"></pre><div class="actions"><button id="confirm-review" class="primary" data-i18n="review.confirm">Confirm local save</button><button id="cancel-review" data-i18n="review.cancel">Cancel</button></div></dialog></section><section id="provider-panel" class="runtime-lab" aria-labelledby="provider-title"><div class="section-label">ASK THE LESSON · OPTIONAL SERVER INFERENCE</div><h2 id="provider-title">Ask about the evidence.</h2><p>Optional: check whether the site operator has configured a self-hosted or external hosted model. Checking makes no model call. A run sends your question and bounded agent/source-tool context through this SUTRA site to that operator-selected backend; it is not running in your browser. Do not submit private information. No personal API key is accepted. The local cited-source path above works without a model.</p><div class="actions"><button id="provider-check">Check inference availability</button></div><label for="provider-question">Question about the source lesson</label><textarea id="provider-question" maxlength="1200" rows="3" disabled>Find the featured source cue and explain what its source consistency does and does not establish.</textarea><div class="actions"><button id="provider-run" class="primary" disabled>Ask configured model</button><button id="provider-cancel" disabled>Cancel inference</button></div><p id="provider-status" role="status" aria-live="polite" data-state="idle">Inference availability has not been checked. The lesson and transcript remain usable without it.</p><dialog id="provider-consent-dialog" aria-labelledby="provider-consent-title"><h3 id="provider-consent-title">Run optional inference once?</h3><p>No model request has been made yet. If you continue, this SUTRA site will send the current question and bounded agent messages to the configured backend. Source-tool results may be added only when the model requests them.</p><dl><dt>Backend</dt><dd id="provider-consent-backend"></dd><dt>Model</dt><dd id="provider-consent-model"></dd><dt>Question length</dt><dd><span id="provider-consent-chars"></span> characters</dd><dt>Exact question to send</dt><dd><pre id="provider-consent-question" aria-label="Exact question to send"></pre></dd><dt>Execution ceiling</dt><dd id="provider-consent-budget"></dd><dt>May be sent</dt><dd>Question text, bounded agent instructions/messages, and catalog-matched source-tool results requested during this run.</dd><dt>Not forwarded to the model backend</dt><dd>Browser cookies, personal API keys, or SUTRA’s daily HMAC quota identifier.</dd><dt>Quota privacy</dt><dd>Your network address is transformed server-side into a daily HMAC quota key. The raw address is not placed in the model request by SUTRA.</dd></dl><p class="muted">Approval applies to this run only. Backend logging or retention is not verified here. This approval does not verify the model, source facts, cost, privacy practices outside SUTRA, or future runs.</p><div class="actions"><button id="provider-consent-deny">Cancel</button><button id="provider-consent-allow" class="primary">Run inference once</button></div></dialog><div id="provider-output" hidden><p id="provider-result-context" class="muted"></p><h3>Model-generated interpretation (unverified)</h3><p id="provider-answer"></p><h3>Independently catalog-matched source receipts</h3><ul id="provider-receipts"></ul><p id="provider-action-status" role="status" aria-live="polite"></p><p id="provider-metrics" class="muted"></p></div></section><section class="developer-divider" aria-labelledby="developer-tools-title"><div class="section-label">OPTIONAL / INTEROPERABILITY LAB</div><h2 id="developer-tools-title">Developer verification tools</h2><p>The learner task is complete above. These controls expose browser orchestration, peer loading and consent mechanics for technical inspection; they are not required to find, compare or save evidence.</p></section><section class="runtime-lab" aria-labelledby="runtime-title"><div class="section-label">DEV A / ORCHESTRATION</div><h2 id="runtime-title">Inspect browser orchestration.</h2><p>This is an explicit scripted test of the pinned nsDeploy agent loop. It loads the published local graph, delegates from learner to evidence, and returns a test result. No live AI, external peer, or factual verification is involved.</p><button id="run-network" class="primary">Run scripted network test</button><button id="run-source-network">Run scripted source retrieval</button><p id="source-network-result" data-state="empty" role="status" aria-live="polite">Source retrieval not started. Live inference is disabled.</p><p id="network-result" data-state="empty" role="status" aria-live="polite">Network test not started.</p><ol id="network-trace" aria-label="Sanitized orchestration trace"></ol><p class="muted">Trace excludes request text, model content, tool arguments and credentials. A successful test does not establish challenge conformance.</p></section><section class="peer-workbench" aria-labelledby="peer-workbench-title"><div class="section-label">DEV B / PEER WORKBENCH</div><h2 id="peer-workbench-title">Inspect a published peer safely.</h2><p>This optional scripted test loads a peer's public network definition only after your explicit approval. The peer's agents run here in your browser using a deterministic test driver. No provider key or real lesson facts are used. Only enter a destination you trust to contact.</p><label for="peer-url"><strong>Exact peer network URL</strong></label><div class="peer-input-row"><input id="peer-url" type="url" inputmode="url" maxlength="2048" placeholder="https://peer.example/agents/checklist" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="peer-url-note"/><button id="run-peer" class="primary" data-i18n="peer.run">Run scripted peer test</button><button id="cancel-peer" hidden>Cancel peer execution</button></div><p id="peer-url-note" class="muted">This field does not initiate a request. Each permitted manifest and graph request is a separate, credentialless public GET; redirects are rejected.</p><p id="peer-status" data-state="idle" role="status" aria-live="polite">No external peer request has been made.</p><details id="peer-inspector"><summary>Inspect execution details</summary><dl class="peer-execution-summary"><dt>Execution state</dt><dd id="peer-exec-state">Idle</dd><dt>Execution outcome</dt><dd id="peer-outcome">Not started</dd><dt>Router / model path</dt><dd id="peer-router">Scripted test driver · no live provider</dd><dt>Agent budget</dt><dd id="peer-agent-budget">0 / 12 used</dd><dt>Model-call budget</dt><dd id="peer-model-budget">0 / 8 used</dd><dt>Tool invocations observed</dt><dd id="peer-tool-count">0</dd><dt>Elapsed / hard limit</dt><dd id="peer-elapsed">0 ms / 60,000 ms</dd><dt>Approved external operations</dt><dd id="peer-contact-count">0 completed</dd></dl><h3>Sanitized caller and peer trace</h3><ol id="peer-trace" aria-label="Sanitized caller and peer trace"></ol><button id="export-peer-trace" disabled>Download redacted execution JSON</button><p class="muted">Export excludes prompts, tool arguments, raw responses and credentials. This is an execution record, not proof of source truth.</p><h3>Redacted external consent events for this run</h3><pre id="peer-consent-log">[]</pre></details><dialog id="peer-consent-dialog" aria-labelledby="peer-consent-title"><h3 id="peer-consent-title">Approve real public artifact access?</h3><p>Approving will make a credentialless network GET to the displayed origin for the <strong id="peer-contact-kind">Manifest</strong>. This is a real request, not the synthetic policy preview below. The exact resource is shown here but omitted from exported traces.</p><dl><dt>Destination origin</dt><dd id="peer-origin"></dd><dt>Exact resource</dt><dd id="peer-resource" style="overflow-wrap:anywhere"></dd><dt>Purpose</dt><dd id="peer-purpose"></dd><dt>Data disclosure</dt><dd id="peer-disclosure"></dd></dl><p class="muted">External content may be untrustworthy. Allowing access is not endorsing its accuracy. Denying leaves your local lesson and evidence available.</p><div class="actions"><button id="peer-deny">Deny external request</button><button id="peer-allow-once">Allow this GET once</button><button id="peer-allow-session">Allow this exact contact for this session</button></div></dialog></section><section class="consent-section" aria-labelledby="consent-title"><div class="section-label">DEV C / CONSENT EXERCISE</div><h2 id="consent-title">See the contact before it happens.</h2><p>External peer and third-party MCP contact is denied by default. This preview shows the destination, purpose and public field labels before any operation can run.</p><button id="preview-peer-contact">Preview synthetic peer contact</button><p id="consent-status" data-state="empty" role="status" aria-live="polite">No external contact requested.</p><details><summary>Inspect redacted consent events</summary><pre id="consent-events">[]</pre></details><dialog id="consent-dialog" aria-labelledby="consent-dialog-title"><h3 id="consent-dialog-title">External contact request</h3><dl><dt>Origin</dt><dd id="consent-origin"></dd><dt>Purpose</dt><dd id="consent-purpose"></dd><dt>Disclosure</dt><dd id="consent-disclosure"></dd></dl><p class="muted">Synthetic policy exercise only. Approval below runs a simulated operation and does not contact the displayed origin.</p><div class="actions"><button id="deny-peer-contact">Deny</button><button id="allow-peer-once">Allow once (simulate)</button><button id="allow-peer-session">Allow for this session (simulate)</button></div></dialog></section><footer>Built for inspectable learning · English working shell · No account or API key needed</footer></main>`;
const languageSelect=document.querySelector('#language-select');
const applyContentLabels=()=>{
 const reviewed=content.profile.mode==='reviewed';
 document.querySelector('#content-stage').textContent=reviewed?'Reviewed content candidate':'Local development content';
 document.querySelector('#content-notice-title').textContent=content.profile.ui.noticeTitle;
 document.querySelector('#content-notice-body').textContent=content.profile.ui.noticeBody;
 document.querySelector('#lesson-title').textContent=content.profile.title;
 const label=document.querySelector('#content-media-label'),heading=document.querySelector('#content-media-heading'),body=document.querySelector('#content-media-body');
 if(label)label.textContent=reviewed?'Reviewed source media':'Synthetic source media';
 if(heading)heading.textContent=reviewed?'Load the reviewed lesson media when playback is useful.':'Load the synthetic timing media when playback is useful.';
 if(body)body.textContent=reviewed?'Playback loads only after checking the complete media bytes (up to 24 MiB). Transcript and evidence are available now; factual truth is separate.':'Development fixture only; transcript and evidence remain inspectable before playback.';
 document.querySelector('#cue-mode-note').textContent=(reviewed?'Reviewed content profile':'Synthetic development profile')+' · source consistency does not by itself establish factual truth.';
};
const setLocale=locale=>{
 const resolved=applyLocale(document,locale);
 languageSelect.value=resolved;
 document.documentElement.dataset.locale=resolved;
 applyContentLabels();
 return resolved;
};
languageSelect.addEventListener('change',()=>setLocale(languageSelect.value));
setLocale('en');
// Human review is a release/acceptance gate: machine-authored Nepali labels are
// deliberately exposed as draft metadata rather than silently claiming review.
languageSelect.dataset.nepaliReviewed=String(localeMeta.ne.reviewed);
const setStatus=(node,state,message)=>applyScreenState(node,state,message);
document.querySelector('#cue-text').textContent=receipt.excerpt;
document.querySelector('#cue-range').textContent=String(receipt.start)+'–'+String(receipt.end)+'s';
function check(altered=false){
 const input=structuredClone(receipt);
 if(altered)input.excerpt='This changed sentence is not in the source cue.';
 const result=validateReceipt(input,{sources});
 const panel=document.querySelector('#result');panel.dataset.state=result.valid?'matched':'invalid';
 panel.textContent=result.valid?'Catalog matched. References are consistent with the active source catalog. Factual truth has not been checked.':`Receipt rejected: ${result.errors.map(e=>e.code).join(', ')}. The altered text does not match the source.`;
 document.querySelector('#details').hidden=false;
 document.querySelector('#source').textContent=`${receipt.sourceId} / ${receipt.sourceVersion}`;
 document.querySelector('#cue-id').textContent=`${receipt.cueId} · ${receipt.start}–${receipt.end} seconds`;
 document.querySelector('#cue').setAttribute('aria-pressed',String(!altered));
}
document.querySelector('#cue').addEventListener('click',()=>check());
document.querySelector('#check').addEventListener('click',()=>check());
document.querySelector('#alter').addEventListener('click',()=>check(true));

const readAttemptLabel=attempts=>Array.isArray(attempts)&&attempts.length?' Public artifact GET attempts: '+attempts.length+' ('+attempts.filter(a=>a.attempt>1).length+' retried).':'';
const scriptedAuthority=createScriptedRunAuthority();
const runButton=document.querySelector('#run-network');
runButton.addEventListener('click',async()=>{
 const token=scriptedAuthority.begin('network');if(!token)return;
 const signal=token.controller.signal,valid=()=>scriptedAuthority.current('network',token);
 runButton.disabled=true;const status=document.querySelector('#network-result'),list=document.querySelector('#network-trace');list.replaceChildren();setStatus(status,'loading','Loading local data-only network…');
 try{
  const baseUrl=new URL(`${import.meta.env.BASE_URL}agents/`,location.origin).href;
  const published=await loadLocalNetwork({baseUrl,expectedOrigin:location.origin,retryUnavailableReads:true,signal});
  if(!valid())return;
  const result=await runNetwork({...published,request:'Inspect source consistency.',model:createScriptedModel(),signal,onEvent:event=>{
   if(valid()&&event.kind==='agent'&&event.phase==='start'){const item=document.createElement('li');item.textContent=`${event.agent} agent started in this browser (scripted driver)`;list.append(item);}
  }});
  if(valid())setStatus(status,'completed',`${result.text} ${result.agentCalls} agent invocations; ${result.modelCalls} scripted model steps.${readAttemptLabel(published.readAttempts)}`);
 }catch(error){if(valid())setStatus(status,'error',`Network test stopped (${error.code||'LOAD_FAILED'}). No completed result is claimed.${readAttemptLabel(error.readAttempts)}`);}
 finally{if(scriptedAuthority.finish('network',token))runButton.disabled=false;}
});

let timingPlayer=null,timingTranscript=null,mediaLoad=null;
const mediaObjectUrls=new Set();
const localMediaUrl=(bytes,type)=>{const url=URL.createObjectURL(new Blob([bytes],{type}));mediaObjectUrls.add(url);return url;};
const releaseMediaUrls=()=>{for(const url of mediaObjectUrls)URL.revokeObjectURL(url);mediaObjectUrls.clear();};
const transcriptHost=document.querySelector('#timing-transcript-panel');
const transcriptOptions={source:timingFixture.source,contentMode:content.profile.mode,readReceipt:cueId=>receiptForCue(content,cueId,{retrievedAt:new Date().toISOString()}),prepareReview:prepareReviewFor,seekReceipt};
timingTranscript=mountTranscriptPanel(transcriptHost,{
 ...transcriptOptions,onSeek:seconds=>{
  if(!timingPlayer)throw new Error('Native media is not loaded.');
  return timingPlayer.seek(seconds);
 }
});
mountComparisonView(document.querySelector('#comparison-body'),{
 receipt:timingFixture.receipt,sources:content.sources,seekTo:seconds=>timingPlayer?.seek(seconds),
 videoClaim:content.profile.videoClaim,guideClaim:content.profile.guideClaim,contentMode:content.profile.mode
});
const mediaHost=document.querySelector('.media-empty'),timingStatus=document.querySelector('#timing-status'),seekTiming=document.querySelector('#seek-timing'),cancelTiming=document.querySelector('#cancel-timing');
const mediaPlaceholder=[...mediaHost.childNodes].map(node=>node.cloneNode(true));
cancelTiming.addEventListener('click',()=>{if(mediaLoad){mediaLoad.abort();cancelTiming.disabled=true;}});
document.querySelector('#load-timing').addEventListener('click',async event=>{
 const button=event.currentTarget;if(mediaLoad||timingPlayer)return;
 const operation=new AbortController();mediaLoad=operation;button.disabled=true;cancelTiming.hidden=false;cancelTiming.disabled=false;setStatus(timingStatus,'loading','Loading and checking the active source media…');
 const signal=AbortSignal.any([operation.signal,AbortSignal.timeout(content.profile.mode==='reviewed'?240000:10000)]);
 let candidatePlayer=null;
 try{
  const {mountTimingPlayer}=await import('./player-adapter.js');
  const versioned=(publicPath,version)=>{const url=new URL(publicPath,location.origin);url.searchParams.set('v',version);return url.href;};
  const verified=await readVerifiedLessonMedia({url:versioned(content.profile.media.video,timingFixture.source.mediaHash),origin:location.origin,mediaHash:timingFixture.source.mediaHash,mode:content.profile.mode,signal});
  signal.throwIfAborted();
  const mediaSource=localMediaUrl(verified.bytes,verified.mime),reviewed=content.profile.mode==='reviewed';
  // Do not let an independently mutable poster or VTT file masquerade as
  // reviewed content. Reviewed tracks derive locally from the validated cue
  // catalog; no remote poster/track requests are needed.
  const tracks=reviewed?deriveReviewedTracks(timingFixture.source):null;
  candidatePlayer=mountTimingPlayer(mediaHost,{source:mediaSource,
   poster:reviewed?undefined:versioned(content.profile.media.poster,timingFixture.source.mediaHash),
   chapters:reviewed?(tracks.chapters?localMediaUrl(tracks.chapters,'text/vtt'):undefined):versioned(content.profile.media.chapters,timingFixture.source.hash),
   captions:reviewed?localMediaUrl(tracks.captions,'text/vtt'):versioned(content.profile.media.captions,timingFixture.source.hash)});
  mediaHost.classList.add('player-mounted');await candidatePlayer.ready({signal});signal.throwIfAborted();if(!Number.isFinite(candidatePlayer.media.duration)||candidatePlayer.media.duration<=0||Math.abs(candidatePlayer.media.duration-timingFixture.source.duration)>.1)throw Error('Media duration mismatch.');
  // Receipt/compare/transcript actions never see a media adapter before the
  // active source duration has been validated. Keep the text query on remount.
  timingPlayer=candidatePlayer;
  const previousState=timingTranscript?.state();
  timingTranscript?.dispose();
  timingTranscript=mountTranscriptPanel(transcriptHost,{
   ...transcriptOptions,media:timingPlayer.media,onSeek:seconds=>timingPlayer.seek(seconds)
  });
  if(previousState?.queryText)timingTranscript.search(previousState.queryText);
  if(previousState?.selectedCueId)timingTranscript.inspect(previousState.selectedCueId);
  setStatus(timingStatus,'completed',`${content.profile.mode==='reviewed'?'Reviewed hash-checked':'Synthetic hash-checked'} source media loaded. Actual media duration: ${timingPlayer.media.duration.toFixed(1)} seconds.${reviewed?' Captions derived from the bound source catalog.'+(tracks.chapters?'':' Overlapping cues: chapter navigation omitted.'):''}`);seekTiming.hidden=false;
 }catch(error){if(candidatePlayer){try{candidatePlayer.media.pause();candidatePlayer.media.removeAttribute('src');candidatePlayer.media.load();}catch{}timingPlayer=null;mediaHost.replaceChildren(...mediaPlaceholder.map(node=>node.cloneNode(true)));mediaHost.classList.remove('player-mounted');applyContentLabels();}releaseMediaUrls();seekTiming.hidden=true;setStatus(timingStatus,operation.signal.aborted?'cancelled':'error',operation.signal.aborted?'Media load cancelled. Transcript and evidence remain available; no playback success is claimed.':error?.code==='MEDIA_UNSUPPORTED'?'This browser cannot decode the source media. Transcript and evidence remain available; no playback success is claimed.':'Source media unavailable. No playback or seek success is claimed.');button.disabled=false;}
 finally{if(mediaLoad===operation)mediaLoad=null;cancelTiming.hidden=true;cancelTiming.disabled=false;if(!timingPlayer&&document.activeElement===cancelTiming)button.focus({preventScroll:true});}
});
seekTiming.addEventListener('click',async()=>{
 seekTiming.disabled=true;
 try{
  const fixture=timingFixture;
  const result=validateReceipt(fixture.receipt,{sources:content.sources});
  if(!result.valid)throw Error('Invalid featured source cue.');
  const actual=await seekReceipt(fixture.receipt);
  setStatus(timingStatus,'completed',`Source cue reached. Actual native media time: ${actual.toFixed(2)} seconds. Consistency check only; no factual verification.`);
 }catch{setStatus(timingStatus,'error','The source cue could not be reached. Check media availability; no seek success is claimed.');}
 finally{seekTiming.disabled=false;}
});

// A page retained by browser back/forward cache is still the same document.
// Preserve its local transcript and media blob; remote consent is revoked independently.
window.addEventListener('pagehide',event=>{mediaLoad?.abort();if(event.persisted){try{timingPlayer?.media.pause();}catch{}return;}timingTranscript?.dispose();releaseMediaUrls();});

let reviewStore=null,reviewActions=null,reviewProposal=null,lastReviewAttempt=null,reviewBusy=false;
const reviewMutations=createReviewMutationQueue();
const reviewDialog=document.querySelector('#review-dialog'),reviewStatus=document.querySelector('#review-status'),reviewAttemptButton=document.querySelector('#download-review-attempt');
function setReviewAttempt(proposal,outcome){
 lastReviewAttempt={requestId:proposal.id,receipt:proposal.args.receipt,outcome,observedAt:new Date().toISOString()};
 reviewAttemptButton.hidden=false;
}
reviewAttemptButton.addEventListener('click',()=>{
 if(!lastReviewAttempt)return;
 try{
  const json=serializeReviewAttemptReceipt(lastReviewAttempt,{sources:content.sources});
  const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='sutra-review-save-outcome.json';
  document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch{reviewStatus.textContent='The last save outcome could not be validated for download.';}
});
function getReviewStore(){if(!reviewStore)reviewStore=createReviewStore({storage:localStorage,sources:content.sources});return reviewStore;}
function getReviewActions(){if(!reviewActions)reviewActions=createReviewActions({store:getReviewStore(),sources:content.sources,download(json,filename){const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}});return reviewActions;}
function forgetReviewAttempt(id){if(lastReviewAttempt&&(id===undefined||lastReviewAttempt.requestId===id)){lastReviewAttempt=null;reviewAttemptButton.hidden=true;}}
async function removeDisplayedReview(itemState,item,list){
 if(reviewBusy||!list.contains(item))return;
 reviewBusy=true;
 try{await reviewMutations.run(()=>{if(!list.contains(item))throw Error('Review row is no longer current.');itemState.removeIfUnchanged();});forgetReviewAttempt(itemState.id);renderReviews();reviewStatus.textContent=itemState.status==='stale'?'Stale local review deleted.':'Local review deleted.';}
 catch(error){if(error?.outcome==='unknown')forgetReviewAttempt(itemState.id);try{renderReviews();}catch{}reviewStatus.textContent=error?.outcome==='unknown'?'Local review deletion outcome is unknown. The record may already have changed; inspect current reviews before another action. No automatic retry.':'Could not delete this local review. It may have changed; inspect again. No successful deletion is claimed.';}
 finally{reviewBusy=false;}
}
function renderReviews(){
 const list=document.querySelector('#review-list');list.replaceChildren();
 const inspected=getReviewStore().inspect();
 for(const itemState of inspected){
  const item=document.createElement('li'),label=document.createElement('span'),remove=document.createElement('button');
  if(itemState.status==='stale'){
   const p=itemState.provenance;
   label.textContent=`Stale local review · source ${p.sourceId} / ${p.sourceVersion} · cue ${p.cueId} · revalidation required`;
   label.dataset.state='stale';remove.textContent='Delete stale local review';
   remove.addEventListener('click',()=>removeDisplayedReview(itemState,item,list));
   item.append(label,remove);list.append(item);continue;
  }
  const record=itemState.record,download=document.createElement('button');
  label.textContent=`Source review · cue ${record.receipt.start}–${record.receipt.end}s · ${record.receipt.sourceVersion} `;remove.textContent='Delete local review';
  download.textContent='Download saved receipt';download.className='review-action';
  download.addEventListener('click',async()=>{
   if(reviewBusy||!list.contains(item))return;
   try{
    const proposal=getReviewActions().prepare('export-receipt',{id:record.id,snapshot:record});
    await getReviewActions().execute(proposal.id);
    reviewStatus.textContent='Source receipt download requested. This does not confirm the browser saved the file or that the source is factually true.';
   }catch{reviewStatus.textContent='This receipt changed, was deleted or could not be validated for download. No export success is claimed.';try{renderReviews();}catch{}}
  });
  remove.addEventListener('click',()=>removeDisplayedReview(itemState,item,list));
  item.append(label,download,remove);list.append(item);
 }
 if(inspected.some(item=>item.status==='stale'))reviewStatus.textContent='One or more saved reviews are stale after source/media version drift. They are not shown as valid evidence; inspect provenance and delete or re-run the review.';
}
function cancelReview(){if(reviewProposal){getReviewActions().cancel(reviewProposal.id);reviewProposal=null;}document.querySelector('#review-preview').textContent='';reviewDialog.close();reviewStatus.textContent='Review cancelled. No card was saved.';}
function prepareReviewFor(receipt){
 if(reviewBusy||reviewProposal)return false;
 try{reviewProposal=getReviewActions().prepare('save-review-card',{receipt});document.querySelector('#review-preview').textContent=JSON.stringify(reviewProposal,null,2);reviewDialog.showModal();return true;}
 catch{
  if(reviewProposal){try{getReviewActions().cancel(reviewProposal.id);}catch{}reviewProposal=null;}
  document.querySelector('#review-preview').textContent='';reviewStatus.textContent='Local review is unavailable. Nothing was saved.';return false;
 }
}
document.querySelector('#prepare-review').addEventListener('click',()=>prepareReviewFor(timingFixture.receipt));
document.querySelector('#cancel-review').addEventListener('click',cancelReview);
reviewDialog.addEventListener('cancel',event=>{event.preventDefault();cancelReview();});
document.querySelector('#confirm-review').addEventListener('click',async()=>{
 if(!reviewDialog.open||!reviewProposal||reviewBusy)return;reviewBusy=true;const proposal=reviewProposal;reviewProposal=null;document.querySelector('#review-preview').textContent='';reviewDialog.close();
 let saved;
 try{saved=await reviewMutations.run(()=>getReviewActions().execute(proposal.id));}
 catch(error){
  getReviewActions().cancel(proposal.id);
  const outcome=error.outcome==='unknown'?'unknown':'rejected';setReviewAttempt(proposal,outcome);
  reviewStatus.textContent=outcome==='unknown'?'Save outcome is unknown. Inspect local reviews before trying again; no automatic retry will occur.':'Local save was rejected before confirmation. The action will not be automatically retried.';
  reviewBusy=false;return;
 }
 reviewBusy=false;setReviewAttempt(proposal,'completed');
 try{renderReviews();reviewStatus.textContent='Source review saved in this browser. This is a source-consistency record, not factual verification.';}catch{reviewStatus.textContent='The local save returned successfully, but the review list could not be refreshed.';}
});
const clearDialog=document.querySelector('#clear-review-dialog'),clearButton=document.querySelector('#clear-local-reviews');
let clearSnapshot=null;
clearButton.addEventListener('click',()=>{if(reviewBusy||clearDialog.open)return;try{clearSnapshot=getReviewStore().captureClear();clearDialog.showModal();}catch{clearSnapshot=null;reviewStatus.textContent='Local review data could not be inspected for clearing.';}});
function closeClear(){clearSnapshot=null;if(clearDialog.open)clearDialog.close();clearButton.focus();}
document.querySelector('#cancel-clear-reviews').addEventListener('click',closeClear);
clearDialog.addEventListener('cancel',event=>{event.preventDefault();closeClear();});
document.querySelector('#confirm-clear-reviews').addEventListener('click',async()=>{
 if(!clearDialog.open||!clearSnapshot||reviewBusy)return;
 const confirmed=clearSnapshot;closeClear();reviewBusy=true;
 try{await reviewMutations.run(confirmed);if(reviewProposal)getReviewActions().cancel(reviewProposal.id);reviewProposal=null;document.querySelector('#review-preview').textContent='';forgetReviewAttempt();renderReviews();reviewStatus.textContent='Local review data cleared from this browser. Previously downloaded files are not deleted.';}
 catch(error){if(error?.outcome==='unknown'){if(reviewProposal)getReviewActions().cancel(reviewProposal.id);reviewProposal=null;document.querySelector('#review-preview').textContent='';forgetReviewAttempt();}try{renderReviews();}catch{}reviewStatus.textContent=error?.outcome==='unknown'?'Local review clear outcome is unknown. Some data may already have been removed; inspect current records before trying again. No automatic retry.':'Could not confirm clearing local review data. Inspect before trying again; no automatic retry.';}
 finally{reviewBusy=false;}
});
window.addEventListener('storage',event=>{if(event.key!==REVIEW_STORAGE_KEY&&event.key!==LEGACY_REVIEW_STORAGE_KEY&&event.key!==null)return;if(reviewProposal)cancelReview();if(clearDialog.open)closeClear();forgetReviewAttempt();try{renderReviews();reviewStatus.textContent='Local review collection changed in another tab. Inspect the updated records.';}catch{reviewStatus.textContent='Local review data changed and could not be read.';}});
window.addEventListener('pagehide',()=>{reviewMutations.revoke();if(reviewProposal)cancelReview();if(clearDialog.open)closeClear();});
 // A restored document can have missed storage notifications while frozen.
 // Re-read local records before exposing old rows or downloadable outcomes.
window.addEventListener('pageshow',event=>{
 if(!event.persisted)return;
 forgetReviewAttempt();
 try{renderReviews();}
 catch{reviewStatus.textContent='Local review data could not be refreshed after returning. Inspect again before another action.';return;}
 if(!document.querySelector('#review-list [data-state="stale"]'))reviewStatus.textContent='Local reviews refreshed after returning. Inspect current records before another action.';
});
try{renderReviews();}catch{reviewStatus.textContent='Existing local review data could not be read. Other learning features remain available.';}

const sourceButton=document.querySelector('#run-source-network');
sourceButton.addEventListener('click',async()=>{
 const token=scriptedAuthority.begin('source');if(!token)return;
 const signal=token.controller.signal,valid=()=>scriptedAuthority.current('source',token);
 sourceButton.disabled=true;const status=document.querySelector('#source-network-result');setStatus(status,'loading','Loading the source network…');
 try{
  const published=await loadLocalNetwork({baseUrl:new URL(`${import.meta.env.BASE_URL}agents/`,location.origin).href,networkName:'source_learner',expectedOrigin:location.origin,allowSourceTools:true,signal});
  if(!valid())return;
  const result=await runNetwork({...published,request:'Find the featured source cue.',model:createSourceScriptedModel(),sourceTools:{origin:location.origin,sources:content.sources},signal});
  if(valid())setStatus(status,'completed',`${result.text} ${result.agentCalls} agent invocations; ${result.modelCalls} scripted model steps; two source reads.`);
 }catch{if(valid())setStatus(status,'error','Source retrieval unavailable. No completed source result is claimed. Live inference remains disabled.');}
 finally{if(scriptedAuthority.finish('source',token))sourceButton.disabled=false;}
});
window.addEventListener('pagehide',()=>{
 const revoked=scriptedAuthority.revoke();
 if(revoked.includes('network')){
  runButton.disabled=false;document.querySelector('#network-trace').replaceChildren();
  setStatus(document.querySelector('#network-result'),'cancelled','Scripted network cancelled on navigation. No completed result is claimed.');
 }
 if(revoked.includes('source')){
  sourceButton.disabled=false;
  setStatus(document.querySelector('#source-network-result'),'cancelled','Source retrieval cancelled on navigation. No completed source result is claimed.');
 }
});

document.querySelector('#read-playback').addEventListener('click',()=>{document.querySelector('#playback-state').textContent=JSON.stringify(timingPlayer?.readState()??{available:false,reason:'media_not_loaded'});});

async function seekReceipt(receipt){
 const source=timingFixture.source;
 if(!timingPlayer||receipt.sourceId!==source.id||receipt.sourceVersion!==source.version||receipt.sourceHash!==source.hash||receipt.mediaHash!==source.mediaHash)throw Error('Exact receipt media not loaded');
 const actual=await timingPlayer.seek(receipt.start);
 if(!isNativeCueReached(actual,receipt.start,receipt.end))throw Error('Native playback did not reach the exact cue interval');
 return actual;
}
mountDirectLookup({root:document.querySelector('#direct-lookup'),sources:content.sources,seekTo:seekReceipt,prepareReview:prepareReviewFor});
mountLocalAnswer({root:document.querySelector('#local-answer'),sources:content.sources,seekTo:seekReceipt,prepareReview:prepareReviewFor});
mountProviderPanel({loadedContent:content,seekTo:seekReceipt,prepareReview:prepareReviewFor});
mountPeerWorkbench({baseUrl:new URL(`${import.meta.env.BASE_URL}agents/`,location.origin).href});

const consentDialog=document.querySelector('#consent-dialog'),consentStatus=document.querySelector('#consent-status'),consentEvents=document.querySelector('#consent-events');
const consentPreviewButton=document.querySelector('#preview-peer-contact');
let pendingConsentDecision=null,consentPreview=null,simulatedPeerOperations=0;
const peerContact={origin:'https://peer.invalid/',kind:'peer_manifest',purpose:'Load a declared public peer manifest',disclosure:['network name','requested capability'],network:'checklist'};
function finishConsent(decision,scope='once',expected=pendingConsentDecision){
 if(!expected||pendingConsentDecision!==expected)return;
 pendingConsentDecision=null;expected.signal?.removeEventListener('abort',expected.abort);
 if(consentDialog.open)consentDialog.close();
 const permitted=decision==='allow'&&consentPreview===expected.owner&&!expected.signal?.aborted&&!expected.owner.signal.aborted;
 expected.resolve({decision:permitted?'allow':'deny',scope:permitted?scope:'once'});
}
const consentInspector=createConsentInspector({decide:(intent,{signal}={})=>new Promise(resolve=>{
 const owner=consentPreview;
 if(!owner||signal?.aborted||owner.signal.aborted||pendingConsentDecision){resolve({decision:'deny',scope:'once'});return;}
 const entry={resolve,owner,signal,abort:null};entry.abort=()=>finishConsent('deny','once',entry);
 pendingConsentDecision=entry;signal?.addEventListener('abort',entry.abort,{once:true});
 document.querySelector('#consent-origin').textContent=intent.origin;
 document.querySelector('#consent-purpose').textContent=intent.purpose;
 document.querySelector('#consent-disclosure').textContent=intent.disclosure.join(', ');
 try{consentDialog.showModal();document.querySelector('#deny-peer-contact').focus();}
 catch{finishConsent('deny','once',entry);}
})});
consentDialog.addEventListener('cancel',event=>{event.preventDefault();finishConsent('deny');});
consentDialog.addEventListener('close',()=>{if(!consentDialog.open&&pendingConsentDecision)finishConsent('deny');});
document.querySelector('#deny-peer-contact').addEventListener('click',()=>finishConsent('deny','once'));
document.querySelector('#allow-peer-once').addEventListener('click',()=>finishConsent('allow','once'));
document.querySelector('#allow-peer-session').addEventListener('click',()=>finishConsent('allow','session'));
consentPreviewButton.addEventListener('click',async()=>{
 if(consentPreview)return;
 const operation=new AbortController();consentPreview=operation;consentPreviewButton.disabled=true;
 const valid=()=>consentPreview===operation&&!operation.signal.aborted;
 setStatus(consentStatus,'loading','Evaluating consent before any simulated peer operation…');
 try{
  await consentInspector.perform(peerContact,async()=>{
   if(!valid())return;
   simulatedPeerOperations++;return {simulated:true};
  },{signal:operation.signal});
  if(valid())setStatus(consentStatus,'completed','Consent allowed the simulated operation. No external request was made. Simulated operations: '+simulatedPeerOperations+'.');
 }catch(error){
  if(valid())setStatus(consentStatus,error.code==='CONSENT_DENIED'?'denied':'error',error.code==='CONSENT_DENIED'?'Contact denied before the simulated operation. Local lesson and evidence remain available.':'Consent flow stopped. No external request was made.');
 }finally{
  if(consentPreview===operation){
   consentPreview=null;consentPreviewButton.disabled=false;
   consentEvents.textContent=JSON.stringify(consentInspector.exportEvents(),null,2);
  }
 }
});
window.addEventListener('pagehide',()=>{
 const pending=consentPreview;pending?.abort();consentPreview=null;
 consentInspector.clearSession();finishConsent('deny');
 consentPreviewButton.disabled=false;
 if(pending)setStatus(consentStatus,'cancelled','Synthetic consent preview cancelled on navigation. No operation completion is claimed.');
 consentEvents.textContent=JSON.stringify(consentInspector.exportEvents(),null,2);
});

}
