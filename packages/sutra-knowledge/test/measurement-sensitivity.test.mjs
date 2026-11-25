import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityExample,casePin} from '../pinned-investigation.js';
import {sourceDigest} from '../evidence-session.js';
import {alignedInvestigationExport} from '../aligned-investigation.js';
import {createAlignedCapsule} from '../aligned-capsule.js';
import {measurementSensitivity,exportMeasurementSensitivity} from '../measurement-sensitivity.js';
const wire=JSON.stringify,req=(lower='10/1',upper='30/1',observationId='read_meter')=>wire({observationId,lower,upper});
async function resolved(){
 const f=await capacityExample(),r=f.reads;
 return {...f,eventText:wire([r.read_meter,r.read_mirror,r.read_alternate,{type:'withdraw_lineage',lineage:'alternate_root'},r.read_capacity])};
}
test('single relaxation is blocked by the copy; explicit same-lineage cohort reveals lost decisiveness',async()=>{
 const f=await resolved(),run=q=>measurementSensitivity(f.caseText,f.pin,f.eventText,q);
 const before=await createAlignedCapsule(f.caseText,f.pin,f.eventText),r=await run(req());
 assert.equal(r.baseline.state,'REFUTED');assert.deepEqual(r.cohort,['read_meter','read_mirror']);
 assert.equal(r.single.state,'REFUTED');assert.deepEqual(r.single.readmittedWorlds,[]);
 assert.deepEqual(r.single.blockers.find(w=>w.world==='load_20_cap_20').observations,['read_mirror']);
 assert.equal(r.shared.state,'UNDERDETERMINED');assert.deepEqual(r.shared.readmittedWorlds,['load_10_cap_20','load_20_cap_20']);
 assert.equal(r.shared.frontier.status,'insufficient_observations');assert.equal(r.shared.frontier.witness.length,2);
 const fractional=await run(req('199/10'));assert.deepEqual(fractional.shared.readmittedWorlds,['load_20_cap_20']);
 const identical=await run(req('30/1'));assert.deepEqual(identical.shared.survivingWorlds,r.baseline.survivingWorlds);
 assert.equal((await createAlignedCapsule(f.caseText,f.pin,f.eventText)).expectedDigest,before.expectedDigest);
 assert.deepEqual((await exportMeasurementSensitivity(f.caseText,f.pin,f.eventText,req())).result,r);
});
test('relaxation may repair a contradiction but never admits a new observation or withdraws a lineage',async()=>{
 const f=await capacityExample(),events=wire([f.reads.read_meter,f.reads.read_mirror,f.reads.read_alternate]);
 const r=await measurementSensitivity(f.caseText,f.pin,events,req());
 assert.equal(r.baseline.state,'CONFLICTED');assert.equal(r.single.state,'CONFLICTED');
 assert.equal(r.shared.state,'SUPPORTED');assert.deepEqual(r.shared.survivingWorlds,['load_10_cap_20','load_10_cap_40']);
 assert.equal(r.shared.frontier.status,'invariant_decision');
 assert.equal((await alignedInvestigationExport(f.caseText,f.pin,events)).result.state,'CONFLICTED');
});
test('independent-declared root is not silently relaxed; unverified worlds are not hidden',async()=>{
 const f=await resolved(),c=JSON.parse(f.caseText),alt=c.sources.find(s=>s.id==='alternate');
 const altText=f.reads.read_alternate.sourceText.replace('10/1','30/1');alt.digest=await sourceDigest(altText);
 const caseText=wire(c),pin=await casePin(caseText);
 const events=wire([f.reads.read_meter,f.reads.read_mirror,{...f.reads.read_alternate,sourceText:altText},f.reads.read_capacity]);
 const r=await measurementSensitivity(caseText,pin,events,req());assert.equal(r.shared.state,'REFUTED');assert.deepEqual(r.cohort,['read_meter','read_mirror']);
 assert.deepEqual(r.shared.blockers.find(w=>w.world==='load_20_cap_20').observations,['read_alternate']);
 const changed=JSON.parse(f.caseText);
 for(const w of changed.worlds){
  const g=JSON.parse(w.graphText);g.nodes.push({id:'factor',kind:'input',value:w.id==='load_20_cap_20'?'0':'1',dimension:[0,0,0],basis:'Declared synthetic factor'},{id:'quotient',kind:'derive',op:'div',args:['load','factor']});
  g.nodes.find(n=>n.id==='target').args=['quotient','capacity'];w.graphText=wire(g);
 }
 const changedText=wire(changed),changedPin=await casePin(changedText),unknown=await measurementSensitivity(changedText,changedPin,f.eventText,req());
 assert.equal(unknown.baseline.state,'REFUTED');assert.equal(unknown.shared.state,'UNVERIFIED');assert.equal(unknown.shared.frontier.status,'unresolved_worlds');
});
test('closed exact interval profile rejects excluded point, inversion, malformed rationals and unadmitted reading',async()=>{
 const f=await resolved(),run=q=>measurementSensitivity(f.caseText,f.pin,f.eventText,q);
 for(const q of [req('31/1','40/1'),req('30/1','20/1'),req('20/2'),req('-0/1'),req('10/0'),req('10'),req('10/1','30/1','read_alternate'),'{"observationId":"read_meter","lower":"0/1","lower":"1/1","upper":"30/1"}',wire({observationId:'read_meter',lower:'10/1',upper:'30/1',trusted:true})])await assert.rejects(run(q));
});

