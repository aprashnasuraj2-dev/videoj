import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {FACETS,OBLIGATIONS,evaluateSemanticInvestigation} from '../semantic-investigation.js';
async function setup({missing=false}={}){
 const f=await compilerFinanceFixture({missing});
 const p=JSON.parse(f.proposalText),q=structuredClone(p);q.nodes.find(n=>n.id===q.targetId).op='lt';
 const invalid=structuredClone(p);invalid.nodes[0].value='999';
 const batchText=JSON.stringify({version:1,contractDigest:f.pin,proposals:[{id:'a',proposalText:f.proposalText},{id:'b',proposalText:JSON.stringify(q)},{id:'c',proposalText:JSON.stringify(invalid)}]});
 const facets=()=>Object.fromEntries(FACETS.map(k=>[k,null]));
 const a={version:1,contractDigest:f.pin,batchDigest:await casePin(batchText),candidates:['a','b','c'].map(id=>({id,meaning:'Declared candidate '+id,facets:facets()}))};
 a.candidates[0].facets.time={statement:'FY2026',references:[{kind:'claim',id:'quoted'}]};
 a.candidates[0].facets.method={statement:'Subtract PPE from OCF',references:[{kind:'claim',id:'method'},{kind:'binding',id:'ocf25'}]};
 a.candidates[2].facets.entity={statement:'Untrusted',references:[{kind:'binding',id:'nonexistent'}]};
 return {f,batchText,a};
}
async function run({f,batchText,a},pin){const t=JSON.stringify(a);return evaluateSemanticInvestigation(f.contractText,f.pin,batchText,t,pin??await casePin(t));}
test('full original question, nine obligations, source links, and no semantic credit',async()=>{
 const s=await setup(),r=await run(s),[a,b,c]=r.candidates;
 assert.equal(r.originalQuestion.text,JSON.parse(s.f.contractText).question.text);
 assert.equal(a.questionCoverage,'FULL_QUESTION_SPAN');
 assert.deepEqual(Object.keys(a.obligations),OBLIGATIONS);
 assert.equal(a.facets.time.references[0].span.quote,'FY2026 OCF = 182935');
 assert.equal(a.facets.method.references[0].status,'PROPOSED_NOT_SOURCE_BOUND');
 assert.equal(a.facets.method.references[1].status,'TARGET_BINDING');
 assert.equal(a.facets.negation.status,'UNSPECIFIED');
 assert.equal(a.obligations.intent,'UNRESOLVED');assert.equal(a.obligations.methodValidity,'UNRESOLVED');
 assert.equal(r.triage.state,'DIVERGENT_CONDITIONAL_OUTCOMES');assert.equal(c.facets.entity.references[0].status,'PROPOSAL_REFUSED');
 assert.equal(r.verification.semanticInterpretation,'UNVERIFIED');assert.ok(Object.isFrozen(a.facets));
});
test('missing input and declared meaning do not masquerade as certainty',async()=>{
 const r=await run(await setup({missing:true}));
 assert.equal(r.triage.state,'INCOMPLETE_CANDIDATE_EVALUATION');
 assert.deepEqual(r.triage.groups.unresolved,['a','b']);
 assert.equal(r.candidates[0].obligations.computation,'BLOCKED_MISSING_INPUT');
});
test('stale pins, missing candidates, undeclared keys, unknown references and duplicate IDs fail closed',async()=>{
 const s=await setup(),old=await casePin(JSON.stringify(s.a));s.a.candidates[0].meaning='Changed meaning';
 await assert.rejects(run(s,old),/SEMANTIC_ANNOTATION_PIN/);
 for(const mutate of [
  a=>a.candidates.pop(),a=>a.candidates[1].id='a',a=>delete a.candidates[0].facets.negation,
  a=>a.candidates[0].facets.time.references[0].id='not_a_claim',a=>a.candidates[0].facets.time.status='VERIFIED',
  a=>a.candidates[0].facets.time.references.push(a.candidates[0].facets.time.references[0]),
  a=>a.batchDigest='sha256:'+'a'.repeat(64),a=>a.candidates[0].facets.time.references[0].kind='source'
 ]){const q=await setup();mutate(q.a);await assert.rejects(run(q),/SEMANTIC_/);}
});
test('partial question coverage survives a correct computation',async()=>{
 const s=await setup(),b=JSON.parse(s.batchText),p=JSON.parse(b.proposals[0].proposalText);
 p.questionSpan={sourceId:'question',start:0,end:3,quote:'Did'};b.proposals[0].proposalText=JSON.stringify(p);
 s.batchText=JSON.stringify(b);s.a.batchDigest=await casePin(s.batchText);
 const r=await run(s);assert.equal(r.candidates[0].questionCoverage,'PARTIAL_QUESTION_SPAN');
 assert.equal(r.candidates[0].obligations.intent,'UNRESOLVED');
});
test('unreferenced qualifier is never promoted by its wording',async()=>{
 const s=await setup();s.a.candidates[0].facets.causality={statement:'proven causal effect',references:[]};
 const r=await run(s);assert.equal(r.candidates[0].facets.causality.status,'UNSUPPORTED_DECLARATION');
 assert.equal(r.verification.empiricalSupport,'UNVERIFIED');
});
