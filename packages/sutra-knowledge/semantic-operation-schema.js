// Closed semantic operation schema. Exact roles prevent silently ignored semantics.
export const SEMANTIC_OPERATIONS=Object.freeze({
 DIRECT_COMPARISON:['left','right'],TEMPORAL_COMPARISON:['left','right'],
 SIGNED_DIFFERENCE:['prior','now','limit'],SIGNED_RELATIVE_CHANGE:['prior','now','limit'],TEMPORAL_RELATIVE_CHANGE:['prior','now','limit'],PERCENTAGE_POINT_CHANGE:['prior','now','limit'],
 RATIO:['numerator','denominator','limit'],WEIGHTED_MEAN:['a','wa','b','wb','limit']
});
for(const r of Object.values(SEMANTIC_OPERATIONS))Object.freeze(r);
export const SEMANTIC_OPERATORS=Object.freeze(['>','>=','<','<=','==']);
export function semanticOperationRoles(mode,roles){
 const reject=()=>{throw TypeError('SEMANTIC_OPERATION_ROLES');};
 if(!roles||typeof roles!=='object'||Array.isArray(roles)||!['object'].includes(typeof roles))reject();
 const keys=Object.keys(roles);let expected;
 if(mode==='AGGREGATE_SUM'){const n=keys.length-1;if(n<2||n>8)reject();expected=[...Array.from({length:n},(_,i)=>'item'+i),'limit'];}
 else {if(!Object.hasOwn(SEMANTIC_OPERATIONS,mode))reject();expected=SEMANTIC_OPERATIONS[mode];}
 if(keys.length!==expected.length||expected.some(k=>!Object.hasOwn(roles,k))||expected.some(k=>typeof roles[k]!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(roles[k])))reject();
 // Duplicate summands double-count evidence; repeated weights can be legitimate.
 if(mode==='AGGREGATE_SUM'&&new Set(expected.slice(0,-1).map(k=>roles[k])).size!==expected.length-1)reject();
 return expected;
}
export function semanticOperationExpression(mode,r,op){
 const expected=semanticOperationRoles(mode,r);if(!SEMANTIC_OPERATORS.includes(op))throw TypeError('SEMANTIC_OPERATION_OPERATOR');
 const b=x=>'['+r[x]+']';
 if(mode==='DIRECT_COMPARISON'||mode==='TEMPORAL_COMPARISON')return b('left')+op+b('right');
 if(mode==='SIGNED_DIFFERENCE'||mode==='PERCENTAGE_POINT_CHANGE')return '('+b('now')+'-'+b('prior')+')'+op+b('limit');
 if(mode==='SIGNED_RELATIVE_CHANGE'||mode==='TEMPORAL_RELATIVE_CHANGE')return '(('+b('now')+'-'+b('prior')+')/'+b('prior')+')'+op+b('limit');
 if(mode==='RATIO')return '('+b('numerator')+'/'+b('denominator')+')'+op+b('limit');
 if(mode==='AGGREGATE_SUM')return '('+expected.slice(0,-1).map(b).join('+')+')'+op+b('limit');
 if(mode==='WEIGHTED_MEAN')return '(('+b('a')+'*'+b('wa')+')+('+b('b')+'*'+b('wb')+'))/('+b('wa')+'+'+b('wb')+')'+op+b('limit');
 throw TypeError('SEMANTIC_OPERATION_MODE');
}
