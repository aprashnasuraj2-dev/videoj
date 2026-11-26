import test from 'node:test';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {createInvestigationHistory} from '../investigation-history.js';
import {verifyHistoryExtension} from '../history-extension.js';
const append=(h,v)=>{const s=h.snapshot();return h.append({expectedHistoryPin:s.digest,branch:'main',expectedHead:s.view.branches.find(b=>b.name==='main').head,versionText:v.versionText,versionPin:v.digest});};
const check=(a,b)=>verifyHistoryExtension({previousText:a.historyText,previousPin:a.digest,nextText:b.historyText,nextPin:b.digest});
test('append and fork preserve exact history and prior branch ancestry',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{revised:true,previousDigest:a.digest}),h=await createInvestigationHistory(a.versionText,a.digest),s0=h.snapshot(),s1=await append(h,b);
 const s2=await h.fork({expectedHistoryPin:s1.digest,branch:'other',fromDigest:a.digest}),r=await check(s0,s2);
 assert.equal(r.status,'APPEND_ONLY_EXTENSION');assert.deepEqual(r.addedVersions,[b.digest]);assert.deepEqual(r.addedBranches,['other']);assert.equal(r.advances[0].steps,1);assert.equal(r.decisionAuthority,'NONE');
 assert.equal((await check(s2,s2)).status,'UNCHANGED');await assert.rejects(check(s2,s0),/HISTORY_EXTENSION_VERSION_LOSS/);
});
test('independently valid sibling histories and self-repinned rollback are not extensions',async()=>{
 const a=await livingFixture(),b=await livingFixture('finance',{revised:true,previousDigest:a.digest}),c=await livingFixture('finance',{withdraw:true,previousDigest:a.digest});
 const x=await createInvestigationHistory(a.versionText,a.digest),y=await createInvestigationHistory(a.versionText,a.digest);
 const old=await append(x,b),fork=await append(y,c);await assert.rejects(check(old,fork),/HISTORY_EXTENSION_VERSION_LOSS/);
 await assert.rejects(verifyHistoryExtension({previousText:old.historyText,previousPin:old.digest,nextText:old.historyText+' ',nextPin:old.digest}),/HISTORY_PIN/);
});
