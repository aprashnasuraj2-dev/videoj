import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityExample,casePin} from '../pinned-investigation.js';
import {createAlignedCapsule} from '../aligned-capsule.js';
import {diagnoseProposalClash,exportProposalClash} from '../proposal-clash.js';
const wire=JSON.stringify,q=(pin,e,claimedState)=>wire({caseDigest:pin,eventText:wire(e),claimedState});
test('opposed valid conclusions yield a cross-branch receipt clash and minimum conflict, not a merge',async()=>{
 const f=await capacityExample(),a=[f.reads.read_capacity,f.reads.read_alternate],b=[f.reads.read_capacity,f.reads.read_meter],text=wire(a),p=q(f.pin,b,'REFUTED'),before=await createAlignedCapsule(f.caseText,f.pin,text);
 const r=await diagnoseProposalClash(f.caseText,f.pin,text,p);
 assert.equal(r.classification,'CROSS_BRANCH_CLASH');assert.equal(r.sharedFinal.state,'UNDERDETERMINED');assert.equal(r.jointFinal.state,'CONFLICTED');
 assert.deepEqual(r.jointFinal.minimumObservationConflict,['read_alternate','read_meter']);assert.deepEqual(r.jointFinal.minimum.conflict,[{roots:['alternate_root','meter_root'],worlds:[]}]);
 assert.deepEqual(r.jointFinal.observationIds,['read_alternate','read_capacity','read_meter']);assert.equal(r.jointFinal.frontier,undefined);
 assert.equal((await createAlignedCapsule(f.caseText,f.pin,text)).expectedDigest,before.expectedDigest);assert.deepEqual((await exportProposalClash(f.caseText,f.pin,text,p)).result,r);
});
test('same declared lineage can contain both incompatible readings; no invented independence',async()=>{
 const f=await capacityExample(),c=JSON.parse(f.caseText);c.sources.find(s=>s.id==='alternate').lineage='meter_root';const text=wire(c),pin=await casePin(text);
 const r=await diagnoseProposalClash(text,pin,wire([f.reads.read_alternate]),q(pin,[f.reads.read_meter],'UNDERDETERMINED'));
 assert.equal(r.classification,'CROSS_BRANCH_CLASH');assert.deepEqual(r.jointFinal.minimum.conflict,[{roots:['meter_root'],worlds:[]}]);assert.deepEqual(r.jointFinal.minimumObservationConflict,['read_alternate','read_meter']);
});
test('false claim alone is not an evidence clash and pre-existing conflict is distinguished',async()=>{
 const f=await capacityExample(),a=[f.reads.read_alternate];
 const r=await diagnoseProposalClash(f.caseText,f.pin,wire(a),q(f.pin,a,'REFUTED'));
 assert.equal(r.claim.matches,false);assert.equal(r.classification,'JOINT_COMPATIBLE');assert.equal(r.jointFinal.state,'SUPPORTED');assert.equal(r.jointFinal.minimumObservationConflict,null);
 const s=await diagnoseProposalClash(f.caseText,f.pin,wire([...a,f.reads.read_meter]),q(f.pin,a,'SUPPORTED'));assert.equal(s.classification,'BRANCH_ALREADY_CONFLICTED');
});
test('withdrawal disagreements are exposed; receipt-only replay makes no availability or authorization claim',async()=>{
 const f=await capacityExample(),a=[f.reads.read_alternate],b=[{type:'withdraw_source',sourceId:'alternate'},f.reads.read_meter],r=await diagnoseProposalClash(f.caseText,f.pin,wire(a),q(f.pin,b,'UNDERDETERMINED'));
 assert.equal(r.classification,'CROSS_BRANCH_CLASH');assert.deepEqual(r.unavailableInOtherBranch,{baselineReadings:['read_alternate'],proposalReadings:[]});assert.equal(r.jointFinal.state,'CONFLICTED');assert.match(r.qualification,/No merged history/);
});
test('all 256 ordered reading subsets: direct union/intersection and minimal-conflict oracle',async()=>{
 const f=await capacityExample(),rows=[['read_alternate','load',10,'alternate_root'],['read_capacity','capacity',20,'capacity_root'],['read_meter','load',30,'meter_root'],['read_mirror','load',30,'meter_root']];
 const worlds=[10,20,30].flatMap(load=>[20,40].map(capacity=>({id:'load_'+load+'_cap_'+capacity,load,capacity})));
 const subsets=Array.from({length:16},(_,i)=>rows.filter((_,j)=>i&(1<<j)));
 const survive=rs=>worlds.filter(w=>rs.every(([,k,v])=>w[k]===v));
 const state=ws=>!ws.length?'CONFLICTED':ws.every(w=>w.load<=w.capacity)?'SUPPORTED':ws.every(w=>w.load>w.capacity)?'REFUTED':'UNDERDETERMINED';
 const minimumRoots=rs=>{
  const roots=[...new Set(rs.map(x=>x[3]))].sort(),sets=Array.from({length:1<<roots.length},(_,i)=>roots.filter((_,j)=>i&(1<<j))).sort((a,b)=>a.length-b.length||a.join('|').localeCompare(b.join('|')));
  const conflicts=[];for(const group of sets)if(!survive(rs.filter(x=>group.includes(x[3]))).length&&!conflicts.some(c=>c.roots.every(x=>group.includes(x))))conflicts.push({roots:group,worlds:[]});return conflicts;
 };
 let count=0,cross=0;
 for(const a of subsets)for(const b of subsets){
  const shared=rows.filter(x=>a.includes(x)&&b.includes(x)),joint=rows.filter(x=>a.includes(x)||b.includes(x));
  const as=state(survive(a)),bs=state(survive(b)),ss=state(survive(shared)),js=state(survive(joint));
  const r=await diagnoseProposalClash(f.caseText,f.pin,wire(a.map(x=>f.reads[x[0]])),q(f.pin,b.map(x=>f.reads[x[0]]),bs));
  const cls=[as,bs].includes('CONFLICTED')?'BRANCH_ALREADY_CONFLICTED':js==='CONFLICTED'?'CROSS_BRANCH_CLASH':'JOINT_COMPATIBLE';
  assert.equal(r.classification,cls);assert.equal(r.sharedFinal.state,ss);assert.equal(r.jointFinal.state,js);assert.deepEqual(r.sharedFinal.survivingWorlds,survive(shared).map(w=>w.id));assert.deepEqual(r.jointFinal.survivingWorlds,survive(joint).map(w=>w.id));assert.deepEqual(r.jointFinal.minimum.conflict,minimumRoots(joint));
  if(cls==='CROSS_BRANCH_CLASH')cross++;count++;
 }
 assert.equal(count,256);assert.ok(cross>0);console.log('Clash direct oracle:',count,'pairs;',cross,'cross-branch clashes.');
});
