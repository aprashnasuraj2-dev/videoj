import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createVerifier} from '../index.js';
const reference=fileURLToPath(new URL('../reference/verify.py',import.meta.url));
const input=(id,value,dimension=[0,0,0])=>({id,kind:'input',value,dimension,basis:'Independent generated test — मापन'});
const graph=(x,y,op,dim)=>JSON.stringify({schemaVersion:1,nodes:[input('a',x),input('b',y,dim),{id:'derived',kind:'derive',op,args:['a','b']},{id:'target',kind:'constraint',op:'gt',args:['derived','a']}]});
test('independent Python Fraction/hashlib replay on generated arithmetic, zero, dimension and stale receipts',async()=>{
 const cases=[],v=createVerifier();let i=0;
 for(const [x,y] of [['-2/3','1/3'],['2','0'],['7/11','13/17']])for(const op of ['add','sub','mul','div']){
  const g=graph(x,y,op,[0,0,0]),r=await v.evaluate(g),fresh=await createVerifier().evaluate(g);
  assert.equal(r.reportText,fresh.reportText);const id='case_'+(++i);
  cases.push({id,graph:g,report:r.reportText,expected:true},{id:id+'_forged',graph:g,report:r.reportText.replace(/sha256:[a-f0-9]{64}/,'sha256:'+'0'.repeat(64)),expected:false});
  if(y==='0'&&op==='div'){assert.equal(r.report.receipts.find(x=>x.id==='derived').outcome.reason,'DIVISION_BY_ZERO');assert.equal(r.report.receipts.find(x=>x.id==='target').outcome.status,'blocked');}
 }
 const g=graph('2','1','add',[1,0,0]),r=await v.evaluate(g);assert.equal(r.report.receipts.find(x=>x.id==='derived').outcome.reason,'DIMENSION_MISMATCH');cases.push({id:'dimension',graph:g,report:r.reportText,expected:true});
 const dir=mkdtempSync(join(tmpdir(),'sutra-independent-'));
 try{const path=join(dir,'cases.json');writeFileSync(path,JSON.stringify({cases}));const p=spawnSync('python3',[reference,path],{encoding:'utf8',timeout:30000,maxBuffer:1048576});assert.equal(p.status,0,p.stderr||String(p.error));const result=JSON.parse(p.stdout);assert.equal(result.cases.length,cases.length);assert.equal(result.cases.filter(x=>x.accepted).length,13);}finally{rmSync(dir,{recursive:true,force:true});}
});

// Challenge the independent verifier on graph topology and revision, not just
// forged hash strings. All accepted controls use the actual JavaScript kernel.
test('independent replay distinguishes topology and stale receipts across graph revision',async()=>{
 const n=(id,value)=>input(id,value);const op=(id,kind,operator,args)=>({id,kind,op:operator,args});
 const g=nodes=>JSON.stringify({schemaVersion:1,nodes});
 const a=g([n('a','3'),n('b','2'),op('sum','derive','add',['a','b']),op('target','constraint','gt',['sum','b'])]);
 const b=g([n('a','4'),n('b','1'),op('sum','derive','add',['a','b']),op('target','constraint','gt',['sum','b'])]);
 const v=createVerifier(),x=await v.evaluate(a),y=await v.evaluate(b);assert.notEqual(x.reportText,y.reportText);
 const valid=JSON.parse(a),nodes=valid.nodes;
 const variants=[{id:'old',graph:a,report:x.reportText,expected:true},{id:'new',graph:b,report:y.reportText,expected:true},{id:'stale_same_sum',graph:b,report:x.reportText,expected:false},{id:'permuted',graph:g([...nodes].reverse()),report:x.reportText,expected:true},{id:'dangling',graph:g(nodes.slice(1)),report:x.reportText,expected:false},{id:'duplicate',graph:g([...nodes,nodes[0]]),report:x.reportText,expected:false},{id:'cycle',graph:g(nodes.map(n=>n.id==='sum'?{...n,args:['sum','b']}:n)),report:x.reportText,expected:false}];
 const dir=mkdtempSync(join(tmpdir(),'sutra-topology-'));try{const path=join(dir,'cases.json');writeFileSync(path,JSON.stringify({cases:variants}));const p=spawnSync('python3',[reference,path],{encoding:'utf8',timeout:30000,maxBuffer:1048576});assert.equal(p.status,0,p.stderr||p.stdout||String(p.error));assert.equal(JSON.parse(p.stdout).cases.filter(c=>c.accepted).length,3);}finally{rmSync(dir,{recursive:true,force:true});}
});
