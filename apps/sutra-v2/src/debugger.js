import {debuggerBaseline,debuggerCopies,debuggerRead,evaluateConclusionDebugger,DEBUGGER_VERSION} from '../../../packages/sutra-knowledge/conclusion-debugger.js';
import {analyzeSupport} from './support-wasm.js';
const by=id=>document.getElementById('debug-'+id),txt=(id,value)=>{by(id).textContent=value;};
const labels={target:'The system stays within its limit',control_ok:'The separate control is normal',sample_one:'Original report and copies',sample_two:'Independent-declared measurement',sample_three:'Second-variable measurement',sample_control:'Separate control measurement',read_b:'Read the disagreeing measurement',read_c:'Measure the second variable',read_a:'Read the original report',read_control:'Read the control'};
const display=id=>labels[id]??id;
const states={SUPPORTED:'Supported',REFUTED:'Refuted',CONFLICTED:'Conflicted',UNDERDETERMINED:'Underdetermined',UNVERIFIED:'Unverified'};
const expected={SUPPORTED:'satisfied',REFUTED:'refuted',CONFLICTED:'conflict',UNDERDETERMINED:'ambiguous'};
const ids=['start','withdraw','restore','copies','disagree','withdraw-other','observe','control','export'];
let events=[],result=null,busy=false;
const has=id=>result?.report.activeEvidence.some(a=>a.observationId===id);
const unavailable=id=>result?.unavailableSources.includes(id);
function refresh(){
 for(const id of ids)by(id).disabled=busy||id!=='start'&&!result;
 if(busy||!result)return;
 const room=events.length<24;
 by('withdraw').disabled=!room||!has('read_a');
 by('restore').disabled=events.length>22||!unavailable('lab_a');
 by('copies').disabled=!room||!has('read_a')||result.groups.sample_one?.length!==1;
 by('disagree').disabled=!room||has('read_b')||unavailable('lab_b');
 by('withdraw-other').disabled=!room||!has('read_b');
 by('observe').disabled=!room||has('read_c')||unavailable('lab_c');
 by('control').disabled=!room||!has('read_control');
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
 txt('next',r.nextObservation?display(r.nextObservation.id)+' · '+r.nextObservation.cost+' effort now · worst-case '+r.nextObservation.worstCost:target.state==='CONFLICTED'?'Investigate the contradiction first. The alternatives below are hypothetical withdrawals, not authorization to discard evidence.':'No additional observation required for the current finite-model decision.');
 by('groups').replaceChildren();
 for(const [root,artifacts] of Object.entries(r.groups)){
  const li=document.createElement('li'),heading=document.createElement('strong'),detail=document.createElement('span');
  heading.textContent=display(root);detail.textContent=artifacts.length+' artifact'+(artifacts.length===1?'':'s')+' → 1 declared root';li.append(heading,detail);by('groups').append(li);
 }
 txt('details',JSON.stringify({caseDigest:r.caseDigest,historyDigest:r.historyDigest,artifacts:r.activeArtifacts,conflict:r.conflict,diagnostics:r.diagnostics,qualification:r.qualification},null,2));
}
async function work(make){
 if(busy)return;busy=true;refresh();txt('notice','Recomputing from admitted evidence…');
 try{
  const next=await make(),computed=await evaluateConclusionDebugger(JSON.stringify(next));
  const support=await analyzeSupport(computed.projection);
  if(!support.complete||support.current!==expected[computed.claims.target.state]||JSON.stringify(support.survivingWorlds)!==JSON.stringify(computed.claims.target.survivingWorlds)||computed.conflict&&!support.conflicts.some(x=>JSON.stringify(x)===JSON.stringify(computed.conflict)))throw Error('DEBUGGER_SUPPORT_DISAGREEMENT');
  const previous=result;events=next;result=computed;render(previous);txt('notice','Recomputed locally · exact graph and Rust support engine agree.');
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
by('control').onclick=()=>work(()=>add({type:'withdraw_lineage',lineage:'sample_control'}));
by('export').onclick=()=>{
 if(!result||busy)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify({version:DEBUGGER_VERSION,events,result},null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='sutra-debugger-state.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
refresh();
