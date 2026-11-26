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

import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('independent Python workspace replay reconstructs UTF-16 selections and rejects re-pinned malformed state',async()=>{
 const v=await livingFixture(),h=await createInvestigationHistory(v.versionText,v.digest),s=h.snapshot();
 const d=JSON.stringify({version:1,question:'測定?',sources:[{id:'a',lineage:'root',text:'😀 12 kg'}],bindings:[{id:'amount',sourceId:'a',start:3,end:5,type:{kind:'scalar',unit:'kg'}}]});
 // Use a known fixture type, not an invented compiler type.
 const source=JSON.parse(v.versionText),contract=JSON.parse(source.contractText);
 const template=contract.bindings[0].type;
 const draft=JSON.parse(d);draft.bindings[0].type=template;
 const validDraft=JSON.stringify(draft);
 const x=await exportWorkspaceCheckpoint({draftText:validDraft,history:{text:s.historyText,pin:s.digest},baseline:{text:v.versionText,pin:v.digest}});
 const only=await exportWorkspaceCheckpoint({draftText});
 const cases=[{text:x.text,pin:x.pin},{text:only.text,pin:only.pin},{text:x.text+' ',pin:x.pin}];
 async function mutated(edit,rebindDraft=false){const w=JSON.parse(x.text);await edit(w);if(rebindDraft)w.draft.pin=await casePin(w.draft.text);const text=JSON.stringify(w);return {text,pin:await casePin(text)};}
 cases.push(await mutated(w=>{w.history.pin='sha256:'+'0'.repeat(64);}));
 cases.push(await mutated(w=>{w.baseline.pin='sha256:'+'0'.repeat(64);}));
 cases.push(await mutated(w=>{w.executionApproved=true;}));
 cases.push(await mutated(w=>{const d=JSON.parse(w.draft.text);d.bindings[0].start=1;w.draft.text=JSON.stringify(d);},true));
 cases.push(await mutated(w=>{const d=JSON.parse(w.draft.text);d.sources[0].text+='\r';w.draft.text=JSON.stringify(d);},true));
 const ref=fileURLToPath(new URL('../reference/verify_workspace_checkpoint.py',import.meta.url));
 const out=JSON.parse(execFileSync('python3',[ref],{input:JSON.stringify(cases),encoding:'utf8'}));
 for(let i=0;i<cases.length;i++){if(i<2){assert.equal(out[i].status,'VERIFIED');assert.deepEqual(out[i].summary,(i===0?x:only).summary);assert.equal(out[i].decisionAuthority,'NONE');}else{assert.equal(out[i].status,'REFUSED');await assert.rejects(openWorkspaceCheckpoint(cases[i].text,cases[i].pin));}}
});
