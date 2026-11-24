// Browser-to-separate-origin MCP HTTP fixture; no external service or live AI.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const http=require('node:http');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const caller='http://127.0.0.1:4186',endpoint='http://127.0.0.1:4187/mcp';
const schema={type:'object',properties:{query:{type:'string',minLength:1,maxLength:120}},required:['query'],additionalProperties:false};

(async()=>{
 const app=path.resolve(__dirname,'..');const root=path.resolve(app,'../..');
 const timing=JSON.parse(fs.readFileSync(path.join(app,'src/fixtures/timing-source.json'),'utf8'));
 let cors=true,serviceMode='normal';let posts=[],cookieSeen=[],authorizationSeen=[],bodyCanarySeen=[];
 const server=http.createServer(async(req,res)=>{
  if(req.url!=='/mcp'){res.writeHead(404);res.end();return;}
  const origin=req.headers.origin;
  const addCors=()=>{
   if(cors&&origin===caller){
    res.setHeader('Access-Control-Allow-Origin',caller);
    res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','content-type, mcp-protocol-version');
    res.setHeader('Vary','Origin');
   }
  };
  addCors();
  if(req.method==='OPTIONS'){res.writeHead(cors?204:403);res.end();return;}
  if(req.method!=='POST'||origin!==caller){res.writeHead(405);res.end();return;}
  if(serviceMode==='timeout'){
   // Deliberately hold the approved request open beyond the client's fixed
   // five-second deadline. The browser must abort; no fallback endpoint exists.
   req.on('close',()=>{if(!res.writableEnded)res.destroy();});
   return;
  }
  cookieSeen.push(req.headers.cookie??null);
  authorizationSeen.push(req.headers.authorization??null);
  let body='';for await(const chunk of req){body+=chunk;if(body.length>20000){res.writeHead(413);res.end();return;}}
  bodyCanarySeen.push(body.includes('BYOK_PRIVATE_MCP_BROWSER_CANARY'));
  const rpc=JSON.parse(body);posts.push(rpc.method);
  let result;
  if(rpc.method==='initialize')result={protocolVersion:'2025-06-18',capabilities:{tools:{}}};
  else if(rpc.method==='notifications/initialized'){res.writeHead(202);res.end(serviceMode==='notification_body'?'unexpected acknowledgement payload':undefined);return;}
  else if(rpc.method==='tools/list'){
   if(serviceMode==='discovery_error')result={tools:[{name:'write_public',description:'Disallowed synthetic writer',inputSchema:schema,annotations:{readOnlyHint:false,destructiveHint:true}}]};
   else result={tools:[{name:'read_public',description:'Synthetic public record',inputSchema:schema,annotations:{readOnlyHint:true,destructiveHint:false}}]};
  }
  else if(rpc.method==='tools/call')result={structuredContent:{version:1,truthStatus:'unverified',items:[{
   id:timing.receipt.sourceId+'/'+timing.receipt.cueId,excerpt:timing.receipt.excerpt
  }]}};
  else{res.writeHead(400);res.end();return;}
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify({jsonrpc:'2.0',id:rpc.id,result}));
 });
 await new Promise((resolve,reject)=>server.once('error',reject).listen(4187,'127.0.0.1',resolve));
 const vite=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4186','--strictPort'],{cwd:app,stdio:'pipe'});
 let browser;let logs='';[vite.stdout,vite.stderr].forEach(stream=>stream.on('data',chunk=>{logs=(logs+chunk).slice(-5000);}));
 try{
  let ready=false;for(let i=0;i<70;i++){try{const r=await fetch(caller,{signal:AbortSignal.timeout(400)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
  assert.ok(ready,'SUTRA test browser preview ready: '+logs);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1024,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(caller);
  await page.evaluate(()=>document.cookie='test-site-cookie=must-not-travel; SameSite=Lax');
  async function attempt(choice){
   return page.evaluate(async({root,endpoint,choice})=>{
    const [{runNetwork},{createConsentInspector}]=await Promise.all([
     import('/@fs/'+root+'/packages/sutra-runtime/index.js'),
     import('/@fs/'+root+'/packages/sutra-consent/index.js')
    ]);
    const definition={metadata:{description:'Narrow external read-only MCP test'},tools:[{
     name:'learner',instructions:'Report only returned public fixture data.',
     function:{description:'Read synthetic public material.',parameters:{type:'object',properties:{request:{type:'string'}},required:['request'],additionalProperties:false}},
     tools:[{url:endpoint}]
    }]};
    const decisions=[],inspector=createConsentInspector({decide:async intent=>{
     decisions.push(intent.kind);
     return {decision:choice==='deny-discovery'||choice==='deny-call'&&intent.kind==='mcp_call'?'deny':'allow',scope:'once'};
    }});
    let steps=0;
    const model={mode:'provider',approvedModel:'approved-fixture-model',
     privateCredential:'BYOK_PRIVATE_MCP_BROWSER_CANARY',async chat({messages}){
     steps++;
     const previous=messages.find(message=>message.role==='tool');
     if(previous)return {content:'Result from approved external read: '+previous.content,toolCalls:[]};
     return {content:'',toolCalls:[{id:'mcp-'+steps,type:'function',function:{name:'mcp_read_public',arguments:'{"query":"synthetic"}'}}]};
    }};
    try{
     const result=await runNetwork({definition,request:'synthetic-secret-canary must not leave local host',model,thirdPartyMcp:{url:endpoint,inspector}});
     return {ok:true,text:result.text,events:result.events,decisions,consent:inspector.exportEvents()};
    }catch(error){return {ok:false,code:error.code,decisions,consent:inspector.exportEvents()};}
   },{root,endpoint,choice});
  }
  const noDiscovery=await attempt('deny-discovery');
  assert.equal(noDiscovery.ok,false);assert.equal(noDiscovery.code,'EXTERNAL_CONSENT_DENIED');assert.equal(posts.length,0);
  assert.deepEqual(noDiscovery.decisions,['mcp_discovery']);
  await page.getByRole('button',{name:'Check example',exact:true}).click();
  assert.match(await page.locator('#result').innerText(),/Catalog matched/);
  await page.getByRole('button',{name:'Load source media'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Actual media duration: 8.0 seconds.'));
  assert.equal(await page.locator('video').count(),1,'Local native playback remains available after denied MCP discovery');
  const noCall=await attempt('deny-call');
  assert.equal(noCall.ok,false);assert.equal(noCall.code,'EXTERNAL_CONSENT_DENIED');
  assert.deepEqual(posts,['initialize','notifications/initialized','tools/list']);
  const before=posts.length,yes=await attempt('allow');
  assert.equal(yes.ok,true);assert.match(yes.text,/third_party_unverified/);assert.match(yes.text,/unverified/);
  assert.ok(yes.text.includes(timing.receipt.excerpt),'approved MCP read returns exact catalog-backed synthetic excerpt');
  assert.ok(yes.text.includes(timing.receipt.sourceId+'/'+timing.receipt.cueId));
  assert.deepEqual(posts.slice(before),['initialize','notifications/initialized','tools/list','tools/call']);
  assert.ok(cookieSeen.every(value=>value===null),'No cookies sent to MCP origin');
  assert.ok(authorizationSeen.every(value=>value===null),'No model authorization forwarded to MCP origin');
  assert.ok(bodyCanarySeen.every(value=>value===false),'BYOK canary never enters third-party MCP payload');
  assert.deepEqual(yes.decisions,['mcp_discovery','mcp_call']);
  assert.ok(!JSON.stringify(yes.consent).includes('synthetic-secret-canary'));
  serviceMode='discovery_error';const beforeDiscoveryError=posts.length;
  const badDiscovery=await attempt('allow');
  assert.equal(badDiscovery.ok,false);
  assert.equal(badDiscovery.code,'EXTERNAL_CONTACT_FAILED');
  assert.deepEqual(posts.slice(beforeDiscoveryError),['initialize','notifications/initialized','tools/list']);
  serviceMode='notification_body';const beforeMalformedAck=posts.length;
  const malformedAck=await attempt('allow');assert.equal(malformedAck.ok,false);assert.equal(malformedAck.code,'EXTERNAL_CONTACT_FAILED');
  assert.deepEqual(posts.slice(beforeMalformedAck),['initialize','notifications/initialized']);
  assert.equal(await page.locator('video').count(),1,'malformed acknowledgement cannot affect the local lesson');
  serviceMode='timeout';const beforeTimeout=posts.length,timeoutStarted=Date.now();
  const timed=await attempt('allow');
  const timeoutElapsed=Date.now()-timeoutStarted;
  assert.equal(timed.ok,false);
  assert.equal(timed.code,'EXTERNAL_CONTACT_FAILED');
  assert.ok(timeoutElapsed>=4500&&timeoutElapsed<10000,'fixed MCP deadline should terminate a real held-open service');
  assert.equal(posts.length,beforeTimeout,'held request never reached parsed JSON-RPC body');
  serviceMode='normal';
  assert.ok(!JSON.stringify(yes.events).includes('synthetic-secret-canary'));
  cors=false;const beforeCors=posts.length;
  const blocked=await attempt('allow');
  assert.equal(blocked.ok,false);
  assert.equal(blocked.code,'EXTERNAL_CONTACT_FAILED');
  assert.equal(posts.length,beforeCors,'CORS refusal prevents POST');
  assert.deepEqual(errors,[]);
  console.log('PASS: Chromium cross-origin MCP separate discovery/call consent, 0 POSTs on discovery denial, intact local media/evidence, no tools/call after call denial, 4 approved source-backed stateless JSON RPCs, disallowed discovery and real held-open timeout fail closed, no cookies or private traces, browser CORS fail-closed.');
 }finally{
  if(browser)await browser.close();vite.kill();await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
