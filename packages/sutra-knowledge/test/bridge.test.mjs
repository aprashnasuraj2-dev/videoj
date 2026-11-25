import test from 'node:test';
import assert from 'node:assert/strict';
import {createVerifier} from '../index.js';
import {runProofProposal,scriptedProofModel,parseProposal} from '../agent-bridge.js';
import {beamCase,derivedSectionGraph} from '../examples/methods.mjs';
import {beamGraph} from '../examples/beam.mjs';
const outcome=(r,id)=>r.report.receipts.find(x=>x.id===id).outcome;
test('two section methods reproduce exact result with different dependency lineage',async()=>{
 for(const modulus of ['10000000000','2500000000']){
  const a=await createVerifier().evaluate(beamGraph(modulus));
  const b=await createVerifier().evaluate(derivedSectionGraph(modulus));
  assert.deepEqual(outcome(a,'I'),{...outcome(b,'I'),status:'assumption_declared'});
  assert.deepEqual(outcome(a,'deflection'),outcome(b,'deflection'));
  assert.deepEqual(outcome(a,'deflection_limit'),outcome(b,'deflection_limit'));
  assert.notEqual(a.report.graphDigest,b.report.graphDigest);
 }
});
test('real pinned agent runtime delegates method selection; result is independently computed, even when refuted',async()=>{
 const r=await runProofProposal({caseText:beamCase('2500000000'),model:scriptedProofModel()});
 assert.equal(r.mode,'scripted-test');assert.equal(r.agentCalls,2);assert.equal(r.modelCalls,3);
 assert.equal(r.proposal.methodId,'section_derived');assert.equal(r.receipt.outcome.status,'constraint_refuted');
});
test('proposal is a closed selection, not a verification authority or arbitrary graph',async()=>{
 for(const options of [{hostile:true},{obligationId:'wrong'},{methodId:'unknown'}]){
  await assert.rejects(()=>runProofProposal({caseText:beamCase(),model:scriptedProofModel(options)}),/PROOF_PROPOSAL_REFUSED/);
 }
 assert.throws(()=>parseProposal('{"version":1,"obligationId":"a","methodId":"b","methodId":"c"}','a',['b','c']),SyntaxError);
 const c=JSON.parse(beamCase());c.methods[0].constraintId='E';
 await assert.rejects(()=>runProofProposal({caseText:JSON.stringify(c),model:scriptedProofModel()}),/PROOF_PROPOSAL_REFUSED/);
});
