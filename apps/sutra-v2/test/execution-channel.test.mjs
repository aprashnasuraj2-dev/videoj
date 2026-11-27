import test from 'node:test';
import assert from 'node:assert/strict';
import {executionFeed,createStudioExecution,publishTaskExecution} from '../src/execution-channel.js';
import {runTaskGraph} from '../../../packages/sutra-runtime/investigation-tasks.js';
test('browser feed joins real scheduler and scripted council without sharing payload or granting authority',async()=>{
 const events=[],off=executionFeed.subscribe((e,s)=>events.push([e,s]));
 const c=createStudioExecution(1,'draft:1',()=>false,['one','two']);
 c.send('started');c.send('request','one',1);c.send('response','one',1);
 assert.equal(executionFeed.snapshot('studio_1').agents[0].proposals,0);
 c.send('proposal','one',1);c.finish('completed');
 const r=await runTaskGraph({tasks:[{id:'frame',kind:'frame',agentId:'planner',dependsOn:[]}],handlers:{frame:{execute:()=>({private:'never in telemetry'}),admit:x=>x}},runId:'review_1',version:'sha256:'+'a'.repeat(64),executionOrigin:'deterministic',onExecutionEvent:publishTaskExecution});
 assert.equal(r.artifacts[0].value.private,'never in telemetry');
 assert.equal(executionFeed.snapshot('review_1').agents[0].status,'completed');
 assert.equal(executionFeed.snapshot('studio_1').status,'completed');
 assert.ok(!JSON.stringify(events).includes('never in telemetry'));
 assert.equal(events.length,10);off();
});
