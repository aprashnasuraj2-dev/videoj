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
  await page.waitForFunction(()=>document.querySelector('#transcript-status').textContent.includes('3 of 3 synthetic transcript cues shown.'));
  assert.match(await page.locator('#transcript-meta').innerText(),/source v1 · transcript timing-transcript-v1/);assert.match(await page.locator('#transcript-meta').innerText(),/not a translation/);assert.equal(await page.locator('#transcript-results button').count(),3);assert.equal(await page.locator('#transcript-results button:enabled').count(),0);
  await page.locator('#transcript-search').fill('marker');assert.equal(await page.locator('#transcript-results button').count(),1);assert.match(await page.locator('#transcript-results').innerText(),/Synthetic timing marker/);
  await page.locator('#transcript-search').fill('does-not-exist');await page.waitForFunction(()=>document.querySelector('#transcript-status').textContent.includes('No transcript matches'));assert.equal(await page.locator('#transcript-results button').count(),0);
  await page.locator('#transcript-search').fill('');await page.waitForFunction(()=>document.querySelectorAll('#transcript-results button').length===3);
  await page.waitForFunction(()=>document.querySelector('#transcript-integrity').textContent.includes('transcript v3 ✓ matches manifest'));
  assert.match(await page.locator('#transcript-integrity').innerText(),/Hash proves bytes, not truth/);
  await page.getByRole('button',{name:'Verify transcript evidence',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Annotation, transcript SHA-256'));
  assert.match(await page.locator('#result').innerText(),/Factual truth has not been checked/);assert.match(await page.locator('#cue-href').innerText(),/#t=12,18$/);
  await page.getByRole('button',{name:'Try altered quotation'}).click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('QUOTE_MISMATCH'));
  await page.locator('#cue').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Annotation, transcript SHA-256'));assert.equal(await page.locator('#cue').getAttribute('aria-pressed'),'true');

  assert.equal(await page.locator('.runtime-disclosure').getAttribute('open'),null);await page.locator('.runtime-disclosure>summary').click();assert.equal(await page.locator('.runtime-disclosure').getAttribute('open'),'');
  await page.getByRole('button',{name:'Run scripted network test'}).click();await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('2 agent invocations; 3 scripted model steps.'));assert.equal(await page.locator('#network-trace li').count(),2);assert.match(await page.locator('#network-result').innerText(),/No live AI/);
  await page.locator('.provenance summary').click();assert.equal(await page.locator('#prov-spec').innerText(),'a0ceda34e4f2e653223e13e63282abc9b60eaf7c');assert.equal(await page.locator('#prov-runtime').innerText(),'486ecf26aa8775963f9b765f894734bef1ac9817');assert.match(await page.locator('#prov-status').innerText(),/local_scripted \/ complete/);assert.match(await page.locator('#prov-graph').innerText(),/^sha256-/);assert.match(await page.locator('#prov-agents').innerText(),/learner/);assert.match(await page.locator('#prov-calls').innerText(),/2 agent \/ 3 model \/ 0 remote/);assert.match(await page.locator('#prov-budget').innerText(),/maxAgents 12/);
  await page.getByRole('button',{name:'Run scripted source retrieval',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#source-network-result').textContent.includes('5 scripted model steps; two source reads.'));assert.match(await page.locator('#source-network-result').innerText(),/Synthetic timing marker/);
  await page.route('**/api/source-tools',route=>route.abort());await page.getByRole('button',{name:'Run scripted source retrieval',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#source-network-result').textContent.includes('No completed source result is claimed.'));await page.unroute('**/api/source-tools');

  const invalidGraph=JSON.parse(fs.readFileSync(path.join(app,'public/agents/learner.network.json')));invalidGraph.tools[1].tools=['learner'];
  await page.route('**/agents/learner.network.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(invalidGraph)}));await page.getByRole('button',{name:'Run scripted network test'}).click();await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('(CYCLE)'));assert.equal(await page.locator('#network-trace li').count(),0);await page.unroute('**/agents/learner.network.json');

  await page.getByRole('button',{name:'Preview synthetic peer contact'}).click();await page.getByRole('dialog',{name:'External contact request'}).waitFor();assert.match(await page.locator('#consent-origin').innerText(),/peer\.invalid/);const externalBeforeDeny=external.length;await page.getByRole('button',{name:'Deny',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#consent-status').textContent.includes('denied before'));assert.equal(external.length,externalBeforeDeny);
  await page.getByRole('button',{name:'Preview synthetic peer contact'}).click();await page.getByRole('button',{name:'Allow for this session'}).click();await page.waitForFunction(()=>document.querySelector('#consent-status').textContent.includes('Simulated operations: 1'));await page.getByRole('button',{name:'Preview synthetic peer contact'}).click();await page.waitForFunction(()=>document.querySelector('#consent-status').textContent.includes('Simulated operations: 2'));assert.match(await page.locator('#consent-events').textContent(),/remembered/);

  assert.equal(await page.locator('#comparison-status').getAttribute('data-state'),'missing');assert.match(await page.locator('#local-source-card').innerText(),/synthetic-timing-fixture \/ v1/);assert.match(await page.locator('#local-source-card').innerText(),/2–4 seconds/);
  await page.locator('#comparison-peer-url').fill(peerBase+'/agents/checklist');const comparisonBeforeDeny=peerRequests.length;await page.getByRole('button',{name:'Load written peer guide'}).click();await page.waitForFunction(()=>document.querySelector('#consent-dialog').open&&document.querySelector('#consent-purpose').textContent.includes('peer written evidence'));await page.getByRole('button',{name:'Deny',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#comparison-status').dataset.state==='denied');assert.equal(peerRequests.length,comparisonBeforeDeny);assert.match(await page.locator('#local-source-card').innerText(),/2–4 seconds/);
  await page.getByRole('button',{name:'Load written peer guide'}).click();await page.waitForFunction(()=>document.querySelector('#consent-dialog').open&&document.querySelector('#consent-purpose').textContent.includes('peer written evidence'));await page.getByRole('button',{name:'Allow once',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#comparison-status').dataset.state==='conflict_unresolved');assert.equal(peerRequests.length,comparisonBeforeDeny+1);assert.match(peerRequests.at(-1).url,/\/agents\/checklist\.evidence\.json$/);assert.equal(peerRequests.at(-1).headers.authorization,undefined);assert.equal(peerRequests.at(-1).headers.cookie,undefined);
  assert.match(await page.locator('#peer-source-card').innerText(),/synthetic-written-checklist \/ v1/);assert.match(await page.locator('#peer-source-card').innerText(),/5–7 seconds/);assert.match(await page.locator('#comparison-status').innerText(),/conflict_unresolved/);assert.match(await page.locator('#comparison-status').innerText(),/Factual truth is not verified/);assert.match(await page.locator('#local-source-link').getAttribute('href'),/#t=2,4$/);assert.match(await page.locator('#peer-source-link').getAttribute('href'),/checklist\.evidence\.json#timing-marker-window$/);
  await page.getByRole('button',{name:/Mark comparison reviewed/}).click();assert.equal(await page.locator('#comparison-status').getAttribute('data-state'),'conflict_unresolved');assert.match(await page.locator('#comparison-status').innerText(),/Review: reviewed/);assert.match(await page.locator('#peer-card-summary').innerText(),/source status remains conflict_unresolved/);

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
  assert.equal(await page.locator('#prov-model').innerText(),'openrouter/free');assert.match(await page.locator('#prov-router').innerText(),/OpenRouter/);assert.match(await page.locator('#prov-status').innerText(),/peer_composition \/ complete/);assert.match(await page.locator('#prov-graph').innerText(),/^sha256-/);const origins=await page.locator('#prov-origins').innerText();assert.match(origins,/openrouter\.ai/);assert.match(origins,/127\.0\.0\.1:4195/);assert.match(await page.locator('#prov-agents').innerText(),/learner/);assert.match(await page.locator('#prov-calls').innerText(),/3 agent \/ 5 model \/ 1 remote/);assert.match(await page.locator('#prov-budget').innerText(),/maxRemoteCalls 2/);assert.match(await page.locator('#prov-consent').innerText(),/peer_manifest:allow\/once@http:\/\/127\.0\.0\.1:4195/);assert.ok(!(await page.locator('.provenance').innerText()).includes(keyCanary));
  const provDownloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download redacted provenance JSON'}).click();const provDownload=await provDownloadPromise;assert.equal(provDownload.suggestedFilename(),'sutra-run-provenance.json');const provPath=await provDownload.path();const provText=fs.readFileSync(provPath,'utf8');const provJson=JSON.parse(provText);assert.equal(provJson.version,1);assert.ok(provJson.runs.length>=2&&provJson.runs.length<=12);const exportedRun=provJson.runs.at(-1);assert.equal(exportedRun.specCommit,'a0ceda34e4f2e653223e13e63282abc9b60eaf7c');assert.equal(exportedRun.runtimeSha,'486ecf26aa8775963f9b765f894734bef1ac9817');assert.equal(exportedRun.modelId,'openrouter/free');assert.equal(exportedRun.router,'OpenRouter (browser BYOK)');assert.ok(exportedRun.origins.includes('https://openrouter.ai'));assert.ok(!provText.includes(keyCanary));assert.ok(!provText.includes('This is a routed BYOK browser fixture.'));assert.match(await page.locator('#prov-export-status').innerText(),/downloaded/);
  assert.equal(await page.evaluate(key=>JSON.stringify(localStorage).includes(key),keyCanary),false);

  await page.getByRole('button',{name:'Clear key'}).click();assert.match(await page.locator('#byok-status').innerText(),/cleared from memory/);const clearedPeer=peerRequests.length,clearedRouter=routerRequests.length;await page.getByRole('button',{name:'Run consented peer composition'}).click();await page.waitForFunction(()=>document.querySelector('#peer-network-result').textContent.includes('(BYOK_SETUP)'));assert.equal(peerRequests.length,clearedPeer);assert.equal(routerRequests.length,clearedRouter);
  await page.locator('#use-byok').uncheck();const deniedBefore=peerRequests.length;await page.getByRole('button',{name:'Run consented peer composition'}).click();await page.waitForFunction(()=>document.querySelector('#consent-dialog').open&&document.querySelector('#consent-purpose').textContent.includes('exact published peer network'));await page.getByRole('button',{name:'Deny',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#peer-network-result').textContent.includes('Peer contact was denied before'));assert.equal(peerRequests.length,deniedBefore);

  const actionCatalog=await page.locator('#review-action-catalog').textContent();assert.match(actionCatalog,/save-review-card/);assert.match(actionCatalog,/export-receipt/);assert.match(actionCatalog,/"effect": "write"/);
  await page.getByRole('button',{name:'Preview synthetic review card'}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('#review-list li').count(),0);assert.match(await page.locator('#review-status').innerText(),/No local action was executed/);
  await page.getByRole('button',{name:'Preview synthetic review card'}).click();await page.getByRole('button',{name:'Confirm local save'}).click();await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===1);assert.match(await page.locator('#review-status').innerText(),/saved in this browser/);
  await page.getByRole('button',{name:'Preview receipt export'}).click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Confirm receipt download'}).click();const download=await downloadPromise;assert.match(download.suggestedFilename(),/^sutra-.*\.json$/);await page.waitForFunction(()=>document.querySelector('#review-status').textContent.includes('Receipt exported as'));assert.equal(await page.locator('#review-list li').count(),1);assert.match(await page.locator('#prov-actions').innerText(),/succeeded .*export-receipt/);
  await page.reload();assert.equal(await page.locator('#review-list li').count(),1);assert.equal(await page.locator('.runtime-disclosure').getAttribute('open'),null);await page.locator('.runtime-disclosure>summary').click();assert.match(await page.locator('#byok-status').innerText(),/not configured/);assert.equal(await page.evaluate(key=>JSON.stringify(localStorage).includes(key),keyCanary),false);await page.getByRole('button',{name:'Delete local review'}).click();
  await page.waitForFunction(()=>document.querySelector('#transcript-status').textContent.includes('3 of 3 synthetic transcript cues shown.'));

  await page.getByRole('button',{name:'Read current playback state',exact:true}).click();assert.equal(JSON.parse(await page.locator('#playback-state').innerText()).available,false);
  await page.getByRole('button',{name:'Load synthetic timing fixture'}).click();await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Actual media duration: 8.0 seconds.'));
  const media=page.locator('video');assert.equal(await media.count(),1);const player=page.locator('video-player');assert.equal(await player.count(),1);
  await page.waitForFunction(()=>document.querySelectorAll('#transcript-results button:enabled').length===3);
  const transcriptButtons=page.locator('#transcript-results button');await transcriptButtons.nth(0).focus();await page.keyboard.press('ArrowDown');assert.equal(await transcriptButtons.nth(1).evaluate(el=>document.activeElement===el),true);await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#transcript-status').textContent.includes('Reached timing-marker'));assert.ok(Math.abs(await media.evaluate(video=>video.currentTime)-2)<=1);assert.equal(await transcriptButtons.nth(1).getAttribute('aria-current'),'true');
  await page.locator('#transcript-search').focus();await page.evaluate(()=>{window.__sutraScrollCalls=0;window.__sutraOldScrollIntoView=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(){window.__sutraScrollCalls++;};document.querySelector('video').currentTime=4.5;});await page.waitForFunction(()=>document.querySelector('button[data-cue-id="timing-end"]')?.hasAttribute('aria-current'));assert.equal(await page.locator('#transcript-search').evaluate(el=>document.activeElement===el),true);assert.equal(await page.evaluate(()=>window.__sutraScrollCalls),0);await page.evaluate(()=>{Element.prototype.scrollIntoView=window.__sutraOldScrollIntoView;delete window.__sutraOldScrollIntoView;delete window.__sutraScrollCalls;});
  const playControl=player.locator('media-play-button'),muteControl=player.locator('media-mute-button'),volumeControl=player.locator('media-volume-slider'),captionsControl=player.locator('media-captions-button'),fullscreenControl=player.locator('media-fullscreen-button');
  for(const control of [playControl,muteControl,volumeControl,captionsControl,fullscreenControl])assert.equal(await control.count(),1);
  await playControl.click();await page.waitForFunction(()=>document.querySelector('video')?.paused===false);await playControl.click();await page.waitForFunction(()=>document.querySelector('video')?.paused===true);
  const initialMuted=await media.evaluate(video=>video.muted);await muteControl.click();await page.waitForFunction(before=>document.querySelector('video')?.muted!==before,initialMuted);await muteControl.click();await page.waitForFunction(before=>document.querySelector('video')?.muted===before,initialMuted);
  const volumeBefore=await media.evaluate(video=>video.volume);await volumeControl.focus();await page.keyboard.press('ArrowDown');await page.waitForFunction(before=>document.querySelector('video')?.volume<before,volumeBefore);
  await captionsControl.click();await page.waitForFunction(()=>Array.from(document.querySelector('video')?.textTracks||[]).some(track=>(track.kind==='captions'||track.kind==='subtitles')&&track.mode==='showing'));await captionsControl.click();await page.waitForFunction(()=>Array.from(document.querySelector('video')?.textTracks||[]).filter(track=>track.kind==='captions'||track.kind==='subtitles').every(track=>track.mode!=='showing'));
  await page.evaluate(()=>{
   const state={active:null,enter:0,exit:0,request:Element.prototype.requestFullscreen,exitFn:document.exitFullscreen};
   window.__sutraFullscreenTest=state;
   Element.prototype.requestFullscreen=async function(){state.active=this;state.enter++;document.dispatchEvent(new Event('fullscreenchange'));};
   document.exitFullscreen=async function(){state.active=null;state.exit++;document.dispatchEvent(new Event('fullscreenchange'));};
   Object.defineProperty(document,'fullscreenElement',{configurable:true,get(){return state.active;}});
  });
  await fullscreenControl.click();await page.waitForFunction(()=>window.__sutraFullscreenTest?.enter===1);await fullscreenControl.click();await page.waitForFunction(()=>window.__sutraFullscreenTest?.exit===1);
  await page.evaluate(()=>{const state=window.__sutraFullscreenTest;Element.prototype.requestFullscreen=state.request;document.exitFullscreen=state.exitFn;delete document.fullscreenElement;delete window.__sutraFullscreenTest;});
  const replacementUrl=base+'/media/timing-fixture.mp4?replacement=1';await media.evaluate((video,url)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('replacement metadata timeout')),5000);video.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve();},{once:true});video.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('replacement source failed'));},{once:true});video.src=url;video.load();}),replacementUrl);assert.ok(Math.abs(await media.evaluate(video=>video.duration)-8)<.1);assert.equal(await playControl.count(),1);
  const evidenceSeek=page.getByRole('button',{name:'Inspect timing cue at 00:02'});await evidenceSeek.focus();assert.equal(await evidenceSeek.evaluate(el=>document.activeElement===el),true);await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Synthetic cue reached.'));assert.ok(Math.abs(await media.evaluate(video=>video.currentTime)-2)<=1);
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
  assert.match(await page.locator('#prov-errors').textContent(),/CANCELLED/);assert.match(await page.locator('#prov-status').textContent(),/peer_composition \/ cancelled/);
  assert.equal(await page.getByRole('button',{name:'Run consented peer composition'}).isEnabled(),true);
  assert.equal(await page.getByRole('button',{name:'Cancel current run'}).isDisabled(),true);
  await page.unroute(peerBase+'/agents/agent-manifest.json');
  await media.evaluate(video=>video.play());await page.waitForFunction(before=>document.querySelector('video').currentTime>before+.08,mediaBeforeCancel);await media.evaluate(video=>video.pause());
  assert.equal(await media.evaluate(video=>video.paused),true);
  assert.ok(await media.evaluate(video=>video.currentTime)>mediaBeforeCancel,'media clock must continue after run cancellation');

  // The optional inspector may disappear/fail without owning evidence or playback.
  await page.locator('.provenance').evaluate(node=>node.remove());await page.getByRole('button',{name:'Verify transcript evidence',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Annotation, transcript SHA-256'));const afterInspectorRemoval=await media.evaluate(video=>video.currentTime);await media.evaluate(video=>video.play());await page.waitForFunction(before=>document.querySelector('video').currentTime>before+.08,afterInspectorRemoval);await media.evaluate(video=>video.pause());assert.ok(await media.evaluate(video=>video.currentTime)>afterInspectorRemoval);

  fs.mkdirSync(path.join(app,'test-output'),{recursive:true});await page.screenshot({path:path.join(app,'test-output/desktop.png'),fullPage:true});
  await page.setViewportSize({width:360,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for(const selector of ['media-play-button','media-mute-button','media-captions-button','media-fullscreen-button']){const control=player.locator(selector);const box=await control.boundingBox();assert.ok(box&&box.x>=-1&&box.x+box.width<=361,selector+' must remain inside 360px viewport');await control.focus();assert.equal(await control.evaluate(el=>document.activeElement===el),true,selector+' must remain keyboard focusable');}
  await page.getByRole('button',{name:'Try altered quotation'}).click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('QUOTE_MISMATCH'));await page.screenshot({path:path.join(app,'test-output/mobile.png'),fullPage:true});
  const mediaError=await media.evaluate(video=>new Promise(resolve=>{const bytes=new Uint8Array([0,1,2,3,4,5]),url=URL.createObjectURL(new Blob([bytes],{type:'video/mp4'})),done=value=>{URL.revokeObjectURL(url);resolve(value);};video.addEventListener('error',()=>done(Boolean(video.error)),{once:true});video.src=url;video.load();setTimeout(()=>done(false),5000);}));assert.equal(mediaError,true);assert.equal(await page.locator('.dhago-retry').isVisible(),true);
  await evidenceSeek.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('load or decode error state'));assert.match(await page.locator('#timing-status').innerText(),/No seek success is claimed/);

  const missingTranscript=await browser.newPage({viewport:{width:800,height:700}});await missingTranscript.route('**/media/timing-transcript.vtt',route=>route.abort());await missingTranscript.goto(base);await missingTranscript.waitForFunction(()=>document.querySelector('#transcript-status').textContent.includes('Timing transcript unavailable'));assert.equal(await missingTranscript.locator('#transcript-results button').count(),0);await missingTranscript.waitForFunction(()=>document.querySelector('#transcript-integrity').textContent.includes('transcript v3 ✓ matches manifest'));await missingTranscript.close();
  const missingCaptions=await browser.newPage({viewport:{width:800,height:700}});await missingCaptions.route('**/media/timing-captions.vtt',route=>route.abort());await missingCaptions.goto(base);await missingCaptions.waitForFunction(()=>document.querySelector('#transcript-status').textContent.includes('3 of 3'));await missingCaptions.getByRole('button',{name:'Load synthetic timing fixture'}).click();await missingCaptions.waitForFunction(()=>document.querySelector('#caption-state').textContent.includes('Captions unavailable'));assert.equal(await missingCaptions.locator('#transcript-results button').count(),3);await missingCaptions.close();

  const freshViewer=await browser.newPage({viewport:{width:1100,height:820}}),freshErrors=[];freshViewer.on('pageerror',error=>freshErrors.push(error.message));
  let seenMediaResolve,releaseMedia;const seenMedia=new Promise(resolve=>{seenMediaResolve=resolve;}),mediaGate=new Promise(resolve=>{releaseMedia=resolve;});
  await freshViewer.route('**/media/timing-fixture.mp4',async route=>{seenMediaResolve();await mediaGate;const response=await route.fetch();await route.fulfill({response});});
  await freshViewer.goto(base);await freshViewer.getByRole('heading',{name:/trace the 00:02 timing marker/i}).waitFor();assert.equal(await freshViewer.locator('.runtime-disclosure').getAttribute('open'),null);assert.equal(await freshViewer.locator('#journey-state').getAttribute('data-state'),'empty');assert.match(await freshViewer.locator('#next-human-action').innerText(),/Load the synthetic timing fixture/);assert.match(await freshViewer.locator('.active-context').innerText(),/synthetic-timing-fixture.*v1/s);assert.match(await freshViewer.locator('.active-context').innerText(),/timing-transcript-v1/);
  await freshViewer.getByRole('button',{name:'Load synthetic timing fixture'}).click();await seenMedia;assert.equal(await freshViewer.locator('#journey-state').getAttribute('data-state'),'loading');releaseMedia();await freshViewer.waitForFunction(()=>document.querySelector('#journey-state').dataset.state==='ready');assert.match(await freshViewer.locator('#next-human-action').innerText(),/00:02 cue/);
  await freshViewer.getByRole('button',{name:'Preview synthetic peer contact'}).click();await freshViewer.getByRole('button',{name:'Deny',exact:true}).click();await freshViewer.waitForFunction(()=>document.querySelector('#journey-state').dataset.state==='denied');assert.match(await freshViewer.locator('#journey-state').innerText(),/local lesson, transcript and evidence remain available/);
  await freshViewer.getByRole('button',{name:'Verify transcript evidence',exact:true}).click();await freshViewer.waitForFunction(()=>document.querySelector('#journey-state').dataset.state==='ready');assert.match(await freshViewer.locator('#next-human-action').innerText(),/Preview the review card/);
  const freshMarker=freshViewer.locator('button[data-cue-id="timing-marker"]');await freshMarker.focus();await freshViewer.keyboard.press('Enter');await freshViewer.waitForFunction(()=>document.querySelector('#transcript-status').textContent.includes('Reached timing-marker'));
  await freshViewer.getByRole('button',{name:'Preview synthetic review card'}).click();await freshViewer.getByRole('button',{name:'Confirm local save'}).click();await freshViewer.waitForFunction(()=>document.querySelector('#journey-state').dataset.state==='completed');assert.equal(await freshViewer.locator('.runtime-disclosure').getAttribute('open'),null);assert.equal(await freshViewer.locator('#review-list li').count(),1);await freshViewer.getByRole('button',{name:'Delete local review'}).click();assert.deepEqual(freshErrors,[]);await freshViewer.close();

  const errorViewer=await browser.newPage({viewport:{width:800,height:700}});await errorViewer.route('**/media/timing-fixture.mp4',route=>route.abort());await errorViewer.goto(base);await errorViewer.getByRole('button',{name:'Load synthetic timing fixture'}).click();await errorViewer.waitForFunction(()=>document.querySelector('#journey-state').dataset.state==='error');assert.match(await errorViewer.locator('#journey-state').innerText(),/no playback result is claimed/i);assert.match(await errorViewer.locator('#next-human-action').innerText(),/transcript\/evidence inspection|retry/i);await errorViewer.close();
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.ok(!requests.some(url=>url.includes('/assets/mux-video-')),'native fixture must not load optional Mux chunk');
  console.log('PASS: W3C annotation + transcript SHA-256, truth boundary, explicit peer lifecycle/cancellation, local/source orchestration, consented two-origin peer execution, BYOK key only to router and never peer/storage/provenance, memory deletion, native timing playback after cancellation, 360px layout, no unexpected external requests.');
 }finally{if(browser)await browser.close();server.kill();peerServer.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
