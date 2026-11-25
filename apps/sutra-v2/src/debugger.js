import {debuggerBaseline,debuggerCopies,debuggerRead,DEBUGGER_VERSION} from '../../../packages/sutra-knowledge/conclusion-debugger.js';
import {evaluateDebuggerExplanation,EXPLANATION_VERSION} from '../../../packages/sutra-knowledge/debugger-explanation.js';
import {analyzeSupport} from './support-wasm.js';
import {createProofCapsule,verifyProofCapsule,mutateCapsuleByte,MAX_CAPSULE_BYTES} from '../../../packages/sutra-knowledge/proof-capsule.js';
const by=id=>document.getElementById('debug-'+id),txt=(id,value)=>{by(id).textContent=value;};
const labels={target:'The system stays within its limit',control_ok:'The separate control is normal',sample_one:'Original report and copies',sample_two:'Independent-declared measurement',sample_three:'Second-variable measurement',sample_control:'Separate control measurement',read_b:'Read the disagreeing measurement',read_c:'Measure the second variable',read_a:'Read the original report',read_control:'Read the control'};
const display=id=>labels[id]??id;
const states={SUPPORTED:'Supported',REFUTED:'Refuted',CONFLICTED:'Conflicted',UNDERDETERMINED:'Underdetermined',UNVERIFIED:'Unverified'};
const expected={SUPPORTED:'satisfied',REFUTED:'refuted',CONFLICTED:'conflict',UNDERDETERMINED:'ambiguous'};
const ids=['start','withdraw','restore','copies','disagree','withdraw-other','observe','control','export','plan-observe','explanation-export'];
let events=[],result=null,explanation=null,busy=false,capsuleBusy=false;
let capsuleOriginal=null,capsuleWorking=null,capsuleAnchor=null,capsuleIdentity=null,capsuleVerified=false,capsuleTampered=false;
const has=id=>result?.report.activeEvidence.some(a=>a.observationId===id);
const unavailable=id=>result?.unavailableSources.includes(id);
function refresh(){
 for(const id of ids)by(id).disabled=busy||capsuleBusy||id!=='start'&&!result;
 refreshCapsule();
 if(busy||capsuleBusy||!result)return;
 const room=events.length<24;
 by('withdraw').disabled=!room||!has('read_a');
 by('restore').disabled=events.length>22||!unavailable('lab_a');
 by('copies').disabled=!room||!has('read_a')||result.groups.sample_one?.length!==1;
 by('disagree').disabled=!room||has('read_b')||unavailable('lab_b');
 by('withdraw-other').disabled=!room||!has('read_b');
 by('observe').disabled=!room||has('read_c')||unavailable('lab_c');
 by('control').disabled=!room||!has('read_control');
 by('plan-observe').disabled=!room||explanation?.next.kind!=='observe';
}
function render(previous){
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
 txt('why',target.state==='CONFLICTED'?'The active observations disagree: '+r.conflict.map(display).join(' + ')+'. Copies cannot outvote a contradiction.':target.state==='UNDERDETERMINED'?'Remaining worlds disagree on the conclusion. Evidence does not justify choosing one.':target.state==='SUPPORTED'?'Every surviving declared world satisfies the limit.':'Every surviving declared world violates the limit.');
 txt('cuts',cuts.length?cuts.map(c=>c.removed.map(display).join(' + ')+' → '+states[c.claims.target.state]).join('\n'):'No minimum change is claimed for this state.');
 renderExplanation(explanation);
 by('groups').replaceChildren();
 for(const [root,artifacts] of Object.entries(r.groups)){
  const li=document.createElement('li'),heading=document.createElement('strong'),detail=document.createElement('span');
  heading.textContent=display(root);detail.textContent=artifacts.length+' artifact'+(artifacts.length===1?'':'s')+' → 1 declared root';li.append(heading,detail);by('groups').append(li);
 }
 txt('details',JSON.stringify({caseDigest:r.caseDigest,historyDigest:r.historyDigest,artifacts:r.activeArtifacts,conflict:r.conflict,diagnostics:r.diagnostics,qualification:r.qualification},null,2));
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
async function work(make){
 if(busy||capsuleBusy)return;busy=true;refresh();txt('notice','Recomputing from admitted evidence…');
 try{
  const next=await make(),{result:computed,explanation:diagnosis}=await evaluateDebuggerExplanation(JSON.stringify(next));
  const support=await analyzeSupport(computed.projection);
  if(!support.complete||support.current!==expected[computed.claims.target.state]||JSON.stringify(support.survivingWorlds)!==JSON.stringify(computed.claims.target.survivingWorlds)||computed.conflict&&!support.conflicts.some(x=>JSON.stringify(x)===JSON.stringify(computed.conflict)))throw Error('DEBUGGER_SUPPORT_DISAGREEMENT');
  const previous=result;events=next;result=computed;explanation=diagnosis;render(previous);txt('notice','Recomputed locally · exact graph and Rust support engine agree.');
 }catch{txt('notice','Operation refused. The last verified-in-session result is unchanged.');}
 finally{busy=false;refresh();}
}
const add=(...e)=>[...events,...e];
by('start').onclick=()=>work(debuggerBaseline);
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

function capsuleStatus(state,message){
 by('capsule-status').dataset.state=state;txt('capsule-status',message);
}
function refreshCapsule(){
 const locked=busy||capsuleBusy,hasFile=Boolean(by('capsule-file').files?.length);
 by('capsule-export').disabled=locked||!result;
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
 capsuleVerified=checked.status==='VERIFIED';
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
 by('capsule-file').value='';by('capsule-pin').value=cap.expectedDigest;
 capsuleStatus('ready','Exported exact snapshot. Retain the digest separately, then verify.');
 downloadBytes(cap.bytes,'sutra-proof-capsule.json','application/json');
});
by('capsule-pin-export').onclick=()=>{
 if(capsuleBusy||busy||!capsuleAnchor)return;
 downloadBytes(capsuleAnchor+'\n','sutra-proof-capsule.sha256','text/plain');
};
by('capsule-file').onchange=()=>{
 capsuleOriginal=null;capsuleWorking=null;capsuleAnchor=null;capsuleIdentity=null;capsuleVerified=false;capsuleTampered=false;
 capsuleStatus('ready','Imported file selected. Supply the separately retained digest and verify.');refresh();
};
by('capsule-pin').oninput=()=>{
 capsuleVerified=false;capsuleIdentity=null;capsuleAnchor=null;
 capsuleStatus('ready','Expected digest changed. Verification required.');refresh();
};
by('capsule-verify').onclick=()=>capsuleWork(async()=>{
 const file=by('capsule-file').files?.[0],pin=by('capsule-pin').value.trim();
 if(file&&(file.size<1||file.size>MAX_CAPSULE_BYTES)){capsuleVerified=false;capsuleIdentity=null;capsuleStatus('refused','REFUSED: SIZE_OR_TYPE');return;}
 const bytes=file?new Uint8Array(await file.arrayBuffer()):capsuleWorking;
 if(!bytes)throw Error('CAPSULE_MISSING');
 if(await checkCapsule(bytes,pin)){
  capsuleOriginal=Uint8Array.from(bytes);capsuleWorking=Uint8Array.from(bytes);capsuleTampered=false;
  by('capsule-file').value='';capsuleAnchor=pin;
 }
});
by('capsule-tamper').onclick=()=>capsuleWork(async()=>{
 if(!capsuleVerified||!capsuleOriginal)return;
 capsuleWorking=mutateCapsuleByte(capsuleOriginal);capsuleTampered=true;
 await checkCapsule(capsuleWorking,by('capsule-pin').value.trim());
});
by('capsule-restore').onclick=()=>capsuleWork(async()=>{
 if(!capsuleOriginal)return;
 capsuleWorking=Uint8Array.from(capsuleOriginal);capsuleTampered=false;
 await checkCapsule(capsuleWorking,by('capsule-pin').value.trim());
});

refresh();
