import './style.css';
import {validateReceipt} from '../../../packages/sutra-evidence/index.js';
import receipt from '../../../packages/sutra-evidence/examples/receipt.json';
import sources from '../../../packages/sutra-evidence/examples/sources.json';
document.querySelector('#app').innerHTML=`<header><a class="brand" href="#main">SUTRA<span>Learning, linked to evidence</span></a><span class="stage">Local development shell</span></header>
<main id="main"><div class="eyebrow">A moment in the lesson. A source you can inspect.</div><h1>Find the moment.<br>Keep the evidence.</h1><p class="intro">Connect a lesson’s exact words to a reviewable record. Inspect where an answer comes from before you use it.</p>
<div class="notice"><strong>Synthetic example</strong> · No live agents or original lesson footage are connected. This example demonstrates source consistency, not factual verification.</div>
<div class="workspace"><section class="lesson" aria-labelledby="lesson-title"><div class="section-label">01 / LESSON</div><h2 id="lesson-title">Recording a reading</h2><div class="media-empty"><span class="media-label">Original lesson pending</span><h3>A real lesson belongs here.</h3><p>Rights-cleared footage and a factual reviewer are still needed. No playback or seek result is simulated.</p></div><div class="transcript"><h3>Example transcript</h3><button id="cue" class="cue" aria-pressed="false"><span>00:12–00:18</span><span id="cue-text"></span></button><p class="muted">Synthetic cue · media identity is a fixture placeholder.</p></div></section>
<section class="evidence" aria-labelledby="evidence-title"><div class="section-label">02 / INSPECT</div><h2 id="evidence-title">Follow the source.</h2><p>Select the transcript cue to inspect its receipt, or run the example below.</p><div class="actions"><button id="check" class="primary">Check example</button><button id="alter">Try altered quotation</button></div><div id="result" class="result" role="status" aria-live="polite">No consistency check run yet.</div><dl id="details" hidden><dt>Source</dt><dd id="source"></dd><dt>Cue</dt><dd id="cue-id"></dd><dt>Reference checks</dt><dd>Version, media identity, exact interval and exact text</dd></dl><div class="boundary"><h3>Consistent is not necessarily true.</h3><p>A match means the receipt agrees with the supplied catalog. It does not prove the catalog’s accuracy, publisher trust, or semantic support for a claim.</p></div><details><summary>What remains to connect</summary><p>Browser agent runtime, approved peer guide, funded inference, original media, and reviewed learning-card actions are planned. This shell makes no external model or peer requests.</p></details></section></div>
<footer>Built for inspectable learning · English working shell · No account or API key needed</footer></main>`;
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
