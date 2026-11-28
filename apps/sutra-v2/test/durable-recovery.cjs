// A separate browser context exercises the real offline launcher binding and
// one actual caller-owned Linux store. No remote requests or automatic writes.
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'../../..'),dist=path.join(root,'apps/sutra-v2/dist');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'sutra-real-recovery-')),url='http://127.0.0.1/?surface=debugger';
 const {attachHistoryHost}=await import('../local-history.mjs');
 const {openDurableInvestigationHistory}=await import('../../../packages/sutra-knowledge/durable-investigation-history.mjs');
 const {livingFixture}=await import('../../../packages/sutra-knowledge/examples/living-investigation.mjs');
 const {createInvestigationHistory,openInvestigationHistory}=await import('../../../packages/sutra-knowledge/investigation-history.js');
 let browser;
 try{
  const parent=await livingFixture('finance'),rootHistory=(await createInvestigationHistory(parent.versionText,parent.digest)).snapshot();
  const fork=async name=>{const h=await openInvestigationHistory(rootHistory.historyText,rootHistory.digest);return h.fork({expectedHistoryPin:rootHistory.digest,branch:name,fromDigest:parent.digest});};
  const saved=await fork('saved_session'),local=await fork('local_session');
  const store=await openDurableInvestigationHistory(directory);
  await store.initializeSnapshot({historyText:rootHistory.historyText,historyPin:rootHistory.digest});
  await store.appendSnapshot({expectedHistoryPin:rootHistory.digest,historyText:saved.historyText,historyPin:saved.digest});
  browser=await chromium.launch({executablePath:process.env.SUTRA_TEST_CHROMIUM});
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:360,height:800},reducedMotion:'reduce',acceptDownloads:true});
  const page=await context.newPage(),errors=[],unexpected=[];
  page.on('pageerror',e=>errors.push(e.message));
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json'};
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin!==new URL(url).origin||route.request().method()!=='GET'){unexpected.push(u.origin);return route.abort();}
   const file=path.resolve(dist,u.pathname==='/'?'index.html':'.'+u.pathname);
   if(!file.startsWith(dist+path.sep))return route.abort();
   try{return route.fulfill({contentType:types[path.extname(file)]??'application/octet-stream',body:await fs.readFile(file)});}catch{return route.fulfill({status:404,body:''});}
  });
  await attachHistoryHost(page,directory,url);await page.goto(url);
  const loc=id=>page.locator('#review-history-'+id),click=id=>loc(id).click();
  const state=value=>page.waitForFunction(v=>document.querySelector('#review-history-durable-status').dataset.state===v&&!document.querySelector('#review-reset').disabled,value);
  await loc('file').evaluate(e=>{for(let d=e.closest('details');d;d=d.parentElement.closest('details'))d.open=true;});
  await loc('durable-panel').evaluate(e=>e.open=true);
  await loc('file').setInputFiles({name:'local.json',mimeType:'application/json',buffer:Buffer.from(local.historyText)});
  await loc('pin').fill(local.digest);await click('import');await page.waitForFunction(p=>document.querySelector('#review-history-digest').textContent===p,pin(local));
  const question='Unpublished draft retained across history adoption';
  await page.locator('#review-question').fill(question);
  assert.equal(await loc('durable-reload').isDisabled(),true);
  await loc('durable-pin').fill(saved.digest);await click('durable-read');await state('ready');
  assert.equal(await loc('digest').innerText(),local.digest);
  assert.match(await loc('durable-detail').innerText(),/local_session.*saved_session/);
  await click('durable-reload');await state('recovered');assert.equal(await loc('digest').innerText(),saved.digest);
  assert.equal(await page.locator('#review-question').inputValue(),question);
  const download=page.waitForEvent('download');await click('export');const bytes=await fs.readFile(await (await download).path());
  assert.equal(execFileSync('python3',['-c','import sys; from verify_investigation_history import verify; print(verify(sys.stdin.buffer.read(),sys.argv[1])["status"])',saved.digest],{cwd:path.join(root,'packages/sutra-knowledge/reference'),input:bytes}).toString().trim(),'VERIFIED');
  await loc('durable-undo').focus();await page.keyboard.press('Enter');await state('local');
  assert.equal(await loc('digest').innerText(),local.digest);assert.equal(await page.locator('#review-question').inputValue(),question);
  assert.equal((await store.read(saved.digest)).digest,saved.digest);
  // A retained pin cannot be replaced by a self-consistent older HEAD.
  const head=path.join(directory,'HEAD'),savedFile=path.join(directory,'history-'+saved.digest.slice(7)+'.json');
  await fs.writeFile(head,rootHistory.digest+'\n');await click('durable-read');await state('stale');
  await fs.writeFile(head,saved.digest+'\n');await fs.rename(savedFile,savedFile+'.held');
  await click('durable-read');await state('refused');
  await fs.writeFile(savedFile,'{}');await click('durable-read');await state('refused');
  await fs.rename(savedFile+'.held',savedFile);await click('durable-read');await state('ready');
  assert.equal(await loc('digest').innerText(),local.digest);assert.equal(await page.locator('#review-question').inputValue(),question);
  // No private path, unknown operation, oversized payload or extra key admitted.
  const call=(op,payload)=>page.evaluate(([op,payload])=>window.sutraHistoryHost.call(op,payload),[op,payload]);
  assert.deepEqual(await call('delete',{expectedHistoryPin:saved.digest}),{ok:false,error:'HISTORY_HOST_OPERATION'});
  assert.deepEqual(await call('read_snapshot',{expectedHistoryPin:saved.digest,path:directory}),{ok:false,error:'HISTORY_HOST_PAYLOAD'});
  assert.deepEqual(await call('initialize_snapshot',{historyText:'x'.repeat(262145),historyPin:saved.digest}),{ok:false,error:'HISTORY_HOST_PAYLOAD'});
  assert.equal((await store.read(saved.digest)).digest,saved.digest);
  await page.goto('http://127.0.0.1/?surface=other');
  assert.equal(await page.evaluate(()=>typeof window.sutraHistoryHost),'undefined');
  assert.deepEqual(await page.evaluate(p=>window.__sutraSavedHistory('read_snapshot',{expectedHistoryPin:p}),saved.digest),{ok:false,error:'HISTORY_HOST_ORIGIN'});
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  console.log('PASS actual offline history binding: explicit adoption/undo, draft retention, independent replay, rollback/corruption and malformed/origin refusal; no external contact.');
 }finally{await browser?.close();await fs.rm(directory,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
function pin(snapshot){return snapshot.digest;}
