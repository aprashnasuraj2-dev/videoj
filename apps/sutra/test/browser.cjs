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
  await page.getByRole('button',{name:'Check example',exact:true}).click();assert.match(await page.locator('#result').innerText(),/Catalog matched/);assert.match(await page.locator('#result').innerText(),/Factual truth has not been checked/);
  await page.getByRole('button',{name:'Try altered quotation'}).click();assert.match(await page.locator('#result').innerText(),/QUOTE_MISMATCH/);
  await page.locator('#cue').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#cue').getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Run scripted network test'}).click();await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('2 agent invocations; 3 scripted model steps.'));assert.equal(await page.locator('#network-trace li').count(),2);assert.match(await page.locator('#network-result').innerText(),/No live AI/);
  await page.getByRole('button',{name:'Run scripted source retrieval',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#source-network-result').textContent.includes('5 scripted model steps; two source reads.'));assert.match(await page.locator('#source-network-result').innerText(),/Synthetic timing marker/);assert.match(await page.locator('#source-network-result').innerText(),/factual truth remains unverified/);
  await page.route('**/api/source-tools',route=>route.abort());await page.getByRole('button',{name:'Run scripted source retrieval',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#source-network-result').textContent.includes('No completed source result is claimed.'));await page.unroute('**/api/source-tools');
  const invalidGraph=JSON.parse(fs.readFileSync(path.join(app,'public/agents/learner.network.json')));invalidGraph.tools[1].tools=['learner'];
  await page.route('**/agents/learner.network.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(invalidGraph)}));await page.getByRole('button',{name:'Run scripted network test'}).click();await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('(CYCLE)'));assert.equal(await page.locator('#network-trace li').count(),0);await page.unroute('**/agents/learner.network.json');
  await page.route('**/agents/learner.network.json',route=>route.abort());await page.getByRole('button',{name:'Run scripted network test'}).click();await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('No completed result is claimed.'));await page.unroute('**/agents/learner.network.json');
  await page.getByRole('button',{name:'Preview synthetic review card'}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('#review-list li').count(),0);
  await page.getByRole('button',{name:'Preview synthetic review card'}).click();await page.getByRole('button',{name:'Confirm local save'}).click();assert.equal(await page.locator('#review-list li').count(),1);assert.match(await page.locator('#review-status').innerText(),/not factual verification/);
  await page.reload();assert.equal(await page.locator('#review-list li').count(),1);await page.getByRole('button',{name:'Delete local review'}).click();assert.equal(await page.locator('#review-list li').count(),0);
  await page.getByRole('button',{name:'Read current playback state',exact:true}).click();assert.equal(JSON.parse(await page.locator('#playback-state').innerText()).available,false);
  await page.getByRole('button',{name:'Load synthetic timing fixture'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Actual media duration: 8.0 seconds.'));
  const media=page.locator('video');assert.equal(await media.count(),1);
  await page.getByRole('button',{name:'Inspect timing cue at 00:02'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Synthetic cue reached.'));
  assert.ok(Math.abs(await media.evaluate(video=>video.currentTime)-2)<=1);
  await media.evaluate(video=>video.play());await page.waitForFunction(()=>document.querySelector('video').currentTime>2.15);await media.evaluate(video=>video.pause());
  assert.equal(await media.evaluate(video=>video.paused),true);await page.getByRole('button',{name:'Read current playback state',exact:true}).click();const snapshot=JSON.parse(await page.locator('#playback-state').innerText());assert.equal(snapshot.available,true);assert.equal(snapshot.paused,true);assert.equal(snapshot.duration,await media.evaluate(video=>video.duration));assert.ok(Math.abs(snapshot.currentTime-await media.evaluate(video=>video.currentTime))<.1);
  fs.mkdirSync(path.join(app,'test-output'),{recursive:true});await page.screenshot({path:path.join(app,'test-output/desktop.png'),fullPage:true});
  await page.setViewportSize({width:360,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.getByRole('button',{name:'Try altered quotation'}).click();assert.match(await page.locator('#result').innerText(),/QUOTE_MISMATCH/);
  await page.screenshot({path:path.join(app,'test-output/mobile.png'),fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.ok(!requests.some(url=>url.includes('/assets/mux-video-')),'native fixture must not load optional Mux chunk');
  console.log('PASS: catalog match, truth boundary, rejection, keyboard, scripted browser-local two-agent orchestration, native timing-fixture decode/play/pause/seek, 360px interaction/overflow, no errors and no external requests.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
