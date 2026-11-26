import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createLoopbackModelExchange} from '../loopback-model-exchange.js';
import {createProtocolWorkspace} from '../protocol-workspace.js';
const KEY='LOOPBACK_TEST_CREDENTIAL_1234',UNUSED='LOCAL_NO_AUTH_PLACEHOLDER_1234';
const limits={maxCalls:8,maxInputBytes:100000,maxOutputTokens:2000,maxConcurrent:2};
async function server(t,handler){
 const s=createServer(handler);
 await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});
 t.after(()=>{s.closeAllConnections();return new Promise(resolve=>s.close(resolve));});
 return 'http://127.0.0.1:'+s.address().port;
}
const json=(res,body)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
function route(base,overrides={}){return {connectionId:'private-model',protocol:'openai-compatible-json',endpoint:base+'/v1/chat/completions',models:['mine/local'],authMode:'none',...overrides};}
function wire(r,overrides={}){
 return {connectionId:r.connectionId,protocol:r.protocol,transportClass:'local',endpoint:r.endpoint,model:r.models[0],credential:UNUSED,bodyText:JSON.stringify({model:r.models[0],messages:[{role:'system',content:'bounded'},{role:'user',content:'hello'}],max_tokens:32,stream:false}),maxOutputTokens:32,...overrides};
}
const open=text=>({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:text}}],usage:{completion_tokens:2}});
test('real loopback TCP exchange integrates two wire profiles with exact route and auth isolation',async t=>{
 const seen=[];
 const base=await server(t,(req,res)=>{const chunks=[];req.on('data',x=>chunks.push(x));req.on('end',()=>{const body=JSON.parse(Buffer.concat(chunks));seen.push({url:req.url,headers:req.headers,body});if(req.url==='/v1/messages')json(res,{type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text:'second'}],usage:{output_tokens:3}});else json(res,open('first'));});});
 const routes=[route(base),route(base,{connectionId:'another-local',protocol:'anthropic-messages-json',endpoint:base+'/v1/messages',models:['other/local'],authMode:'anthropic-key'})];
 const local=createLoopbackModelExchange({routes});t.after(()=>local.close());
 const w=createProtocolWorkspace({connections:routes.map(r=>({id:r.connectionId,label:r.connectionId,protocol:r.protocol,endpoint:r.endpoint,transportClass:'local',models:r.models})),exchange:local.exchange,globalLimits:limits,defaultProfileLimits:limits});
 const p=w.addProfile({providerId:routes[0].connectionId,label:'No key',credential:UNUSED}),q=w.addProfile({providerId:routes[1].connectionId,label:'Key fixture',credential:KEY});
 const call=(profile,model)=>w.execute({handle:profile.handle,model,inputBytes:1,maxOutputTokens:32,operation:{kind:'test',request:'local only'}});
 const result=await Promise.all([call(p,'mine/local'),call(q,'other/local')]);
 assert.deepEqual(result.map(x=>x.value.text),['first','second']);assert.equal(w.budgetSnapshot().global.used.actualOutputTokens,5);
 const a=seen.find(x=>x.url==='/v1/chat/completions'),b=seen.find(x=>x.url==='/v1/messages');
 assert.equal(a.headers.authorization,undefined);assert.equal(a.headers['x-api-key'],undefined);assert.equal(b.headers['x-api-key'],KEY);assert.equal(b.headers.authorization,undefined);
 assert.equal(b.headers['anthropic-version'],'2023-06-01');assert.equal(a.body.model,'mine/local');assert.equal(b.body.model,'other/local');
 assert.equal(JSON.stringify(seen.map(x=>x.body)).includes(KEY),false);assert.equal(JSON.stringify(seen).includes(UNUSED),false);
});
test('only literal loopback, approved port/path/model and bounded wire shape are admitted',async t=>{
 let contacted=0;const base=await server(t,(_req,res)=>{contacted++;json(res,open('ok'));});
 for(const endpoint of ['http://localhost:12345/v1/chat','http://127.0.0.2:12345/v1/chat','http://169.254.169.254:12345/v1/chat','http://10.0.0.1:12345/v1/chat','https://127.0.0.1:12345/v1/chat','http://127.0.0.1/v1/chat','http://127.0.0.1:12345/v1/chat?x=1','http://127.0.0.1:12345/v1/%2e%2e/chat','http://2130706433:12345/v1/chat','http://[::ffff:127.0.0.1]:12345/v1/chat'])assert.throws(()=>createLoopbackModelExchange({routes:[route(base,{endpoint})]}),/ENDPOINT/);
 const r=route(base),local=createLoopbackModelExchange({routes:[r]});t.after(()=>local.close());
 for(const input of [wire(r,{endpoint:base+'/other'}),wire(r,{model:'unapproved'}),wire(r,{transportClass:'hosted'}),wire(r,{protocol:'anthropic-messages-json'}),wire(r,{bodyText:JSON.stringify({...JSON.parse(wire(r).bodyText),tools:[]})}),wire(r,{bodyText:JSON.stringify({...JSON.parse(wire(r).bodyText),model:'wrong'})})])await assert.rejects(local.exchange(input));
 assert.equal(contacted,0);
});
test('redirect, non-JSON, partial, invalid UTF-8 and oversize responses fail closed without following targets',async t=>{
 let redirected=0;const base=await server(t,(req,res)=>{if(req.url==='/target'){redirected++;json(res,open('wrong'));return;}if(req.url==='/redirect'){res.writeHead(302,{Location:'/target'});res.end();return;}if(req.url==='/nonjson'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('bad');return;}if(req.url==='/partial'){res.writeHead(200,{'Content-Type':'application/json','Content-Range':'bytes 0-1/3'});res.end('{}');return;}if(req.url==='/invalid'){res.writeHead(200,{'Content-Type':'application/json'});res.end(Buffer.from([0xc3,0x28]));return;}res.writeHead(200,{'Content-Type':'application/json'});res.end('x'.repeat(262145));});
 for(const suffix of ['redirect','nonjson','partial','invalid','large']){
  const r=route(base,{endpoint:base+'/'+suffix}),local=createLoopbackModelExchange({routes:[r]});
  await assert.rejects(local.exchange(wire(r)));local.close();
 }
 assert.equal(redirected,0);
});
test('deadline and explicit host shutdown terminate pending local requests without automatic retry',async t=>{
 let count=0;const base=await server(t,()=>{count++;});
 const r=route(base),local=createLoopbackModelExchange({routes:[r],deadlineMs:100});
 await assert.rejects(local.exchange(wire(r)),/TIMEOUT/);assert.equal(count,1);local.close();
 const second=createLoopbackModelExchange({routes:[r],deadlineMs:2000});
 const p=second.exchange(wire(r));second.close();
 await assert.rejects(p,/CANCELLED/);await assert.rejects(second.exchange(wire(r)),/CLOSED/);
});

