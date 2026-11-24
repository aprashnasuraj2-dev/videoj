const {chromium}=require('../../apps/sutra/node_modules/playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),vendor=path.join(root,'packages/sutra-runtime/vendor/nsdeploy');
const pin=JSON.parse(fs.readFileSync(path.join(vendor,'UPSTREAM.json')));
const publicDir=path.join(root,'apps/sutra-peer/public/agents');
const files=Object.fromEntries(['agent-manifest.json','checklist.network.json'].map(name=>[name,fs.readFileSync(path.join(publicDir,name))]));
const requests=[];let mode='normal',browser;
const open=handler=>new Promise((resolve,reject)=>{const server=http.createServer(handler);server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve({server,origin:'http://127.0.0.1:'+server.address().port}));});
const close=s=>new Promise(r=>{s.closeAllConnections();s.close(r);});
(async()=>{
 const publisher=await open((req,res)=>{
  requests.push({path:req.url,method:req.method,cookie:req.headers.cookie,auth:req.headers.authorization,referer:req.headers.referer});
  const name=req.url.slice('/agents/'.length);let value=files[name];
  if(req.method!=='GET'||!req.url.startsWith('/agents/')||!Object.hasOwn(files,name)||mode==='missing'&&name==='checklist.network.json'){res.writeHead(404);res.end();return;}
  if(name==='agent-manifest.json'&&mode==='duplicate'){const m=JSON.parse(value);m.networks.push(m.networks[0]);value=JSON.stringify(m);}
  if(name==='checklist.network.json'&&mode==='hint'){const g=JSON.parse(value);g.llm_config={model_name:'publisher-unapproved-model'};value=JSON.stringify(g);}
  if(name==='checklist.network.json'&&mode==='external'){const g=JSON.parse(value);g.tools[0].tools.push('https://blocked.invalid/agents/other');value=JSON.stringify(g);}
  res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(value);
 });
 const consumer=await open((req,res)=>{
  let data,type='text/javascript';
  if(req.url==='/'){data=fs.readFileSync(path.join(__dirname,'index.html'));type='text/html';}
  else if(req.url==='/consumer.js')data=fs.readFileSync(path.join(__dirname,'consumer.js'));
  else if(req.url==='/publisher-origin.json'){data=JSON.stringify({origin:publisher.origin});type='application/json';}
  else if(req.url.startsWith('/vendor/')&&Object.hasOwn(pin.files,req.url.slice(8)))data=fs.readFileSync(path.join(vendor,req.url.slice(8)));
  else{res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':type,'Content-Security-Policy':"default-src 'self'; script-src 'self'; connect-src 'self' "+publisher.origin+"; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(data);
 });
 try{
  browser=await chromium.launch({headless:true});const page=await browser.newPage(),errors=[],unexpected=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(consumer.origin+'/')&&!r.url().startsWith(publisher.origin+'/'))unexpected.push(r.url());});
  await page.goto(consumer.origin);const run=page.getByRole('button',{name:'Inspect publication'}),allow=page.getByRole('button',{name:'Allow once'}),deny=page.getByRole('button',{name:'Deny'});
  const status=async text=>page.waitForFunction(t=>document.querySelector('#status').textContent.includes(t),text);
  await run.click();await deny.click();await status('DENIED');assert.equal(requests.length,0);
  await run.click();await allow.click();await deny.click();await status('DENIED');assert.deepEqual(requests.map(r=>r.path),['/agents/agent-manifest.json']);
  requests.length=0;await run.click();await allow.click();await allow.click();await status('Completed');
  const result=JSON.parse(await page.locator('#output').textContent());assert.equal(result.agentCalls,2);assert.equal(result.modelCalls,3);assert.deepEqual(result.models,Array(3).fill('consumer-owned-fixture'));assert.equal(result.truthStatus,'unverified');
  assert.deepEqual(requests.map(r=>r.path),['/agents/agent-manifest.json','/agents/checklist.network.json']);
  assert.ok(requests.every(r=>r.method==='GET'&&!r.cookie&&!r.auth&&!r.referer));
  await page.locator('#network').fill('check');requests.length=0;await run.click();await allow.click();await status('NETWORK_MATCH');assert.equal(requests.length,1);
  await page.locator('#network').fill('checklist');mode='duplicate';requests.length=0;await run.click();await allow.click();await status('NETWORK_MATCH');assert.equal(requests.length,1);
  mode='missing';await run.click();await allow.click();await allow.click();await status('ARTIFACT_UNAVAILABLE');assert.equal(await page.locator('#output').textContent(),'');
  mode='external';await run.click();await allow.click();await allow.click();await status('GRAPH_PROFILE');assert.equal(await page.locator('#output').textContent(),'');
  mode='hint';await run.click();await allow.click();await allow.click();await status('Completed');assert.deepEqual(JSON.parse(await page.locator('#output').textContent()).models,Array(3).fill('consumer-owned-fixture'));
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  console.log('PASS neutral consumer: direct pinned upstream kernel/runner, exact public JSON GETs, two independent loopback origins, 2 agents/3 local model calls, separate manifest/graph denial, wrong/duplicate names, missing graph, external-capability rejection and caller-owned model override. Synthetic, same-owner lab only.');
 }finally{await browser?.close();await Promise.all([close(publisher.server),close(consumer.server)]);}
})().catch(e=>{console.error(e);process.exitCode=1;});
