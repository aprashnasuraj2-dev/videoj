import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {livingFixture} from '../examples/living-investigation.mjs';
import {createInvestigationHistory} from '../investigation-history.js';
import {openWorkspaceCheckpoint,exportWorkspaceCheckpoint} from '../workspace-checkpoint.js';
const draftText=JSON.stringify({version:1,question:'Compare evidence',sources:[{id:'a',lineage:'root',text:'測定 12'}],bindings:[]});
test('exact editable draft, independently replayed history and historical baseline round trip',async()=>{
 const v=await livingFixture(),h=await createInvestigationHistory(v.versionText,v.digest),s=h.snapshot();
 const x=await exportWorkspaceCheckpoint({draftText,history:{text:s.historyText,pin:s.digest},baseline:{text:v.versionText,pin:v.digest}});
 const y=await openWorkspaceCheckpoint(x.text,x.pin);assert.equal(y.draft.draftText,draftText);assert.equal(y.summary.versions,1);assert.equal(y.baseline.digest,v.digest);assert.equal(y.summary.historyPin,s.digest);assert.equal(y.decisionAuthority,'NONE');
 assert.deepEqual(y,x);
 const q=JSON.parse(x.text);q.baseline.pin='sha256:'+'0'.repeat(64);const forged=JSON.stringify(q);await assert.rejects(openWorkspaceCheckpoint(forged,await casePin(forged)),/REVISION_PIN/);
 await assert.rejects(openWorkspaceCheckpoint(x.text+' ',x.pin),/WORKSPACE_CHECKPOINT_PIN/);
 q.baseline=null;q.executionApproved=true;const extra=JSON.stringify(q);await assert.rejects(openWorkspaceCheckpoint(extra,await casePin(extra)),/WORKSPACE_CHECKPOINT_SHAPE/);
});
test('draft-only state explicitly represents absent history and baseline',async()=>{const x=await exportWorkspaceCheckpoint({draftText});assert.equal(x.history,null);assert.equal(x.baseline,null);assert.equal(x.summary.versions,0);});
