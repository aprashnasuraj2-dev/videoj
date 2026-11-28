import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {createLocalResearchGateway} from '../local-workspace-gateway.js';
import {createResearchModelBroker} from '../model-broker.js';
import {createResearchWorkspaceServer} from '../../../apps/sutra-v2/research-workspace.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const modelCredentials={groq:'fixture-groq-key'};
function fixture(){
 const calls=[];
 const gateway=createLocalResearchGateway({modelCredentials,configure:a=>({providers:{},readDocument:async()=>{throw Error('UNEXPECTED_WEB');},modelBroker:createResearchModelBroker({authorization:a,credentials:modelCredentials,exchangeFactory:()=>({close(){},async exchange(req){
  calls.push(req);return {status:200,bodyText:JSON.stringify({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:'{"webAction":"answer_without_web","answer":"A battery stores energy."}'}}],usage:{completion_tokens:12}})};
 }})})})});
 return {gateway,calls};
}
const approval=p=>({approvedPlanPin:p.planPin,approvalId:p.approvalId,approvePublicContact:true,approveEstimatedCost:true,approveModelDisclosure:true});
const input={objective:'Explain batteries',models:[{vendor:'groq',model:'chosen-model'}]};
test('one model in local workspace; exact one-shot approval and actual supervisor events',async()=>{
 const {gateway:g,calls}=fixture();try{
  assert.deepEqual(g.capabilities().configuredModelVendors,['groq']);assert.equal(g.capabilities().mode,'injected_fixture');assert.ok(!JSON.stringify(g.capabilities()).includes('fixture-groq-key'));
  const p=g.preview(input);assert.equal(p.models.length,1);assert.equal(p.webAccess,'on_demand');assert.deepEqual(p.searchBackends,[]);
  assert.throws(()=>g.start({...approval(p),approveModelDisclosure:false}),/APPROVAL/);assert.equal(calls.length,0);
  const s=g.start(approval(p));let r;for(let i=0;i<100;i++){r=g.status(s.sessionId);if(r.state!=='running')break;await delay(10);}
  assert.equal(r.state,'closed');assert.equal(r.report.modelOnlyAnswer.sourceStatus,'NO_WEB_EVIDENCE');assert.equal(r.report.usage.searches,0);assert.equal(calls.length,1);
  assert.equal(r.events[0].kind,'session.open');assert.equal(r.events.at(-1).kind,'session.close');assert.ok(r.events.some(e=>e.kind==='model.response'&&e.model==='chosen-model'));assert.equal(r.mode,'injected_fixture');
  assert.throws(()=>g.start(approval(p)),/APPROVAL/);assert.throws(()=>g.status('other'),/SESSION_NOT_FOUND/);assert.ok(!JSON.stringify(r).includes('fixture-groq-key'));
 }finally{g.close();}
});
test('loopback HTTP bridge rejects cross-origin, missing token and unapproved execution',async()=>{
 const {gateway,calls}=fixture(),dir=await mkdtemp(join(tmpdir(),'sutra-loopback-'));await writeFile(join(dir,'index.html'),'<h1>fixture</h1>');
 const app=createResearchWorkspaceServer({gateway,dist:dir,port:0});
 try{
  const origin=await app.listen(),caps=await (await fetch(origin+'/api/research/capabilities')).json(),token=caps.sessionToken;
  assert.match(token,/^[a-f0-9]{64}$/);assert.equal((await fetch(origin+'/api/research/capabilities',{headers:{origin:'https://foreign.example'}})).status,403);
  assert.equal((await fetch(origin+'/api/research/preview',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(input)})).status,403);
  const headers={origin,'content-type':'application/json','x-sutra-session':token};
  assert.equal((await fetch(origin+'/api/research/preview',{method:'POST',headers:{...headers,origin:'https://foreign.example'},body:JSON.stringify(input)})).status,403);
  const p=await (await fetch(origin+'/api/research/preview',{method:'POST',headers,body:JSON.stringify(input)})).json();
  assert.equal((await fetch(origin+'/api/research/start',{method:'POST',headers,body:JSON.stringify({...approval(p),approvedPlanPin:'wrong'})})).status,400);assert.equal(calls.length,0);
  const s=await (await fetch(origin+'/api/research/start',{method:'POST',headers,body:JSON.stringify(approval(p))})).json();
  let r;for(let i=0;i<100;i++){r=await (await fetch(origin+'/api/research/status?id='+s.sessionId,{headers:{'x-sutra-session':token}})).json();if(r.state!=='running')break;await delay(10);}
  assert.equal(r.state,'closed');assert.equal(r.report.modelOnlyAnswer.sourceStatus,'NO_WEB_EVIDENCE');assert.equal(calls.length,1);
  assert.equal((await fetch(origin+'/')).status,200);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});

