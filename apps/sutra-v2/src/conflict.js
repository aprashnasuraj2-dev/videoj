import {evaluateEvidenceSession} from '../../../packages/sutra-knowledge/evidence-session.js';
import {conflictFixture} from '../../../packages/sutra-knowledge/examples/conflict.mjs';
const by=id=>document.getElementById(id),txt=(id,v)=>{by(id).textContent=v;};
const entries=[['a','read_a','lab_a'],['copy','read_copy','lab_copy'],['b','read_b','lab_b'],['c','read_c','lab_c']];
let fixture=null,events=[],result=null,busy=false;
function refresh(){
 by('conflict-start').disabled=busy;
 for(const [button,id,source] of entries)by('conflict-'+button).disabled=busy||!result||result.activeEvidence.some(r=>r.observationId===id)||result.unavailableSources.includes(source);
 by('conflict-withdraw').disabled=busy||!result||result.unavailableSources.includes('lab_a');
 by('conflict-restore').disabled=busy||!result||!result.unavailableSources.includes('lab_a');
 by('conflict-export').disabled=busy||!result;
}
function render(){
 const r=result;
 txt('conflict-worlds',String(r.survivingWorlds.length));txt('conflict-reads',String(r.activeEvidence.length));
 const plan=r.frontier?.plan;
 txt('conflict-next',r.conflict?'Inspect contradiction':plan?.kind==='observe'?plan.observationId:plan?.kind==='decision'?plan.decision:'No decisive plan');
 txt('conflict-status',r.conflict?'No declared world fits all active observations. Minimum conflicting set: '+r.conflict.join(' + ')+'.':r.status==='invariant_decision'?'Conditional decision: '+plan.decision+'.':r.status==='conditional_observation_plan'?'Current evidence permits '+r.survivingWorlds.length+' worlds; next decisive observation: '+plan.observationId+'.':'Unresolved: '+r.status+'.');
 by('conflict-status').dataset.state=r.status;
 txt('conflict-detail','Surviving: '+(r.survivingWorlds.join(', ')||'none')+'\nDeclared lineage groups:\n'+Object.entries(r.lineageGroups).map(([l,ids])=>l+': '+ids.join(', ')).join('\n')+'\nUnavailable sources: '+(r.unavailableSources.join(', ')||'none')+'\nHistory events: '+r.history.length+'\nAll source truth remains unverified.');
}
async function work(fn){
 if(busy)return;busy=true;refresh();
 try{await fn();}catch{txt('conflict-status','Operation refused. Previous investigation remains unchanged.');by('conflict-status').dataset.state='refused';}
 finally{busy=false;refresh();}
}
async function append(e){
 const next=[...events,e],r=await evaluateEvidenceSession(fixture.caseText,JSON.stringify(next));events=next;result=r;render();
}
by('conflict-start').addEventListener('click',()=>work(async()=>{const next=await conflictFixture(),r=await evaluateEvidenceSession(next.caseText);fixture=next;events=[];result=r;render();}));
for(const [button,id,source] of entries)by('conflict-'+button).addEventListener('click',()=>work(()=>append(fixture.read(id,source))));
by('conflict-withdraw').addEventListener('click',()=>work(()=>append({type:'withdraw_lineage',lineage:'sample_one'})));
by('conflict-restore').addEventListener('click',()=>work(()=>append({type:'restore_lineage',lineage:'sample_one'})));
by('conflict-export').addEventListener('click',()=>{
 if(!result||busy)return;
 const blob=URL.createObjectURL(new Blob([JSON.stringify({version:1,caseText:fixture.caseText,events,result},null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=blob;a.download='sutra-conflict-investigation.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(blob),1000);
});
refresh();
