const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const net=require('node:net');
const fs=require('node:fs');const {createHash}=require('node:crypto');
const assert=require('node:assert/strict');

(async()=>{
 const app=path.resolve(__dirname,'..');
 const port=await new Promise((resolve,reject)=>{
  const probe=net.createServer();probe.once('error',reject);probe.listen(0,'127.0.0.1',()=>{
   const selected=probe.address().port;probe.close(error=>error?reject(error):resolve(selected));
  });
 });
 const base='http://127.0.0.1:'+port;
 const server=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:app,stdio:'pipe'});
 let browser,exited=false,serverLog='';for(const output of [server.stdout,server.stderr])output.on('data',d=>serverLog=(serverLog+d.toString()).slice(-8000));server.on('exit',()=>exited=true);
 try{
  let ready=false;
  for(let i=0;i<60;i++){if(exited)throw Error('Preview exited: '+serverLog);try{const r=await fetch(base,{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}
  if(!ready)throw Error('Hero preview not ready: '+serverLog);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:960}});
  const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base+'/')&&!r.url().startsWith('blob:'+base+'/'))external.push(r.url());});

  // A fresh viewer must reach a saved, reviewable source citation using only the
  // no-model question route, without playback, developer panels, or account setup.
  const freshContext=await browser.newContext({viewport:{width:1280,height:800}});
  try{
   const first=await freshContext.newPage(),externalCalls=[];
   first.on('request',r=>{if(r.url().includes('/api/')||r.url().includes('/media/timing-fixture.mp4'))externalCalls.push(r.url());});
   await first.goto(base);
   await first.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
   assert.deepEqual(await first.locator('.journey-map a').first().getAttribute('href'),'#local-answer');
   const expectedOrder=['local-answer-title','lesson-title','evidence-title','direct-title','comparison-title','review-title','provider-title','developer-tools-title'];
   const order=()=>first.evaluate(ids=>[...document.querySelectorAll(ids.map(x=>'#'+x).join(','))].map(x=>x.id),expectedOrder);
   assert.deepEqual(await order(),expectedOrder,'local find/inspect/compare/review precede optional inference');
   await first.setViewportSize({width:360,height:800});assert.deepEqual(await order(),expectedOrder);assert.ok(await first.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await first.setViewportSize({width:1280,height:800});
   await first.locator('.journey-map a').last().focus();await first.keyboard.press('Tab');assert.equal(await first.evaluate(()=>document.activeElement?.id),'local-answer-query','first task follows the learner navigation in keyboard order');
   await first.getByRole('searchbox',{name:'Question for local source lookup'}).fill('Where is the timing marker?');
   await first.getByRole('button',{name:'Find cited source locally',exact:true}).click();
   assert.equal(await first.locator('#local-answer-status').getAttribute('data-state'),'completed');
   await first.getByRole('button',{name:'Preview local review card'}).click();
   await first.getByRole('dialog',{name:'Review before local save'}).waitFor();
   assert.equal(JSON.parse(await first.locator('#review-preview').textContent()).args.receipt.cueId,'timing-marker');
   assert.equal(await first.locator('#review-list li').count(),0,'explicit confirmation required');
   await first.getByRole('button',{name:'Confirm local save'}).click();
   await first.waitForFunction(()=>document.querySelectorAll('#review-list li').length===1);
   assert.equal(externalCalls.length,0,'the first viewer question-to-card flow is entirely model-free and media-free');
   await first.reload();await first.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
   await first.waitForFunction(()=>document.querySelectorAll('#review-list li').length===1);
   await first.getByRole('button',{name:'Delete local review'}).click();await first.waitForFunction(()=>document.querySelectorAll('#review-list li').length===0);
   assert.equal(await first.locator('#review-list li').count(),0);
   // Locale changes must translate the primary free-inference task and current
   // result rather than only translating the preexisting hero or navigation.
   await first.locator('#language-select').selectOption('ne');
   assert.match(await first.locator('#local-answer-title').innerText(),/स्रोत/);
   assert.match(await first.locator('#local-answer-form button').innerText(),/स्रोत/);
   await first.locator('#local-answer-query').fill('timing marker');
   await first.locator('#local-answer-form button').click();
   assert.match(await first.locator('#local-answer-status').innerText(),/मोडेल कल ०/);
   await first.locator('#language-select').selectOption('en');
   assert.match(await first.locator('#local-answer-status').innerText(),/0 model calls/);
  }finally{await freshContext.close();}

  // Real same-origin browser tabs must serialize read/modify/write. Hold the
  // shared lock until both users have explicitly confirmed their receipts;
  // neither save may overwrite the other. Navigation revokes queued writes.
  const concurrentContext=await browser.newContext();
  try{
   const a=await concurrentContext.newPage(),b=await concurrentContext.newPage();
   await Promise.all([a.goto(base),b.goto(base)]);
   await Promise.all([a,b].map(p=>p.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor()));
   const key='sutra.review-cards.v2',lockName='sutra.review-cards.mutation.v2';
   async function hold(){
    await a.evaluate(name=>{window.__reviewLockHeld=false;void navigator.locks.request(name,()=>new Promise(resolve=>{window.__reviewLockHeld=true;window.__releaseReviewLock=resolve;}));},lockName);
    await a.waitForFunction(()=>window.__reviewLockHeld);
   }
   async function confirm(p){await p.getByRole('button',{name:'Preview source review card'}).click();await p.getByRole('button',{name:'Confirm local save'}).click();await p.waitForFunction(()=>!document.querySelector('#review-dialog').open);}
   await hold();await Promise.all([confirm(a),confirm(b)]);
   assert.equal(await a.evaluate(k=>localStorage.getItem(k),key),null,'both confirmed operations await the exclusive origin lock');
   await a.evaluate(()=>window.__releaseReviewLock());
   await a.waitForFunction(k=>JSON.parse(localStorage.getItem(k)??'[]').length===2,key);
   const records=await a.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(new Set(records.map(x=>x.id)).size,2);
   await Promise.all([a,b].map(p=>p.waitForFunction(()=>document.querySelectorAll('#review-list li').length===2)));
   await hold();await confirm(b);
   await b.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
   await b.waitForFunction(()=>document.querySelector('#review-status').textContent.includes('rejected before confirmation'));
   await a.evaluate(()=>window.__releaseReviewLock());
   assert.equal(await a.evaluate(k=>JSON.parse(localStorage.getItem(k)).length,key),2);
   // Same-document out-of-band mutation emits no storage event. The still
   // visible delete control must compare the exact captured record, not ID.
   await a.evaluate(k=>{const rows=JSON.parse(localStorage.getItem(k));rows[0].savedAt='2026-01-01T00:00:00.000Z';localStorage.setItem(k,JSON.stringify(rows));},key);
   await a.getByRole('button',{name:'Delete local review'}).first().click();
   await a.waitForFunction(()=>document.querySelector('#review-status').textContent.includes('Could not delete'));
   assert.equal(await a.evaluate(k=>JSON.parse(localStorage.getItem(k)).length,key),2);
   // A transport/storage implementation can change bytes and then throw.
   // The real learner UI must refresh the list and disclose uncertainty.
   await a.evaluate(k=>{const original=Storage.prototype.setItem;window.__restoreReviewSet=()=>{Storage.prototype.setItem=original;};Storage.prototype.setItem=function(name,value){original.call(this,name,value);if(name===k)throw Error('synthetic post-write failure');};},key);
   try{
    await a.getByRole('button',{name:'Delete local review'}).first().click();
    await a.waitForFunction(()=>document.querySelector('#review-status').textContent.includes('deletion outcome is unknown'));
    assert.equal(await a.evaluate(k=>JSON.parse(localStorage.getItem(k)).length,key),1);
    assert.equal(await a.locator('#review-list li').count(),1);
   }finally{await a.evaluate(()=>window.__restoreReviewSet());}
   const legacy='sutra.synthetic-review-cards.v1';
   await a.evaluate(k=>localStorage.setItem(k,'legacy fixture'),legacy);
   await a.locator('#clear-local-reviews').click();
   await a.evaluate(k=>{const original=Storage.prototype.removeItem;window.__restoreReviewRemove=()=>{Storage.prototype.removeItem=original;};Storage.prototype.removeItem=function(name){if(name===k)throw new DOMException('synthetic second-key failure','SecurityError');original.call(this,name);};},legacy);
   try{
    await a.locator('#confirm-clear-reviews').click();
    await a.waitForFunction(()=>document.querySelector('#review-status').textContent.includes('clear outcome is unknown'));
    assert.equal(await a.evaluate(k=>localStorage.getItem(k),key),null);
    assert.equal(await a.evaluate(k=>localStorage.getItem(k),legacy),'legacy fixture');
    assert.equal(await a.locator('#review-list li').count(),0);
    assert.equal(await a.locator('#download-review-attempt').isHidden(),true);
   }finally{await a.evaluate(()=>window.__restoreReviewRemove());}
  }finally{await concurrentContext.close();}

  // An isolated, hash-consistent synthetic profile with six overlapping cues
  // must show five receipts AND the complete count, including after a locale
  // switch; the original public fixture and actual source text remain unchanged.
  const ambiguityContext=await browser.newContext({viewport:{width:1280,height:800}});
  try{
   const ambiguous=await ambiguityContext.newPage();const apiOrMedia=[];
   ambiguous.on('request',r=>{if(r.url().includes('/api/')||r.url().includes('/media/timing-fixture.mp4'))apiOrMedia.push(r.url());});
   const profile=JSON.parse(fs.readFileSync(path.join(app,'public/content/content-profile.json'),'utf8'));
   const catalog=JSON.parse(fs.readFileSync(path.join(app,'public/content/source-catalog.json'),'utf8'));
   profile.contentVersion=catalog.contentVersion='synthetic-ambiguity-browser-fixture-v1';
   const source=catalog.sources[0];source.version='ambiguity-fixture-v1';
   const longCueId='cue:.'+'a'.repeat(123);
   for(let i=1;i<6;i++)source.cues.push({...source.cues[0],id:i===1?longCueId:'alternative-'+i});
   const catalogBytes=JSON.stringify(catalog);profile.catalog.sha256=createHash('sha256').update(catalogBytes).digest('hex');
   await ambiguous.route('**/content/content-profile.json',r=>r.fulfill({json:profile}));
   await ambiguous.route('**/content/source-catalog.json',r=>r.fulfill({contentType:'application/json',body:catalogBytes}));
   await ambiguous.goto(base);
   const transcript=ambiguous.getByRole('searchbox',{name:'Search source transcript'});
   await transcript.fill('timing marker');
   assert.equal(await ambiguous.locator('#timing-transcript-panel .transcript-cue').count(),6,'all catalog-valid cues, including 128-character punctuation-bearing ID, remain inspectable');
   const inspect=ambiguous.locator('.transcript-inspect').filter({hasText:'Inspect cue receipt'}).nth(1);
   await inspect.click();assert.equal(await inspect.getAttribute('aria-expanded'),'true');
   assert.match(await ambiguous.locator('.transcript-receipt:not([hidden])').innerText(),new RegExp(longCueId.replace('.','\\.')));
   const previewButton=ambiguous.getByRole('button',{name:'Preview inspected review card'});
   await previewButton.click();
   const exact=JSON.parse(await ambiguous.locator('#review-preview').textContent()).args.receipt;
   assert.equal(exact.cueId,longCueId);assert.equal(exact.sourceVersion,'ambiguity-fixture-v1');
   await ambiguous.getByRole('button',{name:'Cancel',exact:true}).click();
   await ambiguous.locator('#language-select').selectOption('ne');assert.equal(await ambiguous.locator('.transcript-receipt:not([hidden])').count(),1);
   await ambiguous.locator('#language-select').selectOption('en');
   await ambiguous.evaluate(()=>{window.__staleReceiptAction=document.querySelector('.transcript-receipt:not([hidden]) .actions button:last-child');});
   await transcript.fill('unavailable wording');assert.equal(await ambiguous.locator('.transcript-receipt:not([hidden])').count(),0);
   await ambiguous.evaluate(()=>window.__staleReceiptAction.click());assert.equal(await ambiguous.locator('#review-dialog').evaluate(d=>d.open),false);
   await transcript.fill('timing marker');
   const question=ambiguous.getByRole('searchbox',{name:'Question for local source lookup'});
   await question.fill('Where is the timing marker?');await question.press('Enter');
   const status=ambiguous.locator('#local-answer-status');
   assert.match(await status.innerText(),/5 of 6 matching source excerpts shown \(truncated\)/);
   assert.equal(await status.getAttribute('data-state'),'empty','ambiguity must not claim a completed answer');
   assert.equal(await ambiguous.locator('#local-answer-results li').count(),5);
   assert.match(await ambiguous.locator('#local-answer-results').innerText(),new RegExp(longCueId.replace('.','\\.')));
   await ambiguous.locator('#language-select').selectOption('ne');assert.match(await status.innerText(),/६.*५/);
   await ambiguous.locator('#language-select').selectOption('en');assert.match(await status.innerText(),/5 of 6 matching/);
   const literal=ambiguous.getByRole('searchbox',{name:'Exact source wording'});
   await literal.fill('timing marker');await literal.press('Enter');
   assert.match(await ambiguous.locator('#direct-status').innerText(),/5 of 6 matching source cues shown \(truncated\)/);
   assert.equal(await ambiguous.locator('#direct-results li').count(),5);
   await question.fill('unavailable voltage threshold');await question.press('Enter');
   assert.equal(await status.getAttribute('data-match-count'),null);assert.equal(await ambiguous.locator('#local-answer-results li').count(),0);
   assert.deepEqual(apiOrMedia,[]);
  }finally{await ambiguityContext.close();}

  // Synthetic reviewed-mode routing fixture: correct digest-shaped path is not
  // sufficient. Reject altered bytes before any native player can be mounted;
  // preserve transcript and recover only on an explicit correct retry.
  const reviewedContext=await browser.newContext();
  try{
   const reviewPage=await reviewedContext.newPage(),requests=[],trackRequests=[];
   reviewPage.on('request',r=>{if(/\.(?:vtt|svg)(?:\?|$)/.test(r.url())&&r.url().startsWith(base))trackRequests.push(r.url());});
   const profile=JSON.parse(fs.readFileSync(path.join(app,'public/content/content-profile.json'),'utf8'));
   const catalog=JSON.parse(fs.readFileSync(path.join(app,'public/content/source-catalog.json'),'utf8'));
   const source=catalog.sources[0],mediaBytes=fs.readFileSync(path.join(app,'public/media/timing-fixture.mp4')),textBytes=fs.readFileSync(path.join(app,'public/transcripts/synthetic-timing.txt'));
   profile.mode='reviewed';profile.media.video='/media/release/'+source.mediaHash+'/lesson.mp4';profile.transcript.path='/transcripts/release/'+source.hash+'/lesson.txt';
   const validGuide='<html><body><section id="claim"><h2>Reviewed excerpt</h2><blockquote>Test only.</blockquote></section></body></html>';
   const wrongGuide='<html><body><section id="claim"><h2>Test only.</h2><blockquote>Different claim.</blockquote></section></body></html>';
   const guideHash=require('node:crypto').createHash('sha256').update(validGuide).digest('hex');
   profile.guideClaim={sourceKind:'guide',sourceId:'test-guide',sourceVersion:'v1',title:'Test guide',scope:profile.videoClaim.scope,claimKey:profile.videoClaim.claimKey,value:profile.videoClaim.value,excerpt:'Test only.',provenance:'Synthetic routing test, not reviewed content',sourceHref:'/guides/release/'+guideHash+'/guide.html#claim',sourceHash:guideHash};
   let guideRequests=0;
   await reviewPage.route('**'+profile.guideClaim.sourceHref.split('#')[0],r=>{guideRequests++;assert.equal(r.request().headers().cookie,undefined);return r.fulfill({contentType:'text/html',body:validGuide});});
   await reviewPage.route('**/content/content-profile.json',r=>r.fulfill({json:profile}));
   await reviewPage.route('**'+profile.transcript.path,r=>r.fulfill({contentType:'text/plain',body:textBytes}));
   let phase='wrong',releaseHeld,held=false;
   await reviewPage.route('**'+profile.media.video+'*',async r=>{
    requests.push(r.request().url());assert.equal(r.request().headers().cookie,undefined);
    if(phase==='hold'){held=true;await new Promise(resolve=>{releaseHeld=resolve;});return r.abort().catch(()=>{});}
    return r.fulfill({contentType:'video/mp4',body:phase==='wrong'?Buffer.concat([mediaBytes,Buffer.from([0])]):mediaBytes});
   });
   await reviewedContext.addCookies([{name:'media-canary',value:'not-for-media',url:base}]);
   await reviewPage.goto(base);await reviewPage.getByRole('searchbox',{name:'Search source transcript'}).fill('timing marker');assert.equal(requests.length,0);
   assert.equal(guideRequests,0,'guide content remains opt-in');
   await reviewPage.getByRole('button',{name:'Check written source integrity'}).click();
   await reviewPage.waitForFunction(()=>document.querySelector('#comparison-body .comparison-seek-status').textContent.includes('bytes and anchored excerpt match'));
   assert.equal(guideRequests,1);
   // Even an internally hash-consistent profile must not turn a matching
   // heading (rather than the declared text-only excerpt) into evidence.
   const wrongHash=require('node:crypto').createHash('sha256').update(wrongGuide).digest('hex');
   profile.guideClaim.sourceHref='/guides/release/'+wrongHash+'/guide.html#claim';profile.guideClaim.sourceHash=wrongHash;
   await reviewPage.route('**'+profile.guideClaim.sourceHref.split('#')[0],r=>r.fulfill({contentType:'text/html',body:wrongGuide}));
   await reviewPage.reload();await reviewPage.getByRole('button',{name:'Check written source integrity'}).click();
   await reviewPage.waitForFunction(()=>document.querySelector('#comparison-body .comparison-seek-status').textContent.includes('could not be confirmed'));
   await reviewPage.getByRole('searchbox',{name:'Search source transcript'}).fill('timing marker');
   const load=reviewPage.getByRole('button',{name:'Load source media'});
   await load.click();await reviewPage.waitForFunction(()=>document.querySelector('#timing-status').dataset.state==='error');
   assert.equal(await reviewPage.locator('video').count(),0);assert.equal(await reviewPage.locator('#timing-transcript-panel .transcript-cue').count(),1);
   assert.equal(await reviewPage.locator('#seek-timing').isHidden(),true);
   phase='hold';await load.click();await reviewPage.waitForFunction(()=>document.querySelector('#timing-status').dataset.state==='loading');
   for(let i=0;i<50&&!held;i++)await new Promise(r=>setTimeout(r,20));assert.equal(held,true);
   await reviewPage.getByRole('button',{name:'Cancel media load'}).click();
   await reviewPage.waitForFunction(()=>document.querySelector('#timing-status').dataset.state==='cancelled');
   releaseHeld();assert.equal(await reviewPage.locator('video').count(),0);
   phase='correct';await load.click();await reviewPage.waitForFunction(()=>document.querySelector('#timing-status').dataset.state==='completed');
   assert.match(await reviewPage.locator('#timing-status').textContent(),/Reviewed hash-checked/);
   assert.equal(await reviewPage.locator('video').evaluate(v=>v.currentSrc.startsWith('blob:')),true);
   await reviewPage.locator('#language-select').selectOption('ne');
   assert.equal(await reviewPage.locator('video').count(),1);
   await reviewPage.locator('#language-select').selectOption('en');
   assert.equal(await reviewPage.locator('video').count(),1);
   assert.equal(requests.length,3,'only explicit full media GETs; no remote native refetch');
   await reviewPage.locator('video').evaluate(video=>{[...video.textTracks].find(t=>t.kind==='captions').mode='showing';});
   await reviewPage.waitForFunction(()=>[...document.querySelector('video').textTracks].find(t=>t.kind==='captions')?.cues?.length===1);
   const native=await reviewPage.locator('video').evaluate(video=>{const cue=[...video.textTracks].find(t=>t.kind==='captions').cues[0];return {start:cue.startTime,end:cue.endTime,text:cue.getCueAsHTML().textContent};});
   assert.deepEqual(native,{start:source.cues[0].start,end:source.cues[0].end,text:source.cues[0].text});
   assert.equal(trackRequests.length,0,'reviewed playback cannot fetch independent poster or track bytes');
   await reviewPage.getByRole('button',{name:'Inspect featured source cue'}).click();await reviewPage.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Source cue reached'));
  }finally{await reviewedContext.close();}

  let delayed=true;
  await page.route('**/media/timing-fixture.mp4*',async route=>{
   if(delayed){delayed=false;await new Promise(r=>setTimeout(r,350));}
   await route.continue();
  });

  await page.goto(base);
  await page.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
  assert.equal(await page.locator('#timing-status').getAttribute('data-state'),'empty');
  assert.equal(await page.locator('#consent-status').getAttribute('data-state'),'empty');
  assert.equal(await page.locator('#comparison-body .comparison-status').getAttribute('data-state'),'missing_source');
  assert.deepEqual(await page.locator('.journey-map a').evaluateAll(nodes=>nodes.map(n=>({href:n.getAttribute('href'),text:n.textContent.trim()}))),[
   {href:'#local-answer',text:'1 · Ask locallyAsk a question for exact source cues. No model call.'},
   {href:'#comparison-title',text:'2 · Compare evidenceKeep missing or conflicting sources visibly separate.'},
   {href:'#review-title',text:'3 · Keep a reviewed referencePreview the exact receipt before anything is saved.'}
  ]);
  assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('#comparison-title,#review-title,#developer-tools-title,#runtime-title')].map(x=>x.id)),['comparison-title','review-title','developer-tools-title','runtime-title'],'core comparison/review must precede developer tooling');

  // Direct evidence selection is a complete usable path before inference or media transfer.
  const direct=page.getByRole('searchbox',{name:'Exact source wording'});
  const requestsBefore=await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>x.name.includes('/api/')||x.name.includes('timing-fixture.mp4')).length);
  await direct.fill('unavailable voltage threshold');await direct.press('Enter');
  assert.equal(await page.locator('#direct-status').getAttribute('data-state'),'empty');
  assert.equal(await page.locator('#direct-results li').count(),0);
  await direct.fill('timing marker');await direct.press('Enter');
  assert.equal(await page.locator('#direct-status').getAttribute('data-state'),'completed');
  assert.match(await page.locator('#direct-status').innerText(),/0 model calls, 0 network requests/);
  assert.equal(await page.locator('#direct-results li').count(),1);
  await page.getByRole('button',{name:'Seek to matched cue'}).click();
  await page.waitForFunction(()=>document.querySelector('#direct-action-status').textContent.includes('no seek success'));
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>x.name.includes('/api/')||x.name.includes('timing-fixture.mp4')).length),requestsBefore);
  await page.getByRole('button',{name:'Preview matched review card'}).click();
  await page.getByRole('dialog',{name:'Review before local save'}).waitFor();
  const exactPreview=JSON.parse(await page.locator('#review-preview').textContent()).args.receipt;
  assert.equal(exactPreview.cueId,'timing-marker');assert.equal(exactPreview.excerpt,'Synthetic timing marker. This is not a training instruction.');
  await page.getByRole('button',{name:'Confirm local save'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===1);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sutra.review-cards.v2'))[0].receipt);
  assert.deepEqual(saved,exactPreview);
  await page.getByRole('button',{name:'Delete local review'}).click();await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===0);
  assert.equal(await page.locator('#review-list li').count(),0);
  await direct.fill('unavailable voltage threshold');assert.equal(await page.locator('#direct-results li').count(),0);
  await page.getByRole('button',{name:'Check example',exact:true}).click();
  assert.equal(await page.locator('#result').getAttribute('data-state'),'matched');
  assert.match(await page.locator('#result').innerText(),/Factual truth has not been checked/);

  await page.getByRole('button',{name:'Demonstrate a synthetic conflict'}).click();
  assert.equal(await page.locator('#comparison-body .comparison-status').getAttribute('data-state'),'unresolved_conflict');
  assert.match(await page.locator('#comparison-body .comparison-status').innerText(),/Neither side is declared factually correct/);
  const guideLink=page.getByRole('link',{name:'Open written source excerpt'});
  assert.equal(await guideLink.count(),1);
  const guideHref=await guideLink.getAttribute('href');assert.match(guideHref,/\/guides\/synthetic-comparison-guide\.html#signature-count$/);
  await page.getByRole('button',{name:'Check written source integrity'}).click();
  await page.waitForFunction(()=>document.querySelector('#comparison-body .comparison-seek-status').textContent.includes('bytes and anchored excerpt match'));
  assert.match(await page.locator('#comparison-body .comparison-seek-status').innerText(),/does not establish factual truth/);
  const guideText=await page.evaluate(async href=>(await fetch(href,{credentials:'omit'})).text(),guideHref);
  assert.match(guideText,/In this invented example, the handover needs three signatures\./);
  await page.route('**/guides/synthetic-comparison-guide.html*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><p id="signature-count">altered source</p>'}));
  await page.getByRole('button',{name:'Check written source integrity'}).click();
  await page.waitForFunction(()=>document.querySelector('#comparison-body .comparison-seek-status').textContent.includes('could not be confirmed'));
  await page.unroute('**/guides/synthetic-comparison-guide.html*');
  // Hold a valid guide response, then switch the comparison before completion.
  let releaseGuide,observeGuide,finishGuide;const guideStarted=new Promise(r=>observeGuide=r),guideFinished=new Promise(r=>finishGuide=r);
  await page.route('**/guides/synthetic-comparison-guide.html*',async route=>{observeGuide();await new Promise(r=>releaseGuide=r);try{await route.fulfill({contentType:'text/html',body:guideText});}catch{}finally{finishGuide();}});
  await page.getByRole('button',{name:'Check written source integrity'}).click();await guideStarted;
  await page.getByRole('button',{name:'Inspect available evidence'}).click();releaseGuide();await guideFinished;
  await page.unroute('**/guides/synthetic-comparison-guide.html*');
  assert.equal(await page.locator('#comparison-body .comparison-seek-status').innerText(),'','obsolete guide completion must not attach to the new comparison');
  await page.getByRole('button',{name:'Inspect available evidence'}).click();
  assert.equal(await page.locator('#comparison-body .comparison-status').getAttribute('data-state'),'missing_source');

  // The local citation-only question path is usable without model, provider, or media.
  const localQuestion=page.getByRole('searchbox',{name:'Question for local source lookup'});
  await localQuestion.fill('Where is the timing marker?');
  const beforeLocal=await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>x.name.includes('/api/')).length);
  await page.getByRole('button',{name:'Find cited source locally',exact:true}).click();
  assert.equal(await page.locator('#local-answer-status').getAttribute('data-state'),'completed');
  assert.equal(await page.locator('#local-answer-results li').count(),1);
  assert.match(await page.locator('#local-answer-results').innerText(),/Synthetic timing marker/);
  assert.match(await page.locator('#local-answer-status').innerText(),/0 model calls, 0 network requests/);
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>x.name.includes('/api/')).length),beforeLocal);
  await localQuestion.fill('synthetic timing marker training instruction 7');
  await localQuestion.press('Enter');
  assert.equal(await page.locator('#local-answer-status').getAttribute('data-state'),'empty');
  assert.equal(await page.locator('#local-answer-results li').count(),0);
  await localQuestion.fill('What is the safe voltage threshold?');
  await page.getByRole('button',{name:'Find cited source locally',exact:true}).click();
  assert.equal(await page.locator('#local-answer-status').getAttribute('data-state'),'empty');
  assert.equal(await page.locator('#local-answer-results li').count(),0);
  const preMediaSearch=page.getByRole('searchbox',{name:'Search source transcript'});
  await preMediaSearch.fill('ｔｉｍｉｎｇ marker');
  await page.getByRole('button',{name:'Load source media'}).click();
  assert.equal(await page.locator('#timing-status').getAttribute('data-state'),'loading','visible loading state appears while media bytes are delayed');
  await page.waitForFunction(()=>document.querySelector('#timing-status')?.dataset.state==='completed');
  assert.match(await page.locator('#timing-status').innerText(),/Actual media duration: 8.0 seconds/);
  assert.equal(await preMediaSearch.inputValue(),'ｔｉｍｉｎｇ marker','media loading must preserve the exact typed transcript filter');

  await page.getByRole('button',{name:'Inspect featured source cue'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status')?.textContent.includes('Source cue reached'));
  assert.equal(await page.locator('#timing-status').getAttribute('data-state'),'completed');

  await direct.fill('timing marker');await direct.press('Enter');
  await page.getByRole('button',{name:'Seek to matched cue'}).click();
  await page.waitForFunction(()=>document.querySelector('#direct-action-status').textContent.includes('Native media reached'));
  const search=page.getByRole('searchbox',{name:'Search source transcript'});
  await search.fill('timing marker');
  const cue=page.locator('#timing-transcript-panel .transcript-cue');
  assert.equal(await cue.count(),1);
  await cue.click();
  await page.waitForFunction(()=>document.querySelector('#timing-transcript-panel .transcript-status')?.textContent.includes('Native media reached'));
  const obsoleteCue=await cue.elementHandle();
  await search.fill('unavailable voltage threshold');
  const transcriptStatus=page.locator('#timing-transcript-panel .transcript-status');
  assert.match(await transcriptStatus.innerText(),/No transcript cues match/);
  await page.evaluate(()=>{const media=document.querySelector('video');media.pause();media.currentTime=0;});
  await page.waitForFunction(()=>{const media=document.querySelector('video');return !media.seeking&&media.currentTime<.1;});
  await obsoleteCue.evaluate(async button=>{button.click();await new Promise(r=>setTimeout(r,30));});
  assert.ok(await page.locator('video').evaluate(media=>media.currentTime<.1),'detached transcript control cannot seek');
  assert.match(await transcriptStatus.innerText(),/No transcript cues match/);
  await obsoleteCue.dispose();await search.fill('timing marker');

  await page.getByRole('button',{name:'Inspect native video cue at 2 seconds'}).click();
  await page.waitForFunction(()=>document.querySelector('#comparison-body .comparison-seek-status')?.textContent.includes('Native media reached'));

  // Inject a native seek that lands just before the cue, inside the old one-second
  // tolerance. The actual native time is observable, but no cue success is allowed.
  await page.evaluate(()=>{const video=document.querySelector('video'),d=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');Object.defineProperty(video,'currentTime',{configurable:true,get(){return d.get.call(this);},set(t){d.set.call(this,t===2?1.5:t);}});});
  try{
   await page.getByRole('button',{name:'Inspect featured source cue'}).click();
   await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('no seek success'));
   await cue.click();await page.waitForFunction(()=>document.querySelector('#timing-transcript-panel .transcript-status').textContent.includes('No seek success'));
   await page.getByRole('button',{name:'Seek to matched cue'}).click();await page.waitForFunction(()=>document.querySelector('#direct-action-status').textContent.includes('no seek success'));
   await page.getByRole('button',{name:'Inspect native video cue at 2 seconds'}).click();await page.waitForFunction(()=>document.querySelector('#comparison-body .comparison-seek-status').textContent.includes('no successful seek'));
   assert.ok(await page.locator('video').evaluate(v=>v.currentTime<2&&v.currentTime>=1));
  }finally{await page.evaluate(()=>{delete document.querySelector('video').currentTime;});}
  await cue.click();await page.waitForFunction(()=>document.querySelector('#timing-transcript-panel .transcript-status').textContent.includes('Native media reached'));

  await page.getByRole('button',{name:'Preview source review card'}).click();
  await page.getByRole('dialog',{name:'Review before local save'}).waitFor();
  assert.match(await page.locator('#review-preview').innerText(),/synthetic-timing-fixture/);
  await page.getByRole('button',{name:'Confirm local save'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===1);assert.equal(await page.locator('#review-list li').count(),1);
  assert.match(await page.locator('#review-status').innerText(),/not factual verification/);

  await page.getByRole('button',{name:'Preview synthetic peer contact'}).click();
  await page.getByRole('dialog',{name:'External contact request'}).waitFor();
  await page.getByRole('button',{name:'Deny',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#consent-status')?.dataset.state==='denied');
  assert.match(await page.locator('#consent-status').innerText(),/Local lesson and evidence remain available/);
  assert.equal(external.length,0,'synthetic denial makes no external request');

  // Local learning remains usable after refusal.
  assert.equal(await page.locator('video').count(),1);
  assert.equal(await search.count(),1);
  await search.fill('marker');
  assert.equal(await page.locator('#timing-transcript-panel .transcript-cue').count(),1);
  await page.getByRole('button',{name:'Check example',exact:true}).click();
  assert.equal(await page.locator('#result').getAttribute('data-state'),'matched');

  await page.setViewportSize({width:360,height:800});
  await page.getByRole('button',{name:'Delete local review'}).click();await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===0);
  assert.equal(await page.locator('#review-list li').count(),0);

  // Re-run the local core path at 360 px using keyboard activation only.
  await page.reload();
  await page.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
  await page.getByRole('button',{name:'Check example',exact:true}).focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#result').getAttribute('data-state'),'matched');
  await page.getByRole('button',{name:'Load source media'}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#timing-status')?.dataset.state==='completed');
  await page.getByRole('button',{name:'Inspect featured source cue'}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#timing-status')?.textContent.includes('Source cue reached'));
  await page.getByRole('button',{name:'Preview source review card'}).focus();await page.keyboard.press('Enter');
  await page.getByRole('dialog',{name:'Review before local save'}).waitFor();
  await page.getByRole('button',{name:'Confirm local save'}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===1);assert.equal(await page.locator('#review-list li').count(),1);
  assert.match(await page.locator('#review-status').innerText(),/not factual verification/);
  await page.getByRole('button',{name:'Delete local review'}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===0);
  assert.equal(await page.locator('#review-list li').count(),0);

  assert.equal(await page.evaluate(()=>localStorage.getItem('sutra.review-cards.v2')),null);
  assert.equal(await page.locator('#download-review-attempt').isHidden(),true);
  assert.equal(await page.locator('#review-preview').textContent(),'');
  await page.evaluate(()=>{localStorage.setItem('sutra.review-cards.v2','corrupt fixture canary');localStorage.setItem('unrelated-browser-key','keep');});
  await page.reload();
  await page.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
  assert.match(await page.locator('#review-status').innerText(),/could not be read/);
  await page.getByRole('button',{name:'Clear all local review data'}).click();
  await page.getByRole('button',{name:'Keep local reviews'}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('sutra.review-cards.v2')),'corrupt fixture canary');
  await page.getByRole('button',{name:'Clear all local review data'}).click();
  await page.getByRole('button',{name:'Confirm clear local reviews'}).click();
  await page.waitForFunction(()=>document.querySelector('#review-status').textContent.includes('cleared from this browser'));assert.match(await page.locator('#review-status').innerText(),/cleared from this browser/);
  assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('sutra.review-cards.v2'),localStorage.getItem('unrelated-browser-key'),sessionStorage.length]),[null,'keep',0]);
  await page.reload();
  await page.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
  assert.equal(await page.locator('#review-list li').count(),0);
  assert.equal(await page.locator('#download-review-attempt').isHidden(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: visible hero journey covers empty/loading/conflict/success/denied states, evidence-to-native-media seek, review save/delete, refusal resilience and a 360px keyboard-activated local completion without developer-console setup or external requests.');
 }finally{
  await browser?.close().catch(()=>{});
  server.kill('SIGTERM');
  await new Promise(r=>setTimeout(r,120));
  if(!exited)server.kill('SIGKILL');
 }
})().catch(error=>{console.error(error);process.exit(1);});
