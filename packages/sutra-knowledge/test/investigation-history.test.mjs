import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {createInvestigationHistory,openInvestigationHistory,replayInvestigationHistory} from '../investigation-history.js';
const append=(h,s,branch,head,v)=>h.append({expectedHistoryPin:s.digest,branch,expectedHead:head,versionText:v.versionText,versionPin:v.digest});
test('multi-generation history, explicit historical fork, sibling conflict and exact restore',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{revised:true,previousDigest:a.digest}),c=await livingFixture('finance',{withdraw:true,previousDigest:a.digest}),d=await livingFixture('finance',{irrelevant:true,previousDigest:b.digest});
 const h=await createInvestigationHistory(a.versionText,a.digest),s0=h.snapshot(),s1=await append(h,s0,'main',a.digest,b);
 const s2=await h.fork({expectedHistoryPin:s1.digest,branch:'alternative',fromDigest:a.digest}),s3=await append(h,s2,'alternative',a.digest,c),s4=await append(h,s3,'main',b.digest,d);
 assert.equal(s4.view.versions.length,4);assert.deepEqual(s4.view.branches,[{name:'alternative',head:c.digest},{name:'main',head:d.digest}]);
 const contrast=await h.compareSiblings(a.digest,b.digest,c.digest);assert.equal(contrast.status,'EXPLICIT_CONFLICTS_REQUIRE_REVIEW');
 const recovered=await openInvestigationHistory(s4.historyText,s4.digest);assert.deepEqual(recovered.snapshot(),s4);
 assert.equal(recovered.restore(a.digest).versionText,a.versionText);assert.equal(recovered.restore(b.digest).versionText,b.versionText);
 assert.equal(s0.view.versions.length,1);assert.equal(s4.view.decisionAuthority,'NONE');
});
test('concurrent compare-and-swap allows exactly one update; failure does not poison queue',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{revised:true,previousDigest:a.digest}),c=await livingFixture('finance',{withdraw:true,previousDigest:a.digest});
 const h=await createInvestigationHistory(a.versionText,a.digest),s=h.snapshot();
 const results=await Promise.allSettled([append(h,s,'main',a.digest,b),append(h,s,'main',a.digest,c)]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.match(results[1].reason.message,/HISTORY_STALE_HISTORY/);
 const current=h.snapshot();assert.equal(current.view.branches[0].head,b.digest);
 await assert.rejects(append(h,current,'main',a.digest,c),/HISTORY_STALE_BRANCH/);assert.deepEqual(h.snapshot(),current);
 const fork=await h.fork({expectedHistoryPin:current.digest,branch:'second',fromDigest:a.digest});
 await append(h,fork,'second',a.digest,c);assert.equal(h.snapshot().view.versions.length,3);
});
test('tampered history, orphan, duplicate, invalid order and unreferenced version refuse',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{revised:true,previousDigest:a.digest}),h=await createInvestigationHistory(a.versionText,a.digest);
 const s=await append(h,h.snapshot(),'main',a.digest,b);
 await assert.rejects(replayInvestigationHistory(s.historyText+' ',s.digest),/HISTORY_PIN/);
 for(const edit of [x=>x.versions.reverse(),x=>x.versions.shift(),x=>x.versions.push(x.versions[0]),x=>x.branches[0].head=a.digest,x=>x.branches.push(x.branches[0]),x=>x.result='VERIFIED']){
  const x=JSON.parse(s.historyText);edit(x);const text=JSON.stringify(x);await assert.rejects(replayInvestigationHistory(text,await casePin(text)),/HISTORY_/);
 }
 await assert.rejects(createInvestigationHistory(b.versionText,b.digest),/HISTORY_ROOT/);
});
