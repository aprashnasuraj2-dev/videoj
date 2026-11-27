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
 assert.equal(result.artifacts.at(-1).value.totalBytes,40);assert.equal(j.snapshot('research').status,'completed');
 assert.doesNotMatch(JSON.stringify(j.events('research')),/Public assertion|data.example.com/);
});
test('denied source has zero contact; independent source remains available and coordinator blocks',async()=>{
 const f=await fixture(),p=await prepareResearchInvestigation(f);
 const result=await p.execute({approvedPlanPin:p.planPin,consentInspector:createDisclosureConsentInspector({decide:i=>i.destination.endsWith('other.txt')?'deny':'allow'}),runId:'research'});
 assert.equal(result.status,'partial');assert.equal(f.requests.length,1);assert.equal(result.tasks.find(t=>t.id==='coordinate').status,'blocked');assert.equal(result.artifacts.filter(a=>a.kind==='research_fetch').length,1);
});
