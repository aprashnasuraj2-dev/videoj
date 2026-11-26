import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {livingFixture} from '../examples/living-investigation.mjs';
import {createInvestigationHistory} from '../investigation-history.js';
import {FACETS} from '../semantic-investigation.js';
import {openDurableInvestigationHistory} from '../durable-investigation-history.mjs';

async function setup(t){
 const dir=await mkdtemp(join(tmpdir(),'sutra-durable-typed-history-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 return dir;
}
function assertFullTypedGraph(restored,expected){
 assert.deepEqual(restored.report,expected.report);
 const report=restored.report,graph=report.graph,investigation=report.investigation;
 assert.equal(report.digest,expected.digest);
 assert.ok(graph.nodes.some(n=>n.kind==='question'));
 assert.ok(graph.nodes.some(n=>n.kind==='declared_lineage'));
 assert.ok(graph.nodes.some(n=>n.kind==='evidence'));
 assert.ok(graph.nodes.some(n=>n.kind==='reviewed_quantity'));
 assert.ok(graph.nodes.some(n=>n.kind==='candidate_interpretation'));
 assert.ok(graph.edges.some(e=>e.relation==='target_depends_on'&&e.authority==='COMPILER_ADMISSION'));
 assert.ok(graph.edges.some(e=>e.relation==='declared_ancestry'&&e.authority==='HOST_DECLARATION'));
 assert.ok(investigation.candidates.length>=2);
 for(const candidate of investigation.candidates)assert.deepEqual(Object.keys(candidate.facets),FACETS);
}
test('durable store reopens exact full typed investigation graph across revision, fork and conflict',async t=>{
 const dir=await setup(t);
 const root=await livingFixture('finance');
 const revised=await livingFixture('finance',{revised:true,previousDigest:root.digest});
 const withdrawn=await livingFixture('finance',{withdraw:true,previousDigest:root.digest});
 let durable=await openDurableInvestigationHistory(dir);
 const initialized=await durable.initializeRoot({versionText:root.versionText,versionPin:root.digest});
 assertFullTypedGraph(initialized.restored,root);
 const s1=await durable.appendVersion({expectedHistoryPin:initialized.snapshot.digest,branch:'main',expectedBranchHead:root.digest,versionText:revised.versionText,versionPin:revised.digest});
 assertFullTypedGraph(s1.restored,revised);
 const s2=await durable.fork({expectedHistoryPin:s1.snapshot.digest,branch:'alternative',fromVersionPin:root.digest});
 const s3=await durable.appendVersion({expectedHistoryPin:s2.digest,branch:'alternative',expectedBranchHead:root.digest,versionText:withdrawn.versionText,versionPin:withdrawn.digest});
 durable=await openDurableInvestigationHistory(dir);
 assert.deepEqual((await durable.read(s3.snapshot.digest)).view.branches,[{name:'alternative',head:withdrawn.digest},{name:'main',head:revised.digest}]);
 assertFullTypedGraph(await durable.restore({expectedHistoryPin:s3.snapshot.digest,versionPin:root.digest}),root);
 assertFullTypedGraph(await durable.restore({expectedHistoryPin:s3.snapshot.digest,versionPin:revised.digest}),revised);
 assertFullTypedGraph(await durable.restore({expectedHistoryPin:s3.snapshot.digest,versionPin:withdrawn.digest}),withdrawn);
 const contrast=await durable.compareSiblings({expectedHistoryPin:s3.snapshot.digest,baseVersionPin:root.digest,leftVersionPin:revised.digest,rightVersionPin:withdrawn.digest});
 assert.equal(contrast.status,'EXPLICIT_CONFLICTS_REQUIRE_REVIEW');
 assert.equal(contrast.decisionAuthority,'NONE');
});
test('two durable typed adapters cannot both advance one retained head and failed stale write preserves winner',async t=>{
 const dir=await setup(t),root=await livingFixture('finance');
 const revised=await livingFixture('finance',{revised:true,previousDigest:root.digest});
 const withdrawn=await livingFixture('finance',{withdraw:true,previousDigest:root.digest});
 const a=await openDurableInvestigationHistory(dir),init=await a.initializeRoot({versionText:root.versionText,versionPin:root.digest});
 const b=await openDurableInvestigationHistory(dir),request=v=>({expectedHistoryPin:init.snapshot.digest,branch:'main',expectedBranchHead:root.digest,versionText:v.versionText,versionPin:v.digest});
 const outcomes=await Promise.allSettled([a.appendVersion(request(revised)),b.appendVersion(request(withdrawn))]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 const winner=outcomes.find(x=>x.status==='fulfilled').value;
 const reopened=await openDurableInvestigationHistory(dir),snapshot=await reopened.read(winner.snapshot.digest);
 assert.equal(snapshot.digest,winner.snapshot.digest);
 assert.equal(snapshot.view.versions.length,2);
 const winnerPin=snapshot.view.branches.find(x=>x.name==='main').head;
 const expected=winnerPin===revised.digest?revised:withdrawn;
 assertFullTypedGraph(await reopened.restore({expectedHistoryPin:snapshot.digest,versionPin:winnerPin}),expected);
 const loser=winnerPin===revised.digest?withdrawn:revised;
 await assert.rejects(reopened.appendVersion({expectedHistoryPin:init.snapshot.digest,branch:'main',expectedBranchHead:root.digest,versionText:loser.versionText,versionPin:loser.digest}),/HISTORY_STORE_STALE_OR_ROLLED_BACK_HEAD/);
 assert.deepEqual((await reopened.read(snapshot.digest)).view,snapshot.view);
});
test('portable history snapshots initialize and advance the durable host only with exact retained CAS',async t=>{
 const dir=await setup(t),root=await livingFixture('finance'),child=await livingFixture('finance',{revised:true,previousDigest:root.digest});
 const portable=await createInvestigationHistory(root.versionText,root.digest),s0=portable.snapshot();
 const s1=await portable.append({expectedHistoryPin:s0.digest,branch:'main',expectedHead:root.digest,versionText:child.versionText,versionPin:child.digest});
 const host=await openDurableInvestigationHistory(dir),initialized=await host.initializeSnapshot({historyText:s0.historyText,historyPin:s0.digest});
 assert.deepEqual(initialized,s0);
 const advanced=await host.appendSnapshot({expectedHistoryPin:s0.digest,historyText:s1.historyText,historyPin:s1.digest});
 assert.deepEqual(advanced,s1);
 await assert.rejects(host.appendSnapshot({expectedHistoryPin:s0.digest,historyText:s1.historyText,historyPin:s1.digest}),/HISTORY_STORE_STALE_OR_ROLLED_BACK_HEAD/);
 assert.deepEqual(await host.read(s1.digest),s1);
 assertFullTypedGraph(await host.restore({expectedHistoryPin:s1.digest,versionPin:child.digest}),child);
});
