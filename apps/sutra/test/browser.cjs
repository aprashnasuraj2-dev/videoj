const {chromium}=require('playwright');
const {spawn,spawnSync}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');

(async()=>{
 const app=path.resolve(__dirname,'..'),base='http://127.0.0.1:4183',peerApp=path.resolve(app,'../sutra-peer'),peerBase='http://127.0.0.1:4195';
 const peerBuild=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:peerApp,encoding:'utf8'});assert.equal(peerBuild.status,0,peerBuild.stderr||peerBuild.stdout);
 const peerServer=spawn(process.execPath,['scripts/serve.mjs'],{cwd:peerApp,env:{...process.env,PORT:'4195'},stdio:'pipe'});
 const server=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','4183','--strictPort'],{cwd:app,stdio:'pipe'});
 let browser,exited=false,peerExited=false,serverLog='',peerLog='';
 for(const output of [server.stdout,server.stderr])output.on('data',data=>{serverLog=(serverLog+data.toString()).slice(-8000);});server.on('exit',()=>exited=true);
 for(const output of [peerServer.stdout,peerServer.stderr])output.on('data',data=>{peerLog=(peerLog+data.toString()).slice(-8000);});peerServer.on('exit',()=>peerExited=true);
 try{
  let ready=false,peerReady=false;
  for(let i=0;i<60;i++){
   if(exited)throw Error('Preview exited before readiness: '+serverLog);if(peerExited)throw Error('Peer preview exited before readiness: '+peerLog);
   try{const [a,b]=await Promise.all([fetch(base,{signal:AbortSignal.timeout(500)}),fetch(peerBase,{signal:AbortSignal.timeout(500)})]);ready=a.ok;peerReady=b.ok;if(ready&&peerReady)break;}catch{}
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  assert.ok(ready,'preview ready');assert.ok(peerReady,'peer preview ready');
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:1050}});
  const errors=[],external=[],requests=[],peerRequests=[],routerRequests=[];let routerSequence=0;
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{
   requests.push(request.url());
   const row={url:request.url(),method:request.method(),headers:request.headers(),postData:request.postData()};
   if(request.url().startsWith(peerBase+'/'))peerRequests.push(row);
   else if(request.url().startsWith('https://openrouter.ai/'))routerRequests.push(row);
   else if(!request.url().startsWith(base+'/')&&!request.url().startsWith('blob:'+base+'/'))external.push(request.url());
  });
  await page.route('https://openrouter.ai/api/v1/chat/completions',async route=>{
   const request=route.request(),cors={'Access-Control-Allow-Origin':base,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type, Accept','Vary':'Origin'};
   if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers:cors,body:''});return;}
   const body=JSON.parse(request.postData()||'{}'),tools=Array.isArray(body.tools)?body.tools:[],returned=(body.messages||[]).some(message=>message.role==='tool');
   let chunk;
   if(tools.length&&!returned){
    const name=tools[0].function.name,args=JSON.stringify({request:'Inspect the published source state. This is a routed BYOK browser fixture.'});
    chunk={choices:[{index:0,delta:{tool_calls:[{index:0,id:'byok-'+(++routerSequence),type:'function',function:{name,arguments:args}}]},finish_reason:'tool_calls'}]};
   }else{
    const content=tools.length?'BYOK fixture observed the returned tool result.':'BYOK peer helper fixture: rights-cleared lesson provenance remains pending.';
    chunk={choices:[{index:0,delta:{content},finish_reason:'stop'}]};
   }
   await route.fulfill({status:200,headers:{...cors,'Content-Type':'text/event-stream','Cache-Control':'no-store'},body:'data: '+JSON.stringify(chunk)+'\n\ndata: [DONE]\n\n'});
  });

  await page.goto(base);await page.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
  await page.waitForFunction(()=>document.querySelector('#transcript-integrity').textContent.includes('transcript v3 ✓ matches manifest'));
  assert.match(await page.locator('#transcript-integrity').innerText(),/Hash proves bytes, not truth/);
  await page.getByRole('button',{name:'Verify transcript evidence',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Annotation, transcript SHA-256'));
  assert.match(await page.locator('#result').innerText(),/Factual truth has not been checked/);assert.match(await page.locator('#cue-href').innerText(),/#t=12,18$/);
  await page.getByRole('button',{name:'Try altered quotation'}).click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('QUOTE_MISMATCH'));
  await page.locator('#cue').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Annotation, transcript SHA-256'));assert.equal(await page.locator('#cue').getAttribute('aria-pressed'),'true');

  await page.getByRole('button',{name:'Run scripted network test'}).click();await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('2 agent invocations; 3 scripted model steps.'));assert.equal(await page.locator('#network-trace li').count(),2);assert.match(await page.locator('#network-result').innerText(),/No live AI/);
  await page.getByRole('button',{name:'Run scripted source retrieval',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#source-network-result').textContent.includes('5 scripted model steps; two source reads.'));assert.match(await page.locator('#source-network-result').innerText(),/Synthetic timing marker/);
  await page.route('**/api/source-tools',route=>route.abort());await page.getByRole('button',{name:'Run scripted source retrieval',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#source-network-result').textContent.includes('No completed source result is claimed.'));await page.unroute('**/api/source-tools');

  const invalidGraph=JSON.parse(fs.readFileSync(path.join(app,'public/agents/learner.network.json')));invalidGraph.tools[1].tools=['learner'];
  await page.route('**/agents/learner.network.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(invalidGraph)}));await page.getByRole('button',{name:'Run scripted network test'}).click();await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('(CYCLE)'));assert.equal(await page.locator('#network-trace li').count(),0);await page.unroute('**/agents/learner.network.json');

  await page.getByRole('button',{name:'Preview synthetic peer contact'}).click();await page.getByRole('dialog',{name:'External contact request'}).waitFor();assert.match(await page.locator('#consent-origin').innerText(),/peer\.invalid/);const externalBeforeDeny=external.length;await page.getByRole('button',{name:'Deny',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#consent-status').textContent.includes('denied before'));assert.equal(external.length,externalBeforeDeny);
  await page.getByRole('button',{name:'Preview synthetic peer contact'}).click();await page.getByRole('button',{name:'Allow for this session'}).click();await page.waitForFunction(()=>document.querySelector('#consent-status').textContent.includes('Simulated operations: 1'));await page.getByRole('button',{name:'Preview synthetic peer contact'}).click();await page.waitForFunction(()=>document.querySelector('#consent-status').textContent.includes('Simulated operations: 2'));assert.match(await page.locator('#consent-events').textContent(),/remembered/);

  await page.locator('#peer-url').fill(peerBase+'/agents/checklist');const peerBefore=peerRequests.length;
  assert.equal(await page.locator('#peer-run-lifecycle').getAttribute('data-state'),'idle');
  await page.getByRole('button',{name:'Run consented peer composition'}).click();
  await page.waitForFunction(()=>document.querySelector('#peer-run-lifecycle').dataset.state==='running');
  await page.waitForFunction(()=>document.querySelector('#consent-dialog').open&&document.querySelector('#consent-purpose').textContent.includes('exact published peer network'));await page.getByRole('button',{name:'Allow once',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#consent-dialog').open&&document.querySelector('#consent-purpose').textContent.includes('network definition'));await page.getByRole('button',{name:'Allow once',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#peer-network-result').textContent.includes('3 agent invocations; 1 peer call; 5 scripted model steps.'));
  assert.equal(await page.locator('#peer-run-lifecycle').getAttribute('data-state'),'complete');
  assert.match(await page.locator('#peer-run-lifecycle').innerText(),/Run state: complete/i);
  assert.equal(await page.getByRole('button',{name:'Cancel current run'}).isDisabled(),true);
  assert.equal(peerRequests.length-peerBefore,2);assert.ok(peerRequests.every(request=>request.method==='GET'&&!request.headers.authorization&&!request.headers.cookie));
  const peerTrace=await page.locator('#network-trace').innerText();assert.match(peerTrace,/learner \/ learner @ sutra-local/);assert.match(peerTrace,/checklist \/ checklist @ http:\/\/127\.0\.0\.1:4195/);assert.match(await page.locator('#prov-graph').innerText(),/sha256-/);assert.match(await page.locator('#prov-origins').innerText(),/127\.0\.0\.1:4195/);

  // The browser must reject a redirected public artifact before visiting the new target.
  const beforeRedirect=peerRequests.length;
  await page.route(peerBase+'/agents/agent-manifest.json',route=>route.fulfill({
   status:302,headers:{Location:peerBase+'/agents/redirect-target.json','Access-Control-Allow-Origin':base}
  }));
  await page.getByRole('button',{name:'Run consented peer composition'}).click();
  await page.waitForFunction(()=>document.querySelector('#consent-dialog').open&&document.querySelector('#consent-purpose').textContent.includes('exact published peer network'));
  await page.getByRole('button',{name:'Allow once',exact:true}).click();
  await page.waitForFunction(()=>/Peer load failed|public network artifact is unavailable|PEER_ARTIFACT/.test(document.querySelector('#peer-network-result').textContent));
  const redirectRequests=peerRequests.slice(beforeRedirect);
  assert.equal(redirectRequests.length,1,'redirect response must not trigger a second peer GET');
  assert.ok(redirectRequests[0].url.endsWith('/agents/agent-manifest.json'));
  await page.getByRole('button',{name:'Verify transcript evidence',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Annotation, transcript SHA-256'));
  await page.unroute(peerBase+'/agents/agent-manifest.json');

  await page.locator('#use-byok').check();const missingPeer=peerRequests.length,missingRouter=routerRequests.length;await page.getByRole('button',{name:'Run consented peer composition'}).click();await page.waitForFunction(()=>document.querySelector('#peer-network-result').textContent.includes('(BYOK_SETUP)'));assert.equal(peerRequests.length,missingPeer);assert.equal(routerRequests.length,missingRouter);
  const keyCanary='synthetic-byok-browser-canary-987654';await page.locator('#byok-model').fill('openrouter/free');await page.locator('#byok-key').fill(keyCanary);await page.getByRole('button',{name:'Use key in memory'}).click();assert.equal(await page.locator('#byok-key').inputValue(),'');assert.match(await page.locator('#byok-status').innerText(),/ready in memory/);assert.ok(!(await page.content()).includes(keyCanary));

  const byokPeerBefore=peerRequests.length,byokRouterBefore=routerRequests.length;await page.getByRole('button',{name:'Run consented peer composition'}).click();
  await page.waitForFunction(()=>document.querySelector('#consent-dialog').open&&document.querySelector('#consent-purpose').textContent.includes('exact published peer network'));await page.getByRole('button',{name:'Allow once',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#consent-dialog').open&&document.querySelector('#consent-purpose').textContent.includes('network definition'));await page.getByRole('button',{name:'Allow once',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#peer-network-result').textContent.includes('5 BYOK model calls via OpenRouter'));
  const byokPeer=peerRequests.slice(byokPeerBefore),routerPosts=routerRequests.slice(byokRouterBefore).filter(request=>request.method==='POST');
  assert.equal(byokPeer.length,2);assert.ok(byokPeer.every(request=>!request.headers.authorization&&!request.headers.cookie&&!JSON.stringify(request).includes(keyCanary)));
  assert.equal(routerPosts.length,5);assert.ok(routerPosts.every(request=>request.headers.authorization==='Bearer '+keyCanary));assert.ok(routerPosts.every(request=>!String(request.postData).includes(keyCanary)));
  assert.equal(await page.locator('#prov-model').innerText(),'openrouter/free');assert.match(await page.locator('#prov-router').innerText(),/OpenRouter/);const origins=await page.locator('#prov-origins').innerText();assert.match(origins,/openrouter\.ai/);assert.match(origins,/127\.0\.0\.1:4195/);assert.match(await page.locator('#prov-calls').innerText(),/3 agent \/ 5 model \/ 1 peer/);assert.match(await page.locator('#prov-consent').innerText(),/peer_manifest:allow\/once/);assert.ok(!(await page.locator('.provenance').innerText()).includes(keyCanary));
  assert.equal(await page.evaluate(key=>JSON.stringify(localStorage).includes(key),keyCanary),false);

  await page.getByRole('button',{name:'Clear key'}).click();assert.match(await page.locator('#byok-status').innerText(),/cleared from memory/);const clearedPeer=peerRequests.length,clearedRouter=routerRequests.length;await page.getByRole('button',{name:'Run consented peer composition'}).click();await page.waitForFunction(()=>document.querySelector('#peer-network-result').textContent.includes('(BYOK_SETUP)'));assert.equal(peerRequests.length,clearedPeer);assert.equal(routerRequests.length,clearedRouter);
  await page.locator('#use-byok').uncheck();const deniedBefore=peerRequests.length;await page.getByRole('button',{name:'Run consented peer composition'}).click();await page.waitForFunction(()=>document.querySelector('#consent-dialog').open&&document.querySelector('#consent-purpose').textContent.includes('exact published peer network'));await page.getByRole('button',{name:'Deny',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#peer-network-result').textContent.includes('Peer contact was denied before'));assert.equal(peerRequests.length,deniedBefore);

  const actionCatalog=await page.locator('#review-action-catalog').textContent();assert.match(actionCatalog,/save-review-card/);assert.match(actionCatalog,/export-receipt/);assert.match(actionCatalog,/"effect": "write"/);
  await page.getByRole('button',{name:'Preview synthetic review card'}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('#review-list li').count(),0);assert.match(await page.locator('#review-status').innerText(),/No local action was executed/);
  await page.getByRole('button',{name:'Preview synthetic review card'}).click();await page.getByRole('button',{name:'Confirm local save'}).click();await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===1);assert.match(await page.locator('#review-status').innerText(),/saved in this browser/);
  await page.getByRole('button',{name:'Preview receipt export'}).click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Confirm receipt download'}).click();const download=await downloadPromise;assert.match(download.suggestedFilename(),/^sutra-.*\.json$/);await page.waitForFunction(()=>document.querySelector('#review-status').textContent.includes('Receipt exported as'));assert.equal(await page.locator('#review-list li').count(),1);
  await page.reload();assert.equal(await page.locator('#review-list li').count(),1);assert.match(await page.locator('#byok-status').innerText(),/not configured/);assert.equal(await page.evaluate(key=>JSON.stringify(localStorage).includes(key),keyCanary),false);await page.getByRole('button',{name:'Delete local review'}).click();

  await page.getByRole('button',{name:'Read current playback state',exact:true}).click();assert.equal(JSON.parse(await page.locator('#playback-state').innerText()).available,false);
  await page.getByRole('button',{name:'Load synthetic timing fixture'}).click();await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Actual media duration: 8.0 seconds.'));
  const media=page.locator('video');assert.equal(await media.count(),1);await page.getByRole('button',{name:'Inspect timing cue at 00:02'}).click();await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Synthetic cue reached.'));assert.ok(Math.abs(await media.evaluate(video=>video.currentTime)-2)<=1);
  await media.evaluate(video=>video.play());await page.waitForFunction(()=>document.querySelector('video').currentTime>2.15);await media.evaluate(video=>video.pause());assert.equal(await media.evaluate(video=>video.paused),true);

  // Cancel a deliberately stalled peer manifest request and prove ordinary native media still works.
  let manifestSeenResolve,releaseManifest;
  const manifestSeen=new Promise(resolve=>{manifestSeenResolve=resolve;});
  const manifestRelease=new Promise(resolve=>{releaseManifest=resolve;});
  await page.route(peerBase+'/agents/agent-manifest.json',async route=>{manifestSeenResolve();await manifestRelease;try{await route.abort();}catch{}});
  await page.locator('#peer-url').fill(peerBase+'/agents/checklist');
  const mediaBeforeCancel=await media.evaluate(video=>video.currentTime);
  await page.getByRole('button',{name:'Run consented peer composition'}).click();
  await page.waitForFunction(()=>document.querySelector('#consent-dialog').open&&document.querySelector('#consent-purpose').textContent.includes('exact published peer network'));
  assert.equal(await page.locator('#peer-run-lifecycle').getAttribute('data-state'),'running');
  await page.getByRole('button',{name:'Allow once',exact:true}).click();await manifestSeen;
  await page.getByRole('button',{name:'Cancel current run'}).click();
  const cancelState=await page.locator('#peer-run-lifecycle').getAttribute('data-state');assert.ok(['cancelling','failed'].includes(cancelState));
  assert.match(await page.locator('#peer-run-lifecycle').innerText(),/incomplete|Cancelled/i);
  releaseManifest();
  await page.waitForFunction(()=>document.querySelector('#peer-run-lifecycle').dataset.state==='failed');
  assert.match(await page.locator('#peer-network-result').innerText(),/cancelled.*incomplete/i);
  assert.match(await page.locator('#prov-errors').innerText(),/CANCELLED/);
  assert.equal(await page.getByRole('button',{name:'Run consented peer composition'}).isEnabled(),true);
  assert.equal(await page.getByRole('button',{name:'Cancel current run'}).isDisabled(),true);
  await page.unroute(peerBase+'/agents/agent-manifest.json');
  await media.evaluate(video=>video.play());await page.waitForFunction(before=>document.querySelector('video').currentTime>before+.08,mediaBeforeCancel);await media.evaluate(video=>video.pause());
  assert.equal(await media.evaluate(video=>video.paused),true);
  assert.ok(await media.evaluate(video=>video.currentTime)>mediaBeforeCancel,'media clock must continue after run cancellation');

  fs.mkdirSync(path.join(app,'test-output'),{recursive:true});await page.screenshot({path:path.join(app,'test-output/desktop.png'),fullPage:true});
  await page.setViewportSize({width:360,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.getByRole('button',{name:'Try altered quotation'}).click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('QUOTE_MISMATCH'));await page.screenshot({path:path.join(app,'test-output/mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.ok(!requests.some(url=>url.includes('/assets/mux-video-')),'native fixture must not load optional Mux chunk');
  console.log('PASS: W3C annotation + transcript SHA-256, truth boundary, explicit peer lifecycle/cancellation, local/source orchestration, consented two-origin peer execution, BYOK key only to router and never peer/storage/provenance, memory deletion, native timing playback after cancellation, 360px layout, no unexpected external requests.');
 }finally{if(browser)await browser.close();server.kill();peerServer.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
