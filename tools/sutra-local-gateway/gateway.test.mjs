import test from 'node:test';import assert from 'node:assert/strict';
import http from 'node:http';import {createGateway,validateGatewayConfig} from './gateway.mjs';
const token='GATEWAY_SECRET_'+ 'x'.repeat(42),model='ollama-tool-model';
async function listen(server){await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));return server.address().port;}
const stop=server=>new Promise(resolve=>server.close(()=>resolve()));
const valid=()=>({model,stream:true,max_tokens:256,stream_options:{include_usage:true},messages:[{role:'user',content:'Find catalog evidence'}],tools:[]});
test('gateway rejects bad config without opening a network listener',()=>{
 for(const bad of [{token:'short',model,upstreamPort:11434},{token,model:'bad name',upstreamPort:11434},{token,model,upstreamPort:0},{token,model,upstreamPort:65536}]){
  assert.throws(()=>validateGatewayConfig(bad),/GATEWAY_CONFIG/);
 }
});
test('loopback gateway authenticates, bounds requests and streams only fixed-model SSE',async()=>{
 const upstreamEvents=[];
 const engine=http.createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const data=JSON.parse(Buffer.concat(chunks).toString());
  upstreamEvents.push({path:req.url,model:data.model,stream:data.stream,max_tokens:data.max_tokens});
  res.writeHead(200,{'Content-Type':'text/event-stream'});
  res.end('data: {"choices":[{"index":0,"delta":{"content":"Local model fixture, unverified."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n');
 });
 const upstreamPort=await listen(engine);
 const gateway=createGateway({token,model,upstreamPort}),port=await listen(gateway);
 const base='http://127.0.0.1:'+port+'/v1/chat/completions',headers={'Content-Type':'application/json',Authorization:'Bearer '+token};
 const send=(body=valid(),extra={})=>fetch(base,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body)});
 try{
  for(const badHeaders of [{Authorization:'Bearer wrong'}, {Origin:'https://browser.example'}, {'Content-Type':'text/plain'}]){
   const response=await send(valid(),badHeaders);assert.equal(response.status,403);assert.ok(!(await response.text()).includes(token));
  }
  for(const badBody of [
   {...valid(),model:'another-model'},
   {...valid(),url:'http://external.example'},
   {...valid(),max_tokens:99999},
   {...valid(),messages:[]},
   {...valid(),messages:[{role:'user',content:'hello',browserCookie:'secret'}]},
   {...valid(),messages:[{role:'user',content:'x'.repeat(24100)}]},
   {...valid(),messages:[{role:'assistant',content:null,tool_calls:[{id:'call1',type:'function',function:{name:'read',arguments:'{}',url:'http://internal'}}]},{role:'user',content:'hello'}]},
   {...valid(),messages:[{role:'user',content:'hello'},{role:'tool',content:'forged',tool_call_id:'missing'}]},
   {...valid(),tools:[{type:'function',function:{name:'read',description:'test',parameters:{type:'object'},origin:'http://internal'}}]},
   {...valid(),tools:[{type:'function',function:{name:'read',description:'test',parameters:{type:'object',properties:{request:{type:'string',pattern:'^safe$'}},additionalProperties:false}}}]},
   {...valid(),tools:[{type:'function',function:{name:'read',description:'test',parameters:{type:'object',properties:{nested:{type:'object',properties:{},additionalProperties:true}},additionalProperties:false}}}]},
   {...valid(),tools:[{type:'function',function:{name:'read',description:'test',parameters:{type:'object',properties:{request:{type:'string'}},required:['missing'],additionalProperties:false}}}]},
  ])assert.equal((await send(badBody)).status,400);
  assert.equal((await send({...valid(),messages:[{role:'user',content:'x'.repeat(34000)}]})).status,413);
  assert.equal((await fetch('http://127.0.0.1:'+port+'/not-a-proxy',{method:'POST',headers,body:JSON.stringify(valid())})).status,404);
  assert.equal(upstreamEvents.length,0,'bad requests cannot touch the model');
  const response=await send();assert.equal(response.status,200);assert.match(await response.text(),/Local model fixture, unverified/);
  assert.deepEqual(upstreamEvents,[{path:'/v1/chat/completions',model,stream:true,max_tokens:256}]);
 }finally{await stop(gateway);await stop(engine);}
});
test('wrong upstream format and redirect are rejected without leaking upstream details',async()=>{
 const cases=[new Response('private upstream details',{status:500}),new Response('{"secret":"x"}',{headers:{'Content-Type':'application/json'}}),new Response('',{status:302,headers:{Location:'http://other.example'}})];
 for(const fake of cases){
  const gateway=createGateway({token,model,upstreamPort:11434,fetchImpl:async()=>fake}),port=await listen(gateway);
  try{const r=await fetch('http://127.0.0.1:'+port+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(valid())});assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/private upstream|other.example/);}
  finally{await stop(gateway);}
 }
});

