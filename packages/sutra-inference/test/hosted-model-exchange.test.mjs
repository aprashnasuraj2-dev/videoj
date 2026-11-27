import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHostedModelExchange} from '../hosted-model-exchange.js';
const KEY='HOSTED_TEST_ONLY_KEY_1234';
const route={connectionId:'custom',protocol:'openai-compatible-json',endpoint:'https://api.example.com/v1/chat/completions',models:['my/model'],authMode:'bearer'};
const wire=(r=route,overrides={})=>({connectionId:r.connectionId,protocol:r.protocol,transportClass:'hosted',endpoint:r.endpoint,model:r.models[0],credential:KEY,maxOutputTokens:32,bodyText:JSON.stringify({model:r.models[0],messages:[{role:'system',content:'bounded'},{role:'user',content:'hello'}],max_tokens:32,stream:false}),...overrides});
function fixture({peer={},answers=[{address:'8.8.8.8',family:4}],response={},hang=false,resolveAll}={}){
 const events=[],sockets=[];
 const io={
  dialTls(options){
   events.push({stage:'dial',options});
   const s=Object.assign(new EventEmitter(),{encrypted:true,authorized:true,remoteAddress:options.host,remotePort:443,alpnProtocol:'http/1.1',getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:api.example.com'}),destroy(){this.destroyed=true;},...peer});sockets.push(s);
   if(!hang)queueMicrotask(()=>{events.push({stage:'secure'});s.emit('secureConnect');});return s;
  },
  requestHttps(options,callback){
   events.push({stage:'request',options});const s=options.createConnection();
   const req=Object.assign(new EventEmitter(),{destroy(){this.destroyed=true;},end(body){events.push({stage:'body',body});queueMicrotask(()=>{
    req.emit('socket',s);const res=Object.assign(new EventEmitter(),{statusCode:200,headers:{'content-type':'application/json'},complete:true,destroy(){this.destroyed=true;},...response});callback(res);res.emit('data',response.bytes??Buffer.from('{}'));res.emit('end');
   });}});return req;
  }
 };
 return {events,sockets,io,resolveAll:resolveAll??(async hostname=>{events.push({stage:'resolve',hostname});return answers;})};
}
function exchange(f,r=route,deadlineMs=1000){return createHostedModelExchange({routes:[r],resolveAll:f.resolveAll,io:f.io,deadlineMs});}
test('admitted public IP, original SNI, validated peer, exactly one authenticated request on the same socket',async()=>{
 const f=fixture(),x=exchange(f);
 assert.deepEqual(await x.exchange(wire()),{status:200,bodyText:'{}'});
 assert.deepEqual(f.events.map(e=>e.stage),['resolve','dial','secure','request','body']);
 const dial=f.events[1].options,req=f.events[3].options;
 assert.equal(dial.host,'8.8.8.8');assert.equal(dial.servername,'api.example.com');assert.equal(dial.rejectUnauthorized,true);assert.equal(dial.minVersion,'TLSv1.2');assert.equal(req.hostname,'api.example.com');assert.equal(req.agent,null);assert.equal(req.headers.Host,'api.example.com');assert.equal(req.headers.Authorization,'Bearer '+KEY);assert.equal(req.headers['x-api-key'],undefined);
 assert.equal(f.events[4].body.includes(KEY),false);assert.equal(f.sockets[0].destroyed,true);x.close();
});
test('private or mixed DNS, mismatched route, unsafe body and model switches cannot dial',async()=>{
 for(const answers of [[{address:'127.0.0.1',family:4}],[{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}]]){
  const f=fixture({answers}),x=exchange(f);await assert.rejects(x.exchange(wire()));assert.equal(f.sockets.length,0);x.close();
 }
 const f=fixture(),x=exchange(f);
 for(const changes of [{endpoint:'https://other.example.com/v1/chat'},{model:'unapproved'},{transportClass:'local'},{bodyText:JSON.stringify({...JSON.parse(wire().bodyText),tools:[]})}])await assert.rejects(x.exchange(wire(route,changes)));
 assert.equal(f.sockets.length,0);x.close();
});
test('certificate, encryption, peer address/port, ALPN and TLS version refusal precede all credential-bearing HTTP',async()=>{
 for(const peer of [{authorized:false},{encrypted:false},{remoteAddress:'127.0.0.1'},{remoteAddress:'::ffff:8.8.8.8'},{remotePort:444},{getPeerCertificate:()=>({subjectaltname:'DNS:wrong.example.com'})},{alpnProtocol:'h2'},{getProtocol:()=> 'TLSv1.1'}]){
  const f=fixture({peer}),x=exchange(f);await assert.rejects(x.exchange(wire()),/TLS_IDENTITY/);assert.equal(f.events.some(e=>e.stage==='request'),false);assert.equal(f.sockets[0].destroyed,true);x.close();
 }
});
test('IPv6 equivalence and unauthenticated approved route do not send placeholder credentials',async()=>{
 const r={...route,authMode:'none'},f=fixture({answers:[{address:'2606:4700::1111',family:6}],peer:{remoteAddress:'2606:4700:0:0:0:0:0:1111',alpnProtocol:false}}),x=exchange(f,r);
 await x.exchange(wire(r));const headers=f.events.find(e=>e.stage==='request').options.headers;assert.equal(headers.Authorization,undefined);assert.equal(headers['x-api-key'],undefined);x.close();
});
test('redirect, compression, partial, oversize, invalid UTF8 and non-200 never retry or return body',async()=>{
 for(const response of [{statusCode:302,headers:{location:'https://other.example.com'}},{statusCode:429},{headers:{'content-type':'application/json','content-encoding':'gzip'}},{complete:false},{headers:{'content-type':'application/json','content-length':'999999'}},{bytes:Buffer.alloc(262145)},{bytes:Buffer.from([0xc3,0x28])}]){
  const f=fixture({response}),x=exchange(f);await assert.rejects(x.exchange(wire()));assert.equal(f.events.filter(e=>e.stage==='request').length,1);assert.equal(f.sockets[0].destroyed,true);x.close();
 }
});
test('deadline covers slow DNS and TLS; closed host refuses late dispatch',async()=>{
 let release;const f=fixture({resolveAll:()=>new Promise(r=>{release=r;})}),x=exchange(f,route,20);
 await assert.rejects(x.exchange(wire()),/TIMEOUT/);release([{address:'8.8.8.8',family:4}]);await new Promise(r=>setImmediate(r));assert.equal(f.sockets.length,0);x.close();
 const g=fixture({hang:true}),y=exchange(g);const p=y.exchange(wire());await new Promise(r=>setImmediate(r));y.close();await assert.rejects(p,/CANCELLED/);assert.equal(g.sockets[0].destroyed,true);assert.equal(g.events.some(e=>e.stage==='request'),false);await assert.rejects(y.exchange(wire()),/CLOSED/);
});

test('per-task cancellation during DNS never dials a late-resolved address',async()=>{
 let begin,release;const entered=new Promise(r=>begin=r);const f=fixture({resolveAll:()=>{begin();return new Promise(r=>release=r)}}),x=exchange(f),c=new AbortController();
 const pending=x.exchange(wire(),{signal:c.signal});await entered;c.abort();await assert.rejects(pending,/CANCELLED/);release([{address:'8.8.8.8',family:4}]);await new Promise(r=>setImmediate(r));assert.equal(f.sockets.length,0);x.close();
});

test('native synthetic smoke requires explicit host mode and rejects other tool definitions before DNS',async()=>{
 const {nativeSmokeCoordinates,nativeSmokeTool,NATIVE_SMOKE_SYSTEM}=await import('../native-smoke-wire.js');
 const data={model:route.models[0],messages:[{role:'system',content:NATIVE_SMOKE_SYSTEM},{role:'user',content:JSON.stringify(nativeSmokeCoordinates())}],max_tokens:1024,stream:false,tools:[nativeSmokeTool()],tool_choice:'auto'};
 const input=wire(route,{maxOutputTokens:1024,bodyText:JSON.stringify(data)});
 const f=fixture(),normal=exchange(f);await assert.rejects(normal.exchange(input));assert.equal(f.events.length,0);normal.close();
 const x=createHostedModelExchange({routes:[route],resolveAll:f.resolveAll,io:f.io,nativeToolSmoke:true});
 const bad=structuredClone(data);bad.tools[0].function.name='arbitrary';
 await assert.rejects(x.exchange({...input,bodyText:JSON.stringify(bad)}),/Native smoke wire/);assert.equal(f.events.length,0);
 await x.exchange(input);assert.equal(f.events.filter(e=>e.stage==='request').length,1);x.close();
});
