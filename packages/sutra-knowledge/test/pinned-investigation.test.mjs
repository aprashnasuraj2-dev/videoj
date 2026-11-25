import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceDigest} from '../evidence-session.js';
import {capacityExample,casePin,investigatePinnedCase,pinnedInvestigationExport} from '../pinned-investigation.js';
const wire=x=>JSON.stringify(x);
test('six nonbinary worlds, real rational labels, shared root, conflict and recovery',async()=>{
 const f=await capacityExample(),r=f.reads,run=e=>investigatePinnedCase(f.caseText,f.pin,wire(e));
 const first=await run([r.read_meter]);
 assert.equal(first.state,'UNDERDETERMINED');
 assert.equal(first.report.frontier.plan.observationId,'read_capacity');
 assert.deepEqual(first.observationValues.find(o=>o.id==='read_capacity').outcomes.map(x=>x.value),['20/1','40/1']);
 const copied=await run([r.read_meter,r.read_mirror]);
 assert.deepEqual(copied.minimum,first.minimum);assert.equal(copied.rootSummary.length,1);
 assert.deepEqual(copied.rootSummary[0].sourceIds,['meter','mirror']);
 const conflict=await run([r.read_meter,r.read_mirror,r.read_alternate]);
 assert.equal(conflict.state,'CONFLICTED');
 assert.deepEqual(conflict.minimum.conflict.map(x=>x.roots),[['alternate_root','meter_root']]);
 assert.deepEqual(conflict.repairs.map(x=>[x.remove,x.state]),[[['alternate_root'],'UNDERDETERMINED'],[['meter_root'],'SUPPORTED']]);
 const resolved=await run([r.read_meter,r.read_mirror,r.read_alternate,{type:'withdraw_lineage',lineage:'alternate_root'},r.read_capacity]);
 assert.equal(resolved.state,'REFUTED');
 assert.deepEqual(resolved.minimum.refutation.map(x=>x.roots),[['capacity_root','meter_root']]);
 const empty=await run([]);assert.equal(empty.state,'UNDERDETERMINED');
});
test('external pin mandatory; case tamper, duplicate keys, invalid observation, and event bound fail closed',async()=>{
 const f=await capacityExample();
 await assert.rejects(investigatePinnedCase(f.caseText,'', '[]'),/CASE_PIN_REQUIRED/);
 await assert.rejects(investigatePinnedCase(f.caseText+' ',f.pin,'[]'),/CASE_PIN_MISMATCH/);
 const dup=f.caseText.replace('"version":1','"version":1,"version":1');
 await assert.rejects(investigatePinnedCase(dup,await casePin(dup),'[]'));
 await assert.rejects(investigatePinnedCase(f.caseText,f.pin,wire([{...f.reads.read_meter,sourceText:f.reads.read_meter.sourceText+' '}])));
 await assert.rejects(investigatePinnedCase(f.caseText,f.pin,wire(Array(25).fill(f.reads.read_meter))));
 await assert.rejects(casePin('é'.repeat(131073)),/CASE_BYTES/);
 const exact='[ '+wire(f.reads.read_meter)+' ]',b=await pinnedInvestigationExport(f.caseText,f.pin,exact);
 assert.equal(b.eventText,exact);assert.equal(b.result.eventDigest,await casePin(exact));
});
test('unresolved worlds cannot yield support; empty finite intersection is not vacuous truth',async()=>{
 const f=await capacityExample(),c=JSON.parse(f.caseText),g=JSON.parse(c.worlds[0].graphText);
 g.nodes.splice(2,0,{id:'zero',kind:'input',value:'0',dimension:[0,0,0],basis:'Synthetic zero'},{id:'bad',kind:'derive',op:'div',args:['load','zero']});
 g.nodes.find(n=>n.id==='target').args=['bad','capacity'];c.worlds[0].graphText=wire(g);
 const text=wire(c),pin=await casePin(text),r=await investigatePinnedCase(text,pin,'[]');
 assert.equal(r.state,'UNVERIFIED');assert.equal(r.report.status,'unresolved_worlds');
 assert.deepEqual(r.minimum.support,[]);
});

