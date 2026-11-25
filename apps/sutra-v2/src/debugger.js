import {debuggerBaseline,debuggerCopies,debuggerRead,DEBUGGER_VERSION} from '../../../packages/sutra-knowledge/conclusion-debugger.js';
import {evaluateDebuggerExplanation,EXPLANATION_VERSION} from '../../../packages/sutra-knowledge/debugger-explanation.js';
import {analyzeSupport} from './support-wasm.js';
import {guidedAction} from './demo-guide.mjs';
import {traceVerifiedDebuggerState,WORLD_TRACE_VERSION} from '../../../packages/sutra-knowledge/debugger-world-trace.js';
import {sensitivityVerifiedDebuggerState,ASSUMPTION_VERSION} from '../../../packages/sutra-knowledge/debugger-assumptions.js';
import {createProofCapsule,verifyProofCapsule,mutateCapsuleByte,MAX_CAPSULE_BYTES} from '../../../packages/sutra-knowledge/proof-capsule.js';
const by=id=>document.getElementById('debug-'+id),txt=(id,value)=>{by(id).textContent=value;};
const labels={target:'The system stays within its limit',control_ok:'The separate control is normal',sample_one:'Original report and copies',sample_two:'Independent-declared measurement',sample_three:'Second-variable measurement',sample_control:'Separate control measurement',read_b:'Read the disagreeing measurement',read_c:'Measure the second variable',read_a:'Read the original report',read_control:'Read the control'};
const display=id=>labels[id]??id;
const states={SUPPORTED:'Supported',REFUTED:'Refuted',CONFLICTED:'Conflicted',UNDERDETERMINED:'Underdetermined',UNVERIFIED:'Unverified'};
const expected={SUPPORTED:'satisfied',REFUTED:'refuted',CONFLICTED:'conflict',UNDERDETERMINED:'ambiguous'};
const ids=['start','withdraw','restore','copies','disagree','withdraw-other','observe','control','export','plan-observe','explanation-export','world-export','assumption-export','assumption-limit'];
let events=[],result=null,explanation=null,worldTrace=null,assumptionSensitivity=null,busy=false,capsuleBusy=false;
let capsuleOriginal=null,capsuleWorking=null,capsuleAnchor=null,capsuleIdentity=null,capsuleVerified=false,capsuleTampered=false;
let capsuleSourceHistory=null,capsulePinRequested=false,capsuleChallenge='none',capsuleFailureReason=null;
const has=id=>result?.report.activeEvidence.some(a=>a.observationId===id);
const unavailable=id=>result?.unavailableSources.includes(id);
function refresh(){
 for(const id of ids)by(id).disabled=busy||capsuleBusy||id!=='start'&&!result;
 refreshCapsule();
 if(busy||capsuleBusy||!result){refreshGuide();return;}
 const room=events.length<24;
 by('withdraw').disabled=!room||!has('read_a');
 by('restore').disabled=events.length>22||!unavailable('lab_a');
 by('copies').disabled=!room||!has('read_a')||result.groups.sample_one?.length!==1;
 by('disagree').disabled=!room||has('read_b')||unavailable('lab_b');
 by('withdraw-other').disabled=!room||!has('read_b');
 by('observe').disabled=!room||has('read_c')||unavailable('lab_c');
 by('control').disabled=!room||!has('read_control');
 by('plan-observe').disabled=!room||explanation?.next.kind!=='observe';
 refreshGuide();
}
function render(previous){
 document.querySelector('.debugger').dataset.ready='true';
 const r=result,target=r.claims.target,other=r.claims.control_ok;
 by('state').dataset.state=target.state;txt('state',states[target.state]);
 txt('worlds',String(target.survivingWorlds.length));
 txt('artifacts',String(r.activeArtifacts.length));txt('roots',String(r.declaredRoots));
 const changed=previous?Object.keys(r.claims).filter(k=>previous.claims[k].state!==r.claims[k].state):[];
 const stayed=previous?Object.keys(r.claims).filter(k=>previous.claims[k].state===r.claims[k].state):[];
 txt('change',previous?'Changed: '+(changed.map(display).join('; ')||'none')+'. Unchanged: '+(stayed.map(display).join('; ')||'none')+'.':'Baseline: original report plus separate control.');
 txt('control-state',states[other.state]);
 txt('survivors',target.survivingWorlds.length?target.survivingWorlds.map(id=>'a='+id[1]+', b='+id[2]+', control='+id[3]).join(' · '):'No declared world fits every admitted observation.');
 const cuts=r.diagnostics.minimumCuts;
 txt('why',target.state==='CONFLICTED'?'Two admitted measurements disagree. Copies cannot outvote a contradiction.':target.state==='UNDERDETERMINED'?'Surviving worlds disagree; evidence cannot decide the claim.':target.state==='SUPPORTED'?'Every surviving world satisfies the declared limit.':'Every surviving world violates the declared limit.');
 txt('cuts',cuts.length?cuts.map(c=>c.removed.map(display).join(' + ')+' → '+states[c.claims.target.state]).join('\n'):'No minimum change is claimed for this state.');
 renderExplanation(explanation);
 renderWorldTrace(previous);
 renderAssumptions();
 by('groups').replaceChildren();
 for(const [root,artifacts] of Object.entries(r.groups)){
  const li=document.createElement('li'),heading=document.createElement('strong'),detail=document.createElement('span');
  heading.textContent=display(root);detail.textContent=artifacts.length+' artifact'+(artifacts.length===1?'':'s')+' → 1 declared root';li.append(heading,detail);by('groups').append(li);
 }
 txt('details',JSON.stringify({caseDigest:r.caseDigest,historyDigest:r.historyDigest,artifacts:r.activeArtifacts,conflict:r.conflict,diagnostics:r.diagnostics,qualification:r.qualification},null,2));
}
function renderAssumptions(){
 const report=assumptionSensitivity,selected=report.variants.find(v=>v.limit===by('assumption-limit').value);
 if(!selected)throw Error('ASSUMPTION_SELECTION');
 const label=x=>({'0/1':'0','1/2':'½','1/1':'1','3/2':'1½','2/1':'2'})[x];
 const original=report.variants[2];
 txt('assumption-original',states[original.targetState]);by('assumption-original').dataset.state=original.targetState;
 txt('assumption-rule','Test rule: a + b ≤ '+label(selected.limit));
 txt('assumption-state',states[selected.targetState]);by('assumption-state').dataset.state=selected.targetState;
 const b=report.boundaries;
 txt('assumption-boundaries',b?'Surviving sum range: '+label(b.minSum)+' to '+label(b.maxSum)+'. Refuted below '+label(b.minSum)+'; supported at or above '+label(b.maxSum)+(b.minSum===b.maxSum?'. No mixed interval.':'; underdetermined at or above '+label(b.minSum)+' and below '+label(b.maxSum)+'.'):'No surviving world: changing this rule alone cannot resolve the evidence contradiction.');
 txt('assumption-change',selected.changedSurvivingWorlds.length+' surviving world outcome'+(selected.changedSurvivingWorlds.length===1?' changes':'s change')+'. '+selected.survivingWorlds.length+(selected.survivingWorlds.length===1?' world remains; separate control: ':' worlds remain; separate control: ')+states[selected.controlState]+'.');
 const m=report.minimumSampledChange;
 txt('assumption-minimum',m?'Smallest tested limit change that alters the conclusion state: '+(m.halfUnits/2)+'; alternative limit'+(m.limits.length===1?' ':'s ')+m.limits.map(label).join(' or ')+'. Tested limits only.':'None of the five tested limits changes the conclusion state.');
}
function renderWorldTrace(previous){
 const host=by('world-map');host.replaceChildren();
 const prior=new Set(previous?.claims.target.survivingWorlds??[]),current=new Set(result.claims.target.survivingWorlds);
 const returned=[...current].filter(id=>!prior.has(id)),excluded=[...prior].filter(id=>!current.has(id));
 txt('world-delta',previous?current.size+' / 8 survive · '+returned.length+' returned · '+excluded.length+' newly excluded.':current.size+' / 8 survive under the admitted observations.');
 const value=x=>x.replace('/1','');
 for(const w of worldTrace.worlds){
  const row=document.createElement('tr');row.dataset.world=w.id;row.dataset.survives=String(w.survives);row.dataset.decision=w.decisions.target;
  if(previous)row.dataset.change=returned.includes(w.id)?'returned':excluded.includes(w.id)?'excluded':'unchanged';
  const hyp=document.createElement('th');hyp.scope='row';const name=document.createElement('strong'),assignment=document.createElement('small');
  name.textContent=w.id;assignment.textContent='a='+value(w.assumptions.a)+' · b='+value(w.assumptions.b)+' · c='+value(w.assumptions.c);hyp.append(name,assignment);
  const rule=document.createElement('td');rule.textContent=w.decisions.target==='constraint_satisfied'?'Within limit':'Exceeds limit';
  const fit=document.createElement('td'),status=document.createElement('strong');status.textContent=w.survives?'Survives':w.blockingRoots.length+' blocking root'+(w.blockingRoots.length===1?'':'s');fit.append(status);
  if(w.survives){const ok=document.createElement('small');ok.textContent='All active readings agree';fit.append(ok);}
  else for(const check of w.checks.filter(c=>!c.compatible)){
   const line=document.createElement('small');line.dataset.observation=check.observationId;line.dataset.lineage=check.lineage;line.textContent=display(check.lineage)+': '+check.variable+'='+value(check.observedValue)+' (world '+value(check.expectedValue)+')';fit.append(line);
  }
  row.append(hyp,rule,fit);host.append(row);
 }
}
function renderExplanation(diagnosis){
 const host=by('conditional-claims');host.replaceChildren();
 const list=items=>items.length?items.map(x=>x.roots.map(display).join(' + ')||'Declared model alone').join('; '):'None';
 for(const [id,claim] of Object.entries(diagnosis.claims)){
  const section=document.createElement('div'),heading=document.createElement('strong'),global=document.createElement('p'),support=document.createElement('p'),refute=document.createElement('p');
  heading.textContent=display(id);global.textContent='Global state: '+states[claim.globalState];
  support.textContent='Conditional support: '+list(claim.conditionalSupport);
  refute.textContent='Conditional refutation: '+list(claim.conditionalRefutation);
  section.dataset.claim=id;section.append(heading,global,support,refute);host.append(section);
 }
 const next=diagnosis.next,branches=by('plan-branches');branches.replaceChildren();
 by('next').dataset.kind=next.kind;
 if(next.kind==='observe'){
  txt('next',display(next.observationId)+' · '+next.cost+' effort now · best-case '+next.bestCost+' · worst-case '+next.worstCost);
  txt('plan-observe',display(next.observationId)+' (recommended fixture read)');
  for(const b of next.branches){
   const p=document.createElement('p'),v=b.outcome==='value_0'?'0':b.outcome==='value_1'?'1':b.outcome;
   p.textContent='If observed value = '+v+': '+(b.kind==='decision'?(b.decision==='constraint_satisfied'?'Supported':'Refuted'):display(b.observationId)+' next; remaining worst-case effort '+b.worstRemainingCost)+' ('+b.worlds.length+' worlds).';
   branches.append(p);
  }
 }else{
  txt('plan-observe','Run recommended fixture observation');
  if(next.kind==='adjudicate_conflict'){
   txt('next','Investigate the contradiction first. Neither conflicting root has automatic priority. The repairs below are counterfactual, not permission to discard evidence.');
   for(const repair of next.minimumRepairs){
    const p=document.createElement('p');p.textContent='If withdrawn: '+repair.remove.map(display).join(' + ')+' → '+Object.entries(repair.states).map(([id,state])=>display(id)+': '+states[state]).join('; ');branches.append(p);
   }
  }else if(next.kind==='impossible_with_available_observations'){
   txt('next','No available observation plan can decide this conclusion. These worlds have opposite outcomes but identical results for every remaining offered observation: '+next.witness.join(' and ')+'. Restore admissible evidence or expand the declared model explicitly.');
  }else if(next.kind==='decision')txt('next','No additional observation is required for this decision within the declared finite model.');
  else txt('next','No verified decisive observation plan is available.');
 }
}
async function work(make,resetGuide=false){
 if(busy||capsuleBusy)return;busy=true;refresh();txt('notice','Recomputing from admitted evidence…');
 try{
  const next=await make(),{result:computed,explanation:diagnosis}=await evaluateDebuggerExplanation(JSON.stringify(next));
  const support=await analyzeSupport(computed.projection);
  if(!support.complete||support.current!==expected[computed.claims.target.state]||JSON.stringify(support.survivingWorlds)!==JSON.stringify(computed.claims.target.survivingWorlds)||computed.conflict&&!support.conflicts.some(x=>JSON.stringify(x)===JSON.stringify(computed.conflict)))throw Error('DEBUGGER_SUPPORT_DISAGREEMENT');
  const trace=traceVerifiedDebuggerState(computed),sensitivity=await sensitivityVerifiedDebuggerState(computed);
  const previous=result;events=next;result=computed;explanation=diagnosis;worldTrace=trace;assumptionSensitivity=sensitivity;
  if(resetGuide){capsuleSourceHistory=null;capsulePinRequested=false;capsuleChallenge='none';by('assumption-limit').value='1/1';}
  render(previous);txt('notice','Recomputed locally · exact graph and Rust support engine agree.');
 }catch{txt('notice','Operation refused. The last verified-in-session result is unchanged.');}
 finally{busy=false;refresh();}
}
const add=(...e)=>[...events,...e];
by('start').onclick=()=>work(debuggerBaseline,true);
by('withdraw').onclick=()=>work(()=>add({type:'withdraw_lineage',lineage:'sample_one'}));
by('restore').onclick=()=>work(async()=>add({type:'restore_lineage',lineage:'sample_one'},await debuggerRead('read_a')));
by('copies').onclick=()=>work(async()=>add(await debuggerCopies()));
by('disagree').onclick=()=>work(async()=>add(await debuggerRead('read_b')));
by('withdraw-other').onclick=()=>work(()=>add({type:'withdraw_lineage',lineage:'sample_two'}));
by('observe').onclick=()=>work(async()=>add(await debuggerRead('read_c')));
by('plan-observe').onclick=()=>work(async()=>{
 if(explanation?.next.kind!=='observe')throw Error('NO_PLAN');
 return add(await debuggerRead(explanation.next.observationId));
});
by('assumption-limit').onchange=()=>{if(result&&!busy&&!capsuleBusy)renderAssumptions();};
by('assumption-export').onclick=()=>{
 if(!result||!assumptionSensitivity||busy||capsuleBusy)return;
 downloadBytes(JSON.stringify({version:ASSUMPTION_VERSION,events,sensitivity:assumptionSensitivity},null,2),'sutra-assumption-sensitivity.json','application/json');
};
by('world-export').onclick=()=>{
 if(!result||!worldTrace||busy||capsuleBusy)return;
 downloadBytes(JSON.stringify({version:WORLD_TRACE_VERSION,events,trace:worldTrace},null,2),'sutra-world-trace.json','application/json');
};
by('explanation-export').onclick=()=>{
 if(!result||!explanation||busy||capsuleBusy)return;
 downloadBytes(JSON.stringify({version:EXPLANATION_VERSION,events,explanation},null,2),'sutra-conditional-diagnosis.json','application/json');
};
by('control').onclick=()=>work(()=>add({type:'withdraw_lineage',lineage:'sample_control'}));
by('export').onclick=()=>{
 if(!result||busy||capsuleBusy)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify({version:DEBUGGER_VERSION,events,result},null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='sutra-debugger-state.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

function currentGuide(){
 return guidedAction(events,result,{historyDigest:capsuleSourceHistory,hasBytes:Boolean(capsuleWorking),hasPin:Boolean(capsuleAnchor),pinRequested:capsulePinRequested,verified:capsuleVerified,tampered:capsuleTampered,challenge:capsuleChallenge});
}
function refreshGuide(){
 const route=currentGuide(),button=by('guide-next');
 by('guide-stage').textContent=route.mode==='complete'?'GUIDED CHALLENGE · COMPLETE':route.mode==='explore'?'EXPLORATION MODE':'GUIDED CHALLENGE · '+route.step+' / '+route.total;
 button.dataset.mode=route.mode;button.dataset.action=route.action??'complete';button.textContent=route.title;
 button.disabled=busy||capsuleBusy||!route.action||Boolean(by(route.action)?.disabled);
 txt('guide-detail',route.detail);
 const summary=by('guide-summary');summary.hidden=!result;
 if(result){
  const copies=result.groups.sample_one?.length??0;
  const control=result.claims.control_ok.state;
  summary.textContent=(copies>1?copies+' original-lineage artifacts = 1 declared root. ':'')+(control==='CONFLICTED'&&explanation.claims.control_ok.conditionalSupport.length?'Separate control has conditional support; the full model is conflicted.':'Separate control: '+states[control]+'.');
 }
 const proof=by('guide-proof');proof.hidden=!result||capsuleSourceHistory!==result.historyDigest;
 if(!proof.hidden)proof.textContent=capsuleChallenge==='restored'&&capsuleVerified?'Proof: one-byte attack refused; exact original reverified.':capsuleChallenge==='rejected'?'Proof: altered bytes refused against the unchanged digest.':capsuleVerified?'Proof: exact snapshot replay verified locally.':'Proof snapshot prepared; browser save outcome is not confirmed.';
}
by('guide-next').onclick=()=>{
 if(busy||capsuleBusy)return;
 const route=currentGuide();if(!route.action)return;
 const button=by(route.action);if(button&&!button.disabled)button.click();
};
function capsuleStatus(state,message){
 by('capsule-status').dataset.state=state;txt('capsule-status',message);
}
function refreshCapsule(){
 const locked=busy||capsuleBusy,hasFile=Boolean(by('capsule-file').files?.length);
 by('capsule-export').disabled=locked||!result;
 by('capsule-download').disabled=locked||!capsuleOriginal;
 by('capsule-pin-export').disabled=locked||!capsuleAnchor;
 by('capsule-file').disabled=locked;by('capsule-pin').disabled=locked;
 by('capsule-verify').disabled=locked||!hasFile&&!capsuleWorking;
 by('capsule-tamper').disabled=locked||!capsuleVerified||!capsuleOriginal||capsuleTampered;
 by('capsule-restore').disabled=locked||!capsuleTampered||!capsuleOriginal;
 const context=capsuleIdentity?(result?(result.historyDigest===capsuleIdentity?'Snapshot matches the current conclusion history.':'Historical snapshot — current conclusion history changed.'):'No current conclusion loaded; snapshot only.'):'No verified snapshot identity.';
 txt('capsule-context',context+' No signer, external truth, or freshness is established.');
}
function downloadBytes(bytes,name,type){
 const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function capsuleWork(make){
 if(busy||capsuleBusy)return;
 capsuleBusy=true;refresh();
 try{await make();}
 catch{capsuleVerified=false;capsuleIdentity=null;capsuleStatus('refused','REFUSED: capsule operation failed. No current conclusion changed.');}
 finally{capsuleBusy=false;refresh();}
}
async function checkCapsule(bytes,pin){
 const checked=await verifyProofCapsule(bytes,pin);
 capsuleVerified=checked.status==='VERIFIED';capsuleFailureReason=checked.reason??null;
 if(!capsuleVerified){capsuleIdentity=null;capsuleStatus('refused','REFUSED: '+checked.reason);return false;}
 capsuleIdentity=checked.historyDigest;
 capsuleStatus('verified','VERIFIED: exact snapshot and model replay — '+states[checked.result.claims.target.state]+'.');
 return true;
}
by('capsule-export').onclick=()=>capsuleWork(async()=>{
 if(!result)return;
 const cap=await createProofCapsule(JSON.stringify(events));
 if(cap.historyDigest!==result.historyDigest)throw Error('CAPSULE_HISTORY_MISMATCH');
 capsuleOriginal=Uint8Array.from(cap.bytes);capsuleWorking=Uint8Array.from(cap.bytes);
 capsuleAnchor=cap.expectedDigest;capsuleIdentity=null;capsuleVerified=false;capsuleTampered=false;
 capsuleSourceHistory=cap.historyDigest;capsulePinRequested=false;capsuleChallenge='none';capsuleFailureReason=null;
 by('capsule-file').value='';by('capsule-pin').value=cap.expectedDigest;
 capsuleStatus('ready','Prepared exact snapshot; download requested, browser save outcome not confirmed. Retain the digest separately, then verify.');
 downloadBytes(cap.bytes,'sutra-proof-capsule.json','application/json');
});
by('capsule-download').onclick=()=>{
 if(capsuleBusy||busy||!capsuleOriginal)return;
 downloadBytes(capsuleOriginal,'sutra-proof-capsule.json','application/json');
};
by('capsule-pin-export').onclick=()=>{
 if(capsuleBusy||busy||!capsuleAnchor)return;
 downloadBytes(capsuleAnchor+'\n','sutra-proof-capsule.sha256','text/plain');
 capsulePinRequested=true;refresh();
};
by('capsule-file').onchange=()=>{
 capsuleOriginal=null;capsuleWorking=null;capsuleAnchor=null;capsuleIdentity=null;capsuleVerified=false;capsuleTampered=false;
 capsuleSourceHistory=null;capsulePinRequested=false;capsuleChallenge='none';capsuleFailureReason=null;
 capsuleStatus('ready','Imported file selected. Supply the separately retained digest and verify.');refresh();
};
by('capsule-pin').oninput=()=>{
 capsuleVerified=false;capsuleIdentity=null;capsuleAnchor=null;capsulePinRequested=false;capsuleChallenge='none';capsuleFailureReason=null;
 capsuleStatus('ready','Expected digest changed. Verification required.');refresh();
};
by('capsule-verify').onclick=()=>capsuleWork(async()=>{
 const file=by('capsule-file').files?.[0],pin=by('capsule-pin').value.trim();
 if(file&&(file.size<1||file.size>MAX_CAPSULE_BYTES)){capsuleVerified=false;capsuleIdentity=null;capsuleStatus('refused','REFUSED: SIZE_OR_TYPE');return;}
 const bytes=file?new Uint8Array(await file.arrayBuffer()):capsuleWorking;
 if(!bytes)throw Error('CAPSULE_MISSING');
 if(await checkCapsule(bytes,pin)){
  capsuleOriginal=Uint8Array.from(bytes);capsuleWorking=Uint8Array.from(bytes);capsuleTampered=false;
  by('capsule-file').value='';capsuleAnchor=pin;capsuleSourceHistory=capsuleIdentity;
 }
});
by('capsule-tamper').onclick=()=>capsuleWork(async()=>{
 if(!capsuleVerified||!capsuleOriginal)return;
 capsuleWorking=mutateCapsuleByte(capsuleOriginal);capsuleTampered=true;capsuleChallenge='none';
 if(await checkCapsule(capsuleWorking,by('capsule-pin').value.trim())||capsuleFailureReason!=='PIN_MISMATCH')throw Error('CAPSULE_ATTACK_NOT_REFUSED');
 capsuleChallenge='rejected';
});
by('capsule-restore').onclick=()=>capsuleWork(async()=>{
 if(!capsuleOriginal)return;
 capsuleWorking=Uint8Array.from(capsuleOriginal);capsuleTampered=false;
 const prior=capsuleChallenge;capsuleChallenge='none';
 if(await checkCapsule(capsuleWorking,by('capsule-pin').value.trim())&&prior==='rejected')capsuleChallenge='restored';
});

refresh();
