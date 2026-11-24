const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const net=require('node:net');
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
   {href:'#direct-lookup',text:'1 · Find the sourceStart with exact words. No model call is required.'},
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
