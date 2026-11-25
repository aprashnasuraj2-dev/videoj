import {economicsFixture} from '../../../packages/sutra-knowledge/examples/source-economics.mjs';
const by=id=>document.getElementById('economics-'+id);
let current=null,busy=false;
const ids=['fresh','acquired','withdrawn'];
const status=by('status');
async function run(mode){
 if(busy)return;busy=true;current=null;by('export').disabled=true;ids.forEach(id=>by(id).disabled=true);
 status.dataset.state='working';status.textContent='Replaying worlds and comparing exact observation policies…';by('plan').textContent='';
 try{
  const f=await economicsFixture(),events=mode==='withdrawn'?[{type:'withdraw_source',sourceId:'bundle'}]:[],acquired=mode==='acquired'?['bundle']:[];
  const report=await f.run(events,acquired),bytes=new TextEncoder().encode(JSON.stringify(report));
  if(bytes.length>1048576)throw Error('ECON_EXPORT_LIMIT');
  const c=report.comparison;
  for(const [id,v] of [['field',c.perFieldCounterfactualWorstCost],['shared',c.sharedAcquisitionWorstCost],['avoided',c.avoidedCost]])by(id).textContent=v===null?'—':String(v);
  const lines=[];
  function walk(p,depth=0){
   if(!p)return;
   const pad='  '.repeat(depth);
   if(p.kind==='decision'){lines.push(pad+'Conditional '+p.decision.replace('constraint_','')+' · '+p.worlds.join(', '));return;}
   lines.push(pad+p.observationId+' · '+p.sourceId+' · acquire '+p.acquisitionCost+' + read '+p.readCost+' = '+p.cost);
   for(const b of p.branches){lines.push(pad+'If '+b.outcome+':');walk(b.next,depth+1);}
  }
  walk(report.result.plan);by('plan').textContent=lines.join('\n');
  status.textContent='Conditional minimax plan · '+report.survivingWorlds.length+' worlds · '+report.availableObservationIds.length+' offered fields. No evidence acquired, payment made or disclosure authorized.';
  current=bytes;status.dataset.state='ready';by('export').disabled=false;
 }catch{status.textContent='REFUSED: no policy exported.';status.dataset.state='refused';for(const id of ['field','shared','avoided'])by(id).textContent='—';}
 finally{busy=false;ids.forEach(id=>by(id).disabled=false);}
}
ids.forEach(id=>by(id).onclick=()=>run(id));
by('export').onclick=()=>{if(!current||busy)return;const url=URL.createObjectURL(new Blob([current],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='sutra-source-economics.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};

import {disclosureFixture} from '../../../packages/sutra-knowledge/examples/disclosure-frontier.mjs';
const db=id=>document.getElementById('disclosure-'+id);
let disclosureBytes=null,disclosureBusy=false;
const disclosureModes=[['open',4,false],['bounded',2,false],['infeasible',1,false],['withdrawn',4,true]];
async function runDisclosure(cap,withdrawn){
 if(disclosureBusy)return;
 disclosureBusy=true;disclosureBytes=null;db('export').disabled=true;
 for(const [id] of disclosureModes)db(id).disabled=true;
 db('status').dataset.state='working';db('status').textContent='Solving explicit action bundles against a hard worst-branch cap…';db('plan').textContent='';
 try{
  const report=await disclosureFixture(cap,withdrawn?[{type:'withdraw_source',sourceId:'bundle'}]:[]);
  const bytes=new TextEncoder().encode(JSON.stringify(report));
  if(bytes.length>1048576)throw Error('DISCLOSURE_EXPORT_LIMIT');
  const p=report.constrained.plan;
  db('unrestricted').textContent=String(report.unrestricted.plan?.worstCost??'—');
  db('effort').textContent=String(p?.worstCost??'—');db('exposure').textContent=String(p?.worstExposure??'—');
  db('cap').textContent=String(report.exposureBudget);
  const lines=[];
  function walk(node,depth=0){
   if(!node)return;const pad='  '.repeat(depth);
   if(node.kind==='decision'){lines.push(pad+'Conditional '+node.decision.replace('constraint_','')+' · '+node.worlds.join(', '));return;}
   lines.push(pad+node.actionId+' · '+node.observationIds.join(', ')+' · effort '+node.cost+' · exposure '+node.exposure);
   for(const b of node.branches){lines.push(pad+'If '+b.outcome+':');walk(b.next,depth+1);}
  }
  walk(p);
  for(const a of report.excludedActions)lines.push('Unavailable: '+a.id+' ('+a.unavailableObservationIds.join(', ')+')');
  db('plan').textContent=lines.join('\n');
  db('status').textContent=p?'Conditional plan within cap. No action executed.':report.constrained.status==='exposure_budget_infeasible'?'NO FEASIBLE PLAN: the declared cap rules out every decisive policy. Evidence is unchanged.':'NO DECISIVE PLAN: '+report.constrained.status;
  db('status').dataset.outcome=report.constrained.status;
  disclosureBytes=bytes;db('status').dataset.state='ready';db('export').disabled=false;
 }catch{db('status').dataset.state='refused';db('status').textContent='REFUSED: no policy exported.';delete db('status').dataset.outcome;for(const id of ['unrestricted','effort','exposure','cap'])db(id).textContent='—';}
 finally{disclosureBusy=false;for(const [id] of disclosureModes)db(id).disabled=false;}
}
for(const [id,cap,withdrawn] of disclosureModes)db(id).onclick=()=>runDisclosure(cap,withdrawn);
db('export').onclick=()=>{if(!disclosureBytes||disclosureBusy)return;const url=URL.createObjectURL(new Blob([disclosureBytes],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='sutra-disclosure-policy.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
