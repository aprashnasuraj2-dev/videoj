import test from 'node:test';import assert from 'node:assert/strict';
import {createReviewMutationQueue,REVIEW_LOCK_NAME} from '../src/review-mutation.js';
test('queued review operations are revoked on navigation and missing locks fail before mutation',async()=>{
 let requested,release,effects=0;
 const locks={request(name,options,callback){requested={name,options};return new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});release=()=>{try{resolve(callback());}catch(error){reject(error);}};});}};
 const queue=createReviewMutationQueue({locks});
 const pending=queue.run(()=>{effects++;});assert.equal(requested.name,REVIEW_LOCK_NAME);assert.equal(requested.options.mode,'exclusive');
 queue.revoke();await assert.rejects(pending);release();assert.equal(effects,0);
 const next=queue.run(()=>{effects++;return 'saved';});release();assert.equal(await next,'saved');assert.equal(effects,1);
 await assert.rejects(createReviewMutationQueue({locks:null}).run(()=>{effects++;}),/unavailable/);assert.equal(effects,1);
});
