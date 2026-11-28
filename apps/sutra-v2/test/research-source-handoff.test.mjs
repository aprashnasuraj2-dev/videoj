import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareAutonomousSourceCandidate} from '../src/research-source-handoff.js';
const digest=s=>'sha256:'+createHash('sha256').update(s).digest('hex');
function fixture(text='Battery storage cost was USD 100 million.'){
 const report={schema:'sutra-autonomous-research-report/v1',state:'closed',authority:'NONE',documents:[{id:'source_1',text,textDigest:digest(text),rawDigest:digest(text),url:'https://public.org/report',finalUrl:'https://public.org/report',retrievedAt:'2026-11-27T12:00:00.000Z',mediaType:'text/plain',parser:'bounded-text/v1'}],passages:[]};
 return {report,reportPin:digest(JSON.stringify(report)),sourceId:'source_1'};
}
test('exact extracted text transfers as unverified and no adoption',async()=>{
 const f=fixture(),c=await prepareAutonomousSourceCandidate(f);
 assert.equal(c.text,f.report.documents[0].text);assert.equal(c.sourceDigest,f.report.documents[0].textDigest);assert.equal(c.reportPin,f.reportPin);
 assert.equal(c.id,'research_'+c.sourceDigest.slice(7,39));assert.equal(c.lineage,'unverified_external');assert.equal(c.adoption,'NONE');assert.equal(c.truthStatus,'UNVERIFIED');assert.equal(c.provenance.requestedUrl,'https://public.org/report');assert.equal(c.provenance.rawDigest,c.sourceDigest);assert.equal(c.provenance.reportPin,f.reportPin);
});
test('changed report, forged document hash, duplicate source and unauthorized state refused',async()=>{
 const f=fixture();f.report.documents[0].text+=' altered';await assert.rejects(prepareAutonomousSourceCandidate(f),/REPORT_PIN/);
 f.reportPin=digest(JSON.stringify(f.report));await assert.rejects(prepareAutonomousSourceCandidate(f),/SOURCE_PIN/);
 const d=fixture();d.report.documents.push({...d.report.documents[0]});d.reportPin=digest(JSON.stringify(d.report));await assert.rejects(prepareAutonomousSourceCandidate(d),/SOURCE/);
 const a=fixture();a.report.authority='APPROVED';a.reportPin=digest(JSON.stringify(a.report));await assert.rejects(prepareAutonomousSourceCandidate(a),/REPORT/);
});
test('no silent truncation or textarea newline conversion; unsafe URL refused',async()=>{
 for(const text of ['x'.repeat(16385),'é'.repeat(9000),'first\r\nsecond','\u0000x'])await assert.rejects(prepareAutonomousSourceCandidate(fixture(text)),/SOURCE_SIZE_OR_TEXT/);
 const f=fixture();f.report.documents[0].url='javascript:alert(1)';f.reportPin=digest(JSON.stringify(f.report));await assert.rejects(prepareAutonomousSourceCandidate(f),/SOURCE_URL/);
});

test('exact report passage and UTF-16 to byte coordinates retained; invented offsets rejected',async()=>{const f=fixture('évidence 😀 costs 100');const d=f.report.documents[0],start=12,end=d.text.length;f.report.passages=[{sourceId:d.id,sourceDigest:d.textDigest,supportingText:d.text.slice(start,end),locator:{coordinateSystem:'utf16-extracted-text',startOffset:start,endOffset:end}}];f.reportPin=digest(JSON.stringify(f.report));const c=await prepareAutonomousSourceCandidate(f);assert.deepEqual(c.provenance.passages,[{start,end,byteStart:Buffer.byteLength(d.text.slice(0,start)),byteEnd:Buffer.byteLength(d.text),page:null,quote:d.text.slice(start,end)}]);f.report.passages[0].supportingText='invented';f.reportPin=digest(JSON.stringify(f.report));await assert.rejects(prepareAutonomousSourceCandidate(f),/PASSAGE/);});

function citationFixture(){
 const f=fixture('Reported revenue was USD 100 million in 2025.');
 const d=f.report.documents[0],start=0,end=d.text.length,quote='USD 100 million',offset=d.text.indexOf(quote);
 f.report.passages=[{sourceId:d.id,sourceDigest:d.textDigest,supportingText:d.text,locator:{coordinateSystem:'utf16-extracted-text',startOffset:start,endOffset:end}}];
 f.report.intelligence={claims:[{id:'claim_1',kind:'reported',truthStatus:'UNVERIFIED',publicationStatus:'candidate_reviewed',citations:[{passageId:'passage_'+digest(JSON.stringify([d.id,d.textDigest,start,end])).slice(7,31),sourceId:d.id,sourceDigest:d.textDigest,quote,locator:{coordinateSystem:'utf16-extracted-text',startOffset:offset,endOffset:offset+quote.length},verification:'exact_span_only',acquisitionPin:digest(JSON.stringify([d.id,d.textDigest,d.rawDigest,d.url,d.finalUrl??d.url,d.retrievedAt,d.mediaType,d.parser,false,[]]))}]}]};
 f.reportPin=digest(JSON.stringify(f.report));return {...f,citation:{claimId:'claim_1',index:0}};
}
test('claim citation handoff selects only exact reviewed span and never admits claim or quantity',async()=>{
 const f=citationFixture(),c=await prepareAutonomousSourceCandidate(f);
 assert.deepEqual(c.selection,{start:21,end:36,quote:'USD 100 million',claimId:'claim_1'});
 assert.equal(c.truthStatus,'UNVERIFIED');assert.equal(c.adoption,'NONE');assert.equal(c.provenance.requestedUrl,'https://public.org/report');
 assert.ok(Object.isFrozen(c.provenance.passages[0]));
});
test('repinned unknown claim, wrong passage id, stale digest, withheld claim and invented locator refuse',async()=>{
 for(const mutate of [f=>f.citation.claimId='unknown',f=>f.report.intelligence.claims[0].citations[0].passageId='forged',f=>f.report.intelligence.claims[0].citations[0].sourceDigest='sha256:'+'a'.repeat(64),f=>f.report.intelligence.claims[0].publicationStatus='withheld_from_findings',f=>f.report.intelligence.claims[0].citations[0].locator.startOffset++,f=>f.report.intelligence.claims[0].truthStatus='VERIFIED',f=>f.report.documents[0].retrievedAt='2026-11-27T12:01:00.000Z',f=>f.report.documents[0].url='https://replacement.org/report',f=>f.report.documents[0].finalUrl='https://replacement.org/report']){
  const f=citationFixture();mutate(f);f.reportPin=digest(JSON.stringify(f.report));await assert.rejects(prepareAutonomousSourceCandidate(f),/RESEARCH_HANDOFF_(CLAIM|CITATION)/);
 }
});
test('mutable original report and citation cannot change pinned source while async hash is pending',async()=>{
 const f=citationFixture(),original=f.report.documents[0].text,promise=prepareAutonomousSourceCandidate(f);
 f.report.documents[0].text='Different source';f.report.documents[0].textDigest=digest('Different source');f.report.documents[0].url='https://other.org/report';f.citation.claimId='unknown';
 const c=await promise;assert.equal(c.text,original);assert.equal(c.provenance.requestedUrl,'https://public.org/report');assert.equal(c.selection.claimId,'claim_1');
});
