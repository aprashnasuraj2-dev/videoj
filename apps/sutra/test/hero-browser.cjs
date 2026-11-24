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
   await first.getByRole('button',{name:'Delete local review'}).click();
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
   for(let i=1;i<6;i++)source.cues.push({...source.cues[0],id:'alternative-'+i});
   const catalogBytes=JSON.stringify(catalog);profile.catalog.sha256=createHash('sha256').update(catalogBytes).digest('hex');
   await ambiguous.route('**/content/content-profile.json',r=>r.fulfill({json:profile}));
   await ambiguous.route('**/content/source-catalog.json',r=>r.fulfill({contentType:'application/json',body:catalogBytes}));
   await ambiguous.goto(base);
   const question=ambiguous.getByRole('searchbox',{name:'Question for local source lookup'});
   await question.fill('Where is the timing marker?');await question.press('Enter');
   const status=ambiguous.locator('#local-answer-status');
   assert.match(await status.innerText(),/5 of 6 matching source excerpts shown \(truncated\)/);
   assert.equal(await status.getAttribute('data-state'),'empty','ambiguity must not claim a completed answer');
   assert.equal(await ambiguous.locator('#local-answer-results li').count(),5);
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
  await page.getByRole('button',{name:'Delete local review'}).click();
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
  await page.getByRole('button',{name:'Load source media'}).click();
  assert.equal(await page.locator('#timing-status').getAttribute('data-state'),'loading','visible loading state appears while media bytes are delayed');
  await page.waitForFunction(()=>document.querySelector('#timing-status')?.dataset.state==='completed');
  assert.match(await page.locator('#timing-status').innerText(),/Actual media duration: 8.0 seconds/);

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

  await page.getByRole('button',{name:'Inspect native video cue at 2 seconds'}).click();
  await page.waitForFunction(()=>document.querySelector('#comparison-body .comparison-seek-status')?.textContent.includes('Native media reached'));

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
  await page.getByRole('button',{name:'Delete local review'}).click();
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
  assert.match(await page.locator('#review-status').innerText(),/cleared from this browser/);
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
