const assert=require('node:assert/strict');
const {once}=require('node:events');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {chromium}=require('../../apps/sutra/node_modules/playwright');
(async()=>{
 const target=process.argv[2];if(!target)throw Error('Generated starter directory required');
 const {createSite}=await import(pathToFileURL(path.join(target,'serve.mjs')).href);
 const server=createSite();server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true});const page=await browser.newPage();
  const errors=[],external=[];page.on('pageerror',error=>{errors.push(error.message);console.error('Browser page error:',error.message);});page.on('response',r=>{if(r.status()>=400)console.error('HTTP failure:',r.status(),new URL(r.url()).pathname);});page.on('request',r=>{if(new URL(r.url()).origin!==origin)external.push(r.url());});
  await page.goto(origin);await page.getByRole('button',{name:'Run two-agent example'}).click();
  await page.getByText('Scripted example completed; no live AI.',{exact:true}).waitFor({timeout:15000});
  assert.match(await page.locator('#result').textContent(),/No live AI/);
  await page.getByRole('button',{name:'Prepare local acknowledgement'}).click();
  assert.match(await page.locator('#status').textContent(),/Proposed:/);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByText('Cancelled; no action executed.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Confirm acknowledgement'}).isDisabled(),true);
  await page.getByRole('button',{name:'Prepare local acknowledgement'}).click();
  await page.getByRole('button',{name:'Confirm acknowledgement'}).click();
  await page.getByText('Local acknowledgement completed.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Confirm acknowledgement'}).isDisabled(),true);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS standalone Chromium: two-agent execution, prepare/cancel/confirm, no external requests or page errors');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
