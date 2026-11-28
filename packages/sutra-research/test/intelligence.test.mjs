import test from 'node:test';
import assert from 'node:assert/strict';
import {digest} from '../research-session.js';
import {plannerInput,admitModelQueries,makeEvidencePacket,admitSynthesis,admitReviews,conflictCandidates,admitConflictReviews,assembleIntelligence} from '../research-intelligence.js';
const docs=[{id:'s1',url:'https://primary.org/report',text:'Battery cost was USD 100 million in 2025.'},{id:'s2',url:'https://other.org/report',text:'Battery cost was USD 125 million in 2025.'}].map(d=>({...d,textDigest:digest(d.text)}));
const ps=docs.map(d=>({sourceId:d.id,sourceDigest:d.textDigest,locator:{startOffset:0,endOffset:d.text.length,coordinateSystem:'utf16-extracted-text'},supportingText:d.text}));
test('model planner receives counts only and admits bounded objective-prefix refinements',()=>{
 const input=plannerInput('Compare battery costs',[],docs,ps,['battery']);assert.ok(!JSON.stringify(input).includes('primary.org'));assert.ok(!JSON.stringify(input).includes('USD'));
 assert.equal(admitModelQueries({queries:[{suffix:'levelized cost assumptions',questionId:'comparability'}]},input.objective,[])[0].query,'Compare battery costs levelized cost assumptions');
 for(const suffix of ['https://private.org','password=abc','upload private data','123456789','someone@example.com'])assert.throws(()=>admitModelQueries({queries:[{suffix,questionId:'primary'}]},input.objective,[]),/PLAN_QUERY/);
});
test('exact source subspan must exist, reviewer must cover all claims, disagreement withheld',()=>{
 const packet=makeEvidencePacket(docs,ps),a=packet.excerpts[0],b=packet.excerpts[1];
 const raw={claims:[{statement:'A source reported USD 100 million.',kind:'reported',citations:[{passageId:a.passageId,quote:'USD 100 million'}]}],gaps:[]};
 const s=admitSynthesis(raw,packet);assert.equal(s.claims[0].citations[0].locator.startOffset,17);
 assert.throws(()=>admitSynthesis({claims:[{...raw.claims[0],citations:[{passageId:a.passageId,quote:'USD 200 million'}]}],gaps:[]},packet),/CITATION_QUOTE/);
 assert.throws(()=>admitSynthesis({claims:[{...raw.claims[0],citations:[{passageId:'made_up',quote:'USD 100 million'}]}],gaps:[]},packet),/CITATION_UNKNOWN/);
 assert.throws(()=>admitReviews({reviews:[]},s,packet),/REVIEW_SCHEMA/);
 const r=admitReviews({reviews:[{claimId:s.claims[0].id,verdict:'contradicted',reason:'A second source gives a different value.',citations:[{passageId:b.passageId,quote:'USD 125 million'}]}]},s,packet);
 const result=assembleIntelligence(s,r,[],packet);assert.equal(result.claims[0].publicationStatus,'withheld_from_findings');assert.equal(result.claims[0].truthStatus,'UNVERIFIED');assert.equal(result.authority,'NONE');
});

test('numeric and semantic conflict assessments require exact evidence on both sides and never establish truth',()=>{
 const packet=makeEvidencePacket(docs,ps),a=packet.excerpts[0],b=packet.excerpts[1],candidates=conflictCandidates(packet);
 assert.equal(candidates.length,1);
 const s=admitSynthesis({claims:[{statement:'Battery costs were exactly USD 100 million.',kind:'inference',citations:[{passageId:a.passageId,quote:'USD 100 million'}]}],gaps:[]},packet);
 const reviews=admitReviews({reviews:[{claimId:s.claims[0].id,verdict:'supported',reason:'The first source gives this figure.',citations:[{passageId:a.passageId,quote:'USD 100 million'}]}]},s,packet);
 const omitted=admitConflictReviews({},candidates,packet);assert.equal(omitted[0].status,'unresolved');assert.equal(assembleIntelligence(s,reviews,[],packet,omitted).claims[0].publicationStatus,'withheld_from_findings');
 const entry={candidateId:candidates[0].id,relation:'different_scope',reason:'The model suggests different populations.',citations:[{passageId:a.passageId,quote:'USD 100 million'},{passageId:b.passageId,quote:'USD 125 million'}]};
 const explained=admitConflictReviews({conflicts:[entry]},candidates,packet);assert.equal(explained[0].status,'model_explanation_unverified');assert.equal(explained[0].authority,'NONE');
 assert.throws(()=>admitConflictReviews({conflicts:[{...entry,citations:[entry.citations[0]]}]},candidates,packet),/CITATION_COUNT/);
 assert.throws(()=>admitConflictReviews({conflicts:[{...entry,candidateId:'invented'}]},candidates,packet),/CONFLICT_CANDIDATE/);
});

test('evidence packet pins acquisition identity without model disclosure and is immutable across review',()=>{
 const sources=structuredClone(docs),passages=structuredClone(ps),d=sources[0];
 Object.assign(d,{rawDigest:digest(d.text),finalUrl:'https://primary.org/final',retrievedAt:'2026-11-27T12:00:00.000Z',mediaType:'text/plain',parser:'bounded-text/v1'});
 const pin=digest(JSON.stringify([d.id,d.textDigest,d.rawDigest,d.url,d.finalUrl,d.retrievedAt,d.mediaType,d.parser,false,[]]));
 const packet=makeEvidencePacket(sources,passages),excerpt=packet.excerpts[0];
 assert.doesNotMatch(JSON.stringify(packet.excerpts),/primary.org|2026-11-27|acquisitionPin/);
 sources[0].text='Fabricated';sources[0].retrievedAt='2026-11-27T12:01:00.000Z';passages[0].supportingText='Invented';
 assert.equal(packet.map.set,undefined);assert.ok(Object.isFrozen(packet.map.get(excerpt.passageId).d));assert.ok(Object.isFrozen(excerpt.locator));
 const admitted=admitSynthesis({claims:[{statement:'A candidate finding.',kind:'reported',citations:[{passageId:excerpt.passageId,quote:'USD 100 million'}]}],gaps:[]},packet);
 assert.equal(admitted.claims[0].citations[0].acquisitionPin,pin);
 assert.equal(admitted.claims[0].truthStatus,'UNVERIFIED');
});
test('overlapping distinct passages cannot count the same absolute citation twice',()=>{
 const d=docs[0],start=d.text.indexOf('USD'),p={...ps[0],supportingText:d.text.slice(start),locator:{...ps[0].locator,startOffset:start}};
 const packet=makeEvidencePacket([d],[ps[0],p]);
 assert.equal(packet.excerpts.length,2);
 const citations=packet.excerpts.map(e=>({passageId:e.passageId,quote:'USD 100 million'}));
 assert.throws(()=>admitSynthesis({claims:[{statement:'One absolute span.',kind:'reported',citations}],gaps:[]},packet),/CITATION_DUPLICATE/);
});
