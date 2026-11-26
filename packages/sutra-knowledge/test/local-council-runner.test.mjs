import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
const cli=fileURLToPath(new URL('../../../apps/sutra-v2/local-council.mjs',import.meta.url));
const token='LOCAL_RUNNER_TEST_TOKEN_1234';
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
 const out=await run(config,['--execute-local','--approve-local-disclosure'],{SUTRA_LOCAL_RUNNER_TEST:token});
 assert.equal(out.code,0,out.stderr);const result=JSON.parse(out.stdout);
 assert.equal(result.mode,'EXPLICIT_LOCAL_LOOPBACK_HTTP');assert.equal(result.result.state,'DIVERGENT_CONDITIONAL_OUTCOMES');assert.equal(result.budget.used.calls,4);assert.equal(result.budget.used.actualOutputTokens,10);
 assert.equal(result.receipt.receiptPin.startsWith('sha256:'),true);assert.equal(requests.length,4);
 assert.ok(requests.filter(x=>x.path==='/chat').every(x=>x.headers.authorization===undefined&&x.headers['x-api-key']===undefined));
 assert.ok(requests.filter(x=>x.path==='/messages').every(x=>x.headers['x-api-key']===token));
 assert.equal(JSON.stringify(requests.map(x=>x.op)).includes('136162'),false);
 assert.equal(out.stdout.includes(token),false);assert.equal(out.stderr.includes(token),false);
});
test('wrong pin, unknown binding, unused endpoint and missing authentication refuse before first contact',async t=>{
 const {requests,config}=await fixture(t),args=['--execute-local','--approve-local-disclosure'];
 for(const c of [{...config,contractPin:'sha256:'+'0'.repeat(64)},{...config,disclosure:{bindingIds:['not_present'],includeValues:false}},{...config,agents:config.agents.slice(0,1)}]){
  const r=await run(c,args,{SUTRA_LOCAL_RUNNER_TEST:token});assert.equal(r.code,1);assert.equal(r.stdout,'');assert.equal(requests.length,0);
 }
 const missing=await run(config,args,{SUTRA_LOCAL_RUNNER_TEST:''});assert.equal(missing.code,1);assert.match(missing.stderr,/LOCAL_CREDENTIAL_REQUIRED/);assert.equal(requests.length,0);
});
