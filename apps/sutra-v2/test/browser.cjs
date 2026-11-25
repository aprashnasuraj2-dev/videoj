// Built app, real Chromium, local loopback HTTP. Not deployment or physical device evidence.
const {createRequire}=require('node:module');
const path=require('node:path'),fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
const requireLegacy=createRequire(path.resolve(__dirname,'../../sutra/package.json'));
const {chromium}=requireLegacy('playwright');
const dist=path.resolve(__dirname,'../dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.txt':'text/plain','.mp4':'video/mp4','.wasm':'application/wasm','.pyz':'application/zip','.sha256':'text/plain'};
(async()=>{
 const peerRoot=path.resolve(__dirname,'../peer'),peerRequests=[];
 const peer=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;peerRequests.push({path:pathname,method:req.method,headers:req.headers});
  const file=path.resolve(peerRoot,'.'+pathname);
  if(!file.startsWith(peerRoot+path.sep)||!fs.existsSync(file)||!file.endsWith('.json')){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>peer.listen(0,'127.0.0.1',resolve));
 const peerOrigin='http://127.0.0.1:'+peer.address().port;
 const {assertV2StaticHeaders,rootStaticPolicy}=await import('../static-headers.mjs');
 const packagedPolicy=rootStaticPolicy(assertV2StaticHeaders(fs.readFileSync(path.join(dist,'_headers'),'utf8')));
 const browserPolicy=packagedPolicy.replace("connect-src 'self';","connect-src 'self' "+peerOrigin+";");
 const legacyPolicy=packagedPolicy.replace(" 'wasm-unsafe-eval'","");
 // External script, not DevTools evaluation: CSP must govern actual compilation.
 const probeScript="(async()=>{let wasm=false,js=false;try{await WebAssembly.compile(await (await fetch('/support-lattice.wasm')).arrayBuffer());wasm=true}catch{}try{new Function('return 1')();js=true}catch{}document.body.dataset.result=JSON.stringify({wasm,js})})()";
 const server=http.createServer((req,res)=>{
  try{
   const pathname=new URL(req.url,'http://localhost').pathname;
   if(pathname==='/__csp_probe_v2'||pathname==='/__csp_probe_v1'){
    res.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':pathname.endsWith('v2')?packagedPolicy:legacyPolicy,'Cache-Control':'no-store'});
    res.end('<!doctype html><body><script src="/__csp_probe.js"></script></body>');return;
   }
   if(pathname==='/__csp_probe.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(probeScript);return;}
   const file=pathname==='/'?path.join(dist,'index.html'):path.resolve(dist,'.'+decodeURIComponent(pathname));
   if(!file.startsWith(dist+path.sep)||!fs.statSync(file).isFile()||!mime[path.extname(file)])throw Error('missing');
   res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store','Content-Security-Policy':browserPolicy,'Referrer-Policy':'no-referrer'});res.end(fs.readFileSync(file));
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const probe=await browser.newPage();
  for(const [suffix,expected] of [['v1',{wasm:false,js:false}],['v2',{wasm:true,js:false}]]){
   await probe.goto(origin+'/__csp_probe_'+suffix);
   await probe.waitForFunction(()=>Boolean(document.body.dataset.result));
   assert.deepEqual(JSON.parse(await probe.locator('body').getAttribute('data-result')),expected);
  }
  await probe.close();
  const page=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{const u=new URL(r.url());if(u.protocol==='blob:'&&u.origin===origin)return;if(u.origin!==origin||u.protocol!=='http:')external.push(r.url());});
  await page.goto(origin);await page.locator('#engineering-labs > summary').click();
  // Nontechnical multi-provider setup lab: two ephemeral profiles, no network,
  // no credential left in the DOM after submission, and local routing only.
  const providerKey=page.getByLabel('Test credential'),providerName=page.getByLabel('Profile name');
  const alphaSecret='BROWSER_TEST_ALPHA_83f29c',betaSecret='BROWSER_TEST_BETA_a901d2';
  await providerName.fill('Work AI');await page.getByLabel('Session call cap').selectOption('1');await page.getByLabel('Reserved output budget').selectOption('256');await providerKey.fill(alphaSecret);
  await page.getByRole('button',{name:'Show'}).click();assert.equal(await providerKey.getAttribute('type'),'text');
  await page.getByRole('button',{name:'Hide'}).click();assert.equal(await providerKey.getAttribute('type'),'password');
  await page.getByRole('button',{name:'Add provider profile'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-count').textContent==='1');
  assert.equal(await providerKey.inputValue(),'');assert.equal((await page.locator('body').innerText()).includes(alphaSecret),false);
  await page.getByLabel('Provider',{exact:true}).selectOption('provider-b');await providerName.fill('Research AI');await page.getByLabel('Session call cap').selectOption('3');await page.getByLabel('Reserved output budget').selectOption('600');await providerKey.fill(betaSecret);
  await page.getByRole('button',{name:'Add provider profile'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-count').textContent==='2');
  assert.equal(await providerKey.inputValue(),'');assert.equal((await page.locator('body').innerText()).includes(betaSecret),false);
  assert.equal(await page.locator('.provider-card').count(),2);
  const [providerExport]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export safe summary'}).click()]);
  const providerExportText=fs.readFileSync(await providerExport.path(),'utf8');
  const providerExportJson=JSON.parse(providerExportText);
  assert.equal(providerExportJson.version,'sutra-provider-workspace-summary-v1');assert.equal(providerExportJson.profiles.length,2);
  assert.equal(providerExportText.includes(alphaSecret),false);assert.equal(providerExportText.includes(betaSecret),false);
  assert.equal(providerExportText.includes('credential'),false);assert.equal(providerExportText.includes('handle'),false);
  await page.getByRole('button',{name:'Run local rehearsal'}).first().click();
  await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='complete');
  assert.equal(await page.locator('#provider-calls').innerText(),'1');assert.equal(await page.locator('#provider-active').innerText(),'0');
  assert.match(await page.locator('#provider-status').innerText(),/No LLM request was sent/);
  assert.match(await page.locator('.provider-card').first().innerText(),/1 \/ 1 calls/);
  await page.getByRole('button',{name:'Run local rehearsal'}).first().click();
  await page.waitForFunction(()=>document.querySelector('#provider-status').dataset.state==='refused');
  assert.equal(await page.locator('#provider-calls').innerText(),'1');
  await page.locator('.provider-card').nth(1).getByRole('button',{name:'Remove'}).click();
  await page.waitForFunction(()=>document.querySelector('#provider-count').textContent==='1');
  assert.equal(await page.locator('.provider-card').count(),1);
  assert.equal((await page.locator('body').innerText()).includes(alphaSecret),false);assert.equal((await page.locator('body').innerText()).includes(betaSecret),false);
  assert.equal((await page.locator('html').evaluate(el=>el.outerHTML)).includes(alphaSecret),false);
  assert.equal((await page.locator('html').evaluate(el=>el.outerHTML)).includes(betaSecret),false);
  assert.deepEqual(await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)})),{local:[],session:[]});
  if(await page.evaluate(()=>typeof indexedDB.databases==='function'))assert.deepEqual(await page.evaluate(async()=>await indexedDB.databases()),[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
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
  for(const [fixture,expected] of [['unit_equivalent','equal_declared_quantities'],['torque_energy','incomparable_declared_scope'],['scope_changed','incomparable_declared_scope'],['same_scope_disagreement','different_declared_quantities']]){
   await page.getByLabel('Comparison challenge').selectOption(fixture);
   assert.equal(await page.locator('#scope-result').innerText(),'—');
   await page.getByRole('button',{name:'Check compatibility'}).click();
   await page.waitForFunction(s=>document.querySelector('#scope-result').dataset.state===s,expected);
  }
  await page.getByRole('button',{name:'Compute observation strategy'}).click();
  await page.waitForFunction(()=>document.querySelector('#frontier-status').dataset.state==='conditional_observation_plan');
  assert.match(await page.locator('#frontier-status').innerText(),/Best-case 2 · worst-case 7/);
  await page.getByRole('button',{name:'Remove decisive observations'}).click();
  await page.waitForFunction(()=>document.querySelector('#frontier-status').dataset.state==='insufficient_observations');
  assert.match(await page.locator('#frontier-status').innerText(),/high_heavy from high_light/);
  await page.getByLabel('Your prediction').selectOption('not_before');
  await page.getByRole('button',{name:'Plan investigation'}).click();
  await page.waitForFunction(()=>document.querySelector('#learn-status').dataset.state==='planned');
  assert.equal(await page.locator('#learn-worlds article').count(),2);
  await page.getByRole('button',{name:'Read decisive cue'}).click();
  await page.waitForFunction(()=>document.querySelector('#learn-status').dataset.state==='catalog_question_resolved');
  assert.match(await page.locator('#learn-status').innerText(),/prediction revised/);
  assert.equal(await page.locator('#learn-worlds article').count(),1);
  assert.match(await page.locator('#learn-evidence').innerText(),/2–4 s/);
  await page.getByRole('button',{name:'Inspect source video at cue'}).click();
  await page.waitForFunction(()=>document.querySelector('#learn-media-status').dataset.state==='cue_reached',{},{timeout:20000});
  assert.ok(await page.locator('#learn-video').evaluate(v=>v.currentSrc.startsWith('blob:')&&v.currentTime>=2&&v.currentTime<4));
  const learnerDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export learning evidence'}).click();
  const ld=await learnerDownload;const learning=JSON.parse(fs.readFileSync(await ld.path(),'utf8'));
  assert.equal(learning.result.evidence.level,'catalog_matched');assert.equal(learning.result.truthStatus,'unverified');
  assert.equal(learning.result.feedback,'prediction_revised');
  const output=path.resolve(__dirname,'../test-output');fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,'investigation.png'),fullPage:true});
  await page.getByLabel('Your prediction').selectOption('before');assert.equal(await page.locator('#learn-export').isDisabled(),true);
  assert.equal(await page.locator('#learn-video').isHidden(),true);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download graph + report'}).click();
  const download=await downloadPromise;assert.equal(download.suggestedFilename(),'sutra-proof.json');const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(JSON.parse(exported.reportText).graphDigest,await page.locator('#identity').innerText());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await page.getByLabel('Your adjusted-rate prediction').selectOption('a_higher');
  await page.getByRole('button',{name:'Plan subgroup investigation'}).click();
  await page.waitForFunction(()=>document.querySelector('#quiz-status').dataset.state==='planned');
  assert.equal(await page.locator('#quiz-cost').innerText(),'6');
  const peerUrl=page.getByLabel('Observation peer network URL');
  async function choose(name,allow){
   await peerUrl.fill(peerOrigin+'/agents/'+name);
   await page.getByRole('button',{name:'Discover observation peer'}).click();
   await page.getByRole('dialog',{name:'Approve public artifact access?'}).waitFor();
   assert.match(await page.locator('#quiz-consent-url').innerText(),/agent-manifest.json$/);
   if(!allow){await page.getByRole('button',{name:'Deny observation contact'}).click();return;}
   await page.getByRole('button',{name:'Allow observation GET once'}).click();
   await page.getByRole('dialog',{name:'Approve public artifact access?'}).waitFor();
   await page.waitForFunction(n=>document.querySelector('#quiz-consent-url').textContent.endsWith(n+'.network.json'),name);
   await page.getByRole('button',{name:'Allow observation GET once'}).click();
  }
  await choose('group_sizes',false);
  await page.waitForFunction(()=>document.querySelector('#quiz-peer-status').dataset.state==='refused');
  assert.equal(peerRequests.length,0);
  await choose('group_sizes',true);
  await page.waitForFunction(()=>document.querySelector('#quiz-peer-status').dataset.state==='improved');
  assert.equal(await page.locator('#quiz-cost').innerText(),'2');assert.equal(await page.locator('#quiz-next').innerText(),'a_beginner_n');
  await choose('aggregate_only',true);
  await page.waitForFunction(()=>document.querySelector('#quiz-peer-status').dataset.state==='redundant');
  assert.equal(await page.locator('#quiz-cost').innerText(),'2');
  await choose('forged_verdict',true);
  await page.waitForFunction(()=>document.querySelector('#quiz-peer-status').dataset.state==='refused');
  assert.equal(await page.locator('#quiz-cost').innerText(),'2');
  await page.getByRole('button',{name:'Read decisive subgroup evidence'}).click();
  await page.waitForFunction(()=>document.querySelector('#quiz-status').dataset.state==='conditional_question_resolved');
  assert.match(await page.locator('#quiz-evidence').innerText(),/Equal-weighted A 65% · B 73.125%/);
  await page.getByLabel('Choose interpretation').selectOption('causal');await page.getByRole('button',{name:'Check interpretation'}).click();
  assert.match(await page.locator('#quiz-transfer-status').innerText(),/^Reconsider/);
  await page.getByLabel('Choose interpretation').selectOption('standardized_only');await page.getByRole('button',{name:'Check interpretation'}).click();
  assert.match(await page.locator('#quiz-transfer-status').innerText(),/^Correct/);
  const quizDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export subgroup investigation'}).click();
  const quiz=JSON.parse(fs.readFileSync(await (await quizDownload).path(),'utf8'));
  assert.equal(quiz.result.truthStatus,'synthetic_model_only');assert.equal(quiz.result.answer,'not_a_higher');assert.equal(quiz.publishers.length,2);
  assert.equal(peerRequests.length,6);assert.ok(peerRequests.every(r=>r.method==='GET'&&!r.headers.cookie&&!r.headers.referer&&!r.headers.authorization));
  assert.ok(external.every(u=>new URL(u).origin===peerOrigin));assert.equal(external.length,6);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'quiz-evidence.json'),JSON.stringify(quiz,null,2));
  await page.getByRole('button',{name:'Simulate source withdrawal'}).click();
  await page.waitForFunction(()=>document.querySelector('#quiz-status').dataset.state==='evidence_withdrawn');
  assert.equal(await page.locator('#quiz-worlds').innerText(),'2');
  assert.equal(await page.locator('#quiz-observe').isDisabled(),true);
  assert.equal(await page.locator('#quiz-export').isDisabled(),true);
  assert.match(await page.locator('#quiz-history-status').innerText(),/balanced vs reversal/);
  const historyDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export withdrawal history'}).click();
  const history=JSON.parse(fs.readFileSync(await (await historyDownload).path(),'utf8'));
  assert.equal(history.current.sourceAvailable,false);assert.equal(history.current.plan.status,'insufficient_observations');
  assert.equal(history.prior.result.answer,'not_a_higher');
  fs.writeFileSync(path.join(output,'quiz-withdrawal.json'),JSON.stringify(history,null,2));
  await page.screenshot({path:path.join(output,'withdrawn-source.png'),fullPage:true});
  await page.getByRole('button',{name:'Restore source availability'}).click();
  await page.waitForFunction(()=>document.querySelector('#quiz-status').dataset.state==='planned');
  assert.equal(await page.locator('#quiz-cost').innerText(),'2');
  assert.equal(await page.locator('#quiz-export').isDisabled(),true);
  await page.getByRole('button',{name:'Read decisive subgroup evidence'}).click();
  await page.waitForFunction(()=>document.querySelector('#quiz-status').dataset.state==='conditional_question_resolved');
  assert.deepEqual(errors,[]);assert.equal(peerRequests.length,6);
  console.log('PASS: withdrawal restores two indistinguishable worlds, archives historical evidence, restore requires new read.');
  // Refuse the transition if the locally built module cannot load. No JS fallback.
  await page.route('**/support-lattice.wasm',route=>route.abort());
  await page.getByRole('button',{name:'Start conflict investigation'}).click();
  await page.waitForFunction(()=>document.querySelector('#conflict-status').dataset.state==='refused'&&!document.querySelector('#conflict-start').disabled);
  assert.equal(await page.locator('#conflict-support-export').isDisabled(),true);
  await page.unroute('**/support-lattice.wasm');
  await page.route('**/support-lattice.wasm',route=>route.fulfill({status:200,contentType:'application/wasm',body:Buffer.concat([fs.readFileSync(path.join(dist,'support-lattice.wasm')),Buffer.from([0])])}));
  await page.getByRole('button',{name:'Start conflict investigation'}).click();
  await page.waitForFunction(()=>document.querySelector('#conflict-status').dataset.error==='SUPPORT_MODULE_DIGEST'&&!document.querySelector('#conflict-start').disabled);
  assert.equal(await page.locator('#conflict-support-export').isDisabled(),true);
  await page.unroute('**/support-lattice.wasm');
  await page.getByRole('button',{name:'Start conflict investigation'}).click();
  await page.waitForFunction(()=>document.querySelector('#conflict-status').dataset.state==='conditional_observation_plan');
  await page.getByRole('button',{name:'Read first report'}).click();
  await page.waitForFunction(()=>document.querySelector('#conflict-reads').textContent==='1');
  await page.getByRole('button',{name:'Read copied report'}).click();
  await page.waitForFunction(()=>document.querySelector('#conflict-reads').textContent==='2');
  await page.getByRole('button',{name:'Read conflicting report'}).click();
  await page.waitForFunction(()=>document.querySelector('#conflict-status').dataset.state==='inconsistent_observations');
  assert.match(await page.locator('#conflict-status').innerText(),/read_a \+ read_b/);
  assert.match(await page.locator('#conflict-detail').innerText(),/sample_one: read_a, read_copy/);
  async function saveConflict(name){
   const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Export conflict investigation'}).click();
   const bundle=JSON.parse(fs.readFileSync(await (await dl).path(),'utf8'));fs.writeFileSync(path.join(output,name),JSON.stringify(bundle,null,2));return bundle;
  }
  const conflicting=await saveConflict('conflict-evidence.json');assert.deepEqual(conflicting.result.conflict,['read_a','read_b']);
  async function saveSupports(name){
   const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Export support analysis'}).click();
   const bundle=JSON.parse(fs.readFileSync(await (await dl).path(),'utf8'));
   fs.writeFileSync(path.join(output,name),JSON.stringify(bundle,null,2));return bundle;
  }
  const conflictSupports=await saveSupports('support-conflict.json');
  assert.deepEqual(conflictSupports.analysis.conflicts,[['read_a','read_b'],['read_b','read_copy']]);
  assert.deepEqual(conflictSupports.analysis.satisfiedSupports,[['read_a'],['read_copy']]);
  assert.deepEqual(conflictSupports.analysis.refutedSupports,[]);
  assert.deepEqual(conflictSupports.projection.observations,[{id:'read_a',mask:3},{id:'read_b',mask:12},{id:'read_copy',mask:3}]);
  assert.equal(conflictSupports.analysis.subsetsEvaluated,8);
  assert.match(await page.locator('#conflict-supports').innerText(),/diagnostic only; no current conclusion/);
  await page.screenshot({path:path.join(output,'conflicting-sources.png'),fullPage:true});
  await page.getByRole('button',{name:'Withdraw shared lineage'}).click();
  await page.waitForFunction(()=>document.querySelector('#conflict-status').dataset.state==='conditional_observation_plan');
  assert.equal(await page.locator('#conflict-worlds').innerText(),'2');assert.equal(await page.locator('#conflict-next').innerText(),'read_c');
  assert.equal(await page.locator('#conflict-a').isDisabled(),true);assert.equal(await page.locator('#conflict-copy').isDisabled(),true);
  const withdrawn=await saveConflict('conflict-withdrawn.json');assert.deepEqual(withdrawn.result.unavailableSources,['lab_a','lab_copy']);
  const withdrawnSupports=await saveSupports('support-withdrawn.json');
  assert.equal(withdrawnSupports.analysis.current,'ambiguous');
  assert.deepEqual(withdrawnSupports.analysis.conflicts,[]);
  assert.deepEqual(withdrawnSupports.analysis.satisfiedSupports,[]);
  assert.deepEqual(withdrawnSupports.analysis.refutedSupports,[]);
  assert.deepEqual(withdrawnSupports.projection.observations,[{id:'read_b',mask:12}]);
  await page.getByRole('button',{name:'Restore shared lineage'}).click();
  await page.waitForFunction(()=>!document.querySelector('#conflict-a').disabled);
  assert.equal(await page.locator('#conflict-reads').innerText(),'1');
  await page.getByRole('button',{name:'Read second variable'}).click();
  await page.waitForFunction(()=>document.querySelector('#conflict-status').dataset.state==='invariant_decision');
  assert.equal(await page.locator('#conflict-next').innerText(),'constraint_refuted');
  await saveConflict('conflict-resolved.json');
  const resolvedSupports=await saveSupports('support-resolved.json');
  assert.equal(resolvedSupports.analysis.current,'refuted');
  assert.deepEqual(resolvedSupports.analysis.refutedSupports,[['read_b','read_c']]);
  assert.deepEqual(resolvedSupports.analysis.survivingWorlds,['w11']);
  assert.deepEqual(resolvedSupports.projection.observations,[{id:'read_b',mask:12},{id:'read_c',mask:10}]);
  // Separate browser context: the flagship journey has no peer or AI contact.
  const debugPage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true});
  const debugErrors=[],debugExternal=[];debugPage.on('pageerror',e=>debugErrors.push(e.message));
  debugPage.on('request',r=>{if(new URL(r.url()).origin!==origin)debugExternal.push(r.url());});
  await debugPage.goto(origin);await debugPage.locator('#debug-manual > summary').click();
  async function clickDebug(id,state){
   await debugPage.locator('#debug-'+id).click();
   await debugPage.waitForFunction(s=>document.querySelector('#debug-state').dataset.state===s&&!document.querySelector('#debug-start').disabled,state);
  }
  async function saveDebug(name){
   const dl=debugPage.waitForEvent('download');await debugPage.locator('#debug-export').click();
   const bundle=JSON.parse(fs.readFileSync(await (await dl).path(),'utf8'));fs.writeFileSync(path.join(output,name),JSON.stringify(bundle,null,2));return bundle;
  }
  async function exportCapsule(stem){
   const dl=debugPage.waitForEvent('download');await debugPage.locator('#debug-capsule-export').click();
   const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,stem+'.json'),bytes);
   const pin=await debugPage.locator('#debug-capsule-pin').inputValue();assert.match(pin,/^sha256:[0-9a-f]{64}$/);
   const pinDl=debugPage.waitForEvent('download');await debugPage.locator('#debug-capsule-pin-export').click();
   assert.equal(fs.readFileSync(await (await pinDl).path(),'utf8'),pin+'\n');fs.writeFileSync(path.join(output,stem+'.sha256'),pin+'\n');
   return {bytes,pin};
  }
  async function capsuleClick(id,state){
   await debugPage.locator('#debug-capsule-'+id).click();
   await debugPage.waitForFunction(s=>document.querySelector('#debug-capsule-status').dataset.state===s&&!document.querySelector('#debug-start').disabled,state);
  }
  await clickDebug('start','SUPPORTED');
  const initialDebug=await saveDebug('debugger-baseline.json');
  assert.deepEqual(initialDebug.result.diagnostics.minimumCuts.map(x=>x.removed),[['sample_one']]);
  const oldCapsule=await exportCapsule('capsule-old');await capsuleClick('verify','verified');
  await clickDebug('withdraw','UNDERDETERMINED');
  assert.match(await debugPage.locator('#debug-capsule-context').innerText(),/Historical snapshot/);
  const lost=await saveDebug('debugger-withdrawn.json');assert.equal(lost.result.claims.control_ok.state,'SUPPORTED');
  await clickDebug('restore','SUPPORTED');
  await clickDebug('copies','SUPPORTED');
  const copiedDebug=await saveDebug('debugger-copied.json');assert.equal(copiedDebug.result.groups.sample_one.length,10);
  assert.deepEqual(copiedDebug.result.claims,initialDebug.result.claims);
  await clickDebug('disagree','CONFLICTED');
  const conflictDebug=await saveDebug('debugger-conflicted.json');
  assert.equal(conflictDebug.result.activeArtifacts.length,12);assert.deepEqual(conflictDebug.result.conflict,['read_a','read_b']);
  assert.equal(await debugPage.locator('#debug-roots').innerText(),'3');
  await debugPage.screenshot({path:path.join(output,'debugger-conflicted.png'),fullPage:false});
  await clickDebug('withdraw','UNDERDETERMINED');
  const repair=await saveDebug('debugger-repaired.json');assert.equal(repair.result.nextObservation.id,'read_c');
  await clickDebug('plan-observe','REFUTED');
  const resolvedDebug=await saveDebug('debugger-resolved.json');assert.deepEqual(resolvedDebug.result.claims.target.survivingWorlds,['w111']);
  const currentCapsule=await exportCapsule('capsule-current');await capsuleClick('verify','verified');
  await capsuleClick('tamper','refused');assert.match(await debugPage.locator('#debug-capsule-status').innerText(),/PIN_MISMATCH/);
  await capsuleClick('restore','verified');assert.match(await debugPage.locator('#debug-capsule-status').innerText(),/Refuted/);
  await debugPage.screenshot({path:path.join(output,'debugger-capsule.png'),fullPage:false});
  await clickDebug('control','REFUTED');assert.equal(await debugPage.locator('#debug-control-state').innerText(),'Underdetermined');
  assert.match(await debugPage.locator('#debug-capsule-context').innerText(),/Historical snapshot/);
  const verifierPage=await browser.newPage({viewport:{width:360,height:800}}),verifierErrors=[],verifierExternal=[];
  verifierPage.on('pageerror',e=>verifierErrors.push(e.message));verifierPage.on('request',r=>{if(new URL(r.url()).origin!==origin)verifierExternal.push(r.url());});
  await verifierPage.goto(origin);
  async function verifyFile(cap,pin,state){
   await verifierPage.locator('#debug-capsule-file').setInputFiles({name:'proof.json',mimeType:'application/json',buffer:cap.bytes});
   await verifierPage.locator('#debug-capsule-pin').fill(pin);
   await verifierPage.locator('#debug-capsule-verify').click();
   await verifierPage.waitForFunction(s=>document.querySelector('#debug-capsule-status').dataset.state===s&&!document.querySelector('#debug-capsule-file').disabled,state);
  }
  await verifyFile(currentCapsule,currentCapsule.pin,'verified');
  assert.match(await verifierPage.locator('#debug-capsule-context').innerText(),/No current conclusion loaded/);
  await verifyFile(oldCapsule,currentCapsule.pin,'refused');
  await verifyFile(oldCapsule,oldCapsule.pin,'verified');
  assert.match(await verifierPage.locator('#debug-capsule-status').innerText(),/Supported/);
  assert.deepEqual(verifierErrors,[]);assert.deepEqual(verifierExternal,[]);await verifierPage.close();
  console.log('PASS: exact proof capsule export and separate pin, byte tamper refusal, exact restoration, fresh-tab verification, historical-state counterexample.');
  assert.equal(await debugPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(debugErrors,[]);assert.deepEqual(debugExternal,[]);await debugPage.close();
  // Chromium limits repeated downloads in a single document in our test
  // environment. Keep every actual export and assertion, but run the
  // independent diagnosis journey in its own browser context.
  const diagnosisPage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),diagnosisErrors=[],diagnosisExternal=[];
  diagnosisPage.on('pageerror',e=>diagnosisErrors.push(e.message));diagnosisPage.on('request',r=>{if(new URL(r.url()).origin!==origin)diagnosisExternal.push(r.url());});
  await diagnosisPage.goto(origin);await diagnosisPage.locator('#debug-manual > summary').click();
  async function clickDiagnosis(id,state){
   await diagnosisPage.locator('#debug-'+id).click();
   await diagnosisPage.waitForFunction(s=>document.querySelector('#debug-state').dataset.state===s&&!document.querySelector('#debug-start').disabled,state);
  }
  async function saveExplanation(name){
   const dl=diagnosisPage.waitForEvent('download');await diagnosisPage.locator('#debug-explanation-export').click();
   const bundle=JSON.parse(fs.readFileSync(await (await dl).path(),'utf8'));fs.writeFileSync(path.join(output,name),JSON.stringify(bundle,null,2));return bundle.explanation;
  }
  await clickDiagnosis('start','SUPPORTED');await clickDiagnosis('withdraw','UNDERDETERMINED');
  const planExplanation=await saveExplanation('explanation-plan.json');assert.equal(planExplanation.next.observationId,'read_b');assert.equal(planExplanation.next.worstCost,4);
  assert.match(await diagnosisPage.locator('#debug-plan-observe').innerText(),/disagreeing measurement/);assert.equal(await diagnosisPage.locator('#debug-plan-branches p').count(),2);
  await clickDiagnosis('restore','SUPPORTED');await clickDiagnosis('copies','SUPPORTED');await clickDiagnosis('disagree','CONFLICTED');
  const conflictExplanation=await saveExplanation('explanation-conflict.json');assert.equal(conflictExplanation.claims.control_ok.globalState,'CONFLICTED');assert.deepEqual(conflictExplanation.claims.control_ok.conditionalSupport.map(x=>x.roots),[['sample_control']]);
  assert.match(await diagnosisPage.locator('[data-claim="control_ok"]').innerText(),/Conditional support: Separate control measurement/);
  await clickDiagnosis('observe','CONFLICTED');
  const opposite=await saveExplanation('explanation-opposite.json');assert.deepEqual(opposite.claims.target.conditionalRefutation.map(x=>x.roots),[['sample_three','sample_two']]);
  await clickDiagnosis('start','SUPPORTED');await clickDiagnosis('withdraw','UNDERDETERMINED');
  await clickDiagnosis('plan-observe','UNDERDETERMINED');assert.match(await diagnosisPage.locator('#debug-plan-observe').innerText(),/second variable/);
  await clickDiagnosis('withdraw-other','UNDERDETERMINED');
  const impossible=await saveExplanation('explanation-impossible.json');assert.equal(impossible.next.kind,'impossible_with_available_observations');
  assert.match(await diagnosisPage.locator('#debug-next').innerText(),/No available observation plan/);assert.equal(await diagnosisPage.locator('#debug-plan-observe').isDisabled(),true);
  assert.deepEqual(diagnosisErrors,[]);assert.deepEqual(diagnosisExternal,[]);await diagnosisPage.close();
  // Caller-pinned generalized finite case; separate context and actual downloads.
  const pinnedPage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),pinnedErrors=[],pinnedExternal=[];
  pinnedPage.on('pageerror',e=>pinnedErrors.push(e.message));pinnedPage.on('request',r=>{if(new URL(r.url()).origin!==origin)pinnedExternal.push(r.url());});
  await pinnedPage.goto(origin);await pinnedPage.locator('#pinned-workspace > summary').click();
  async function pinnedStep(action,state,stem){
   await pinnedPage.locator('#pinned-'+action).click();
   await pinnedPage.waitForFunction(s=>document.querySelector('#pinned-state').textContent===s&&!document.querySelector('#pinned-export').disabled,state);
   const dl=pinnedPage.waitForEvent('download');await pinnedPage.locator('#pinned-export').click();
   const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,stem+'.json'),bytes);
   return JSON.parse(bytes);
  }
  const pbase=await pinnedStep('example','UNDERDETERMINED','pinned-baseline');assert.equal(pbase.result.rootSummary.length,1);assert.equal(pbase.version,'sutra-aligned-investigation/v1');assert.equal(pbase.alignment.worldCount,6);assert.match(await pinnedPage.locator('#pinned-alignment').innerText(),/only input values vary/);assert.match(await pinnedPage.locator('#pinned-plan').innerText(),/20\/1/);assert.match(await pinnedPage.locator('#pinned-plan').innerText(),/40\/1/);
  async function saveAligned(stem){
   const dl=pinnedPage.waitForEvent('download');await pinnedPage.locator('#pinned-capsule-export').click();
   const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,stem+'.json'),bytes);
   const pin=await pinnedPage.locator('#pinned-capsule-pin').inputValue(),casePin=await pinnedPage.locator('#pinned-capsule-case-pin').inputValue();
   assert.equal(pin,'sha256:'+require('node:crypto').createHash('sha256').update(bytes).digest('hex'));
   const pl=pinnedPage.waitForEvent('download');await pinnedPage.locator('#pinned-capsule-pin-export').click();
   const pinBytes=fs.readFileSync(await (await pl).path());assert.equal(pinBytes.toString(),pin+'\n');fs.writeFileSync(path.join(output,stem+'.sha256'),pinBytes);
   return {bytes,pin,casePin};
  }
  const oldAligned=await saveAligned('aligned-old');
  const pconflict=await pinnedStep('conflict','CONFLICTED','pinned-conflict');assert.equal(pconflict.result.repairs.length,2);
  await pinnedPage.locator('#pinned-range > summary').click();
  async function saveRange(stem,baseline,shared){
   await pinnedPage.locator('#pinned-range-observation').selectOption('read_meter');
   await pinnedPage.locator('#pinned-range-lower').fill('10/1');await pinnedPage.locator('#pinned-range-upper').fill('30/1');
   await pinnedPage.locator('#pinned-range-run').click();
   await pinnedPage.waitForFunction(()=>document.querySelector('#pinned-range-status').dataset.state==='ready'&&!document.querySelector('#pinned-range-export').disabled);
   assert.equal(await pinnedPage.locator('#pinned-state').innerText(),baseline);
   assert.match(await pinnedPage.locator('#pinned-range-single').innerText(),new RegExp(baseline));
   assert.match(await pinnedPage.locator('#pinned-range-shared').innerText(),new RegExp(shared));
   const dl=pinnedPage.waitForEvent('download');await pinnedPage.locator('#pinned-range-export').click();
   const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,stem+'.json'),bytes);
   const b=JSON.parse(bytes);assert.equal(b.result.baseline.state,baseline);assert.equal(b.result.shared.state,shared);assert.deepEqual(b.result.cohort,['read_meter','read_mirror']);
   return b;
  }
  await saveRange('measurement-conflict','CONFLICTED','SUPPORTED');
  const presolved=await pinnedStep('resolve','REFUTED','pinned-resolved');assert.deepEqual(presolved.result.minimum.refutation.map(x=>x.roots),[['capacity_root','meter_root']]);
  const measurement=await saveRange('measurement-resolved','REFUTED','UNDERDETERMINED');
  assert.deepEqual(measurement.result.shared.readmittedWorlds,['load_10_cap_20','load_20_cap_20']);
  assert.equal(measurement.result.shared.frontier.status,'insufficient_observations');
  await pinnedPage.locator('#pinned-range-lower').fill('31/1');
  assert.equal(await pinnedPage.locator('#pinned-range-export').isDisabled(),true);
  await pinnedPage.locator('#pinned-range-run').click();
  await pinnedPage.waitForFunction(()=>document.querySelector('#pinned-range-status').dataset.state==='refused');
  assert.equal(await pinnedPage.locator('#pinned-state').innerText(),'REFUTED');
  const currentAligned=await saveAligned('aligned-current');assert.equal(currentAligned.casePin,oldAligned.casePin);
  await pinnedPage.locator('#pinned-capsule-verify').click();await pinnedPage.waitForFunction(()=>document.querySelector('#pinned-capsule-status').dataset.state==='verified');
  assert.match(await pinnedPage.locator('#pinned-capsule-status').innerText(),/REFUTED/);
  assert.match(await pinnedPage.locator('#pinned-capsule-context').innerText(),/matches current investigation/);
  const alignedVerifier=await browser.newPage({viewport:{width:360,height:800}}),alignedErrors=[],alignedExternal=[];
  alignedVerifier.on('pageerror',e=>alignedErrors.push(e.message));alignedVerifier.on('request',r=>{if(new URL(r.url()).origin!==origin)alignedExternal.push(r.url());});
  await alignedVerifier.goto(origin);await alignedVerifier.locator('#pinned-workspace > summary').click();
  async function verifyAlignedFile(bytes,pin,casePin,status,detail){
   await alignedVerifier.locator('#pinned-capsule-file').setInputFiles({name:'snapshot.json',mimeType:'application/json',buffer:bytes});
   await alignedVerifier.locator('#pinned-capsule-pin').fill(pin);await alignedVerifier.locator('#pinned-capsule-case-pin').fill(casePin);
   await alignedVerifier.locator('#pinned-capsule-verify').click();
   await alignedVerifier.waitForFunction(s=>document.querySelector('#pinned-capsule-status').dataset.state===s&&!document.querySelector('#pinned-capsule-file').disabled,status);
   assert.ok((await alignedVerifier.locator('#pinned-capsule-status').innerText()).includes(detail));
   assert.equal(await alignedVerifier.locator('#pinned-result').isVisible(),false);
  }
  const alteredAligned=Buffer.from(currentAligned.bytes);alteredAligned[10]^=1;
  await verifyAlignedFile(alteredAligned,currentAligned.pin,currentAligned.casePin,'refused','PIN_MISMATCH');
  await verifyAlignedFile(currentAligned.bytes,currentAligned.pin,currentAligned.casePin,'verified','REFUTED');
  await verifyAlignedFile(oldAligned.bytes,currentAligned.pin,currentAligned.casePin,'refused','PIN_MISMATCH');
  await verifyAlignedFile(oldAligned.bytes,oldAligned.pin,oldAligned.casePin,'verified','UNDERDETERMINED');
  await verifyAlignedFile(currentAligned.bytes,currentAligned.pin,'sha256:'+'0'.repeat(64),'refused','CASE_PIN_MISMATCH');
  assert.deepEqual(alignedErrors,[]);assert.deepEqual(alignedExternal,[]);await alignedVerifier.close();
  await pinnedPage.locator('#pinned-case').fill(presolved.caseText+' ');
  assert.equal(await pinnedPage.locator('#pinned-export').isDisabled(),true);
  await pinnedPage.locator('#pinned-run').click();
  await pinnedPage.waitForFunction(()=>document.querySelector('#pinned-status').textContent.includes('CASE_PIN_MISMATCH'));
  assert.equal(await pinnedPage.locator('#pinned-result').isVisible(),false);
  assert.equal(await pinnedPage.locator('#pinned-export').isDisabled(),true);
  assert.match(await pinnedPage.locator('#pinned-capsule-context').innerText(),/no current investigation/);
  const driftCase=JSON.parse(presolved.caseText),driftGraph=JSON.parse(driftCase.worlds[0].graphText);
  driftGraph.nodes.find(n=>n.id==='target').op='ge';driftCase.worlds[0].graphText=JSON.stringify(driftGraph);
  const driftText=JSON.stringify(driftCase),driftPin='sha256:'+require('node:crypto').createHash('sha256').update(driftText).digest('hex');
  await pinnedPage.locator('#pinned-case').fill(driftText);await pinnedPage.locator('#pinned-pin').fill(driftPin);
  await pinnedPage.locator('#pinned-run').click();await pinnedPage.waitForFunction(()=>document.querySelector('#pinned-status').textContent.includes('CASE_GRAPH_ALIGNMENT'));
  assert.equal(await pinnedPage.locator('#pinned-export').isDisabled(),true);assert.equal(await pinnedPage.locator('#pinned-result').isVisible(),false);
  assert.deepEqual(pinnedErrors,[]);assert.deepEqual(pinnedExternal,[]);await pinnedPage.close();
  // Model coverage challenge: a compatible omitted world changes the
  // counterfactual, not the current case or its source admission.
  const coveragePage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),coverageErrors=[],coverageExternal=[];
  coveragePage.on('pageerror',e=>coverageErrors.push(e.message));coveragePage.on('request',r=>{if(new URL(r.url()).origin!==origin)coverageExternal.push(r.url());});
  await coveragePage.goto(origin);await coveragePage.locator('#pinned-workspace > summary').click();
  await coveragePage.locator('#pinned-coverage-example').click();
  await coveragePage.waitForFunction(()=>document.querySelector('#pinned-state').textContent==='SUPPORTED'&&!document.querySelector('#pinned-export').disabled);
  const originalCase=await coveragePage.locator('#pinned-case').inputValue(),originalEvents=await coveragePage.locator('#pinned-events').inputValue(),originalPin=await coveragePage.locator('#pinned-pin').inputValue();
  await coveragePage.locator('#pinned-coverage > summary').click();
  async function coverageExport(stem,expected){
   await coveragePage.locator('#pinned-coverage-run').click();
   await coveragePage.waitForFunction(()=>document.querySelector('#pinned-coverage-status').dataset.state==='ready'&&!document.querySelector('#pinned-coverage-export').disabled);
   assert.match(await coveragePage.locator('#pinned-coverage-variant').innerText(),new RegExp('SUPPORTED → '+expected));
   assert.equal(await coveragePage.locator('#pinned-state').innerText(),'SUPPORTED');
   assert.equal(await coveragePage.locator('#pinned-case').inputValue(),originalCase);assert.equal(await coveragePage.locator('#pinned-events').inputValue(),originalEvents);assert.equal(await coveragePage.locator('#pinned-pin').inputValue(),originalPin);
   const dl=coveragePage.waitForEvent('download');await coveragePage.locator('#pinned-coverage-export').click();
   const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,stem+'.json'),bytes);return JSON.parse(bytes);
  }
  const compatible=await coverageExport('coverage-compatible','UNDERDETERMINED');
  assert.equal(compatible.result.candidate.compatible,true);assert.equal(compatible.result.variant.frontier.plan.observationId,'read_capacity');
  await coveragePage.locator('#pinned-coverage-base').selectOption('load_30_cap_20');
  await coveragePage.locator('#pinned-coverage-input').selectOption('capacity');
  await coveragePage.locator('#pinned-coverage-value').fill('5');
  await coveragePage.locator('#pinned-coverage-id').fill('incompatible');
  const incompatible=await coverageExport('coverage-incompatible','SUPPORTED');
  assert.deepEqual(incompatible.result.candidate.blockers.map(x=>x.observationId),['read_alternate']);
  await coveragePage.locator('#pinned-coverage-value').fill('40/2');assert.equal(await coveragePage.locator('#pinned-coverage-export').isDisabled(),true);
  await coveragePage.locator('#pinned-coverage-run').click();await coveragePage.waitForFunction(()=>document.querySelector('#pinned-coverage-status').dataset.state==='refused');
  assert.equal(await coveragePage.locator('#pinned-state').innerText(),'SUPPORTED');
  assert.deepEqual(coverageErrors,[]);assert.deepEqual(coverageExternal,[]);await coveragePage.close();
  // Competing agent proposal: replay both histories; do not adopt either branch.
  const proposalPage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),proposalErrors=[],proposalExternal=[];
  proposalPage.on('pageerror',e=>proposalErrors.push(e.message));proposalPage.on('request',r=>{if(new URL(r.url()).origin!==origin)proposalExternal.push(r.url());});
  await proposalPage.goto(origin);await proposalPage.locator('#pinned-workspace > summary').click();
  await proposalPage.locator('#pinned-proposal-example').click();
  await proposalPage.waitForFunction(()=>document.querySelector('#pinned-state').textContent==='SUPPORTED'&&!document.querySelector('#pinned-export').disabled);
  const proposalOriginalCase=await proposalPage.locator('#pinned-case').inputValue(),proposalOriginalEvents=await proposalPage.locator('#pinned-events').inputValue(),proposalOriginalPin=await proposalPage.locator('#pinned-pin').inputValue();
  await proposalPage.locator('#pinned-proposal > summary').click();
  async function saveProposal(stem,matches){
   await proposalPage.locator('#pinned-proposal-run').click();
   await proposalPage.waitForFunction(()=>document.querySelector('#pinned-proposal-status').dataset.state==='ready'&&!document.querySelector('#pinned-proposal-export').disabled);
   assert.match(await proposalPage.locator('#pinned-proposal-claim').innerText(),matches?/CLAIM MATCHES REPLAY/:/CLAIM DOES NOT MATCH REPLAY/);
   assert.match(await proposalPage.locator('#pinned-proposal-history').innerText(),/1 shared initial events/);
   assert.equal(await proposalPage.locator('#pinned-state').innerText(),'SUPPORTED');
   assert.equal(await proposalPage.locator('#pinned-case').inputValue(),proposalOriginalCase);assert.equal(await proposalPage.locator('#pinned-events').inputValue(),proposalOriginalEvents);assert.equal(await proposalPage.locator('#pinned-pin').inputValue(),proposalOriginalPin);
   const dl=proposalPage.waitForEvent('download');await proposalPage.locator('#pinned-proposal-export').click();
   const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,stem+'.json'),bytes);return JSON.parse(bytes);
  }
  const oppositeProposal=await saveProposal('proposal-correct',true);
  assert.equal(oppositeProposal.result.comparison,'OPPOSITE_DECISIVE_STATES');assert.deepEqual(oppositeProposal.result.worlds.shared,[]);assert.equal(oppositeProposal.result.history.commonPrefix.state,'UNDERDETERMINED');
  const edited=JSON.parse(await proposalPage.locator('#pinned-proposal-text').inputValue());edited.claimedState='SUPPORTED';
  await proposalPage.locator('#pinned-proposal-text').fill(JSON.stringify(edited));assert.equal(await proposalPage.locator('#pinned-proposal-export').isDisabled(),true);
  const forged=await saveProposal('proposal-forged',false);assert.equal(forged.result.claim.recomputedState,'REFUTED');
  async function saveClash(stem,expected){
   await proposalPage.locator('#pinned-clash-run').click();await proposalPage.waitForFunction(()=>document.querySelector('#pinned-clash-status').dataset.state==='ready'&&!document.querySelector('#pinned-clash-export').disabled);
   assert.equal(await proposalPage.locator('#pinned-state').innerText(),'SUPPORTED');assert.equal(await proposalPage.locator('#pinned-events').inputValue(),proposalOriginalEvents);
   const dl=proposalPage.waitForEvent('download');await proposalPage.locator('#pinned-clash-export').click();const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,stem+'.json'),bytes);
   const r=JSON.parse(bytes).result;assert.equal(r.classification,expected);return r;
  }
  const crossClash=await saveClash('clash-cross','CROSS_BRANCH_CLASH');
  assert.deepEqual(crossClash.jointFinal.minimumObservationConflict,['read_alternate','read_meter']);assert.equal(crossClash.jointFinal.state,'CONFLICTED');
  edited.eventText=proposalOriginalEvents;edited.claimedState='REFUTED';await proposalPage.locator('#pinned-proposal-text').fill(JSON.stringify(edited));
  assert.equal(await proposalPage.locator('#pinned-clash-export').isDisabled(),true);assert.equal(await proposalPage.locator('#pinned-clash-run').isDisabled(),true);
  await proposalPage.locator('#pinned-proposal-run').click();await proposalPage.waitForFunction(()=>document.querySelector('#pinned-proposal-status').dataset.state==='ready'&&!document.querySelector('#pinned-clash-run').disabled);
  const compatibleClash=await saveClash('clash-compatible','JOINT_COMPATIBLE');assert.equal(compatibleClash.claim.matches,false);assert.equal(compatibleClash.jointFinal.state,'SUPPORTED');
  edited.caseDigest='sha256:'+'0'.repeat(64);await proposalPage.locator('#pinned-proposal-text').fill(JSON.stringify(edited));
  await proposalPage.locator('#pinned-proposal-run').click();await proposalPage.waitForFunction(()=>document.querySelector('#pinned-proposal-status').dataset.state==='refused');
  assert.equal(await proposalPage.locator('#pinned-proposal-export').isDisabled(),true);assert.equal(await proposalPage.locator('#pinned-state').innerText(),'SUPPORTED');
  assert.deepEqual(proposalErrors,[]);assert.deepEqual(proposalExternal,[]);await proposalPage.close();
  // Audit omitted combinations over observed values, not empirical independence.
  const gridPage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),gridErrors=[],gridExternal=[];
  gridPage.on('pageerror',e=>gridErrors.push(e.message));gridPage.on('request',r=>{if(new URL(r.url()).origin!==origin)gridExternal.push(r.url());});
  await gridPage.goto(origin);await gridPage.locator('#pinned-workspace > summary').click();await gridPage.locator('#pinned-grid-example').click();
  await gridPage.waitForFunction(()=>document.querySelector('#pinned-state').textContent==='SUPPORTED'&&!document.querySelector('#pinned-export').disabled);
  const gridCase=await gridPage.locator('#pinned-case').inputValue(),gridPin=await gridPage.locator('#pinned-pin').inputValue();
  await gridPage.locator('#pinned-coverage > summary').click();
  async function saveGrid(stem,expected){
   const history=await gridPage.locator('#pinned-events').inputValue();
   await gridPage.locator('#pinned-grid-run').click();await gridPage.waitForFunction(()=>document.querySelector('#pinned-grid-status').dataset.state==='ready'&&!document.querySelector('#pinned-grid-export').disabled);
   assert.match(await gridPage.locator('#pinned-grid-summary').innerText(),new RegExp('hypothetical closure '+expected));
   assert.equal(await gridPage.locator('#pinned-state').innerText(),'SUPPORTED');assert.equal(await gridPage.locator('#pinned-events').inputValue(),history);assert.equal(await gridPage.locator('#pinned-case').inputValue(),gridCase);assert.equal(await gridPage.locator('#pinned-pin').inputValue(),gridPin);
   const dl=gridPage.waitForEvent('download');await gridPage.locator('#pinned-grid-export').click();const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,stem+'.json'),bytes);return JSON.parse(bytes).result;
  }
  const gridCompatible=await saveGrid('grid-compatible','UNDERDETERMINED');assert.equal(gridCompatible.missingCount,'1');assert.equal(gridCompatible.candidates[0].compatible,true);
  await gridPage.locator('#pinned-events').fill(originalEvents);assert.equal(await gridPage.locator('#pinned-grid-export').isDisabled(),true);await gridPage.locator('#pinned-run').click();await gridPage.waitForFunction(()=>document.querySelector('#pinned-state').textContent==='SUPPORTED'&&!document.querySelector('#pinned-export').disabled);
  const gridExcluded=await saveGrid('grid-excluded','SUPPORTED');assert.equal(gridExcluded.candidates[0].compatible,false);assert.deepEqual(gridExcluded.candidates[0].blockers.map(x=>x.observationId),['read_alternate']);
  assert.deepEqual(gridErrors,[]);assert.deepEqual(gridExternal,[]);await gridPage.close();
  // Interaction-only reversal, exact export, and evidence-excluded counterexample.
  const contrastPage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),contrastErrors=[],contrastExternal=[];
  contrastPage.on('pageerror',e=>contrastErrors.push(e.message));contrastPage.on('request',r=>{if(new URL(r.url()).origin!==origin)contrastExternal.push(r.url());});
  await contrastPage.goto(origin);await contrastPage.locator('#pinned-workspace > summary').click();await contrastPage.locator('#pinned-contrast-example').click();
  await contrastPage.waitForFunction(()=>document.querySelector('#pinned-state').textContent==='SUPPORTED'&&!document.querySelector('#pinned-export').disabled);
  await contrastPage.locator('#pinned-coverage > summary').click();
  const contrastCase=await contrastPage.locator('#pinned-case').inputValue(),contrastPin=await contrastPage.locator('#pinned-pin').inputValue();
  async function saveContrast(stem,compatible){
   const history=await contrastPage.locator('#pinned-events').inputValue();
   await contrastPage.locator('#pinned-contrast-run').click();await contrastPage.waitForFunction(()=>document.querySelector('#pinned-contrast-status').dataset.state==='ready'&&!document.querySelector('#pinned-contrast-export').disabled);
   assert.match(await contrastPage.locator('#pinned-contrast-anchors').innerText(),/INTERACTION ONLY WITHIN OBSERVED DOMAINS/);
   assert.equal(await contrastPage.locator('#pinned-state').innerText(),'SUPPORTED');assert.equal(await contrastPage.locator('#pinned-events').inputValue(),history);assert.equal(await contrastPage.locator('#pinned-case').inputValue(),contrastCase);assert.equal(await contrastPage.locator('#pinned-pin').inputValue(),contrastPin);
   const dl=contrastPage.waitForEvent('download');await contrastPage.locator('#pinned-contrast-export').click();const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,stem+'.json'),bytes);
   const a=JSON.parse(bytes).result.anchors.find(x=>x.anchor.worldIds.includes('load_10_cap_20'));assert.equal(a.modelContrast.minimumChangedInputs,2);assert.equal(a.evidenceCompatibleContrast.count,compatible?1:0);assert.equal(a.evidenceExcludedContrast.count,compatible?0:1);assert.equal(a.modelContrast.minimalInterventions[0].origin,'hypothetical');
  }
  await saveContrast('contrast-compatible',true);
  await contrastPage.locator('#pinned-events').fill(originalEvents);assert.equal(await contrastPage.locator('#pinned-contrast-export').isDisabled(),true);await contrastPage.locator('#pinned-run').click();await contrastPage.waitForFunction(()=>document.querySelector('#pinned-state').textContent==='SUPPORTED'&&!document.querySelector('#pinned-export').disabled);
  await saveContrast('contrast-excluded',false);assert.deepEqual(contrastErrors,[]);assert.deepEqual(contrastExternal,[]);await contrastPage.close();
  // Real reported cash-flow fields; the proxy is a declared calculation, not an investment recommendation.
  const financePage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),financeErrors=[],financeExternal=[];
  financePage.on('pageerror',e=>financeErrors.push(e.message));financePage.on('request',r=>{if(new URL(r.url()).origin!==origin)financeExternal.push(r.url());});
  await financePage.goto(origin);await financePage.locator('#pinned-workspace > summary').click();
  async function financeStep(button,stem,state,count,roots){
   await financePage.locator('#pinned-'+button).click();
   await financePage.waitForFunction(s=>document.querySelector('#pinned-state').textContent===s&&!document.querySelector('#pinned-export').disabled,state);
   assert.equal(await financePage.locator('#pinned-worlds').innerText(),count+' / 4');assert.equal(await financePage.locator('#pinned-roots').innerText(),String(roots));
   assert.equal(await financePage.locator('#pinned-finance-detail').isVisible(),true);
   const dl=financePage.waitForEvent('download');await financePage.locator('#pinned-export').click();const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,'finance-'+stem+'.json'),bytes);
   return JSON.parse(bytes).result;
  }
  await financeStep('finance-example','baseline','UNDERDETERMINED',4,0);
  await financeStep('finance-ocf','ocf','UNDERDETERMINED',2,1);
  const financeFull=await financeStep('finance-full','full','REFUTED',1,1);assert.equal(financeFull.report.activeEvidence.length,6);assert.match(await financePage.locator('#pinned-finance-explanation').innerText(),/66,987/);assert.match(await financePage.locator('#pinned-finance-explanation').innerText(),/111,324/);assert.match(await financePage.locator('#pinned-finance-explanation').innerText(),/4,624/);
  await financeStep('finance-withdraw','withdrawn','UNDERDETERMINED',4,0);assert.deepEqual(financeErrors,[]);assert.deepEqual(financeExternal,[]);await financePage.close();
  // Historical study: descriptive scope attack, interval distinction, version drift.
  const trialPage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),trialErrors=[],trialExternal=[];
  trialPage.on('pageerror',e=>trialErrors.push(e.message));trialPage.on('request',r=>{if(new URL(r.url()).origin!==origin)trialExternal.push(r.url());});
  await trialPage.goto(origin);await trialPage.locator('#trial-lab > summary').click();
  async function trialStep(button,stem,pattern){
   await trialPage.locator('#trial-'+button).click();await trialPage.waitForFunction(()=>document.querySelector('#trial-status').dataset.state==='ready'&&!document.querySelector('#trial-export').disabled);
   assert.match(await trialPage.locator('#trial-summary').innerText(),pattern);
   const dl=trialPage.waitForEvent('download');await trialPage.locator('#trial-export').click();const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,'trial-'+stem+'.json'),bytes);const pd=trialPage.waitForEvent('download');await trialPage.locator('#trial-pin-export').click();const pinBytes=fs.readFileSync(await (await pd).path());fs.writeFileSync(path.join(output,'trial-'+stem+'.sha256'),pinBytes);assert.equal(pinBytes.toString('ascii').trim(),'sha256:'+require('node:crypto').createHash('sha256').update(bytes).digest('hex'));return JSON.parse(bytes);
  }
  const trialAggregate=await trialStep('aggregate','aggregate',/NOT TESTED/);assert.equal(trialAggregate.result.rows.length,1);
  const trialPartition=await trialStep('partition','partition',/REFUTED in declared partition/);assert.deepEqual(trialPartition.result.descriptiveCounterexamples,['no_respiratory_support']);assert.equal(trialPartition.result.rows[3].reportedAdjusted.intervalPosition,'INCLUDES_NULL');
  assert.match(await trialPage.locator('#trial-rows').innerText(),/includes null/);
  const trialComparison=await trialStep('compare','comparison',/not independent replication/);assert.equal(trialComparison.result.changes.length,1);assert.match(await trialPage.locator('#trial-rows').innerText(),/0\.91 → 0\.92/);
  assert.deepEqual(trialErrors,[]);assert.deepEqual(trialExternal,[]);await trialPage.close();
  // Untrusted proposal admission: missing input, forged numeric leaf, exact complete arithmetic.
  const compilerPage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),compilerErrors=[],compilerExternal=[];
  compilerPage.on('pageerror',e=>compilerErrors.push(e.message));compilerPage.on('request',r=>{if(new URL(r.url()).origin!==origin)compilerExternal.push(r.url());});
  await compilerPage.goto(origin);await compilerPage.locator('#compiler-lab > summary').click();
  async function compilerLoad(kind){await compilerPage.locator('#compiler-'+kind).click();await compilerPage.waitForFunction(()=>document.querySelector('#compiler-status').dataset.state==='loaded'&&!document.querySelector('#compiler-run').disabled);}
  async function compilerRun(stem,pattern){
   await compilerPage.locator('#compiler-run').click();await compilerPage.waitForFunction(()=>document.querySelector('#compiler-status').dataset.state==='ready'&&!document.querySelector('#compiler-export').disabled);
   assert.match(await compilerPage.locator('#compiler-summary').innerText(),pattern);
   const dl=compilerPage.waitForEvent('download');await compilerPage.locator('#compiler-export').click();const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,'compiler-'+stem+'.json'),bytes);return JSON.parse(bytes);
  }
  await compilerLoad('missing');const compilerMissing=await compilerRun('missing',/BLOCKED MISSING INPUT/);assert.deepEqual(compilerMissing.result.target.missing,['ppe26']);assert.match(await compilerPage.locator('#compiler-nodes').innerText(),/71611\/1/);
  const forgedCompiler=JSON.parse(await compilerPage.locator('#compiler-proposal').inputValue());forgedCompiler.nodes[0].value='999';await compilerPage.locator('#compiler-proposal').fill(JSON.stringify(forgedCompiler));assert.equal(await compilerPage.locator('#compiler-export').isDisabled(),true);
  await compilerPage.locator('#compiler-run').click();await compilerPage.waitForFunction(()=>document.querySelector('#compiler-status').dataset.state==='refused');assert.equal(await compilerPage.locator('#compiler-export').isDisabled(),true);
  await compilerLoad('complete');const compilerFull=await compilerRun('complete',/CONDITIONALLY REFUTED/);assert.equal(compilerFull.result.target.questionRelevance,'UNVERIFIED');assert.match(await compilerPage.locator('#compiler-nodes').innerText(),/66987\/1/);
  await compilerPage.locator('#compiler-contrast-run').click();await compilerPage.waitForFunction(()=>document.querySelector('#compiler-contrast-status').dataset.state==='ready'&&!document.querySelector('#compiler-contrast-export').disabled);
  assert.match(await compilerPage.locator('#compiler-contrast-status').innerText(),/7 admitted, 1 refused/);assert.match(await compilerPage.locator('#compiler-contrast-status').innerText(),/5 same-operand comparisons/);
  const contrastCompilerDownload=compilerPage.waitForEvent('download');await compilerPage.locator('#compiler-contrast-export').click();const contrastCompilerBytes=fs.readFileSync(await (await contrastCompilerDownload).path());fs.writeFileSync(path.join(output,'compiler-contrast.json'),contrastCompilerBytes);
  const contrastCompilerResult=JSON.parse(contrastCompilerBytes).result;assert.equal(contrastCompilerResult.decisionAuthority,'NONE');assert.equal(contrastCompilerResult.counts.satisfied,6);assert.equal(contrastCompilerResult.counts.refuted,1);assert.equal(contrastCompilerResult.duplicateProposalGroups[0].ids.length,5);
  assert.deepEqual(compilerErrors,[]);assert.deepEqual(compilerExternal,[]);await compilerPage.close();
  const economicsPage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),economicsErrors=[],economicsExternal=[];
  economicsPage.on('pageerror',e=>economicsErrors.push(e.message));economicsPage.on('request',r=>{if(new URL(r.url()).origin!==origin)economicsExternal.push(r.url());});
  await economicsPage.goto(origin);await economicsPage.locator('#economics-lab > summary').click();
  for(const [mode,field,shared,avoided] of [['fresh',4,3,1],['acquired',0,0,0],['withdrawn',4,4,0]]){
   await economicsPage.locator('#economics-'+mode).click();
   await economicsPage.waitForFunction(()=>document.querySelector('#economics-status').dataset.state==='ready'&&!document.querySelector('#economics-export').disabled);
   for(const [id,v] of [['field',field],['shared',shared],['avoided',avoided]])assert.equal(await economicsPage.locator('#economics-'+id).innerText(),String(v));
   const dl=economicsPage.waitForEvent('download');await economicsPage.locator('#economics-export').click();const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,'economics-'+mode+'.json'),bytes);
   assert.equal(JSON.parse(bytes).comparison.sharedAcquisitionWorstCost,shared);
  }
  for(const [mode,cap,effort,exposure,unrestricted,outcome] of [['open',4,3,4,3,'conditional_observation_plan'],['bounded',2,4,2,3,'conditional_observation_plan'],['infeasible',1,null,null,3,'exposure_budget_infeasible'],['withdrawn',4,4,2,4,'conditional_observation_plan']]){
   await economicsPage.locator('#disclosure-'+mode).click();
   await economicsPage.waitForFunction(()=>document.querySelector('#disclosure-status').dataset.state==='ready'&&!document.querySelector('#disclosure-export').disabled);
   for(const [id,v] of [['cap',cap],['effort',effort],['exposure',exposure],['unrestricted',unrestricted]])assert.equal(await economicsPage.locator('#disclosure-'+id).innerText(),String(v??'—'));
   assert.equal(await economicsPage.locator('#disclosure-status').getAttribute('data-outcome'),outcome);
   const dl=economicsPage.waitForEvent('download');await economicsPage.locator('#disclosure-export').click();const bytes=fs.readFileSync(await (await dl).path());fs.writeFileSync(path.join(output,'disclosure-'+mode+'.json'),bytes);
   const r=JSON.parse(bytes);assert.equal(r.constrained.plan?.worstCost??null,effort);assert.equal(r.constrained.status,outcome);
   if(mode==='withdrawn')assert.deepEqual(r.excludedActions,[{id:'bundle_both',unavailableObservationIds:['bundle_capacity','bundle_load']}]);
   if(mode==='infeasible')assert.equal(r.constrained.witness,null);
  }
  assert.equal(await economicsPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(economicsErrors,[]);assert.deepEqual(economicsExternal,[]);await economicsPage.close();
  const reviewPage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),reviewErrors=[],reviewExternal=[];
  reviewPage.on('pageerror',e=>reviewErrors.push(e.message));reviewPage.on('request',r=>{if(new URL(r.url()).origin!==origin)reviewExternal.push(r.url());});
  await reviewPage.goto(origin);await reviewPage.locator('#reviewed-workspace > summary').click();
  const reviewFill=(id,value)=>reviewPage.locator('#review-'+id).fill(value);
  const reviewState=s=>reviewPage.waitForFunction(state=>document.querySelector('#review-status').dataset.state===state&&!document.querySelector('#review-reset').disabled,s);
  await reviewFill('question','Is site A higher than site B?');
  async function stageReviewSource(id,lineage,value){
   await reviewFill('source-id',id);await reviewFill('lineage',lineage);await reviewFill('source-text',value);await reviewPage.locator('#review-source-add').click();await reviewState('draft');
   assert.equal(await reviewPage.locator('#review-source-pick').inputValue(),id);
  }
  await stageReviewSource('report_a','root_a','測定 🧪 A: 12.50; repeat: 12.50;');
  await stageReviewSource('report_b','root_b','Site B: 10.25;');
  await reviewFill('kind','stress');await reviewFill('unit','MPa');await reviewFill('scope','sample_scope');await reviewFill('dim-l','-1');await reviewFill('dim-m','1');await reviewFill('dim-t','-2');
  async function selectReview(source,token,truncate=false){
   await reviewPage.locator('#review-source-pick').selectOption(source);
   await reviewPage.locator('#review-select-text').evaluate((e,args)=>{const i=e.value.lastIndexOf(args.token);e.focus();e.setSelectionRange(i+(args.truncate?1:0),i+args.token.length);},{token,truncate});
  }
  await reviewFill('binding-id','a');await selectReview('report_a','12.50',true);await reviewPage.locator('#review-binding-add').click();await reviewState('refused');
  assert.match(await reviewPage.locator('#review-status').innerText(),/COMPILER_NUMBER_BOUNDARY/);
  await selectReview('report_a','12.50');await reviewPage.locator('#review-binding-add').click();await reviewState('draft');
  await reviewFill('binding-id','b');await selectReview('report_b','10.25');await reviewPage.locator('#review-binding-add').click();await reviewState('draft');
  await reviewPage.locator('#review-seal').click();await reviewState('sealed');const reviewPin=await reviewPage.locator('#review-pin').innerText();assert.match(reviewPin,/^sha256:[a-f0-9]{64}$/);
  await reviewPage.locator('#review-generate').click();await reviewState('proposal');await reviewPage.locator('#review-run').click();await reviewState('ready');
  assert.match(await reviewPage.locator('#review-result').innerText(),/CONDITIONALLY SATISFIED/);
  const reviewDownload=reviewPage.waitForEvent('download');await reviewPage.locator('#review-export').click();const reviewBytes=fs.readFileSync(await (await reviewDownload).path());fs.writeFileSync(path.join(output,'reviewed-workspace.json'),reviewBytes);
  assert.deepEqual(JSON.parse(reviewBytes).result.target.sourceIds,['report_a','report_b']);
  const reviewPinDownload=reviewPage.waitForEvent('download');await reviewPage.locator('#review-export-pin').click();const reviewSnapshotPin=fs.readFileSync(await (await reviewPinDownload).path());fs.writeFileSync(path.join(output,'reviewed-workspace.sha256'),reviewSnapshotPin);assert.equal(reviewSnapshotPin.toString('ascii').trim(),await reviewPage.locator('#review-snapshot-pin').innerText());
  const reviewOriginal=JSON.parse(await reviewPage.locator('#review-proposal').inputValue());
  await reviewPage.locator('#review-batch-add').click();await reviewState('staged');
  for(const [op,reverse,hostile] of [['lt',true,false],['le',false,false],['lt',false,false],['gt',false,true]]){
   const p=structuredClone(reviewOriginal),n=p.nodes.find(n=>n.id===p.targetId);n.op=op;if(reverse)n.args.reverse();if(hostile)p.nodes[0].value='999';
   await reviewFill('proposal',JSON.stringify(p));await reviewPage.locator('#review-batch-add').click();await reviewState('staged');
  }
  assert.match(await reviewPage.locator('#review-batch-count').innerText(),/5 \/ 8/);
  await reviewPage.locator('#review-batch-run').click();await reviewState('batch_ready');assert.match(await reviewPage.locator('#review-batch-result').innerText(),/4 admitted, 1 refused/);
  const orderDownload=reviewPage.waitForEvent('download');await reviewPage.locator('#review-batch-export').click();const orderBytes=fs.readFileSync(await (await orderDownload).path());fs.writeFileSync(path.join(output,'reviewed-order-contrast.json'),orderBytes);
  const order=JSON.parse(orderBytes),at=(l,r)=>order.orderRelations.find(x=>x.left===l&&x.right===r);
  assert.equal(at('proposal_1','proposal_2').relation,'EQUIVALENT');assert.equal(at('proposal_1','proposal_3').relation,'COMPLEMENT');assert.equal(at('proposal_1','proposal_4').relation,'MUTUALLY_EXCLUSIVE_NONEXHAUSTIVE');assert.deepEqual(at('proposal_1','proposal_4').uncovered,['EQ']);assert.equal(order.decisionAuthority,'NONE');
  // Living semantic version: user-declared meanings, not automatic semantic approval.
  for(let i=1;i<=5;i++)await reviewPage.locator('#review-meaning-proposal_'+i).fill('Declared interpretation '+i);
  await reviewPage.locator('#review-meaning-link-proposal_1').selectOption('a');
  await reviewPage.locator('#review-semantic-run').click();await reviewState('semantic_ready');
  assert.match(await reviewPage.locator('#review-semantic-result').innerText(),/DIVERGENT CONDITIONAL OUTCOMES/);
  await reviewPage.locator('#review-roundtrip-run').locator('..').locator('summary').click();
  await reviewPage.locator('#review-roundtrip-run').click();await reviewState('roundtrip_ready');
  const roundtripText=await reviewPage.locator('#review-roundtrip-result').innerText();
  assert.match(roundtripText,/Original question: Is site A higher than site B\?/);
  assert.match(roundtripText,/Test whether .* is greater than /);
  assert.match(roundtripText,/No admitted computation/);
  assert.match(roundtripText,/semantic equivalence NOT ESTABLISHED/);
  assert.match(roundtripText,/Unspecified qualifiers:/);
  assert.ok(await reviewPage.locator('#review-roundtrip-result').isVisible());
  const livingPin=await reviewPage.locator('#review-semantic-pin').innerText();assert.match(livingPin,/^sha256:[a-f0-9]{64}$/);
  const livingDownload=reviewPage.waitForEvent('download');await reviewPage.locator('#review-semantic-export').click();
  const livingBytes=fs.readFileSync(await (await livingDownload).path());fs.writeFileSync(path.join(output,'living-before.json'),livingBytes);fs.writeFileSync(path.join(output,'living-before.sha256'),livingPin+'\n');
  await reviewPage.locator('#review-semantic-retain').click();assert.match(await reviewPage.locator('#review-baseline-state').innerText(),/Retained baseline/);
  await reviewPage.locator('#review-meaning-proposal_1').fill('Changed declaration');assert.equal(await reviewPage.locator('#review-semantic-export').isDisabled(),true);assert.equal(await reviewPage.locator('#review-roundtrip-run').isDisabled(),true);assert.equal(await reviewPage.locator('#review-roundtrip-result').innerText(),'');
  const reviewForged=JSON.parse(JSON.stringify(reviewOriginal));reviewForged.nodes[0].value='999';await reviewFill('proposal',JSON.stringify(reviewForged));assert.equal(await reviewPage.locator('#review-export').isDisabled(),true);await reviewPage.locator('#review-run').click();await reviewState('refused');
  await reviewFill('question','Is site A higher than site B? Revised.');assert.equal(await reviewPage.locator('#review-batch-export').isDisabled(),true);assert.match(await reviewPage.locator('#review-batch-count').innerText(),/0 \/ 8/);assert.equal(await reviewPage.locator('#review-run').isDisabled(),true);assert.equal(await reviewPage.locator('#review-export').isDisabled(),true);
  await reviewPage.locator('#review-seal').click();await reviewState('sealed');assert.notEqual(await reviewPage.locator('#review-pin').innerText(),reviewPin);
  await reviewPage.locator('#review-reset').click();assert.equal(await reviewPage.locator('#review-question').inputValue(),'');assert.match(await reviewPage.locator('#review-staged').innerText(),/0 staged source/);
  // Recover a previous version from bytes + independent pin, then correct B.
  await reviewPage.locator('#review-baseline-clear').click();assert.match(await reviewPage.locator('#review-baseline-state').innerText(),/No baseline/);
  await reviewPage.locator('#review-baseline-file').setInputFiles({name:'living-before.json',mimeType:'application/json',buffer:livingBytes});
  await reviewFill('baseline-pin','sha256:'+'0'.repeat(64));await reviewPage.locator('#review-baseline-import').click();await reviewState('refused');
  assert.match(await reviewPage.locator('#review-baseline-state').innerText(),/No baseline/);
  await reviewFill('baseline-pin',livingPin);await reviewPage.locator('#review-baseline-import').click();await reviewState('baseline_ready');
  await reviewFill('question','Is site A higher than site B?');
  await stageReviewSource('report_a','root_a','測定 🧪 A: 12.50; repeat: 12.50;');
  await stageReviewSource('report_b','root_b','Site B: 14.25;');
  await reviewFill('kind','stress');await reviewFill('unit','MPa');await reviewFill('scope','sample_scope');await reviewFill('dim-l','-1');await reviewFill('dim-m','1');await reviewFill('dim-t','-2');
  await reviewFill('binding-id','a');await selectReview('report_a','12.50');await reviewPage.locator('#review-binding-add').click();await reviewState('draft');
  await reviewFill('binding-id','b');await selectReview('report_b','14.25');await reviewPage.locator('#review-binding-add').click();await reviewState('draft');
  await reviewPage.locator('#review-seal').click();await reviewState('sealed');
  await reviewPage.locator('#review-generate').click();await reviewState('proposal');
  const corrected=JSON.parse(await reviewPage.locator('#review-proposal').inputValue());
  await reviewPage.locator('#review-batch-add').click();await reviewState('staged');
  for(const [op,reverse,hostile] of [['lt',true,false],['le',false,false],['lt',false,false],['gt',false,true]]){
   const p=structuredClone(corrected),n=p.nodes.find(n=>n.id===p.targetId);n.op=op;if(reverse)n.args.reverse();if(hostile)p.nodes[0].value='999';
   await reviewFill('proposal',JSON.stringify(p));await reviewPage.locator('#review-batch-add').click();await reviewState('staged');
  }
  for(let i=1;i<=5;i++)await reviewPage.locator('#review-meaning-proposal_'+i).fill('Declared interpretation '+i);
  await reviewPage.locator('#review-meaning-link-proposal_1').selectOption('a');
  await reviewPage.locator('#review-semantic-run').click();await reviewState('semantic_ready');
  assert.match(await reviewPage.locator('#review-impact-result').innerText(),/report_b CHANGED/);assert.match(await reviewPage.locator('#review-impact-result').innerText(),/CONDITIONAL RESULT REVERSED/);
  const impactDownload=reviewPage.waitForEvent('download');await reviewPage.locator('#review-impact-export').click();const impactBytes=fs.readFileSync(await (await impactDownload).path());fs.writeFileSync(path.join(output,'living-impact.json'),impactBytes);
  const impact=JSON.parse(impactBytes);assert.equal(impact.beforeDigest,livingPin);assert.equal(JSON.parse(impact.afterVersion).previousDigest,livingPin);
  assert.deepEqual(impact.impact.sourceChanges,[{id:'report_b',change:'CHANGED'}]);assert.equal(impact.impact.candidates.filter(c=>c.outcome==='CONDITIONAL_RESULT_REVERSED').length,4);
  assert.equal(impact.impact.decisionAuthority,'NONE');
  const newPin=await reviewPage.locator('#review-semantic-pin').innerText();assert.equal(impact.afterDigest,newPin);fs.writeFileSync(path.join(output,'living-after.json'),impact.afterVersion);fs.writeFileSync(path.join(output,'living-after.sha256'),newPin+'\n');
  const livingLayout=await reviewPage.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+1;}).slice(0,20).map(e=>({tag:e.tagName,id:e.id,className:typeof e.className==='string'?e.className:'',right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))}));assert.ok(livingLayout.scrollWidth<=livingLayout.width,JSON.stringify(livingLayout));assert.deepEqual(reviewErrors,[]);assert.deepEqual(reviewExternal,[]);await reviewPage.close();
  // Full first-minute tour from fresh browser state; no simulated verdicts.
  const guidePage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),guideErrors=[],guideExternal=[];
  guidePage.on('pageerror',e=>guideErrors.push(e.message));guidePage.on('request',r=>{if(new URL(r.url()).origin!==origin)guideExternal.push(r.url());});
  const guideStarted=Date.now();await guidePage.goto(origin);
  const primary=guidePage.locator('#debug-guide-next');
  const checkFirstScreen=async name=>{
   await guidePage.evaluate(()=>scrollTo(0,0));
   const rect=await primary.boundingBox();assert.ok(rect&&rect.y>=0&&rect.y+rect.height<=800,'primary action not in first viewport: '+name);
   assert.equal(await guidePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await guidePage.screenshot({path:path.join(output,'guide-'+name+'.png'),fullPage:false});
  };
  async function guideStep(action,next,state,keyboard=false){
   assert.equal(await primary.getAttribute('data-action'),action);
   assert.equal(await primary.isDisabled(),false);
   if(keyboard){await primary.focus();await guidePage.keyboard.press('Enter');}else await primary.click();
   await guidePage.waitForFunction(n=>{const e=document.querySelector('#debug-guide-next');return e.dataset.action===n&&(n==='complete'||!e.disabled);},next);
   if(state)assert.equal(await guidePage.locator('#debug-state').getAttribute('data-state'),state);
  }
  assert.equal(await guidePage.locator('#engineering-labs').getAttribute('open'),null);
  await checkFirstScreen('initial');
  await guideStep('start','withdraw','SUPPORTED',true);await checkFirstScreen('supported');
  await guideStep('withdraw','restore','UNDERDETERMINED');await checkFirstScreen('withdrawn');
  assert.equal(await guidePage.locator('#debug-control-state').innerText(),'Supported');
  await guideStep('restore','copies','SUPPORTED');
  await guideStep('copies','disagree','SUPPORTED');assert.match(await guidePage.locator('#debug-guide-summary').innerText(),/10 original-lineage artifacts = 1 declared root/);
  await guideStep('disagree','withdraw','CONFLICTED');await checkFirstScreen('conflicted');
  assert.match(await guidePage.locator('#debug-guide-summary').innerText(),/Disagreeing measurement: 1 artifact, 1 declared root/);
  assert.equal(await guidePage.locator('#debug-world-inspection').getAttribute('open'),null);assert.equal(await guidePage.locator('#debug-assumption-inspection').getAttribute('open'),null);
  assert.equal(await guidePage.locator('#debug-groups [data-lineage="sample_one"]').getAttribute('data-target-preview'),'UNDERDETERMINED');
  assert.equal(await guidePage.locator('#debug-groups [data-lineage="sample_two"]').getAttribute('data-target-preview'),'SUPPORTED');
  const lineage=guidePage.locator('#debug-groups [data-lineage="sample_one"]');await lineage.locator('summary').click();
  assert.equal(await lineage.locator('[data-artifact]').count(),10);assert.equal(await lineage.locator('[data-parent="lab_a"]').count(),9);
  assert.match(await lineage.locator('[data-artifact="copy_01"] code').innerText(),/^sha256:[a-f0-9]{64}$/);
  assert.equal(await guidePage.locator('#debug-state').getAttribute('data-state'),'CONFLICTED');await lineage.locator('summary').click();
  await guideStep('withdraw','plan-observe','UNDERDETERMINED');
  await guideStep('plan-observe','capsule-export','REFUTED');await checkFirstScreen('refuted');
  const guideCapsuleDl=guidePage.waitForEvent('download');await guideStep('capsule-export','capsule-pin-export','REFUTED');
  const guideCapsuleBytes=fs.readFileSync(await (await guideCapsuleDl).path());
  const guidePinDl=guidePage.waitForEvent('download');await guideStep('capsule-pin-export','capsule-verify','REFUTED');
  const guidePin=fs.readFileSync(await (await guidePinDl).path(),'utf8').trim();
  assert.equal('sha256:'+require('node:crypto').createHash('sha256').update(guideCapsuleBytes).digest('hex'),guidePin);
  assert.deepEqual(guideCapsuleBytes,currentCapsule.bytes);assert.equal(guidePin,currentCapsule.pin);
  await guideStep('capsule-verify','capsule-tamper','REFUTED');
  await guideStep('capsule-tamper','capsule-restore','REFUTED');
  assert.match(await guidePage.locator('#debug-capsule-status').innerText(),/PIN_MISMATCH/);await checkFirstScreen('tampered');
  await guideStep('capsule-restore','complete','REFUTED');await checkFirstScreen('complete');
  assert.match(await guidePage.locator('#debug-guide-proof').innerText(),/exact original reverified/);
  const guideElapsed=Date.now()-guideStarted;assert.ok(guideElapsed<60000,'automated guided journey exceeded 60 seconds');
  fs.writeFileSync(path.join(output,'debugger-guide-timing.json'),JSON.stringify({elapsedMs:guideElapsed,viewport:{width:360,height:800},actions:12,qualification:'Automated local Chromium timing, not a human usability study.'},null,2));
  // An explicit restart begins a new ceremony even if the eventual history digest is identical.
  await guidePage.locator('#debug-manual > summary').click();
  await guidePage.locator('#debug-start').click();
  await guidePage.waitForFunction(()=>document.querySelector('#debug-guide-next').dataset.action==='withdraw'&&!document.querySelector('#debug-guide-next').disabled);
  await guideStep('withdraw','restore','UNDERDETERMINED');
  await guideStep('restore','copies','SUPPORTED');
  await guideStep('copies','disagree','SUPPORTED');
  await guideStep('disagree','withdraw','CONFLICTED');
  await guideStep('withdraw','plan-observe','UNDERDETERMINED');
  await guideStep('plan-observe','capsule-export','REFUTED');
  assert.equal(await guidePage.locator('#debug-guide-proof').getAttribute('hidden'),'');
  assert.deepEqual(guideErrors,[]);assert.deepEqual(guideExternal,[]);await guidePage.close();
  const worldPage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),worldErrors=[],worldExternal=[];
  worldPage.on('pageerror',e=>worldErrors.push(e.message));worldPage.on('request',r=>{if(new URL(r.url()).origin!==origin)worldExternal.push(r.url());});
  await worldPage.goto(origin);await worldPage.locator('#debug-manual > summary').click();
  async function worldStep(id,state,alive){
   await worldPage.locator('#debug-'+id).click();
   await worldPage.waitForFunction(s=>document.querySelector('#debug-state').dataset.state===s&&!document.querySelector('#debug-start').disabled,state);
   assert.equal(await worldPage.locator('#debug-world-map tr').count(),8);
   assert.deepEqual(await worldPage.locator('#debug-world-map tr[data-survives=true]').evaluateAll(rows=>rows.map(row=>row.dataset.world)),alive);
   assert.equal(await worldPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  async function saveWorld(name){
   if(await worldPage.locator('#debug-world-inspection').getAttribute('open')===null)await worldPage.locator('#debug-world-inspection > summary').click();
   const dl=worldPage.waitForEvent('download');await worldPage.locator('#debug-world-export').click();
   const bundle=JSON.parse(fs.readFileSync(await (await dl).path(),'utf8'));fs.writeFileSync(path.join(output,name),JSON.stringify(bundle,null,2));return bundle.trace;
  }
  await worldStep('start','SUPPORTED',['w001','w011']);const traceBaseline=await saveWorld('world-trace-baseline.json');
  await worldStep('withdraw','UNDERDETERMINED',['w001','w011','w101','w111']);
  assert.match(await worldPage.locator('#debug-world-delta').innerText(),/2 returned/);await saveWorld('world-trace-withdrawn.json');
  await worldStep('restore','SUPPORTED',['w001','w011']);
  await worldStep('copies','SUPPORTED',['w001','w011']);const traceCopied=await saveWorld('world-trace-copied.json');assert.deepEqual(traceCopied.worlds,traceBaseline.worlds);
  await worldStep('disagree','CONFLICTED',[]);await saveWorld('world-trace-conflicted.json');
  assert.match(await worldPage.locator('[data-world=w001]').innerText(),/Independent-declared measurement: a=1 \(world 0\)/);
  assert.match(await worldPage.locator('[data-world=w111]').innerText(),/Original report and copies: a=0 \(world 1\)/);
  await worldPage.locator('.world-map').scrollIntoViewIfNeeded();await worldPage.screenshot({path:path.join(output,'world-trace-conflicted.png'),fullPage:false});
  await worldStep('withdraw','UNDERDETERMINED',['w101','w111']);await worldStep('plan-observe','REFUTED',['w111']);
  await saveWorld('world-trace-resolved.json');await worldPage.locator('.world-map').scrollIntoViewIfNeeded();await worldPage.screenshot({path:path.join(output,'world-trace-resolved.png'),fullPage:false});
  assert.deepEqual(worldErrors,[]);assert.deepEqual(worldExternal,[]);await worldPage.close();
  const assumptionPage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),assumptionErrors=[],assumptionExternal=[];
  assumptionPage.on('pageerror',e=>assumptionErrors.push(e.message));assumptionPage.on('request',r=>{if(new URL(r.url()).origin!==origin)assumptionExternal.push(r.url());});
  await assumptionPage.goto(origin);await assumptionPage.locator('#debug-manual > summary').click();
  async function assumptionStep(id,state){
   await assumptionPage.locator('#debug-'+id).click();
   await assumptionPage.waitForFunction(s=>document.querySelector('#debug-state').dataset.state===s&&!document.querySelector('#debug-start').disabled,state);
  }
  async function testLimit(limit,expected,original){
   const worlds=await assumptionPage.locator('#debug-worlds').innerText(),artifacts=await assumptionPage.locator('#debug-artifacts').innerText(),roots=await assumptionPage.locator('#debug-roots').innerText(),control=await assumptionPage.locator('#debug-control-state').innerText();
   await assumptionPage.locator('#debug-assumption-limit').selectOption(limit);
   assert.equal(await assumptionPage.locator('#debug-assumption-state').getAttribute('data-state'),expected);
   assert.equal(await assumptionPage.locator('#debug-state').getAttribute('data-state'),original);
   assert.equal(await assumptionPage.locator('#debug-worlds').innerText(),worlds);assert.equal(await assumptionPage.locator('#debug-artifacts').innerText(),artifacts);assert.equal(await assumptionPage.locator('#debug-roots').innerText(),roots);assert.equal(await assumptionPage.locator('#debug-control-state').innerText(),control);
   assert.equal(await assumptionPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  async function saveAssumption(name){
   const dl=assumptionPage.waitForEvent('download');await assumptionPage.locator('#debug-assumption-export').click();
   const bundle=JSON.parse(fs.readFileSync(await (await dl).path(),'utf8'));fs.writeFileSync(path.join(output,name),JSON.stringify(bundle,null,2));return bundle.sensitivity;
  }
  await assumptionStep('start','SUPPORTED');await assumptionPage.locator('#debug-assumption-inspection > summary').click();
  await testLimit('0/1','UNDERDETERMINED','SUPPORTED');const baselineSensitivity=await saveAssumption('assumption-baseline.json');assert.deepEqual(baselineSensitivity.minimumSampledChange,{halfUnits:1,limits:['1/2']});
  await assumptionStep('withdraw','UNDERDETERMINED');await testLimit('2/1','SUPPORTED','UNDERDETERMINED');await saveAssumption('assumption-withdrawn.json');
  await assumptionStep('restore','SUPPORTED');await assumptionStep('copies','SUPPORTED');await assumptionStep('disagree','CONFLICTED');
  await testLimit('2/1','CONFLICTED','CONFLICTED');const conflictSensitivity=await saveAssumption('assumption-conflicted.json');assert.equal(conflictSensitivity.boundaries,null);assert.match(await assumptionPage.locator('#debug-assumption-boundaries').innerText(),/cannot resolve the evidence contradiction/);
  await assumptionStep('withdraw','UNDERDETERMINED');await assumptionStep('plan-observe','REFUTED');await testLimit('2/1','SUPPORTED','REFUTED');
  const resolvedSensitivity=await saveAssumption('assumption-resolved.json');assert.deepEqual(resolvedSensitivity.minimumSampledChange,{halfUnits:2,limits:['2/1']});
  await assumptionPage.locator('.assumption-panel').scrollIntoViewIfNeeded();await assumptionPage.screenshot({path:path.join(output,'assumption-resolved.png'),fullPage:false});
  await assumptionStep('start','SUPPORTED');assert.equal(await assumptionPage.locator('#debug-assumption-limit').inputValue(),'1/1');
  assert.deepEqual(assumptionErrors,[]);assert.deepEqual(assumptionExternal,[]);await assumptionPage.close();
  const offlinePage=await browser.newPage({viewport:{width:360,height:800},acceptDownloads:true}),offlineErrors=[],offlineExternal=[];
  offlinePage.on('pageerror',e=>offlineErrors.push(e.message));offlinePage.on('request',r=>{if(new URL(r.url()).origin!==origin)offlineExternal.push(r.url());});
  await offlinePage.goto(origin);await offlinePage.locator('.offline-verifier > summary').click();
  for(const [id,file] of [['download','sutra-proof-verifier.pyz'],['digest','sutra-proof-verifier.pyz.sha256']]){
   const dl=offlinePage.waitForEvent('download');await offlinePage.locator('#debug-offline-'+id).click();const saved=await dl;
   assert.equal(saved.suggestedFilename(),file);
   const bytes=fs.readFileSync(await saved.path());assert.deepEqual(bytes,fs.readFileSync(path.join(dist,file)));
   fs.writeFileSync(path.join(output,file),bytes);
  }
  assert.equal(await offlinePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(offlineErrors,[]);assert.deepEqual(offlineExternal,[]);await offlinePage.close();
  console.log('PASS: actual static offline verifier and digest downloads match the built source artifacts; no external request.');
  console.log('PASS: five exact target thresholds; original evidence, result and separate control remain unchanged; conflicting evidence survives rule change; four real sensitivity exports.');
  console.log('PASS: all eight world rows, exact blocker values, copy invariance, withdrawal deltas, fresh guide ceremony and five real world trace exports.');
  const desktopGuide=await browser.newPage({viewport:{width:1440,height:900}});await desktopGuide.goto(origin);await desktopGuide.locator('#debug-guide-next').click();
  await desktopGuide.waitForFunction(()=>document.querySelector('#debug-guide-next').dataset.action==='withdraw'&&!document.querySelector('#debug-guide-next').disabled);
  const desktopRect=await desktopGuide.locator('#debug-guide-next').boundingBox();assert.ok(desktopRect&&desktopRect.y+desktopRect.height<=900);
  await desktopGuide.screenshot({path:path.join(output,'guide-desktop-supported.png'),fullPage:false});await desktopGuide.close();
  console.log('PASS: 12-action guided challenge from fresh state, all real computations/downloads, keyboard start, first-viewport primary action and zero external requests; automated elapsed '+guideElapsed+' ms.');
  console.log('PASS: conclusion debugger critical and irrelevant withdrawal, ten declared-copy artifacts, conflict, repair and decisive observation; actual state exports.');
  console.log('PASS: actual Rust WASM support lattice, alternate minimum conflicts, copied-source conditional supports, withdrawal removes both, refuted support after fresh read; blocked or digest-mismatched module fails closed.');
  assert.deepEqual(errors,[]);assert.equal(peerRequests.length,6);
  console.log('PASS: browser conflict, minimum witness, declared lineage withdrawal and restoration, resolved after new observation.');
  await page.screenshot({path:path.join(output,'subgroup-investigation.png'),fullPage:true});
  console.log('PASS: consent-denied zero traffic, actual two-origin data-only scripted adviser, cheaper local policy 6→2, redundant and forged peers, exact standardized reversal, transfer, actual export.');
  await page.screenshot({path:path.join(output,'workspace.png'),fullPage:true});
  fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(exported,null,2));
  fs.writeFileSync(path.join(output,'learning-evidence.json'),JSON.stringify(learning,null,2));
  console.log('PASS: built browser workspace, 360px keyboard baseline, revision 5/11, two method comparison, pinned two-agent scripted proposal, forged verdict refused, report replay/tamper, exported actual bytes, zero external requests; frontier policy and impossibility witness, source-bound learning revision, hash-checked native video seek, export and reset.');
 }finally{await browser?.close();await Promise.all([new Promise(resolve=>server.close(resolve)),new Promise(resolve=>peer.close(resolve))]);}
})().catch(e=>{console.error(e);process.exitCode=1;});
