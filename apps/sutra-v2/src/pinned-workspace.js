import {capacityExample,casePin} from '../../../packages/sutra-knowledge/pinned-investigation.js';
import {alignedInvestigationExport} from '../../../packages/sutra-knowledge/aligned-investigation.js';
import {createAlignedCapsule,verifyAlignedCapsule,MAX_ALIGNED_CAPSULE_BYTES} from '../../../packages/sutra-knowledge/aligned-capsule.js';
import {exportMeasurementSensitivity} from '../../../packages/sutra-knowledge/measurement-sensitivity.js';
import {exportCoverageAttack} from '../../../packages/sutra-knowledge/world-coverage-attack.js';
import {exportProposalChallenge} from '../../../packages/sutra-knowledge/proposal-challenge.js';
import {exportProposalClash} from '../../../packages/sutra-knowledge/proposal-clash.js';
import {exportObservedDomainGrid} from '../../../packages/sutra-knowledge/coverage-grid.js';
import {exportAssumptionContrast} from '../../../packages/sutra-knowledge/assumption-contrast.js';
const by=id=>document.getElementById('pinned-'+id),txt=(id,v)=>{by(id).textContent=v;};
let busy=false,current=null,sample=null,stage=null,cap=null,verifiedCap=null,rangeResult=null,coverageResult=null,proposalResult=null,clashResult=null,gridResult=null,contrastResult=null;
const capStatus=(state,text)=>{by('capsule-status').dataset.state=state;txt('capsule-status',text);};
function clear(){current=null;clearRange();clearCoverage();clearProposal();clearGrid();by('result').hidden=true;txt('status','Input changed. Evaluate the exact current text.');}
function refresh(){
 for(const id of ['case','pin','events','example','coverage-example','proposal-example','grid-example','contrast-example','run'])by(id).disabled=busy;
 by('export').disabled=busy||!current;
 by('conflict').disabled=busy||stage!=='baseline'||!current;
 by('resolve').disabled=busy||stage!=='conflict'||!current;
 for(const id of ['range-observation','range-lower','range-upper','range-run'])by(id).disabled=busy||!current||!current.result.report.activeEvidence.length;
 by('range-export').disabled=busy||!rangeResult;
 for(const id of ['coverage-base','coverage-id','coverage-input','coverage-value','coverage-run'])by(id).disabled=busy||!current||current.alignment.worldCount>=12;
 by('coverage-export').disabled=busy||!coverageResult;
 for(const id of ['proposal-text','proposal-run'])by(id).disabled=busy||!current;
 by('proposal-export').disabled=busy||!proposalResult;
 by('clash-run').disabled=busy||!proposalResult;
 by('clash-export').disabled=busy||!clashResult;
 by('grid-run').disabled=busy||!current;
 by('grid-export').disabled=busy||!gridResult;
 by('contrast-run').disabled=busy||!current;
 by('contrast-export').disabled=busy||!contrastResult;
 by('capsule-export').disabled=busy||!current;
 by('capsule-pin-export').disabled=busy||!cap;
 for(const id of ['capsule-case-pin','capsule-pin','capsule-file'])by(id).disabled=busy;
 by('capsule-verify').disabled=busy||!cap&&!by('capsule-file').files?.length;
 txt('capsule-context',verifiedCap?(current?(verifiedCap.caseDigest===current.result.caseDigest&&verifiedCap.eventDigest===current.result.eventDigest?'Verified snapshot matches current investigation.':'Verified snapshot is different from the current investigation.'): 'Verified imported snapshot only; no current investigation.'):'No verified snapshot selected.');
}
for(const id of ['case','pin','events'])by(id).addEventListener('input',()=>{stage=null;clear();refresh();});
function render(){
 const r=current.result;
 txt('alignment','Same typed graph across '+current.alignment.worldCount+' worlds · '+current.alignment.nodeCount+' nodes · only input values vary.');
 txt('state',r.state);txt('worlds',r.report.survivingWorlds.length+' / '+r.report.worlds.length);txt('roots',r.rootSummary.length);
 const format=(name,xs)=>name+': '+(xs.length?xs.map(x=>(x.roots.join(' + ')||'Declared model alone')+' → '+x.worlds.length+' compatible worlds').join('\n'):'none');
 txt('minimum',Object.entries(r.minimum).map(([k,v])=>format(k,v)).join('\n\n'));
 txt('repairs',r.repairs.length?r.repairs.map(x=>'Withdraw '+x.remove.join(' + ')+' → '+x.state+' ('+x.worlds.length+' worlds)').join('\n'):'No consistency repair required or claimed.');
 const p=r.report.frontier?.plan;
 const branches=p?.kind==='observe'?r.observationValues.find(o=>o.id===p.observationId)?.outcomes:[];
 txt('plan',p?.kind==='observe'?p.observationId+' · effort '+p.cost+' · worst case '+p.worstCost+'\n'+branches.map(b=>b.value+' → '+b.worlds.join(', ')).join('\n'):r.report.status+(r.report.frontier?.witness?': '+r.report.frontier.witness.join(' / '):''));
 const select=by('range-observation');select.replaceChildren();
 for(const r of current.result.report.activeEvidence){const option=document.createElement('option');option.value=r.observationId;option.textContent=r.observationId+' · '+r.nodeId+' = '+r.value+' · '+r.lineage;select.append(option);}
 setPointBounds();clearRange();setCoverageWorlds();clearCoverage();clearProposal();clearGrid();
 by('result').hidden=false;txt('status','Replayed locally. Conditional on the supplied finite model; source truth remains unverified.');
}
async function work(setup){
 if(busy)return;busy=true;clear();refresh();
 try{if(setup)await setup();current=await alignedInvestigationExport(by('case').value,by('pin').value.trim(),by('events').value);render();}
 catch(e){current=null;stage=null;by('result').hidden=true;txt('status','REFUSED: '+(String(e?.message).startsWith('CASE_')?e.message:'case or evidence admission failed')+'. No result exported.');}
 finally{busy=false;refresh();}
}
function setEvents(events){by('events').value=JSON.stringify(events);}
by('example').onclick=()=>work(async()=>{
 sample=await capacityExample();by('case').value=sample.caseText;by('pin').value=sample.pin;
 setEvents([sample.reads.read_meter,sample.reads.read_mirror]);stage='baseline';
});
by('coverage-example').onclick=()=>work(async()=>{
 sample=await capacityExample();by('case').value=sample.caseText;by('pin').value=sample.pin;setEvents([sample.reads.read_alternate]);stage='coverage';
});
by('grid-example').onclick=()=>work(async()=>{
 sample=await capacityExample();const c=JSON.parse(sample.caseText);c.worlds=c.worlds.filter(w=>w.id!=='load_30_cap_20');
 by('case').value=JSON.stringify(c);by('pin').value=await casePin(by('case').value);setEvents([sample.reads.read_meter]);stage='grid';
});
by('contrast-example').onclick=()=>work(async()=>{
 sample=await capacityExample();const c=JSON.parse(sample.caseText);c.worlds=c.worlds.filter(w=>w.id!=='load_30_cap_40');
 for(const w of c.worlds){const g=JSON.parse(w.graphText),target=g.nodes.pop();g.nodes.push({id:'limit',kind:'input',value:'900',dimension:[0,0,0],basis:'Synthetic product limit'},{id:'product',kind:'derive',op:'mul',args:['load','capacity']});target.args=['product','limit'];g.nodes.push(target);w.graphText=JSON.stringify(g);}
 by('case').value=JSON.stringify(c);by('pin').value=await casePin(by('case').value);setEvents([]);stage='contrast';
});
by('proposal-example').onclick=()=>work(async()=>{
 sample=await capacityExample();by('case').value=sample.caseText;by('pin').value=sample.pin;
 setEvents([sample.reads.read_capacity,sample.reads.read_alternate]);stage='proposal';
 by('proposal-text').value=JSON.stringify({caseDigest:sample.pin,eventText:JSON.stringify([sample.reads.read_capacity,sample.reads.read_meter]),claimedState:'REFUTED'},null,2);
});
by('conflict').onclick=()=>work(async()=>{setEvents([sample.reads.read_meter,sample.reads.read_mirror,sample.reads.read_alternate]);stage='conflict';});
by('resolve').onclick=()=>work(async()=>{setEvents([sample.reads.read_meter,sample.reads.read_mirror,sample.reads.read_alternate,{type:'withdraw_lineage',lineage:'alternate_root'},sample.reads.read_capacity]);stage='resolved';});
by('run').onclick=()=>work();
by('export').onclick=()=>{
 if(!current||busy)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(current)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='sutra-pinned-investigation.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

function rangeStatus(state,text){by('range-status').dataset.state=state;txt('range-status',text);}
function clearRange(){rangeResult=null;by('range-result').hidden=true;rangeStatus('idle','No measurement policy evaluated.');}
function setPointBounds(){
 const r=current?.result.report.activeEvidence.find(r=>r.observationId===by('range-observation').value);
 by('range-lower').value=r?.value??'';by('range-upper').value=r?.value??'';
}
by('range-observation').onchange=()=>{setPointBounds();clearRange();refresh();};
for(const id of ['range-lower','range-upper'])by(id).oninput=()=>{clearRange();refresh();};
function renderRange(){
 const r=rangeResult.result;
 function summary(v){
  const f=v.frontier;
  const next=!f?'Contradiction needs adjudication.':f.status==='conditional_observation_plan'?'Next offered observation: '+f.plan.observationId+' · worst-case effort '+f.plan.worstCost:f.status==='insufficient_observations'?'No available decisive plan. Witness: '+f.witness.join(' / '):f.status==='invariant_decision'?'No additional offered observation needed.':'An unresolved world blocks a decisive conclusion.';
  const remaining=v.blockers.filter(w=>w.observations.length).map(w=>w.world+': '+w.observations.join(', '));
  return v.state+'\nSurviving worlds: '+v.survivingWorlds.length+'\nReadmitted: '+(v.readmittedWorlds.join(', ')||'none')+'\n'+next+'\nRemaining exclusions:\n'+(remaining.join('\n')||'none');
 }
 txt('range-single',summary(r.single));txt('range-shared',summary(r.shared));txt('range-cohort','Declared matching cohort: '+r.cohort.join(', ')+'. No common calibration or independence is inferred.');
 by('range-result').hidden=false;rangeStatus('ready','Hypothetical diagnosis computed. Actual conclusion remains '+current.result.state+'.');
}
by('range-run').onclick=async()=>{
 if(busy||!current)return;busy=true;clearRange();refresh();
 try{
  const q=JSON.stringify({observationId:by('range-observation').value,lower:by('range-lower').value.trim(),upper:by('range-upper').value.trim()});
  rangeResult=await exportMeasurementSensitivity(current.caseText,current.result.caseDigest,current.eventText,q);renderRange();
 }catch{rangeResult=null;rangeStatus('refused','REFUSED: use normalized rational bounds containing an admitted point reading. Actual evidence unchanged.');}
 finally{busy=false;refresh();}
};
by('range-export').onclick=()=>{
 if(busy||!rangeResult)return;
 const bytes=new TextEncoder().encode(JSON.stringify(rangeResult));
 if(bytes.length>1048576){rangeStatus('refused','REFUSED: diagnosis export exceeds 1 MiB. Actual evidence unchanged.');return;}
 download(bytes,'sutra-measurement-diagnosis.json','application/json');
};
function coverageStatus(state,text){by('coverage-status').dataset.state=state;txt('coverage-status',text);}
function clearCoverage(){
 coverageResult=null;by('coverage-result').hidden=true;
 coverageStatus('idle',current?.alignment.worldCount>=12?'World budget is full (12). No candidate can be added.':'No coverage attack evaluated.');
}
function coverageWorld(){
 return current?JSON.parse(current.caseText).worlds.find(w=>w.id===by('coverage-base').value):null;
}
function fillSelect(select,values){
 select.replaceChildren();for(const [id,label] of values){const option=document.createElement('option');option.value=id;option.textContent=label;select.append(option);}
}
function coverageInputs(){
 const world=coverageWorld(),nodes=world?JSON.parse(world.graphText).nodes.filter(n=>n.kind==='input'):[];
 fillSelect(by('coverage-input'),nodes.map(n=>[n.id,n.id+' = '+n.value]));
}
function coveragePoint(){
 const world=coverageWorld(),n=world?JSON.parse(world.graphText).nodes.find(n=>n.id===by('coverage-input').value):null;
 by('coverage-value').value=n?.value??'';
}
function setCoverageWorlds(){
 const c=JSON.parse(current.caseText);
 fillSelect(by('coverage-base'),c.worlds.map(w=>[w.id,w.id]));
 by('coverage-id').value='counterexample';
 coverageInputs();
 if(stage==='coverage'){by('coverage-input').value='capacity';by('coverage-value').value='5';}
 else coveragePoint();
}
by('coverage-base').onchange=()=>{coverageInputs();coveragePoint();clearCoverage();refresh();};
by('coverage-input').onchange=()=>{coveragePoint();clearCoverage();refresh();};
for(const id of ['coverage-id','coverage-value'])by(id).oninput=()=>{clearCoverage();refresh();};
function renderCoverage(){
 const r=coverageResult.result,c=r.candidate,v=r.variant,f=v.frontier;
 const change=c.changes.map(n=>n.id+': '+n.from+' → '+n.to).join('\n');
 const blockers=c.blockers.map(b=>b.observationId+': candidate '+b.expected+' vs observed '+b.observed).join('\n');
 txt('coverage-candidate',c.id+'\n'+change+'\n'+(c.compatible?'Compatible with every admitted reading.':'Excluded by admitted readings: '+blockers)+'\nCandidate decision: '+c.decision);
 const next=!f?'No consistent world.':f.status==='conditional_observation_plan'?'Next offered observation: '+f.plan.observationId+' · worst-case effort '+f.plan.worstCost:f.status==='insufficient_observations'?'No decisive offered test; witness '+f.witness.join(' / '):f.status==='invariant_decision'?'All surviving worlds agree.':'Unresolved computational world.';
 txt('coverage-variant',r.baseline.state+' → '+v.state+'\nSurviving worlds: '+v.survivingWorlds.join(', ')+'\n'+next);
 txt('coverage-identity','Distinct variant case digest: '+v.caseDigest+'. Original evidence and model unchanged; this is not adoption.');
 by('coverage-result').hidden=false;coverageStatus('ready','Hypothetical coverage diagnosis computed. Actual conclusion remains '+current.result.state+'.');
}
by('coverage-run').onclick=async()=>{
 if(busy||!current||current.alignment.worldCount>=12)return;busy=true;clearCoverage();refresh();
 try{
  const q=JSON.stringify({worldId:by('coverage-id').value.trim(),baseWorldId:by('coverage-base').value,overrides:{[by('coverage-input').value]:by('coverage-value').value.trim()}});
  coverageResult=await exportCoverageAttack(current.caseText,current.result.caseDigest,current.eventText,q);renderCoverage();
 }catch{coverageResult=null;coverageStatus('refused','REFUSED: require a unique world and a valid nonduplicate input assignment within the finite model budget. Actual investigation unchanged.');}
 finally{busy=false;refresh();}
};
by('coverage-export').onclick=()=>{
 if(busy||!coverageResult)return;
 const bytes=new TextEncoder().encode(JSON.stringify(coverageResult));
 if(bytes.length>1048576){coverageStatus('refused','REFUSED: diagnosis export exceeds 1 MiB. Actual investigation unchanged.');return;}
 download(bytes,'sutra-coverage-diagnosis.json','application/json');
};
function proposalStatus(state,text){by('proposal-status').dataset.state=state;txt('proposal-status',text);}
function clearProposal(){proposalResult=null;clearClash();by('proposal-result').hidden=true;proposalStatus('idle','No competing proposal evaluated.');}
by('proposal-text').oninput=()=>{clearProposal();refresh();};
function renderProposal(){
 const r=proposalResult.result;
 txt('proposal-claim',(r.claim.matches?'CLAIM MATCHES REPLAY':'CLAIM DOES NOT MATCH REPLAY')+'\nClaimed: '+r.claim.claimedState+'\nRecomputed: '+r.claim.recomputedState+'\nCurrent: '+r.baseline.state+' · '+r.comparison);
 txt('proposal-history',r.history.commonEventCount+' shared initial events · '+r.history.baselineEventCount+' current / '+r.history.proposalEventCount+' proposed\nShared prefix conclusion: '+r.history.commonPrefix.state+'\nCurrent-only tail: '+JSON.stringify(r.history.baselineTail,null,2)+'\nProposed-only tail: '+JSON.stringify(r.history.proposalTail,null,2));
 const evidence=items=>items.map(x=>x.observationId+' · '+x.nodeId+' = '+x.value+' · '+x.lineage).join('\n')||'none';
 txt('proposal-evidence','Shared final readings:\n'+evidence(r.evidence.shared)+'\nCurrent only:\n'+evidence(r.evidence.baselineOnly)+'\nProposal only:\n'+evidence(r.evidence.proposalOnly)+'\nDeclared roots and availability:\n'+JSON.stringify({roots:r.evidence.declaredRoots,unavailable:r.evidence.unavailableSources},null,2));
 const f=r.history.commonPrefix.frontier;
 txt('proposal-worlds','Shared surviving worlds: '+(r.worlds.shared.join(', ')||'none')+'\nCurrent only: '+(r.worlds.baselineOnly.join(', ')||'none')+'\nProposal only: '+(r.worlds.proposalOnly.join(', ')||'none')+'\nMinimal evidence sets by branch:\n'+JSON.stringify({current:r.baseline.minimum,proposed:r.proposal.minimum},null,2)+'\nShared-prefix observation policy: '+(f?.status==='conditional_observation_plan'?f.plan.observationId+' · worst-case effort '+f.plan.worstCost:f?.status??'conflict needs adjudication'));
 by('proposal-result').hidden=false;proposalStatus('ready','Both histories replayed. Actual investigation remains '+current.result.state+'. No automatic adoption.');
}
by('proposal-run').onclick=async()=>{
 if(busy||!current)return;busy=true;clearProposal();refresh();
 try{proposalResult=await exportProposalChallenge(current.caseText,current.result.caseDigest,current.eventText,by('proposal-text').value);renderProposal();}
 catch{proposalResult=null;proposalStatus('refused','REFUSED: require the same case digest, a valid pinned observation history, and a recognized claimed state. Actual investigation unchanged.');}
 finally{busy=false;refresh();}
};
by('proposal-export').onclick=()=>{
 if(busy||!proposalResult)return;
 const bytes=new TextEncoder().encode(JSON.stringify(proposalResult));
 if(bytes.length>1048576){proposalStatus('refused','REFUSED: diagnosis export exceeds 1 MiB. Actual investigation unchanged.');return;}
 download(bytes,'sutra-proposal-diagnosis.json','application/json');
};
function clashStatus(state,text){by('clash-status').dataset.state=state;txt('clash-status',text);}
function clearClash(){clashResult=null;by('clash-result').hidden=true;clashStatus('idle','No joint reading test evaluated.');}
function renderClash(){
 const r=clashResult.result,j=r.jointFinal,s=r.sharedFinal;
 txt('clash-classification',r.classification==='CROSS_BRANCH_CLASH'?'Individually consistent branches contradict when their final readings are considered together.':r.classification==='BRANCH_ALREADY_CONFLICTED'?'At least one branch was already conflicted.':'No new contradiction from considering the two final reading sets together.');
 txt('clash-shared',s.state+' · '+s.survivingWorlds.length+' compatible worlds\nShared readings: '+(s.observationIds.join(', ')||'none'));
 txt('clash-joint',j.state+' · '+j.survivingWorlds.length+' compatible worlds\nSmallest conflicting observation set: '+(j.minimumObservationConflict?.join(' + ')||'none')+'\nMinimal conflicting declared roots: '+(j.minimum.conflict.map(x=>x.roots.join(' + ')).join('; ')||'none')+'\nHypothetical root-removal consistency repairs: '+(j.repairs.map(x=>x.remove.join(' + ')+' → '+x.state).join('; ')||'none')+'\nUnavailable in the other branch: '+JSON.stringify(r.unavailableInOtherBranch));
 by('clash-result').hidden=false;clashStatus('ready','Receipt-only diagnostic. Neither actual history or source availability has changed.');
}
by('clash-run').onclick=async()=>{
 if(busy||!current||!proposalResult)return;busy=true;clearClash();refresh();
 try{clashResult=await exportProposalClash(current.caseText,current.result.caseDigest,current.eventText,by('proposal-text').value);renderClash();}
 catch{clashResult=null;clashStatus('refused','REFUSED: joint reading diagnosis could not be reconstructed. Actual histories unchanged.');}
 finally{busy=false;refresh();}
};
by('clash-export').onclick=()=>{
 if(busy||!clashResult)return;
 const bytes=new TextEncoder().encode(JSON.stringify(clashResult));
 if(bytes.length>1048576){clashStatus('refused','REFUSED: diagnosis export exceeds 1 MiB.');return;}
 download(bytes,'sutra-proposal-clash.json','application/json');
};
function gridStatus(state,text){by('grid-status').dataset.state=state;txt('grid-status',text);}
function clearGrid(){gridResult=null;by('grid-result').hidden=true;gridStatus('idle','No observed-domain audit evaluated.');clearContrast();}
function renderGrid(){
 const r=gridResult.result;
 txt('grid-summary',r.uniqueAssignments+' unique assignments / '+r.gridSize+' possible combinations of observed values · '+r.missingCount+' omitted\n'+(r.closureState===null?'Audit limit exceeded; no closure conclusion computed.':'Current '+r.baseline.state+' → hypothetical closure '+r.closureState));
 txt('grid-axes',r.axes.map(x=>x.id+': '+x.values.join(', ')+' · dimension '+x.dimension.join(',')).join('\n')+'\nDuplicate assignment groups: '+(r.duplicateGroups.map(g=>g.join(' / ')).join('; ')||'none'));
 txt('grid-candidates',r.candidates.map(c=>c.assignment.map(x=>x.id+' = '+x.value).join(', ')+'\n'+(c.compatible===null?'Invalid offered quantities: '+c.invalidOffers.join(', '):c.compatible?'Compatible with current readings':'Excluded by '+c.blockers.map(x=>x.observationId).join(', '))+' · '+c.decision+'\nNearest existing world: '+c.nearestWorld+' · '+c.changedInputs.length+' changed inputs').join('\n\n')||'No missing assignment evaluated.');
 by('grid-result').hidden=false;gridStatus('ready','Hypothetical observed-value coverage audit computed. Current case, history and conclusion unchanged.');
}
by('grid-run').onclick=async()=>{
 if(busy||!current)return;busy=true;clearGrid();refresh();
 try{gridResult=await exportObservedDomainGrid(current.caseText,current.result.caseDigest,current.eventText);renderGrid();}
 catch{gridResult=null;gridStatus('refused','REFUSED: observed-domain audit could not be reconstructed. Actual investigation unchanged.');}
 finally{busy=false;refresh();}
};
by('grid-export').onclick=()=>{
 if(busy||!gridResult)return;
 const bytes=new TextEncoder().encode(JSON.stringify(gridResult));
 if(bytes.length>1048576){gridStatus('refused','REFUSED: diagnosis export exceeds 1 MiB.');return;}
 download(bytes,'sutra-observed-domain-grid.json','application/json');
};
function contrastStatus(state,message){by('contrast-status').dataset.state=state;txt('contrast-status',message);}
function clearContrast(){contrastResult=null;by('contrast-result').hidden=true;contrastStatus('idle','No assumption contrast evaluated.');}
function showInterventions(f,labels){
 return f.count?f.count+' opposite assignments · minimum '+f.minimumChangedInputs+' changes\n'+f.minimalInterventions.map(w=>w.changes.map(c=>c.id+' '+c.from+' → '+c.to).join('; ')+' ('+w.origin+')'+(w.blockers.length?' · excluded by '+w.blockers.map(b=>b.observationId).join(', '):'')+(w.invalidOffers.length?' · invalid offers '+w.invalidOffers.join(', '):'')).join('\n'):'None found among evaluated assignments';
}
function renderContrast(){
 const r=contrastResult.result;
 txt('contrast-summary',r.assignmentsEvaluated+' evaluated assignments / '+r.gridSize+' combinations · '+(r.completeOverObservedValues?'Complete over observed values only':'Incomplete grid; absence of a reversal is not established'));
 const out=by('contrast-anchors');out.replaceChildren();
 for(const a of r.anchors){
  const section=document.createElement('section'),heading=document.createElement('h4'),text=document.createElement('p'),details=document.createElement('pre');
  heading.textContent=a.anchor.worldIds.join(' / ');text.textContent=a.oneFactor.assessment.replaceAll('_',' ')+' · '+a.oneFactor.evaluated+'/'+a.oneFactor.expected+' one-factor alternatives evaluated; '+a.oneFactor.unresolved+' unresolved';
  details.textContent='Model-only reversal:\n'+showInterventions(a.modelContrast)+'\n\nCompatible with admitted evidence:\n'+showInterventions(a.evidenceCompatibleContrast)+'\n\nExcluded by admitted evidence:\n'+showInterventions(a.evidenceExcludedContrast)+'\n\nAdmission blocked:\n'+showInterventions(a.admissionBlockedContrast)+'\n\nUnresolved assignments: '+a.unresolvedAssignments.length;
  section.append(heading,text,details);out.append(section);
 }
 if(!r.anchors.length)out.textContent='No surviving declared decisive anchor; no reversal claim.';
 by('contrast-result').hidden=false;contrastStatus('ready','Computed exact discrete counterfactuals. Current investigation unchanged.');
}
by('contrast-run').onclick=async()=>{
 if(busy||!current)return;busy=true;clearContrast();refresh();
 try{contrastResult=await exportAssumptionContrast(current.caseText,current.result.caseDigest,current.eventText);renderContrast();}
 catch{contrastResult=null;contrastStatus('refused','REFUSED: assumption contrast could not be reconstructed. Current investigation unchanged.');}
 finally{busy=false;refresh();}
};
by('contrast-export').onclick=()=>{
 if(busy||!contrastResult)return;
 const bytes=new TextEncoder().encode(JSON.stringify(contrastResult));
 if(bytes.length>1048576){contrastStatus('refused','REFUSED: contrast export exceeds 1 MiB.');return;}
 download(bytes,'sutra-assumption-contrast.json','application/json');
};
function download(bytes,name,type){
 const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function capsuleWork(make){
 if(busy)return;busy=true;refresh();
 try{await make();}
 catch(e){capStatus('refused','REFUSED: '+(String(e?.message).startsWith('ALIGNED_CAPSULE_')?e.message:'capsule operation failed')+'. Current investigation unchanged.');}
 finally{busy=false;refresh();}
}
by('capsule-export').onclick=()=>capsuleWork(async()=>{
 if(!current)return;
 const next=await createAlignedCapsule(current.caseText,current.result.caseDigest,current.eventText);
 if(next.eventDigest!==current.result.eventDigest)throw Error('CAPSULE_HISTORY_MISMATCH');
 cap=next;verifiedCap=null;by('capsule-file').value='';by('capsule-case-pin').value=next.caseDigest;by('capsule-pin').value=next.expectedDigest;
 capStatus('ready','Exact snapshot prepared; download requested, not confirmed. Retain both digests independently.');
 download(next.bytes,'sutra-aligned-capsule.json','application/json');
});
by('capsule-pin-export').onclick=()=>{
 if(busy||!cap)return;download(cap.expectedDigest+'\n','sutra-aligned-capsule.sha256','text/plain');
};
by('capsule-file').onchange=()=>{cap=null;verifiedCap=null;capStatus('ready','File selected. Supply both separately retained digests.');refresh();};
for(const id of ['capsule-case-pin','capsule-pin'])by(id).oninput=()=>{verifiedCap=null;capStatus('ready','Expected digest changed. Verification required.');refresh();};
by('capsule-verify').onclick=()=>capsuleWork(async()=>{
 verifiedCap=null;
 const file=by('capsule-file').files?.[0],pin=by('capsule-pin').value.trim(),casePin=by('capsule-case-pin').value.trim();
 if(file&&(file.size<1||file.size>MAX_ALIGNED_CAPSULE_BYTES)){capStatus('refused','REFUSED: SIZE_OR_TYPE');return;}
 const bytes=file?new Uint8Array(await file.arrayBuffer()):cap?.bytes;
 const r=await verifyAlignedCapsule(bytes,pin,casePin);
 if(r.status!=='VERIFIED'){capStatus('refused','REFUSED: '+r.reason);return;}
 verifiedCap=r;
 capStatus('verified','VERIFIED: '+r.conclusion+' — exact aligned snapshot replay. Current investigation unchanged. Not freshness or truth.');
});
refresh();
