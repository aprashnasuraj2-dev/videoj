const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const app=path.resolve(__dirname,'..'),root=path.resolve(app,'../..');const base='http://127.0.0.1:4183';
 const server=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','4183','--strictPort'],{cwd:app,stdio:'pipe'});
 let browser;let exited=false,serverLog='';for(const output of [server.stdout,server.stderr])output.on('data',data=>{serverLog=(serverLog+data.toString()).slice(-8000);});server.on('exit',()=>exited=true);
 try{
  let ready=false;for(let i=0;i<60;i++){if(exited)throw Error(`Preview exited before readiness: ${serverLog}`);try{const r=await fetch(base,{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready,'preview ready');
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:1050}});const errors=[],external=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{requests.push(r.url());if(!r.url().startsWith(base+'/')&&!r.url().startsWith('blob:'+base+'/'))external.push(r.url());});
  await page.goto(base);await page.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
  assert.equal(await page.locator('#network-result').getAttribute('data-state'),'empty');assert.equal(await page.locator('#source-network-result').getAttribute('data-state'),'empty');assert.equal(await page.locator('#timing-status').getAttribute('data-state'),'empty');
  // Text-first path stays usable before the optional MP4 is requested.
  const initialTranscript=page.getByRole('searchbox',{name:'Search source transcript'});
  assert.equal(await initialTranscript.count(),1);
  assert.equal(requests.some(url=>url.includes('/media/timing-fixture.mp4')),false);
  await initialTranscript.fill('timing marker');
  assert.equal(await page.locator('#timing-transcript-panel .transcript-cue').count(),1);
  // Compatibility-normalized query text must behave the same without changing displayed source bytes.
  await initialTranscript.fill('ｔｉｍｉｎｇ marker');
  assert.equal(await page.locator('#timing-transcript-panel .transcript-cue').count(),1);
  assert.match(await page.locator('#timing-transcript-panel .transcript-cue').innerText(),/Synthetic timing marker/);
  await initialTranscript.fill('timing marker');
  await page.locator('#timing-transcript-panel .transcript-cue').click();
  assert.match(await page.locator('#timing-transcript-panel .transcript-status').innerText(),/could not be reached/);
  assert.equal(requests.some(url=>url.includes('/media/timing-fixture.mp4')),false,'transcript interaction must not autoload video');
  await initialTranscript.fill('');
  assert.equal(await page.locator('#comparison-body .comparison-status').getAttribute('data-state'),'missing_source');
  assert.match(await page.locator('#comparison-body .comparison-status').innerText(),/No reviewed guide claim/);
  assert.equal(await page.locator('#comparison-body .comparison-next-step').getAttribute('data-disposition'),'abstain');
  assert.match(await page.locator('#comparison-body .comparison-next-step').innerText(),/missing original source/);
  assert.match(await page.locator('#comparison-body .comparison-card').first().innerText(),/synthetic-timing-fixture/);
  assert.match(await page.locator('#comparison-body .comparison-card').first().innerText(),/Fixture metadata date/);
  assert.match(await page.locator('#comparison-body .comparison-card').first().innerText(),/SUTRA synthetic timing catalog/);
  await page.getByRole('button',{name:'Inspect native video cue at 2 seconds'}).click();
  assert.match(await page.locator('#comparison-body .comparison-seek-status').innerText(),/Video cue unavailable/);
  await page.getByRole('button',{name:'Demonstrate a synthetic conflict'}).click();
  assert.equal(await page.locator('#comparison-body .comparison-status').getAttribute('data-state'),'unresolved_conflict');
  assert.match(await page.locator('#comparison-body .comparison-status').innerText(),/Neither side is declared factually correct/);
  assert.equal(await page.locator('#comparison-body .comparison-next-step').getAttribute('data-disposition'),'abstain');
  assert.match(await page.locator('#comparison-body .comparison-next-step').innerText(),/do not select a winner automatically/);
  assert.match(await page.locator('#comparison-body .comparison-card').first().innerText(),/two signatures/);
  assert.match(await page.locator('#comparison-body .comparison-card').last().innerText(),/three signatures/);
  assert.match(await page.locator('#comparison-body .comparison-card').last().innerText(),/not an external publisher/);
  const obsoleteGuideCheck=await page.getByRole('button',{name:'Check written source integrity'}).elementHandle();
  await page.getByRole('button',{name:'Inspect available evidence'}).click();
  assert.equal(await page.locator('#comparison-body .comparison-status').getAttribute('data-state'),'missing_source');
  const beforeObsoleteCheck=requests.length;
  await obsoleteGuideCheck.evaluate(async button=>{button.click();await new Promise(r=>setTimeout(r,30));});
  assert.equal(requests.length,beforeObsoleteCheck,'detached comparison check cannot initiate a source fetch');
  assert.equal(await page.locator('#comparison-body .comparison-seek-status').innerText(),'');await obsoleteGuideCheck.dispose();
  await page.getByRole('button',{name:'Check example',exact:true}).click();assert.match(await page.locator('#result').innerText(),/Catalog matched/);assert.match(await page.locator('#result').innerText(),/Factual truth has not been checked/);
  // Language switching changes only tagged interface labels. It must not
  // remount source evidence or erase current validation state.
  const originalCueText=await page.locator('#cue-text').innerText();
  assert.equal(await page.locator('#language-select').getAttribute('data-nepali-reviewed'),'false');
  await page.locator('#language-select').selectOption('ne');
  assert.equal(await page.locator('html').getAttribute('lang'),'ne');
  assert.match(await page.locator('h1').innerText(),/क्षण/);
  assert.equal(await page.locator('#cue-text').innerText(),originalCueText,'original source wording is not translated');
  assert.equal(await page.locator('#result').getAttribute('data-state'),'matched','validation state survives locale switch');
  assert.equal(await page.locator('#cue').getAttribute('aria-pressed'),'true','selected evidence cue survives locale switch');
  const localizedDate=page.locator('#comparison-body [data-format-datetime]').first();
  assert.match(await localizedDate.getAttribute('data-format-datetime'),/^2026-/,'canonical evidence timestamp remains UTC ISO data');
  assert.match(await localizedDate.innerText(),/२०२६/,'Nepali display uses localized numerals while retaining Gregorian year');
  assert.match(await page.locator('#peer-elapsed').textContent(),/६०[,.]?००० ms/,'elapsed limit preserves ms while localizing numerals');
  const localizedComparisonButtons=page.locator('#comparison-body .actions button');
  await localizedComparisonButtons.nth(1).click();
  assert.match(await page.locator('#comparison-body .comparison-card h3').first().innerText(),/भिडियो/,'rerendered comparison keeps selected locale');
  assert.match(await page.locator('#comparison-body .comparison-excerpt').first().innerText(),/two signatures/,'source excerpt remains original-language data');
  await localizedComparisonButtons.nth(0).click();
  assert.equal(await page.locator('#comparison-body .comparison-status').getAttribute('data-state'),'missing_source');
  await page.locator('#language-select').selectOption('en');
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal((await page.locator('h1').innerText()).replace(/\s+/g,' ').trim(),'Find the moment. Keep the evidence.');
  assert.match(await page.locator('#peer-elapsed').textContent(),/60,000 ms/,'English elapsed limit uses the same millisecond unit and value');
  await page.getByRole('button',{name:'Try altered quotation'}).click();assert.match(await page.locator('#result').innerText(),/QUOTE_MISMATCH/);
  await page.locator('#cue').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#cue').getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Run scripted network test'}).click();await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('2 agent invocations; 3 scripted model steps.'));assert.equal(await page.locator('#network-result').getAttribute('data-state'),'completed');assert.equal(await page.locator('#network-trace li').count(),2);assert.match(await page.locator('#network-result').innerText(),/No live AI/);
  await page.locator('#language-select').selectOption('ne');
  assert.equal(await page.locator('#network-result').getAttribute('data-state'),'completed','completed orchestration state survives locale switch');
  assert.equal(await page.locator('#network-trace li').count(),2,'sanitized run trace survives locale switch');
  await page.locator('#language-select').selectOption('en');
  await page.getByRole('button',{name:'Run scripted source retrieval',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#source-network-result').textContent.includes('5 scripted model steps; two source reads.'));assert.match(await page.locator('#source-network-result').innerText(),/Synthetic timing marker/);assert.match(await page.locator('#source-network-result').innerText(),/factual truth remains unverified/);
  await page.route('**/api/source-tools',route=>route.abort());await page.getByRole('button',{name:'Run scripted source retrieval',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#source-network-result').textContent.includes('No completed source result is claimed.'));assert.equal(await page.locator('#source-network-result').getAttribute('data-state'),'error');await page.unroute('**/api/source-tools');
  const invalidGraph=JSON.parse(fs.readFileSync(path.join(app,'public/agents/learner.network.json')));invalidGraph.tools[1].tools=['learner'];
  await page.route('**/agents/v/**/learner.network.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(invalidGraph)}));await page.getByRole('button',{name:'Run scripted network test'}).click();await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('(CYCLE)'));assert.equal(await page.locator('#network-trace li').count(),0);await page.unroute('**/agents/v/**/learner.network.json');
  await page.route('**/agents/v/**/learner.network.json',route=>route.abort());await page.getByRole('button',{name:'Run scripted network test'}).click();await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('No completed result is claimed.'));await page.unroute('**/agents/v/**/learner.network.json');
  await page.getByRole('button',{name:'Preview synthetic peer contact'}).click();await page.getByRole('dialog',{name:'External contact request'}).waitFor();assert.match(await page.locator('#consent-origin').innerText(),/peer\.invalid/);assert.match(await page.locator('#consent-purpose').innerText(),/public peer manifest/);assert.match(await page.locator('#consent-disclosure').innerText(),/network name/);const externalBeforeDeny=external.length;await page.getByRole('button',{name:'Deny',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#consent-status').textContent.includes('denied before'));assert.equal(await page.locator('#consent-status').getAttribute('data-state'),'denied');assert.equal(external.length,externalBeforeDeny);assert.match(await page.locator('#consent-events').textContent(),/decision|deny/i);
  await page.getByRole('button',{name:'Preview synthetic peer contact'}).click();await page.getByRole('button',{name:'Allow for this session (simulate)'}).click();await page.waitForFunction(()=>document.querySelector('#consent-status').textContent.includes('Simulated operations: 1'));const externalBeforeRemembered=external.length;await page.getByRole('button',{name:'Preview synthetic peer contact'}).click();await page.waitForFunction(()=>document.querySelector('#consent-status').textContent.includes('Simulated operations: 2'));assert.equal(external.length,externalBeforeRemembered);assert.match(await page.locator('#consent-events').textContent(),/remembered/);
  await page.getByRole('button',{name:'Preview source review card'}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('#review-list li').count(),0);
  await page.getByRole('button',{name:'Preview source review card'}).click();await page.getByRole('button',{name:'Confirm local save'}).click();await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===1);assert.equal(await page.locator('#review-list li').count(),1);assert.match(await page.locator('#review-status').innerText(),/not factual verification/);
  const reviewDownloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download saved receipt'}).click();
  const reviewDownload=await reviewDownloadPromise;
  assert.equal(reviewDownload.suggestedFilename(),'sutra-source-review.json');
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
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===1);assert.equal(await page.locator('#review-list li').count(),1);await page.getByRole('button',{name:'Delete local review'}).click();await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===0);assert.equal(await page.locator('#review-list li').count(),0);

  // A saved receipt from an older source version must become visible stale data
  // after reload, never a silently migrated or downloadable valid card.
  await page.getByRole('button',{name:'Preview source review card'}).click();await page.getByRole('button',{name:'Confirm local save'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===1);assert.equal(await page.locator('#review-list li').count(),1);
  await page.evaluate(()=>{
   const key='sutra.review-cards.v2',rows=JSON.parse(localStorage.getItem(key));
   rows[0].receipt.sourceVersion='retired-v0';localStorage.setItem(key,JSON.stringify(rows));
  });
  await page.reload();
  assert.match(await page.locator('#review-status').innerText(),/stale after source\/media version drift/i);
  assert.equal(await page.locator('#review-list [data-state=stale]').count(),1);
  assert.match(await page.locator('#review-list').innerText(),/retired-v0/);
  assert.equal(await page.getByRole('button',{name:'Download saved receipt'}).count(),0,'stale evidence has no valid-download action');
  await page.getByRole('button',{name:'Delete stale local review'}).click();await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===0);assert.equal(await page.locator('#review-list li').count(),0);

  // Known quota rejection: zero persisted record, explicit rejected receipt, no retry.
  await page.evaluate(()=>{
   window.__sutraOriginalSetItem=Storage.prototype.setItem;window.__sutraWriteCalls=0;
   Storage.prototype.setItem=function(key,value){if(key==='sutra.review-cards.v2'){window.__sutraWriteCalls++;throw new DOMException('quota','QuotaExceededError');}return window.__sutraOriginalSetItem.call(this,key,value);};
  });
  await page.getByRole('button',{name:'Preview source review card'}).click();await page.getByRole('button',{name:'Confirm local save'}).click();
  await page.waitForFunction(()=>document.querySelector('#review-status').textContent.includes('rejected before confirmation'));assert.match(await page.locator('#review-status').innerText(),/rejected before confirmation/);
  assert.equal(await page.locator('#review-list li').count(),0);assert.equal(await page.evaluate(()=>window.__sutraWriteCalls),1);
  const rejectedDownloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download last save outcome'}).click();
  const rejected=JSON.parse(fs.readFileSync(await (await rejectedDownloadPromise).path(),'utf8'));assert.equal(rejected.outcome,'rejected');
  await page.evaluate(()=>{Storage.prototype.setItem=window.__sutraOriginalSetItem;});

  // Ambiguous failure after the write side effect: do not claim failure or retry.
  await page.evaluate(()=>{
   const original=Storage.prototype.setItem;window.__sutraOriginalSetItem=original;window.__sutraWriteCalls=0;
   Storage.prototype.setItem=function(key,value){if(key==='sutra.review-cards.v2'){window.__sutraWriteCalls++;original.call(this,key,value);throw new Error('synthetic disconnect after write');}return original.call(this,key,value);};
  });
  await page.getByRole('button',{name:'Preview source review card'}).click();await page.getByRole('button',{name:'Confirm local save'}).click();
  await page.waitForFunction(()=>document.querySelector('#review-status').textContent.includes('outcome is unknown'));assert.match(await page.locator('#review-status').innerText(),/outcome is unknown/);assert.equal(await page.evaluate(()=>window.__sutraWriteCalls),1);
  const unknownDownloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download last save outcome'}).click();
  const unknown=JSON.parse(fs.readFileSync(await (await unknownDownloadPromise).path(),'utf8'));assert.equal(unknown.outcome,'unknown');assert.match(unknown.outcomeMeaning,/may have happened/);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__sutraOriginalSetItem;});
  // The content profile initializes asynchronously; page load alone is not the
   // local review-store readiness signal. Verify the actual prior write first.
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sutra.review-cards.v2'))?.length),1,'unknown outcome side effect must be visible in local storage');
   await page.reload();await page.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
   await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===1);
   assert.equal(await page.locator('#review-list li').count(),1,'unknown outcome can reveal a real prior side effect on later inspection');
  await page.getByRole('button',{name:'Delete local review'}).click();await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===0);assert.equal(await page.locator('#review-list li').count(),0);
  await page.getByRole('button',{name:'Read current playback state',exact:true}).click();assert.equal(JSON.parse(await page.locator('#playback-state').innerText()).available,false);
  // A missing media response must fail honestly and allow a later explicit retry.
  await page.route('**/media/timing-fixture.mp4*',route=>route.fulfill({status:404,contentType:'text/plain',body:'missing fixture'}));
  await page.getByRole('button',{name:'Load source media'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Source media unavailable.'));
  assert.equal(await page.locator('#timing-status').getAttribute('data-state'),'error');
  assert.equal(await page.locator('video').count(),0);
  assert.equal(await page.getByRole('button',{name:'Load source media'}).isEnabled(),true);
  await page.unroute('**/media/timing-fixture.mp4*');
  // A stale deployment may return HTTP 200 with the wrong bytes. Hash binding
  // must stop before Blob/player mount and leave an explicit retry path.
  await page.route('**/media/timing-fixture.mp4*',route=>route.fulfill({status:200,contentType:'video/mp4',body:'stale-media-bytes'}));
  await page.getByRole('button',{name:'Load source media'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Source media unavailable.'));
  assert.equal(await page.locator('video').count(),0);
  await page.unroute('**/media/timing-fixture.mp4*');
  // Poster is independent of media decode: a missing poster must not turn a
  // successful native video load into an unavailable lesson.
  await page.route('**/media/timing-poster.svg*',route=>route.fulfill({status:404,contentType:'text/plain',body:'missing poster'}));
  await page.getByRole('button',{name:'Load source media'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Actual media duration: 8.0 seconds.'));
  assert.equal(await page.locator('#timing-status').getAttribute('data-state'),'completed');
  assert.ok(requests.some(url=>url.includes('/media/timing-poster.svg')),'host-supplied poster request is independently observable');
  await page.unroute('**/media/timing-poster.svg*');
  const transcriptSearch=page.getByRole('searchbox',{name:'Search source transcript'});
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
  await page.getByRole('button',{name:'Inspect featured source cue'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Source cue reached.'));
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
  await page.getByRole('button',{name:'Read current playback state',exact:true}).click();const snapshot=JSON.parse(await page.locator('#playback-state').innerText());assert.equal(snapshot.available,true);assert.equal(snapshot.paused,true);assert.equal(snapshot.duration,await media.evaluate(video=>video.duration));assert.ok(Math.abs(snapshot.currentTime-await media.evaluate(video=>video.currentTime))<.1);
  fs.mkdirSync(path.join(app,'test-output'),{recursive:true});await page.screenshot({path:path.join(app,'test-output/desktop.png'),fullPage:true});
  await page.setViewportSize({width:360,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.getByRole('button',{name:'Try altered quotation'}).click();assert.match(await page.locator('#result').innerText(),/QUOTE_MISMATCH/);
  await page.screenshot({path:path.join(app,'test-output/mobile.png'),fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.ok(!requests.some(url=>url.includes('/assets/mux-video-')),'native fixture must not load optional Mux chunk');
  console.log('PASS: catalog match, truth boundary, rejection, completed/rejected/unknown local-write receipts without retry, keyboard, scripted browser-local two-agent orchestration, consent-before-contact denial/session scope, native timing-fixture recovery/play/pause/volume/captions/fullscreen/seek, 360px interaction/overflow, no errors and no external requests.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
