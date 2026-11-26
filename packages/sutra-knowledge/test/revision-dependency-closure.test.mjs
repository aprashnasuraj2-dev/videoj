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

test('atomic correction and withdrawal invalidate shared descendants, refuse dangling dependencies, and replay exactly',async()=>{
 const initial=[input('a','1'),input('b','2'),input('c','3'),input('d','4'),
  derive('ab','a','b'),derive('ac','a','c'),derive('bc','b','c'),
  derive('shared','ab','ac'),derive('tail','shared','bc'),derive('independent','c','d')];
 const withdrawn=new Set(['b','ab','bc']);
 const revised=initial.filter(n=>!withdrawn.has(n.id)).map(n=>
  n.id==='a'?{...n,value:'5'}:n.id==='shared'?derive('shared','ac','c'):
  n.id==='tail'?derive('tail','shared','d'):n);
 const before=wire(initial),after=wire(revised);
 const v=createVerifier(),original=await v.evaluate(before);
 const dangling=wire(initial.filter(n=>n.id!=='b'));
 assert.throws(()=>revisionDependencyClosure(before,dangling),/MISSING_DEPENDENCY/);
 await assert.rejects(v.evaluate(dangling),/MISSING_DEPENDENCY/);
 const unchanged=await v.evaluate(before);
 assert.equal(unchanged.reportText,original.reportText);
 assert.equal(unchanged.stats.executed.length,0);
 const closure=revisionDependencyClosure(before,after);
 assert.deepEqual(closure.removed,['ab','b','bc']);
 assert.deepEqual(closure.changed,['a','ab','b','bc','shared','tail']);
 assert.deepEqual(closure.affected,['a','ab','ac','b','bc','shared','tail']);
 assert.deepEqual(closure.recompute,['a','ac','shared','tail']);
 assert.deepEqual(closure.unaffected,['c','d','independent']);
 assert.equal(closure.decisionAuthority,'NONE');
 const result=await v.evaluate(after),fresh=await createVerifier().evaluate(after);
 assert.equal(result.reportText,fresh.reportText);
 assert.deepEqual(result.stats.executed.slice().sort(),closure.recompute);
 assert.deepEqual(result.stats.reused.slice().sort(),closure.unaffected);
 assert.deepEqual(result.stats.removed,closure.removed);
 assert.equal(result.report.receipts.find(r=>r.id==='tail').outcome.value,'15/1');
 assert.ok(result.report.receipts.every(r=>!withdrawn.has(r.id)&&r.dependencies.every(d=>!withdrawn.has(d.id))));
 const restored=await v.evaluate(before);
 assert.equal(restored.reportText,original.reportText);
 assert.deepEqual(restored.stats.executed.slice().sort(),revisionDependencyClosure(after,before).recompute);
});
