import {compilerFinanceFixture,compilerContrastFixture} from '../../../packages/sutra-knowledge/examples/reviewed-compiler.mjs';
import {exportReviewedContrast} from '../../../packages/sutra-knowledge/reviewed-proposal-contrast.js';
import {exportReviewedProposal} from '../../../packages/sutra-knowledge/reviewed-claim-compiler.js';
const by=id=>document.getElementById('compiler-'+id);
let fixture=null,current=null,busy=false,epoch=0;
function status(state,message){by('status').dataset.state=state;by('status').textContent=message;}
function controls(){for(const id of ['complete','missing'])by(id).disabled=busy;by('proposal').disabled=busy||!fixture;by('run').disabled=busy||!fixture;by('export').disabled=busy||!current;}
function clear(){current=null;by('summary').textContent='';by('nodes').replaceChildren();}
async function load(missing){
 if(busy)return;busy=true;const ticket=++epoch;clear();controls();
 try{
  const f=await compilerFinanceFixture({missing});if(ticket!==epoch)return;
  fixture=f;const c=JSON.parse(f.contractText);
  by('question').textContent=c.question.text;
  by('source').textContent=c.sources.map(s=>s.id+' | '+s.digest+'\n'+s.text).join('\n\n');
  by('bindings').textContent=c.bindings.map(b=>b.id+' = '+b.span.quote+' '+b.type.unit+' | bytes ['+b.span.start+', '+b.span.end+') | '+b.type.scope).join('\n')+'\nReviewed contract: '+f.pin;
  by('proposal').value=f.proposalText;status('loaded','Host-reviewed fixture loaded. The editable proposal is untrusted; no calculation or semantic conclusion yet.');
 }catch{fixture=null;status('refused','REFUSED: fixture could not be loaded.');}
 finally{busy=false;controls();}
}
function render(r){
 by('summary').textContent=r.target.status.replaceAll('_',' ')+' · missing: '+(r.target.missing.join(', ')||'none')+' · incompatible nodes: '+(r.target.typeBlockers.join(', ')||'none')+'. Question relevance and method validity: UNVERIFIED.';
 const body=by('nodes');body.replaceChildren();
 for(const n of r.nodes){
  const p=document.createElement('p'),strong=document.createElement('strong'),value=n.receipt?.outcome;
  strong.textContent=n.id+' — ';p.append(strong,document.createTextNode(value?(value.value??value.status)+' · '+(n.type?.unit??'constraint')+' · '+value.status:n.status+(n.missing.length?' · missing '+n.missing.join(', '):'')));body.append(p);
 }
}
async function run(){
 if(busy||!fixture)return;busy=true;clear();const ticket=++epoch;controls();status('working','Checking exact spans and compiling dependency-ready quantities locally…');
 try{const b=await exportReviewedProposal(fixture.contractText,fixture.pin,by('proposal').value);if(ticket!==epoch)return;const bytes=new TextEncoder().encode(JSON.stringify(b));if(bytes.length>1048576)throw Error('COMPILER_EXPORT_LIMIT');render(b.result);current=bytes;status('ready','Conditional arithmetic only. No model-provided value or verdict accepted as fact.');}
 catch(e){if(ticket===epoch){clear();status('refused','REFUSED: '+(String(e?.message).startsWith('COMPILER_')?e.message:'invalid proposal or resource boundary')+'. No report exported.');}}
 finally{busy=false;controls();}
}
by('complete').onclick=()=>load(false);by('missing').onclick=()=>load(true);by('run').onclick=run;
by('proposal').addEventListener('input',()=>{epoch++;clear();status('loaded','Proposal changed; evaluate the exact current text.');controls();});
by('export').onclick=()=>{if(!current||busy)return;const url=URL.createObjectURL(new Blob([current],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='sutra-reviewed-compiler.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
controls();

let contrastBytes=null,contrastBusy=false;
by('contrast-run').onclick=async()=>{
 if(contrastBusy)return;contrastBusy=true;contrastBytes=null;by('contrast-run').disabled=true;by('contrast-export').disabled=true;by('contrast-rows').replaceChildren();
 const state=by('contrast-status');state.dataset.state='working';state.textContent='Replaying eight scripted proposals locally…';
 try{
  const f=await compilerContrastFixture(),b=await exportReviewedContrast(f.contractText,f.pin,f.batchText),r=b.result,c=r.counts;
  const bytes=new TextEncoder().encode(JSON.stringify(b));if(bytes.length>1048576)throw Error('CONTRAST_EXPORT_LIMIT');
  state.textContent=c.admitted+' admitted, '+c.refused+' refused · '+c.satisfied+' conditionally satisfied, '+c.refuted+' conditionally refuted · '+c.distinctTypedStructures+' distinct typed expressions · '+c.selfComparisons+' same-operand comparisons. Decision authority: NONE.';
  for(const e of r.entries){const p=document.createElement('p');p.textContent=e.id+': '+(e.admission==='REFUSED'?'REFUSED · '+e.reason:e.computation.status.replaceAll('_',' ')+(e.computation.selfComparison?' · same operand on both sides':'')+' · '+e.computation.declaredLineages.length+' declared lineage(s)');by('contrast-rows').append(p);}
  for(const g of r.duplicateProposalGroups){const p=document.createElement('p');p.textContent='Exact duplicate proposal bytes: '+g.ids.join(', ')+'. Repetition is not independent evidence.';by('contrast-rows').append(p);}
  contrastBytes=bytes;state.dataset.state='ready';by('contrast-export').disabled=false;
 }catch{state.dataset.state='refused';state.textContent='REFUSED: no contrast report claimed.';}
 finally{contrastBusy=false;by('contrast-run').disabled=false;}
};
by('contrast-export').onclick=()=>{if(!contrastBytes||contrastBusy)return;const url=URL.createObjectURL(new Blob([contrastBytes],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='sutra-reviewed-contrast.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
