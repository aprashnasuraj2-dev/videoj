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
  // Same-origin cookies can exist from another site path. SUTRA source/API
  // requests never depend on them or disclose them to model/source tools.
  await page.context().addCookies([{name:'sutra-cookie-canary',value:'do-not-send',url:base}]);
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/')){requests.push(r.url());assert.equal(r.headers().cookie,undefined,'no SUTRA API request should inherit browser cookies');assert.equal(r.headers().referer??'','','no API request should disclose a nonempty caller referrer');}});
  await page.goto(base+'/?private=REFERRER_CANARY');await page.getByRole('heading',{name:'Ask about the evidence.'}).waitFor();
  assert.match(await page.locator('#provider-panel').innerText(),/self-hosted or external hosted model/);
  assert.match(await page.locator('#provider-panel').innerText(),/not running in your browser/);
  assert.equal(requests.length,0,'static visit must not check dynamic status automatically');
  await page.getByRole('button',{name:'Check inference availability'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='denied');
  assert.equal(await page.getByRole('button',{name:'Ask configured model'}).isDisabled(),true);
  assert.equal(requests.filter(x=>x.endsWith('/api/infer')||x.endsWith('/api/v1/chat/completions')).length,0);
  await page.getByRole('button',{name:'Check example',exact:true}).click();assert.equal(await page.locator('#result').getAttribute('data-state'),'matched');
  // Test transport only: intercept the provider endpoint; never contact a paid model.
  let inferenceContract='a'.repeat(64),holdStatus=false,statusHeld=false;
  await page.route('**/api/status',async r=>{if(holdStatus){statusHeld=true;await new Promise(resolve=>setTimeout(resolve,800));await r.abort().catch(()=>{});return;}return r.fulfill({json:{inference:'configured',model:'synthetic-provider-test',backend:'self_hosted',inferenceContractId:inferenceContract,routerBase:'/api/v1',publisherFunded:true,byok:false,sourceTools:'catalog',webResearch:'disabled',content:{mode:'synthetic',contentVersion:'synthetic-timing-v1',catalogSha256:'a12d95aab97bbc047a2b88d73f4814072c48c3f2e55adeb0381a7b8d36c45333',primarySourceId:'synthetic-timing-fixture'},factualTruth:'unverified'}});});
  const releaseGraph=JSON.parse(fs.readFileSync(path.join(app,'public/agents/source_learner.network.json'),'utf8'));releaseGraph.llm_config={model_name:'synthetic-provider-test'};
  const releaseManifest=JSON.parse(fs.readFileSync(path.join(app,'public/agents/agent-manifest.json'),'utf8'));
  releaseManifest.llm_router={base_url:base+'/api/v1',mock:false,publisher_funded:true};releaseManifest.allowed_peers=['https://guide.example'];releaseManifest.deployment={mode:'static',self_contained_runtime:true,browser_mock:false,direct_byok:false,direct_mcp_requires_cors:true,public_mcp_facade:false};
  releaseManifest.networks=releaseManifest.networks.map(n=>n.name==='source_learner'?{...n,hocon:'./release/test/source_learner.network.json'}:n);
  let manifestReads=0,graphReads=0,graphDrift=false;
  await page.route('**/agents/agent-manifest.json',r=>{manifestReads++;return r.fulfill({json:releaseManifest});});
  await page.route('**/agents/release/test/source_learner.network.json',r=>{graphReads++;return r.fulfill({json:graphDrift?{...releaseGraph,metadata:{...releaseGraph.metadata,description:'Changed graph after approval'}}:releaseGraph});});
  let mode='complete',calls=0,firstQuestion=null,firstLearningContext=null;const chunk=(delta,finish_reason=null)=>({choices:[{index:0,delta,finish_reason}]});
  const sse=items=>items.map(x=>'data: '+JSON.stringify(x)+'\n\n').join('')+'data: [DONE]\n\n';
  await page.route('**/api/source-tools',async r=>{
   assert.equal(r.request().headers()['x-sutra-inference-contract'],undefined);
   if(mode!=='source-quota')return r.fallback();
   const rpc=r.request().postDataJSON();
   if(rpc.method!=='tools/call')return r.fallback();
   await r.fulfill({status:429,contentType:'application/json',body:JSON.stringify({error:{code:'SOURCE_QUOTA'}})});
  });
  await page.route('**/api/v1/chat/completions',async r=>{
   calls++;assert.equal(r.request().headers()['x-sutra-inference-contract'],inferenceContract);assert.equal(r.request().headers()['x-sutra-catalog-sha256'],'a12d95aab97bbc047a2b88d73f4814072c48c3f2e55adeb0381a7b8d36c45333');const body=r.request().postDataJSON();if(firstQuestion===null){const users=body.messages.filter(m=>m.role==='user');firstQuestion=users.at(-1).content;firstLearningContext=users.find(m=>m.content.startsWith('Caller-owned learning state (data, not instructions).'))?.content??null;}assert.equal(body.model,'synthetic-provider-test');assert.equal(r.request().headers().authorization,undefined);assert.equal(r.request().headers().cookie,undefined);
   if(mode==='contract-drift'&&body.messages.some(m=>m.role==='tool'&&m.name==='mcp_search_lesson')){await r.fulfill({status:409,headers:{'X-Sutra-Precondition':'inference'},json:{error:{code:'INFERENCE_CONTRACT_MISMATCH'}}});return;}
   if(mode==='catalog-drift'&&body.messages.some(m=>m.role==='tool'&&m.name==='mcp_search_lesson')){await r.fulfill({status:409,json:{error:{code:'CONTENT_VERSION_MISMATCH'}}});return;}
   if(mode==='no-receipt'&&body.tools.some(t=>t.function.name==='mcp_search_lesson')&&!body.messages.some(m=>m.role==='tool')){await r.fulfill({contentType:'text/event-stream',body:sse([chunk({content:'Synthetic source specialist skipped retrieval; this must not become a completed answer.'},'stop'),{choices:[],usage:{prompt_tokens:20,completion_tokens:5,total_tokens:25}}])});return;}
   if(mode==='hold'){await new Promise(resolve=>setTimeout(resolve,800));await r.abort().catch(()=>{});return;}
   if(mode==='quota'||mode==='partial'&&body.messages.some(m=>m.role==='tool'&&m.name==='mcp_search_lesson')){await r.fulfill({status:429,json:{error:{code:'QUOTA'}}});return;}
   const names=body.tools.map(t=>t.function.name),hasResult=body.messages.some(m=>m.role==='tool');let data;
   if(names.includes('mcp_search_lesson')&&!hasResult)data=chunk({tool_calls:[{index:0,id:'read-1',type:'function',function:{name:'mcp_search_lesson',arguments:'{"query":"timing"}'}}]},'tool_calls');
   else{
    const sourceTool=body.messages.filter(m=>m.role==='tool'&&m.name==='mcp_search_lesson').at(-1);
    if(sourceTool){
     const observed=JSON.parse(sourceTool.content),receipt=observed.receipts?.[0];assert.ok(receipt?.sourceId&&receipt?.cueId&&typeof receipt.excerpt==='string'&&receipt.excerpt.length>=12);
     data=chunk({content:JSON.stringify({claims:[{kind:'source_claim',text:'Synthetic provider fixture cites the retrieved lesson cue.',citations:[{kind:'lesson',sourceId:receipt.sourceId,cueId:receipt.cueId,quote:receipt.excerpt}]}]})},'stop');
    }else data=chunk({content:JSON.stringify({claims:[{kind:'uncertainty',text:'No source evidence was available.',citations:[]}]})},'stop');
   }
   await r.fulfill({contentType:'text/event-stream',body:sse([data,{choices:[],usage:{prompt_tokens:20,completion_tokens:5,total_tokens:25}}])});
  });
  await page.getByRole('button',{name:'Check inference availability'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('Model configured'));
  assert.equal(manifestReads,1);assert.equal(graphReads,1);assert.equal(calls,0,'provider discovery must bind public contract before any model call');assert.match(await page.locator('#provider-status').textContent(),/Model configured/);
  const runOnce=async()=>{
   const before=calls;
   await page.getByRole('button',{name:'Ask configured model'}).click();
   await page.waitForFunction(()=>document.querySelector('#provider-consent-dialog').open);
   assert.equal(calls,before,'opening inference consent must not call the model');
   assert.equal(await page.locator('#provider-consent-question').textContent(),await page.locator('#provider-question').inputValue());
   assert.match(await page.locator('#provider-consent-backend').textContent(),/self-hosted/);
   assert.equal(await page.locator('#provider-consent-model').textContent(),'synthetic-provider-test');
   assert.match(await page.locator('#provider-consent-budget').textContent(),/Up to 8 model calls, 12 agent invocations and 60 seconds.*No automatic retry/);
   assert.match(await page.locator('#provider-consent-dialog').textContent(),/daily HMAC quota key/);assert.match(await page.locator('#provider-consent-dialog').textContent(),/Backend logging or retention is not verified/);
   await page.getByRole('button',{name:'Run inference once'}).click();
  };
  // Consent cancellation is a true zero-model path and does not disable local evidence.
  await page.getByRole('button',{name:'Ask configured model'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-consent-dialog').open);
  assert.equal(calls,0);await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#provider-consent-dialog').open);
  assert.equal(calls,0);assert.match(await page.locator('#provider-status').textContent(),/not started/);
  assert.equal(await page.locator('#provider-consent-question').textContent(),'');
  // Closing a modal by native/scripted lifecycle is not approval. A stale
  // hidden control cannot authorize even a model preflight.
  await page.getByRole('button',{name:'Ask configured model'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-consent-dialog').open);
  await page.evaluate(()=>{document.querySelector('#provider-consent-dialog').close();document.querySelector('#provider-consent-allow').click();});
  await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='cancelled');
  assert.equal(calls,0);assert.equal(await page.locator('#provider-consent-question').textContent(),'');
  assert.equal(await page.locator('#provider-run').isEnabled(),true);
  await page.getByRole('button',{name:'Check example',exact:true}).click();assert.equal(await page.locator('#result').getAttribute('data-state'),'matched');
  // A different but valid graph cannot inherit approval from discovery.
  graphDrift=true;
  await runOnce();
  await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('Provider publication changed'));
  assert.equal(calls,0);assert.equal(await page.locator('#provider-run').isDisabled(),true);
  graphDrift=false;
  await page.getByRole('button',{name:'Check inference availability'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('Model configured'));
  inferenceContract='b'.repeat(64);await runOnce();
  await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('Provider publication changed'));
  assert.equal(calls,0);assert.equal(await page.locator('#provider-run').isDisabled(),true);
  await page.getByRole('button',{name:'Check inference availability'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('Model configured'));
  // Even profile-only metadata drift invalidates the mounted lesson binding.
  const profile=JSON.parse(fs.readFileSync(path.join(app,'public/content/content-profile.json'),'utf8'));
  await page.route('**/content/content-profile.json',r=>r.fulfill({json:{...profile,title:'Changed lesson after approval'}}));
  await runOnce();
  await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('Published lesson changed'));
  assert.equal(calls,0);assert.equal(await page.locator('#provider-run').isDisabled(),true);
  await page.getByRole('button',{name:'Check example',exact:true}).click();
  assert.equal(await page.locator('#result').getAttribute('data-state'),'matched','old local lesson remains a valid local snapshot');
  await page.unroute('**/content/content-profile.json');
  await page.getByRole('button',{name:'Check inference availability'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('Model configured'));
  const exactQuestion='  Find the featured source cue.  ';
  await page.getByLabel('Question about the source lesson').fill(exactQuestion);
  await runOnce();await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='completed');
  assert.equal(firstQuestion,exactQuestion,'consented question and current model user message must agree byte for byte');
   assert.equal(firstLearningContext,await page.locator('#provider-consent-context').textContent(),'consented learning-state bytes and model context message must agree byte for byte');
  assert.equal(calls,2);assert.match(await page.locator('#provider-answer').textContent(),/Source claim: Synthetic provider fixture/);assert.match(await page.locator('#provider-receipts').textContent(),/synthetic-timing-fixture/);assert.match(await page.locator('#provider-metrics').textContent(),/40\/10\/50/);
  // Opening then cancelling a later run preserves the completed answer and creates no model traffic.
  const completedAnswer=await page.locator('#provider-answer').textContent();
  await page.getByRole('button',{name:'Ask configured model'}).click();await page.waitForFunction(()=>document.querySelector('#provider-consent-dialog').open);
  assert.equal(calls,2);await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#provider-consent-dialog').open);
  assert.equal(calls,2);assert.equal(await page.locator('#provider-output').isHidden(),false);assert.equal(await page.locator('#provider-answer').textContent(),completedAnswer);
  // A model result grants neither media transfer nor persistence.
  await page.getByRole('button',{name:'Seek to retrieved cue'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-action-status').textContent.includes('Cue seek unavailable'));
  assert.equal(calls,2);
  await page.getByRole('button',{name:'Preview retrieved review card'}).click();
  const preview=JSON.parse(await page.locator('#review-preview').textContent());
  assert.equal(preview.args.receipt.cueId,'timing-marker');
  assert.equal(await page.locator('#review-list li').count(),0);
  await page.getByRole('button',{name:'Confirm local save'}).click();
  await page.waitForFunction(()=>document.querySelector('#review-list').children.length===1);
  assert.equal(calls,2);
  const oldReview=await page.getByRole('button',{name:'Preview retrieved review card'}).elementHandle();
  // Editing the next question must not silently discard or relabel the old result.
  const oldQuestion=await page.getByLabel('Question about the source lesson').inputValue();
  await page.getByLabel('Question about the source lesson').fill('A different question that has not been sent.');
  assert.match(await page.locator('#provider-result-context').textContent(),/Not an answer to the current question/);
  assert.equal(await page.locator('#provider-answer').textContent(),completedAnswer);
  assert.equal(await page.getByRole('button',{name:'Preview retrieved review card'}).isDisabled(),true);
  assert.equal(await page.getByRole('button',{name:'Seek to retrieved cue'}).isDisabled(),true);
  await oldReview.evaluate(button=>{button.disabled=false;button.click();});assert.equal(await page.locator('#review-dialog').evaluate(dialog=>dialog.open),false,'even a forcibly enabled earlier action is inert');
  await oldReview.evaluate(button=>button.disabled=true);
  await page.getByRole('button',{name:'Ask configured model'}).click();await page.waitForFunction(()=>document.querySelector('#provider-consent-dialog').open);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(calls,2);
  assert.match(await page.locator('#provider-result-context').textContent(),/Not an answer to the current question/);
  assert.equal(await page.locator('#provider-output').isHidden(),false);
  await page.getByLabel('Question about the source lesson').fill(oldQuestion);
  await page.getByRole('button',{name:'Check inference availability'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('Model configured'));
  assert.equal(calls,2);assert.equal(await page.locator('#provider-answer').textContent(),completedAnswer);
  assert.match(await page.locator('#provider-result-context').textContent(),/Not a result from the current configuration/);
  assert.equal(await page.getByRole('button',{name:'Preview retrieved review card'}).isDisabled(),true,'editing back and rediscovering cannot resurrect an earlier action');
  // Cancellation after explicit approval but before the first model POST
  // preserves the prior answer and its exact receipts.
  holdStatus=true;statusHeld=false;await runOnce();
  for(let i=0;i<50&&!statusHeld;i++)await new Promise(r=>setTimeout(r,20));assert.equal(statusHeld,true);
  assert.equal(await page.locator('#provider-answer').textContent(),completedAnswer);
  await page.getByRole('button',{name:'Cancel inference'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='cancelled');
  holdStatus=false;
  assert.equal(calls,2);assert.match(await page.locator('#provider-status').textContent(),/before a model request/);
  assert.equal(await page.locator('#provider-output').isHidden(),false);
  assert.equal(await page.locator('#provider-answer').textContent(),completedAnswer);
  assert.match(await page.locator('#provider-receipts').textContent(),/synthetic-timing-fixture/);
  mode='no-receipt';await runOnce();await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='empty');
  await oldReview.evaluate(button=>button.click());assert.equal(await page.locator('#review-dialog').evaluate(dialog=>dialog.open),false);
  assert.equal(calls,3);assert.match(await page.locator('#provider-status').textContent(),/interpretation was discarded/);assert.equal(await page.locator('#provider-output').isHidden(),true);
  await page.getByLabel('Question about the source lesson').fill('Locate the timing marker again.');
  assert.equal(await page.locator('#provider-output').isHidden(),true);
  assert.equal(await page.getByRole('button',{name:'Preview retrieved review card'}).count(),0);
  mode='partial';await runOnce();await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='error');assert.equal(calls,5);assert.match(await page.locator('#provider-status').textContent(),/PROVIDER_QUOTA/);assert.match(await page.locator('#provider-answer').textContent(),/No completed answer/);assert.match(await page.locator('#provider-receipts').textContent(),/synthetic-timing-fixture/);assert.equal(await page.locator('#provider-output').isHidden(),false);
  // Incomplete interpretation preserves independently retrieved receipts and local actions.
  await page.getByRole('button',{name:'Preview retrieved review card'}).click();
  assert.match(await page.locator('#review-preview').textContent(),/timing-marker/);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await page.locator('#review-list li').count(),1);
  assert.equal(calls,5);
  await page.getByRole('button',{name:'Load source media'}).click();await page.waitForFunction(()=>document.querySelector('#timing-status').dataset.state==='completed');
  await page.getByRole('button',{name:'Seek to retrieved cue'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-action-status').textContent.includes('Native media reached'));
  assert.equal(calls,5);
  mode='quota';await runOnce();await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='error');assert.equal(calls,6);assert.equal(await page.locator('#provider-output').isHidden(),true);
  mode='hold';await runOnce();await page.waitForFunction(()=>!document.querySelector('#provider-cancel').disabled);
  for(let i=0;i<50&&calls<7;i++)await new Promise(r=>setTimeout(r,20));assert.equal(calls,7);
  await page.getByRole('button',{name:'Cancel inference'}).click();await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='cancelled');assert.equal(await page.locator('#provider-output').isHidden(),true);
  const beforeSourceQuota=calls;mode='source-quota';await runOnce();await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='denied');
  assert.equal(calls,beforeSourceQuota+1,'source read quota stops after the direct learner requests evidence but before any post-retrieval model call');assert.match(await page.locator('#provider-status').textContent(),/source-read allowance/);assert.equal(await page.locator('#provider-output').isHidden(),true);
  await page.getByRole('button',{name:'Check example',exact:true}).click();assert.equal(await page.locator('#result').getAttribute('data-state'),'matched','local cached evidence remains usable after source API quota denial');
  await page.getByRole('button',{name:'Inspect featured source cue'}).click();await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Source cue reached'));
  mode='catalog-drift';await runOnce();
  await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('server rejected the lesson version'));
  assert.equal(calls,beforeSourceQuota+3,'source quota adds one model attempt; later catalog drift stops at the second model attempt with no retry');
  assert.equal(await page.locator('#provider-run').isDisabled(),true);
  assert.match(await page.locator('#provider-answer').textContent(),/No completed answer/);
  assert.match(await page.locator('#provider-receipts').textContent(),/synthetic-timing-fixture/);
  await page.getByRole('button',{name:'Check inference availability'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('Model configured'));
  const beforeContractDrift=calls;mode='contract-drift';await runOnce();
  await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('server rejected the approved inference configuration'));
  assert.equal(calls,beforeContractDrift+2);assert.equal(await page.locator('#provider-run').isDisabled(),true);
  assert.match(await page.locator('#provider-answer').textContent(),/No completed answer/);
  assert.match(await page.locator('#provider-receipts').textContent(),/synthetic-timing-fixture/);
  // Exercise the persisted page lifecycle handler, not a claim of actual browser BFCache eligibility.
  // A pending discovery must not republish a provider or erase a later operation after pagehide.
  holdStatus=true;statusHeld=false;const beforeLifecycle=calls;
  await page.getByRole('button',{name:'Check inference availability'}).click();
  for(let i=0;i<50&&!statusHeld;i++)await new Promise(r=>setTimeout(r,20));assert.equal(statusHeld,true);
  await page.getByRole('searchbox',{name:'Search source transcript'}).fill('timing marker');
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  assert.equal(await page.locator('#provider-run').isDisabled(),true);
  assert.equal(await page.locator('#provider-check').isDisabled(),false);
  assert.equal(await page.locator('#provider-output').isHidden(),true);
  assert.equal(await page.getByRole('searchbox',{name:'Search source transcript'}).inputValue(),'timing marker');
  assert.equal(await page.locator('video').count(),1);
  holdStatus=false;await page.getByRole('button',{name:'Check inference availability'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('Model configured'));
  await page.waitForTimeout(900);
  assert.match(await page.locator('#provider-status').textContent(),/Model configured/);
  assert.equal(await page.locator('#provider-run').isDisabled(),false);assert.equal(calls,beforeLifecycle);
  await page.locator('#timing-transcript-panel .transcript-cue').click();
  await page.waitForFunction(()=>document.querySelector('#timing-transcript-panel .transcript-status').textContent.includes('Native media reached'));
  assert.deepEqual(errors,[]);console.log('PASS: visible opt-in model discovery, synthetic provider transport, independently matched receipts, token counts, quota failure, cancellation, no retry and native media unaffected.');
 }finally{await browser?.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1;});
