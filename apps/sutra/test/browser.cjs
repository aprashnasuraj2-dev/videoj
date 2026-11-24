const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const app=path.resolve(__dirname,'..');const base='http://127.0.0.1:4183';
 const server=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','4183','--strictPort'],{cwd:app,stdio:'pipe'});
 let browser;let exited=false,serverLog='';for(const output of [server.stdout,server.stderr])output.on('data',data=>{serverLog=(serverLog+data.toString()).slice(-8000);});server.on('exit',()=>exited=true);
 try{
  let ready=false;for(let i=0;i<60;i++){if(exited)throw Error(`Preview exited before readiness: ${serverLog}`);try{const r=await fetch(base,{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready,'preview ready');
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:1050}});const errors=[],external=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{requests.push(r.url());if(!r.url().startsWith(base+'/')&&!r.url().startsWith('blob:'+base+'/'))external.push(r.url());});
  await page.goto(base);await page.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
  assert.equal(await page.locator('#network-result').getAttribute('data-state'),'empty');assert.equal(await page.locator('#source-network-result').getAttribute('data-state'),'empty');assert.equal(await page.locator('#timing-status').getAttribute('data-state'),'empty');
  // Text-first path stays usable before the optional MP4 is requested.
  const initialTranscript=page.getByRole('searchbox',{name:'Search synthetic transcript'});
  assert.equal(await initialTranscript.count(),1);
  assert.equal(requests.some(url=>url.includes('/media/timing-fixture.mp4')),false);
  await initialTranscript.fill('timing marker');
  assert.equal(await page.locator('#timing-transcript-panel .transcript-cue').count(),1);
  await page.locator('#timing-transcript-panel .transcript-cue').click();
  assert.match(await page.locator('#timing-transcript-panel .transcript-status').innerText(),/could not be reached/);
  assert.equal(requests.some(url=>url.includes('/media/timing-fixture.mp4')),false,'transcript interaction must not autoload video');
  await initialTranscript.fill('');
  assert.equal(await page.locator('#comparison-body .comparison-status').getAttribute('data-state'),'missing_source');
  assert.match(await page.locator('#comparison-body .comparison-status').innerText(),/No reviewed guide claim/);
  assert.match(await page.locator('#comparison-body .comparison-card').first().innerText(),/synthetic-timing-fixture/);
  assert.match(await page.locator('#comparison-body .comparison-card').first().innerText(),/Fixture receipt retrieval timestamp/);
  assert.match(await page.locator('#comparison-body .comparison-card').first().innerText(),/SUTRA local synthetic timing catalog/);
  await page.getByRole('button',{name:'Inspect native video cue at 2 seconds'}).click();
  assert.match(await page.locator('#comparison-body .comparison-seek-status').innerText(),/Video cue unavailable/);
  await page.getByRole('button',{name:'Demonstrate a synthetic conflict'}).click();
  assert.equal(await page.locator('#comparison-body .comparison-status').getAttribute('data-state'),'unresolved_conflict');
  assert.match(await page.locator('#comparison-body .comparison-status').innerText(),/Neither side is declared factually correct/);
  assert.match(await page.locator('#comparison-body .comparison-card').first().innerText(),/two signatures/);
  assert.match(await page.locator('#comparison-body .comparison-card').last().innerText(),/three signatures/);
  assert.match(await page.locator('#comparison-body .comparison-card').last().innerText(),/not an external publisher/);
  await page.getByRole('button',{name:'Inspect available evidence'}).click();
  assert.equal(await page.locator('#comparison-body .comparison-status').getAttribute('data-state'),'missing_source');
  await page.getByRole('button',{name:'Check example',exact:true}).click();assert.match(await page.locator('#result').innerText(),/Catalog matched/);assert.match(await page.locator('#result').innerText(),/Factual truth has not been checked/);
  await page.getByRole('button',{name:'Try altered quotation'}).click();assert.match(await page.locator('#result').innerText(),/QUOTE_MISMATCH/);
  await page.locator('#cue').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#cue').getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Run scripted network test'}).click();await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('2 agent invocations; 3 scripted model steps.'));assert.equal(await page.locator('#network-result').getAttribute('data-state'),'completed');assert.equal(await page.locator('#network-trace li').count(),2);assert.match(await page.locator('#network-result').innerText(),/No live AI/);
  await page.getByRole('button',{name:'Run scripted source retrieval',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#source-network-result').textContent.includes('5 scripted model steps; two source reads.'));assert.match(await page.locator('#source-network-result').innerText(),/Synthetic timing marker/);assert.match(await page.locator('#source-network-result').innerText(),/factual truth remains unverified/);
  await page.route('**/api/source-tools',route=>route.abort());await page.getByRole('button',{name:'Run scripted source retrieval',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#source-network-result').textContent.includes('No completed source result is claimed.'));assert.equal(await page.locator('#source-network-result').getAttribute('data-state'),'error');await page.unroute('**/api/source-tools');
  const invalidGraph=JSON.parse(fs.readFileSync(path.join(app,'public/agents/learner.network.json')));invalidGraph.tools[1].tools=['learner'];
  await page.route('**/agents/v/**/learner.network.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(invalidGraph)}));await page.getByRole('button',{name:'Run scripted network test'}).click();await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('(CYCLE)'));assert.equal(await page.locator('#network-trace li').count(),0);await page.unroute('**/agents/v/**/learner.network.json');
  await page.route('**/agents/v/**/learner.network.json',route=>route.abort());await page.getByRole('button',{name:'Run scripted network test'}).click();await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('No completed result is claimed.'));await page.unroute('**/agents/v/**/learner.network.json');
  await page.getByRole('button',{name:'Preview synthetic peer contact'}).click();await page.getByRole('dialog',{name:'External contact request'}).waitFor();assert.match(await page.locator('#consent-origin').innerText(),/peer\.invalid/);assert.match(await page.locator('#consent-purpose').innerText(),/public peer manifest/);assert.match(await page.locator('#consent-disclosure').innerText(),/network name/);const externalBeforeDeny=external.length;await page.getByRole('button',{name:'Deny',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#consent-status').textContent.includes('denied before'));assert.equal(await page.locator('#consent-status').getAttribute('data-state'),'denied');assert.equal(external.length,externalBeforeDeny);assert.match(await page.locator('#consent-events').textContent(),/decision|deny/i);
  await page.getByRole('button',{name:'Preview synthetic peer contact'}).click();await page.getByRole('button',{name:'Allow for this session (simulate)'}).click();await page.waitForFunction(()=>document.querySelector('#consent-status').textContent.includes('Simulated operations: 1'));const externalBeforeRemembered=external.length;await page.getByRole('button',{name:'Preview synthetic peer contact'}).click();await page.waitForFunction(()=>document.querySelector('#consent-status').textContent.includes('Simulated operations: 2'));assert.equal(external.length,externalBeforeRemembered);assert.match(await page.locator('#consent-events').textContent(),/remembered/);
  await page.getByRole('button',{name:'Preview synthetic review card'}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('#review-list li').count(),0);
  await page.getByRole('button',{name:'Preview synthetic review card'}).click();await page.getByRole('button',{name:'Confirm local save'}).click();assert.equal(await page.locator('#review-list li').count(),1);assert.match(await page.locator('#review-status').innerText(),/not factual verification/);
  const reviewDownloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download saved receipt'}).click();
  const reviewDownload=await reviewDownloadPromise;
  assert.equal(reviewDownload.suggestedFilename(),'sutra-synthetic-review.json');
  const exportedReview=JSON.parse(fs.readFileSync(await reviewDownload.path(),'utf8'));
  assert.equal(exportedReview.type,'sutra-local-review-export');
  assert.equal(exportedReview.truthStatus,'unverified');
  assert.equal(exportedReview.receipt.sourceId,'synthetic-timing-fixture');
  assert.ok(!JSON.stringify(exportedReview).includes('apiKey'));
  assert.match(await page.locator('#review-status').innerText(),/download requested/);
  const completedAttemptDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download last save outcome'}).click();
  const completedAttempt=JSON.parse(fs.readFileSync(await (await completedAttemptDownload).path(),'utf8'));
  assert.equal(completedAttempt.outcome,'completed');assert.equal(completedAttempt.requestId,exportedReview.id);
  await page.reload();assert.equal(await page.locator('#review-list li').count(),1);await page.getByRole('button',{name:'Delete local review'}).click();assert.equal(await page.locator('#review-list li').count(),0);

  // Known quota rejection: zero persisted record, explicit rejected receipt, no retry.
  await page.evaluate(()=>{
   window.__sutraOriginalSetItem=Storage.prototype.setItem;window.__sutraWriteCalls=0;
   Storage.prototype.setItem=function(key,value){if(key==='sutra.synthetic-review-cards.v1'){window.__sutraWriteCalls++;throw new DOMException('quota','QuotaExceededError');}return window.__sutraOriginalSetItem.call(this,key,value);};
  });
  await page.getByRole('button',{name:'Preview synthetic review card'}).click();await page.getByRole('button',{name:'Confirm local save'}).click();
  assert.match(await page.locator('#review-status').innerText(),/rejected before confirmation/);
  assert.equal(await page.locator('#review-list li').count(),0);assert.equal(await page.evaluate(()=>window.__sutraWriteCalls),1);
  const rejectedDownloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download last save outcome'}).click();
  const rejected=JSON.parse(fs.readFileSync(await (await rejectedDownloadPromise).path(),'utf8'));assert.equal(rejected.outcome,'rejected');
  await page.evaluate(()=>{Storage.prototype.setItem=window.__sutraOriginalSetItem;});

  // Ambiguous failure after the write side effect: do not claim failure or retry.
  await page.evaluate(()=>{
   const original=Storage.prototype.setItem;window.__sutraOriginalSetItem=original;window.__sutraWriteCalls=0;
   Storage.prototype.setItem=function(key,value){if(key==='sutra.synthetic-review-cards.v1'){window.__sutraWriteCalls++;original.call(this,key,value);throw new Error('synthetic disconnect after write');}return original.call(this,key,value);};
  });
  await page.getByRole('button',{name:'Preview synthetic review card'}).click();await page.getByRole('button',{name:'Confirm local save'}).click();
  assert.match(await page.locator('#review-status').innerText(),/outcome is unknown/);assert.equal(await page.evaluate(()=>window.__sutraWriteCalls),1);
  const unknownDownloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download last save outcome'}).click();
  const unknown=JSON.parse(fs.readFileSync(await (await unknownDownloadPromise).path(),'utf8'));assert.equal(unknown.outcome,'unknown');assert.match(unknown.outcomeMeaning,/may have happened/);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__sutraOriginalSetItem;});
  await page.reload();assert.equal(await page.locator('#review-list li').count(),1,'unknown outcome can reveal a real prior side effect on later inspection');
  await page.getByRole('button',{name:'Delete local review'}).click();assert.equal(await page.locator('#review-list li').count(),0);
  await page.getByRole('button',{name:'Read current playback state',exact:true}).click();assert.equal(JSON.parse(await page.locator('#playback-state').innerText()).available,false);
  // A missing media response must fail honestly and allow a later explicit retry.
  await page.route('**/media/timing-fixture.mp4*',route=>route.fulfill({status:404,contentType:'text/plain',body:'missing fixture'}));
  await page.getByRole('button',{name:'Load synthetic timing fixture'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Timing fixture unavailable.'));
  assert.equal(await page.locator('#timing-status').getAttribute('data-state'),'error');
  assert.equal(await page.locator('video').count(),0);
  assert.equal(await page.getByRole('button',{name:'Load synthetic timing fixture'}).isEnabled(),true);
  await page.unroute('**/media/timing-fixture.mp4*');
  // A stale deployment may return HTTP 200 with the wrong bytes. Hash binding
  // must stop before Blob/player mount and leave an explicit retry path.
  await page.route('**/media/timing-fixture.mp4*',route=>route.fulfill({status:200,contentType:'video/mp4',body:'stale-media-bytes'}));
  await page.getByRole('button',{name:'Load synthetic timing fixture'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Timing fixture unavailable.'));
  assert.equal(await page.locator('video').count(),0);
  await page.unroute('**/media/timing-fixture.mp4*');
  // Poster is independent of media decode: a missing poster must not turn a
  // successful native video load into an unavailable lesson.
  await page.route('**/media/timing-poster.svg*',route=>route.fulfill({status:404,contentType:'text/plain',body:'missing poster'}));
  await page.getByRole('button',{name:'Load synthetic timing fixture'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Actual media duration: 8.0 seconds.'));
  assert.equal(await page.locator('#timing-status').getAttribute('data-state'),'completed');
  assert.ok(requests.some(url=>url.includes('/media/timing-poster.svg')),'host-supplied poster request is independently observable');
  await page.unroute('**/media/timing-poster.svg*');
  const transcriptSearch=page.getByRole('searchbox',{name:'Search synthetic transcript'});
  assert.match(await page.locator('#timing-transcript-panel .transcript-meta').innerText(),/synthetic-timing-fixture.*v1/);
  await transcriptSearch.fill('not-in-the-fixture');
  assert.equal(await page.locator('#timing-transcript-panel .transcript-cue').count(),0);
  assert.match(await page.locator('#timing-transcript-panel .transcript-status').innerText(),/No transcript cues match/);
  await transcriptSearch.fill('timing marker');
  assert.equal(await page.locator('#timing-transcript-panel .transcript-cue').count(),1);
  const cueButton=page.locator('#timing-transcript-panel .transcript-cue');
  assert.match(await cueButton.innerText(),/Source wording.*unverified/);
  await cueButton.focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#timing-transcript-panel .transcript-status').textContent.includes('Native media reached'));
  assert.ok(Math.abs(await page.locator('video').evaluate(video=>video.currentTime)-2)<=1);
  assert.equal(await cueButton.getAttribute('aria-current'),'true');
  await page.getByRole('button',{name:'Inspect native video cue at 2 seconds'}).click();
  await page.waitForFunction(()=>document.querySelector('#comparison-body .comparison-seek-status').textContent.includes('Native media reached'));
  assert.ok(Math.abs(await page.locator('video').evaluate(v=>v.currentTime)-2)<=1);
  const media=page.locator('video');assert.equal(await media.count(),1);
  await page.getByRole('button',{name:'Inspect timing cue at 00:02'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Synthetic cue reached.'));
  assert.ok(Math.abs(await media.evaluate(video=>video.currentTime)-2)<=1);
  // Ordinary player controls must drive the native media state.
  const playControl=page.locator('media-play-button'),muteControl=page.locator('media-mute-button'),
   volumeSlider=page.locator('media-volume-slider'),captionControl=page.locator('media-captions-button'),
   fullscreenControl=page.locator('media-fullscreen-button');
  await playControl.click();await page.waitForFunction(()=>document.querySelector('video').currentTime>2.15);
  assert.equal(await media.evaluate(video=>video.paused),false);
  await playControl.click();await page.waitForFunction(()=>document.querySelector('video').paused===true);
  await muteControl.click();assert.equal(await media.evaluate(video=>video.muted),true);
  await muteControl.click();assert.equal(await media.evaluate(video=>video.muted),false);
  const volumeBox=await volumeSlider.boundingBox();assert.ok(volumeBox&&volumeBox.width>=24);
  await page.mouse.click(volumeBox.x+volumeBox.width*.35,volumeBox.y+Math.max(1,volumeBox.height/2));
  const volume=await media.evaluate(video=>video.volume);assert.ok(volume>.15&&volume<.65,'volume slider changes native volume');
  const captionTrack=await media.evaluate(video=>Array.from(video.textTracks).find(t=>t.kind==='captions')?.mode??'missing');
  assert.notEqual(captionTrack,'missing');
  await captionControl.click();
  await page.waitForFunction(()=>Array.from(document.querySelector('video').textTracks).some(t=>t.kind==='captions'&&t.mode==='showing'));
  await fullscreenControl.click();
  await page.waitForFunction(()=>document.fullscreenElement!==null);
  assert.ok(await page.evaluate(()=>document.fullscreenElement?.closest('video-player')!==null||document.fullscreenElement?.tagName==='VIDEO-PLAYER'||document.fullscreenElement?.tagName==='MEDIA-CONTAINER'));
  await fullscreenControl.click();await page.waitForFunction(()=>document.fullscreenElement===null);
  assert.equal(await media.evaluate(video=>video.paused),true);
  const replaceResult=await page.evaluate(async()=>{
   const {mountTimingPlayer}=await import('/src/player-adapter.js');
   const host=document.createElement('div');host.style.display='none';document.body.append(host);
   const valid=new URL('/media/timing-fixture.mp4',location.origin).href;
   const adapter=mountTimingPlayer(host,{source:valid});
   await adapter.ready();
   let decodeRejected=false;
   try{await adapter.replaceSource('data:video/mp4;base64,AAAA');}catch{decodeRejected=true;}
   const afterBad=adapter.readState();
   const recovered=await adapter.replaceSource(valid);
   const current=adapter.readState();
   host.remove();
   return {decodeRejected,afterBad,recovered,current};
  });
  assert.equal(replaceResult.decodeRejected,true,'invalid replacement must reject on native decode/load error');
  assert.equal(replaceResult.afterBad.available,false,'failed replacement cannot retain stale ready metadata');
  assert.equal(replaceResult.recovered.available,true);
  assert.equal(replaceResult.current.available,true);
  assert.ok(Math.abs(replaceResult.current.duration-8)<.1);
  await page.getByRole('button',{name:'Read current playback state',exact:true}).click();const snapshot=JSON.parse(await page.locator('#playback-state').innerText());assert.equal(snapshot.available,true);assert.equal(snapshot.paused,true);assert.equal(snapshot.duration,await media.evaluate(video=>video.duration));assert.ok(Math.abs(snapshot.currentTime-await media.evaluate(video=>video.currentTime))<.1);
  // Source replacement is explicit and transactional: a valid replacement
  // reaches native metadata, while unsupported bytes fail and restore the last
  // working source rather than leaving the learner on a broken media element.
  const sourceSwap=await page.evaluate(async root=>{
   const {mountTimingPlayer}=await import('/@fs/'+root+'/apps/sutra/src/player-adapter.js');
   const host=document.createElement('div');host.hidden=true;document.body.append(host);
   const fixture=new URL('/media/timing-fixture.mp4?source-swap=initial',location.href).href;
   const replacement=new URL('/media/timing-fixture.mp4?source-swap=replacement',location.href).href;
   const adapter=mountTimingPlayer(host,{source:fixture});
   await adapter.ready();
   const first=adapter.media.currentSrc;
   const replaced=await adapter.replaceSource(replacement);
   const second=adapter.media.currentSrc;
   const bad=URL.createObjectURL(new Blob(['not a decodable mp4'],{type:'video/mp4'}));
   let failure=null;
   try{await adapter.replaceSource(bad);}catch(error){failure={code:error.code??null,recovered:error.recovered===true};}
   URL.revokeObjectURL(bad);
   const restored=adapter.media.currentSrc===second&&adapter.media.readyState>=1&&Number.isFinite(adapter.media.duration);
   host.remove();
   return {first,second,replaced,failure,restored};
  },root);
  assert.notEqual(sourceSwap.first,sourceSwap.second,'valid source replacement must reach a distinct native URL');
  assert.equal(sourceSwap.replaced.available,true);
  assert.deepEqual(sourceSwap.failure,{code:'MEDIA_UNSUPPORTED',recovered:true});
  assert.equal(sourceSwap.restored,true,'unsupported replacement restores the prior playable source');
  fs.mkdirSync(path.join(app,'test-output'),{recursive:true});await page.screenshot({path:path.join(app,'test-output/desktop.png'),fullPage:true});
  await page.setViewportSize({width:360,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.getByRole('button',{name:'Try altered quotation'}).click();assert.match(await page.locator('#result').innerText(),/QUOTE_MISMATCH/);
  await page.screenshot({path:path.join(app,'test-output/mobile.png'),fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.ok(!requests.some(url=>url.includes('/assets/mux-video-')),'native fixture must not load optional Mux chunk');
  console.log('PASS: catalog match, truth boundary, rejection, completed/rejected/unknown local-write receipts without retry, keyboard, scripted browser-local two-agent orchestration, consent-before-contact denial/session scope, native timing-fixture recovery/play/pause/volume/captions/fullscreen/seek, 360px interaction/overflow, no errors and no external requests.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
