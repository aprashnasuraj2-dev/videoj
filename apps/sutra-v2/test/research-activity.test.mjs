import test from 'node:test';
import assert from 'node:assert/strict';
import {createResearchActivityProjector} from '../src/research-activity.js';
test('observed host phases distinguish retrieval, transport receipts, index and report',()=>{
 const p=createResearchActivityProjector(),run=e=>p.project(e,'injected_fixture');
 const start=run({kind:'operation.pending',role:'drone',operation:'document'});assert.equal(start.updateRole,1);assert.equal(start.updateState,'working');assert.match(start.detail,/Source retrieval/);
 const got=run({kind:'operation.completed',role:'drone',operation:'document'});assert.equal(got.updateState,'idle');
 const source=run({kind:'evidence.admitted',sourceId:'source_1',passages:3});assert.deepEqual([source.role,source.to],[1,2]);assert.match(source.detail,/truth unverified/);
 const model=run({kind:'model.response',role:'spark',vendor:'groq',model:'fixture'});assert.match(model.detail,/receipt.*not evidence verification/);assert.equal(model.to,null);assert.equal(model.updateState,null);
 assert.deepEqual([run({kind:'evidence.indexed',role:'gear',passages:3}).role,run({kind:'evidence.indexed',role:'gear',passages:3}).to],[2,4]);
 assert.match(run({kind:'report.assembled',status:'closed'}).detail,/authority NONE/);
 assert.equal(run({kind:'runtime.task',role:'bot',status:'completed'}),null);
 assert.equal(run({kind:'model.response',role:'constructor'}),null);
 assert.equal(p.project({kind:'operation.pending',role:'bot',operation:'model'},'simulated'),null);
});
test('browser trace maps real delegation parent and exact evidence read, not guessed role or text',()=>{
 const p=createResearchActivityProjector(),run=e=>p.project(e,'browser_runtime');
 const agent=run({kind:'browser.agent',operation:'start',id:'s1',agent:'planner'});
 assert.deepEqual([agent.role,agent.updateRole,agent.updateState],[0,0,'working']);
 const model=run({kind:'browser.model_call',operation:'start',parent:'s1'});assert.match(model.detail,/outcome not yet known/);
 run({kind:'browser.tool',operation:'start',id:'s2',parent:'s1',tool:'critic'});
 const child=run({kind:'browser.agent',operation:'start',id:'s3',parent:'s2',agent:'critic'});assert.deepEqual([child.role,child.to,child.updateRole],[0,5,5]);
 const end=run({kind:'browser.agent',operation:'end',id:'s3',parent:'s2',agent:'critic',status:'ok'});assert.deepEqual([end.role,end.to,end.updateState],[5,0,'idle']);
 run({kind:'browser.tool',operation:'start',id:'s4',parent:'s1',tool:'mcp_inspect_evidence'});
 const read=run({kind:'browser.tool',operation:'end',id:'s4',parent:'s1',tool:'mcp_inspect_evidence',status:'ok'});assert.deepEqual([read.role,read.to],[2,0]);
 assert.equal(run({kind:'browser.model_call',operation:'end',parent:'missing',status:'ok'}),null);
 assert.equal(run({kind:'browser.agent',operation:'start',id:'s1',agent:'planner'}),null);
 p.reset();assert.equal(run({kind:'browser.model_call',operation:'start',parent:'s1'}),null);
});
