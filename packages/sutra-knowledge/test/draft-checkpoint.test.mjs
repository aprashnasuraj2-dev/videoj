import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {openDraftCheckpoint,exportDraftCheckpoint} from '../draft-checkpoint.js';
const draft=JSON.stringify({version:1,question:'Is A higher?',sources:[{id:'a',lineage:'root',text:'測定 🧪 12.5'}],bindings:[]});
test('exact Unicode editable bytes round trip without authority',async()=>{const x=await exportDraftCheckpoint(draft),y=await openDraftCheckpoint(x.draftText,x.draftPin);assert.equal(y.draftText,draft);assert.equal(y.decisionAuthority,'NONE');assert.deepEqual(y.summary.sourceIds,['a']);assert.ok(Object.isFrozen(y.draft.sources));});
test('tamper, noncanonical representation and non-browser question refuse',async()=>{const p=await casePin(draft);await assert.rejects(openDraftCheckpoint(draft+' ',p),/DRAFT_CHECKPOINT_PIN/);const spaced=draft+' ';await assert.rejects(openDraftCheckpoint(spaced,await casePin(spaced)),/DRAFT_CHECKPOINT_CANONICAL_DRAFT/);const bad=JSON.stringify({...JSON.parse(draft),question:'A\rB'});await assert.rejects(openDraftCheckpoint(bad,await casePin(bad)),/DRAFT_CHECKPOINT_BROWSER_PROFILE/);});

test('source newline normalization cannot shift browser selection offsets after restore',async()=>{const x=JSON.parse(draft);x.sources[0].text='A\r\n12.5';const text=JSON.stringify(x);await assert.rejects(openDraftCheckpoint(text,await casePin(text)),/DRAFT_CHECKPOINT_BROWSER_PROFILE/);});