test('native Ollama request goes over literal loopback without credentials; altered token cap and options never contact server',async t=>{
 const seen=[];const base=await server(t,(req,res)=>{const chunks=[];req.on('data',x=>chunks.push(x));req.on('end',()=>{seen.push({url:req.url,headers:req.headers,body:JSON.parse(Buffer.concat(chunks))});json(res,{done:true,done_reason:'stop',message:{role:'assistant',content:'native result'},eval_count:4});});});
 const r=route(base,{protocol:'ollama-chat-json',endpoint:base+'/api/chat',models:['local-model:latest']});const local=createLoopbackModelExchange({routes:[r]});t.after(()=>local.close());
 const w=createProtocolWorkspace({connections:[{id:r.connectionId,label:'Native',protocol:r.protocol,endpoint:r.endpoint,transportClass:'local',models:r.models}],exchange:local.exchange,globalLimits:limits,defaultProfileLimits:limits});
 const p=w.addProfile({providerId:r.connectionId,label:'Local',credential:UNUSED});const result=await w.execute({handle:p.handle,model:r.models[0],inputBytes:1,maxOutputTokens:32,operation:{kind:'test',request:'local only'}});
 assert.equal(result.value.text,'native result');assert.equal(seen.length,1);assert.equal(seen[0].url,'/api/chat');assert.deepEqual(seen[0].body.options,{num_predict:32});assert.equal(seen[0].headers.authorization,undefined);assert.equal(JSON.stringify(seen).includes(UNUSED),false);assert.equal(w.budgetSnapshot().global.used.actualOutputTokens,4);
 for(const options of [{num_predict:-1},{num_predict:31},{num_predict:32,temperature:1}])await assert.rejects(local.exchange(wire(r,{bodyText:JSON.stringify({...seen[0].body,options})})),/BODY/);
 assert.equal(seen.length,1);assert.throws(()=>createLoopbackModelExchange({routes:[{...r,authMode:'anthropic-key'}]}),/ROUTE/);
});
