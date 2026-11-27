// Real Playwright desktop engines. No physical hardware or public services.
const {chromium,firefox,webkit}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const app=path.resolve(__dirname,'..');
const fixture=JSON.parse(fs.readFileSync(path.join(app,'src/fixtures/timing-source.json')));
const key='sutra.review-cards.v2';
const engine=process.env.SUTRA_BROWSER_ENGINE||'chromium';
const engines={chromium,firefox,webkit};
(async()=>{
 if(!engines[engine])throw Error('Unknown engine');
 const port=await new Promise((resolve,reject)=>{const p=net.createServer();p.once('error',reject);p.listen(0,'127.0.0.1',()=>{const n=p.address().port;p.close(e=>e?reject(e):resolve(n));});});
 const origin='http://127.0.0.1:'+port;
 const server=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:app,stdio:'pipe'});
 let browser,context;let report={engine,version:null,profile:'desktop-engine-headless',viewport:'1280x800 and 360x800',sourceRevision:process.env.SUTRA_SOURCE_REVISION||'local-unrecorded',mediaHash:fixture.source.mediaHash,physicalTouch:'untested',screenReader:'untested',results:{}};const errors=[],external=[];
 const step=async(name,fn)=>{try{const detail=await fn();report.results[name]={state:'pass',detail:detail??null};}catch(error){report.results[name]={state:'fail',detail:String(error.message).slice(0,350)};}};
 try{
  let ready=false;for(let n=0;n<70;n++){try{if((await fetch(origin,{signal:AbortSignal.timeout(500)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}assert.ok(ready,'preview server ready');
  browser=await engines[engine].launch({headless:true});report.version=browser.version();
  context=await browser.newContext({viewport:{width:1280,height:800},acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin+'/')&&!r.url().startsWith('blob:'+origin+'/'))external.push(r.url());});
  await page.goto(origin);
  const button=name=>page.getByRole('button',{name,exact:true});
  await step('public_runtime',async()=>{
   const result=await page.evaluate(async()=>{
    const runtime=await import('/runtime/sutra-runtime.js');
    const response=await fetch('/agents/learner.network.json',{credentials:'omit',cache:'no-store'});if(!response.ok)throw Error('runtime graph unavailable');
    const definition=await response.json(),compiled=runtime.compileNetwork(definition,{name:'learner',frontMan:'learner'});
    let writes=0,ids=0;
    const registry=runtime.createLocalActionRegistry([{name:'save-fixture',effect:'write_local',destination:'Test memory only',description:'Save reviewed fixture',validate:args=>args.value==='approved',execute:args=>{writes++;return args.value;}}],{idFactory:()=> 'matrix-'+(++ids)});
    const denied=registry.prepare('save-fixture',{value:'approved'});registry.cancel(denied.id);
    let cancelled=false,replay=false;
    try{await registry.execute(denied.id);}catch(e){cancelled=e.code==='PROPOSAL_MISSING';}
    const approved=registry.prepare('save-fixture',{value:'approved'});const value=await registry.execute(approved.id);
    try{await registry.execute(approved.id);}catch(e){replay=e.code==='PROPOSAL_MISSING';}
    return {name:compiled.name,frontMan:compiled.frontMan,profile:runtime.sutraRuntimeProfile,runType:typeof runtime.runNetwork,peerType:typeof runtime.loadPeerNetwork,actions:{writes,value,cancelled,replay,pending:registry.pendingCount(),metadata:registry.list()}};
   });
   assert.equal(result.name,'learner');assert.equal(result.frontMan,'learner');assert.equal(result.profile.execution,'browser');assert.equal(result.profile.byok,false);assert.equal(result.runType,'function');assert.equal(result.peerType,'function');
   assert.deepEqual(result.actions,{writes:1,value:'approved',cancelled:true,replay:true,pending:0,metadata:[{name:'save-fixture',effect:'write_local',destination:'Test memory only',description:'Save reviewed fixture'}]});
   return 'Stable /runtime/sutra-runtime.js compiled the graph and exercised host-only registry cancel/confirm/replay refusal in '+engine;
  });
  await step('evidence',async()=>{await button('Check example').click();assert.equal(await page.locator('#result').getAttribute('data-state'),'matched');await button('Try altered quotation').click();assert.notEqual(await page.locator('#result').getAttribute('data-state'),'matched');});
  await step('graph',async()=>{await button('Run scripted network test').click();await page.waitForFunction(()=>document.querySelector('#network-result').dataset.state==='completed');assert.match(await page.locator('#network-result').textContent(),/No live AI|scripted/i);});
  await step('consent_denial',async()=>{await button('Preview synthetic peer contact').click();await button('Deny').click();await page.waitForFunction(()=>document.querySelector('#consent-status').dataset.state==='denied');assert.equal(external.length,0);});
  await step('review_save_export_delete',async()=>{await button('Preview source review card').click();await button('Cancel').click();assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);await button('Preview source review card').click();await button('Confirm local save').click();await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===1);const downloaded=page.waitForEvent('download');await button('Download saved receipt').click();const file=await downloaded;const receipt=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(receipt.truthStatus,'unverified');assert.deepEqual(receipt.receipt,fixture.receipt);await button('Delete local review').click();await page.waitForFunction(()=>document.querySelectorAll('#review-list li').length===0);assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);});
  await step('narrow_keyboard',async()=>{await page.setViewportSize({width:360,height:800});await button('Check example').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#result').getAttribute('data-state'),'matched');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.setViewportSize({width:1280,height:800});});
  report.codec=await page.evaluate(()=>{const v=document.createElement('video');return {h264:v.canPlayType('video/mp4; codecs="avc1.42E01E"'),mp4:v.canPlayType('video/mp4'),fullscreen:document.fullscreenEnabled===true};});
  await step('decode',async()=>{await button('Load source media').click();await page.waitForFunction(()=>['completed','error'].includes(document.querySelector('#timing-status').dataset.state),null,{timeout:16000});assert.equal(await page.locator('#timing-status').getAttribute('data-state'),'completed',await page.locator('#timing-status').textContent());const v=page.locator('video');assert.equal(await v.count(),1);assert.ok(Math.abs(await v.evaluate(x=>x.duration)-8)<.1);return 'Native 8-second media metadata observed';});
  if(report.results.decode.state==='pass'){
   await step('seek_play',async()=>{await button('Inspect featured source cue').click();await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Source cue reached'));const v=page.locator('video');assert.ok(Math.abs(await v.evaluate(x=>x.currentTime)-2)<=1);await page.locator('media-play-button').click();await page.waitForFunction(()=>!document.querySelector('video').paused&&document.querySelector('video').currentTime>2.1);await page.locator('media-play-button').click();await page.waitForFunction(()=>document.querySelector('video').paused);});
   await step('captions',async()=>{await page.locator('media-captions-button').click();await page.waitForFunction(()=>Array.from(document.querySelector('video').textTracks).some(t=>t.kind==='captions'&&t.mode==='showing'&&t.cues?.length>0));});
   if(report.codec.fullscreen)await step('fullscreen',async()=>{await page.locator('media-fullscreen-button').click();await page.waitForFunction(()=>document.fullscreenElement!==null);await page.locator('media-fullscreen-button').click();await page.waitForFunction(()=>document.fullscreenElement===null);});else report.results.fullscreen={state:'untested',detail:'Engine reports fullscreen unavailable in headless profile'};
  }else{for(const n of ['seek_play','captions','fullscreen'])report.results[n]={state:'untested',detail:'Native decode did not pass'};await step('decode_failure_recovery',async()=>{assert.equal(await page.locator('#seek-timing').isHidden(),true);await button('Check example').click();assert.equal(await page.locator('#result').getAttribute('data-state'),'matched');assert.equal(await page.getByRole('searchbox',{name:'Search source transcript'}).count(),1);});}
  await step('no_external_or_page_error',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
 }catch(error){report.results.harness={state:'fail',detail:String(error.message).slice(0,350)};}
 finally{await browser?.close().catch(()=>{});server.kill('SIGTERM');const dir=path.join(app,'test-output');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'browser-matrix-'+engine+'.json'),JSON.stringify(report,null,2)+'\n');console.log('BROWSER_MATRIX '+JSON.stringify(report));}
 if(Object.values(report.results).some(x=>x.state==='fail'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
