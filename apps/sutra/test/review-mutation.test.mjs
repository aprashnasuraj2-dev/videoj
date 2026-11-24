import test from 'node:test';import assert from 'node:assert/strict';
import {createReviewMutationQueue,REVIEW_LOCK_NAME} from '../src/review-mutation.js';
function cooperative(){
 let held=false,active=0,maxActive=0,tail=Promise.resolve();
 return {get maxActive(){return maxActive;},locks:{request(name,{mode,signal},effect){
  assert.equal(name,REVIEW_LOCK_NAME);assert.equal(mode,'exclusive');
  const run=tail.then(async()=>{signal.throwIfAborted();held=true;active++;maxActive=Math.max(maxActive,active);
   try{return await effect();}finally{active--;held=false;}});
  tail=run.catch(()=>{});return run;
 }}};
}
test('review queue serializes callers and preserves results',async()=>{
 const c=cooperative(),queue=createReviewMutationQueue({locks:c.locks});
 const order=[];let release;
 const a=queue.run(async()=>{order.push('a-start');await new Promise(resolve=>{release=resolve;});order.push('a-end');return 'first';});
 const b=queue.run(()=>{order.push('b');return 'second';});
 await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(order,['a-start']);
 release();assert.deepEqual(await Promise.all([a,b]),['first','second']);
 assert.deepEqual(order,['a-start','a-end','b']);assert.equal(c.maxActive,1);
});
test('navigation revokes an already entered pending result without claiming completion',async()=>{
 const c=cooperative(),queue=createReviewMutationQueue({locks:c.locks});
 let release,entered=false;
 const pending=queue.run(async()=>{entered=true;await new Promise(resolve=>{release=resolve;});return 'late success';});
 for(let i=0;i<100&&!entered;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(entered,true);queue.revoke();release();
 await assert.rejects(pending,e=>e.outcome==='unknown');
 assert.equal(await queue.run(()=>7),7,'new lifetime works without inheriting previous operation');
});
test('a queued review never executes after pagehide even if the lock becomes available',async()=>{
 let release;const locks={request:(_name,{signal},effect)=>new Promise((resolve,reject)=>{
  release=()=>Promise.resolve().then(()=>signal.aborted?reject(signal.reason):effect()).then(resolve,reject);
 })};
 const queue=createReviewMutationQueue({locks}),calls=[];
 const pending=queue.run(()=>{calls.push('mutated');});
 queue.revoke();release();await assert.rejects(pending,e=>e.name==='AbortError');
 assert.deepEqual(calls,[],'no destructive effect after stale queue revocation');
});

test('revoked already-entered storage effect is unknown, never a proven rejection',async()=>{
 let release,called=0;
 const queue=createReviewMutationQueue({locks:{request:async(_name,_opts,cb)=>cb()}});
 const pending=queue.run(async()=>{called++;await new Promise(resolve=>{release=resolve;});});
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(called,1);
 queue.revoke();release();await assert.rejects(pending,e=>e.outcome==='unknown');
});
