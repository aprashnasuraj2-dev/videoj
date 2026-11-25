import test from 'node:test';
import assert from 'node:assert/strict';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {compileReviewedExpression} from '../reviewed-expression.js';
import {compileReviewedProposal} from '../reviewed-claim-compiler.js';
import {contrastReviewedProposals} from '../reviewed-proposal-contrast.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
test('human expression and manually authored DAG have identical typed target structure',async()=>{
 const f=await compilerFinanceFixture();
 const e=await compileReviewedExpression(f.contractText,f.pin,'([ocf26] - [ppe26]) > ([ocf25] - [ppe25])');
 assert.equal(e.target.status,'CONDITIONALLY_REFUTED');assert.equal(e.nodeCount,7);
 const batch=JSON.stringify({version:1,contractDigest:f.pin,proposals:[{id:'expression',proposalText:e.proposalText},{id:'manual',proposalText:f.proposalText}]});
 const r=await contrastReviewedProposals(f.contractText,f.pin,batch);
 assert.equal(r.pairs[0].expressionRelation,'IDENTICAL_TYPED_STRUCTURE');assert.equal(r.counts.distinctTypedStructures,1);
 assert.equal(e.decisionAuthority,'NONE');
});
async function fixture(){
 const source='A: 12; B: 3; C: 2; Z: 0;',type={kind:'ratio',unit:'one',scope:'synthetic',dimension:[0,0,0]};
 const values=[['a','12'],['b','3'],['c','2'],['z','0']];
 const bindings=values.map(([id,v])=>{const label=id.toUpperCase()+': ',start=source.indexOf(label+v)+label.length;return {id,sourceId:'s',start,end:start+v.length,type};});
 return sealReviewedDraft(JSON.stringify({version:1,question:'Does the expression exceed the reference?',sources:[{id:'s',lineage:'synthetic',text:source}],bindings}));
}
test('operator precedence, repeated bindings and repeated subexpressions are exact',async()=>{
 const f=await fixture(),run=s=>compileReviewedExpression(f.contractText,f.pin,s);
 const a=await run('[b]+[c]*[b] < [a]');assert.equal(a.target.status,'CONDITIONALLY_SATISFIED');
 const b=await run('([b]+[c])*[b] < [a]');assert.equal(b.target.status,'CONDITIONALLY_REFUTED');
 const c=await run('([a]-[b])/([a]-[b]) == [c]/[c]');
 assert.equal(c.target.status,'CONDITIONALLY_SATISFIED');assert.equal(c.nodeCount,7);
 const d=await run('[a]/[z] > [b]');assert.equal(d.target.status,'UNRESOLVED_COMPUTATION');
 const r=await compileReviewedProposal(f.contractText,f.pin,d.proposalText);assert.ok(r.nodes.some(n=>n.receipt?.outcome.reason==='DIVISION_BY_ZERO'));
});
test('syntax, literals, unknown binding, injection, chaining and depth limits refuse',async()=>{
 const f=await fixture(),run=s=>compileReviewedExpression(f.contractText,f.pin,s);
 for(const expression of ['[a] > 1','[a] >= [b] >= [c]','Math.max([a],[b]) > [c]','[a]; fetch("https://invalid")','[a] = [b]','[unknown] > [b]','[a]','-[a] > [b]','('.repeat(25)+'[a]'+')'.repeat(25)+' > [b]','[a] + '.repeat(100)+'[a] > [b]']){
  await assert.rejects(run(expression),/EXPRESSION_|COMPILER_DEPTH/);
 }
 await assert.rejects(compileReviewedExpression(f.contractText,'sha256:'+'0'.repeat(64),'[a] > [b]'),/COMPILER_CONTRACT_PIN_MISMATCH/);
});
