import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createConsentInspector,fetchJsonWithConsent} from '../index.js';

async function serve(handler) {
 const server=createServer(handler);
 server.listen(0,'127.0.0.1');await once(server,'listening');
 return {server,origin:'http://127.0.0.1:'+server.address().port};
}
const stop=server=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
const contact=origin=>({origin,kind:'peer_manifest',purpose:'Fetch exactly one disclosed peer manifest',disclosure:['network name'],network:'checklist'});

test('same-origin, changed-origin and looping redirects all fail closed before following',async()=>{
 const hits=[],other=[];
 const second=await serve((req,res)=>{other.push(req.url);res.writeHead(200,{'Content-Type':'application/json'});res.end('{"unexpected":true}');});
 const first=await serve((req,res)=>{
  hits.push(req.url);
  if(req.url==='/ok'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}');return;}
  const location=req.url==='/same'?'/ok':req.url==='/changed'?second.origin+'/capture':'/loop';
  res.writeHead(302,{Location:location});res.end();
 });
 try {
  const inspector=createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
  for(const route of ['/same','/changed','/loop']){
   const before=hits.length;
   await assert.rejects(fetchJsonWithConsent({inspector,contact:contact(first.origin),url:first.origin+route}),error=>error.code==='CONTACT_FETCH'||error.code==='CONTACT_REDIRECT');
   assert.deepEqual(hits.slice(before),[route],route+' must not follow even one hop');
  }
  assert.deepEqual(other,[],'changed-origin target must not receive a request');
  assert.equal(hits.includes('/ok'),false,'same-origin redirected target must not be fetched');
  const ok=await fetchJsonWithConsent({inspector,contact:contact(first.origin),url:first.origin+'/ok'});
  assert.deepEqual(ok,{ok:true},'an ordinary direct read remains functional');
 }finally{await stop(first.server);await stop(second.server);}
});

test('explicitly denied external contact never reaches the redirecting endpoint',async()=>{
 let hits=0;
 const fixture=await serve((_req,res)=>{hits++;res.writeHead(302,{Location:'/elsewhere'});res.end();});
 try{
  const inspector=createConsentInspector({decide:async()=>({decision:'deny',scope:'once'})});
  await assert.rejects(fetchJsonWithConsent({inspector,contact:contact(fixture.origin),url:fixture.origin+'/deny'}),error=>error.code==='CONSENT_DENIED');
  assert.equal(hits,0);
 }finally{await stop(fixture.server);}
});

test('custom transport cannot silently return already-redirected JSON',async()=>{
 const inspector=createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
 for(const redirectedUrl of ['https://peer.example/other.json','https://different.example/capture']){
  const fetchImpl=async()=>Object.assign(new Response('{"ok":true}',{headers:{'Content-Type':'application/json'}}),{
   redirected:true,url:redirectedUrl
  });
  await assert.rejects(fetchJsonWithConsent({inspector,contact:contact('https://peer.example'),url:'https://peer.example/manifest.json',fetchImpl}),error=>error.code==='CONTACT_REDIRECT');
 }
});
