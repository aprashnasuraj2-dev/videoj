const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');const net=require('node:net');const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{
 const app=path.resolve(__dirname,'..');
 const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});});
 const base='http://127.0.0.1:'+port,peer='https://peer.example',peerUrl=peer+'/agents/expert';
 const server=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:app,stdio:'pipe'});
 let browser,logs='';for(const stream of [server.stdout,server.stderr])stream.on('data',d=>logs=(logs+d.toString()).slice(-3000));
 try{
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready,logs);
  browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let peerRequests=0,modelCalls=0,manifestReads=0,graphReads=0;
  await page.route('**/api/status',r=>r.fulfill({json:{inference:'configured',model:'synthetic-provider-test',backend:'self_hosted',inferenceContractId:'c'.repeat(64),routerBase:'/api/v1',publisherFunded:true,byok:false,sourceTools:'catalog',webResearch:'disabled',content:{mode:'synthetic',contentVersion:'synthetic-timing-v1',catalogSha256:'a12d95aab97bbc047a2b88d73f4814072c48c3f2e55adeb0381a7b8d36c45333',primarySourceId:'synthetic-timing-fixture'},factualTruth:'unverified'}}));
  const graph=JSON.parse(fs.readFileSync(path.join(app,'public/agents/source_peer_learner.network.json'),'utf8'));graph.llm_config={model_name:'synthetic-provider-test'};
  const manifest=JSON.parse(fs.readFileSync(path.join(app,'public/agents/agent-manifest.json'),'utf8'));
  manifest.llm_router={base_url:base+'/api/v1',mock:false,publisher_funded:true};manifest.deployment={mode:'static',self_contained_runtime:true,browser_mock:false,direct_byok:false,direct_mcp_requires_cors:true,public_mcp_facade:false};
  manifest.networks=manifest.networks.map(n=>n.name==='source_peer_learner'?{...n,hocon:'./release/test/source_peer_learner.network.json'}:n);
  await page.route('**/agents/agent-manifest.json',r=>{manifestReads++;return r.fulfill({json:manifest});});
  await page.route('**/agents/release/test/source_peer_learner.network.json',r=>{graphReads++;return r.fulfill({json:graph});});
  const peerManifest={networks:[{name:'expert',front_man:'learner',hocon:'./expert.network.json'}]};
  const peerGraph={metadata:{description:'Independent compatible peer fixture.'},max_steps:3,tools:[{name:'learner',function:{description:'Return one bounded peer claim.',parameters:{type:'object',properties:{request:{type:'string',minLength:1,maxLength:2000}},required:['request'],additionalProperties:false}},instructions:'Return a concise unverified peer claim. Do not claim verification.',tools:[]}]};
  await page.route(peer+'/**',async r=>{
   peerRequests++;assert.equal(r.request().method(),'GET');assert.equal(r.request().headers().authorization,undefined);assert.equal(r.request().headers().cookie,undefined);
   const url=r.request().url(),json=url.endsWith('/agent-manifest.json')?peerManifest:peerGraph;
   await r.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':base},body:JSON.stringify(json)});
  });
  const chunk=(delta,finish_reason=null)=>({choices:[{index:0,delta,finish_reason}]});
  const sse=items=>items.map(x=>'data: '+JSON.stringify(x)+'\n\n').join('')+'data: [DONE]\n\n';
  await page.route('**/api/v1/chat/completions',async r=>{
   modelCalls++;const body=r.request().postDataJSON(),tools=(body.tools??[]).map(t=>t.function.name),toolMessages=body.messages.filter(m=>m.role==='tool');
   assert.equal(r.request().headers()['x-sutra-inference-contract'],'c'.repeat(64));assert.equal(r.request().headers().authorization,undefined);
   let data;
   if(!tools.length)data=chunk({content:'Independent peer claim: peer measurement is forty one units in this fixture.'},'stop');
   else if(!toolMessages.length){
    const peerTool=tools.find(name=>!name.startsWith('mcp_'));assert.ok(peerTool,'caller must expose one resolved peer tool');
    data=chunk({tool_calls:[{index:0,id:'peer-1',type:'function',function:{name:peerTool,arguments:JSON.stringify({request:'Provide the independent peer measurement claim.'})}}]},'tool_calls');
   }else{
    const peerResult=JSON.parse(toolMessages.at(-1).content);assert.equal(peerResult.source.sourceId,'peer-1');assert.equal(peerResult.source.origin,peer);
    data=chunk({content:JSON.stringify({claims:[{kind:'source_claim',text:'The compatible peer reports forty one units.',citations:[{kind:'peer',sourceId:'peer-1',quote:'peer measurement is forty one units'}]}]})},'stop');
   }
   await r.fulfill({contentType:'text/event-stream',body:sse([data,{choices:[],usage:{prompt_tokens:20,completion_tokens:5,total_tokens:25}}])});
  });
  await page.goto(base);await page.getByRole('heading',{name:'Ask about the evidence.'}).waitFor();
  await page.locator('#provider-peer-options summary').click();await page.locator('#provider-peer-url').fill(peerUrl);
  assert.equal(peerRequests,0,'typing a peer URL must make no peer-origin request');
  await page.getByRole('button',{name:'Check inference availability'}).click();await page.waitForFunction(()=>document.querySelector('#provider-status').textContent.includes('Model configured'));
  assert.equal(peerRequests,0,'provider discovery may resolve the symbolic slot locally but must not contact the peer');assert.equal(manifestReads,1);assert.equal(graphReads,1);assert.equal(modelCalls,0);
  assert.match(await page.locator('#provider-status').textContent(),/no peer request has occurred/i);
  await page.getByRole('button',{name:'Ask configured model'}).click();await page.waitForFunction(()=>document.querySelector('#provider-consent-dialog').open);
  const peerConsent=await page.locator('#provider-consent-peer').textContent();assert.ok(peerConsent.includes(peerUrl));assert.match(peerConsent,/no lesson\/web capability/);assert.equal(peerRequests,0);assert.equal(modelCalls,0);
  await page.getByRole('button',{name:'Run inference once'}).click();await page.waitForFunction(()=>document.querySelector('#provider-peer-contact-dialog').open);
  assert.equal(modelCalls,1,'caller model may select the peer before any peer artifact contact');assert.equal(peerRequests,0,'manifest contact waits for explicit approval');assert.equal(await page.locator('#provider-peer-contact-origin').textContent(),peer);
  assert.match(await page.locator('#provider-peer-contact-resource').textContent(),/agent-manifest\.json$/);
  await page.getByRole('button',{name:'Allow this GET once'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-peer-contact-dialog').open&&document.querySelector('#provider-peer-contact-resource').textContent.includes('expert.network.json'));
  assert.equal(peerRequests,1,'only the approved manifest GET may occur before graph approval');
  await page.getByRole('button',{name:'Allow this GET once'}).click();await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='completed');
  assert.equal(peerRequests,2,'exactly manifest and graph GETs were approved');assert.equal(modelCalls,3,'caller selection, peer claim, and caller synthesis share one model path');
  assert.match(await page.locator('#provider-answer').textContent(),/Source claim: The compatible peer reports forty one units/);
  assert.match(await page.locator('#provider-peer-receipts').textContent(),/unverified peer claim/);assert.match(await page.locator('#provider-peer-receipts').textContent(),/peer measurement is forty one units/);
  assert.match(await page.locator('#provider-metrics').textContent(),/Peer claims returned: 1/);assert.deepEqual(errors,[]);
  console.log('PASS: live learner peer slot stays contact-free until model selection and explicit per-artifact consent, then exposes quotation-bound unverified peer claim receipts.');
 }finally{await browser?.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1;});
