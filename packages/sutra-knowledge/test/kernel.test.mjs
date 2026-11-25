import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVerifier,replayReport,KERNEL} from '../index.js';
import {beamGraph} from '../examples/beam.mjs';
const input=(id,value,dimension=[0,0,0])=>({id,kind:'input',value,dimension,basis:'synthetic test assumption'});
const op=(id,kind,op,...args)=>({id,kind,op,args});
const graph=(...nodes)=>JSON.stringify({schemaVersion:1,nodes});
const read=(r,id)=>r.report.receipts.find(x=>x.id===id).outcome;

test('exact beam comparison, changed stiffness selectively recomputes 5 nodes, baseline is immutable',async()=>{
 const v=createVerifier(),a=await v.evaluate(beamGraph());
 assert.equal(a.report.kernel,KERNEL);
 assert.deepEqual(read(a,'deflection'),{status:'computed',value:'1/270',dimension:[1,0,0]});
 assert.deepEqual(read(a,'limit'),{status:'computed',value:'1/90',dimension:[1,0,0]});
 assert.equal(read(a,'deflection_limit').status,'constraint_satisfied');
 assert.equal(a.stats.executed.length,16);
 const b=await v.evaluate(beamGraph('2500000000'));
 assert.equal(read(b,'deflection').value,'2/135');
 assert.equal(read(b,'deflection_limit').status,'constraint_refuted');
 assert.deepEqual([...b.stats.executed].sort(),['E','EI','deflection','deflection_limit','denominator'].sort());
 assert.equal(b.stats.reused.length,11);
 assert.equal(read(a,'deflection_limit').status,'constraint_satisfied');
 assert.equal(await replayReport(beamGraph(),a.reportText),true);
 assert.equal(await replayReport(beamGraph('2500000000'),a.reportText),false);
 assert.equal(await replayReport(beamGraph(),a.reportText.replace('constraint_satisfied','constraint_refuted')),false);
});
test('unit mismatch, dependent blockage, exact rational comparison and zero division',async()=>{
 const r=await createVerifier().evaluate(graph(input('a','1',[1,0,0]),input('b','1',[0,1,0]),input('zero','0'),
  op('bad','derive','add','a','b'),op('blocked','derive','mul','bad','a'),
  op('wrong','constraint','eq','a','b'),op('divzero','derive','div','a','zero')));
 assert.equal(read(r,'bad').status,'incompatible');
 assert.equal(read(r,'blocked').status,'blocked');
 assert.equal(read(r,'wrong').status,'incompatible');
 assert.deepEqual(read(r,'divzero'),{status:'indeterminate',reason:'DIVISION_BY_ZERO'});
 const q=await createVerifier().evaluate(graph(input('a','1/3'),input('b','2/6'),op('same','constraint','eq','a','b')));
 assert.equal(read(q,'same').status,'constraint_satisfied');
});
test('node order and wire formatting do not change report; cache and removals are explicit',async()=>{
 const v=createVerifier(),src=beamGraph(),a=await v.evaluate(src),p=JSON.parse(src);p.nodes.reverse();
 const b=await v.evaluate(JSON.stringify(p,null,2));
 assert.equal(a.reportText,b.reportText);assert.equal(b.stats.executed.length,0);assert.equal(b.stats.reused.length,16);
 const c=await v.evaluate(graph(input('new','1')));
 assert.equal(c.stats.removed.length,16);
 assert.equal(c.stats.executed.length,1);
 assert.ok(Object.isFrozen(a.report.receipts[0].outcome));
});
test('closed grammar rejects false authority, ambiguous wire, missing dependencies, duplicates, cycles and depth overflow',async()=>{
 const v=createVerifier(),good=graph(input('a','1')),a=await v.evaluate(good);
 for(const bad of [
  '{"schemaVersion":1,"schemaVersion":1,"nodes":[]}',
  '{"schemaVersion":1,"nodes":[{"id":"a","kind":"input","value":"1","\\u0076alue":"2","dimension":[0,0,0],"basis":"fixture"}]}',
  graph({...input('a','1'),status:'verified'}),
  graph(input('a','1'),input('a','2')),
  graph(op('a','derive','add','missing','missing')),
  graph(op('a','derive','mul','b','b'),op('b','derive','mul','a','a')),
  graph(input('a','1e6')),graph(input('a','01')),graph(input('a','1/0')),graph(input('a','-0')),
  graph(input('a','1',[1,0,17])),
  graph(input('a','1'),op('c','constraint','eq','a','a'),op('z','derive','add','c','a')),
  graph(input('n0','1'),...Array.from({length:32},(_,i)=>op('n'+(i+1),'derive','add','n'+i,'n0')))
 ])await assert.rejects(()=>v.evaluate(bad),TypeError);
 const b=await v.evaluate(good);assert.equal(b.reportText,a.reportText);assert.deepEqual(b.stats.reused,['a']);
});
test('rational and dimension growth bounded; no floating point tolerance',async()=>{
 const huge='9'.repeat(48),nodes=[input('a',huge)];
 for(let i=1;i<=4;i++)nodes.push(op('n'+i,'derive','mul',i===1?'a':'n'+(i-1),i===1?'a':'n'+(i-1)));
 const r=await createVerifier().evaluate(graph(...nodes));
 assert.equal(read(r,'n2').status,'indeterminate');
 assert.equal(read(r,'n3').status,'blocked');
 const d=await createVerifier().evaluate(graph(input('x','1',[16,0,0]),op('y','derive','mul','x','x')));
 assert.equal(read(d,'y').reason,'DIMENSION_LIMIT');
});
test('100 deterministic cross-multiplication controls against independent integer oracle',async()=>{
 const v=createVerifier();
 for(let i=1;i<=100;i++){
  const a=BigInt(i*13-410),b=BigInt(i+3),c=BigInt(i*7-280),d=BigInt(i+11);
  const r=await v.evaluate(graph(input('a',a+'/'+b),input('b',c+'/'+d),op('c','constraint','le','a','b')));
  assert.equal(read(r,'c').status,a*d<=c*b?'constraint_satisfied':'constraint_refuted');
 }
});
test('concurrent calls rejected rather than mixing cache state',async()=>{
 const v=createVerifier(),p=v.evaluate(beamGraph());
 await assert.rejects(()=>v.evaluate(beamGraph('2500000000')),/VERIFIER_BUSY/);
 await p;
});
