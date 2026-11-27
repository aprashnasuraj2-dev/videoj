import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createReviewExport,serializeReviewExport} from '../src/review-export.js';

const fixture=JSON.parse(fs.readFileSync(new URL('../src/fixtures/timing-source.json',import.meta.url)));
const saved=()=>({schema:2,kind:'source-review',id:'source-review-1',receipt:structuredClone(fixture.receipt),
 savedAt:'2026-11-23T00:00:00Z'});
const sources=[fixture.source],canary='PRIVATE_PROMPT_CANARY_BYOK_123';
test('a saved source review exports only exact catalog receipt and explicit unverified warning',()=>{
 const report=createReviewExport(saved(),{sources});
 assert.equal(report.type,'sutra-local-review-export');
 assert.equal(report.truthStatus,'unverified');
 assert.equal(report.reportVersion,2);assert.equal(report.contentKind,'source-review');
 assert.deepEqual(report.receipt,fixture.receipt);
 assert.match(report.warning,/not factual verification/);
});
test('secret fields in injected localStorage records are not included',()=>{
 const extra=saved();
 extra.rawPrompt=canary;extra.providerKey=canary;extra.receipt.privateModelOutput=canary;
 const json=serializeReviewExport(extra,{sources});
 assert.ok(!json.includes(canary));
 assert.match(json,/synthetic-timing-fixture/);
 assert.ok(!json.includes('privateModelOutput'));
});
test('corrupt receipt and stale catalog are never exported as verified',()=>{
 const altered=saved();altered.receipt.excerpt='invented source claim';
 assert.throws(()=>createReviewExport(altered,{sources}));
 assert.throws(()=>createReviewExport(saved(),{sources:[]}));
});
test('invalid local record identity, date and source-review schema fail closed',()=>{
 for(const change of [
  r=>r.kind='other',r=>r.schema=1,r=>r.id='../private',r=>r.savedAt='not a date'
 ]){
  const record=saved();change(record);
  assert.throws(()=>createReviewExport(record,{sources}));
 }
});
test('untrusted accessor fields never execute',()=>{
 let touched=0;
 const record=saved();
 Object.defineProperty(record,'receipt',{get(){touched++;return fixture.receipt;}});
 assert.throws(()=>createReviewExport(record,{sources}));
 assert.equal(touched,0);
});
