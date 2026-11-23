import test from 'node:test';
import assert from 'node:assert/strict';
import {compareClaimPair,syntheticComparison} from '../src/comparison.js';

const pair=()=>structuredClone(syntheticComparison);
test('explicit synthetic disagreement stays unresolved without selecting a winner',()=>{
 const result=compareClaimPair(pair());
 assert.equal(result.status,'unresolved_conflict');
 assert.match(result.reason,/Neither side is declared factually correct/);
 assert.equal(result.video.value,2);assert.equal(result.guide.value,3);
 assert.equal(result.video.excerpt,syntheticComparison.video.excerpt);
 assert.equal(result.guide.excerpt,syntheticComparison.guide.excerpt);
});
test('missing peer claim preserves valid local source rather than claiming agreement',()=>{
 const video=pair().video;
 const result=compareClaimPair({video,guide:null});
 assert.equal(result.status,'missing_source');
 assert.match(result.reason,/No reviewed guide claim/);
 assert.equal(result.video.sourceId,video.sourceId);
 assert.equal(result.guide,null);
});
test('exact matching structured values remain unverified, not factual truth',()=>{
 const claims=pair();claims.guide.value=2;
 const result=compareClaimPair(claims);
 assert.equal(result.status,'consistent_unverified');
 assert.match(result.reason,/factual truth are not verified/);
});
test('different questions and source scope do not generate a false comparison',()=>{
 const claims=pair();claims.guide.scope='different_scope';
 assert.equal(compareClaimPair(claims).status,'incomparable');
 claims.guide.scope=claims.video.scope;claims.guide.claimKey='different_question';
 assert.equal(compareClaimPair(claims).status,'incomparable');
});
test('invalid or malformed claims are refused without copying their text into output',()=>{
 for(const altered of [
  c=>{c.video.sourceId='';},
  c=>{c.video.excerpt='';},
  c=>{c.video.claimKey='not supported\nprivate';},
  c=>{c.guide.value='';},
  c=>{c.guide.sourceKind='video';}
 ]){
  const claims=pair();altered(claims);
  const result=compareClaimPair(claims);
  assert.equal(result.status,'invalid_source');
 }
});
test('structured type mismatch remains unresolved, even if string looks numerically equal',()=>{
 const claims=pair();claims.guide.value='2';
 const result=compareClaimPair(claims);
 assert.equal(result.status,'unresolved_conflict');
 assert.match(result.reason,/different types/);
});
test('claim objects are snapshotted and cannot be altered to rewrite a result',()=>{
 const claims=pair();
 const result=compareClaimPair(claims);
 claims.video.value=3;claims.video.excerpt='altered';
 assert.equal(result.video.value,2);
 assert.equal(result.video.excerpt,syntheticComparison.video.excerpt);
 assert.equal(Object.isFrozen(result),true);
});
