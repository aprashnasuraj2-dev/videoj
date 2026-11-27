// Master UI regression: uses the same built app, engine and consent boundary.
async function testMaster(browser,origin,assert){
 const page=await browser.newPage({viewport:{width:320,height:800},reducedMotion:'reduce'});const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{const u=new URL(r.url());if(u.origin!==origin&&u.protocol!=='blob:')external.push(r.url());});
 try{
 await page.goto(origin);await page.locator('#sutra-orbit').waitFor();
 const first=await page.locator('#orb-play').boundingBox();assert.ok(first&&first.y>=0&&first.y+first.height<=800,'orbital primary action must be in first viewport');
 assert.equal(await page.locator('#orb-map .orb-agent').count(),6);
 assert.equal(await page.locator('#orb-council-execute').isDisabled(),true);assert.equal(await page.locator('#orb-map .orb-station').count(),12);
 const path=require('node:path'),fs=require('node:fs'),out=path.resolve(__dirname,'../test-output');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'orbit-mobile.png'),fullPage:false});await page.setViewportSize({width:1440,height:900});await page.screenshot({path:path.join(out,'orbit-desktop.png'),fullPage:false});await page.setViewportSize({width:320,height:800});
 await page.locator('#orb-play').click();await page.locator('#orb-play').click();await page.locator('#orb-step').click();assert.match(await page.locator('#orb-log').innerText(),/SIMULATED/);await page.locator('#orb-stop').click();
 await page.locator('#orb-era').click();assert.equal(await page.locator('#sutra-orbit').getAttribute('data-era'),'1997');await page.screenshot({path:path.join(out,'orbit-retro.png'),fullPage:false});await page.locator('#orb-era').click();await page.locator('#orb-theme').click();assert.equal(await page.locator('#sutra-orbit').getAttribute('data-theme'),'dark');await page.screenshot({path:path.join(out,'orbit-dark.png'),fullPage:false});await page.locator('#orb-theme').click();
 await page.locator('#orb-nav').getByRole('button',{name:'API routes'}).click();assert.equal(await page.locator('.orb-route-grid .orb-route').count(),6);
 await page.locator('#orb-nav').getByRole('button',{name:'Guestbook'}).click();assert.match(await page.locator('#orb-guestbook').innerText(),/No local storage accessed/);
 await page.locator('#orb-guestbook').getByRole('button',{name:'Enable / open local guestbook'}).click();await page.waitForFunction(()=>!document.querySelector('#orb-guest-note').disabled);await page.locator('#orb-guest-note').fill('Synthetic note');await page.locator('#orb-guestbook').getByRole('button',{name:'Sign and append note'}).click();await page.waitForFunction(()=>document.querySelector('#orb-guestbook').innerText.includes('Signature and chain valid'));assert.match(await page.locator('#orb-guestbook').innerText(),/Synthetic note/);
 await page.locator('#orb-nav').getByRole('button',{name:'Ring map',exact:true}).click();
 await page.locator('#studio-share').check();await page.waitForFunction(()=>!document.querySelector('#orb-council-execute').disabled);await page.locator('#orb-council-execute').click();await page.waitForFunction(()=>document.querySelector('#studio-status').dataset.state==='complete');assert.match(await page.locator('#orb-log').innerText(),/LOCAL SCRIPTED COUNCIL/);assert.match(await page.locator('#orb-council-status').innerText(),/No live inference/);
 assert.match(await page.locator('#orb-council-activity').innerText(),/completed/);assert.equal(await page.locator('#orb-council-activity .orb-event').count(),2);assert.match(await page.locator('#orb-council-activity .orb-event').first().innerText(),/2 requests · 2 responses · 2 admitted proposals/);
 await page.locator('#orb-nav').getByRole('button',{name:'Investigation',exact:true}).click();await page.locator('#sutra-master').waitFor();
 assert.match(await page.locator('#sm-question').innerText(),/What are you trying to determine/);
 await page.locator('#sutra-master').getByRole('button',{name:'Network engineering',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#review-status').dataset.state==='sample_ready'&&!document.querySelector('#review-semantic-run').disabled);
 await page.locator('#sutra-master').getByRole('button',{name:'Evaluate meanings',exact:true}).click();
 assert.equal(await page.locator('#reviewed-workspace').getAttribute('open'),'');
 await page.locator('#review-semantic-run').click();
 await page.waitForFunction(()=>document.querySelector('#review-status').dataset.state==='semantic_ready'&&!document.querySelector('#review-reset').disabled);
 await page.locator('#sutra-master').getByRole('button',{name:'Evidence',exact:true}).click();
 const source=page.locator('[data-sm-node^="source:"]:not([data-sm-node="source:question"])').first();await source.focus();await page.keyboard.press('Enter');
 assert.equal(await source.getAttribute('aria-pressed'),'true');
 assert.ok(await page.locator('[data-sm-node][data-relation="downstream"]').count()>0);
 assert.match(await page.locator('#sm-inspect').innerText(),/Declared lineage/);
 await page.locator('#orb-nav').getByRole('button',{name:'Ring map',exact:true}).click();await page.locator('#orb-map [aria-label^="Evidence station:"]').focus();await page.keyboard.press('Enter');assert.match(await page.locator('#orb-inspect').innerText(),/Recorded dependencies/);assert.ok(await page.locator('#orb-graph-node option').count()>0);const evidenceOption=await page.locator('#orb-graph-node option[value^="source:"]').first().getAttribute('value');await page.locator('#orb-graph-node').selectOption(evidenceOption);assert.match(await page.locator('#orb-inspect').innerText(),/Downstream affected nodes · [1-9]/);await page.locator('#orb-inspect').getByRole('button',{name:'Open full investigation graph'}).click();await page.locator('#sutra-master').waitFor();
 await page.locator('#sutra-master').getByRole('button',{name:'Challenge',exact:true}).click();
 assert.match(await page.locator('#sm-work').innerText(),/What would change this conclusion/);
 const before=await page.locator('#review-studio-sources').innerText();
 await page.locator('#sutra-master').getByRole('button',{name:'Preview draft withdrawal',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#review-status').dataset.state==='withdrawal_preview'&&!document.querySelector('#review-reset').disabled);
 assert.match(await page.locator('.sm-preview').innerText(),/No change applied yet/);assert.equal(await page.locator('#review-studio-sources').innerText(),before);
 await page.locator('#sutra-master').getByRole('button',{name:'Preview withdrawal',exact:true}).click();
 assert.equal(await page.locator('#review-source-revise-panel').getAttribute('open'),'');
 await page.locator('#sutra-master').getByRole('button',{name:'Verify',exact:true}).click();
 assert.match(await page.locator('#sm-work').innerText(),/source Authenticity/i);
 await page.locator('#sutra-master').getByRole('button',{name:'History',exact:true}).click();
 assert.match(await page.locator('#sm-work').innerText(),/No history retained/);
 await page.locator('#review-question').fill('Changed question; old result must not be current.');
 await page.locator('#sutra-master').getByRole('button',{name:'Investigation',exact:true}).click();
 assert.match(await page.locator('.sm-result').innerText(),/Not evaluated/);
 assert.equal(await page.locator('h1').count(),1);
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.locator('#sutra-master').evaluate(n=>n.scrollWidth<=n.clientWidth+2));}
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 }finally{await page.close();}
}
module.exports={testMaster};
