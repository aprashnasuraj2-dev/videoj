import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {pinnedPublicHttp} from '../pinned-public-http.js';
import {createDocumentReader} from '../document-reader.js';
const options={url:new URL('https://data.example.com/report'),maxBytes:32,acceptedTypes:['text/plain']};
function fixture({answers=[{address:'8.8.8.8',family:4}],response={},socketOverrides={},resolveAll}={}){
 const events=[];
 const io={resolveAll:resolveAll??(async()=>answers),dialTls(o){events.push({type:'dial',options:o});const sock=Object.assign(new EventEmitter(),{encrypted:true,authorized:true,remoteAddress:o.host,remotePort:443,alpnProtocol:'http/1.1',getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:data.example.com'}),destroy(){this.destroyed=true;}},socketOverrides);queueMicrotask(()=>sock.emit('secureConnect'));return sock;},
 requestHttps(o,cb){events.push({type:'request',options:o});const sock=o.createConnection(),req=Object.assign(new EventEmitter(),{destroy(){},end(){queueMicrotask(()=>{req.emit('socket',sock);const res=Object.assign(new EventEmitter(),{statusCode:200,headers:{'content-type':'text/plain'},complete:true,destroy(){},...response});cb(res);res.emit('data',response.bytes??Buffer.from('valid public text'));res.emit('end');});}});return req;}};
 return {io,events};
}
test('pinned public request verifies peer before sending and carries no cookie/credential by default',async()=>{
 const f=fixture(),r=await pinnedPublicHttp(options,f.io);assert.equal(r.body.toString(),'valid public text');assert.equal(f.events[0].options.host,'8.8.8.8');const req=f.events[1].options;
 assert.equal(req.path,'/report');assert.equal(req.method,'GET');assert.equal(req.headers.Authorization,undefined);assert.equal(req.headers.Cookie,undefined);
});
test('private DNS, changed peer, wrong certificate, redirect, compressed and oversized response refuse',async()=>{
 for(const config of [{answers:[{address:'10.0.0.1',family:4}]},{socketOverrides:{remoteAddress:'10.0.0.1'}},{socketOverrides:{getPeerCertificate:()=>({subjectaltname:'DNS:wrong.example.com'})}},{response:{statusCode:302,headers:{location:'https://127.0.0.1/'}}},{response:{headers:{'content-type':'text/plain','content-encoding':'gzip'}}},{response:{bytes:Buffer.alloc(33)}},{response:{complete:false}}]){
  const f=fixture(config);await assert.rejects(pinnedPublicHttp(options,f.io));assert.ok(f.events.filter(x=>x.type==='request').length<=1);
  if(config.answers||config.socketOverrides)assert.equal(f.events.filter(x=>x.type==='request').length,0);
 }
});
test('cancellation during DNS cannot cause late connection',async()=>{
 let release,entered;const ready=new Promise(r=>entered=r),f=fixture({resolveAll:()=>{entered();return new Promise(r=>release=r);}});
 const controller=new AbortController(),pending=pinnedPublicHttp({...options,signal:controller.signal},f.io);
 await ready;controller.abort();await assert.rejects(pending,/CANCELLED/);release([{address:'8.8.8.8',family:4}]);await new Promise(r=>setImmediate(r));assert.equal(f.events.length,0);
});
test('serialized or caller-forged authorization does not grant document capability',()=>{assert.throws(()=>createDocumentReader({authorization:{assertActive(){},reserve(){}}}),/AUTHORIZATION/);});

test('redirect metadata is returned once only for explicitly credential-free GET',async()=>{
 const f=fixture({response:{statusCode:302,headers:{location:'https://other.org/report'}}});
 const r=await pinnedPublicHttp({...options,allowRedirectResponse:true},f.io);
 assert.equal(r.location,'https://other.org/report');assert.equal(f.events.filter(x=>x.type==='request').length,1);
 const x=fixture();await assert.rejects(pinnedPublicHttp({...options,allowRedirectResponse:true,headers:{Authorization:'Bearer test-secret'}},x.io),/REDIRECT_CONFIG/);assert.equal(x.events.length,0);
});

test('SSRF matrix rejects every private or mixed DNS answer before a TLS dial',async()=>{
 const bad=['0.0.0.0','10.1.2.3','100.64.0.1','127.1.2.3','169.254.169.254','172.16.0.1','192.168.1.1','198.18.0.1','224.0.0.1','255.255.255.255','::','::1','::ffff:127.0.0.1','::ffff:169.254.169.254','fc00::1','fe80::1','ff02::1','2001:db8::1','2002:7f00:1::1','64:ff9b::a00:1'];
 for(const address of bad){const f=fixture({answers:[{address:'8.8.8.8',family:4},{address,family:address.includes(':')?6:4}]});await assert.rejects(pinnedPublicHttp(options,f.io),/DNS_ADDRESS/,address);assert.equal(f.events.length,0,address);}
});
test('DNS rebinding and TLS mismatch cannot dispatch HTTP; no fallback or second resolution',async()=>{
 for(const socketOverrides of [{remoteAddress:'1.1.1.1'},{remoteAddress:'::ffff:8.8.8.8'},{remotePort:444},{authorized:false},{encrypted:false},{getProtocol:()=> 'TLSv1.1'},{alpnProtocol:'h2'},{getPeerCertificate:()=>({subjectaltname:'DNS:other.org'})}]){
  let resolves=0;const f=fixture({socketOverrides,resolveAll:async()=>{resolves++;return [{address:'8.8.8.8',family:4}];}});
  await assert.rejects(pinnedPublicHttp(options,f.io),/TLS_IDENTITY/);assert.equal(resolves,1);assert.equal(f.events.filter(x=>x.type==='dial').length,1);assert.equal(f.events.filter(x=>x.type==='request').length,0);
 }
});
test('document transport denies arbitrary headers, auth, body and non-GET before contact',async()=>{
 for(const patch of [{headers:{Cookie:'secret'}},{headers:{'X-Anything':'secret'}},{headers:{Referer:'https://private.org/'}},{headers:{Authorization:'Bearer secret'}},{headers:{Host:'evil.org'}},{method:'POST'},{body:''}]){
  const f=fixture();await assert.rejects(pinnedPublicHttp({...options,documentOnly:true,...patch},f.io),/DOCUMENT_HEADERS/);assert.equal(f.events.length,0);
 }
});
