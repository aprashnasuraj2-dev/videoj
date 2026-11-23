const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const app=path.resolve(__dirname,'..');const base='http://127.0.0.1:4183';
 const server=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','4183','--strictPort'],{cwd:app,stdio:'pipe'});
 let browser;let exited=false;server.on('exit',()=>exited=true);
 try{
  let ready=false;for(let i=0;i<60;i++){if(exited)throw Error('Preview exited before readiness');try{const r=await fetch(base,{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready,'preview ready');
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:1050}});const errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base+'/'))external.push(r.url());});
  await page.goto(base);await page.getByRole('heading',{name:'Find the moment. Keep the evidence.'}).waitFor();
  await page.getByRole('button',{name:'Check example',exact:true}).click();assert.match(await page.locator('#result').innerText(),/Catalog matched/);assert.match(await page.locator('#result').innerText(),/Factual truth has not been checked/);
  await page.getByRole('button',{name:'Try altered quotation'}).click();assert.match(await page.locator('#result').innerText(),/QUOTE_MISMATCH/);
  await page.locator('#cue').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#cue').getAttribute('aria-pressed'),'true');
  fs.mkdirSync(path.join(app,'test-output'),{recursive:true});await page.screenshot({path:path.join(app,'test-output/desktop.png'),fullPage:true});
  await page.setViewportSize({width:360,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.getByRole('button',{name:'Try altered quotation'}).click();assert.match(await page.locator('#result').innerText(),/QUOTE_MISMATCH/);
  await page.screenshot({path:path.join(app,'test-output/mobile.png'),fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS: catalog match, truth boundary, rejection, keyboard, 360px interaction/overflow, no errors and no external requests.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
