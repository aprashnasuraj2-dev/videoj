import test from 'node:test';
import assert from 'node:assert/strict';
import {createProviderWebTools} from '../src/provider-web-tools.js';

const origin='https://sutra.test';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
test('browser web adapter exposes no server read token and refuses arbitrary URLs before transport',async()=>{
 const calls=[];
 const client=createProviderWebTools({origin,fetchImpl:async(url,opts)=>{
  calls.push({url,body:JSON.parse(opts.body)});
  if(url===origin+'/api/web/search')return json({status:'discovery_only',truthStatus:'unverified',sources:[{url:'https://example.org/source',title:'Title',snippet:'Lead',token:'opaque-token'}]});
  if(url===origin+'/api/web/read')return json({status:'source_claim',truthStatus:'unverified',url:'https://example.org/source',text:'Retrieved public source claim'});
  throw Error('unexpected');
 }});
 await assert.rejects(client.read('https://example.org/source'),e=>e.code==='WEB_READ_REFUSED');assert.equal(calls.length,0);
 const rows=await client.search('question');assert.deepEqual(rows,[{url:'https://example.org/source',title:'Title',snippet:'Lead'}]);
 assert.equal(JSON.stringify(rows).includes('opaque-token'),false);
 await assert.rejects(client.read('https://other.org/source'),e=>e.code==='WEB_READ_REFUSED');assert.equal(calls.length,1);
 const read=await client.read(rows[0].url);assert.deepEqual(read,{url:'https://example.org/source',text:'Retrieved public source claim'});
 assert.deepEqual(calls.map(x=>x.url),[origin+'/api/web/search',origin+'/api/web/read']);
 assert.deepEqual(calls[1].body,{token:'opaque-token'});
});

test('browser web adapter fails closed on token substitution, malformed payloads and quota responses',async()=>{
 let mode='first',calls=0;
 const client=createProviderWebTools({origin,fetchImpl:async url=>{
  calls++;
  if(mode==='quota')return json({error:{code:'WEB_QUOTA'}},429);
  if(mode==='malformed')return json({status:'discovery_only',truthStatus:'verified',sources:[]});
  if(mode==='first')return json({status:'discovery_only',truthStatus:'unverified',sources:[{url:'https://example.org/source',title:'A',snippet:'one',token:'one'}]});
  return json({status:'discovery_only',truthStatus:'unverified',sources:[{url:'https://example.org/source',title:'A',snippet:'two',token:'two'}]});
 }});
 await client.search('first');mode='second';await assert.rejects(client.search('second'),e=>e.code==='WEB_RESPONSE');
 mode='malformed';await assert.rejects(client.search('bad'),e=>e.code==='WEB_RESPONSE');
 mode='quota';await assert.rejects(client.search('budget'),e=>e.code==='WEB_QUOTA');
 assert.equal(calls,4);
});

test('bound web transport status is mapped without leaking server error bodies',async()=>{
 const client=createProviderWebTools({origin,fetchImpl:async()=>new Response('PRIVATE PROVIDER DETAIL',{status:503,headers:{'Content-Type':'text/plain'}})});
 await assert.rejects(client.search('question'),e=>e.code==='WEB_UNAVAILABLE'&&!String(e.message).includes('PRIVATE'));
});
