// Production-header browser regression. A local static server serves the built
// dist tree and a second proxy injects the exact Worker security headers.
// No deployment, DNS change, external peer, analytics or paid inference.
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const mime=file=>({
 '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
 '.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.svg':'image/svg+xml',
 '.png':'image/png','.webp':'image/webp'
}[path.extname(file)]??'application/octet-stream');

(async()=>{
 const app=path.resolve(__dirname,'..'),dist=path.join(app,'dist');
 const upstream='http://127.0.0.1:4280',site='http://127.0.0.1:4281';
 const {securityHeaders}=await import(path.join(app,'../../services/sutra-api/worker.js'));
 const headers=securityHeaders({});
 assert.ok(fs.existsSync(path.join(dist,'index.html')),'built dist/index.html is required before CSP browser test');
 const staticServer=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  const relative=pathname==='/'?'index.html':decodeURIComponent(pathname).replace(/^\/+/, '');
  const file=path.resolve(dist,relative);
  if(!file.startsWith(dist+path.sep)&&file!==path.join(dist,'index.html')){res.writeHead(403);res.end();return;}
  try{
   const stat=fs.statSync(file);if(!stat.isFile())throw Error();
   res.writeHead(200,{'Content-Type':mime(file),'Content-Length':stat.size,'Cache-Control':'no-store'});
   fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('not found');}
 });
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
  await new Promise((resolve,reject)=>staticServer.once('error',reject).listen(4280,'127.0.0.1',resolve));
  await new Promise((resolve,reject)=>proxy.once('error',reject).listen(4281,'127.0.0.1',resolve));
  assert.equal((await fetch(upstream+'/index.html')).status,200);
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

  // Core built/browser-local features remain available under production headers.
  await page.getByRole('button',{name:'Check example',exact:true}).click();
  assert.match(await page.locator('#result').innerText(),/Catalog matched/);
  await page.getByRole('button',{name:'Run scripted network test'}).click();
  await page.waitForFunction(()=>document.querySelector('#network-result').textContent.includes('2 agent invocations; 3 scripted model steps.'));
  await page.getByRole('button',{name:'Load synthetic timing fixture'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Actual media duration: 8.0 seconds.'));
  assert.equal(await page.locator('video').count(),1);

  // Unexpected script and connection destinations are blocked by CSP before
  // browser transport. No routing abort is used to create this result.
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
  violations.push(...await page.evaluate(()=>window.__sutraCsp??[]));
  assert.equal(blockedRequests.length,0,'CSP stops unexpected third-party transport before request');
  assert.ok(violations.some(v=>v.directive==='script-src-elem'||v.directive==='script-src'));
  assert.ok(violations.some(v=>v.directive==='connect-src'));
  assert.ok(!errors.some(e=>!/Content Security Policy/i.test(e)),JSON.stringify(errors));

  console.log('PASS: built static SUTRA under Worker CSP preserves local graph/native media and blocks unexpected script/connect destinations before transport.');
 }finally{
  if(browser)await browser.close();
  await Promise.all([
   new Promise(resolve=>proxy.close(()=>resolve())),
   new Promise(resolve=>staticServer.close(()=>resolve()))
  ]);
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
