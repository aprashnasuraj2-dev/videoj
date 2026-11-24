// Failure/recovery browser regression: no service worker or fake offline success.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');

(async()=>{
 const app=path.resolve(__dirname,'..'),base='http://127.0.0.1:4283';
 const server=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','4283','--strictPort'],{cwd:app,stdio:'pipe'});
 let browser,log='',exited=false;server.on('exit',()=>exited=true);for(const stream of [server.stdout,server.stderr])stream.on('data',d=>log=(log+d).slice(-5000));
 try{
  let ready=false;for(let i=0;i<80;i++){if(exited)break;try{const r=await fetch(base,{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
  assert.ok(ready,'resilience preview not ready: '+log);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const offlinePage=await context.newPage();
  await context.setOffline(true);
  let offlineFailed=false;try{await offlinePage.goto(base,{waitUntil:'domcontentloaded',timeout:5000});}catch{offlineFailed=true;}
  assert.equal(offlineFailed,true,'without a cached/offline package, startup must fail rather than impersonate a local live run');
  await context.setOffline(false);
  await offlinePage.goto(base);await offlinePage.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
  assert.match(await offlinePage.locator('.notice').innerText(),/Synthetic development content/);
  assert.match(await offlinePage.locator('.notice').innerText(),/not factual training guidance/);
  assert.match(await offlinePage.locator('#network-result').innerText(),/not started/i);

  // Lose network only after the graph GET has left the browser.
  let releaseRoute,routeObserved;
  const routed=new Promise(resolve=>{routeObserved=resolve;});
  await offlinePage.route('**/agents/v/**/learner.network.json',async route=>{
   routeObserved();
   await new Promise(resolve=>{releaseRoute=resolve;});
   try{await route.continue();}catch{}
  });
  await offlinePage.getByRole('button',{name:'Run scripted network test'}).click();
  await routed;await context.setOffline(true);releaseRoute();
  await offlinePage.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('No completed result is claimed.'));
  assert.doesNotMatch(await offlinePage.locator('#network-result').innerText(),/Scripted orchestration test complete/);
  // Local, already-loaded evidence remains useful during the network failure.
  await offlinePage.getByRole('button',{name:'Check example',exact:true}).click();
  assert.match(await offlinePage.locator('#result').innerText(),/Catalog matched/);
  await context.setOffline(false);await offlinePage.unroute('**/agents/v/**/learner.network.json');
  await offlinePage.getByRole('button',{name:'Run scripted network test'}).click();
  await offlinePage.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('2 agent invocations; 3 scripted model steps.'));
  assert.match(await offlinePage.locator('#network-result').innerText(),/scripted/i);
  assert.match(await offlinePage.locator('section[aria-labelledby="runtime-title"]').innerText(),/No live AI/);

  // Only a clearly unavailable same-origin GET permits a single bounded retry.
  let unavailable=0;
  await offlinePage.route('**/agents/agent-manifest.json',async route=>{
   if(++unavailable===1)return route.fulfill({status:503,contentType:'text/plain',body:'Unavailable'});
   return route.continue();
  });
  await offlinePage.getByRole('button',{name:'Run scripted network test'}).click();
  await offlinePage.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('3 (1 retried)'));
  assert.equal(unavailable,2);
  await offlinePage.unroute('**/agents/agent-manifest.json');
  let persistent=0;
  await offlinePage.route('**/agents/agent-manifest.json',route=>{persistent++;return route.fulfill({status:503,body:'Unavailable'});});
  await offlinePage.getByRole('button',{name:'Run scripted network test'}).click();
  await offlinePage.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('ARTIFACT_UNAVAILABLE'));
  assert.match(await offlinePage.locator('#network-result').innerText(),/2 \(1 retried\)/);
  assert.equal(persistent,2);
  await offlinePage.unroute('**/agents/agent-manifest.json');
  // Reject a mixed publication before mounting any actionable UI; explicit reload recovers.
  const damaged=await context.newPage(),damageErrors=[],damageRequests=[];
  damaged.on('pageerror',e=>damageErrors.push(e.message));
  damaged.on('request',r=>damageRequests.push(r.url()));
  await damaged.route('**/transcripts/synthetic-timing.txt',r=>r.fulfill({contentType:'text/plain',body:'altered transcript'}));
  await damaged.goto(base);
  await damaged.getByRole('heading',{name:'Source content unavailable'}).waitFor();
  assert.equal(await damaged.locator('#provider-check,#prepare-review,#load-timing,#direct-form').count(),0);
  assert.equal(damageRequests.filter(u=>u.includes('/api/')||u.includes('/media/')).length,0);
  assert.deepEqual(damageErrors,[]);
  await damaged.unroute('**/transcripts/synthetic-timing.txt');
  await damaged.getByRole('button',{name:'Reload and check lesson'}).click();
  await damaged.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
  await damaged.getByRole('button',{name:'Check example',exact:true}).click();
  assert.equal(await damaged.locator('#result').getAttribute('data-state'),'matched');
  assert.deepEqual(damageErrors,[]);
  await damaged.close();
  console.log('PASS: mixed content refuses all actionable UI and explicit reload restores a validated lesson.');
  console.log('PASS: known 503 local public GET retry is capped once per load, actual attempt counts visible, persistent failure remains incomplete.');
  console.log('PASS: offline startup fails honestly, mid-artifact network loss yields no completed run, loaded evidence remains usable, and explicit online retry restores only a visibly scripted result.');
 }finally{
  if(browser)await browser.close();server.kill();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
