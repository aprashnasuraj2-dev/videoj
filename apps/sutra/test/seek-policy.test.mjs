import test from 'node:test';
import assert from 'node:assert/strict';
import {assessSeekTarget,timeRangesSnapshot} from '../src/seek-policy.js';

test('finite seek target inside an available range is accepted',()=>assert.deepEqual(assessSeekTarget({duration:8,ranges:[[0,8]]},2),{ok:true,reason:'seekable',message:'Cue is within the current seekable range.'}));
test('live or unknown duration is distinct from an ordinary missing range',()=>{
 assert.equal(assessSeekTarget({duration:Infinity,ranges:[[100,120]]},110).reason,'live_or_unknown_duration');
 assert.equal(assessSeekTarget({duration:NaN,ranges:[]},2).reason,'live_or_unknown_duration');
 assert.equal(assessSeekTarget({duration:8,ranges:[]},2).reason,'no_seekable_range');
});
test('outside duration and outside current seek window are distinct',()=>{
 assert.equal(assessSeekTarget({duration:8,ranges:[[0,8]]},9).reason,'outside_duration');
 assert.equal(assessSeekTarget({duration:20,ranges:[[5,10]]},2).reason,'outside_seekable_range');
});
test('invalid targets and malformed ranges fail closed',()=>{
 assert.equal(assessSeekTarget({duration:8,ranges:[[0,8]]},-1).reason,'invalid_target');
 assert.equal(assessSeekTarget({duration:8,ranges:[[NaN,8]]},2).reason,'no_seekable_range');
});
test('TimeRanges snapshot is bounded and exception safe',()=>{
 const ranges={length:2,start:i=>i?4:0,end:i=>i?8:2};assert.deepEqual(timeRangesSnapshot(ranges),[[0,2],[4,8]]);
 assert.deepEqual(timeRangesSnapshot({length:129,start(){return 0},end(){return 1}}),[]);
 assert.deepEqual(timeRangesSnapshot({length:1,start(){throw Error('x')},end(){return 1}}),[]);
});
