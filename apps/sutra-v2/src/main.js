import './style.css';
import {createVerifier,replayReport} from '../../../packages/sutra-knowledge/index.js';
import {beamGraph} from '../../../packages/sutra-knowledge/examples/beam.mjs';
import {derivedSectionGraph,beamCase} from '../../../packages/sutra-knowledge/examples/methods.mjs';
import {runProofProposal,scriptedProofModel} from '../../../packages/sutra-knowledge/agent-bridge.js';
import {compareScopedQuantities} from '../../../packages/sutra-knowledge/scope.js';
import {scopeFixture} from '../../../packages/sutra-knowledge/examples/scopes.mjs';
const by=id=>document.getElementById(id),verifier=createVerifier();
const evaluate=by('evaluate'),compare=by('compare'),agent=by('agent'),hostile=by('hostile'),material=by('material');
const reportButtons=['download','replay','forge'].map(by);
let current=null,busy=false,epoch=0;
const find=(r,id)=>r.report.receipts.find(x=>x.id===id);
function mm(value){const [n,d]=value.split('/').map(Number);return (n/d*1000).toFixed(2)+' mm';}
function setBusy(value){busy=value;for(const b of [evaluate,compare,agent,hostile,...reportButtons]){if(value)b.setAttribute('aria-busy','true');else b.removeAttribute('aria-busy');}}
function clear(){
 current=null;for(const b of reportButtons)b.disabled=true;
 for(const id of ['deflection','limit','verdict','counts'])by(id).textContent='—';
 by('verdict').removeAttribute('data-verdict');by('identity').textContent='';by('nodes').replaceChildren();
 by('method-status').textContent='';by('agent-status').textContent='Not run for the selected assumption.';by('replay-status').textContent='No current report available.';
 delete by('agent-status').dataset.state;delete by('replay-status').dataset.state;
}
material.addEventListener('change',()=>{epoch++;clear();by('status').textContent='Assumption changed. Evaluate the new graph; old results are not current.';});
function render(graphText,result){
 const r=result.report,work=new Set(result.stats.executed),receipt=find(result,'deflection_limit');
 current={graphText,reportText:result.reportText};
 by('deflection').textContent=mm(find(result,'deflection').outcome.value);by('limit').textContent=mm(find(result,'limit').outcome.value);
 by('verdict').textContent=receipt.outcome.status==='constraint_satisfied'?'Within limit':'Exceeds limit';
 by('verdict').dataset.verdict=receipt.outcome.status;by('counts').textContent=result.stats.executed.length+' / '+result.stats.reused.length;
 by('identity').textContent=r.graphDigest;
 const rows=r.receipts.map(n=>{
  const row=document.createElement('article');row.className='node';row.dataset.node=n.id;row.dataset.work=work.has(n.id)?'executed':'reused';
  const title=document.createElement('strong');title.textContent=n.id;
  const status=document.createElement('span');status.className='outcome';status.textContent=n.outcome.status;
  const val=document.createElement('span');val.textContent=n.outcome.value??n.outcome.reason??n.outcome.comparison;
  const deps=document.createElement('span');deps.textContent=n.dependencies.length?'Depends on '+n.dependencies.map(d=>d.id).join(' · '):'Declared input';
  const mark=document.createElement('small');mark.textContent=row.dataset.work==='executed'?'Computed this run':'Reused this run';
  row.append(title,status,val,deps,mark);return row;
 });
 by('nodes').replaceChildren(...rows);for(const b of reportButtons)b.disabled=false;
}
async function task(fn){
 if(busy)return;
 const ticket=epoch;setBusy(true);
 try{await fn(()=>ticket===epoch);}
 catch{if(ticket===epoch){clear();by('status').textContent='Verification operation was refused. No current result is claimed.';}}
 finally{setBusy(false);}
}
evaluate.addEventListener('click',()=>task(async active=>{
 const graph=beamGraph(material.value);by('status').textContent='Evaluating exact graph…';
 const r=await verifier.evaluate(graph);if(!active())return;
 render(graph,r);by('status').textContent='Computed locally. Conditional result only; no material measurement or structural safety certification.';
 by('method-status').textContent='';by('replay-status').textContent='Current report ready for replay.';
}));
compare.addEventListener('click',()=>task(async active=>{
 const a=beamGraph(material.value),b=derivedSectionGraph(material.value);
 const r=await verifier.evaluate(a),s=await createVerifier().evaluate(b);if(!active())return;
 render(a,r);const x=find(r,'deflection'),y=find(s,'deflection');
 const equal=x.outcome.value===y.outcome.value&&x.outcome.dimension.every((v,i)=>v===y.outcome.dimension[i]);
 by('status').textContent='Two calculations completed locally.';
 by('method-status').textContent=(equal?'Exact agreement':'Disagreement')+': declared versus derived second moment. Distinct dependency identities; shared beam formula and assumptions. Not independent empirical evidence.';
 by('replay-status').textContent='Primary report ready for replay.';
}));
async function plan(isHostile){
 await task(async active=>{
  by('agent-status').textContent='Running scripted agent composition…';
  try{
   const r=await runProofProposal({caseText:beamCase(material.value),model:scriptedProofModel({hostile:isHostile})});
   if(!active())return;
   by('agent-status').textContent=(isHostile?'Unexpected acceptance: challenge failed.':r.agentCalls+' agent invocations · '+r.modelCalls+' scripted steps · selected '+r.proposal.methodId+' · kernel result '+r.receipt.outcome.status+'. No live inference.');
   by('agent-status').dataset.state=isHostile?'failed':'completed';
  }catch(error){
   if(!active())return;
   const rejected=isHostile&&error?.message==='PROOF_PROPOSAL_REFUSED';
   by('agent-status').textContent=rejected?'Forged verification field refused before kernel evaluation.':'Agent proposal failed; no completed verification claimed.';
   by('agent-status').dataset.state=rejected?'refused':'failed';
  }
 });
}
agent.addEventListener('click',()=>plan(false));hostile.addEventListener('click',()=>plan(true));
async function replay(tamper){
 if(!current)return;
 const snapshot=current;
 await task(async active=>{
  const text=tamper?snapshot.reportText.replace(/sha256:[a-f0-9]{64}/,'sha256:'+'0'.repeat(64)):snapshot.reportText;
  const accepted=await replayReport(snapshot.graphText,text);if(!active())return;
  by('replay-status').textContent=accepted?'Exact report reproduced.':'Report refused: content or identity does not match recomputation.';
  by('replay-status').dataset.state=accepted?'reproduced':'refused';
 });
}
by('replay').addEventListener('click',()=>replay(false));by('forge').addEventListener('click',()=>replay(true));
by('download').addEventListener('click',()=>{
 if(!current||busy)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],{type:'application/json'})),a=document.createElement('a');
 a.href=url;a.download='sutra-proof.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 by('replay-status').textContent='Download requested; browser save outcome not confirmed.';
});

