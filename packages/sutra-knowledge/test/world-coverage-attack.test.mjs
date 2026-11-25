import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityExample,casePin} from '../pinned-investigation.js';
import {createAlignedCapsule} from '../aligned-capsule.js';
import {alignedInvestigationExport} from '../aligned-investigation.js';
import {coverageAttack,exportCoverageAttack} from '../world-coverage-attack.js';
const wire=JSON.stringify,request=(worldId='omitted',baseWorldId='load_10_cap_20',overrides={capacity:'5'})=>wire({worldId,baseWorldId,overrides});
test('compatible omitted world refutes a previously invariant model; original evidence and capsule remain exact',async()=>{
 const f=await capacityExample(),eventText=wire([f.reads.read_alternate]),before=await createAlignedCapsule(f.caseText,f.pin,eventText);
 const a=await coverageAttack(f.caseText,f.pin,eventText,request());
 assert.equal(a.baseline.state,'SUPPORTED');assert.equal(a.candidate.compatible,true);assert.equal(a.candidate.decision,'constraint_refuted');
 assert.deepEqual(a.candidate.changes,[{id:'capacity',from:'20/1',to:'5/1',dimension:[0,0,0]}]);
 assert.equal(a.variant.state,'UNDERDETERMINED');assert.equal(a.variant.frontier.plan.observationId,'read_capacity');assert.equal(a.variant.frontier.plan.worstCost,3);
 assert.deepEqual(a.variant.survivingWorlds,['load_10_cap_20','load_10_cap_40','omitted']);
 assert.notEqual(a.caseDigest,a.variant.caseDigest);assert.equal(await casePin(a.variantCaseText),a.variant.caseDigest);
 const b=await alignedInvestigationExport(a.variantCaseText,a.variant.caseDigest,eventText);assert.equal(b.alignment.schemaDigest,a.schemaDigest);
 assert.equal((await createAlignedCapsule(f.caseText,f.pin,eventText)).expectedDigest,before.expectedDigest);
 assert.deepEqual((await exportCoverageAttack(f.caseText,f.pin,eventText,request())).result,a);
});
test('incompatible candidate remains excluded with exact blocking reading; direct source contradiction remains',async()=>{
 const f=await capacityExample(),events=wire([f.reads.read_alternate]);
 const a=await coverageAttack(f.caseText,f.pin,events,request('omitted','load_30_cap_20',{capacity:'5'}));
 assert.equal(a.candidate.compatible,false);assert.equal(a.variant.state,'SUPPORTED');
 assert.deepEqual(a.candidate.blockers,[{observationId:'read_alternate',lineage:'alternate_root',nodeId:'load',expected:'30/1',observed:'10/1'}]);
 const conflict=await coverageAttack(f.caseText,f.pin,wire([f.reads.read_alternate,f.reads.read_meter]),request());
 assert.equal(conflict.baseline.state,'CONFLICTED');assert.equal(conflict.variant.state,'CONFLICTED');assert.equal(conflict.candidate.compatible,false);
});
test('missing hypothesis can restore consistency; unresolved candidate cannot manufacture support',async()=>{
 const f=await capacityExample(),c=JSON.parse(f.caseText);
 c.worlds=c.worlds.filter(w=>w.id!=='load_30_cap_20');
 const text=wire(c),pin=await casePin(text),events=wire([f.reads.read_meter,f.reads.read_capacity]);
 const a=await coverageAttack(text,pin,events,request('missing','load_30_cap_40',{capacity:'20'}));
 assert.equal(a.baseline.state,'CONFLICTED');assert.equal(a.candidate.compatible,true);assert.equal(a.variant.state,'REFUTED');
 const u=JSON.parse(f.caseText);
 for(const w of u.worlds){
  const g=JSON.parse(w.graphText);g.nodes.push({id:'factor',kind:'input',value:'1',dimension:[0,0,0],basis:'Synthetic factor'},{id:'quotient',kind:'derive',op:'div',args:['load','factor']});g.nodes.find(n=>n.id==='target').args=['quotient','capacity'];w.graphText=wire(g);
 }
 const ut=wire(u),up=await casePin(ut),b=await coverageAttack(ut,up,wire([f.reads.read_alternate]),request('unresolved','load_10_cap_20',{factor:'0'}));
 assert.equal(b.baseline.state,'SUPPORTED');assert.equal(b.candidate.compatible,true);assert.equal(b.candidate.decision,'blocked');assert.equal(b.variant.state,'UNVERIFIED');
});
test('reject duplicate normalized input assignment, derived overrides, malformed request and full world budget',async()=>{
 const f=await capacityExample(),run=q=>coverageAttack(f.caseText,f.pin,'[]',q);
 for(const q of [request('load_10_cap_20'),request('new','not_existing'),request('new','load_10_cap_20',{capacity:'40/2'}),request('new','load_10_cap_20',{capacity:'40'}),request('new','load_10_cap_20',{target:'1'}),request('new','load_10_cap_20',{}),request('new','load_10_cap_20',{capacity:'0/0'}), '{"worldId":"new","worldId":"new2","baseWorldId":"load_10_cap_20","overrides":{"capacity":"5"}}'])await assert.rejects(run(q));
 const c=JSON.parse(f.caseText);for(let i=0;i<6;i++){const w=structuredClone(c.worlds[i]),g=JSON.parse(w.graphText);g.nodes.find(n=>n.id==='capacity').value=String(100+i);w.id='extra'+i;w.graphText=wire(g);c.worlds.push(w);}
 const text=wire(c),pin=await casePin(text);await assert.rejects(coverageAttack(text,pin,'[]',request()),/WORLD_COVERAGE_REFUSED/);
});
