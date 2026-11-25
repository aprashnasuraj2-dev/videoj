import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {selectedSpan,sealReviewedDraft,draftComparisonProposal} from '../reviewed-draft.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {compileReviewedProposal,prepareReviewedCompilerContract,compilePreparedReviewedProposal,createReviewedCompilerSession} from '../reviewed-claim-compiler.js';
const unpack=v=>{const x=JSON.parse(v.versionText);return {wire:x.contractText,pin:x.contractPin,proposals:JSON.parse(x.batchText).proposals};};
test('one admitted contract capability supports independent exact candidate replay without forged admission',async()=>{
 const a=unpack(await livingFixture()),cap=await prepareReviewedCompilerContract(a.wire,a.pin);
 assert.equal(cap.bindingCount,4);assert.ok(Object.isFrozen(cap));assert.ok(Object.isFrozen(cap.duplicateSourceBytes));
 for(const p of a.proposals)assert.deepEqual(await compilePreparedReviewedProposal(cap,p.proposalText),await compileReviewedProposal(a.wire,a.pin,p.proposalText));
 for(const forged of [{...cap},JSON.parse(JSON.stringify(cap)),null,'admitted'])await assert.rejects(compilePreparedReviewedProposal(forged,a.proposals[0].proposalText),/COMPILER_ADMISSION_CAPABILITY/);
 const b=unpack(await livingFixture('finance',{revised:true})),next=await prepareReviewedCompilerContract(b.wire,b.pin);
 await assert.rejects(compilePreparedReviewedProposal(cap,b.proposals[0].proposalText),/COMPILER_PROPOSAL/);
 await assert.rejects(prepareReviewedCompilerContract(b.wire,a.pin),/COMPILER_CONTRACT_PIN_MISMATCH/);
 const s=createReviewedCompilerSession(),r=await s.compilePrepared(cap,a.proposals[0].proposalText);
 await assert.rejects(s.compilePrepared({...cap},a.proposals[0].proposalText),/COMPILER_ADMISSION_CAPABILITY/);
 const r2=await s.compilePrepared(next,b.proposals[0].proposalText);
 assert.equal(r.stats.executed.length,3);assert.equal(r2.stats.reusedOutcomes.length,3);
 assert.deepEqual(r2.result,await compileReviewedProposal(b.wire,b.pin,b.proposals[0].proposalText));
});
const type={kind:'count',unit:'items',scope:'same_scope',dimension:[0,0,0]};
async function fixture(text,start,end){
 const d={version:1,question:'Compare exact reviewed quantity.',sources:[{id:'s',lineage:'root',text},{id:'other',lineage:'other_root',text:'1'}],bindings:[{id:'a',sourceId:'s',start,end,type},{id:'b',sourceId:'other',start:0,end:1,type}]};
 return sealReviewedDraft(JSON.stringify(d));
}
test('adjacent UTF-8 boundary checks preserve astral and multi-byte numeric token refusal',async()=>{
 for(const before of ['A','中','𐐀','३','２','𝟚','+','-','.',',','/','%']){
  const t=before+'12 ';await assert.rejects(fixture(t,before.length,before.length+2),/COMPILER_NUMBER_BOUNDARY/);
 }
 for(const after of ['A','中','𐐀','३','２','𝟚','+','-','.',',','/','%'])await assert.rejects(fixture(' 12'+after,1,3),/COMPILER_NUMBER_BOUNDARY/);
 for(const prefix of ['🧪 ','🧪','\uFEFF','\u00a0','']){
  const t=prefix+'12;';const c=await fixture(t,prefix.length,prefix.length+2),p=await draftComparisonProposal(c.contractText,c.pin,'a','b','gt');
  const r=await compilePreparedReviewedProposal(await prepareReviewedCompilerContract(c.contractText,c.pin),p);assert.equal(r.target.status,'CONDITIONALLY_SATISFIED');
 }
});
test('maximum-width source and exact selected bytes retain full compiler parity',async()=>{
 const text='🧪 '.repeat(5000)+' 123;';const start=text.lastIndexOf('123'),c=await fixture(text,start,start+3);
 const p=await draftComparisonProposal(c.contractText,c.pin,'a','b','gt'),cap=await prepareReviewedCompilerContract(c.contractText,c.pin);
 assert.deepEqual(await compilePreparedReviewedProposal(cap,p),await compileReviewedProposal(c.contractText,c.pin,p));
 // A malformed byte span must never use the adjacent optimization to bypass fatal decoding.
 const raw=JSON.parse(c.contractText);raw.bindings[0].span={sourceId:'s',start:1,end:3,quote:'x'};const wire=JSON.stringify(raw);
 await assert.rejects(prepareReviewedCompilerContract(wire,await casePin(wire)),/COMPILER_SPAN_BOUNDARY/);
});