const scopeSelect=by('scope-fixture'),scopeButton=by('scope-check');
let scopeEpoch=0,scopeBusy=false;
scopeSelect.addEventListener('change',()=>{
 scopeEpoch++;by('scope-status').textContent='Selection changed. Check the new declared scope.';
 delete by('scope-result').dataset.state;for(const id of ['scope-left','scope-right','scope-result'])by(id).textContent='—';
});
scopeButton.addEventListener('click',async()=>{
 if(scopeBusy)return;scopeBusy=true;const ticket=scopeEpoch;scopeButton.setAttribute('aria-busy','true');
 by('scope-status').textContent='Checking exact quantities and declared scope…';
 try{
  const r=await compareScopedQuantities(scopeFixture(scopeSelect.value));if(ticket!==scopeEpoch)return;
  by('scope-left').textContent=r.left.value;by('scope-right').textContent=r.right.value;
  by('scope-result').dataset.state=r.status;
  by('scope-result').textContent={equal_declared_quantities:'Equal',different_declared_quantities:'Disagree',incomparable_declared_scope:'Incomparable'}[r.status];
  by('scope-status').textContent=r.differences.length?'No equality constraint executed: incompatible declared '+r.differences.join(', ')+'.':'Exact comparison after SI conversion; declarations are not independently verified.';
 }catch{if(ticket===scopeEpoch)by('scope-status').textContent='Scope verification refused.';}
 finally{scopeBusy=false;scopeButton.removeAttribute('aria-busy');}
});

import './investigation.js';
