import {exportResearchResult,openResearchResult} from '../research-result.js';
import {buildResearchPlan} from '../research-plan.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {livingFixture} from '../examples/living-investigation.mjs';
import {casePin} from '../pinned-investigation.js';
import {prepareResearchInvestigation} from '../research-investigation.js';
import {createDisclosureConsentInspector} from '../../sutra-consent/index.js';
import {createExecutionJournal} from '../../sutra-runtime/execution-events.js';
async function fixture(){
 const v=await livingFixture(),sources=[{id:'new-source',url:'https://data.example.com/report.txt',mediaType:'text/plain',maxBytes:128},{id:'new-other',url:'https://data.example.com/other.txt',mediaType:'text/plain',maxBytes:128}],planText=JSON.stringify({version:'sutra-public-research/v1',versionText:v.versionText,versionPin:v.digest,sources,timeoutMs:5000}),requests=[];
 const io={dialTls(opts){const s=Object.assign(new EventEmitter(),{encrypted:true,authorized:true,remoteAddress:opts.host,remotePort:443,alpnProtocol:false,getProtocol:()=> 'TLSv1.3',getPeerCertificate:()=>({subjectaltname:'DNS:data.example.com'}),destroy(){}});queueMicrotask(()=>s.emit('secureConnect'));return s;},requestHttps(opts,callback){requests.push(opts);const sock=opts.createConnection(),req=Object.assign(new EventEmitter(),{destroy(){},end(){queueMicrotask(()=>{req.emit('socket',sock);const res=Object.assign(new EventEmitter(),{statusCode:200,headers:{'content-type':'text/plain'},complete:true,destroy(){}});callback(res);res.emit('data',Buffer.from('Public assertion: 42.'));res.emit('end');});}});return req;}};
 return {v,planText,sources,requests,io,resolveAll:async()=>[{address:'8.8.8.8',family:4}],now:()=> '2026-01-01T00:00:00.000Z'};
}
test('Drone retrieves exact approved public candidates in DAG with pinned text and no automatic adoption',async()=>{
 const f=await fixture(),p=await prepareResearchInvestigation(f),j=createExecutionJournal(),consents=[];
 assert.equal(f.requests.length,0);assert.equal(p.preview.maxTotalBytes,256);
 const result=await p.execute({approvedPlanPin:p.planPin,consentInspector:createDisclosureConsentInspector({decide:i=>{consents.push(i);return 'allow';}}),runId:'research',onExecutionEvent:e=>j.accept(e)});
 assert.equal(result.status,'completed');assert.equal(f.requests.length,2);assert.equal(consents.length,2);assert.ok(consents.every(i=>i.planPin===p.planPin));
 const reads=result.artifacts.filter(a=>a.kind==='research_fetch');assert.equal(reads.length,2);
 for(const a of reads){assert.equal(a.agentId,'researcher');assert.equal(a.value.adoption,'NONE');assert.equal(a.value.truthStatus,'UNVERIFIED');assert.equal(a.value.sourceCandidate.digest,await casePin(a.value.sourceCandidate.text));assert.equal(a.provenance.versionDigest,f.v.digest);}
 assert.equal(result.artifacts.at(-1).value.totalBytes,42);assert.equal(j.snapshot('research').status,'completed');
 assert.doesNotMatch(JSON.stringify(j.events('research')),/Public assertion|data.example.com/);
});
test('denied source has zero contact; independent source remains available and coordinator blocks',async()=>{
 const f=await fixture(),p=await prepareResearchInvestigation(f);
 const result=await p.execute({approvedPlanPin:p.planPin,consentInspector:createDisclosureConsentInspector({decide:i=>i.destination.endsWith('other.txt')?'deny':'allow'}),runId:'research'});
 assert.equal(result.status,'partial');assert.equal(f.requests.length,1);assert.equal(result.tasks.find(t=>t.id==='coordinate').status,'blocked');assert.equal(result.artifacts.filter(a=>a.kind==='research_fetch').length,1);
});

test('revoking source consent during DNS prevents socket dial and late publication',async()=>{
 const f=await fixture();let release,entered;const ready=new Promise(r=>entered=r);let decisions=0;const inspector=createDisclosureConsentInspector({decide:()=>++decisions===1?'allow':'deny'});
 const p=await prepareResearchInvestigation({...f,resolveAll:()=>{entered();return new Promise(r=>release=r);}});
 const pending=p.execute({approvedPlanPin:p.planPin,consentInspector:inspector,runId:'research'});
 await ready;inspector.clearSession();
 release([{address:'8.8.8.8',family:4}]);
 const result=await pending;assert.equal(result.status,'partial');assert.equal(f.requests.length,0);
});

test('portable research result binds exact current version, source requests and artifact pins; no automatic adoption',async()=>{
 const f=await fixture(),plan=await buildResearchPlan({versionText:f.v.versionText,versionPin:f.v.digest,sources:f.sources,timeoutMs:5000});
 assert.equal(plan.planText,f.planText);const p=await prepareResearchInvestigation({...f,planText:plan.planText}),events=[];
 const result=await p.execute({approvedPlanPin:p.planPin,consentInspector:createDisclosureConsentInspector({decide:()=> 'allow'}),runId:'recorded_research',onExecutionEvent:e=>events.push(e)});
 const out=await exportResearchResult({preview:p.preview,result,events}),opened=await openResearchResult({text:out.text,expectedPin:out.pin,expectedVersion:f.v.digest});
 assert.equal(opened.candidates.length,2);assert.equal(opened.candidates[0].sourceCandidate.text,'Public assertion: 42.');assert.equal(opened.candidates[0].truthStatus,'UNVERIFIED');
 await assert.rejects(openResearchResult({text:out.text+' ',expectedPin:out.pin,expectedVersion:f.v.digest}),e=>e.code==='PIN');
 const x=JSON.parse(out.text);x.sources[0].url='https://data.example.com/substitute.txt';const text=JSON.stringify(x);
 await assert.rejects(openResearchResult({text,expectedPin:await casePin(text),expectedVersion:f.v.digest}),e=>e.code==='CANDIDATE');
});
