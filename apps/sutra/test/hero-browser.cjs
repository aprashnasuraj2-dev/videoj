const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');

(async()=>{
 const app=path.resolve(__dirname,'..'),base='http://127.0.0.1:4190';
 const server=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','4190','--strictPort'],{cwd:app,stdio:'pipe'});
 let browser,exited=false,serverLog='';for(const output of [server.stdout,server.stderr])output.on('data',d=>serverLog=(serverLog+d.toString()).slice(-8000));server.on('exit',()=>exited=true);
 try{
  let ready=false;
  for(let i=0;i<60;i++){if(exited)throw Error('Preview exited: '+serverLog);try{const r=await fetch(base,{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}
  assert.ok(ready,'hero preview ready');
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

  await page.getByRole('button',{name:'Check example',exact:true}).click();
  assert.equal(await page.locator('#result').getAttribute('data-state'),'matched');
  assert.match(await page.locator('#result').innerText(),/Factual truth has not been checked/);

  await page.getByRole('button',{name:'Demonstrate a synthetic conflict'}).click();
  assert.equal(await page.locator('#comparison-body .comparison-status').getAttribute('data-state'),'unresolved_conflict');
  assert.match(await page.locator('#comparison-body .comparison-status').innerText(),/Neither side is declared factually correct/);
  await page.getByRole('button',{name:'Inspect available evidence'}).click();
  assert.equal(await page.locator('#comparison-body .comparison-status').getAttribute('data-state'),'missing_source');

  await page.getByRole('button',{name:'Load synthetic timing fixture'}).click();
  assert.equal(await page.locator('#timing-status').getAttribute('data-state'),'loading','visible loading state appears while media bytes are delayed');
  await page.waitForFunction(()=>document.querySelector('#timing-status')?.dataset.state==='completed');
  assert.match(await page.locator('#timing-status').innerText(),/Actual media duration: 8.0 seconds/);

  await page.getByRole('button',{name:'Inspect timing cue at 00:02'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status')?.textContent.includes('Synthetic cue reached'));
  assert.equal(await page.locator('#timing-status').getAttribute('data-state'),'completed');

  const search=page.getByRole('searchbox',{name:'Search synthetic transcript'});
  await search.fill('timing marker');
  const cue=page.locator('#timing-transcript-panel .transcript-cue');
  assert.equal(await cue.count(),1);
  await cue.click();
  await page.waitForFunction(()=>document.querySelector('#timing-transcript-panel .transcript-status')?.textContent.includes('Native media reached'));

  await page.getByRole('button',{name:'Inspect native video cue at 2 seconds'}).click();
  await page.waitForFunction(()=>document.querySelector('#comparison-body .comparison-seek-status')?.textContent.includes('Native media reached'));

  await page.getByRole('button',{name:'Preview synthetic review card'}).click();
  await page.getByRole('dialog',{name:'Review before local save'}).waitFor();
  assert.match(await page.locator('#review-preview').innerText(),/synthetic-timing-fixture/);
  await page.getByRole('button',{name:'Confirm local save'}).click();
  assert.equal(await page.locator('#review-list li').count(),1);
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
  await page.getByRole('button',{name:'Load synthetic timing fixture'}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#timing-status')?.dataset.state==='completed');
  await page.getByRole('button',{name:'Inspect timing cue at 00:02'}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#timing-status')?.textContent.includes('Synthetic cue reached'));
  await page.getByRole('button',{name:'Preview synthetic review card'}).focus();await page.keyboard.press('Enter');
  await page.getByRole('dialog',{name:'Review before local save'}).waitFor();
  await page.getByRole('button',{name:'Confirm local save'}).focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#review-list li').count(),1);
  assert.match(await page.locator('#review-status').innerText(),/not factual verification/);
  await page.getByRole('button',{name:'Delete local review'}).focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#review-list li').count(),0);

  assert.deepEqual(errors,[]);
  console.log('PASS: visible hero journey covers empty/loading/conflict/success/denied states, evidence-to-native-media seek, review save/delete, refusal resilience and a 360px keyboard-activated local completion without developer-console setup or external requests.');
 }finally{
  await browser?.close().catch(()=>{});
  server.kill('SIGTERM');
  await new Promise(r=>setTimeout(r,120));
  if(!exited)server.kill('SIGKILL');
 }
})().catch(error=>{console.error(error);process.exit(1);});
