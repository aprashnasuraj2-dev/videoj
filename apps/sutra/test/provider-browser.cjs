const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');const net=require('node:net');const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{
 const app=path.resolve(__dirname,'..');
 const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});});
 const base='http://127.0.0.1:'+port;
 const server=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:app,stdio:'pipe'});
 let browser,logs='';for(const stream of [server.stdout,server.stderr])stream.on('data',d=>logs=(logs+d.toString()).slice(-3000));
 try{
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready,logs);
  browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});
  await page.goto(base);await page.getByRole('heading',{name:'Ask about the evidence.'}).waitFor();
  assert.equal(requests.length,0,'static visit must not check dynamic status automatically');
  await page.getByRole('button',{name:'Check inference availability'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='denied');
  assert.equal(await page.getByRole('button',{name:'Ask configured model'}).isDisabled(),true);
  assert.equal(requests.filter(x=>x.endsWith('/api/infer')||x.endsWith('/api/v1/chat/completions')).length,0);
  await page.getByRole('button',{name:'Check example',exact:true}).click();assert.equal(await page.locator('#result').getAttribute('data-state'),'matched');
  // Test transport only: intercept the provider endpoint; never contact a paid model.
  await page.route('**/api/status',r=>r.fulfill({json:{inference:'configured',model:'synthetic-provider-test',routerBase:'/api/v1',publisherFunded:true,byok:false,sourceTools:'catalog',content:{mode:'synthetic',contentVersion:'synthetic-timing-v1',catalogSha256:'a92e4c0e29691f8cc65cbc2707bb3359b4b351bde929f73299062e7dc05503cb',primarySourceId:'synthetic-timing-fixture'},factualTruth:'unverified'}}));
  const releaseGraph=JSON.parse(fs.readFileSync(path.join(app,'public/agents/source_learner.network.json'),'utf8'));releaseGraph.llm_config={model_name:'synthetic-provider-test'};
  const releaseManifest=JSON.parse(fs.readFileSync(path.join(app,'public/agents/agent-manifest.json'),'utf8'));
  releaseManifest.llm_router={base_url:base+'/api/v1',mock:false,publisher_funded:true};releaseManifest.allowed_peers=['https://guide.example'];releaseManifest.deployment={mode:'static',self_contained_runtime:true,browser_mock:false,direct_byok:false,direct_mcp_requires_cors:true,public_mcp_facade:false};
  releaseManifest.networks=releaseManifest.networks.map(n=>n.name==='source_learner'?{...n,hocon:'./release/test/source_learner.network.json'}:n);
  let manifestReads=0,graphReads=0;
  await page.route('**/agents/agent-manifest.json',r=>{manifestReads++;return r.fulfill({json:releaseManifest});});
  await page.route('**/agents/release/test/source_learner.network.json',r=>{graphReads++;return r.fulfill({json:releaseGraph});});
  let mode='complete',calls=0;const chunk=(delta,finish_reason=null)=>({choices:[{index:0,delta,finish_reason}]});
  const sse=items=>items.map(x=>'data: '+JSON.stringify(x)+'\n\n').join('')+'data: [DONE]\n\n';
  await page.route('**/api/v1/chat/completions',async r=>{
   calls++;const body=r.request().postDataJSON();assert.equal(body.model,'synthetic-provider-test');assert.equal(r.request().headers().authorization,undefined);
   if(mode==='hold'){await new Promise(resolve=>setTimeout(resolve,800));await r.abort().catch(()=>{});return;}
   if(mode==='quota'||mode==='partial'&&body.messages.some(m=>m.role==='tool'&&m.name==='mcp_search_lesson')){await r.fulfill({status:429,json:{error:{code:'QUOTA'}}});return;}
   const names=body.tools.map(t=>t.function.name),hasResult=body.messages.some(m=>m.role==='tool');let data;
   if(names.includes('evidence')&&!hasResult)data=chunk({tool_calls:[{index:0,id:'delegate-1',type:'function',function:{name:'evidence',arguments:JSON.stringify({request:'Find timing marker'})}}]},'tool_calls');
   else if(names.includes('mcp_search_lesson')&&!hasResult)data=chunk({tool_calls:[{index:0,id:'read-1',type:'function',function:{name:'mcp_search_lesson',arguments:'{"query":"timing"}'}}]},'tool_calls');
   else data=chunk({content:'Synthetic provider fixture interpretation; unverified.'},'stop');
   await r.fulfill({contentType:'text/event-stream',body:sse([data,{choices:[],usage:{prompt_tokens:20,completion_tokens:5,total_tokens:25}}])});
  });
  await page.getByRole('button',{name:'Check inference availability'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('Model configured'));
  assert.equal(manifestReads,1);assert.equal(graphReads,1);assert.equal(calls,0,'provider discovery must bind public contract before any model call');assert.match(await page.locator('#provider-status').textContent(),/Model configured/);
  await page.getByRole('button',{name:'Ask configured model'}).click();await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='completed');
  assert.equal(calls,4);assert.match(await page.locator('#provider-answer').textContent(),/Synthetic provider fixture/);assert.match(await page.locator('#provider-receipts').textContent(),/synthetic-timing-fixture/);assert.match(await page.locator('#provider-metrics').textContent(),/80\/20\/100/);
  // A model result grants neither media transfer nor persistence.
  await page.getByRole('button',{name:'Seek to retrieved cue'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-action-status').textContent.includes('Cue seek unavailable'));
  assert.equal(calls,4);
  await page.getByRole('button',{name:'Preview retrieved review card'}).click();
  const preview=JSON.parse(await page.locator('#review-preview').textContent());
  assert.equal(preview.args.receipt.cueId,'timing-marker');
  assert.equal(await page.locator('#review-list li').count(),0);
  await page.getByRole('button',{name:'Confirm local save'}).click();
  await page.waitForFunction(()=>document.querySelector('#review-list').children.length===1);
  assert.equal(calls,4);
  await page.getByLabel('Question about the synthetic lesson').fill('Locate the timing marker again.');
  assert.equal(await page.locator('#provider-output').isHidden(),true);
  assert.equal(await page.getByRole('button',{name:'Preview retrieved review card'}).count(),0);
  mode='partial';await page.getByRole('button',{name:'Ask configured model'}).click();await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='error');assert.equal(calls,7);assert.match(await page.locator('#provider-status').textContent(),/PROVIDER_QUOTA/);assert.match(await page.locator('#provider-answer').textContent(),/No completed answer/);assert.match(await page.locator('#provider-receipts').textContent(),/synthetic-timing-fixture/);assert.equal(await page.locator('#provider-output').isHidden(),false);
  // Incomplete interpretation preserves independently retrieved receipts and local actions.
  await page.getByRole('button',{name:'Preview retrieved review card'}).click();
  assert.match(await page.locator('#review-preview').textContent(),/timing-marker/);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await page.locator('#review-list li').count(),1);
  assert.equal(calls,7);
  await page.getByRole('button',{name:'Load synthetic timing fixture'}).click();await page.waitForFunction(()=>document.querySelector('#timing-status').dataset.state==='completed');
  await page.getByRole('button',{name:'Seek to retrieved cue'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-action-status').textContent.includes('Native media reached'));
  assert.equal(calls,7);
  mode='quota';await page.getByRole('button',{name:'Ask configured model'}).click();await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='error');assert.equal(calls,8);assert.equal(await page.locator('#provider-output').isHidden(),true);
  mode='hold';await page.getByRole('button',{name:'Ask configured model'}).click();await page.waitForFunction(()=>!document.querySelector('#provider-cancel').disabled);
  for(let i=0;i<50&&calls<9;i++)await new Promise(r=>setTimeout(r,20));assert.equal(calls,9);
  await page.getByRole('button',{name:'Cancel inference'}).click();await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='cancelled');assert.equal(await page.locator('#provider-output').isHidden(),true);
  await page.getByRole('button',{name:'Inspect timing cue at 00:02'}).click();await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Synthetic cue reached'));
  assert.deepEqual(errors,[]);console.log('PASS: visible opt-in model discovery, synthetic provider transport, independently matched receipts, token counts, quota failure, cancellation, no retry and native media unaffected.');
 }finally{await browser?.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1;});
