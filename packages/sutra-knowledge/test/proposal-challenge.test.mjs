import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityExample,casePin} from '../pinned-investigation.js';
import {createAlignedCapsule} from '../aligned-capsule.js';
import {challengeProposal,exportProposalChallenge} from '../proposal-challenge.js';
const wire=JSON.stringify;
const q=(f,e,claimedState)=>wire({caseDigest:f.pin,eventText:wire(e),claimedState});
test('opposite decisive branches reveal divergent evidence, shared prefix and no adoption',async()=>{
 const f=await capacityExample(),e=[f.reads.read_capacity,f.reads.read_alternate],p=[f.reads.read_capacity,f.reads.read_meter],text=wire(e),before=await createAlignedCapsule(f.caseText,f.pin,text);
 const x=await challengeProposal(f.caseText,f.pin,text,q(f,p,'REFUTED'));
 assert.deepEqual(x.claim,{claimedState:'REFUTED',recomputedState:'REFUTED',matches:true});
 assert.equal(x.comparison,'OPPOSITE_DECISIVE_STATES');assert.equal(x.baseline.state,'SUPPORTED');assert.equal(x.history.commonEventCount,1);assert.equal(x.history.commonPrefix.state,'UNDERDETERMINED');
 assert.deepEqual(x.worlds,{shared:[],baselineOnly:['load_10_cap_20'],proposalOnly:['load_30_cap_20']});
 assert.deepEqual(x.evidence.shared.map(r=>r.observationId),['read_capacity']);assert.deepEqual(x.evidence.baselineOnly.map(r=>r.observationId),['read_alternate']);assert.deepEqual(x.evidence.proposalOnly.map(r=>r.observationId),['read_meter']);
 assert.deepEqual(x.evidence.declaredRoots,{shared:['capacity_root'],baselineOnly:['alternate_root'],proposalOnly:['meter_root']});
 assert.equal((await createAlignedCapsule(f.caseText,f.pin,text)).expectedDigest,before.expectedDigest);
 assert.deepEqual((await exportProposalChallenge(f.caseText,f.pin,text,q(f,p,'REFUTED'))).result,x);
});
test('forged conclusion is marked incorrect; union of conflicting reads is not silently reconciled',async()=>{
 const f=await capacityExample(),text=wire([f.reads.read_alternate]);
 const x=await challengeProposal(f.caseText,f.pin,text,q(f,[f.reads.read_meter],'SUPPORTED'));
 assert.equal(x.claim.matches,false);assert.equal(x.claim.recomputedState,'UNDERDETERMINED');assert.equal(x.comparison,'DIFFERENT_STATES');
 const y=await challengeProposal(f.caseText,f.pin,text,q(f,[f.reads.read_alternate,f.reads.read_meter],'REFUTED'));
 assert.equal(y.claim.matches,false);assert.equal(y.proposal.state,'CONFLICTED');assert.equal(y.history.commonEventCount,1);assert.equal(y.history.commonPrefix.state,'SUPPORTED');assert.equal(y.proposal.frontier,null);
 assert.deepEqual(y.proposal.minimum.conflict,[{roots:['alternate_root','meter_root'],worlds:[]}]);
});
test('same final evidence is not a common history; key reordering only changes exact digest',async()=>{
 const f=await capacityExample(),a=[f.reads.read_capacity,f.reads.read_alternate],b=[f.reads.read_alternate,f.reads.read_capacity];
 const x=await challengeProposal(f.caseText,f.pin,wire(a),q(f,b,'SUPPORTED'));
 assert.equal(x.history.commonEventCount,0);assert.equal(x.history.commonPrefix.state,'UNDERDETERMINED');assert.equal(x.comparison,'SAME_STATE');assert.equal(x.evidence.shared.length,2);
 const reorder=a.map(e=>({sourceText:e.sourceText,observationId:e.observationId,type:e.type}));
 const y=await challengeProposal(f.caseText,f.pin,wire(a),q(f,reorder,'SUPPORTED'));
 assert.equal(y.history.commonEventCount,2);assert.notEqual(y.baseline.eventDigest,y.proposal.eventDigest);assert.equal(y.history.commonPrefix.state,'SUPPORTED');
});
test('withdrawal alters availability and requires explicit proposal; invalid histories refused',async()=>{
 const f=await capacityExample(),a=[f.reads.read_meter],p=[...a,{type:'withdraw_lineage',lineage:'meter_root'},f.reads.read_alternate];
 const x=await challengeProposal(f.caseText,f.pin,wire(a),q(f,p,'SUPPORTED'));
 assert.deepEqual(x.evidence.unavailableSources,{shared:[],baselineOnly:[],proposalOnly:['meter','mirror']});assert.equal(x.history.commonEventCount,1);assert.equal(x.evidence.baselineOnly[0].observationId,'read_meter');
 for(const invalid of [wire({caseDigest:'sha256:'+'0'.repeat(64),eventText:'[]',claimedState:'SUPPORTED'}),q(f,[f.reads.read_meter,f.reads.read_meter],'SUPPORTED'),q(f,[{...f.reads.read_meter,sourceText:'{}'}],'SUPPORTED'),q(f,[],'CERTAIN'),q(f,[{type:'restore_source',sourceId:'meter'}],'SUPPORTED')])await assert.rejects(challengeProposal(f.caseText,f.pin,wire(a),invalid));
});
