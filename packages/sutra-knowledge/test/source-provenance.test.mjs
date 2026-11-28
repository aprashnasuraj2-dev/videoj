import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {validateReviewedContract} from '../reviewed-claim-compiler.js';
import {reviseReviewedSourceDraft,restoreReviewedSourceDraft} from '../source-draft-restore.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {sealInvestigationVersion,compareInvestigationVersions} from '../investigation-revision.js';
import {createInvestigationHistory,openInvestigationHistory} from '../investigation-history.js';
const provenance=async text=>({version:1,reportPin:'sha256:'+'a'.repeat(64),documentId:'source_1',sourceDigest:await casePin(text),rawDigest:'sha256:'+'b'.repeat(64),requestedUrl:'https://public.org/report',finalUrl:'https://public.org/report',retrievedAt:'2026-11-27T12:00:00.000Z',mediaType:'text/plain',parser:'bounded-text/v1',extractionTruncated:false,pages:[],passages:[{start:0,end:text.length,byteStart:0,byteEnd:Buffer.byteLength(text),page:null,quote:text}]});
async function rebind(version,contractText,pin,previousDigest=null){
 const v=JSON.parse(version.versionText),batch=JSON.parse(v.batchText),annotation=JSON.parse(v.annotationText);
 batch.contractDigest=pin;batch.proposals=batch.proposals.map(p=>({...p,proposalText:JSON.stringify({...JSON.parse(p.proposalText),contractDigest:pin})}));const batchText=JSON.stringify(batch);
 annotation.contractDigest=pin;annotation.batchDigest=await casePin(batchText);const annotationText=JSON.stringify(annotation);
 return sealInvestigationVersion({previousDigest,contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
}
const pyDir=fileURLToPath(new URL('../reference/',import.meta.url));
function python(contract,pin){return spawnSync('python3',['-c','import json,sys; from verify_reviewed_compiler import host; x=json.load(sys.stdin); host(x["contract"],x["pin"])'],{cwd:pyDir,input:JSON.stringify({contract,pin}),encoding:'utf8'});}
test('provenance survives sealed contract, version, history and restore; replacement removes stale acquisition metadata',async()=>{
 const initial=await livingFixture(),restored=await restoreReviewedSourceDraft(initial.versionText,initial.digest),draft=structuredClone(restored.draft);
 draft.sources[0].provenance=await provenance(draft.sources[0].text);
 const a=await sealReviewedDraft(JSON.stringify(draft));assert.equal(python(a.contractText,a.pin).status,0);
 const v=await rebind(initial,a.contractText,a.pin);const h=await createInvestigationHistory(v.versionText,v.digest),opened=await openInvestigationHistory(h.snapshot().historyText,h.snapshot().digest);
 const again=await restoreReviewedSourceDraft(opened.restore(v.digest).versionText,v.digest);assert.equal(again.exactContractBytes,true);assert.deepEqual(again.draft.sources[0].provenance,draft.sources[0].provenance);
 const revised=await reviseReviewedSourceDraft(JSON.stringify(again.draft),draft.sources[0].id,'Revenue before: 100; revenue after: 130');assert.equal(Object.hasOwn(revised.draft.sources[0],'provenance'),false);
 // Same source bytes but changed acquisition metadata is a source change, not silently reused.
 const changed=structuredClone(draft);changed.sources[0].provenance.retrievedAt='2026-11-27T12:01:00.000Z';
 const b=await sealReviewedDraft(JSON.stringify(changed)),child=await rebind(initial,b.contractText,b.pin,v.digest),impact=await compareInvestigationVersions(v.versionText,v.digest,child.versionText,child.digest);
 assert.ok(impact.sourceChanges.some(x=>x.id===draft.sources[0].id&&x.change==='CHANGED'));
});
test('forged quote, digest, page, timestamp and byte coordinates fail in JS and independent Python',async()=>{
 const text='évidence 😀 100',p=await provenance(text),draft={version:1,question:'Check evidence',sources:[{id:'source_a',text,lineage:'unverified_external',provenance:p}],bindings:[]};
 const valid=await sealReviewedDraft(JSON.stringify(draft));assert.equal(python(valid.contractText,valid.pin).status,0);
 for(const mutate of [x=>x.sourceDigest='sha256:'+'c'.repeat(64),x=>x.passages[0].quote='invented',x=>x.passages[0].byteEnd--,x=>x.passages[0].page=1,x=>x.retrievedAt='2026-02-30T12:00:00.000Z']){
  const wire=JSON.parse(valid.contractText);mutate(wire.sources[0].provenance);const contract=JSON.stringify(wire),pin=await casePin(contract);
  await assert.rejects(validateReviewedContract(contract,pin),/PROVENANCE_SCHEMA/);assert.notEqual(python(contract,pin).status,0);
 }
});
