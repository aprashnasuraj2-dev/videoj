// Master UI regression: uses the same built app, engine and consent boundary.
async function testMaster(browser,origin,assert){
 const page=await browser.newPage({viewport:{width:320,height:800},reducedMotion:'reduce'});const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{const u=new URL(r.url());if(u.origin!==origin&&u.protocol!=='blob:')external.push(r.url());});
 try{
 await page.goto(origin);await page.locator('#sutra-master').waitFor();
 assert.match(await page.locator('#sm-question').innerText(),/What are you trying to determine/);
 await page.locator('#sutra-master').getByRole('button',{name:'Network engineering',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#review-status').dataset.state==='sample_ready'&&!document.querySelector('#review-semantic-run').disabled);
 await page.locator('#sutra-master').getByRole('button',{name:'Evaluate meanings',exact:true}).click();
 assert.equal(await page.locator('#reviewed-workspace').getAttribute('open'),'');
 await page.locator('#review-semantic-run').click();
 await page.waitForFunction(()=>document.querySelector('#review-status').dataset.state==='semantic_ready');
 await page.locator('#sutra-master').getByRole('button',{name:'Evidence',exact:true}).click();
 const source=page.locator('[data-sm-node^="source:"]:not([data-sm-node="source:question"])').first();await source.focus();await page.keyboard.press('Enter');
 assert.equal(await source.getAttribute('aria-pressed'),'true');
 assert.ok(await page.locator('[data-sm-node][data-relation="downstream"]').count()>0);
 assert.match(await page.locator('#sm-inspect').innerText(),/Declared lineage/);
 await page.locator('#sutra-master').getByRole('button',{name:'Challenge',exact:true}).click();
 assert.match(await page.locator('#sm-work').innerText(),/What would change this conclusion/);
 await page.locator('#sutra-master').getByRole('button',{name:'Preview withdrawal',exact:true}).click();
 assert.equal(await page.locator('#review-source-revise-panel').getAttribute('open'),'');
 await page.locator('#sutra-master').getByRole('button',{name:'Verify',exact:true}).click();
 assert.match(await page.locator('#sm-work').innerText(),/source Authenticity/i);
 await page.locator('#sutra-master').getByRole('button',{name:'History',exact:true}).click();
 assert.match(await page.locator('#sm-work').innerText(),/No history retained/);
 await page.locator('#review-question').fill('Changed question; old result must not be current.');
 await page.locator('#sutra-master').getByRole('button',{name:'Investigation',exact:true}).click();
 assert.match(await page.locator('.sm-result').innerText(),/Not evaluated/);
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.locator('#sutra-master').evaluate(n=>n.scrollWidth<=n.clientWidth+2));}
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 }finally{await page.close();}
}
module.exports={testMaster};
