import test from 'node:test';
import assert from 'node:assert/strict';
import {digest} from '../research-session.js';
import {verifyEvidence,extractNumericObservations,compareNumericObservations,compareSourceLineage,createEvidenceGraph} from '../evidence-index.js';
function doc(id,text,url='https://'+id+'.org/report'){return {id,url,text,textDigest:digest(text),links:[]};}
function passage(d){return {sourceId:d.id,sourceDigest:d.textDigest,supportingText:d.text,locator:{startOffset:0,endOffset:d.text.length,coordinateSystem:'utf16-extracted-text'}};}
test('exact spans, units and period retained; compare only narrowly matched observations',()=>{
 const a=doc('a','In 2025 battery costs were USD 100 million.'),b=doc('b','In 2025 battery costs were USD 125 million.'),c=doc('c','In 2024 battery costs were USD 200 million.'),d=doc('d','In 2025 battery costs were EUR 150 million.');
 const docs=[a,b,c,d],ps=docs.map(passage),v=verifyEvidence(docs,ps),nums=extractNumericObservations(ps,v.refs),diffs=compareNumericObservations(nums);
 assert.equal(nums.length,4);assert.equal(nums[0].period,'2025');assert.equal(nums[0].value,'100');assert.equal(nums[0].unit,'USD');assert.equal(nums[0].scale,'million');assert.equal(nums[0].denominator,'NOT_ESTABLISHED');
 assert.equal(diffs.length,1);assert.equal(diffs[0].status,'potential_discrepancy');
 for(const n of nums){const src=docs.find(x=>x.id===n.sourceId);assert.equal(src.text.slice(n.locator.startOffset,n.locator.endOffset),n.exactText);}
 const graph=createEvidenceGraph(docs,v.refs,nums,diffs,compareSourceLineage(docs));assert.ok(graph.edges.some(x=>x.relationship==='POTENTIAL_CONTRADICTION'));assert.equal(graph.authority,'NONE');
 assert.throws(()=>verifyEvidence(docs,[{...ps[0],supportingText:'invented'}]),/PASSAGE_INTEGRITY/);
});
test('near identical content is not treated as independent evidence',()=>{
 const text=Array.from({length:45},(_,i)=>'word'+i+' technology evidence').join(' ');
 const docs=[doc('a',text,'https://same.org/a'),doc('b',text+' suffix','https://same.org/b'),doc('c',text,'https://different.org/c')];
 const x=compareSourceLineage(docs);assert.equal(x.sameHostGroups.length,1);assert.ok(x.nearDuplicates.length>=2);assert.equal(x.independenceStatus,'NOT_ESTABLISHED');
});

test('refuse split Unicode, stale source digest, unknown source, duplicate spans and fabricated page numbers',()=>{
 const d=doc('a','Evidence 😀 reports costs.'),p=passage(d);
 assert.equal(verifyEvidence([d],[p]).passageCount,1);
 const split=d.text.indexOf('😀')+1;
 const bad=[{...p,locator:{...p.locator,startOffset:split},supportingText:d.text.slice(split)},{...p,sourceId:'unknown'},{...p,sourceDigest:digest('stale')},{...p,locator:{...p.locator,page:1}}];
 for(const x of bad)assert.throws(()=>verifyEvidence([d],[x]),/PASSAGE_INTEGRITY/);
 assert.throws(()=>verifyEvidence([d],[p,p]),/PASSAGE_DUPLICATE/);
 const pdf={...d,mediaType:'application/pdf',pageMap:[{page:1,startOffset:0,endOffset:d.text.length}]},pp={...p,locator:{...p.locator,page:1}};
 assert.equal(verifyEvidence([pdf],[pp]).passageCount,1);
 assert.throws(()=>verifyEvidence([{...pdf,pageMap:[...pdf.pageMap,...pdf.pageMap]}],[pp]),/PASSAGE_INTEGRITY/);
 assert.throws(()=>verifyEvidence([pdf],[{...pp,locator:{...pp.locator,page:2}}]),/PASSAGE_INTEGRITY/);
});