test('credential-shaped inputs refuse before preview; multiline objectives normalize visibly',()=>{
 const {gateway:g,calls}=fixture();try{
  assert.throws(()=>g.preview({objective:'Use fixture-groq-key',models:input.models}),/SENSITIVE_INPUT/);
  assert.throws(()=>g.preview({objective:'Test',models:[{vendor:'groq',model:'gsk_abcdefghijklmnop'}]}),/SENSITIVE_INPUT/);
  const p=g.preview({...input,objective:'Explain\n battery storage'});assert.equal(p.objective,'Explain battery storage');assert.equal(calls.length,0);
 }finally{g.close();}
});

test('identical plan digest cannot replay an old preview approval, and expiry blocks dispatch',()=>{
 let now=0;const g=createLocalResearchGateway({modelCredentials,clock:()=>now});try{
  const a=g.preview(input),b=g.preview(input);assert.equal(a.planPin,b.planPin);assert.notEqual(a.approvalId,b.approvalId);
  assert.throws(()=>g.start(approval(a)),/APPROVAL/);now=b.expiresAt;assert.throws(()=>g.start(approval(b)),/APPROVAL/);
 }finally{g.close();}
});
test('actual loopback HTTP isolates preview and run capabilities, expires tokens, and refuses old sessions after restart',async()=>{
 let now=1000;const dir=await mkdtemp(join(tmpdir(),'sutra-capability-isolation-'));await writeFile(join(dir,'index.html'),'<h1>fixture</h1>');
 const first=fixture(),app=createResearchWorkspaceServer({gateway:first.gateway,dist:dir,port:0,clock:()=>now});let other;
 try{
  const origin=await app.listen(),caps=async(base=origin)=>{const r=await fetch(base+'/api/research/capabilities');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.has('access-control-allow-origin'),false);return r.json();};
  const a=await caps(),b=await caps();assert.notEqual(a.sessionToken,b.sessionToken);
  const call=(route,token,value,base=origin)=>fetch(base+'/api/research/'+route,{method:value===undefined?'GET':'POST',headers:{'x-sutra-session':token,...(value===undefined?{}:{origin:base,'content-type':'application/json'})},...(value===undefined?{}:{body:JSON.stringify(value)})});
  const p=await (await call('preview',a.sessionToken,input)).json();
  assert.equal((await call('start',b.sessionToken,approval(p))).status,403);assert.equal(first.calls.length,0);
  const q=await (await call('preview',b.sessionToken,input)).json();assert.equal(q.planPin,p.planPin);assert.notEqual(q.approvalId,p.approvalId);
  assert.equal((await call('start',a.sessionToken,approval(p))).status,403);
  assert.equal((await call('start',b.sessionToken,approval(p))).status,400);assert.equal(first.calls.length,0);
  const started=await call('start',b.sessionToken,approval(q));assert.equal(started.status,202);const run=await started.json();
  assert.equal((await call('status?id='+run.sessionId,a.sessionToken)).status,403);assert.equal((await call('cancel',a.sessionToken,{sessionId:run.sessionId})).status,403);
  assert.equal((await call('status?id='+run.sessionId+'&id='+run.sessionId,b.sessionToken)).status,400);
  let state;for(let i=0;i<100;i++){const res=await call('status?id='+run.sessionId,b.sessionToken);assert.equal(res.status,200);state=await res.json();if(state.state!=='running')break;await delay(10);}
  assert.equal(state.state,'closed');assert.equal(first.calls.length,1);assert.ok(!JSON.stringify(state).includes(b.sessionToken));
  now=b.sessionTokenExpiresAt;assert.equal((await call('status?id='+run.sessionId,b.sessionToken)).status,403);
  const c=await caps();assert.notEqual(c.sessionToken,b.sessionToken);assert.equal((await call('status?id='+run.sessionId,c.sessionToken)).status,403);
  const second=fixture();other=createResearchWorkspaceServer({gateway:second.gateway,dist:dir,port:0,clock:()=>now});const next=await other.listen();
  assert.equal((await call('status?id='+run.sessionId,c.sessionToken,undefined,next)).status,403);
  const fresh=await caps(next);assert.equal((await call('status?id='+run.sessionId,fresh.sessionToken,undefined,next)).status,403);
  assert.equal(second.calls.length,0);assert.equal(first.calls.length,1);
 }finally{await other?.close();await app.close();await rm(dir,{recursive:true,force:true});}
});

