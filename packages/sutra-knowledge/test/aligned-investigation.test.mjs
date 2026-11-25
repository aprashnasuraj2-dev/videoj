import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityExample,casePin,pinnedInvestigationExport} from '../pinned-investigation.js';
import {alignedInvestigationExport,ALIGNED_VERSION} from '../aligned-investigation.js';
const wire=JSON.stringify;
async function changed(f,mutate){
 const c=JSON.parse(f.caseText),w=c.worlds[1],g=JSON.parse(w.graphText);mutate(g,w,c);w.graphText=wire(g);const text=wire(c);return [text,await casePin(text)];
}
test('exact aligned graph fingerprint survives node order, property order, input changes and evidence changes',async()=>{
 const f=await capacityExample(),a=await alignedInvestigationExport(f.caseText,f.pin,'[]');
 assert.equal(a.version,ALIGNED_VERSION);assert.equal(a.alignment.nodeCount,3);assert.equal(a.alignment.worldCount,6);
 const [text,pin]=await changed(f,g=>{g.nodes.reverse();g.nodes=g.nodes.map(n=>Object.fromEntries(Object.entries(n).reverse()));g.nodes.find(n=>n.id==='load').value='11';});
 const b=await alignedInvestigationExport(text,pin,'[]');
 assert.notEqual(a.result.caseDigest,b.result.caseDigest);assert.equal(a.alignment.schemaDigest,b.alignment.schemaDigest);
 const c=await alignedInvestigationExport(f.caseText,f.pin,wire([f.reads.read_meter,f.reads.read_capacity]));
 assert.equal(c.result.state,'REFUTED');assert.deepEqual(c.alignment,a.alignment);
});
test('re-pinning unrelated equations or semantic declarations does not authorize alignment',async()=>{
 const f=await capacityExample();
 for(const mutation of [
  g=>{g.nodes.find(n=>n.id==='target').op='ge';},
  g=>{g.nodes.find(n=>n.id==='target').args.reverse();},
  g=>{g.nodes.find(n=>n.id==='load').basis='Different measured quantity';},
  g=>{g.nodes.push({id:'extra',kind:'input',value:'1',dimension:[0,0,0],basis:'Unrelated assumption'});},
  (g,w)=>{g.nodes.push({id:'other',kind:'constraint',op:'le',args:['load','capacity']});w.constraintId='other';},
  g=>{g.nodes.find(n=>n.id==='target').kind='constraint';g.nodes.find(n=>n.id==='target').args=['load','load'];}
 ]){
  const [text,pin]=await changed(f,mutation);
  // Prove these are legal v1 cases: refusal is the new alignment guard.
  assert.ok(await pinnedInvestigationExport(text,pin,'[]'));
  await assert.rejects(alignedInvestigationExport(text,pin,'[]'),/CASE_GRAPH_ALIGNMENT/);
 }
});
test('identical unresolved graph shape cannot hide a division by zero world',async()=>{
 const f=await capacityExample(),c=JSON.parse(f.caseText);
 for(const [i,w] of c.worlds.entries()){
  const g=JSON.parse(w.graphText);
  g.nodes.push({id:'factor',kind:'input',value:i===0?'0':'1',dimension:[0,0,0],basis:'Declared factor'},{id:'quotient',kind:'derive',op:'div',args:['load','factor']});
  g.nodes.find(n=>n.id==='target').args=['quotient','capacity'];w.graphText=wire(g);
 }
 const text=wire(c),pin=await casePin(text),a=await alignedInvestigationExport(text,pin,'[]');
 assert.equal(a.result.state,'UNVERIFIED');assert.equal(a.alignment.nodeCount,5);
 assert.equal(a.result.report.status,'unresolved_worlds');
});
