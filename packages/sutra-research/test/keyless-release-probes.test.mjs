import test from 'node:test';
import assert from 'node:assert/strict';
import {previewDocumentProbes,executeDocumentProbes,classifyDocumentProbe} from '../keyless-release-probes.mjs';
test('fixed keyless document plan has nine bounded public probes; incorrect pin refuses before network',async()=>{
 const p=previewDocumentProbes();assert.equal(p.planPin,'sha256:6354c3258312fd99bc69314e6518a5250385e4fac59e2773c7ca3ab6207037ca');assert.equal(p.plan.cases.length,9);
 assert.equal(new Set(p.plan.cases.map(c=>c.id)).size,9);
 assert.ok(p.plan.cases.every(c=>new URL(c.url).protocol==='https:'));
 await assert.rejects(executeDocumentProbes({approvedPlanPin:'wrong',approvePublicContact:true,approveEstimatedCost:true}),/SUITE_APPROVAL/);
 await assert.rejects(executeDocumentProbes({approvedPlanPin:p.planPin,approvePublicContact:false,approveEstimatedCost:true}),/SUITE_APPROVAL/);
});
test('real-status receipt classifier rejects unproven redirect, robots contact and missing response',()=>{
 const doc={rawDigest:'sha256:'+'a'.repeat(64),textDigest:'sha256:'+'b'.repeat(64),text:'valid',mediaType:'text/plain',redirectChain:[]};
 for(const [expected,document,error,operations,outcome] of [
 ['text/plain',doc,null,[{kind:'document'}],'PASS'],
 ['text/csv',doc,null,[],'FAIL'],['redirect',doc,null,[],'FAIL'],
 ['redirect',{...doc,redirectChain:[{}]},null,[],'PASS'],
 ['ROBOTS',null,'ROBOTS',[{kind:'robots'}],'PASS'],
 ['ROBOTS',null,'ROBOTS',[{kind:'document'}],'FAIL'],
 ['NOT_FOUND',null,'RESPONSE',[{kind:'document'}],'FAIL'],
 ['NOT_FOUND',null,'NOT_FOUND',[{kind:'document'}],'PASS'],
 ['cancel',null,'INACTIVE',[],'PASS'],
 ['cancel',null,'INACTIVE',[{kind:'robots'}],'FAIL']])assert.equal(classifyDocumentProbe({expected,document,error,operations}),outcome);
});
