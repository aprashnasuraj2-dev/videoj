// Production-header browser regression. A local proxy injects the exact Worker
// security headers around the built Vite preview; no deployment or external host.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');

(async()=>{
 const app=path.resolve(__dirname,'..'),upstream='http://127.0.0.1:4190',site='http://127.0.0.1:4191';
 const {securityHeaders}=await import(path.join(app,'../../services/sutra-api/worker.js'));
 const headers=securityHeaders({});
 const vite=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','4190','--strictPort'],{cwd:app,stdio:'pipe'});
 let log='';for(const stream of [vite.stdout,vite.stderr])stream.on('data',d=>log=(log+d).slice(-5000));
 const proxy=http.createServer(async(req,res)=>{
  try{
   const target=new URL(req.url,upstream),method=req.method??'GET';
   const incoming={};for(const [k,v] of Object.entries(req.headers))if(typeof v==='string'&&!['host','connection'].includes(k))incoming[k]=v;
   const response=await fetch(target,{method,headers:incoming,redirect:'manual'});
   const out=Object.fromEntries(response.headers);Object.assign(out,headers);
   res.writeHead(response.status,out);res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(502,headers);res.end('proxy unavailable');}
 });
 let browser;
 try{
  let ready=false;for(let i=0;i<60;i++){try{const r=await fetch(upstream,{signal:AbortSignal.timeout(400)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
  assert.ok(ready,'built preview not ready: '+log);
  await new Promise((resolve,reject)=>proxy.once('error',reject).listen(4191,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1000,height:800}});
  const blockedRequests=[],violations=[],errors=[];
  page.on('request',r=>{if(r.url().includes('blocked.example'))blockedRequests.push(r.url());});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(site);
  await page.evaluate(()=>document.addEventListener('securitypolicyviolation',event=>{
   window.__sutraCsp=(window.__sutraCsp??[]).concat([{directive:event.effectiveDirective,blocked:event.blockedURI}]);
  }));
  await page.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
  assert.match((await page.request.get(site)).headers()['content-security-policy'],/connect-src 'self'/);

  // Core static/browser-local features remain available under production headers.
  await page.getByRole('button',{name:'Check example',exact:true}).click();
  assert.match(await page.locator('#result').innerText(),/Catalog matched/);
  await page.getByRole('button',{name:'Run scripted network test'}).click();
  await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('2 agent invocations; 3 scripted model steps.'));
  await page.getByRole('button',{name:'Load synthetic timing fixture'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Actual media duration: 8.0 seconds.'));
  assert.equal(await page.locator('video').count(),1);

  // Unexpected script and connection destinations are blocked by CSP before
  // browser transport. No network interception/failure is used to create the result.
  const result=await page.evaluate(async()=>{
   const scriptResult=new Promise(resolve=>{
    const script=document.createElement('script');script.src='https://blocked.example/evil.js';
    script.onload=()=>resolve('loaded');script.onerror=()=>resolve('blocked');document.head.append(script);
   });
   let fetchResult='resolved';
   try{await fetch('https://blocked.example/private');}catch{fetchResult='blocked';}
   return {script:await scriptResult,fetch:fetchResult};
  });
  assert.deepEqual(result,{script:'blocked',fetch:'blocked'});
  await page.waitForTimeout(50);
  const observed=await page.evaluate(()=>window.__sutraCsp??[]);
  violations.push(...observed);
  assert.equal(blockedRequests.length,0,'CSP stops unexpected third-party transport before request');
  assert.ok(violations.some(v=>v.directive==='script-src-elem'||v.directive==='script-src'));
  assert.ok(violations.some(v=>v.directive==='connect-src'));
  assert.ok(!errors.some(e=>!/Content Security Policy/i.test(e)),JSON.stringify(errors));

  console.log('PASS: Worker CSP/referrer/frame/permissions profile preserves built local graph and native media while blocking unexpected script and connect destinations before transport.');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>proxy.close(()=>resolve()));
  vite.kill();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
