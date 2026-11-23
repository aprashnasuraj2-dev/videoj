// Real Chromium, two independent loopback origins; no public deployment or third-party service.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
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
  page.on('request',request=>{if(request.url().startsWith(peer+'/'))peerRequests.push({method:request.method(),url:request.url(),cookie:request.headers().cookie});});
  await page.goto(learner);
  const modules=Object.fromEntries([
   ['runtime','packages/sutra-runtime/index.js'],
   ['model','packages/sutra-runtime/testing.js'],
   ['consent','packages/sutra-consent/index.js']
  ].map(([key,file])=>[key,'/@fs/'+path.join(root,file).replace(/\\/g,'/')]));
  async function attempt(networkName,decision){
   return page.evaluate(async({modules,peer,networkName,decision})=>{
    const [{runNetwork},{createScriptedModel},{createConsentInspector}]=await Promise.all([
     import(modules.runtime),import(modules.model),import(modules.consent)
    ]);
    const response=await fetch('/agents/learner.network.json',{credentials:'omit',cache:'no-store'});
    if(!response.ok)throw Error('Local fixture missing');
    const definition=await response.json();
    definition.tools[0].tools=[peer+'/agents/'+networkName];
    const inspector=createConsentInspector({decide:async()=>({decision,scope:'once'})});
    try{
     const result=await runNetwork({
      definition,request:'synthetic-private-canary requested local checklist',
      model:createScriptedModel(),peerRuntime:{inspector},
     });
     return {ok:true,modelCalls:result.modelCalls,agentCalls:result.agentCalls,
      events:result.events,decisions:inspector.exportEvents()};
    }catch(error){return {ok:false,code:error.code,events:inspector.exportEvents()};}
   },{modules,peer,networkName,decision});
  }

  const denied=await attempt('checklist','deny');
  assert.equal(denied.ok,false);
  assert.equal(denied.code,'PEER_CONSENT_DENIED');
  assert.equal(peerRequests.length,0,'denial prevents every peer request');
  assert.ok(denied.events.some(event=>event.decision==='deny'));
  const allowed=await attempt('checklist','allow');
  assert.equal(allowed.ok,true,'caller-local peer invocation returned a result');
  assert.equal(allowed.agentCalls,3);assert.equal(allowed.modelCalls,5);
  assert.deepEqual(peerRequests.map(request=>new URL(request.url).pathname),
   ['/agents/agent-manifest.json','/agents/checklist.network.json']);
  assert.ok(peerRequests.every(request=>request.method==='GET'&&!request.cookie));
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
  assert.ok(!(await page.locator('#peer-consent-log').textContent()).includes('Inspect the synthetic checklist state'));
  await page.getByLabel('Exact peer network URL').fill(peer+'/agents/checklist_wrong');
  await page.getByRole('button',{name:'Run scripted peer test'}).click();
  await page.getByRole('dialog',{name:'Approve real public artifact access?'}).waitFor();
  await page.getByRole('button',{name:'Allow this GET once'}).click();
  await page.waitForFunction(()=>document.querySelector('#peer-status').textContent.includes('PEER_NETWORK_MATCH'));
  assert.equal(peerRequests.length,previous+3,'workbench wrong name fetches only manifest');
  await page.setViewportSize({width:360,height:800});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(pageErrors,[]);
  console.log('PASS: Chromium two-origin peer CORS, denial before transport, exact artifact GETs, caller-local 3-agent/5-model composition, redacted consent and specific wrong-name refusal.');
 }finally{
  if(browser)await browser.close();
  for(const child of processes)child.kill();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
