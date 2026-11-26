import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {casePin} from '../pinned-investigation.js';
import {replayInvestigationVersion} from '../investigation-revision.js';
import {verifyExpressionReviewReceipt} from '../expression-review-receipt.js';
import {verifyLocalCouncilTransfer} from '../local-council-transfer.js';
const cli=fileURLToPath(new URL('../../../apps/sutra-v2/local-council.mjs',import.meta.url));
const token='LOCAL_RUNNER_TEST_TOKEN_1234';
const approved=async config=>['--execute-local','--approve-local-disclosure','--approve-plan',await casePin(JSON.stringify(config))];
function run(config,args=[],env={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[cli,...args],{stdio:['pipe','pipe','pipe'],env:{...process.env,...env}});
  const stdout=[],stderr=[];child.stdout.on('data',x=>stdout.push(x));child.stderr.on('data',x=>stderr.push(x));
  child.once('error',reject);child.once('close',code=>resolve({code,stdout:Buffer.concat(stdout).toString('utf8'),stderr:Buffer.concat(stderr).toString('utf8')}));
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(config));
 });
}
async function fixture(t){
 const requests=[],server=createServer((req,res)=>{const chunks=[];req.on('data',x=>chunks.push(x));req.on('end',()=>{
  const body=JSON.parse(Buffer.concat(chunks)),op=JSON.parse(body.messages.at(-1).content);
  requests.push({path:req.url,headers:req.headers,op});
  const expression=op.agentId==='director'?'[ocf26] > [ocf25]':'([ocf26] - [ppe26]) > ([ocf25] - [ppe25])',text=JSON.stringify({version:1,kind:'expression',expression});
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify(req.url==='/messages'?{type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text}],usage:{output_tokens:3}}:{choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:text}}],usage:{completion_tokens:2}}));
 });});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
 const base='http://127.0.0.1:'+server.address().port,f=await compilerFinanceFixture();
 const config={version:'sutra-local-expression-council/v1',contractText:f.contractText,contractPin:f.pin,disclosure:{bindingIds:['ocf25','ppe25','ocf26','ppe26'],includeValues:false},connections:[{id:'my-local',label:'My local model',protocol:'openai-compatible-json',endpoint:base+'/chat',models:['user/local-a'],authMode:'none',credentialEnv:null},{id:'second-local',label:'Second model',protocol:'anthropic-messages-json',endpoint:base+'/messages',models:['user/local-b'],authMode:'anthropic-key',credentialEnv:'SUTRA_LOCAL_RUNNER_TEST'}],agents:[{id:'director',role:'investigator',connectionId:'my-local',model:'user/local-a'},{id:'challenger',role:'challenger',connectionId:'second-local',model:'user/local-b'}],budget:{maxCalls:4,maxInputBytes:100000,maxOutputTokens:2048,maxConcurrent:2},maxRounds:2,maxOutputTokens:256,roundPolicy:'fixed',timeoutMs:5000,transportDeadlineMs:3000};
 return {requests,config};
}
test('local runner plans without reading credential or contacting endpoint; explicit flags drive real local wire council',async t=>{
 const {requests,config}=await fixture(t);
 const planned=await run(config);assert.equal(planned.code,0);assert.equal(JSON.parse(planned.stdout).mode,'LOCAL_PLAN_ONLY');assert.equal(requests.length,0);
 const single=await run(config,['--execute-local']);assert.equal(single.code,1);assert.equal(requests.length,0);
 const plan=JSON.parse(planned.stdout);assert.equal(plan.planPin,await casePin(JSON.stringify(config)));assert.equal(plan.disclosedBindings.length,4);assert.ok(plan.disclosedBindings.every(b=>!Object.hasOwn(b,'valueLexeme')));
 const out=await run(config,[...await approved(config),'--export-version'],{SUTRA_LOCAL_RUNNER_TEST:token});
 assert.equal(out.code,0,out.stderr);const result=JSON.parse(out.stdout);
 assert.equal(result.mode,'EXPLICIT_LOCAL_LOOPBACK_HTTP');assert.equal(result.result.state,'DIVERGENT_CONDITIONAL_OUTCOMES');assert.equal(result.budget.used.calls,4);assert.equal(result.budget.used.actualOutputTokens,10);
 assert.equal(result.receipt.receiptPin.startsWith('sha256:'),true);assert.equal(requests.length,4);
 assert.equal(result.receiptStatus,'CREATED');assert.equal(result.investigationStatus,'CREATED');assert.equal(result.planPin,plan.planPin);
 assert.equal((await verifyExpressionReviewReceipt({contractText:config.contractText,contractPin:config.contractPin,...result.receipt})).state,'DIVERGENT_CONDITIONAL_OUTCOMES');
 assert.equal((await replayInvestigationVersion(result.investigation.versionText,result.investigation.versionPin)).investigation.triage.state,'DIVERGENT_CONDITIONAL_OUTCOMES');
 assert.ok(requests.filter(x=>x.path==='/chat').every(x=>x.headers.authorization===undefined&&x.headers['x-api-key']===undefined));
 assert.ok(requests.filter(x=>x.path==='/messages').every(x=>x.headers['x-api-key']===token));
 assert.equal(JSON.stringify(requests.map(x=>x.op)).includes('136162'),false);
 assert.equal(out.stdout.includes(token),false);assert.equal(out.stderr.includes(token),false);
});
test('wrong pin, unknown binding, unused endpoint and missing authentication refuse before first contact',async t=>{
 const {requests,config}=await fixture(t),args=await approved(config);
 for(const c of [{...config,contractPin:'sha256:'+'0'.repeat(64)},{...config,disclosure:{bindingIds:['not_present'],includeValues:false}},{...config,agents:config.agents.slice(0,1)}]){
  const r=await run(c,await approved(c),{SUTRA_LOCAL_RUNNER_TEST:token});assert.equal(r.code,1);assert.equal(r.stdout,'');assert.equal(requests.length,0);
 }
 const missing=await run(config,args,{SUTRA_LOCAL_RUNNER_TEST:''});assert.equal(missing.code,1);assert.match(missing.stderr,/LOCAL_CREDENTIAL_REQUIRED/);assert.equal(requests.length,0);
});

