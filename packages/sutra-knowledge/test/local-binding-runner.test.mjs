import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {casePin} from '../pinned-investigation.js';
import {admitLocalBindingConfig,recoverLocalBindingPlan,verifyLocalBindingTransfer,LOCAL_BINDING_VERSION} from '../local-binding-config.js';
const cli=fileURLToPath(new URL('../../../apps/sutra-v2/local-bindings.mjs',import.meta.url));
const secret='LOCAL_BINDING_TEST_CANARY_1234',hidden='UNSELECTED_SOURCE_MARKER_1234';
const suggestion={id:'a_value',sourceId:'a',quote:'12.50',before:'repeat: ',after:';',type:{kind:'stress',unit:'MPa',scope:'same_condition',dimension:[-1,1,-2]}};
function run(config,args=[],env={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[cli,...args],{stdio:['pipe','pipe','pipe'],env:{...process.env,...env}});
  const out=[],err=[];child.stdout.on('data',x=>out.push(x));child.stderr.on('data',x=>err.push(x));
  child.once('error',reject);child.once('close',code=>resolve({code,stdout:Buffer.concat(out).toString('utf8'),stderr:Buffer.concat(err).toString('utf8')}));child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(config));
 });
}
async function fixture(t,response=()=>JSON.stringify({version:1,suggestions:[suggestion]})){
 const requests=[],server=createServer((req,res)=>{let body='';req.on('data',x=>body+=x);req.on('end',()=>{
  requests.push({body,headers:req.headers});res.writeHead(200,{'content-type':'application/json'});
  res.end(JSON.stringify({done:true,done_reason:'stop',message:{role:'assistant',content:response()},eval_count:50}));
 });});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});
 const draftText=JSON.stringify({version:1,question:'Compare A and B',sources:[{id:'a',lineage:'r1',text:'A: 12.50; repeat: 12.50;'},{id:'hidden',lineage:'r2',text:hidden+' 88;'}],bindings:[]});
 const config={version:LOCAL_BINDING_VERSION,draftText,draftPin:await casePin(draftText),sourceIds:['a'],connection:{id:'my-model',label:'My own model',protocol:'ollama-chat-json',endpoint:'http://127.0.0.1:'+server.address().port+'/api/chat',models:['user/own'],authMode:'bearer',credentialEnv:'SUTRA_LOCAL_BINDING_TEST'},maxOutputTokens:512,timeoutMs:5000,transportDeadlineMs:3000};
 return {requests,config};
}
test('plan-only no I/O, explicit loopback extraction, scoped source, compact transfer and independently retained proposal digest',async t=>{
 const {config,requests}=await fixture(t),plan=await run(config);
 assert.equal(plan.code,0,plan.stderr);const p=JSON.parse(plan.stdout);assert.equal(p.mode,'LOCAL_BINDING_PLAN_ONLY');assert.equal(requests.length,0);assert.equal(plan.stdout.includes(hidden),false);
 const args=['--execute-local','--approve-local-disclosure','--approve-plan',p.planPin];
 for(const changed of [{...config,sourceIds:['hidden']},{...config,maxOutputTokens:256}]){
  const refused=await run(changed,args,{SUTRA_LOCAL_BINDING_TEST:secret});assert.equal(refused.code,1);assert.match(refused.stderr,/PLAN_PIN_MISMATCH/);assert.equal(requests.length,0);
 }
 const missing=await run(config,args,{SUTRA_LOCAL_BINDING_TEST:''});assert.equal(missing.code,1);assert.equal(requests.length,0);
 const out=await run(config,args,{SUTRA_LOCAL_BINDING_TEST:secret});assert.equal(out.code,0,out.stderr);assert.equal(requests.length,1);
 assert.equal(requests[0].headers.authorization,'Bearer '+secret);assert.equal(requests[0].body.includes(hidden),false);assert.equal(requests[0].body.includes(secret),false);
 assert.equal(out.stdout.includes(secret),false);assert.equal(out.stderr.includes(secret),false);assert.equal(out.stdout.includes(hidden),false);
 const tpin=JSON.parse(out.stderr).proposalPin,verified=await verifyLocalBindingTransfer({configText:JSON.stringify(config),expectedPlanPin:p.planPin,transferText:out.stdout,expectedProposalPin:tpin});
 assert.equal(verified.preview.rows[0].state,'REVIEW_REQUIRED');assert.equal(verified.decisionAuthority,'NONE');
 const changed=JSON.parse(out.stdout);changed.proposalText=JSON.stringify({version:1,suggestions:[{...suggestion,sourceId:'hidden'}]});changed.proposalPin=await casePin(changed.proposalText);
 await assert.rejects(verifyLocalBindingTransfer({configText:JSON.stringify(config),expectedPlanPin:p.planPin,transferText:JSON.stringify(changed),expectedProposalPin:changed.proposalPin}),/DISCLOSURE/);
 await assert.rejects(verifyLocalBindingTransfer({configText:JSON.stringify(config),expectedPlanPin:p.planPin,transferText:out.stdout,expectedProposalPin:'sha256:'+'0'.repeat(64)}),/TRANSFER/);
});
test('local config refuses nonloopback and raw credentials before any I/O',async t=>{
 const {config,requests}=await fixture(t);
 for(const connection of [{...config.connection,endpoint:'https://example.com/chat'},{...config.connection,credentialEnv:secret}]){
  await assert.rejects(admitLocalBindingConfig(JSON.stringify({...config,connection})));assert.equal(requests.length,0);
 }
});

