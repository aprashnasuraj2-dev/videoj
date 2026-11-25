import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedAction} from '../src/demo-guide.mjs';
import {debuggerBaseline,debuggerCopies,debuggerRead,evaluateConclusionDebugger} from '../../../packages/sutra-knowledge/conclusion-debugger.js';
const result=events=>evaluateConclusionDebugger(JSON.stringify(events));
const w={type:'withdraw_lineage',lineage:'sample_one'},r={type:'restore_lineage',lineage:'sample_one'};
test('guide routes actual replayed results rather than assigning a conclusion',async()=>{
 const baseline=await debuggerBaseline(),original=await debuggerRead('read_a'),copies=await debuggerCopies(),disagree=await debuggerRead('read_b'),measurement=await debuggerRead('read_c');
 const histories=[baseline,[...baseline,w],[...baseline,w,r,original],[...baseline,w,r,original,copies],[...baseline,w,r,original,copies,disagree],[...baseline,w,r,original,copies,disagree,w],[...baseline,w,r,original,copies,disagree,w,measurement]];
 assert.equal(guidedAction([],null).action,'start');
 const expected=['withdraw','restore','copies','disagree','withdraw','plan-observe','capsule-export'];
 for(const [i,events] of histories.entries())assert.equal(guidedAction(events,await result(events)).action,expected[i]);
 const done=histories.at(-1),verified=await result(done),capsule={historyDigest:verified.historyDigest,hasBytes:true,hasPin:true,pinRequested:false,verified:false,challenge:'none',tampered:false};
 assert.equal(guidedAction(done,verified,capsule).action,'capsule-pin-export');
 assert.equal(guidedAction(done,verified,{...capsule,pinRequested:true}).action,'capsule-verify');
 assert.equal(guidedAction(done,verified,{...capsule,pinRequested:true,verified:true}).action,'capsule-tamper');
 assert.equal(guidedAction(done,verified,{...capsule,pinRequested:true,tampered:true,challenge:'rejected'}).action,'capsule-restore');
 const complete={...capsule,pinRequested:true,verified:true,challenge:'restored'};
 assert.equal(guidedAction(done,verified,complete).mode,'complete');
 assert.equal(guidedAction(done,verified,{...complete,historyDigest:'old'}).action,'capsule-export');
 assert.equal(guidedAction(done,verified,{...complete,hasPin:false}).action,'capsule-export');
 assert.equal(guidedAction(done,verified,{...complete,verified:false}).action,'capsule-verify');
});
test('manual deviation and inconsistent claimed state cannot silently advance the tour',async()=>{
 const baseline=await debuggerBaseline(),manual=[...baseline,await debuggerCopies()],actual=await result(manual);
 assert.equal(guidedAction(manual,actual).mode,'explore');
 const baselineResult=await result(baseline),forged={...baselineResult,claims:{...baselineResult.claims,target:{state:'REFUTED'}}};
 assert.equal(guidedAction(baseline,forged).mode,'explore');
});
