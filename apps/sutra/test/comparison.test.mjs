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
test('matching structured values with different excerpts are not represented as agreement',()=>{
 const claims=pair();claims.guide.value=2;
 const result=compareClaimPair(claims);
 assert.equal(result.status,'matching_values_unreviewed');
 assert.match(result.reason,/Agreement is not established/);
});
test('only an exact excerpt plus exact structured value can reach the textual-match state',()=>{
 const claims=pair();claims.guide.value=claims.video.value;claims.guide.excerpt=claims.video.excerpt;
 const result=compareClaimPair(claims);
 assert.equal(result.status,'exact_excerpt_match_unverified');
 assert.match(result.reason,/textual consistency only/);
});
test('source href must be a bounded local path and survives the immutable comparison snapshot',()=>{
 const claims=pair();assert.match(claims.guide.sourceHref,/^\.\/guides\//);
 const result=compareClaimPair(claims);assert.equal(result.guide.sourceHref,claims.guide.sourceHref);assert.match(result.guide.sourceHash,/^[a-f0-9]{64}$/);
 const badHash=pair();badHash.guide.sourceHash='bad';assert.equal(compareClaimPair(badHash).status,'invalid_source');
 const noHref=pair();delete noHref.guide.sourceHref;assert.equal(compareClaimPair(noHref).status,'invalid_source');
 const noHash=pair();delete noHash.guide.sourceHash;assert.equal(compareClaimPair(noHash).status,'invalid_source');
 for(const href of ['https://evil.example/x','//evil.example/x','../secret','./ok/../secret','./bad\\path','./x\nprivate','./guide.html?variant=other#x']){
  const bad=pair();bad.guide.sourceHref=href;assert.equal(compareClaimPair(bad).status,'invalid_source');
 }
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

test('cue identity survives comparison and malformed timing cannot become valid untimed evidence',()=>{
 const claims=pair();claims.video.cueId='timing-marker';claims.video.start=2;claims.video.end=4;
 const result=compareClaimPair(claims);assert.equal(result.video.cueId,'timing-marker');assert.equal(result.video.start,2);
 for(const mutate of [c=>{c.video.cueId='bad\ncue';},c=>{c.video.start=5;},c=>{delete c.video.end;},c=>{c.video.end=Infinity;}]){
  const broken=structuredClone(claims);mutate(broken);assert.equal(compareClaimPair(broken).status,'invalid_source');
 }
});

test('comparison accepts the same maximum video identity, version, claim key and cue text as the content profile',()=>{
 const claims=pair();claims.video.sourceId='v'+'a'.repeat(127);claims.video.sourceVersion='v'.repeat(128);claims.video.claimKey=claims.guide.claimKey='c'+'b'.repeat(127);claims.video.excerpt='x'.repeat(2000);
 const result=compareClaimPair(claims);assert.equal(result.status,'unresolved_conflict');assert.equal(result.video.excerpt.length,2000);assert.equal(result.video.sourceId,claims.video.sourceId);
 claims.video.excerpt+='x';assert.equal(compareClaimPair(claims).status,'invalid_source');
 claims.video.excerpt='x';claims.guide.excerpt='x'.repeat(1201);assert.equal(compareClaimPair(claims).status,'invalid_source');
});

test('ordinary claim or input accessors never execute when comparison refuses data',()=>{
 let touched=0;const claims=pair();Object.defineProperty(claims.video,'value',{enumerable:true,get(){touched++;return 2;}});
 assert.equal(compareClaimPair(claims).status,'invalid_source');
 const input={};Object.defineProperty(input,'video',{enumerable:true,get(){touched++;return pair().video;}});
 assert.equal(compareClaimPair(input).status,'invalid_source');assert.equal(touched,0);
});
