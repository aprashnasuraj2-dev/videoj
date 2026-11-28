import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {createOnDemandWebAccess} from '../on-demand-web.js';
import {createResearchWorkspaceServer} from '../../../apps/sutra-v2/research-workspace.mjs';
import {createLocalResearchGateway} from '../local-workspace-gateway.js';
import {extractDocument} from '../document-reader.js';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const URL1='https://public.org/report';
const fetchRequest={operation:'fetch',resource:URL1,backend:null,render:false};
const searchRequest={operation:'search',resource:'energy storage research',backend:'brave',render:false};
const approval=p=>({planPin:p.planPin,requestPin:p.requestPin,approvalId:p.approvalId,approvePublicContact:true,approveEstimatedCost:true});
function fixture(){
 const contacts=[];
 const gateway=createOnDemandWebAccess({searchCredentials:{brave:'fixture-brave-key'},
  makeReader:({authorization,render})=>async (url,options)=>{contacts.push({type:'fetch',url,render,approved:authorization.plan.scope.allowDirectPublicUrls,signal:options.signal});return extractDocument(Buffer.from('<html><body><main>Battery costs fell to $100 in 2026.</main><a href="/source">Source</a></body></html>'),'text/html',url);},
  makeProviders:()=>({brave:{async search(q){contacts.push({type:'search',query:q});return [{url:URL1,title:'Battery report',provider:'brave',rank:1},{url:'https://127.0.0.1/internal',title:'intranet',provider:'brave',rank:2},{url:URL1,title:'dup',provider:'brave',rank:3}];}}})
 });
 return {gateway,contacts};
}
async function terminal(web,id){let r;for(let i=0;i<60;i++){r=web.status(id);if(!['running','cancelling'].includes(r.state))return r;await delay(5);}throw Error('TEST_TIMEOUT');}
test('model-free public URL fetch is exact approved, hashed and source-bound',async()=>{
 const {gateway:g,contacts}=fixture();try{
  assert.deepEqual(g.capabilities().actors,['user','engine','agent']);
  const p=g.preview(fetchRequest,{actor:'user'});
  assert.equal(contacts.length,0);assert.equal(p.request.resource,URL1);
  assert.equal(p.scope.allowDirectPublicUrls,true);
  assert.equal(p.scope.allowPrivateNetworks,false);assert.equal(p.scope.allowAuthentication,false);
  assert.equal(p.scope.allowExternalWrites,false);assert.equal(p.authority,'NONE');
  assert.equal(p.request.backend,null);
  assert.throws(()=>g.start({...approval(p),requestPin:'sha256:'+ '0'.repeat(64)}),/WEB_APPROVAL/);
  const s=g.start(approval(p)),r=await terminal(g,s.sessionId);
  assert.equal(r.state,'closed');assert.equal(contacts.length,1);assert.equal(contacts[0].approved,true);
  assert.equal(r.report.documents[0].url,URL1);assert.equal(r.report.documents[0].verificationStatus,'unverified_public_extraction');
  assert.match(r.report.documents[0].text,/Battery costs fell/);assert.equal(r.report.documents[0].rawDigest.length,71);
  assert.equal(r.report.usage.documents,0); // injected reader bypasses real reservations
  assert.match(r.reportPin,/^sha256:[0-9a-f]{64}$/);
  assert.throws(()=>g.start(approval(p)),/WEB_APPROVAL/);
 }finally{g.close();}
});
test('search is discovery only and rejects unsafe, duplicate and unapproved URLs',async()=>{
 const {gateway:g,contacts}=fixture();try{
  const p=g.preview(searchRequest,{actor:'engine'});assert.equal(p.actor,'engine');assert.equal(contacts.length,0);
  const s=g.start(approval(p)),r=await terminal(g,s.sessionId);
  assert.equal(r.state,'closed');assert.equal(r.report.actor,'engine');
  assert.equal(r.report.operation,'search');assert.equal(r.report.results.length,1);
  assert.equal(r.report.results[0].verificationStatus,'discovery_only_not_evidence');
  assert.equal(r.report.documents.length,0);assert.equal(r.report.usage.searches,1);
  assert.equal(contacts.length,1);assert.equal(contacts[0].query,searchRequest.resource);
 }finally{g.close();}
});
test('model-originated proposals have no egress until exact external approval',async()=>{
 const {gateway:g,contacts}=fixture();try{
  const proposed=g.preview(fetchRequest,{actor:'agent'}),again=g.preview(fetchRequest,{actor:'agent'});
  assert.equal(contacts.length,0);assert.equal(proposed.planPin,again.planPin);
  assert.notEqual(proposed.approvalId,again.approvalId);
  assert.throws(()=>g.start(approval(proposed)),/WEB_APPROVAL/);
  const s=g.start(approval(again));assert.equal((await terminal(g,s.sessionId)).state,'closed');
  assert.equal(contacts.length,1);
 }finally{g.close();}
});
test('refuses dangerous URLs, secret-bearing input, search without provider and JS without renderer',()=>{
 const {gateway:g,contacts}=fixture();try{
  for(const address of ['http://public.org/','https://127.0.0.1/private','https://public.org/?token=pass','https://public.org:8443/x','https://metadata.google.internal/x'])
   assert.throws(()=>g.preview({...fetchRequest,resource:address}),undefined,address);
  assert.throws(()=>g.preview({...searchRequest,resource:'password=supersecret'}),/WEB_REQUEST/);
  assert.throws(()=>g.preview({...fetchRequest,render:true}),/WEB_CAPABILITY/);
  assert.throws(()=>g.preview({...fetchRequest,backend:'brave'}),/WEB_CAPABILITY/);
  assert.throws(()=>g.preview({...searchRequest,backend:'unknown'}),/WEB_CAPABILITY/);
  assert.equal(contacts.length,0);
 }finally{g.close();}
 const {gateway:noSearch}= {gateway:createOnDemandWebAccess()};
 try{assert.ok(noSearch.capabilities().searchBackends.includes('crossref'));assert.ok(noSearch.capabilities().searchBackends.includes('openalex'));assert.equal(noSearch.preview({...searchRequest,backend:'crossref'}).request.backend,'crossref');}finally{noSearch.close();}
});
test('busy, aborted, failed post-dispatch and failed before-dispatch cases remain explicit',async()=>{
 let release;const g=createOnDemandWebAccess({makeReader:()=>async(_,opts)=>new Promise((yes,no)=>{release={yes,no};opts.signal.addEventListener('abort',()=>no(Error('aborted')),{once:true});})});
 try{
  const p=g.preview(fetchRequest);const s=g.start(approval(p));
  assert.throws(()=>g.preview(fetchRequest),/WEB_BUSY/);
  g.cancel(s.sessionId);
  const r=await terminal(g,s.sessionId);
  assert.equal(r.state,'cancelled');assert.equal(r.report,null);
  assert.throws(()=>g.status('other'),/WEB_SESSION/);
 }finally{g.close();}
 const h=createOnDemandWebAccess({makeReader:()=>async()=>{throw Error('TRANSPORT_LOST');}});
 try{
  const p=h.preview(fetchRequest),s=h.start(approval(p)),r=await terminal(h,s.sessionId);
  assert.equal(r.state,'failed');assert.equal(r.outcome,'no_external_contact_attempted');assert.equal(r.report,null);
 }finally{h.close();}
});
test('HTTP bridge enforces owner-bound web approval and status, independent of model connections',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'sutra-web-access-'));await writeFile(join(dir,'index.html'),'<html>fixture</html>');
 const {gateway:g,contacts}=fixture();
 const host=createLocalResearchGateway({modelCredentials:{},searchCredentials:{},configure:()=>({providers:{},readDocument:async()=>{throw Error('wrong')}})});
 // Replace only the web capability in this injected test; production gateway uses its real web object.
 const bound={...host,web:g};
 const server=createResearchWorkspaceServer({gateway:bound,dist:dir,port:0});
 try{
  const origin=await server.listen(),cap=await (await fetch(origin+'/api/research/web/capabilities')).json();
  const other=await (await fetch(origin+'/api/research/web/capabilities')).json();
  assert.equal(cap.schema,'sutra-web-access-capabilities/v1');assert.notEqual(cap.sessionToken,other.sessionToken);
  const send=(route,token,body)=>fetch(origin+'/api/research/web/'+route,{method:body?'POST':'GET',headers:{'x-sutra-session':token,...(body?{origin,'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal((await send('preview',other.sessionToken,fetchRequest)).status,200);
  const preview=await (await send('preview',cap.sessionToken,fetchRequest)).json();
  assert.equal(contacts.length,0);
  assert.equal((await send('start',other.sessionToken,approval(preview))).status,403);
  assert.equal((await send('start',cap.sessionToken,{...approval(preview),requestPin:'wrong'})).status,400);
  assert.equal((await fetch(origin+'/api/research/web/preview',{method:'POST',headers:{'x-sutra-session':cap.sessionToken,origin:'https://attacker.org','content-type':'application/json'},body:JSON.stringify(fetchRequest)})).status,403);
  const started=await (await send('start',cap.sessionToken,approval(preview))).json();
  assert.equal((await fetch(origin+'/api/research/web/status?id='+started.sessionId,{headers:{'x-sutra-session':other.sessionToken}})).status,403);
  let report;for(let i=0;i<80;i++){report=await(await fetch(origin+'/api/research/web/status?id='+started.sessionId,{headers:{'x-sutra-session':cap.sessionToken}})).json();if(report.state==='closed')break;await delay(5);}
  assert.equal(report.state,'closed');assert.equal(contacts.length,1);
  assert.equal((await fetch(origin+'/api/research/web/status?id='+started.sessionId+'&id='+started.sessionId,{headers:{'x-sutra-session':cap.sessionToken}})).status,400);
 }finally{await server.close();host.close();await rm(dir,{recursive:true,force:true});}
});

test('adversarial source metadata, malformed redirects and forged digests refuse publication',async()=>{
 const forged=[
  {rawDigest:'not-a-digest'},
  {textDigest:'sha256:'+'1'.repeat(64)},
  {redirectChain:[{from:'https://public.org/report',to:'https://127.0.0.1/private',status:302}],finalUrl:'https://127.0.0.1/private'},
  {redirectChain:[{from:'https://public.org/report',to:'https://other.org/report',status:302}],finalUrl:'https://different.org/report'}
 ];
 for(const mutation of forged){
  const g=createOnDemandWebAccess({makeReader:()=>async url=>({...extractDocument(Buffer.from('<html><body>trusted public text</body></html>'),'text/html',url),...mutation})});
  try{const p=g.preview(fetchRequest),run=g.start(approval(p)),r=await terminal(g,run.sessionId);assert.equal(r.state,'failed');assert.equal(r.report,null);}finally{g.close();}
 }
});
test('search result provider/rank/title spoofing cannot alter the approved provider identity or inject secrets',async()=>{
 const g=createOnDemandWebAccess({searchCredentials:{brave:'fixture-brave-key'},makeProviders:()=>({brave:{async search(){return [{url:URL1,provider:{bad:'nested payload'},rank:9000,title:'password=exfiltrate'},{url:'https://other.org/safe',provider:'other-service',rank:999,title:'Dataset'}];}}})});
 try{const p=g.preview(searchRequest),s=g.start(approval(p)),r=await terminal(g,s.sessionId);
  assert.equal(r.state,'closed');assert.deepEqual(r.report.results.map(x=>x.provider),['brave','brave']);
  assert.deepEqual(r.report.results.map(x=>x.rank),[1,2]);assert.equal(r.report.results[0].title,'');
 }finally{g.close();}
});

test('trusted agent and deterministic engine autonomously dispatch without per-tool human approvals',async()=>{
 const {gateway:g,contacts}=fixture();
 try{
  const agent=g.autoStart(fetchRequest,{actor:'agent'});
  const a=await terminal(g,agent.sessionId);
  assert.equal(a.state,'closed');assert.equal(a.report.actor,'agent');
  const engine=g.autoStart({...searchRequest,backend:'brave'},{actor:'engine'});
  const b=await terminal(g,engine.sessionId);
  assert.equal(b.state,'closed');assert.equal(b.report.actor,'engine');
  assert.equal(contacts.length,2);
  assert.equal(b.report.results[0].url,URL1);
 }finally{g.close();}
});
test('federated automatic discovery spans unrelated scholarly indexes with explicit provider outages',async()=>{
 const used=[];
 const results={
  openalex:[{url:'https://www.nature.com/articles/abc',title:'Nature research'}],
  crossref:[{url:'https://www.science.org/doi/10.1000/def',title:'Science research'}],
  europepmc:[{url:'https://journals.plos.org/plosone/article?id=10.1371/test',title:'Biomedical research'}],
  semanticscholar:[{url:'https://dl.acm.org/doi/10.1145/abc',title:'ACM research'}],
  arxiv:[{url:'https://arxiv.org/abs/2401.00001',title:'Preprint'}]
 };
 const providers=Object.fromEntries(Object.entries(results).map(([id,rows])=>[id,{async search(){
  used.push(id);if(id==='semanticscholar')throw Object.assign(Error('provider down'),{code:'RATE_LIMITED'});
  return rows;
 }}]));
 const g=createOnDemandWebAccess({makeProviders:()=>providers});
 try{
  const run=g.autoStart({operation:'search',resource:'quantum research journal publication',backend:'auto',render:false},{actor:'agent'});
  const r=await terminal(g,run.sessionId);
  assert.equal(r.state,'closed');assert.ok(used.length>=4);
  assert.ok(r.report.results.length>=3);
  assert.ok(r.report.providerFailures.some(x=>x.provider==='semanticscholar'&&x.code==='RATE_LIMITED'));
  assert.ok(r.report.results.some(x=>x.url.includes('nature.com')));
  assert.ok(r.report.results.some(x=>x.url.includes('science.org')));
  assert.ok(r.report.searchedBackends.includes('openalex'));
  assert.equal(r.report.qualification.includes('Federated'),true);
 }finally{g.close();}
});
test('public ResearchGate and SciELO pages can be requested without being in a publisher allowlist',async()=>{
 const {gateway:g}=fixture();
 try{
  for(const url of ['https://www.researchgate.net/publication/123456_Academic_Research','https://www.scielo.br/j/test/a/123']){
   const p=g.preview({...fetchRequest,resource:url});
   assert.equal(p.request.resource,url);
  }
 }finally{g.close();}
});
