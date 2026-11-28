import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {createObscuraRenderer,createObscuraEnhancedReader,OBSCURA_UPSTREAM_COMMIT} from '../obscura-adapter.js';
import {admitManifest,authorizeResearch,digest} from '../research-session.js';
import {extractDocument} from '../document-reader.js';

const binaryPath='/opt/sutra/obscura';
function fakeProcess(content,code=0,{pending=false}={}){
 const child=new EventEmitter();child.stdout=new PassThrough();child.kill=()=>{child.emit('close',null,'SIGKILL');return true;};
 if(!pending)queueMicrotask(()=>{child.stdout.write(content);child.stdout.end();child.emit('close',code,null);});
 return child;
}
function grant(extraScope={}){
 const raw=JSON.stringify({schema:'sutra-autonomous-research/v1',objective:'Battery costs',
 scope:{publicWeb:true,queryDisclosureAllowed:true,allowPrivateNetworks:false,allowAuthentication:false,allowExternalWrites:false,privateEvidenceDisclosureAllowed:false,allowJsRendering:true,allowRedirects:true,allowCrossOriginLinks:true,...extraScope},
 budget:{maxSearches:2,maxDocuments:5,maxLinkDepth:1,maxDurationSeconds:60,maxDownloadBytes:2097152,maxCostMicros:10000},
 providers:[{id:'brave',estimatedMaxCostMicros:1000}]});
 return authorizeResearch(raw,{approvedPlanPin:admitManifest(raw).planPin,approvePublicContact:true,approveEstimatedCost:true});
}
test('Obscura engine is operator opt-in and validates immutable local executable path',()=>{
 assert.throws(()=>createObscuraRenderer({binaryPath:'obscura'}),/OBSCURA_CONFIG/);
 assert.throws(()=>createObscuraRenderer({binaryPath:'/tmp/obscura',timeoutMs:999999}),/OBSCURA_CONFIG/);
});
test('no shell, no inherited secrets, no private network, no stealth, pin and bounded capture',async()=>{
 let invocation;
 const r=createObscuraRenderer({binaryPath,spawnProcess:(cmd,args,opts)=>{
  invocation={cmd,args,opts};return fakeProcess(JSON.stringify({url:'https://news.public.org/',html:'<html><body><h1>Battery data</h1></body></html>'}));
 }});
 const out=await r.render('https://news.public.org/');
 assert.equal(out.url,'https://news.public.org/');assert.equal(out.upstreamCommit,OBSCURA_UPSTREAM_COMMIT);
 assert.equal(out.renderedDomDigest,digest(out.html));assert.equal(invocation.cmd,binaryPath);
 assert.equal(invocation.opts.shell,false);assert.equal(invocation.opts.env.OBSCURA_ALLOW_PRIVATE_NETWORK,'0');
 assert.equal(invocation.opts.env.HOME,undefined);assert.equal(invocation.opts.env.HTTP_PROXY,undefined);
 assert.ok(invocation.args.includes('--obey-robots'));assert.ok(!invocation.args.includes('--stealth'));
 assert.equal(invocation.args.find(x=>x.startsWith('https://')),'https://news.public.org/');
 await assert.rejects(r.render('https://127.0.0.1/private'),/URL/);
});
test('redirect-to-other-origin, corrupted JSON, nonzero exit and oversized DOM never produce evidence',async()=>{
 for(const [payload,code,reason] of [
  [JSON.stringify({url:'https://evil.public.org/',html:'<html>wrong</html>'}),0,'OBSCURA_NAVIGATION'],
  ['not JSON',0,'OBSCURA_OUTPUT'],
  ['{}',2,'OBSCURA_EXIT'],
  [JSON.stringify({url:'https://news.public.org/',html:'<html>'+ 'x'.repeat(300000)+'</html>'}),0,'OBSCURA_DOM_LIMIT']]){
  const r=createObscuraRenderer({binaryPath,spawnProcess:()=>fakeProcess(payload,code)});
  await assert.rejects(r.render('https://news.public.org/'),new RegExp(reason));
 }
});
test('OS process has hard cancellation, bounded stdout and one active request',async()=>{
 let child;
 const r=createObscuraRenderer({binaryPath,spawnProcess:()=>{child=fakeProcess('',0,{pending:true});return child;}});
 const c=new AbortController(),p=r.render('https://news.public.org/',{signal:c.signal});
 await assert.rejects(r.render('https://news.public.org/'),/OBSCURA_BUSY/);
 c.abort();await assert.rejects(p,/CANCELLED/);
 const overflow=createObscuraRenderer({binaryPath,spawnProcess:()=>fakeProcess('x'.repeat(400000))});
 await assert.rejects(overflow.render('https://news.public.org/'),/OBSCURA_OUTPUT_LIMIT/);
});
test('unchanged static reader unless opt-in scope, renderer presence, and JS shell conditions',async()=>{
 const staticDoc=extractDocument(Buffer.from('<html><body><main>Loading...</main></body></html>'),'text/html','https://news.public.org/');
 const d={...staticDoc,finalUrl:staticDoc.url};
 const a=grant();let called=0;
 try{
  assert.throws(()=>createObscuraEnhancedReader({authorization:a,renderer:null}),/OBSCURA_CONFIG/);
  const read=createObscuraEnhancedReader({authorization:a,readDocument:async()=>d,renderer:{render:async()=>{called++;return {html:'<html><body><h1>Battery costs fell in 2026.</h1></body></html>',url:d.url,renderedDomDigest:'sha256:test',upstreamCommit:OBSCURA_UPSTREAM_COMMIT,retrievedAt:'2026-11-28T00:00:00Z'};}}});
  const result=await read(d.url);
  assert.equal(called,1);assert.match(result.text,/Battery costs fell/);
  assert.equal(result.rawDigest,d.rawDigest);assert.equal(result.render.staticTextDigest,d.textDigest);assert.equal(result.render.subresourceBytesMetered,false);
  assert.equal(result.textDigest,digest(result.text));assert.equal(a.usage().documents,1);
  await read(d.url);assert.equal(called,1);
 }finally{a.close();}
 const b=grant({allowJsRendering:false});try{assert.throws(()=>createObscuraEnhancedReader({authorization:b,renderer:{render(){}}}),/OBSCURA_SCOPE/);}finally{b.close();}
});
test('obscura failure returns explicit static evidence without fabricated rendering',async()=>{
 const a=grant(),d=extractDocument(Buffer.from('<html><main>Loading...</main></html>'),'text/html','https://data.public.org/');
 try{
  const read=createObscuraEnhancedReader({authorization:a,readDocument:async()=>d,renderer:{render:async()=>{throw Object.assign(Error('no binary'),{code:'OBSCURA_SPAWN'});}}});
  const out=await read(d.url);
  assert.equal(out.text,d.text);assert.equal(out.render.status,'static_fallback');assert.equal(out.render.reason,'OBSCURA_SPAWN');assert.equal(a.usage().documents,1);
 }finally{a.close();}
});
