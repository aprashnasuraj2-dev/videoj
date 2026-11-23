// Real Chromium, two independent loopback origins; no public deployment or third-party service.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');

(async()=>{
 const root=path.resolve(__dirname,'../../..');
 const learner='http://127.0.0.1:4186',peer='http://127.0.0.1:4185';
 const processes=[],logs=[];
 function start(cwd,command,args,env={}){
  const child=spawn(command,args,{cwd,env:{...process.env,...env},stdio:'pipe'});
  let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output=(output+chunk.toString()).slice(-6000);});
  child.on('exit',()=>logs.push({cwd,code:child.exitCode,output}));
  processes.push(child);return child;
 }
 async function ready(url){
  for(let attempt=0;attempt<80;attempt++){
   try{const response=await fetch(url,{signal:AbortSignal.timeout(500)});if(response.ok)return;}catch{}
   await new Promise(resolve=>setTimeout(resolve,150));
  }
  throw Error('Test preview did not start: '+JSON.stringify(logs));
 }
 start(path.join(root,'apps/sutra-peer'),process.execPath,[path.join(root,'apps/sutra-peer/scripts/serve.mjs')],{PORT:'4185'});
 start(path.join(root,'apps/sutra'),process.execPath,[path.join(root,'apps/sutra/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4186','--strictPort']);
 let browser;
 try{
  await Promise.all([ready(learner),ready(peer)]);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const pageErrors=[],peerRequests=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('request',request=>{if(request.url().startsWith(peer+'/'))peerRequests.push({method:request.method(),url:request.url(),headers:request.headers(),cookie:request.headers().cookie});});
  await page.goto(learner);
  const modules=Object.fromEntries([
   ['runtime','packages/sutra-runtime/index.js'],
   ['model','packages/sutra-runtime/testing.js'],
   ['consent','packages/sutra-consent/index.js']
  ].map(([key,file])=>[key,'/@fs/'+path.join(root,file).replace(/\\/g,'/')]));
  async function attempt(networkName,decision,useProviderCanary=false){
   return page.evaluate(async({modules,peer,networkName,decision,useProviderCanary})=>{
    const [{runNetwork},{createScriptedModel},{createConsentInspector}]=await Promise.all([
     import(modules.runtime),import(modules.model),import(modules.consent)
    ]);
    const response=await fetch('/agents/learner.network.json',{credentials:'omit',cache:'no-store'});
    if(!response.ok)throw Error('Local fixture missing');
    const definition=await response.json();
    definition.tools[0].tools=[peer+'/agents/'+networkName];
    const inspector=createConsentInspector({decide:async()=>({decision,scope:'once'})});
    try{
     const model=createScriptedModel();
     if(useProviderCanary){
      model.mode='provider';model.approvedModel='approved-fixture-model';
      model.privateCredential='BYOK_PRIVATE_BROWSER_CANARY_DO_NOT_LEAK';
     }
     const result=await runNetwork({
      definition,request:'synthetic-private-canary requested local checklist',
      model,peerRuntime:{inspector},
     });
     return {ok:true,modelCalls:result.modelCalls,agentCalls:result.agentCalls,
      events:result.events,decisions:inspector.exportEvents()};
    }catch(error){return {ok:false,code:error.code,events:inspector.exportEvents()};}
   },{modules,peer,networkName,decision,useProviderCanary});
  }

  const denied=await attempt('checklist','deny');
  assert.equal(denied.ok,false);
  assert.equal(denied.code,'PEER_CONSENT_DENIED');
  assert.equal(peerRequests.length,0,'denial prevents every peer request');
  assert.ok(denied.events.some(event=>event.decision==='deny'));
  const allowed=await attempt('checklist','allow',true);
  assert.equal(allowed.ok,true,'caller-local peer invocation returned a result');
  assert.equal(allowed.agentCalls,3);assert.equal(allowed.modelCalls,5);
  assert.deepEqual(peerRequests.map(request=>new URL(request.url).pathname),
   ['/agents/agent-manifest.json','/agents/checklist.network.json']);
  assert.ok(peerRequests.every(request=>request.method==='GET'&&!request.cookie));
  assert.ok(peerRequests.every(request=>!JSON.stringify(request.headers).includes('BYOK_PRIVATE_BROWSER_CANARY_DO_NOT_LEAK')));
  assert.ok(allowed.decisions.some(event=>event.contactKind==='peer_manifest'&&event.decision==='allow'));
  assert.ok(allowed.decisions.some(event=>event.contactKind==='peer_graph'&&event.decision==='allow'));
  assert.ok(allowed.decisions.some(event=>event.contactKind==='peer_graph'&&event.status==='completed'));
  assert.ok(allowed.decisions.every(event=>!JSON.stringify(event).includes('synthetic-private-canary')));
  assert.ok(allowed.events.some(event=>event.kind==='agent'&&event.network==='learner'&&event.origin==='sutra-local'));
  assert.ok(allowed.events.some(event=>event.kind==='agent'&&event.network==='checklist'&&event.origin===peer));
  assert.ok(allowed.events.every(event=>!JSON.stringify(event).includes('synthetic-private-canary')));
  const wrong=await attempt('checklist_wrong','allow');
  assert.equal(wrong.ok,false);
  assert.equal(wrong.code,'PEER_NETWORK_MATCH');
  assert.equal(peerRequests.length,3,'wrong name fetches only manifest');

  // Exercise the actual visible learner workbench, not only page.evaluate.
  const previous=peerRequests.length;
  await page.getByLabel('Exact peer network URL').fill(peer+'/agents/checklist');
  await page.getByRole('button',{name:'Run scripted peer test'}).click();
  await page.getByRole('dialog',{name:'Approve real public artifact access?'}).waitFor();
  assert.equal(await page.locator('#peer-origin').innerText(),peer);
  assert.equal(await page.locator('#peer-contact-kind').innerText(),'Manifest');
  await page.getByRole('button',{name:'Deny external request'}).click();
  await page.waitForFunction(()=>document.querySelector('#peer-status').textContent.includes('PEER_CONSENT_DENIED'));
  assert.equal(peerRequests.length,previous,'workbench denial sends no request');
  await page.getByRole('button',{name:'Run scripted peer test'}).click();
  await page.getByRole('dialog',{name:'Approve real public artifact access?'}).waitFor();
  await page.getByRole('button',{name:'Allow this GET once'}).click();
  await page.getByRole('dialog',{name:'Approve real public artifact access?'}).waitFor();
  assert.equal(await page.locator('#peer-contact-kind').innerText(),'Declared graph');
  await page.getByRole('button',{name:'Allow this GET once'}).click();
  await page.waitForFunction(()=>document.querySelector('#peer-status').textContent.includes('Scripted peer test complete:'));
  assert.match(await page.locator('#peer-status').innerText(),/3 caller-local agent invocations and 5 scripted model steps/);
  assert.deepEqual(peerRequests.slice(previous).map(r=>new URL(r.url).pathname),
   ['/agents/agent-manifest.json','/agents/checklist.network.json']);
  assert.match(await page.locator('#peer-trace').innerText(),/Loaded peer/);
  assert.match(await page.locator('#peer-trace').innerText(),/Caller/);
  const peerDownloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download redacted execution JSON'}).click();
  const peerDownload=await peerDownloadPromise;
  assert.equal(peerDownload.suggestedFilename(),'sutra-peer-sanitized-trace.json');
  const receipt=JSON.parse(fs.readFileSync(await peerDownload.path(),'utf8'));
  assert.equal(receipt.reportType,'sutra-sanitized-execution');
  assert.equal(receipt.mode,'scripted-test');
  assert.equal(receipt.outcome,'completed');
  assert.equal(receipt.modelCalls,5);assert.equal(receipt.agentCalls,3);
  assert.ok(receipt.events.some(event=>event.network==='checklist'));
  assert.ok(!JSON.stringify(receipt).includes('Inspect the synthetic checklist state'));
  assert.ok(!JSON.stringify(receipt).includes('Authorization'));
  assert.ok(!(await page.locator('#peer-consent-log').textContent()).includes('Inspect the synthetic checklist state'));
  await page.getByLabel('Exact peer network URL').fill(peer+'/agents/checklist_wrong');
  await page.getByRole('button',{name:'Run scripted peer test'}).click();
  await page.getByRole('dialog',{name:'Approve real public artifact access?'}).waitFor();
  await page.getByRole('button',{name:'Allow this GET once'}).click();
  await page.waitForFunction(()=>document.querySelector('#peer-status').textContent.includes('PEER_NETWORK_MATCH'));
  assert.equal(peerRequests.length,previous+3,'workbench wrong name fetches only manifest');
  await page.setViewportSize({width:360,height:800});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);

  // Redirect policy deliberately fails closed until origin-changing redirect
  // consent is implemented. Test cross-site, same-site and looping 302 replies.
  const crossSite=[];
  page.on('request',request=>{if(request.url().includes('unapproved.example'))crossSite.push(request.url());});
  for(const locationHeader of [
   'https://unapproved.example/secret',
   peer+'/agents/another-manifest.json',
   peer+'/agents/agent-manifest.json'
  ]){
   const beforeRedirect=peerRequests.length;
   await page.route(peer+'/agents/agent-manifest.json',route=>route.fulfill({
    status:302,headers:{Location:locationHeader,'Access-Control-Allow-Origin':'*'},
    body:''
   }));
   await page.getByLabel('Exact peer network URL').fill(peer+'/agents/checklist');
   await page.getByRole('button',{name:'Run scripted peer test'}).click();
   await page.getByRole('dialog',{name:'Approve real public artifact access?'}).waitFor();
   await page.getByRole('button',{name:'Allow this GET once'}).click();
   await page.waitForFunction(()=>document.querySelector('#peer-status').textContent.includes('PEER_MANIFEST_UNAVAILABLE'));
   assert.equal(peerRequests.length,beforeRedirect+1,'redirect never follows a second artifact URL');
   await page.unroute(peer+'/agents/agent-manifest.json');
  }
  assert.deepEqual(crossSite,[],'unapproved redirect destination never contacted');
  await page.getByRole('button',{name:'Check example',exact:true}).click();
  assert.match(await page.locator('#result').innerText(),/Catalog matched/);
  await page.getByRole('button',{name:'Load synthetic timing fixture'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Actual media duration: 8.0 seconds.'));
  assert.equal(await page.locator('video').count(),1,'local native video works after blocked peer redirects');
  const contextBefore=peerRequests.length;
  const contextResult=await page.evaluate(async({modules,peer})=>{
   const [{runNetwork},{createScriptedModel},{createConsentInspector}]=await Promise.all([
    import(modules.runtime),import(modules.model),import(modules.consent)
   ]);
   const definition=await (await fetch('/agents/learner.network.json',{credentials:'omit'})).json();
   definition.tools[0].tools=[peer+'/agents/checklist'];
   const base=createScriptedModel(),seen=[];
   const model={...base,async chat(args){
    seen.push({origin:args.origin,messages:structuredClone(args.messages)});
    return base.chat(args);
   }};
   const inspector=createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
   const result=await runNetwork({
    definition,request:'Inspect synthetic evidence.',model,
    privateContext:{locale:'ne-NP',secretCanary:'PRIVATE_BROWSER_CONTEXT_CANARY_456'},
    peerContextGrants:[{peerUrl:peer+'/agents/checklist',network:'checklist',toPeer:['locale'],toCaller:['locale']}],
    peerRuntime:{inspector}
   });
   return {events:result.events,
    peerPrompts:seen.filter(x=>x.origin===peer).map(x=>JSON.stringify(x.messages)),
    localPrompts:seen.filter(x=>x.origin==='sutra-local').map(x=>JSON.stringify(x.messages))};
  },{modules,peer});
  assert.equal(peerRequests.length,contextBefore+2);
  assert.ok(peerRequests.slice(contextBefore).every(r=>!JSON.stringify(r.headers).includes('PRIVATE_BROWSER_CONTEXT_CANARY_456')));
  assert.ok(peerRequests.slice(contextBefore).every(r=>!JSON.stringify(r.headers).includes('ne-NP')));
  assert.ok(contextResult.peerPrompts.some(text=>text.includes('"locale":"ne-NP"')));
  assert.ok(contextResult.peerPrompts.every(text=>!text.includes('PRIVATE_BROWSER_CONTEXT_CANARY_456')));
  assert.ok(contextResult.localPrompts.some(text=>text.includes('"private_context"')&&text.includes('ne-NP')));
  assert.ok(contextResult.localPrompts.every(text=>!text.includes('PRIVATE_BROWSER_CONTEXT_CANARY_456')));
  assert.ok(!JSON.stringify(contextResult.events).includes('PRIVATE_BROWSER_CONTEXT_CANARY_456'));
  const transcript=await page.evaluate(async root=>{
   const {mountTranscriptPanel}=await import('/@fs/'+root+'/apps/sutra/src/transcript-panel.js');
   const container=document.createElement('div');document.body.append(container);
   const media=new EventTarget();media.currentTime=0;
   const source={id:'multi-cue-fixture',version:'v2',duration:8,cues:[
    {id:'intro',start:0,end:1,text:'Beginning source wording.'},
    {id:'translated',start:2,end:4,text:'Translated notice.',translation:true,language:'Nepali'},
    {id:'outro',start:4,end:7,text:'Ending source wording.'}
   ]};
   let seeks=0;
   const panel=mountTranscriptPanel(container,{source,media,onSeek:async t=>{
    seeks++;media.currentTime=t;media.dispatchEvent(new Event('seeked'));return t;
   }});
   const controls=[...container.querySelectorAll('.transcript-cue')];
   controls[0].focus();
   controls[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));
   const arrowMoved=document.activeElement===controls[1];
   const translatedVisible=controls[1].textContent.includes('Translated wording · Nepali · not an original quotation');
   controls[1].click();
   await new Promise(resolve=>setTimeout(resolve,0));
   const cueActivated=seeks===1&&media.currentTime===2&&controls[1].getAttribute('aria-current')==='true';
   const preservedFocus=document.activeElement===controls[1];
   const captionMissing=container.querySelector('.transcript-meta').textContent.includes('No native caption track is confirmed');
   const input=container.querySelector('input[type=search]');
   input.value='nothing-to-match';input.dispatchEvent(new Event('input'));
   const noResults=container.querySelectorAll('.transcript-cue').length===0&&
    container.querySelector('.transcript-status').textContent.includes('No transcript cues match');
   panel.dispose();
   const empty=mountTranscriptPanel(container,{source:{id:'empty',version:'v1',duration:8,cues:[]},media});
   const missing=container.textContent.includes('No usable transcript cues');
   empty.dispose();
   const long=mountTranscriptPanel(container,{source:{id:'long_cue',version:'v1',duration:8,cues:[
    {id:'long',start:0,end:2,text:'x'.repeat(4000)}
   ]},media});
   const longVisible=container.querySelector('.transcript-words').textContent.length===4000;
   const previousScroll=scrollY;
   media.currentTime=1;media.dispatchEvent(new Event('timeupdate'));
   const noAutoFollow=scrollY===previousScroll;
   const noHorizontalClipping=document.documentElement.scrollWidth<=innerWidth;
   long.dispose();container.remove();
   return {arrowMoved,translatedVisible,cueActivated,preservedFocus,noResults,missing,captionMissing,longVisible,noAutoFollow,noHorizontalClipping};
  },root);
  assert.deepEqual(transcript,{arrowMoved:true,translatedVisible:true,cueActivated:true,preservedFocus:true,noResults:true,missing:true,captionMissing:true,longVisible:true,noAutoFollow:true,noHorizontalClipping:true});
  assert.deepEqual(pageErrors,[]);
  console.log('PASS: Chromium two-origin peer CORS, denial before transport, exact artifact GETs, caller-local 3-agent/5-model composition, redacted consent, exact destination-bound private context, strict redirects and specific wrong-name refusal.');
 }finally{
  if(browser)await browser.close();
  for(const child of processes)child.kill();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