test('operator never exports escaped credential echo in an untrusted transfer',async t=>{
 const inner=JSON.stringify({version:1,suggestions:[{...suggestion,type:{...suggestion.type,scope:secret}}]}).replace(secret,'\\u004c'+secret.slice(1));
 assert.equal(inner.includes(secret),false);assert.equal(JSON.parse(inner).suggestions[0].type.scope,secret);
 const {config,requests}=await fixture(t,()=>inner),p=JSON.parse((await run(config)).stdout);
 const out=await run(config,['--execute-local','--approve-local-disclosure','--approve-plan',p.planPin],{SUTRA_LOCAL_BINDING_TEST:secret});
 assert.equal(requests.length,1);assert.equal(out.code,1);assert.equal(out.stdout,'');assert.equal(JSON.parse(out.stderr).reason,'SECRET_ECHO');assert.equal(out.stderr.includes(secret),false);
});
test('credential embedded in the operator endpoint path refuses before contact',async t=>{
 const {config,requests}=await fixture(t);config.connection.endpoint+='/'+secret;
 const plan=await run(config);assert.equal(plan.code,0,plan.stderr);
 const out=await run(config,['--execute-local','--approve-local-disclosure','--approve-plan',JSON.parse(plan.stdout).planPin],{SUTRA_LOCAL_BINDING_TEST:secret});
 assert.equal(out.code,1);assert.equal(out.stdout,'');assert.equal(out.stderr.includes(secret),false);assert.equal(requests.length,0);
});

test('saved extraction plan recovery requires independently retained digest and exact already staged draft',async t=>{
 const {config,requests}=await fixture(t),configText=JSON.stringify(config),expectedPlanPin=await casePin(configText),currentDraftText=config.draftText;
 const p=await recoverLocalBindingPlan({configText,expectedPlanPin,currentDraftText});
 assert.equal(p.planPin,expectedPlanPin);assert.deepEqual(p.config.sourceIds,['a']);assert.equal(p.preview.mode,'LOCAL_BINDING_PLAN_ONLY');
 for(const args of [{expectedPlanPin:'sha256:'+'0'.repeat(64)},{currentDraftText:currentDraftText+' '},{configText:JSON.stringify({...config,maxOutputTokens:256})}])await assert.rejects(recoverLocalBindingPlan({configText,expectedPlanPin,currentDraftText,...args}),/PLAN_OR_DRAFT_MISMATCH/);
 assert.equal(requests.length,0);
});
