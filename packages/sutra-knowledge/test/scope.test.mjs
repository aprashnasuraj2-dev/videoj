import test from 'node:test';
import assert from 'node:assert/strict';
import {compareScopedQuantities,compileScopedComparison} from '../scope.js';
import {scopeFixture} from '../examples/scopes.mjs';
import {replayReport} from '../index.js';
test('exact unit conversion is reproducible under equal declared scope',async()=>{
 const r=await compareScopedQuantities(scopeFixture('unit_equivalent'));
 assert.equal(r.status,'equal_declared_quantities');assert.equal(r.left.value,'1/1');assert.equal(r.right.value,'1/1');
 assert.deepEqual(r.left.dimension,[1,0,0]);assert.equal(await replayReport(r.graphText,r.reportText),true);
});
test('equal dimensions and magnitude do not make torque and energy comparable',async()=>{
 const r=await compareScopedQuantities(scopeFixture('torque_energy'));
 assert.deepEqual(r.left.dimension,r.right.dimension);assert.equal(r.left.value,r.right.value);
 assert.equal(r.status,'incomparable_declared_scope');assert.deepEqual(r.differences,['quantityKind']);
 assert.equal(r.report.receipts.some(x=>x.id==='equal_quantity'),false);
});
test('conditions and reference frame participate in compatibility and graph identity',async()=>{
 const r=await compareScopedQuantities(scopeFixture('scope_changed'));
 assert.equal(r.status,'incomparable_declared_scope');assert.deepEqual(r.differences,['condition']);
 const c=JSON.parse(scopeFixture('scope_changed'));c.right.scope={...c.left.scope};
 const a=await compareScopedQuantities(JSON.stringify(c));
 assert.equal(a.status,'equal_declared_quantities');assert.notEqual(a.report.graphDigest,r.report.graphDigest);
 c.right.scope.referenceFrame='lab_B';
 const b=await compareScopedQuantities(JSON.stringify(c));assert.deepEqual(b.differences,['referenceFrame']);
});
test('disagreement is explicit; schema rejects unknown or ambiguous declarations',async()=>{
 const r=await compareScopedQuantities(scopeFixture('same_scope_disagreement'));
 assert.equal(r.status,'different_declared_quantities');assert.equal(r.left.value,'10000000/1');assert.equal(r.right.value,'11000000/1');
 for(const alter of [
  c=>c.left.unit='J',c=>c.left.quantityKind='constructor',c=>c.left.scope.subject='beam A',
  c=>c.right.scope.referenceFrame='',c=>c.left.value='1e3',c=>c.right.scope.foo='x',c=>c.left.verified=true
 ]){
  const c=JSON.parse(scopeFixture('unit_equivalent'));alter(c);assert.throws(()=>compileScopedComparison(JSON.stringify(c)),/SCOPE_PROFILE_REFUSED/);
 }
 assert.throws(()=>compileScopedComparison(scopeFixture('unit_equivalent').replace('"version":1','"version":1,"version":1')),SyntaxError);
});
