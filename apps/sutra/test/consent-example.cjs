const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const repo=path.resolve(__dirname,'../../..'),root=path.join(repo,'packages/sutra-consent'),base='http://127.0.0.1:4184';
 const vite=path.join(repo,'apps/sutra/node_modules/vite/bin/vite.js');
 const server=spawn(process.execPath,[vite,'--host','127.0.0.1','--port','4184','--strictPort'],{cwd:root,stdio:'pipe'});
 let browser,exited=false,serverLog='';for(const output of [server.stdout,server.stderr])output.on('data',data=>{serverLog=(serverLog+data.toString()).slice(-8000);});server.on('exit',()=>exited=true);
 try{
  let ready=false;for(let i=0;i<60;i++){if(exited)throw Error('Consent example server exited: '+serverLog);try{const r=await fetch(base+'/examples/');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready,'consent example ready');
  browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base+'/'))external.push(r.url());});
  await page.goto(base+'/examples/');await page.getByRole('heading',{name:'Consent inspector example'}).waitFor();
  await page.getByRole('button',{name:'Inspect contact'}).click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('Denied before transport'));assert.match(await page.locator('#result').innerText(),/count: 0/);assert.deepEqual(external,[]);
  await page.locator('#decision').selectOption('session');await page.getByRole('button',{name:'Inspect contact'}).click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('count: 1'));assert.match(await page.locator('#intent').innerText(),/peer\.example/);assert.match(await page.locator('#intent').innerText(),/network name/);
  await page.getByRole('button',{name:'Inspect contact'}).click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('count: 2'));assert.match(await page.locator('#result').innerText(),/remembered/);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  console.log('PASS: standalone consent example denies before transport, remembers explicit exact session approval and emits no third-party requests.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
