import test from 'node:test';
import assert from 'node:assert/strict';
import {compareClaimPair,syntheticComparison} from '../src/comparison.js';
import {buildUncertaintyGuidance} from '../src/uncertainty-guidance.js';

const pair=()=>structuredClone(syntheticComparison);

test('missing evidence abstains and never invents the absent source reference',()=>{
 const comparison=compareClaimPair({video:pair().video,guide:null});
 const guidance=buildUncertaintyGuidance(comparison);
 assert.equal(guidance.disposition,'abstain');
 assert.equal(guidance.sourceRefs.length,1);
 assert.equal(guidance.sourceRefs[0].sourceId,comparison.video.sourceId);
 assert.ok(!JSON.stringify(guidance).includes('guide'));
 assert.match(guidance.nextAction,/missing original source/);
});

test('conflict preserves both real source identities and refuses to pick a winner',()=>{
 const comparison=compareClaimPair(pair());
 const guidance=buildUncertaintyGuidance(comparison);
 assert.equal(guidance.disposition,'abstain');
 assert.deepEqual(guidance.sourceRefs.map(source=>source.sourceId),['fixture_video','fixture_guide']);
 assert.match(guidance.nextAction,/do not select a winner automatically/);
 assert.equal(guidance.certification,'none');
});

test('incomparable and invalid evidence abstain instead of manufacturing citations',()=>{
 const different=pair();different.guide.scope='other';
 const incomparable=buildUncertaintyGuidance(compareClaimPair(different));
 assert.equal(incomparable.disposition,'abstain');
 assert.equal(incomparable.sourceRefs.length,2);
 const invalid=pair();invalid.guide.sourceId='';
 const invalidGuidance=buildUncertaintyGuidance(compareClaimPair(invalid));
 assert.equal(invalidGuidance.disposition,'abstain');
 assert.deepEqual(invalidGuidance.sourceRefs,[]);
});

test('matching structured values remain an unverified match, never certification',()=>{
 const claims=pair();claims.guide.value=claims.video.value;
 const guidance=buildUncertaintyGuidance(compareClaimPair(claims));
 assert.equal(guidance.disposition,'unverified_match');
 assert.equal(guidance.certification,'none');
 assert.match(guidance.nextAction,/source reliability/);
});

test('unknown states are rejected rather than receiving generic confident guidance',()=>{
 assert.throws(()=>buildUncertaintyGuidance({status:'verified'}),/Known comparison state/);
});
