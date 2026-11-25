import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityExample,casePin} from '../pinned-investigation.js';
import {createAlignedCapsule} from '../aligned-capsule.js';
import {auditObservedDomainGrid,exportObservedDomainGrid} from '../coverage-grid.js';
const wire=JSON.stringify;
async function incomplete(){const f=await capacityExample(),c=JSON.parse(f.caseText);c.worlds=c.worlds.filter(w=>w.id!=='load_30_cap_20');const text=wire(c);return {...f,caseText:text,pin:await casePin(text)};}
test('observed values hide a missing incompatible decision; nearest assignment is deterministic',async()=>{
 const f=await incomplete(),events=wire([f.reads.read_meter]),before=await createAlignedCapsule(f.caseText,f.pin,events),r=await auditObservedDomainGrid(f.caseText,f.pin,events);
 assert.equal(r.baseline.state,'SUPPORTED');assert.equal(r.gridSize,'6');assert.equal(r.missingCount,'1');assert.equal(r.closureState,'UNDERDETERMINED');assert.equal(r.status,'MISSING_COMBINATIONS');
 const x=r.candidates[0];assert.deepEqual(x.assignment,[{id:'capacity',value:'20/1'},{id:'load',value:'30/1'}]);assert.equal(x.decision,'constraint_refuted');assert.equal(x.compatible,true);assert.equal(x.nearestWorld,'load_10_cap_20');assert.deepEqual(x.changedInputs,[{id:'load',from:'10/1',to:'30/1'}]);
 assert.equal((await createAlignedCapsule(f.caseText,f.pin,events)).expectedDigest,before.expectedDigest);assert.deepEqual((await exportObservedDomainGrid(f.caseText,f.pin,events)).result,r);
 const excluded=await auditObservedDomainGrid(f.caseText,f.pin,wire([f.reads.read_alternate]));assert.equal(excluded.candidates[0].compatible,false);assert.equal(excluded.closureState,'SUPPORTED');assert.deepEqual(excluded.candidates[0].blockers.map(x=>x.observationId),['read_alternate']);
});
test('complete observed grid does not imply empirical completeness; normalized duplicates are reported',async()=>{
 const f=await capacityExample(),r=await auditObservedDomainGrid(f.caseText,f.pin,'[]');assert.equal(r.status,'CLOSED_OVER_OBSERVED_VALUES');assert.equal(r.closureState,r.baseline.state);assert.equal(r.missingCount,'0');assert.deepEqual(r.candidates,[]);
 const c=JSON.parse(f.caseText),w=structuredClone(c.worlds[0]),g=JSON.parse(w.graphText);g.nodes.find(n=>n.id==='load').value='20/2';w.id='duplicate';w.graphText=wire(g);c.worlds.push(w);const text=wire(c),x=await auditObservedDomainGrid(text,await casePin(text),'[]');assert.deepEqual(x.duplicateGroups,[['duplicate','load_10_cap_20']]);assert.equal(x.uniqueAssignments,6);assert.equal(x.missingCount,'0');
});
test('Cartesian bound is exact and no partial closure is claimed',async()=>{
 const f=await capacityExample(),c=JSON.parse(f.caseText);for(let i=0;i<c.worlds.length;i++){const g=JSON.parse(c.worlds[i].graphText);g.nodes.push({id:'factor',kind:'input',value:String(i+1),dimension:[0,0,0],basis:'Synthetic factor'});c.worlds[i].graphText=wire(g);}const text=wire(c),r=await auditObservedDomainGrid(text,await casePin(text),'[]');assert.equal(r.gridSize,'36');assert.equal(r.missingCount,'30');assert.equal(r.status,'GRID_LIMIT_EXCEEDED');assert.equal(r.closureState,null);assert.deepEqual(r.candidates,[]);
});
test('missing grid assignment with invalid offered quantity is not silently dropped',async()=>{
 const f=await capacityExample(),c=JSON.parse(f.caseText);c.worlds=c.worlds.filter(w=>w.id!=='load_20_cap_20');
 for(const w of c.worlds){const g=JSON.parse(w.graphText);g.nodes.push({id:'difference',kind:'derive',op:'sub',args:['load','capacity']},{id:'ratio',kind:'derive',op:'div',args:['load','difference']});w.graphText=wire(g);}
 c.offers.push({id:'read_ratio',nodeId:'ratio',sourceId:'meter',cost:5,dimension:[0,0,0]});
 const text=wire(c),r=await auditObservedDomainGrid(text,await casePin(text),'[]');assert.equal(r.status,'MISSING_COMBINATIONS');assert.equal(r.closureState,'UNVERIFIED');assert.equal(r.candidates[0].compatible,null);assert.deepEqual(r.candidates[0].invalidOffers,['read_ratio']);
 c.offers.pop();for(const w of c.worlds){const g=JSON.parse(w.graphText);g.nodes.find(n=>n.id==='target').args=['ratio','capacity'];w.graphText=wire(g);}const t=wire(c),x=await auditObservedDomainGrid(t,await casePin(t),'[]');assert.equal(x.closureState,'UNVERIFIED');assert.equal(x.candidates[0].compatible,true);assert.equal(x.candidates[0].decision,'blocked');
});
