import test from 'node:test';
import assert from 'node:assert/strict';
import {createProviderWorkspace} from '../provider-workspace.js';
const turn=()=>new Promise(r=>setImmediate(r));
test('six profiles contend for four global concurrent leases; unknown outcomes keep reservation and no credential escapes',async()=>{
 const catalog=Array.from({length:6},(_,i)=>({id:'provider-'+i,label:'Provider '+i,models:['m']})),limits={maxCalls:12,maxInputBytes:12000,maxOutputTokens:1200,maxConcurrent:4};
 let seed=1,active=0,peak=0;const gates=[],seen=[];
 const w=createProviderWorkspace({catalog,globalLimits:limits,defaultProfileLimits:{...limits,maxConcurrent:1},clock:()=>0,randomBytes:n=>new Uint8Array(n).fill(seed++),transports:catalog.map((p,i)=>({providerId:p.id,async send(req){active++;peak=Math.max(peak,active);seen.push(i);try{return await new Promise((resolve,reject)=>gates.push({i,resolve,reject}));}finally{active--;}}}))});
 const profiles=catalog.map((p,i)=>w.addProfile({providerId:p.id,label:p.label,credential:'CONTENTION_PRIVATE_'+i+'_SECRET'}));
 const call=i=>w.execute({handle:profiles[i].handle,model:'m',inputBytes:100,maxOutputTokens:50,operation:{question:'bounded'}});
 const first=Array.from({length:6},(_,i)=>call(i).then(value=>({ok:true,value}),error=>({ok:false,code:error.code})));
 await turn();assert.equal(seen.length,4);assert.equal(peak,4);assert.equal(w.budgetSnapshot().global.used.active,4);
 // One provider fails; its reservation remains unknown and charged.
 gates[0].reject(Error('ambiguous outcome'));gates.slice(1).forEach(g=>g.resolve({actualInputBytes:10,actualOutputTokens:5,value:{text:'ok'}}));
 const results=await Promise.all(first);assert.equal(results.filter(r=>r.ok).length,3);assert.equal(results.filter(r=>!r.ok&&r.code==='BUDGET').length,2);
 let used=w.budgetSnapshot().global.used;assert.equal(used.calls,4);assert.equal(used.unknown,1);assert.equal(used.active,1);
 const next=[call(4),call(5)];await turn();assert.equal(seen.length,6);gates.slice(4).forEach(g=>g.resolve({actualInputBytes:10,actualOutputTokens:5,value:{text:'ok'}}));await Promise.all(next);
 used=w.budgetSnapshot().global.used;assert.equal(used.calls,6);assert.equal(used.unknown,1);assert.equal(used.active,1);assert.equal(used.actualOutputTokens,25);
 assert.doesNotMatch(JSON.stringify({results,profiles:w.list(),budget:w.budgetSnapshot()}),/CONTENTION_PRIVATE/);
});