test('direct finite-world oracle across all 81 availability configurations and 432 interval policies',async()=>{
 const f=await capacityExample(),sources=[['read_meter','meter_root','load',30],['read_mirror','meter_root','load',30],['read_alternate','alternate_root','load',10],['read_capacity','capacity_root','capacity',20]];
 const worlds=[];for(const load of [10,20,30])for(const capacity of [20,40])worlds.push({id:'load_'+load+'_cap_'+capacity,load,capacity});
 const state=ws=>!ws.length?'CONFLICTED':ws.every(w=>w.load<=w.capacity)?'SUPPORTED':ws.every(w=>w.load>w.capacity)?'REFUTED':'UNDERDETERMINED';
 let policies=0;
 for(let n=0;n<81;n++){
  const states=sources.map((_,i)=>Math.floor(n/3**i)%3),active=sources.filter((_,i)=>states[i]===1),events=[];
  // These sources share the meter lineage, so availability must be changed
  // at source granularity to independently enumerate all four source states.
  for(let i=0;i<4;i++){if(states[i]===1)events.push(f.reads[sources[i][0]]);else if(states[i]===2)events.push({type:'withdraw_source',sourceId:JSON.parse(f.reads[sources[i][0]].sourceText).sourceId});}
  const eventText=wire(events),baseline=worlds.filter(w=>active.every(s=>w[s[2]]===s[3]));
  for(const selected of active){
   const v=selected[3],intervals=[[v,v],[0,v],[v,40],[0,40]];
   const cohort=active.filter(s=>s[1]===selected[1]&&s[2]===selected[2]&&s[3]===v).map(s=>s[0]).sort();
   for(const [lo,hi] of intervals){
    const r=await measurementSensitivity(f.caseText,f.pin,eventText,req(lo+'/1',hi+'/1',selected[0]));
    assert.deepEqual(r.baseline,{state:state(baseline),survivingWorlds:baseline.map(w=>w.id)});
    assert.deepEqual(r.cohort,cohort);
    for(const [mode,relaxed] of [['single',[selected[0]]],['shared',cohort]]){
     const matches=(w,s)=>relaxed.includes(s[0])?lo<=w[s[2]]&&w[s[2]]<=hi:w[s[2]]===s[3];
     const survived=worlds.filter(w=>active.every(s=>matches(w,s))),ids=survived.map(w=>w.id),actual=r[mode];
     assert.equal(actual.state,state(survived));assert.deepEqual(actual.survivingWorlds,ids);
     assert.deepEqual(actual.readmittedWorlds,ids.filter(id=>!baseline.some(w=>w.id===id)));
     assert.deepEqual(actual.blockers,worlds.map(w=>({world:w.id,observations:active.filter(s=>!matches(w,s)).map(s=>s[0]).sort()})));
    }
    policies++;
   }
  }
 }
 assert.equal(policies,432);
});