test('eight declared roots: inclusion-minimal repairs include larger alternatives, not only shortest repairs',async()=>{
 const scope='eight_root_case',dimension=[0,0,0],worlds=[],sources=[],offers=[],reads=[],truth={};
 // All 12 finite worlds, including two independent binary coordinates.
 // First three roots impose x=0, x=1 and x=1 respectively; the other five
 // provide compatible repeated constraints on y. The inclusion-minimal
 // repairs must include both {root_0} and {root_1,root_2}.
 for(let i=0;i<12;i++){
  const x=i%2,y=Math.floor(i/2)%2,z=Math.floor(i/4),id='w'+String(i).padStart(2,'0');
  const nodes=[...Object.entries({x,y,z,zero:0}).map(([id,v])=>({id,kind:'input',value:String(v),dimension,basis:'Synthetic oracle input'})),{id:'target',kind:'constraint',op:'eq',args:['x','zero']}];
  truth[id]={x,y,z};worlds.push({id,graphText:wire({schemaVersion:1,nodes}),constraintId:'target'});
 }
 const values=[['x',0],['x',1],['x',1],['y',0],['y',0],['y',0],['y',0],['y',0]];
 for(const [i,[node,v]] of values.entries()){
  const id='source_'+i,root='root_'+i,observationId='read_'+i;
  const sourceText=wire({version:1,sourceId:id,sourceVersion:'v1',scope,values:{[node]:{value:v+'/1',dimension}}});
  sources.push({id,version:'v1',digest:await sourceDigest(sourceText),lineage:root});
  offers.push({id:observationId,nodeId:node,sourceId:id,cost:i+1,dimension});reads.push({type:'read',observationId,sourceText});
 }
 const caseText=wire({version:1,decisionId:'target',scope,costUnit:'effort',worlds,sources,offers}),pin=await casePin(caseText);
 const r=await investigatePinnedCase(caseText,pin,wire(reads));
 assert.equal(r.rootSummary.length,8);assert.equal(r.state,'CONFLICTED');
 assert.deepEqual(r.minimum.conflict.map(x=>x.roots),[['root_0','root_1'],['root_0','root_2']]);
 assert.deepEqual(r.repairs.map(x=>[x.remove,x.state]),[[['root_0'],'REFUTED'],[['root_1','root_2'],'SUPPORTED']]);
 // For every root subset, direct world truth implies that a minimal
 // consistent support/refutation/conflict exists iff the corresponding
 // property holds, except that a contradictory superset cannot be support.
 for(let mask=0;mask<256;mask++){
  const roots=values.map((_,i)=>i).filter(i=>mask&(1<<i)),names=roots.map(i=>'root_'+i);
  const ws=Object.keys(truth).filter(w=>roots.every(i=>truth[w][values[i][0]]===values[i][1]));
  const k=!ws.length?'conflict':ws.every(w=>truth[w].x===0)?'support':ws.every(w=>truth[w].x===1)?'refutation':null;
  if(k)assert.ok(r.minimum[k].some(m=>m.roots.every(x=>names.includes(x))),k+' '+mask);
  if(ws.length)assert.equal(r.minimum.conflict.some(m=>m.roots.every(x=>names.includes(x))),false);
 }
 for(const repair of r.repairs){
  const changed=await investigatePinnedCase(caseText,pin,wire([...reads,...repair.remove.map(lineage=>({type:'withdraw_lineage',lineage}))]));
  assert.equal(changed.state,repair.state);assert.deepEqual(changed.report.survivingWorlds,repair.worlds);
 }
});
test('multiple exact quantities from one source remain one root; restoration requires new reads',async()=>{
 const f=await capacityExample(),c=JSON.parse(f.caseText),source=c.sources.find(s=>s.id==='meter');
 const sourceText=wire({version:1,sourceId:'meter',sourceVersion:'v1',scope:c.scope,values:{load:{value:'30/1',dimension:[0,0,0]},capacity:{value:'20/1',dimension:[0,0,0]}}});
 source.digest=await sourceDigest(sourceText);
 c.offers.push({id:'read_meter_capacity',nodeId:'capacity',sourceId:'meter',cost:2,dimension:[0,0,0]});
 const caseText=wire(c),pin=await casePin(caseText),run=e=>investigatePinnedCase(caseText,pin,wire(e));
 const reads=['read_meter','read_meter_capacity'].map(observationId=>({type:'read',observationId,sourceText}));
 const result=await run(reads);
 assert.equal(result.state,'REFUTED');assert.deepEqual(result.rootSummary,[{root:'meter_root',sourceIds:['meter'],observationIds:['read_meter','read_meter_capacity']}]);
 assert.deepEqual(result.minimum.refutation.map(x=>x.roots),[['meter_root']]);
 const missing=await run([...reads,{type:'withdraw_source',sourceId:'meter'}]);
 assert.equal(missing.state,'UNDERDETERMINED');assert.equal(missing.rootSummary.length,0);
 const restored=await run([...reads,{type:'withdraw_source',sourceId:'meter'},{type:'restore_source',sourceId:'meter'}]);
 assert.equal(restored.rootSummary.length,0);assert.equal(restored.state,'UNDERDETERMINED');
 assert.equal((await run([...reads,{type:'withdraw_source',sourceId:'meter'},{type:'restore_source',sourceId:'meter'},...reads])).state,'REFUTED');
});
