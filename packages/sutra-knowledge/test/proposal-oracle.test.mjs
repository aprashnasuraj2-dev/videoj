import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityExample} from '../pinned-investigation.js';
import {challengeProposal} from '../proposal-challenge.js';
// Independent arithmetic/set oracle: no kernel, projection or frontier calls.
const offers=[['read_alternate','load',10,'alternate_root'],['read_capacity','capacity',20,'capacity_root'],['read_meter','load',30,'meter_root'],['read_mirror','load',30,'meter_root']];
const worlds=[10,20,30].flatMap(load=>[20,40].map(capacity=>({id:'load_'+load+'_cap_'+capacity,load,capacity})));
const diff=(a,b)=>({shared:a.filter(x=>b.includes(x)),baselineOnly:a.filter(x=>!b.includes(x)),proposalOnly:b.filter(x=>!a.includes(x))});
function oracle(rows){
 const survivors=worlds.filter(w=>rows.every(([,node,v])=>w[node]===v));
 const state=!survivors.length?'CONFLICTED':survivors.every(w=>w.load<=w.capacity)?'SUPPORTED':survivors.every(w=>w.load>w.capacity)?'REFUTED':'UNDERDETERMINED';
 return {state,survivors:survivors.map(w=>w.id),ids:rows.map(x=>x[0]).sort(),roots:[...new Set(rows.map(x=>x[3]))].sort()};
}
test('256 ordered proposal pairs: independent direct arithmetic and set oracle',async()=>{
 const f=await capacityExample(),subsets=Array.from({length:16},(_,m)=>offers.filter((_,i)=>m&(1<<i)));
 let count=0,oppositeCount=0,mismatchCount=0;
 for(const a of subsets)for(const b of subsets){
  const aa=oracle(a),bb=oracle(b),ae=a.map(x=>f.reads[x[0]]),be=b.map(x=>f.reads[x[0]]);
  // Alternate between a truthful and a deliberately incorrect asserted state.
  const claimed=count%2===0?bb.state:bb.state==='SUPPORTED'?'REFUTED':'SUPPORTED';
  const x=await challengeProposal(f.caseText,f.pin,JSON.stringify(ae),JSON.stringify({caseDigest:f.pin,eventText:JSON.stringify(be),claimedState:claimed}));
  let prefix=0;while(prefix<Math.min(a.length,b.length)&&a[prefix][0]===b[prefix][0])prefix++;
  const common=oracle(a.slice(0,prefix));
  assert.equal(x.baseline.state,aa.state);assert.equal(x.proposal.state,bb.state);assert.deepEqual(x.worlds,diff(aa.survivors,bb.survivors));
  assert.equal(x.claim.matches,claimed===bb.state);assert.equal(x.history.commonEventCount,prefix);assert.equal(x.history.commonPrefix.state,common.state);assert.deepEqual(x.history.commonPrefix.survivingWorlds,common.survivors);
  assert.deepEqual(Object.fromEntries(['shared','baselineOnly','proposalOnly'].map(k=>[k,x.evidence[k].map(r=>r.observationId)])),diff(aa.ids,bb.ids));
  assert.deepEqual(x.evidence.declaredRoots,diff(aa.roots,bb.roots));
  const opposite=new Set([aa.state,bb.state]).size===2&&[aa.state,bb.state].every(s=>s==='SUPPORTED'||s==='REFUTED');
  assert.equal(x.comparison,opposite?'OPPOSITE_DECISIVE_STATES':aa.state===bb.state?'SAME_STATE':'DIFFERENT_STATES');
  if(opposite){assert.equal(x.worlds.shared.length,0);oppositeCount++;}
  if(!x.claim.matches)mismatchCount++;count++;
 }
 assert.equal(count,256);assert.ok(oppositeCount>0);assert.equal(mismatchCount,128);
 console.log('Proposal direct oracle:',count,'pairs;',oppositeCount,'opposite decisive;',mismatchCount,'false assertions.');
});
