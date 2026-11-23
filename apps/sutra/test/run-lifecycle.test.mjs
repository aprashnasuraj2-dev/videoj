import test from 'node:test';
import assert from 'node:assert/strict';
import {createRunLifecycle,RUN_STATES} from '../src/run-lifecycle.js';

test('lifecycle exposes the five explicit states and valid completion flow',()=>{
  assert.deepEqual(RUN_STATES,['idle','running','cancelling','failed','complete']);
  const seen=[];const life=createRunLifecycle({onChange:s=>seen.push(s.state)});
  assert.equal(life.snapshot().state,'idle');
  life.start('running fixture');life.complete('complete fixture');
  assert.deepEqual(seen,['idle','running','complete']);
  assert.equal(life.snapshot().detail,'complete fixture');
});
test('cancel path is visibly incomplete and ends failed, never complete',()=>{
  const seen=[];const life=createRunLifecycle({onChange:s=>seen.push({...s})});
  life.start();life.cancel();life.fail('Cancelled. Incomplete result; nothing verified.');
  assert.deepEqual(seen.map(x=>x.state),['idle','running','cancelling','failed']);
  assert.match(life.snapshot().detail,/Incomplete/i);
});
test('invalid transitions fail closed and completed/failed runs can restart',()=>{
  const life=createRunLifecycle();
  assert.throws(()=>life.cancel(),/Invalid run lifecycle transition/);
  life.start();life.complete();life.start();life.fail();
  assert.equal(life.snapshot().state,'failed');
  assert.throws(()=>life.complete(),/Invalid run lifecycle transition/);
});
