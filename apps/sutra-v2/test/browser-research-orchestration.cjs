const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
(async()=>{
 const {createLocalResearchGateway}=await import('../../../packages/sutra-research/local-workspace-gateway.js'),{createResearchModelBroker}=await import('../../../packages/sutra-research/model-broker.js'),{digest}=await import('../../../packages/sutra-research/research-session.js'),{createResearchWorkspaceServer}=await import('../research-workspace.mjs');
 const objective='Compare battery storage costs in 2025',creds={groq:'fixture-groq-key'},permits=[],contacts=[],searches=[],reads=[];let plans=0;
 function consume(kind){const permit=permits.at(-1);assert.equal(permit?.kind,kind);assert.equal(permit.consumed,false);permit.consumed=true;contacts.push({sequence:permit.sequence,kind});}
 const g=createLocalResearchGateway({modelCredentials:creds,configure:a=>({
  providers:Object.fromEntries(a.plan.providers.map(provider=>[provider.id,{async search(query){consume('search');searches.push(query);const n=searches.length;return [{url:'https://alpha.example.org/report-'+n,title:'Unrelated catalog',rank:10},{url:'https://beta.example.org/report-'+n,title:'Battery storage costs in 2025',rank:1}];}}])),
  async readDocument(url){consume('document');reads.push(url);const text='Battery storage costs in 2025: USD '+(100+reads.length*5)+' per unit. Fixture '+reads.length+'.';a.reserve('document',{bytes:262144});return {url,text,textDigest:digest(text),rawDigest:digest(text),links:[],mediaType:'text/plain',retrievedAt:'2026-11-27T12:00:00.000Z',parser:'bounded-text/v1'};},
  modelBroker:createResearchModelBroker({authorization:a,credentials:creds,exchangeFactory:()=>({close(){},async exchange(req){consume('model');const body=JSON.parse(req.bodyText),input=JSON.parse(body.messages.at(-1).content),system=body.messages[0].content;let value;
   if(system.includes('research decision maker'))value=++plans===1?{webAction:'search',queries:[{suffix:'primary data',questionId:'primary'},{suffix:'limitations',questionId:'counterevidence'}]}:{webAction:'finish_research'};
   else if(system.includes('evidence synthesizer')){const e=input.evidence[0];value={claims:[{statement:'A source reports battery storage costs.',kind:'reported',citations:[{passageId:e.passageId,quote:e.quote}]}],gaps:[]};}
   else{const c=input.claims[0],e=input.evidence[0];value={reviews:[{claimId:c.claimId,verdict:'supported',reason:'The excerpt reports the figure.',citations:[{passageId:e.passageId,quote:e.quote}]}],conflicts:[]};}
   return {status:200,bodyText:JSON.stringify({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(value)}}],usage:{completion_tokens:32}})};
  }})})
 })});
 const gateway={...g,advance(input){const op=g.status(input.sessionId).pendingOperation;assert.ok(op);assert.equal(input.sequence,permits.length+1);assert.equal(input.sequence,op.sequence);
  if(op.choices){assert.ok(op.choices.every(c=>!Object.hasOwn(c,'url')&&!Object.hasOwn(c,'query')));assert.ok(op.choices.some(c=>c.id===input.selectionId));}
  const ack=g.advance(input);permits.push({sequence:op.sequence,kind:op.kind,role:op.role,choiceCount:op.choices?.length??0,selectionId:input.selectionId??null,consumed:false});return ack;}};
 const app=createResearchWorkspaceServer({gateway,dist:path.resolve(__dirname,'../dist'),port:0}),origin=await app.listen(),browser=await chromium.launch({headless:true});
 try{
 const p=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true,reducedMotion:'reduce'}),external=[],errors=[];
 p.on('request',r=>{if(new URL(r.url()).origin!==origin&&!r.url().startsWith('blob:'))external.push(r.url());});p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin);await p.locator('#sutra-orbit').waitFor();await p.locator('#orb-nav').getByRole('button',{name:'Model connections'}).click();await p.locator('#orb-local-model-settings > summary').click();
 await p.locator('.orb-route-grid .orb-route').filter({has:p.getByRole('heading',{name:'Groq',exact:true})}).getByLabel('Model ID',{exact:true}).fill('chosen-model');
 await p.locator('#orb-nav').getByRole('button',{name:'Ring map',exact:true}).click();await p.locator('#orb-autonomous-objective').fill(objective);await p.locator('#orb-autonomous-prepare').click();await p.waitForFunction(()=>document.querySelector('#orb-autonomous-status').dataset.state==='previewed');assert.equal(contacts.length,0);
 await p.locator('#orb-autonomous-approve').check();await p.locator('#orb-autonomous-start').click();await p.waitForFunction(()=>['closed','refused','failed','cancelled'].includes(document.querySelector('#orb-autonomous-status').dataset.state),null,{timeout:60000});assert.equal(await p.locator('#orb-autonomous-status').getAttribute('data-state'),'closed');
 assert.equal(searches.length,2);assert.equal(reads.length,4);assert.match(searches[0],/primary data$/);assert.match(searches[1],/limitations$/);
 const q=permits.find(x=>x.kind==='select_query'&&x.choiceCount===2),d=permits.find(x=>x.kind==='select_document'&&x.choiceCount===2);assert.ok(q&&d);assert.equal(q.selectionId,'query_0');assert.equal(d.selectionId,'candidate_1');assert.match(reads[0],/beta\.example\.org/);
 for(const selection of permits.filter(x=>x.kind.startsWith('select_'))){const next=permits[selection.sequence];const expected={select_query:'search',select_document:'document'}[selection.kind];assert.ok(expected);assert.equal(next.kind,expected);assert.equal(next.sequence,selection.sequence+1);assert.equal(next.consumed,true);}
 assert.ok(permits.filter(x=>!x.kind.startsWith('select_')).every(x=>x.consumed));assert.equal(contacts.length,10);assert.deepEqual(errors,[]);assert.equal(external.length,0);
 const [dl]=await Promise.all([p.waitForEvent('download'),p.locator('#orb-autonomous-export').click()]);const bytes=fs.readFileSync(await dl.path()),report=JSON.parse(bytes);assert.equal(report.authority,'NONE');assert.equal(report.documents.length,4);
 const out=path.resolve(__dirname,'../test-output');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'competition-fixture-orchestration.json'),JSON.stringify({revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'actual Chromium scheduling of bounded host-admitted choices; injected transport; host planning and report admission',reportPin:digest(bytes),permits,contacts,searchCount:searches.length,documentCount:reads.length,externalBrowserRequests:external.length},null,2)+'\n');
 console.log('PASS browser chooses multiple admitted queries and ranked documents; each contact requires a fresh sequence-bound permit');
 }finally{await browser.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
