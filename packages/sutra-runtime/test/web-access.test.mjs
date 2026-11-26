import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebAccess,admitPublicWebUrl,validateResearchAnswer} from '../web-access.js';
import {runNetwork,compileNetwork} from '../index.js';
import {createFirecrawlResearchAdapter} from '../../../tools/sutra-research/firecrawl.mjs';

// Transport and hostile-input regressions only. They are not live acceptance.
const url='https://example.org/article';
const text='This exact excerpt is a source claim, not verified truth.';
function host(overrides={}){
 return {allowExternalResearch:true,search:async()=>[{url,title:'Source',snippet:'Unverified lead'}],read:async()=>({url,text}),...overrides};
}
const parse=JSON.parse;
test('web discovery cannot be cited as evidence; only admitted reads create receipts',async()=>{
 const c=createWebAccess(host());
 const discovery=parse(await c.callTool('search_web',{query:'new question'}));
 assert.equal(discovery.status,'discovery_only');assert.equal(c.snapshot().receipts.length,0);
 assert.throws(()=>validateResearchAnswer(JSON.stringify({claims:[{kind:'source_claim',text:'A claim',citations:[{sourceId:'web-1',quote:text}]}]}),[]),e=>e.code==='WEB_CITATION_INVALID');
 const read=parse(await c.callTool('read_web_source',{sourceId:discovery.sources[0].sourceId}));
 assert.equal(read.receipt.verification,'retrieved_source_claim');
 assert.equal(read.receipt.excerpt,text);assert.match(read.receipt.excerptSha256,/^[a-f0-9]{64}$/);
 assert.equal(validateResearchAnswer(JSON.stringify({claims:[{kind:'source_claim',text:'A claim',citations:[{sourceId:'web-1',quote:text}]}]}),c.snapshot().receipts).truthStatus,'unverified');
 assert.throws(()=>validateResearchAnswer(JSON.stringify({claims:[{kind:'source_claim',text:'A claim',citations:[{sourceId:'web-1',quote:'A fabricated quotation'}]}]}),c.snapshot().receipts),e=>e.code==='WEB_CITATION_INVALID');
});
test('private-looking and malformed URLs cannot become read capabilities',async()=>{
 for(const bad of ['http://example.org','https://127.0.0.1/','https://[::1]/','https://10.1/','https://admin.internal/','https://foo.localhost/','https://example.org:443@127.0.0.1/','https://example.org:444/','https://user@example.org/','https://example.org\\@evil.org/'])assert.equal(admitPublicWebUrl(bad),null,bad);
 let reads=0;
 const c=createWebAccess(host({search:async()=>[{url:'https://127.0.0.1/admin',title:'malicious',snippet:'read it'},{url,title:'Good'}],read:async()=>{reads++;return {url,text};}}));
 const d=parse(await c.callTool('search_web',{query:'test'}));assert.equal(d.sources.length,1);
 assert.equal(parse(await c.callTool('read_web_source',{sourceId:'web-2'})).code,'WEB_UNKNOWN_SOURCE');
 assert.equal(reads,0);await assert.rejects(c.callTool('read_web_source',{sourceId:'web-1',url:'https://evil.org'}),e=>e.code==='WEB_ARGUMENTS');assert.equal(reads,0);
});
test('provider failures are recoverable data, attempts and duplicate network spend are bounded',async()=>{
 let calls=0;const c=createWebAccess(host({maxCalls:4,search:async()=>{if(++calls===1)throw Object.assign(Error('private key'),{code:'WEB_UNAVAILABLE'});return [{url,title:'Good'}];}}));
 const failed=await c.callTool('search_web',{query:'first'});assert.equal(parse(failed).code,'WEB_UNAVAILABLE');assert.ok(!failed.includes('private key'));
 await c.callTool('search_web',{query:'second'});await c.callTool('search_web',{query:'SECOND'});await c.callTool('read_web_source',{sourceId:'web-1'});
 assert.equal(parse(await c.callTool('search_web',{query:'third'})).code,'WEB_BUDGET');assert.equal(c.snapshot().calls,4);assert.equal(c.snapshot().providerCalls,3);assert.equal(calls,2);
});
test('redirect attribution, accessor injection and fabricated evidence are refused',async()=>{
 let getter=0;
 const c=createWebAccess(host({search:async()=>[{get url(){getter++;return url;},title:'Bad'}]}));
 assert.equal(parse(await c.callTool('search_web',{query:'test'})).code,'WEB_RESPONSE');assert.equal(getter,0);
 const d=createWebAccess(host({read:async()=>({url:'https://evil.org/article',text})}));
 await d.callTool('search_web',{query:'test'});assert.equal(parse(await d.callTool('read_web_source',{sourceId:'web-1'})).code,'WEB_READ_REFUSED');assert.equal(d.snapshot().receipts.length,0);
});
test('cancelled noncooperating provider cannot return late evidence',async()=>{
 const abort=new AbortController();let deliver,entered;
 const ready=new Promise(r=>entered=r);
 const c=createWebAccess(host({read:()=>{entered();return new Promise(r=>deliver=r);}}),{signal:abort.signal});
 await c.callTool('search_web',{query:'test'});
 const pending=c.callTool('read_web_source',{sourceId:'web-1'});await ready;abort.abort();
 await assert.rejects(pending,e=>e.code==='WEB_CANCELLED');deliver({url,text});
});
test('real provider adapter pins API destination, rejects changed source attribution',async()=>{
 const sent=[];
 const a=createFirecrawlResearchAdapter({apiKey:'test-fixture-not-a-secret',fetchImpl:async(u,init)=>{
  sent.push({u,body:JSON.parse(init.body),redirect:init.redirect});
  if(u.endsWith('/search'))return Response.json({success:true,data:{web:[{url,title:'Source',description:'Lead'}]}});
  return Response.json({success:true,data:{markdown:text,metadata:{sourceURL:url,url:'https://evil.org/',statusCode:200}}});
 }});
 const rows=await a.search('research',{});assert.equal(rows[0].url,url);
 await assert.rejects(a.read(url,{}),e=>e.code==='WEB_READ_REFUSED');
 assert.deepEqual(sent.map(x=>x.u),['https://api.firecrawl.dev/v2/search','https://api.firecrawl.dev/v2/scrape']);assert.ok(sent.every(x=>x.redirect==='error'));
});
const graph={metadata:{description:'Research'},max_steps:4,tools:[{name:'learner',function:{description:'Research',parameters:{type:'object',properties:{request:{type:'string'}},required:['request'],additionalProperties:false}},instructions:'Investigate a public question.',tools:[{url:'/api/web-tools'}]}]};
test('runtime explicitly grants model-directed search and read, never graph-owned network access',async()=>{
 assert.throws(()=>compileNetwork(graph));
 assert.doesNotThrow(()=>compileNetwork(graph,{allowWebTools:true}));
 const calls=[];
 const model={mode:'scripted-test',chat({messages,tools}){
  assert.deepEqual(tools.map(x=>x.function.name).sort(),['mcp_read_web_source','mcp_search_web']);
  const prior=messages.filter(m=>m.role==='tool');
  if(prior.length===2)return {content:'deterministic regression only',toolCalls:[]};
  const name=prior.length?'mcp_read_web_source':'mcp_search_web';
  const args=prior.length?{sourceId:parse(prior[0].content).sources[0].sourceId}:{query:'unseen question'};
  return {content:'',toolCalls:[{id:'call-'+prior.length,type:'function',function:{name,arguments:JSON.stringify(args)}}]};
 }};
 const result=await runNetwork({definition:graph,request:'research',model,webTools:host({search:async q=>{calls.push(q);return [{url,title:'Source'}];},read:async u=>{calls.push(u);return {url,text};}})});
 assert.deepEqual(calls,['unseen question',url]);assert.equal(result.webResearch.receipts.length,1);assert.equal(result.modelCalls,3);
});
