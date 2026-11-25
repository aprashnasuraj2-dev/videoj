import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {compilerFinanceFixture,exactSpan} from '../examples/reviewed-compiler.mjs';
import {FACETS} from '../semantic-investigation.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {renderInvestigationRoundtrip} from '../controlled-roundtrip.js';
async function setup({missing=false}={}){
 const f=await compilerFinanceFixture({missing}),a=JSON.parse(f.proposalText),b=structuredClone(a),c=structuredClone(a);
 const question=JSON.parse(f.contractText).question.text;
 b.questionSpan=exactSpan('question',question,'increase?');
 b.nodes.find(n=>n.id==='target').op='le';
 b.nodes.find(n=>n.id==='proxy26').op='div';
 c.nodes[0].value='999';
 a.nodes.push({id:'unused',kind:'input',bindingId:'ocf25'});
 const batchText=JSON.stringify({version:1,contractDigest:f.pin,proposals:[a,b,c].map((p,i)=>({id:['a','b','c'][i],proposalText:JSON.stringify(p)}))});
 const candidates=['a','b','c'].map(id=>({id,meaning:'Meaning '+id,facets:Object.fromEntries(FACETS.map(k=>[k,null]))}));
 candidates[0].facets.time={statement:'FY2026',references:[{kind:'claim',id:'quoted'}]};
 candidates[1].facets.time={statement:'Different period',references:[]};
 candidates[1].facets.negation={statement:'not increasing',references:[]};
 const annotationText=JSON.stringify({version:1,contractDigest:f.pin,batchDigest:await casePin(batchText),candidates});
 return sealInvestigationVersion({contractText:f.contractText,contractPin:f.pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
}
test('reconstruct exact target instructions, preserve unused nodes and selected question bytes',async()=>{
 const v=await setup(),r=await renderInvestigationRoundtrip(v.versionText,v.digest),[a,b,c]=r.candidates;
 assert.equal(a.questionSelection.coverage,'FULL_QUESTION_SPAN');
 assert.equal(b.questionSelection.selected,'increase?');
 assert.equal(b.questionSelection.unselectedPrefix+b.questionSelection.selected+b.questionSelection.unselectedSuffix,r.originalQuestion.text);
 assert.equal(b.review.unselectedQuestionText,true);
 assert.deepEqual(a.computation.excludedNodeIds,['unused']);
 assert.equal(a.computation.steps.at(-1).statement,'Test whether proxy26 is greater than proxy25.');
 assert.equal(b.computation.steps.at(-1).statement,'Test whether proxy26 is at most proxy25.');
 assert.equal(b.computation.steps.find(n=>n.id==='proxy26').statement,'proxy26 is ocf26 divided by ppe26.');
 assert.equal(b.computation.targetStatus,'BLOCKED_TYPE');
 assert.equal(a.computation.steps.find(n=>n.id==='ocf25').source.exactValue,'136162/1');
 assert.equal(c.computation,null);
 const ab=r.differences.find(x=>x.left==='a'&&x.right==='b');
 assert.deepEqual(ab.declaredQualifierDifferences,['time','negation']);
 assert.equal(ab.instructionStructureDiffers,true);assert.equal(ab.interpretationEquivalence,'NOT_ESTABLISHED');
 assert.equal(r.decisionAuthority,'NONE');assert.ok(Object.isFrozen(r.candidates[0].computation.steps));
});
test('unknown input stays unknown and stale pins are rejected',async()=>{
 const v=await setup({missing:true}),r=await renderInvestigationRoundtrip(v.versionText,v.digest);
 assert.equal(r.candidates[0].computation.targetStatus,'BLOCKED_MISSING_INPUT');
 assert.equal(r.candidates[0].computation.steps.find(n=>n.id==='ppe26').outcome,null);
 await assert.rejects(renderInvestigationRoundtrip(v.versionText,v.digest.replace(/.$/,v.digest.endsWith('0')?'1':'0')),/REVISION_PIN/);
});
test('deterministic exact replay retains all qualifier states without entailment credit',async()=>{
 const v=await setup(),r=await renderInvestigationRoundtrip(v.versionText,v.digest);
 assert.deepEqual(await renderInvestigationRoundtrip(v.versionText,v.digest),r);
 assert.equal(r.candidates[0].qualifiers.length,13);
 assert.equal(r.candidates[0].review.entailment,'UNVERIFIED');
 assert.deepEqual(r.candidates[1].review.unsupportedFacets,['time','negation']);
});
