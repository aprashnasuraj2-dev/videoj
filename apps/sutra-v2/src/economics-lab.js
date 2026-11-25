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
