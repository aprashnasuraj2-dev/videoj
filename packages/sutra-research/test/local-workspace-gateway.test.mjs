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
const approval=p=>({approvedPlanPin:p.planPin,approvePublicContact:true,approveEstimatedCost:true,approveModelDisclosure:true});
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
