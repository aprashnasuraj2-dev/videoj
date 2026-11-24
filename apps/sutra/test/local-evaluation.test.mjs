import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createLocalAnswer} from '../src/local-answer.js';
// Development-only protocol fixture; these authored prompts overlap source text.
// Do NOT report this as general semantic QA, accuracy on real content, or held-out evidence.
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/local-zero-model-dev.json',import.meta.url),'utf8'));
test('40-case synthetic source-evidence evaluation preserves positive, negative and adversarial outcomes without a model',()=>{
 const local=createLocalAnswer({sources:fixture.sources,now:()=> '2026-11-24T00:00:00Z'});
 assert.equal(fixture.cases.length,40);
 assert.deepEqual([fixture.cases.slice(0,20).length,fixture.cases.slice(20,30).length,fixture.cases.slice(30).length],[20,10,10]);
 const outcomes=fixture.cases.map(c=>{
  const result=local.query(c.question);
  if(result.state!==c.expect)throw Error(c.id+': expected '+c.expect+' but got '+result.state);
  if(c.cueId)assert.equal(result.receipts[0]?.cueId,c.cueId,c.id);
  assert.equal(result.truthStatus,'unverified');
  assert.equal(result.modelCalls,0);assert.equal(result.networkRequests,0);
  if(result.state==='no_match')assert.equal(result.receipts.length,0);
  if(result.state==='ambiguous')assert.ok(result.receipts.length>=2);
  return {id:c.id,state:result.state};
 });
 assert.equal(outcomes.length,40);
 console.log('LOCAL_ZERO_MODEL_DEV '+JSON.stringify({profile:'authored synthetic lexical prompts, not held-out semantic accuracy',cases:40,positiveMatched:20,unsupportedAbstained:10,adversarialOrAmbiguousHandled:10,modelCalls:0,networkRequests:0}));
});
test('local model-free source cache does not share mutable caller objects with receipts',()=>{
 const source=structuredClone(fixture.sources[0]);
 const lookup=createLocalAnswer({sources:[source],now:()=> '2026-11-24T00:00:00Z'});
 const original=lookup.query('Where is the breaker isolation marker?');
 source.cues[0].text='attacker edited after registration';
 const again=lookup.query('Where is the breaker isolation marker?');
 assert.equal(again.state,'matched');
 assert.deepEqual(again.receipts,original.receipts);
});
