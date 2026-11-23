import './style.css';
import {createReviewStore} from './review-store.js';
import timingFixture from './fixtures/timing-source.json';
import {loadLocalNetwork,runNetwork} from '../../../packages/sutra-runtime/index.js';
import {createScriptedModel} from '../../../packages/sutra-runtime/testing.js';
import {validateReceipt} from '../../../packages/sutra-evidence/index.js';
import receipt from '../../../packages/sutra-evidence/examples/receipt.json';
import sources from '../../../packages/sutra-evidence/examples/sources.json';
document.querySelector('#app').innerHTML=`<header><a class="brand" href="#main">SUTRA<span>Learning, linked to evidence</span></a><span class="stage">Local development shell</span></header>
<main id="main"><div class="eyebrow">A moment in the lesson. A source you can inspect.</div><h1>Find the moment.<br>Keep the evidence.</h1><p class="intro">Connect a lesson’s exact words to a reviewable record. Inspect where an answer comes from before you use it.</p>
<div class="notice"><strong>Synthetic example</strong> · No live agents or original lesson footage are connected. This example demonstrates source consistency, not factual verification.</div>
<div class="workspace"><section class="lesson" aria-labelledby="lesson-title"><div class="section-label">01 / LESSON</div><h2 id="lesson-title">Recording a reading</h2><div class="media-empty"><span class="media-label">Original lesson pending</span><h3>A real lesson belongs here.</h3><p>Rights-cleared footage and a factual reviewer are still needed. No playback or seek result is simulated.</p></div><button id="load-timing">Load synthetic timing fixture</button><p id="timing-status" role="status"></p><button id="seek-timing" hidden>Inspect timing cue at 00:02</button><div class="transcript"><h3>Example transcript</h3><button id="cue" class="cue" aria-pressed="false"><span>00:12–00:18</span><span id="cue-text"></span></button><p class="muted">Synthetic cue · media identity is a fixture placeholder.</p></div></section>
<section class="evidence" aria-labelledby="evidence-title"><div class="section-label">02 / INSPECT</div><h2 id="evidence-title">Follow the source.</h2><p>Select the transcript cue to inspect its receipt, or run the example below.</p><div class="actions"><button id="check" class="primary">Check example</button><button id="alter">Try altered quotation</button></div><div id="result" class="result" role="status" aria-live="polite">No consistency check run yet.</div><dl id="details" hidden><dt>Source</dt><dd id="source"></dd><dt>Cue</dt><dd id="cue-id"></dd><dt>Reference checks</dt><dd>Version, media identity, exact interval and exact text</dd></dl><div class="boundary"><h3>Consistent is not necessarily true.</h3><p>A match means the receipt agrees with the supplied catalog. It does not prove the catalog’s accuracy, publisher trust, or semantic support for a claim.</p></div><details><summary>What remains to connect</summary><p>Browser agent runtime, approved peer guide, funded inference, original media, and reviewed learning-card actions are planned. This shell makes no external model or peer requests.</p></details></section></div>
<section class="runtime-lab" aria-labelledby="runtime-title"><div class="section-label">03 / DEVELOPER PREVIEW</div><h2 id="runtime-title">Inspect browser orchestration.</h2><p>This is an explicit scripted test of the pinned nsDeploy agent loop. It loads the published local graph, delegates from learner to evidence, and returns a test result. No live AI, external peer, or factual verification is involved.</p><button id="run-network" class="primary">Run scripted network test</button><p id="network-result" role="status" aria-live="polite">Network test not started.</p><ol id="network-trace" aria-label="Sanitized orchestration trace"></ol><p class="muted">Trace excludes request text, model content, tool arguments and credentials. A successful test does not establish challenge conformance.</p></section><section class="review-section" aria-labelledby="review-title"><div class="section-label">04 / YOUR REVIEW</div><h2 id="review-title">Keep a reviewable reference.</h2><p>Preview the synthetic timing receipt before saving it in this browser. No account, server write or factual verification is involved.</p><button id="prepare-review">Preview synthetic review card</button><p id="review-status" role="status" aria-live="polite">No review card saved this session.</p><ul id="review-list"></ul><dialog id="review-dialog" aria-labelledby="review-dialog-title"><h3 id="review-dialog-title">Review before local save</h3><p>Synthetic timing fixture · consistency only, not factual truth.</p><pre id="review-preview"></pre><div class="actions"><button id="confirm-review" class="primary">Confirm local save</button><button id="cancel-review">Cancel</button></div></dialog></section><footer>Built for inspectable learning · English working shell · No account or API key needed</footer></main>`;
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
