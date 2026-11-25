import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {compileReviewedProposal,createReviewedCompilerSession} from '../reviewed-claim-compiler.js';
import {livingFixture} from '../examples/living-investigation.mjs';
const unpack=(v,id)=>{const x=JSON.parse(v.versionText);return [x.contractText,x.contractPin,JSON.parse(x.batchText).proposals.find(p=>p.id===id).proposalText];};
async function exact(session,args){const r=await session.compile(...args);assert.deepEqual(r.result,await compileReviewedProposal(...args));return r;}
async function mutate(args,change,program=()=>{}){const c=JSON.parse(args[0]),p=JSON.parse(args[2]);await change(c);const t=JSON.stringify(c),pin=await casePin(t);p.contractDigest=pin;program(p);return [t,pin,JSON.stringify(p)];}
for(const domain of ['finance','engineering'])test(domain+': real compilation reuses unchanged bindings, preserves new exact receipts and drops withdrawn arithmetic',async()=>{
 const a=await livingFixture(domain),b=await livingFixture(domain,{previousDigest:a.digest,revised:true}),w=await livingFixture(domain,{previousDigest:b.digest,withdraw:true});
 const primary=createReviewedCompilerSession(),secondary=createReviewedCompilerSession();
 const pa=await exact(primary,unpack(a,'primary_view')),sa=await exact(secondary,unpack(a,'secondary_view'));
 assert.equal(pa.stats.executed.length,3);assert.equal(sa.stats.executed.length,3);
 const pb=await exact(primary,unpack(b,'primary_view')),sb=await exact(secondary,unpack(b,'secondary_view'));
 assert.equal(pb.stats.executed.length,0);assert.equal(pb.stats.reusedOutcomes.length,3);assert.equal(pb.stats.rebuiltReceipts.length,3);
 assert.notEqual(pa.result.report.graphDigest,pb.result.report.graphDigest);
 assert.equal(sb.stats.executed.length,3);assert.equal(sb.stats.reusedOutcomes.length,0);
 const sw=await exact(secondary,unpack(w,'secondary_view'));assert.equal(sw.result.target.status,'BLOCKED_MISSING_INPUT');assert.equal(sw.result.report,null);assert.equal(sw.stats.removed.length,3);
 const restored=await exact(secondary,unpack(a,'secondary_view'));assert.equal(restored.stats.executed.length,3);
});
test('same numerical values with altered lineage or source bytes invalidate arithmetic; irrelevant source changes do not',async()=>{
 const a=await livingFixture(),args=unpack(a,'primary_view'),v=createReviewedCompilerSession();await exact(v,args);
 const changed=await mutate(args,c=>{c.sources.find(s=>s.id==='primary').lineage='other_root';});
 const b=await exact(v,changed);assert.equal(b.stats.executed.length,3);
 const textChanged=await mutate(changed,async c=>{const s=c.sources.find(s=>s.id==='primary');s.text+='; unchanged values';s.digest=await casePin(s.text);});
 const t=await exact(v,textChanged);assert.equal(t.stats.executed.length,3);
 const unrelated=await mutate(textChanged,async c=>{const s=c.sources.find(s=>s.id==='context');s.text+='; context only';s.digest=await casePin(s.text);});
 const u=await exact(v,unrelated);assert.equal(u.stats.reusedOutcomes.length,3);assert.equal(u.stats.rebuiltReceipts.length,3);
});
test('failed proposal, branch fork and concurrent compilation do not mutate the previous session',async()=>{
 const a=await livingFixture(),args=unpack(a,'primary_view'),v=createReviewedCompilerSession(),initial=await exact(v,args);
 const fork=v.fork(),branch=await mutate(args,c=>{c.sources.find(s=>s.id==='primary').lineage='branch_root';});await exact(fork,branch);
 const bad=JSON.parse(args[2]);bad.nodes[0].bindingId='invented';await assert.rejects(v.compile(args[0],args[1],JSON.stringify(bad)),/COMPILER_NODE/);
 const running=v.compile(...args);await assert.rejects(v.compile(...args),/COMPILER_SESSION_BUSY/);assert.throws(()=>v.fork(),/COMPILER_SESSION_BUSY/);
 const again=await running;assert.deepEqual(again.result,initial.result);assert.equal(again.stats.reusedReceipts.length,3);
});
