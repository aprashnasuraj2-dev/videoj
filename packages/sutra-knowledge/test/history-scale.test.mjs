import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {livingFixture} from '../examples/living-investigation.mjs';
import {MAX_VERSIONS,MAX_BRANCHES} from '../investigation-history.js';
import {MAX_HISTORY_BYTES} from '../local-history-store.mjs';
import {openDurableInvestigationHistory} from '../durable-investigation-history.mjs';

test('bounded durable history reaches declared version and branch maxima and refuses the next unit',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'sutra-history-scale-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const started=performance.now(),durable=await openDurableInvestigationHistory(dir);
 const root=await livingFixture('finance');
 let state=await durable.initializeRoot({versionText:root.versionText,versionPin:root.digest}),head=root;
 for(let i=1;i<MAX_VERSIONS;i++){
  const next=await livingFixture('finance',{irrelevant:true,previousDigest:head.digest});
  state=await durable.appendVersion({expectedHistoryPin:state.snapshot.digest,branch:'main',expectedBranchHead:head.digest,versionText:next.versionText,versionPin:next.digest});
  head=next;
 }
 assert.equal(state.snapshot.view.versions.length,MAX_VERSIONS);
 for(let i=1;i<MAX_BRANCHES;i++)state={snapshot:await durable.fork({expectedHistoryPin:state.snapshot.digest,branch:'branch_'+i,fromVersionPin:root.digest})};
 assert.equal(state.snapshot.view.branches.length,MAX_BRANCHES);
 const extra=await livingFixture('finance',{irrelevant:true,previousDigest:head.digest});
 await assert.rejects(durable.appendVersion({expectedHistoryPin:state.snapshot.digest,branch:'main',expectedBranchHead:head.digest,versionText:extra.versionText,versionPin:extra.digest}),/HISTORY_APPEND/);
 await assert.rejects(durable.fork({expectedHistoryPin:state.snapshot.digest,branch:'overflow',fromVersionPin:root.digest}),/HISTORY_FORK/);
 const bytes=Buffer.byteLength(state.snapshot.historyText,'utf8');
 assert.ok(bytes>0&&bytes<=MAX_HISTORY_BYTES);
 const restored=await durable.restore({expectedHistoryPin:state.snapshot.digest,versionPin:head.digest});
 assert.equal(restored.report.digest,head.digest);
 const profile={versions:state.snapshot.view.versions.length,branches:state.snapshot.view.branches.length,historyBytes:bytes,maxHistoryBytes:MAX_HISTORY_BYTES,elapsedMilliseconds:Math.round(performance.now()-started),replayComplexity:'O(V * versionReplay)',appendVerificationComplexity:'O(V) histories plus version replay',crossFilesystemPortability:'NOT_CLAIMED'};
 console.log('SUTRA_HISTORY_SCALE_PROFILE '+JSON.stringify(profile));
});