test('red-team exact browser permit, origin, duplicate JSON, oversized payload and cross-client replay',async()=>{
 const {gateway,calls}=fixture(),dir=await mkdtemp(join(tmpdir(),'sutra-redteam-'));await writeFile(join(dir,'index.html'),'<h1>fixture</h1>');
 const app=createResearchWorkspaceServer({gateway,dist:dir,port:0});
 try{
  const origin=await app.listen(),token=async()=> (await (await fetch(origin+'/api/research/capabilities')).json()).sessionToken,owner=await token(),other=await token();
  const post=(route,data,key=owner,headerOrigin=origin)=>fetch(origin+'/api/research/'+route,{method:'POST',headers:{origin:headerOrigin,'content-type':'application/json','x-sutra-session':key},body:typeof data==='string'?data:JSON.stringify(data)});
  assert.equal((await post('preview','{"objective":"one","objective":"two","models":[]}')).status,400);
  assert.equal((await post('preview',{...input,objective:'x'.repeat(17000)})).status,400);
  assert.equal((await post('preview',{...input,objective:'api_key=fixture-groq-key'})).status,400);
  const p=await (await post('preview',{...input,browserScheduled:true})).json(),q=await (await post('preview',{...input,browserScheduled:true})).json();
  assert.equal((await post('start',approval(p))).status,400);
  const started=await post('start',approval(q));assert.equal(started.status,202);const run=await started.json();
  const poll=async()=> (await (await fetch(origin+'/api/research/status?id='+run.sessionId,{headers:{'x-sutra-session':owner}})).json());
  let row;for(let i=0;i<100;i++){row=await poll();if(row.pendingOperation)break;await delay(10);}
  const op=row.pendingOperation;assert.ok(op);assert.equal(calls.length,0);
  const exactPermit={sessionId:run.sessionId,planPin:run.planPin,operationId:op.id,sequence:op.sequence};
  for(const patch of [{operationId:'forged'},{sequence:op.sequence+1},{planPin:'sha256:'+'a'.repeat(64)},{url:'https://unapproved.invalid/'}])assert.equal((await post('advance',{...exactPermit,...patch})).status,400);
  assert.equal((await post('advance',exactPermit,other)).status,403);
  assert.equal((await post('advance',exactPermit,owner,'https://unapproved.invalid')).status,403);
  assert.equal(calls.length,0);
  const ok=await post('advance',exactPermit);assert.equal(ok.status,200);assert.equal((await ok.json()).accepted,true);
  assert.equal((await post('advance',exactPermit)).status,400);
  for(let i=0;i<100;i++){row=await poll();if(row.state==='closed')break;await delay(10);}
  assert.equal(row.state,'closed');assert.equal(calls.length,1);assert.equal(row.pendingOperation,null);assert.doesNotMatch(JSON.stringify(row),/fixture-groq-key/);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
