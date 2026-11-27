// Two independent Chromium sessions use the same real caller-owned directory.
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'../../..'),app=path.join(root,'apps/sutra-v2');
 const source=process.argv.includes('--source'),site=source?root:path.join(app,'dist');
 const url='http://127.0.0.1/',dir=await fs.mkdtemp(path.join(os.tmpdir(),'sutra-two-sessions-'));
 const {attachHistoryHost}=await import('../local-history.mjs');
 const {openDurableInvestigationHistory}=await import('../../../packages/sutra-knowledge/durable-investigation-history.mjs');
 const {livingFixture}=await import('../../../packages/sutra-knowledge/examples/living-investigation.mjs');
 const {createInvestigationHistory}=await import('../../../packages/sutra-knowledge/investigation-history.js');
 const parent=await livingFixture('finance'),portable=await createInvestigationHistory(parent.versionText,parent.digest);
 const snapshot=portable.snapshot(),host=await openDurableInvestigationHistory(dir);
 const browser=await chromium.launch({executablePath:process.env.SUTRA_TEST_CHROMIUM});
 const selector=id=>'#review-history-'+id;
 const click=(page,id)=>page.locator(selector(id)).click();
 const state=(page,value)=>page.waitForFunction(v=>document.querySelector('#review-history-durable-status').dataset.state===v&&!document.querySelector('#review-reset').disabled,value);
 const external=[],errors=[];
 try{
  const pages=[];
  for(let i=0;i<2;i++){
   const page=await browser.newPage({viewport:{width:320,height:780},reducedMotion:'reduce'});pages.push(page);
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{
    const address=new URL(route.request().url());
    if(address.origin!==new URL(url).origin){external.push(address.origin);return route.abort();}
    let name=address.pathname==='/'?(source?'apps/sutra-v2/index.html':'index.html'):address.pathname.slice(1);
    const file=path.resolve(site,name);
    if(!file.startsWith(site+path.sep))return route.abort();
    try{
     const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm'};
     let body=await fs.readFile(file);
     if(source&&name.endsWith('index.html'))body=body.toString().replace('./src/main.js','/apps/sutra-v2/src/reviewed-workspace.js').replace('</head>','<link rel="stylesheet" href="/apps/sutra-v2/src/style.css"></head>');
     await route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body});
    }catch{return route.fulfill({status:404,body:''});}
   });
   if(i===1)await attachHistoryHost(page,dir,url);
   else{
    await page.exposeFunction('faultHost',async(op,p)=>{
     if(op==='initialize_snapshot')return {ok:true,snapshot:await host.initializeSnapshot(p)};
     if(op==='append_snapshot'){await host.appendSnapshot(p);throw Error('lost reply after publication');}
     return {ok:true,snapshot:await host.read(p.expectedHistoryPin)};
    });
    await page.addInitScript(()=>{window.sutraHistoryHost={version:1,call:window.faultHost};});
   }
   await page.goto(url);
   await page.locator(selector('file')).evaluate(el=>{for(let d=el.closest('details');d;d=d.parentElement.closest('details'))d.open=true;});
   await page.locator(selector('durable-panel')).evaluate(el=>el.open=true);
   await page.locator(selector('file')).setInputFiles({name:'history.json',mimeType:'application/json',buffer:Buffer.from(snapshot.historyText)});
   await page.locator(selector('pin')).fill(snapshot.digest);
   await click(page,'import');
   await page.waitForFunction(pin=>document.querySelector('#review-history-digest').textContent===pin,snapshot.digest);
  }
  const [a,b]=pages;
  const start=performance.now();await click(a,'durable-initialize');await state(a,'ready');const saveMs=performance.now()-start;
  await b.locator(selector('durable-pin')).fill(snapshot.digest);
  const reading=performance.now();await click(b,'durable-read');await state(b,'ready');const loadMs=performance.now()-reading;
  for(const [i,page] of pages.entries()){
   await page.locator(selector('fork-name')).fill('session'+i);
   await click(page,'fork');
   await page.waitForFunction(pin=>document.querySelector('#review-history-digest').textContent!==pin,snapshot.digest);
  }
  const pinA=await a.locator(selector('digest')).innerText(),pinB=await b.locator(selector('digest')).innerText();
  const question='Unsent second-session evidence';
  await b.locator('#review-question').fill(question);
  await click(a,'durable-append');await state(a,'unknown');
  assert.equal(await a.locator(selector('durable-append')).isDisabled(),true);
  await click(b,'durable-append');await state(b,'stale');
  assert.equal(await b.locator(selector('digest')).innerText(),pinB);
  await click(a,'durable-check-attempt');await state(a,'ready');
  assert.equal(await a.locator(selector('durable-pin')).inputValue(),pinA);
  await b.locator(selector('durable-pin')).fill(pinA);await click(b,'durable-read');await state(b,'ready');
  assert.match(await b.locator(selector('durable-detail')).innerText(),/session1.*session0/s);
  await click(b,'durable-reload');await state(b,'recovered');
  assert.equal(await b.locator('#review-question').inputValue(),question);
  assert.equal(await b.locator(selector('digest')).innerText(),pinA);
  const download=b.waitForEvent('download');await click(b,'export');const bytes=await fs.readFile(await (await download).path());
  const replay=performance.now();
  const result=execFileSync('python3',['-c','import sys; from verify_investigation_history import verify; print(verify(sys.stdin.buffer.read(),sys.argv[1])["status"])',pinA],{cwd:path.join(root,'packages/sutra-knowledge/reference'),input:bytes}).toString().trim();
  assert.equal(result,'VERIFIED');
  const replayMs=performance.now()-replay;
  await b.locator(selector('durable-undo')).focus();await b.keyboard.press('Enter');await state(b,'local');
  assert.equal(await b.locator(selector('digest')).innerText(),pinB);
  assert.equal((await host.read(pinA)).digest,pinA);
  assert.deepEqual(await b.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0]);
  await b.evaluate(()=>document.documentElement.style.fontSize='200%');
  assert.ok(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log(JSON.stringify({versions:1,branches:2,bytes:bytes.length,saveMs,loadMs,replayMs,heapBytes:await b.evaluate(()=>performance.memory?.usedJSHeapSize??null)}));
 }finally{await browser.close();await fs.rm(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
