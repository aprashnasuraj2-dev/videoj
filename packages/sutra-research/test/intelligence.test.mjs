import test from 'node:test';
import assert from 'node:assert/strict';
import {digest} from '../research-session.js';
import {plannerInput,admitModelQueries,makeEvidencePacket,admitSynthesis,admitReviews,assembleIntelligence} from '../research-intelligence.js';
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
