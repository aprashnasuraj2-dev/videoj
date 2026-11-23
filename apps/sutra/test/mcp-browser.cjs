// Browser-to-separate-origin MCP HTTP fixture; no external service or live AI.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const caller='http://127.0.0.1:4186',endpoint='http://127.0.0.1:4187/mcp';
const schema={type:'object',properties:{query:{type:'string',minLength:1,maxLength:120}},required:['query'],additionalProperties:false};

(async()=>{
 const app=path.resolve(__dirname,'..');const root=path.resolve(app,'../..');
 let cors=true;let posts=[],cookieSeen=[];
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
  cookieSeen.push(req.headers.cookie??null);
  let body='';for await(const chunk of req){body+=chunk;if(body.length>20000){res.writeHead(413);res.end();return;}}
  const rpc=JSON.parse(body);posts.push(rpc.method);
  let result;
  if(rpc.method==='initialize')result={protocolVersion:'2025-06-18',capabilities:{tools:{}}};
  else if(rpc.method==='notifications/initialized'){res.writeHead(202);res.end();return;}
  else if(rpc.method==='tools/list')result={tools:[{name:'read_public',description:'Synthetic public record',inputSchema:schema,annotations:{readOnlyHint:true,destructiveHint:false}}]};
  else if(rpc.method==='tools/call')result={structuredContent:{version:1,truthStatus:'unverified',items:[{id:'sample',excerpt:'A bounded public synthetic sample.'}]}};
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
    const model={mode:'scripted-test',async chat({messages}){
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
  const noCall=await attempt('deny-call');
  assert.equal(noCall.ok,false);assert.equal(noCall.code,'EXTERNAL_CONSENT_DENIED');
  assert.deepEqual(posts,['initialize','notifications/initialized','tools/list']);
  const before=posts.length,yes=await attempt('allow');
  assert.equal(yes.ok,true);assert.match(yes.text,/third_party_unverified/);assert.match(yes.text,/unverified/);
  assert.deepEqual(posts.slice(before),['initialize','notifications/initialized','tools/list','tools/call']);
  assert.ok(cookieSeen.every(value=>value===null),'No cookies sent to MCP origin');
  assert.deepEqual(yes.decisions,['mcp_discovery','mcp_call']);
  assert.ok(!JSON.stringify(yes.consent).includes('synthetic-secret-canary'));
  assert.ok(!JSON.stringify(yes.events).includes('synthetic-secret-canary'));
  cors=false;const beforeCors=posts.length;
  const blocked=await attempt('allow');
  assert.equal(blocked.ok,false);
  assert.equal(blocked.code,'EXTERNAL_CONTACT_FAILED');
  assert.equal(posts.length,beforeCors,'CORS refusal prevents POST');
  assert.deepEqual(errors,[]);
  console.log('PASS: Chromium cross-origin MCP separate discovery/call consent, 0 POSTs on discovery denial, no tools/call after call denial, 4 approved stateless JSON RPCs, no cookies or private traces, browser CORS fail-closed.');
 }finally{
  if(browser)await browser.close();vite.kill();await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
