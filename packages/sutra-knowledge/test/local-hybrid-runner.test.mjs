import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {livingFixture} from '../examples/living-investigation.mjs';
import {casePin} from '../pinned-investigation.js';
import {openExecutionCheckpoint} from '../../sutra-runtime/execution-checkpoint.js';
const cli=fileURLToPath(new URL('../../../apps/sutra-v2/local-hybrid.mjs',import.meta.url)),token='LOCAL_HYBRID_FIXTURE_CANARY_123456';
function run(text,args=[],env={}){
 return new Promise((resolve,reject)=>{
  const p=spawn(process.execPath,[cli,...args],{stdio:['pipe','pipe','pipe'],env:{...process.env,...env}});
  const stdout=[],stderr=[];p.stdout.on('data',x=>stdout.push(x));p.stderr.on('data',x=>stderr.push(x));p.once('error',reject);p.once('close',code=>resolve({code,stdout:Buffer.concat(stdout).toString(),stderr:Buffer.concat(stderr).toString()}));p.stdin.on('error',()=>{});p.stdin.end(text);
 });
}
async function fixture(t){
 const requests=[],server=createServer((req,res)=>{
  const chunks=[];req.on('data',x=>chunks.push(x));req.on('end',()=>{
   const body=JSON.parse(Buffer.concat(chunks)),op=JSON.parse(body.messages.at(-1).content);requests.push({headers:req.headers,op});
   const expression=op.agentId==='analyst'?'[first] > [baseline]':'[first] < [baseline]',text=JSON.stringify({version:1,kind:'expression',expression});
   res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:text}}],usage:{completion_tokens:3}}));
  });
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});
 const v=await livingFixture(),wire=JSON.parse(v.versionText);
 const config={version:'sutra-mixed-expression-council/v1',contractText:wire.contractText,contractPin:wire.contractPin,disclosure:{bindingIds:['first','baseline'],includeValues:false},connections:[{id:'one',label:'Local test',protocol:'openai-compatible-json',endpoint:'http://127.0.0.1:'+server.address().port+'/chat',models:['local/a','local/b'],authMode:'bearer',credentialEnv:'SUTRA_LOCAL_HYBRID_TEST',transportClass:'local'}],agents:[{id:'analyst',role:'Compare',connectionId:'one',model:'local/a'},{id:'critic',role:'Challenge',connectionId:'one',model:'local/b'}],budget:{maxCalls:2,maxInputBytes:100000,maxOutputTokens:1024,maxConcurrent:2},maxRounds:1,maxOutputTokens:256,roundPolicy:'fixed',timeoutMs:10000,transportDeadlineMs:5000};
 const wrapper={version:'sutra-mixed-hybrid-operator/v1',versionText:v.versionText,versionPin:v.digest,councilConfigText:JSON.stringify(config)},text=JSON.stringify(wrapper);
 return {v,requests,config,wrapper,text,pin:await casePin(text)};
}
test('local hybrid CLI previews without contact then executes exact reviewed plan over real loopback',async t=>{
 const f=await fixture(t),p=await run(f.text,['--plan']);
 assert.equal(p.code,0,p.stderr);assert.equal(JSON.parse(p.stdout).planPin,f.pin);assert.equal(f.requests.length,0);
 const args=['--execute-local','--approve-local-disclosure','--approve-plan',f.pin];
 for(const [text,flags] of [[f.text,['--execute-local']],[f.text+' ',args],[f.text,args]]){
  const refused=await run(text,flags,{SUTRA_LOCAL_HYBRID_TEST:''});assert.equal(refused.code,1);assert.equal(f.requests.length,0);assert.equal(refused.stdout,'');
 }
 const r=await run(f.text,args,{SUTRA_LOCAL_HYBRID_TEST:token});assert.equal(r.code,0,r.stderr);const out=JSON.parse(r.stdout);
 assert.equal(out.status,'completed');assert.equal(out.result.artifacts.length,8);assert.equal(f.requests.length,2);assert.ok(f.requests.every(x=>x.headers.authorization==='Bearer '+token));
 assert.ok(f.requests.every(x=>!JSON.stringify(x.op).includes(token)&&x.op.bindings.every(b=>!Object.hasOwn(b,'valueLexeme'))));
 assert.equal(out.budget.used.calls,2);assert.ok(!r.stdout.includes(token)&&!r.stderr.includes(token));
 const cp=await openExecutionCheckpoint(out.checkpoint.text,out.checkpoint.pin,f.v.digest);assert.equal(cp.checkpoint.artifactPins.length,8);
});
test('local-only CLI refuses a hosted configuration even in preview',async t=>{
 const f=await fixture(t),config={...f.config,connections:f.config.connections.map(x=>({...x,transportClass:'hosted',endpoint:'https://api.example.com/v1/chat',credentialEnv:'SUTRA_HOSTED_TEST'}))};
 const r=await run(JSON.stringify({...f.wrapper,councilConfigText:JSON.stringify(config)}),['--plan']);assert.equal(r.code,1);assert.match(r.stderr,/HOSTED_NOT_SUPPORTED/);assert.equal(f.requests.length,0);
});
