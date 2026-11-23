import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createReviewAttemptReceipt,serializeReviewAttemptReceipt} from '../src/review-attempt.js';

const fixture=JSON.parse(fs.readFileSync(new URL('../src/fixtures/timing-source.json',import.meta.url)));
const base=outcome=>({requestId:'review-attempt-1',receipt:structuredClone(fixture.receipt),outcome,observedAt:'2026-11-24T00:00:00Z'});
const sources=[fixture.source];

for(const outcome of ['completed','rejected','unknown'])test(`review attempt export preserves ${outcome} without changing reviewed payload`,()=>{
 const result=createReviewAttemptReceipt(base(outcome),{sources});
 assert.equal(result.outcome,outcome);assert.equal(result.requestId,'review-attempt-1');
 assert.deepEqual(result.receipt,fixture.receipt);assert.equal(result.truthStatus,'unverified');
 assert.match(result.retryPolicy,/never automatically retry/);
 if(outcome==='unknown')assert.match(result.outcomeMeaning,/may have happened/);
});
test('attempt export strips unrelated prompt/key fields and rejects stale receipt',()=>{
 const attempt=base('unknown');attempt.providerKey='PRIVATE_KEY_CANARY';attempt.rawPrompt='PRIVATE_PROMPT_CANARY';attempt.receipt.hidden='PRIVATE_FIELD_CANARY';
 const text=serializeReviewAttemptReceipt(attempt,{sources});
 assert.ok(!text.includes('PRIVATE_KEY_CANARY'));assert.ok(!text.includes('PRIVATE_PROMPT_CANARY'));assert.ok(!text.includes('PRIVATE_FIELD_CANARY'));
 const stale=base('unknown');stale.receipt.excerpt='changed';
 assert.throws(()=>createReviewAttemptReceipt(stale,{sources}));
});
test('attempt export refuses unknown states and accessor-backed data',()=>{
 assert.throws(()=>createReviewAttemptReceipt(base('success-ish'),{sources}));
 let touched=0;const attempt=base('unknown');Object.defineProperty(attempt,'receipt',{get(){touched++;return fixture.receipt;}});
 assert.throws(()=>createReviewAttemptReceipt(attempt,{sources}));assert.equal(touched,0);
});
