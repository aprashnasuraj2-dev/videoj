const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
(async()=>{
 const {createLocalResearchGateway}=await import('../../../packages/sutra-research/local-workspace-gateway.js'),{createResearchModelBroker}=await import('../../../packages/sutra-research/model-broker.js'),{digest}=await import('../../../packages/sutra-research/research-session.js'),{createResearchWorkspaceServer}=await import('../research-workspace.mjs');
 const creds={groq:'fixture-groq-key'},requests=[],reads=[];let plannerCalls=0;
 const gateway=createLocalResearchGateway({modelCredentials:creds,configure:a=>({providers:{},readDocument:async url=>{reads.push(url);a.reserve('document',{bytes:262144});const text='Battery storage costs were USD 100 million in 2025.';return {url,text,textDigest:digest(text),rawDigest:digest(text),links:[],mediaType:'text/plain'};},modelBroker:createResearchModelBroker({authorization:a,credentials:creds,exchangeFactory:()=>({close(){},async exchange(req){
  requests.push(req.model);const body=JSON.parse(req.bodyText),input=JSON.parse(body.messages.at(-1).content),system=body.messages[0].content;let value;
  if(system.includes('research decision maker'))value=++plannerCalls===1?{webAction:'open_public_urls',urls:['https://public.org/report']}:{webAction:'finish_research'};
  else if(system.includes('evidence synthesizer')){const e=input.evidence[0];value={claims:[{statement:'A source reports battery costs.',kind:'reported',citations:[{passageId:e.passageId,quote:e.quote}]}],gaps:[]};}
  else{const c=input.claims[0],e=input.evidence[0];value={reviews:[{claimId:c.claimId,verdict:'supported',reason:'The excerpt reports the figure.',citations:[{passageId:e.passageId,quote:e.quote}]}],conflicts:[]};}
  return {status:200,bodyText:JSON.stringify({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(value)}}],usage:{completion_tokens:32}})};
 }})})})});
 const app=createResearchWorkspaceServer({gateway,dist:path.resolve(__dirname,'../dist'),port:0}),origin=await app.listen(),browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!==origin&&new URL(r.url()).protocol!=='blob:')external.push(r.url());});
  await page.goto(origin);await page.locator('#sutra-orbit').waitFor();
  await page.locator('#orb-nav').getByRole('button',{name:'API routes'}).click();
  assert.equal(await page.getByText('Assign rehearsal agent routes',{exact:true}).count(),0);
  const groq=page.locator('.orb-route-grid .orb-route').filter({has:page.getByRole('heading',{name:'Groq',exact:true})});await groq.getByLabel('Model ID',{exact:true}).fill('chosen-model');
  await page.locator('#orb-nav').getByRole('button',{name:'Ring map',exact:true}).click();
  await page.locator('#orb-autonomous-objective').fill('Explain battery storage costs');
  await page.locator('#orb-autonomous-prepare').click();await page.waitForFunction(()=>document.querySelector('#orb-autonomous-status').dataset.state==='previewed');
  assert.equal(requests.length,0);assert.match(await page.locator('#orb-autonomous-preview').innerText(),/groq \/ chosen-model/);assert.equal(await page.locator('#orb-autonomous-start').isDisabled(),true);
  await page.locator('#orb-autonomous-approve').check();await page.locator('#orb-autonomous-start').click();await page.waitForFunction(()=>document.querySelector('#orb-autonomous-status').dataset.state==='closed');
  assert.match(await page.locator('#orb-autonomous-status').innerText(),/TEST FIXTURE/);assert.match(await page.locator('#orb-autonomous-result').innerText(),/A source reports battery costs/);assert.match(await page.locator('#orb-autonomous-result').innerText(),/https:\/\/public.org\/report/);
  assert.deepEqual(reads,['https://public.org/report']);assert.ok(requests.length>=3&&requests.every(m=>m==='chosen-model'));assert.equal(await page.locator('#orb-autonomous-export').isDisabled(),false);assert.match(await page.locator('#orb-log').innerText(),/RESEARCH FIXTURE/);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 }finally{await browser.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
