import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {livingFixture} from '../examples/living-investigation.mjs';
import {createInvestigationHistory,openInvestigationHistory} from '../investigation-history.js';
import {openLocalHistoryStore} from '../local-history-store.mjs';
import {restoreReviewedSourceDraft} from '../source-draft-restore.js';
import {exportWorkspaceCheckpoint,openWorkspaceCheckpoint} from '../workspace-checkpoint.js';
import {compilerFinanceFixture} from '../examples/reviewed-compiler.mjs';
import {prepareApprovedExpressionCouncil} from '../approved-expression-council.js';
import {createProviderWorkspace} from '../../sutra-inference/provider-workspace.js';
import {createDisclosureConsentInspector} from '../../sutra-consent/index.js';
const allowOnce=()=>createDisclosureConsentInspector({decide:async()=>({decision:'allow',scope:'once'})});
test('durable persisted history can restore a portable workspace without granting executable authority',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'sutra-combined-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const a=await livingFixture('finance'),b=await livingFixture('finance',{revised:true,previousDigest:a.digest}),history=await createInvestigationHistory(a.versionText,a.digest),root=history.snapshot();
 const next=await history.append({expectedHistoryPin:root.digest,branch:'main',expectedHead:a.digest,versionText:b.versionText,versionPin:b.digest});
 const store=await openLocalHistoryStore(dir);await store.initialize(root.historyText,root.digest);await store.append({expectedHead:root.digest,nextText:next.historyText,nextPin:next.digest});
 const loaded=await (await openLocalHistoryStore(dir)).read(next.digest),draft=await restoreReviewedSourceDraft(b.versionText,b.digest),draftText=JSON.stringify(draft.draft);
 const bundle=await exportWorkspaceCheckpoint({draftText,history:{text:loaded.historyText,pin:loaded.digest},baseline:{text:a.versionText,pin:a.digest}});
 const restored=await openWorkspaceCheckpoint(bundle.text,bundle.pin),recovered=await openInvestigationHistory(restored.history.text,restored.history.pin);
 assert.equal(restored.baseline.digest,a.digest);assert.equal(recovered.restore(b.digest).versionText,b.versionText);assert.equal(restored.draft.draftText,draftText);assert.equal(restored.decisionAuthority,'NONE');
 await assert.rejects(store.read(root.digest),/HISTORY_STORE_STALE_OR_ROLLED_BACK_HEAD/);
});
test('approval capability and credential publication fence compose without implicit fallback',async()=>{
 const f=await compilerFinanceFixture(),calls=[],limits={maxCalls:4,maxInputBytes:100000,maxOutputTokens:2048,maxConcurrent:2};let seed=1;
 const w=createProviderWorkspace({catalog:[{id:'a',label:'A',models:['a/model']},{id:'b',label:'B',models:['b/model']}],globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,transports:['a','b'].map(providerId=>({providerId,send:async r=>{calls.push(r.providerId);return {actualInputBytes:1,actualOutputTokens:1,value:{text:JSON.stringify({version:1,kind:'expression',expression:'[ocf26]>[ocf25]'})}};}}))});
 const a=w.addProfile({providerId:'a',label:'A',credential:'SYNTHETIC_COMBINED_A'}),b=w.addProfile({providerId:'b',label:'B',credential:'SYNTHETIC_COMBINED_B'}),common={contractText:f.contractText,contractPin:f.pin,disclosure:{bindingIds:['ocf25','ocf26'],includeValues:false},workspace:w,maxRounds:1};
 const route=(p,model)=>[{id:'reviewer',role:'Propose comparison',handle:p.handle,model,shareScope:'reviewed-question-bindings-and-conditional-feedback'}];
 const first=await prepareApprovedExpressionCouncil({...common,routes:route(a,'a/model')});w.removeProfile(a.handle);
 await assert.rejects(first.execute({consentInspector:allowOnce(),approvedPlanPin:first.planPin}),/ROUTE/);assert.deepEqual(calls,[]);
 const second=await prepareApprovedExpressionCouncil({...common,routes:route(b,'b/model')});await assert.rejects(second.execute({consentInspector:allowOnce(),approvedPlanPin:first.planPin}),/COUNCIL_APPROVAL_PIN/);
 const r=await second.execute({consentInspector:allowOnce(),approvedPlanPin:second.planPin});assert.deepEqual(calls,['b']);assert.equal(r.decisionAuthority,'NONE');assert.equal(r.semanticReview,'REQUIRED');assert.equal(r.contractDigest,f.pin);
});

test('unrelated credential-set mutation invalidates the captured approval without touching the approved route',async()=>{
 const f=await compilerFinanceFixture(),calls=[],limits={maxCalls:4,maxInputBytes:100000,maxOutputTokens:2048,maxConcurrent:2};let seed=1;
 const w=createProviderWorkspace({catalog:[{id:'a',label:'A',models:['a/model']},{id:'b',label:'B',models:['b/model']}],globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,transports:['a','b'].map(providerId=>({providerId,send:async r=>{calls.push(r.providerId);return {actualInputBytes:1,actualOutputTokens:1,value:{text:JSON.stringify({version:1,kind:'expression',expression:'[ocf26]>[ocf25]'})}};}}))});
 const a=w.addProfile({providerId:'a',label:'A',credential:'SYNTHETIC_COMBINED_A'}),b=w.addProfile({providerId:'b',label:'B',credential:'SYNTHETIC_COMBINED_B'});
 const common={contractText:f.contractText,contractPin:f.pin,disclosure:{bindingIds:['ocf25','ocf26'],includeValues:false},workspace:w,maxRounds:1,routes:[{id:'reviewer',role:'Propose comparison',handle:a.handle,model:'a/model',shareScope:'reviewed-question-bindings-and-conditional-feedback'}]};
 const stale=await prepareApprovedExpressionCouncil(common);w.removeProfile(b.handle);
 await assert.rejects(stale.execute({consentInspector:allowOnce(),approvedPlanPin:stale.planPin}),e=>e.code==='PROFILE_SET_CHANGED');assert.deepEqual(calls,[]);
 await assert.rejects(stale.execute({consentInspector:allowOnce(),approvedPlanPin:stale.planPin}),/CONSUMED/);
 const fresh=await prepareApprovedExpressionCouncil(common),result=await fresh.execute({consentInspector:allowOnce(),approvedPlanPin:fresh.planPin});
 assert.deepEqual(calls,['a']);assert.equal(result.decisionAuthority,'NONE');
});
