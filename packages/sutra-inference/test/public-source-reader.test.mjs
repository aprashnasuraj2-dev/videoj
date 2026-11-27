import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createPublicSourceReader} from '../public-source-reader.js';
const source={id:'official',url:'https://data.example.com/report.csv',mediaType:'text/csv',maxBytes:32};
function fixture({answers=[{address:'8.8.8.8',family:4}],response={},resolveAll}={}){
 const events=[];
 const io={dialTls(options){events.push({type:'dial',options});const sock=Object.assign(new EventEmitter(),{encrypted:true,authorized:true,remoteAddress:options.host,remotePort:443,alpnProtocol:'http/1.1',getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:data.example.com'}),destroy(){this.destroyed=true;}});queueMicrotask(()=>sock.emit('secureConnect'));return sock;},
 requestHttps(options,callback){events.push({type:'request',options});const sock=options.createConnection(),req=Object.assign(new EventEmitter(),{destroy(){},end(...args){events.push({type:'end',args});queueMicrotask(()=>{req.emit('socket',sock);const res=Object.assign(new EventEmitter(),{statusCode:200,headers:{'content-type':'text/csv; charset=utf-8'},complete:true,destroy(){},...response});callback(res);res.emit('data',response.bytes??Buffer.from('year,value\n2026,14\n'));res.emit('end');});}});return req;}};
 return {io,events,resolveAll:resolveAll??(async()=>answers)};
}
test('public read uses one credential-free exact GET and bounded bytes; no repeat or unapproved route',async()=>{
 const f=fixture(),r=createPublicSourceReader({sources:[source],io:f.io,resolveAll:f.resolveAll});
 const out=await r.read('official');assert.equal(out.bodyText,'year,value\n2026,14\n');assert.equal(out.bytes,19);assert.equal(out.mediaType,'text/csv');
 const req=f.events.find(x=>x.type==='request').options;assert.equal(req.method,'GET');assert.equal(req.path,'/report.csv');assert.equal(req.headers.Authorization,undefined);assert.equal(req.headers.Cookie,undefined);assert.deepEqual(f.events.find(x=>x.type==='end').args,[]);
 await assert.rejects(r.read('official'),/SOURCE_SCOPE/);await assert.rejects(r.read('other'),/SOURCE_SCOPE/);r.close();
});
test('private DNS, redirect, compression, wrong media, truncated and over-limit bytes refuse',async()=>{
 for(const config of [{answers:[{address:'10.0.0.1',family:4}]},{response:{statusCode:302}},{response:{headers:{'content-type':'text/csv','content-encoding':'gzip'}}},{response:{headers:{'content-type':'text/html'}}},{response:{complete:false}},{response:{bytes:Buffer.alloc(33)}}]){
  const f=fixture(config),r=createPublicSourceReader({sources:[source],io:f.io,resolveAll:f.resolveAll});
  await assert.rejects(r.read('official'));assert.ok(f.events.filter(x=>x.type==='request').length<=1);if(config.answers)assert.equal(f.events.length,0);r.close();
 }
});
test('revocation while resolver hangs prevents late dial; path injection and query rejected',async()=>{
 let release,entered;const ready=new Promise(r=>entered=r),f=fixture({resolveAll:()=>{entered();return new Promise(r=>release=r);}}),r=createPublicSourceReader({sources:[source],io:f.io,resolveAll:f.resolveAll});
 const controller=new AbortController(),pending=r.read('official',{signal:controller.signal});await ready;controller.abort();await assert.rejects(pending,/CANCELLED/);release([{address:'8.8.8.8',family:4}]);await new Promise(r=>setImmediate(r));assert.equal(f.events.length,0);r.close();
 for(const url of ['https://data.example.com/report.csv?secret=x','https://data.example.com/%2e%2e/report.csv','http://data.example.com/report.csv','https://127.0.0.1/report.csv'])assert.throws(()=>createPublicSourceReader({sources:[{...source,url}]}));
});
