import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNativeSeekTarget,isNativeCueReached} from '../src/seek-policy.js';

const ranges=(pairs=[])=>({length:pairs.length,start:i=>pairs[i][0],end:i=>pairs[i][1]});

test('finite target inside actual seekable range is accepted',()=>{
 const media={duration:8,seekable:ranges([[0,8]])};
 assert.equal(validateNativeSeekTarget(media,2),2);
 assert.equal(validateNativeSeekTarget(media,8),8);
});

test('live or unknown-duration media is explicitly nonseekable for evidence cues',()=>{
 for(const duration of [Infinity,NaN,0,-1]){
  assert.throws(()=>validateNativeSeekTarget({duration,seekable:ranges([[0,100]])},2),/finite seekable duration/);
 }
});

test('empty, malformed and gapped native seek ranges reject optimistic seeking',()=>{
 assert.throws(()=>validateNativeSeekTarget({duration:8,seekable:ranges([])},2),/no available seek range/);
 assert.throws(()=>validateNativeSeekTarget({duration:8,seekable:ranges([[0,1],[4,8]])},2),/outside available seek ranges/);
 assert.throws(()=>validateNativeSeekTarget({duration:8,seekable:{length:1,start:()=>NaN,end:()=>8}},2),/outside available seek ranges/);
});

test('invalid or out-of-duration targets fail before mutating media state',()=>{
 const media={duration:8,seekable:ranges([[0,8]])};
 for(const value of [-1,9,Infinity,NaN])assert.throws(()=>validateNativeSeekTarget(media,value));
 assert.throws(()=>validateNativeSeekTarget(null,2));
});


test('native seek receipt must land inside the exact cue, not merely within one second of its start',()=>{
 for(const actual of [1.5,1.999,2.1,2.5,NaN,Infinity])assert.equal(isNativeCueReached(actual,2,2.1),false,String(actual));
 for(const actual of [2,2.05,2.099])assert.equal(isNativeCueReached(actual,2,2.1),true,String(actual));
 assert.equal(isNativeCueReached(4,2,5),false,'long cue still requires landing near the requested start');
 assert.equal(isNativeCueReached(2,2,2),false);assert.equal(isNativeCueReached(0,-1,2),false);
});
