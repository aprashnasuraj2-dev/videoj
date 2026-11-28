import test from 'node:test';import assert from 'node:assert/strict';
import {semanticOperationExpression,semanticOperationRoles} from '../semantic-operation-schema.js';
test('semantic operation schema rejects extra roles, missing roles, sparse sums, duplicated summands and invalid operators',()=>{
 for(const [mode,roles,operator] of [
 ['DIRECT_COMPARISON',{left:'a',right:'b',condition:'c'},'>'],
 ['DIRECT_COMPARISON',{left:'a'},'>'],
 ['AGGREGATE_SUM',{item0:'a',item2:'b',limit:'c'},'>'],
 ['AGGREGATE_SUM',{item0:'a',item1:'a',limit:'c'},'>'],
 ['DIRECT_COMPARISON',{left:'a',right:'b'},'!='],
 ['constructor',{left:'a',right:'b'},'>']
 ])assert.throws(()=>semanticOperationExpression(mode,roles,operator),/SEMANTIC_OPERATION/);
 assert.equal(semanticOperationExpression('SIGNED_RELATIVE_CHANGE',{prior:'a',now:'b',limit:'c'},'>'),'(([b]-[a])/[a])>[c]');
 assert.equal(semanticOperationExpression('WEIGHTED_MEAN',{a:'a',wa:'w',b:'b',wb:'w',limit:'c'},'>'),'(([a]*[w])+([b]*[w]))/([w]+[w])>[c]');
 assert.deepEqual(semanticOperationRoles('AGGREGATE_SUM',{item0:'a',item1:'b',limit:'c'}),['item0','item1','limit']);
});
