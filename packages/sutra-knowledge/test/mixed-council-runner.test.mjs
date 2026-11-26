import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {EventEmitter} from 'node:events';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {admitMixedCouncilConfig,MIXED_COUNCIL_VERSION} from '../mixed-council-config.js';
import {runApprovedMixedCouncil} from '../mixed-council-runner.js';
import {verifyExpressionReviewReceipt} from '../expression-review-receipt.js';
const A='HOSTED_FIXTURE_CANARY_987654321',B='LOCAL_FIXTURE_CANARY_123456789';
const left='[ocf26] > [ocf25]',right='([ocf26] - [ppe26]) > ([ocf25] - [ppe25])';
const response=expr=>JSON.stringify({version:1,kind:'expression',expression:expr});
async function setup(t){
 const requests=[];
 const server=createServer((req,res)=>{
  let body='';req.on('data',x=>body+=x);req.on('end',()=>{
   requests.push({type:'local',header:req.headers.authorization,body:JSON.parse(body)});
   res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({done:true,done_reason:'stop',message:{role:'assistant',content:response(left)},eval_count:3}));
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const f=await compilerFinanceFixture();
 const config={version:MIXED_COUNCIL_VERSION,contractText:f.contractText,contractPin:f.pin,disclosure:{bindingIds:['ocf25','ocf26','ppe25','ppe26'],includeValues:false},connections:[
  {id:'local-own',label:'Local model',protocol:'ollama-chat-json',endpoint:'http://127.0.0.1:'+server.address().port+'/api/chat',models:['private/local'],authMode:'bearer',credentialEnv:'SUTRA_LOCAL_TEST',transportClass:'local'},
  {id:'remote-own',label:'Hosted model',protocol:'anthropic-messages-json',endpoint:'https://api.example.com/v1/messages',models:['private/remote'],authMode:'anthropic-key',credentialEnv:'SUTRA_HOSTED_TEST',transportClass:'hosted'}
 ],agents:[{id:'analyst',role:'Investigate',connectionId:'local-own',model:'private/local'},{id:'critic',role:'Challenge',connectionId:'remote-own',model:'private/remote'}],budget:{maxCalls:4,maxInputBytes:50000,maxOutputTokens:2048,maxConcurrent:2},maxRounds:2,maxOutputTokens:256,roundPolicy:'fixed',timeoutMs:10000,transportDeadlineMs:5000};
 const wire=JSON.stringify(config),plan=await admitMixedCouncilConfig(wire);
 const dns=[];
 const resolveAll=async hostname=>{dns.push(hostname);return [{address:'8.8.8.8',family:4}];};
 const hostedIO={
  dialTls(options){const s=Object.assign(new EventEmitter(),{encrypted:true,authorized:true,remoteAddress:options.host,remotePort:443,alpnProtocol:'http/1.1',getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:api.example.com'}),destroy(){}});queueMicrotask(()=>s.emit('secureConnect'));return s;},
  requestHttps(options,callback){const s=options.createConnection(),req=Object.assign(new EventEmitter(),{destroy(){},end(body){
   requests.push({type:'hosted',header:options.headers['x-api-key'],body:JSON.parse(body)});
   queueMicrotask(()=>{req.emit('socket',s);const res=Object.assign(new EventEmitter(),{statusCode:200,headers:{'content-type':'application/json'},complete:true,destroy(){}});callback(res);res.emit('data',Buffer.from(JSON.stringify({type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text:response(right)}],usage:{output_tokens:4}})));res.emit('end');});
  }});return req;}
 };
 const reads=[];
 const readCredential=async alias=>{reads.push(alias);return alias==='SUTRA_LOCAL_TEST'?B:A;};
 return {config,wire,plan,requests,dns,reads,options:{configText:wire,approvedPlanPin:plan.planPin,approveDisclosure:true,approveHosted:true,readCredential,resolveAll,hostedIO}};
}
test('actual loopback TCP and injected hosted TLS route collaborate with exact approval, separate credentials and shared verifier',async t=>{
 const s=await setup(t);
 assert.equal(s.plan.preview.hostedConnections,1);assert.equal(s.requests.length,0);assert.equal(s.dns.length,0);assert.equal(s.reads.length,0);
 const result=await runApprovedMixedCouncil(s.options);
 assert.equal(result.status,'DIVERGENT_CONDITIONAL_OUTCOMES');assert.equal(result.result.rounds.length,2);assert.equal(result.budget.used.calls,4);
 assert.deepEqual(s.reads,['SUTRA_LOCAL_TEST','SUTRA_HOSTED_TEST']);assert.equal(s.requests.filter(x=>x.type==='local').length,2);assert.equal(s.requests.filter(x=>x.type==='hosted').length,2);
 for(const x of s.requests){assert.equal(x.header,x.type==='local'?'Bearer '+B:A);assert.equal(JSON.stringify(x.body).includes(A),false);assert.equal(JSON.stringify(x.body).includes(B),false);}
 assert.equal(s.dns.length,2);
 const verified=await verifyExpressionReviewReceipt({contractText:s.config.contractText,contractPin:s.config.contractPin,...result.receipt});assert.equal(verified.state,result.status);
 assert.equal(JSON.stringify(result).includes(A),false);assert.equal(JSON.stringify(result).includes(B),false);
});
test('missing approval, stale exact plan, hosted activation or credential fails before either route contacts',async t=>{
 const s=await setup(t);
 for(const changes of [{approveHosted:false},{approveDisclosure:false},{approvedPlanPin:'sha256:'+'0'.repeat(64)},{configText:s.wire+' '},{hostedIO:undefined}]){
  await assert.rejects(runApprovedMixedCouncil({...s.options,...changes}));assert.equal(s.reads.length,0);assert.equal(s.requests.length,0);assert.equal(s.dns.length,0);
 }
 await assert.rejects(runApprovedMixedCouncil({...s.options,readCredential:async alias=>alias==='SUTRA_LOCAL_TEST'?B:null}),/CREDENTIAL_REQUIRED/);
 assert.equal(s.requests.length,0);assert.equal(s.dns.length,0);
});
test('mixed plan refuses route class swaps, credential alias crossing and unsupported hosted protocol without I/O',async t=>{
 const s=await setup(t);
 for(const edit of [c=>c.connections[0].transportClass='hosted',c=>c.connections[1].credentialEnv='SUTRA_LOCAL_TEST',c=>c.connections[1].protocol='ollama-chat-json',c=>c.connections[1].endpoint='https://127.0.0.1/v1/messages']){
  const c=structuredClone(s.config);edit(c);await assert.rejects(admitMixedCouncilConfig(JSON.stringify(c)));
 }
 assert.equal(s.requests.length,0);assert.equal(s.dns.length,0);
});
