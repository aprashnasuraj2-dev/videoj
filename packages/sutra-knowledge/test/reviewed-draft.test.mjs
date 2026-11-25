import test from 'node:test';
import assert from 'node:assert/strict';
import {sealReviewedDraft,selectedSpan,draftComparisonProposal} from '../reviewed-draft.js';
import {exportReviewedProposal} from '../reviewed-claim-compiler.js';
const q='Is site A higher than site B?',a='測定 🧪 A: 12.50; repeat: 12.50;',b='Site B: 10.25;';
const t={kind:'stress',unit:'MPa',scope:'sample_scope',dimension:[-1,1,-2]};
const binding=(id,sourceId,source,token,last=false)=>{const start=last?source.lastIndexOf(token):source.indexOf(token);return {id,sourceId,start,end:start+token.length,type:t};};
function draft(){return {version:1,question:q,sources:[{id:'report_a',text:a,lineage:'root_a'},{id:'report_b',text:b,lineage:'root_b'}],bindings:[binding('a','report_a',a,'12.50',true),binding('b','report_b',b,'10.25')]};}
test('exact selected occurrence and astral UTF-16 to UTF-8 offsets, explicit comparator',async()=>{
 const d=draft(),s=await sealReviewedDraft(JSON.stringify(d)),c=JSON.parse(s.contractText);
 const span=c.bindings[0].span;assert.equal(span.quote,'12.50');assert.equal(span.start,new TextEncoder().encode(a.slice(0,a.lastIndexOf('12.50'))).length);
 assert.notEqual(span.start,a.lastIndexOf('12.50'));assert.equal(s.reviewed.bindingCount,2);
 const p=await draftComparisonProposal(s.contractText,s.pin,'a','b','gt'),r=await exportReviewedProposal(s.contractText,s.pin,p);
 assert.equal(r.result.target.status,'CONDITIONALLY_SATISFIED');assert.equal(r.result.target.questionRelevance,'UNVERIFIED');assert.deepEqual(r.result.target.declaredLineages,['root_a','root_b']);
 const changed=await sealReviewedDraft(JSON.stringify({...d,question:q+' Revised.'}));
 assert.notEqual(changed.pin,s.pin);await assert.rejects(()=>exportReviewedProposal(changed.contractText,changed.pin,p),/COMPILER_PROPOSAL/);
});
test('refuse split surrogate, truncated numeric token, duplicate span and source identity',async()=>{
 const i=a.indexOf('🧪');assert.throws(()=>selectedSpan('report_a',a,i,i+1),/DRAFT_SELECTION/);
 const d=draft();d.bindings[0].start++;
 await assert.rejects(()=>sealReviewedDraft(JSON.stringify(d)),/COMPILER_NUMBER_BOUNDARY/);
 const duplicate=draft();duplicate.bindings.push({...duplicate.bindings[0],id:'again'});
 await assert.rejects(()=>sealReviewedDraft(JSON.stringify(duplicate)),/COMPILER_DUPLICATE_BINDING_SPAN/);
 const bad=draft();bad.sources.push({...bad.sources[0]});await assert.rejects(()=>sealReviewedDraft(JSON.stringify(bad)),/DRAFT_SOURCE/);
 const s=await sealReviewedDraft(JSON.stringify(draft()));await assert.rejects(()=>draftComparisonProposal(s.contractText,s.pin,'a','a','eq'),/DRAFT_COMPARISON/);
});
test('manual scope differences remain incompatible; no guessed unit conversion',async()=>{
 const d=draft();d.bindings[1].type={...t,scope:'different_condition'};
 const s=await sealReviewedDraft(JSON.stringify(d)),p=await draftComparisonProposal(s.contractText,s.pin,'a','b','gt'),r=await exportReviewedProposal(s.contractText,s.pin,p);
 assert.equal(r.result.target.status,'BLOCKED_TYPE');
});
