// Actual built application, no external model or network authority.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http');
(async()=>{
 const dist=path.resolve(__dirname,'../dist'),out=path.resolve(__dirname,'../test-output');fs.mkdirSync(out,{recursive:true});
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.wasm':'application/wasm','.png':'image/png'};
 const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1'),file=path.resolve(dist,u.pathname==='/'?'index.html':'.'+u.pathname);if(!file.startsWith(dist+path.sep)||!fs.statSync(file).isFile())throw Error();res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try{for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!==origin)external.push(r.url());});
  await page.goto(origin);await page.locator('#eh-workspace').waitFor();
  assert.equal(await page.locator('#sutra-orbit').getAttribute('data-mode'),'universe');
  assert.equal(await page.locator('#orb-map').isVisible(),false);
  assert.match(await page.locator('#eh-status').innerText(),/No recorded execution/);
  assert.equal(await page.locator('#eh-workspace .eh-entity').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(out,'event-horizon-'+width+'.png'),fullPage:false});
  await page.locator('#orb-nav').getByRole('button',{name:'Ring map',exact:true}).click();
  assert.equal(await page.locator('#orb-map').isVisible(),true);
  assert.equal(await page.locator('#orb-map .orb-agent').count(),6);
  await page.locator('#orb-nav').getByRole('button',{name:'Adaptive universe',exact:true}).click();
  await page.locator('#orb-explore').click();assert.equal(await page.locator('#orb-autonomous-objective').evaluate(e=>document.activeElement===e),true);
  assert.equal(await page.locator('#eh-objective-slot #orb-autonomous-objective').count(),1);
  await page.locator('.eh-tabs').getByRole('button',{name:'Direct compute'}).click();await page.locator('#eh-compute-run').click();await page.waitForFunction(()=>document.querySelector('#eh-compute-value'));assert.equal(await page.locator('#eh-compute-value').innerText(),'1 m');
  await page.screenshot({path:path.join(out,'event-horizon-compute-'+width+'.png'),fullPage:false});
  await page.locator('.eh-tabs').getByRole('button',{name:'Runtime'}).click();assert.match(await page.locator('#eh-status').innerText(),/Direct local computation · completed/);assert.equal(await page.locator('#eh-workspace .eh-entity').count(),1);assert.match(await page.locator('#eh-workspace .eh-entity').first().innerText(),/tool · completed/);
  await page.locator('.eh-tabs').getByRole('button',{name:'Knowledge'}).click();assert.ok(await page.locator('#eh-knowledge').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await context.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
