const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
(async()=>{
 const {createLocalResearchGateway}=await import('../../../packages/sutra-research/local-workspace-gateway.js'),{createResearchModelBroker}=await import('../../../packages/sutra-research/model-broker.js'),{digest}=await import('../../../packages/sutra-research/research-session.js'),{createResearchWorkspaceServer}=await import('../research-workspace.mjs');
 const urls=['https://alpha.example.org/report','https://beta.example.org/report'],texts=['Battery storage costs were USD 100 in 2025.','Battery storage costs were USD 125 in 2025.'],reads=[],calls=[];let plans=0;
 const creds={groq:'fixture-groq-key'};
 const gateway=createLocalResearchGateway({modelCredentials:creds,configure:a=>({providers:{},readDocument:async url=>{reads.push(url);const text=texts[urls.indexOf(url)];assert.ok(text);a.reserve('document',{bytes:262144});return {url,text,textDigest:digest(text),rawDigest:digest(text),links:[],mediaType:'text/plain',retrievedAt:'2026-11-27T12:00:00.000Z',parser:'bounded-text/v1'};},modelBroker:createResearchModelBroker({authorization:a,credentials:creds,exchangeFactory:()=>({close(){},async exchange(req){
 calls.push(req.model);const body=JSON.parse(req.bodyText),input=JSON.parse(body.messages.at(-1).content),system=body.messages[0].content;let value;
 if(system.includes('research decision maker'))value=++plans===1?{webAction:'open_public_urls',urls}:{webAction:'finish_research'};
 else if(system.includes('evidence synthesizer'))value={claims:[{statement:'The first source reports battery storage costs.',kind:'reported',citations:[{passageId:input.evidence[0].passageId,quote:input.evidence[0].quote}]}],gaps:[]};
 else {const cites=input.evidence.slice(0,2).map(e=>({passageId:e.passageId,quote:e.quote}));value={reviews:[{claimId:input.claims[0].claimId,verdict:'qualified',reason:'Competing reports disagree.',citations:[cites[0]]}],conflicts:[{candidateId:input.conflictCandidates[0]?.id??'new',relation:'conflicting',reason:'Different reported values.',citations:cites}]};}
 return {status:200,bodyText:JSON.stringify({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(value)}}],usage:{completion_tokens:32}})};
 }})})})});
 const app=createResearchWorkspaceServer({gateway,dist:path.resolve(__dirname,'../dist')}),origin=await app.listen(),browser=await chromium.launch({headless:true});
 try{
 const p=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true,reducedMotion:'reduce'}),external=[],errors=[];
 p.on('request',r=>{if(new URL(r.url()).origin!==origin&&!r.url().startsWith('blob:'))external.push(r.url());});p.on('pageerror',e=>errors.push(e.message));
 const loc=id=>p.locator('#review-'+id),click=id=>loc(id).click(),fill=(id,v)=>loc(id).fill(v),state=s=>p.waitForFunction(x=>document.querySelector('#review-status').dataset.state===x&&!document.querySelector('#review-reset').disabled,s);
 await p.goto(origin);await p.locator('#sutra-orbit').waitFor();await p.locator('#orb-nav').getByRole('button',{name:'Model connections'}).click();await p.locator('#orb-local-model-settings > summary').click();
 await p.locator('.orb-route-grid .orb-route').filter({has:p.getByRole('heading',{name:'Groq',exact:true})}).getByLabel('Model ID',{exact:true}).fill('chosen-model');
 await p.locator('#orb-nav').getByRole('button',{name:'Ring map',exact:true}).click();
 await p.locator('#orb-autonomous-objective').fill('Compare battery storage costs in 2025');await p.locator('#orb-autonomous-prepare').click();await p.waitForFunction(()=>document.querySelector('#orb-autonomous-status').dataset.state==='previewed');assert.equal(calls.length,0);assert.equal(reads.length,0);
 await p.locator('#orb-autonomous-approve').check();await p.locator('#orb-autonomous-start').click();await p.waitForFunction(()=>document.querySelector('#orb-autonomous-status').dataset.state==='closed');
 assert.equal(reads.length,2);assert.equal(calls.length,4);assert.match(await p.locator('#orb-autonomous-result').innerText(),/Competing evidence — unresolved/);
 const competing=p.getByRole('button',{name:'Review competing citation',exact:true});assert.equal(await competing.count(),2);
 const sourceIds=[];
 for(let i=0;i<2;i++){
 await competing.nth(i).click();await p.waitForFunction(()=>document.querySelector('#review-source-text').value.length>0);
 const t=await loc('source-text').inputValue(),id=await loc('source-id').inputValue(),token=t.includes('100')?'100':'125';sourceIds.push(id);
 if(i===0)await fill('question','Which reported battery storage cost is greater?');
 await click('source-add');await state('draft');
 await fill('kind','money');await fill('unit','USD');await fill('scope','reported_battery_cost_2025');await fill('dim-l','0');await fill('dim-m','0');await fill('dim-t','0');
 await fill('binding-id',token==='100'?'a':'b');await loc('source-pick').selectOption(id);
 await loc('select-text').evaluate((e,t)=>{const i=e.value.indexOf(t);e.focus();e.setSelectionRange(i,i+t.length);},token);
 await click('binding-add');await state('draft');
 }
 await click('seal');await state('sealed');const contract=JSON.parse(await loc('contract').textContent());assert.equal(contract.sources.length,2);assert.equal(contract.bindings.length,2);assert.ok(contract.sources.every(s=>s.provenance?.reportPin));
 await loc('expression-panel').locator('summary').click();await fill('expression','[a] > [b]');await click('expression-generate');await state('proposal');await click('batch-add');await state('staged');
 await fill('expression','[b] > [a]');await click('expression-generate');await state('proposal');await click('batch-add');await state('staged');
 await loc('meaning-proposal_1').fill('First reported cost greater');await loc('meaning-proposal_2').fill('Second reported cost greater');
 await click('semantic-run');await state('semantic_ready');assert.match(await loc('semantic-result').innerText(),/DIVERGENT CONDITIONAL OUTCOMES/);const parent=await loc('semantic-pin').innerText();
 await click('semantic-retain');await p.locator('#review-transaction-panel > summary').click();await loc('transaction-source').selectOption(sourceIds[0]);await loc('transaction-kind').selectOption('withdraw');await click('transaction-stage');await state('transaction_queued');await click('transaction-preview');await state('transaction_preview');
 assert.match(await loc('transaction-result').innerText(),/Independent full child replay agrees/);assert.match(await loc('transaction-result').innerText(),/BLOCKED_MISSING_INPUT/);assert.equal(await loc('semantic-pin').innerText(),parent);
 await click('transaction-apply');await state('semantic_ready');assert.notEqual(await loc('semantic-pin').innerText(),parent);assert.match(await loc('impact-result').innerText(),/PREVIOUS CONDITIONAL RESULT UNRESOLVED/);
 const [dl]=await Promise.all([p.waitForEvent('download'),click('transaction-export')]);const bytes=fs.readFileSync(await dl.path());assert.match(bytes.toString(),/sha256:/);assert.equal(external.length,0);assert.deepEqual(errors,[]);
 const output=path.resolve(__dirname,'../test-output');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'competition-fixture-research-revision.json'),bytes);fs.writeFileSync(path.join(output,'competition-fixture-research-revision-receipt.json'),JSON.stringify({revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),parent,child:await loc('semantic-pin').innerText(),snapshot:digest(bytes),modelCalls:calls.length,documentReads:reads.length,externalBrowserRequests:external.length,fixture:true},null,2));
 console.log('PASS objective-to-conflict-to-reviewed-quantity-to-withdrawal-to-proof export');
 }finally{await browser.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
