import test from 'node:test';
import assert from 'node:assert/strict';
import {revisionDependencyClosure,createVerifier} from '../index.js';
const input=(id,value)=>({id,kind:'input',value,dimension:[0,0,0],basis:'synthetic'});
const derive=(id,a,b)=>({id,kind:'derive',op:'add',args:[a,b]});
const wire=nodes=>JSON.stringify({schemaVersion:1,nodes});
const nodes=[input('a','1'),input('b','2'),input('c','3'),derive('ab','a','b'),derive('ac','a','c'),derive('shared','ab','ac'),derive('independent','b','c')];
test('shared descendant traversed once, predicted invalidation agrees with real verifier and fresh report',async()=>{
 const before=wire(nodes),after=wire(nodes.map(n=>n.id==='a'?{...n,value:'4'}:n));
 const d=revisionDependencyClosure(before,after);assert.deepEqual(d.recompute,['a','ab','ac','shared']);assert.deepEqual(d.unaffected,['b','c','independent']);
 const v=createVerifier();await v.evaluate(before);const r=await v.evaluate(after);assert.deepEqual(r.stats.executed.slice().sort(),d.recompute);assert.equal(r.reportText,(await createVerifier().evaluate(after)).reportText);
});
test('ordering is irrelevant; removed and redirected nodes preserve old and new ancestry',()=>{
 const before=wire(nodes);assert.deepEqual(revisionDependencyClosure(before,wire(nodes.slice().reverse())).affected,[]);
 const after=wire(nodes.filter(n=>n.id!=='ab').map(n=>n.id==='shared'?derive('shared','ac','b'):n));
 const d=revisionDependencyClosure(before,after);assert.deepEqual(d.removed,['ab']);assert.deepEqual(d.recompute,['shared']);
 assert.throws(()=>revisionDependencyClosure(before,wire([...nodes,derive('cycle','cycle','a')])),/GRAPH_CYCLE/);
});
