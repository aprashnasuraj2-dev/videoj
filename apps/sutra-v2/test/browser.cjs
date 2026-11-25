// Built app, real Chromium, local loopback HTTP. Not deployment or physical device evidence.
const {createRequire}=require('node:module');
const path=require('node:path'),fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
const requireLegacy=createRequire(path.resolve(__dirname,'../../sutra/package.json'));
const {chromium}=requireLegacy('playwright');
const dist=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
(async()=>{
 const server=http.createServer((req,res)=>{
  try{
   const pathname=new URL(req.url,'http://localhost').pathname;
   const file=pathname==='/'?path.join(dist,'index.html'):path.resolve(dist,'.'+decodeURIComponent(pathname));
   if(!file.startsWith(dist+path.sep)||!fs.statSync(file).isFile()||!mime[path.extname(file)])throw Error('missing');
   res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'",'Referrer-Policy':'no-referrer'});res.end(fs.readFileSync(file));
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin+'/'))external.push(r.url());});
  await page.goto(origin);
  await page.getByRole('button',{name:'Evaluate graph'}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#verdict').dataset.verdict==='constraint_satisfied');
  assert.equal(await page.locator('#deflection').innerText(),'3.70 mm');assert.equal(await page.locator('#counts').innerText(),'16 / 0');
  const before=await page.locator('#identity').innerText();
  await page.getByLabel('Declared stiffness').selectOption('2500000000');
  assert.equal(await page.locator('#verdict').innerText(),'—');assert.equal(await page.locator('#download').isDisabled(),true);
  await page.getByRole('button',{name:'Evaluate graph'}).click();
  await page.waitForFunction(()=>document.querySelector('#verdict').dataset.verdict==='constraint_refuted');
  assert.equal(await page.locator('#deflection').innerText(),'14.81 mm');assert.equal(await page.locator('#counts').innerText(),'5 / 11');
  assert.equal(await page.locator('.node[data-work="executed"]').count(),5);assert.notEqual(await page.locator('#identity').innerText(),before);
  await page.getByRole('button',{name:'Compare two methods'}).click();await page.waitForFunction(()=>document.querySelector('#method-status').textContent.startsWith('Exact agreement'));
  await page.getByRole('button',{name:'Run scripted proof planner'}).click();await page.waitForFunction(()=>document.querySelector('#agent-status').dataset.state==='completed');
  assert.match(await page.locator('#agent-status').innerText(),/2 agent invocations · 3 scripted steps.*constraint_refuted/);
  await page.getByRole('button',{name:'Challenge forged verdict'}).click();await page.waitForFunction(()=>document.querySelector('#agent-status').dataset.state==='refused');
  await page.getByRole('button',{name:'Replay exact report'}).click();await page.waitForFunction(()=>document.querySelector('#replay-status').dataset.state==='reproduced');
  await page.getByRole('button',{name:'Challenge tampered report'}).click();await page.waitForFunction(()=>document.querySelector('#replay-status').dataset.state==='refused');
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download graph + report'}).click();
  const download=await downloadPromise;assert.equal(download.suggestedFilename(),'sutra-proof.json');const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(JSON.parse(exported.reportText).graphDigest,await page.locator('#identity').innerText());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  const output=path.resolve(__dirname,'../test-output');fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,'workspace.png'),fullPage:true});
  fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(exported,null,2));
  console.log('PASS: built browser workspace, 360px keyboard baseline, revision 5/11, two method comparison, pinned two-agent scripted proposal, forged verdict refused, report replay/tamper, exported actual bytes, zero external requests.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
