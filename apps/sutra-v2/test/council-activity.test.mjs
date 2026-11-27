import test from 'node:test';
import assert from 'node:assert/strict';
import {createCouncilActivity,createCouncilEmitter} from '../src/council-activity.js';
test('transport response is not admission; late round admission does not regress current state',()=>{
 const a=createCouncilActivity();const e=createCouncilEmitter(1,x=>assert.equal(a.apply(x),true),()=>false);
 e.send('started');e.send('request','agent_one',1);e.send('response','agent_one',1);
 assert.equal(a.snapshot().agents[0].proposals,0);
 e.send('request','agent_one',2);e.send('proposal','agent_one',1);
 assert.equal(a.snapshot().agents[0].status,'working');assert.equal(a.snapshot().agents[0].proposals,1);
 e.send('response','agent_one',2);e.send('proposal','agent_one',2);e.finish('completed');
 assert.equal(a.snapshot().agents[0].responses,2);assert.equal(a.snapshot().agents[1].status,'not-run');
});
test('cancellation, duplicate events, stale runs and malformed payloads fail closed',()=>{
 const a=createCouncilActivity();let cancelled=false;const history=[];
 const e=createCouncilEmitter(1,x=>{history.push(x);assert.equal(a.apply(x),true);},()=>cancelled);
 e.send('started');e.send('request','agent_one',1);assert.equal(e.send('request','agent_one',1),false);
 assert.equal(a.apply(history[1]),false);
 assert.equal(a.apply({...history[1],sequence:9,secret:'no'}),false);
 cancelled=true;assert.equal(e.send('response','agent_one',1),false);e.finish('cancelled');
 assert.equal(a.snapshot().agents[0].status,'cancelled');
 assert.equal(a.apply({...history[1],sequence:10,phase:'response'}),false);
 const next=createCouncilEmitter(2,x=>assert.equal(a.apply(x),true),()=>false);next.send('started');
 assert.equal(a.apply({...history[1],sequence:11}),false);
 assert.equal(a.snapshot().runId,2);
});
test('no invented proposal or response; rejected route can be reported without transport',()=>{
 const a=createCouncilActivity();const e=(phase,sequence,agent=null,round=null)=>({version:1,origin:'local-scripted',runId:1,phase,sequence,agent,round,agentIds:phase==='started'?['agent_one','agent_two']:null});
 assert.equal(a.apply(e('started',1)),true);
 assert.equal(a.apply(e('proposal',2,'agent_one',1)),false);
 assert.equal(a.apply(e('response',2,'agent_one',1)),false);
 assert.equal(a.apply(e('rejected',2,'agent_two',1)),true);
 assert.equal(a.snapshot().agents[1].responses,0);
 assert.equal(a.apply(e('completed',3)),true);
 assert.equal(a.apply(e('started',1)),false);
});

test('runtime projection accepts the existing kernel bound of four unique declared slots, not six',()=>{
 const a=createCouncilActivity(),ids=['one','two','three','four'];
 const e=createCouncilEmitter(1,x=>assert.equal(a.apply(x),true),()=>false,ids);
 e.send('started');ids.push('five');
 assert.equal(a.snapshot().agents.length,4);
 e.send('request','four',1);e.send('response','four',1);e.finish('completed');
 assert.equal(a.snapshot().agents[3].responses,1);
 const start=agentIds=>({version:1,origin:'local-scripted',runId:2,sequence:1,phase:'started',agent:null,round:null,agentIds});
 assert.equal(a.apply(start(['a','b','c','d','e'])),false);
 assert.equal(a.apply(start(['a','a'])),false);
 assert.equal(a.apply(start(['a','b'])),true);
});
