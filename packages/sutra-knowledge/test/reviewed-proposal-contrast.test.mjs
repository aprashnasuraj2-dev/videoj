import test from 'node:test';
import assert from 'node:assert/strict';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {contrastReviewedProposals} from '../reviewed-proposal-contrast.js';
const wire=JSON.stringify;
const edit=(f,fn)=>{const p=JSON.parse(f.proposalText);fn(p);return wire(p);};
const batch=(f,proposals)=>wire({version:1,contractDigest:f.pin,proposals});
const entry=(id,proposalText)=>({id,proposalText});
const run=(f,ps)=>contrastReviewedProposals(f.contractText,f.pin,batch(f,ps));
function rename(p){const m=new Map(p.nodes.map(n=>[n.id,'renamed_'+n.id]));for(const n of p.nodes){n.id=m.get(n.id);if(n.args)n.args=n.args.map(x=>m.get(x));}p.targetId=m.get(p.targetId);}
test('renamed identical structure, opposite proposed comparison, self-comparison and hostile input are distinct',async()=>{
 const f=await compilerFinanceFixture();
 const r=await run(f,[entry('original',f.proposalText),entry('copied',f.proposalText),entry('renamed',edit(f,rename)),entry('opposite',edit(f,p=>{p.nodes.find(n=>n.id==='target').op='lt';})),entry('tautology',edit(f,p=>{const n=p.nodes.find(n=>n.id==='target');n.op='eq';n.args=['proxy25','proxy25'];})),entry('hostile',edit(f,p=>{p.nodes[0].value='999';}))]);
 assert.deepEqual(r.counts,{admitted:5,refused:1,satisfied:2,refuted:3,unresolved:0,distinctTypedStructures:3,distinctProposalBytes:4,selfComparisons:1});
 assert.equal(r.entries.find(x=>x.id==='hostile').reason,'COMPILER_NODE');assert.equal(r.decisionAuthority,'NONE');
 assert.deepEqual(r.duplicateProposalGroups[0].ids,['copied','original']);
 const same=r.pairs.find(p=>p.left==='original'&&p.right==='renamed');assert.equal(same.expressionRelation,'IDENTICAL_TYPED_STRUCTURE');assert.equal(same.stateRelation,'SAME_CONDITIONAL_STATE');
 const opposed=r.pairs.find(p=>p.left==='opposite'&&p.right==='original');assert.equal(opposed.stateRelation,'OPPOSITE_CONDITIONAL_STATES');assert.equal(opposed.semanticContradiction,'NOT_ESTABLISHED');assert.equal(opposed.independentEvidence,'NOT_ESTABLISHED');assert.deepEqual(opposed.bindingRelation.onlyLeft,[]);assert.deepEqual(opposed.bindingRelation.onlyRight,[]);
 assert.equal(r.entries.find(e=>e.id==='tautology').computation.selfComparison,true);
});
test('two unresolved unknowns are not assumed equivalent merely because their labels match',async()=>{
 const f=await compilerFinanceFixture({missing:true});const r=await run(f,[entry('a',f.proposalText),entry('b',edit(f,p=>{p.claims.push({id:'extra',kind:'hypothesis',text:'A separate proposal'});}))]);
 assert.equal(r.counts.unresolved,2);assert.equal(r.pairs[0].stateRelation,'AT_LEAST_ONE_UNRESOLVED');assert.equal(r.pairs[0].expressionRelation,'DIFFERENT_STRUCTURE_NOT_PROVEN_EQUIVALENT');
});
test('exact clone counts never create independent votes; order is deterministic',async()=>{
 const f=await compilerFinanceFixture();const ps=['c','a','b','d','e'].map(i=>entry(i,f.proposalText));const a=await run(f,ps),b=await run(f,ps.slice().reverse());
 assert.equal(a.counts.distinctTypedStructures,1);assert.equal(a.counts.distinctProposalBytes,1);assert.equal(a.counts.refuted,5);assert.equal(a.decisionAuthority,'NONE');assert.deepEqual(a.entries,b.entries);assert.deepEqual(a.pairs,b.pairs);assert.notEqual(a.batchDigest,b.batchDigest);
});
test('invalid host contract, duplicate identity, excessive batch and forged batch authority fail closed',async()=>{
 const f=await compilerFinanceFixture(),ps=[entry('a',f.proposalText),entry('b',f.proposalText)];
 await assert.rejects(contrastReviewedProposals(f.contractText+' ',f.pin,batch(f,ps)),/COMPILER_CONTRACT_PIN_MISMATCH/);
 await assert.rejects(run(f,[ps[0],ps[0]]),/CONTRAST_ENTRY/);
 await assert.rejects(run(f,Array.from({length:9},(_,i)=>entry('p'+i,f.proposalText))),/CONTRAST_BATCH/);
 await assert.rejects(contrastReviewedProposals(f.contractText,f.pin,wire({version:1,contractDigest:f.pin,proposals:ps,decision:'VERIFIED'})),/CONTRAST_BATCH/);
});
