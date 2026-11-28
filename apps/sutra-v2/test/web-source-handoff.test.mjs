import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareWebSourceCandidate} from '../src/web-source-handoff.js';
const hash=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
function example(text='A public report estimated energy costs at USD 100.'){
 const d={id:'source_1',url:'https://public.org/report',finalUrl:'https://public.org/report',mediaType:'text/html',text,rawDigest:hash('raw page'),fullTextDigest:hash(text),textDigest:hash(text),extractionTruncated:false,parser:'bounded-html/v2',retrievedAt:'2026-11-28T04:00:00.000Z',verificationStatus:'unverified_public_extraction'};
 const report={schema:'sutra-web-access-result/v1',actor:'user',operation:'fetch',documents:[d],results:[],authority:'NONE'};
 return {report,reportPin:hash(JSON.stringify(report))};
}
test('model-free exact source can be staged with unverified provenance and no automatic admission',async()=>{
 const x=example(),c=await prepareWebSourceCandidate(x);
 assert.equal(c.text,x.report.documents[0].text);assert.equal(c.provenance.reportPin,x.reportPin);
 assert.equal(c.provenance.rawDigest,x.report.documents[0].rawDigest);
 assert.equal(c.provenance.sourceDigest,x.report.documents[0].textDigest);
 assert.equal(c.truthStatus,'UNVERIFIED');assert.equal(c.adoption,'NONE');assert.equal(c.lineage,'unverified_external');
 assert.equal(c.selection,null);assert.equal(c.provenance.documentId,'source_1');
});
test('tampered report pin, source body, digest and false provenance cannot be staged',async()=>{
 const x=example(),p=prepareWebSourceCandidate(x);x.report.documents[0].text='tampered after call';assert.equal((await p).text,'A public report estimated energy costs at USD 100.');
 for(const mutate of [x=>x.reportPin='sha256:'+'0'.repeat(64),x=>x.report.documents[0].text+=' forged',x=>x.report.documents[0].textDigest='sha256:'+'a'.repeat(64),x=>x.report.documents[0].verificationStatus='trusted',x=>x.report.authority='APPROVED',x=>x.report.operation='search',x=>x.report.documents[0].url='http://localhost/',x=>x.report.documents[0].retrievedAt='yesterday']){
  const y=example();mutate(y);if(!('x' in y)){} // no-op: ensure no mutation of original fixture
  if(y.reportPin==='sha256:'+'0'.repeat(64)){}else y.reportPin=hash(JSON.stringify(y.report));
  await assert.rejects(prepareWebSourceCandidate(y),/WEB_HANDOFF_|PROVENANCE_SCHEMA/);
 }
});
test('large extracted sources and dangerous control text remain export-only until scoped',async()=>{
 for(const text of ['x'.repeat(16385),'é'.repeat(9000),'data\r\ninjection','\u0000bad']){
  const x=example(text);await assert.rejects(prepareWebSourceCandidate(x),/WEB_HANDOFF_SOURCE/);
 }
});
test('Obscura provenance parser identity can be staged without a model',async()=>{
 const x=example();x.report.documents[0].parser='obscura-dom/v1';x.reportPin=hash(JSON.stringify(x.report));
 const c=await prepareWebSourceCandidate(x);assert.equal(c.provenance.parser,'obscura-dom/v1');
});