test('approval binds exact configuration including disclosure, routes, budgets and credential aliases',async t=>{
 const {requests,config}=await fixture(t),plan=await run(config),args=await approved(config);
 assert.equal(JSON.parse(plan.stdout).planPin,args[3]);
 for(const changed of [
  {...config,disclosure:{...config.disclosure,includeValues:true}},
  {...config,budget:{...config.budget,maxCalls:3}},
  {...config,connections:config.connections.map((c,i)=>i?{...c,credentialEnv:'SUTRA_LOCAL_OTHER'}:c)},
  {...config,agents:config.agents.map((a,i)=>i?{...a,role:'Changed instructions'}:a)}
 ]){const out=await run(changed,args,{SUTRA_LOCAL_RUNNER_TEST:token});assert.equal(out.code,1);assert.match(out.stderr,/PLAN_PIN_MISMATCH/);assert.equal(out.stdout,'');}
 assert.equal(requests.length,0);
 const noPin=await run(config,['--execute-local','--approve-local-disclosure'],{SUTRA_LOCAL_RUNNER_TEST:token});assert.equal(noPin.code,1);assert.equal(requests.length,0);
 const valuePlan=await run({...config,disclosure:{...config.disclosure,includeValues:true}});assert.equal(valuePlan.code,0);assert.equal(JSON.parse(valuePlan.stdout).disclosedBindings.find(x=>x.id==='ocf25').valueLexeme,'136162');assert.equal(requests.length,0);
 const defaultOut=await run(config,args,{SUTRA_LOCAL_RUNNER_TEST:token});assert.equal(defaultOut.code,0,defaultOut.stderr);assert.equal(JSON.parse(defaultOut.stdout).investigationStatus,'NOT_REQUESTED');
});

test('local operator preview binds directional per-agent disclosure, rejects downward flow without contact',async t=>{
 const {requests,config}=await fixture(t);
 const d={bindingIds:['ocf25','ppe25','ocf26','ppe26'],includeValues:true,agentScopes:[{agentId:'director',bindingIds:['ocf25','ocf26'],includeValues:false,feedbackFrom:[]},{agentId:'challenger',bindingIds:['ocf25','ppe25','ocf26','ppe26'],includeValues:true,feedbackFrom:['director']}]};
 const c={...config,disclosure:d};const p=await run(c);assert.equal(p.code,0,p.stderr);const plan=JSON.parse(p.stdout);
 assert.equal(plan.disclosedBindings,null);assert.equal(plan.agentDisclosures[0].bindings.length,2);assert.ok(plan.agentDisclosures[0].bindings.every(b=>!Object.hasOwn(b,'valueLexeme')));assert.ok(plan.agentDisclosures[1].bindings.every(b=>Object.hasOwn(b,'valueLexeme')));
 const bad={...c,disclosure:{...d,agentScopes:[{...d.agentScopes[0],feedbackFrom:['challenger']},d.agentScopes[1]]}};const refusal=await run(bad,await approved(bad),{SUTRA_LOCAL_RUNNER_TEST:token});assert.equal(refusal.code,1);assert.match(refusal.stderr,/DISCLOSURE_FLOW/);assert.equal(requests.length,0);
 const x=await run(c,await approved(c),{SUTRA_LOCAL_RUNNER_TEST:token});assert.equal(x.code,0,x.stderr);
 const low=requests.filter(r=>r.path==='/chat').map(r=>r.op),high=requests.filter(r=>r.path==='/messages').map(r=>r.op);
 assert.equal(low[1].feedback.length,1);assert.equal(high[1].feedback.length,2);assert.equal(JSON.stringify(low).includes('ppe25'),false);assert.equal(JSON.stringify(low).includes('136162'),false);
});

test('actual local CLI portable output omits transcript, credentials and budget and replays exact root',async t=>{
 const {requests,config}=await fixture(t),args=await approved(config);
 const out=await run(config,[...args,'--export-version','--portable-output'],{SUTRA_LOCAL_RUNNER_TEST:token});assert.equal(out.code,0,out.stderr);
 const x=JSON.parse(out.stdout);assert.equal(x.version,'sutra-local-council-transfer/v1');assert.equal(x.result,undefined);assert.equal(x.budget,undefined);assert.equal(out.stdout.includes(token),false);assert.equal(requests.length,4);
 const verified=await verifyLocalCouncilTransfer({transferText:out.stdout,contractText:config.contractText,contractPin:config.contractPin,expectedPlanPin:args[3],expectedReceiptPin:x.receipt.receiptPin,expectedVersionPin:x.investigation.versionPin});
 assert.equal(verified.state,'DIVERGENT_CONDITIONAL_OUTCOMES');assert.equal(verified.version.versionText,x.investigation.versionText);assert.equal(verified.decisionAuthority,'NONE');
});