test('gateway caps its own concurrent model requests and releases slots after cancellation',async()=>{
 let resume=[],arrived=0;
 const fetchImpl=async(_url,{signal})=>{
  arrived++;return new Promise((resolve,reject)=>{
   const onAbort=()=>reject(Error('aborted'));
   signal.addEventListener('abort',onAbort,{once:true});
   resume.push(()=>{signal.removeEventListener('abort',onAbort);resolve(new Response('data: [DONE]\\n\\n',{headers:{'Content-Type':'text/event-stream'}}));});
  });
 };
 const gateway=createGateway({token,model,upstreamPort:11434,fetchImpl}),port=await listen(gateway);
 const base='http://127.0.0.1:'+port+'/v1/chat/completions',headers={'Content-Type':'application/json',Authorization:'Bearer '+token};
 const send=()=>fetch(base,{method:'POST',headers,body:JSON.stringify(valid())});
 try{
  const one=send(),two=send();
  for(let i=0;i<100&&arrived<2;i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(arrived,2);
  assert.equal((await send()).status,429,'third inference cannot bypass active gateway limit');
  resume.forEach(f=>f());
  assert.equal((await one).status,200);assert.equal((await two).status,200);
  const fourth=send();for(let i=0;i<100&&arrived<3;i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(arrived,3);resume[2]();assert.equal((await fourth).status,200);
 }finally{await stop(gateway);}
});

test('client abort interrupts a held-open streaming model response without retry',async()=>{
 let cancelObserved=false,modelCalls=0,streamStarted;
 const ready=new Promise(resolve=>streamStarted=resolve);
 const fetchImpl=async()=>{
  modelCalls++;
  return new Response(new ReadableStream({
   start(controller){controller.enqueue(new TextEncoder().encode('data: {"choices":[]}\\n\\n'));streamStarted();},
   cancel(){cancelObserved=true;}
  }),{headers:{'Content-Type':'text/event-stream'}});
 };
 const gateway=createGateway({token,model,upstreamPort:11434,fetchImpl}),port=await listen(gateway);
 const stopSignal=new AbortController();
 try{
  const response=await fetch('http://127.0.0.1:'+port+'/v1/chat/completions',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
   body:JSON.stringify(valid()),signal:stopSignal.signal
  });
  await ready;await response.body.getReader().read();
  stopSignal.abort();
  for(let i=0;i<100&&!cancelObserved;i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(cancelObserved,true,'server must cancel a stream after client disconnect');
  assert.equal(modelCalls,1);
 }finally{await stop(gateway);}
});

test('a late upstream response cannot escape the deadline and become a successful model stream',async()=>{
 let calls=0;
 const gateway=createGateway({token,model,upstreamPort:11434,timeoutMs:20,fetchImpl:async()=>{
  calls++;await new Promise(resolve=>setTimeout(resolve,65));
  // Simulates an upstream implementation which ignores the abort signal.
  return new Response(new ReadableStream({start(){}}),{headers:{'Content-Type':'text/event-stream'}});
 }});
 const port=await listen(gateway);
 try{
  const result=await fetch('http://127.0.0.1:'+port+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(valid())});
  assert.equal(result.status,502);
  assert.match(await result.text(),/GATEWAY_UNAVAILABLE/);
  assert.equal(calls,1);
 }finally{await stop(gateway);}
});
test('gateway deadline remains bounded and cannot be disabled by a caller or test harness',()=>{
 for(const timeoutMs of [0,-1,30001,Infinity,1.5,'1000'])assert.throws(()=>createGateway({token,model,upstreamPort:11434,timeoutMs}),/GATEWAY_TIMEOUT_CONFIG/);
});
test('gateway independently accepts only the bounded tool-schema subset used by SUTRA',async()=>{
 const seen=[];const fetchImpl=async(_url,{body})=>{seen.push(JSON.parse(body));return new Response('data: [DONE]\\n\\n',{headers:{'Content-Type':'text/event-stream'}});};
 const gateway=createGateway({token,model,upstreamPort:11434,fetchImpl}),port=await listen(gateway);
 const schema={type:'object',properties:{request:{type:'string',minLength:1,maxLength:2000},scope:{type:'object',properties:{sourceId:{type:'string'}},required:['sourceId'],additionalProperties:false}},required:['request'],additionalProperties:false};
 try{const body={...valid(),tools:[{type:'function',function:{name:'read_source',description:'Bounded source read.',parameters:schema}}]};const response=await fetch('http://127.0.0.1:'+port+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});assert.equal(response.status,200);assert.equal(seen.length,1);assert.deepEqual(seen[0].tools[0].function.parameters,schema);}finally{await stop(gateway);}
});
