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
 const hits=[],other=[],headers=[];
 const second=await serve((req,res)=>{other.push(req.url);res.writeHead(200,{'Content-Type':'application/json'});res.end('{"unexpected":true}');});
 const first=await serve((req,res)=>{
  hits.push(req.url);headers.push(req.headers);
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
  assert.ok(headers.every(h=>!h.authorization&&!h.cookie),'redirecting origin must receive no caller credentials');
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
  const fetchImpl=async()=>{
   const response=new Response('{"ok":true}',{headers:{'Content-Type':'application/json'}});
   return {redirected:true,url:redirectedUrl,ok:response.ok,headers:response.headers,body:response.body};
  };
  await assert.rejects(fetchJsonWithConsent({inspector,contact:contact('https://peer.example'),url:'https://peer.example/manifest.json',fetchImpl}),error=>error.code==='CONTACT_REDIRECT');
 }
});

test('observable changed-origin redirect requires a new consent before the second contact',async()=>{
 const calls=[],intents=[];
 const inspector=createConsentInspector({decide:async intent=>{intents.push({origin:intent.origin,purpose:intent.purpose});return intent.origin==='https://other.example'?{decision:'deny',scope:'once'}:{decision:'allow',scope:'once'};}});
 const fetchImpl=async(url,options)=>{
  calls.push({url,credentials:options.credentials,redirect:options.redirect});
  return new Response('',{status:302,headers:{Location:'https://other.example/agents/manifest.json'}});
 };
 await assert.rejects(fetchJsonWithConsent({inspector,contact:contact('https://peer.example'),url:'https://peer.example/manifest.json',fetchImpl}),error=>error.code==='CONSENT_DENIED');
 assert.deepEqual(calls.map(x=>x.url),['https://peer.example/manifest.json'],'new origin must not be contacted before its own decision');
 assert.deepEqual(intents.map(x=>x.origin),['https://peer.example','https://other.example']);
 assert.ok(calls.every(x=>x.credentials==='omit'&&x.redirect==='error'));
});

test('observable changed-origin redirect may continue only after explicit second approval',async()=>{
 const calls=[],origins=[];
 const inspector=createConsentInspector({decide:async intent=>{origins.push(intent.origin);return {decision:'allow',scope:'once'};}});
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});
  if(url==='https://peer.example/manifest.json')return new Response('',{status:302,headers:{Location:'https://other.example/agents/manifest.json'}});
  if(url==='https://other.example/agents/manifest.json')return Response.json({networks:[]});
  throw Error('unexpected destination');
 };
 const value=await fetchJsonWithConsent({inspector,contact:contact('https://peer.example'),url:'https://peer.example/manifest.json',fetchImpl});
 assert.deepEqual(value,{networks:[]});
 assert.deepEqual(origins,['https://peer.example','https://other.example']);
 assert.deepEqual(calls.map(x=>x.url),['https://peer.example/manifest.json','https://other.example/agents/manifest.json']);
 assert.ok(calls.every(x=>x.options.credentials==='omit'&&x.options.redirect==='error'));
});

test('same-origin redirect to a new artifact path re-evaluates remembered session approval',async()=>{
 const decisions=[],calls=[];
 const inspector=createConsentInspector({decide:async intent=>{decisions.push(intent.purpose);return {decision:'allow',scope:'session'};}});
 const fetchImpl=async(url)=>{
  calls.push(url);
  if(url.endsWith('/manifest.json'))return new Response('',{status:302,headers:{Location:'/agents/manifest-v2.json'}});
  return Response.json({ok:true});
 };
 const value=await fetchJsonWithConsent({inspector,contact:contact('https://peer.example'),url:'https://peer.example/manifest.json',fetchImpl});
 assert.deepEqual(value,{ok:true});
 assert.equal(decisions.length,2,'changed artifact path must not inherit the original remembered tuple silently');
 assert.ok(decisions[1].includes('/agents/manifest-v2.json'));
 assert.equal(calls.length,2);
});

test('observable redirect cycles and excessive chains stop before another destination contact',async()=>{
 const inspector=createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
 const cycleCalls=[];
 const cycleFetch=async url=>{
  cycleCalls.push(url);
  return new Response('',{status:302,headers:{Location:url.includes('one')?'https://peer.example/two':'https://peer.example/one'}});
 };
 await assert.rejects(fetchJsonWithConsent({inspector,contact:contact('https://peer.example'),url:'https://peer.example/one',fetchImpl:cycleFetch}),error=>error.code==='CONTACT_REDIRECT');
 assert.deepEqual(cycleCalls,['https://peer.example/one','https://peer.example/two']);

 const hopCalls=[];
 const hopFetch=async url=>{hopCalls.push(url);const n=Number(url.match(/(\d+)$/)?.[1]??0);return new Response('',{status:302,headers:{Location:'https://peer.example/hop'+(n+1)}});};
 await assert.rejects(fetchJsonWithConsent({inspector:createConsentInspector({decide:async()=>({decision:'allow',scope:'once'})}),contact:contact('https://peer.example'),url:'https://peer.example/hop0',fetchImpl:hopFetch,maxRedirects:2}),error=>error.code==='CONTACT_REDIRECT');
 assert.deepEqual(hopCalls,['https://peer.example/hop0','https://peer.example/hop1','https://peer.example/hop2']);
});
