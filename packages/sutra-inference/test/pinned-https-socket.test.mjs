import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:https';
import {connect} from 'node:tls';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {startPinnedHttps} from '../pinned-https-socket.js';

const HOST='sutra-tls-fixture.example.com',KEY='TEST_ONLY_TLS_CREDENTIAL_12345';
async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'sutra-tls-fixture-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 // Per-test generated, never a production private key or trusted global CA.
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','1','-subj','/CN='+HOST,'-addext','subjectAltName=DNS:'+HOST],{stdio:'ignore'});
 const key=await readFile(join(dir,'key.pem')),cert=await readFile(join(dir,'cert.pem'));
 let connections=0;const requests=[],sni=[];
 const s=createServer({key,cert},(req,res)=>{
  const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{
   requests.push({path:req.url,headers:req.headers,body:Buffer.concat(chunks).toString('utf8')});
   if(req.url==='/redirect'){res.writeHead(302,{Location:'/never'});res.end();return;}
   res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}');
  });
 });
 s.on('secureConnection',sock=>{connections++;sni.push(sock.servername);});
 await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});
 t.after(()=>{s.closeAllConnections();return new Promise(resolve=>s.close(resolve));});
 const pin={address:'127.0.0.1',family:4,port:s.address().port,hostname:HOST,servername:HOST,path:'/v1/chat',protocol:'openai-compatible-json'};
 return {cert,pin,requests,sni,connections:()=>connections};
}
const input={credential:KEY,bodyText:'{"bounded":"fixture"}'};
function run(t,f,pin=f.pin,authMode='bearer',trust=true){
 const call=startPinnedHttps(pin,input,authMode,{dialTls:opts=>connect({...opts,...(trust?{ca:f.cert}:{})}),requestHttps:request});
 const timeout=setTimeout(()=>call.cancel(),3000);t.after(()=>{clearTimeout(timeout);call.cancel();});
 return call.promise.finally(()=>clearTimeout(timeout));
}
test('real TLS handshake and HTTPS request reuse one authenticated socket, original SNI, exact peer and credential header',async t=>{
 const f=await fixture(t);
 assert.deepEqual(await run(t,f),{status:200,bodyText:'{"ok":true}'});
 assert.equal(f.connections(),1);assert.deepEqual(f.sni,[HOST]);assert.equal(f.requests.length,1);
 assert.equal(f.requests[0].path,'/v1/chat');assert.equal(f.requests[0].headers.host,HOST);assert.equal(f.requests[0].headers.authorization,'Bearer '+KEY);assert.equal(f.requests[0].body,input.bodyText);
});
test('real untrusted CA and hostname mismatch send no HTTP request, no credential; redirect is not followed',async t=>{
 const f=await fixture(t);
 await assert.rejects(run(t,f,f.pin,'bearer',false),/TLS/);
 await assert.rejects(run(t,f,{...f.pin,hostname:'wrong.example.com',servername:'wrong.example.com'}),/TLS/);
 assert.equal(f.requests.length,0);
 await assert.rejects(run(t,f,{...f.pin,path:'/redirect'}),/RESPONSE/);
 assert.deepEqual(f.requests.map(x=>x.path),['/redirect']);
});
test('real TLS connection with wrong admitted peer refused before HTTP even with valid CA and hostname',async t=>{
 const f=await fixture(t);
 const call=startPinnedHttps({...f.pin,address:'127.0.0.2'},input,'bearer',{dialTls:opts=>connect({...opts,host:'127.0.0.1',ca:f.cert}),requestHttps:request});
 const timeout=setTimeout(()=>call.cancel(),3000);t.after(()=>{clearTimeout(timeout);call.cancel();});
 await assert.rejects(call.promise,/TLS_IDENTITY/);clearTimeout(timeout);assert.equal(f.requests.length,0);
});
