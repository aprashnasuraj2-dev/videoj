import {capacityExample,pinnedInvestigationExport} from '../../../packages/sutra-knowledge/pinned-investigation.js';
const by=id=>document.getElementById('pinned-'+id),txt=(id,v)=>{by(id).textContent=v;};
let busy=false,current=null,sample=null,stage=null;
function clear(){current=null;by('result').hidden=true;txt('status','Input changed. Evaluate the exact current text.');}
function refresh(){
 for(const id of ['case','pin','events','example','run'])by(id).disabled=busy;
 by('export').disabled=busy||!current;
 by('conflict').disabled=busy||stage!=='baseline'||!current;
 by('resolve').disabled=busy||stage!=='conflict'||!current;
}
for(const id of ['case','pin','events'])by(id).addEventListener('input',()=>{stage=null;clear();refresh();});
function render(){
 const r=current.result;
 txt('state',r.state);txt('worlds',r.report.survivingWorlds.length+' / '+r.report.worlds.length);txt('roots',r.rootSummary.length);
 const format=(name,xs)=>name+': '+(xs.length?xs.map(x=>(x.roots.join(' + ')||'Declared model alone')+' → '+x.worlds.length+' compatible worlds').join('\n'):'none');
 txt('minimum',Object.entries(r.minimum).map(([k,v])=>format(k,v)).join('\n\n'));
 txt('repairs',r.repairs.length?r.repairs.map(x=>'Withdraw '+x.remove.join(' + ')+' → '+x.state+' ('+x.worlds.length+' worlds)').join('\n'):'No consistency repair required or claimed.');
 const p=r.report.frontier?.plan;
 const branches=p?.kind==='observe'?r.observationValues.find(o=>o.id===p.observationId)?.outcomes:[];
 txt('plan',p?.kind==='observe'?p.observationId+' · effort '+p.cost+' · worst case '+p.worstCost+'\n'+branches.map(b=>b.value+' → '+b.worlds.join(', ')).join('\n'):r.report.status+(r.report.frontier?.witness?': '+r.report.frontier.witness.join(' / '):''));
 by('result').hidden=false;txt('status','Replayed locally. Conditional on the supplied finite model; source truth remains unverified.');
}
async function work(setup){
 if(busy)return;busy=true;clear();refresh();
 try{if(setup)await setup();current=await pinnedInvestigationExport(by('case').value,by('pin').value.trim(),by('events').value);render();}
 catch(e){current=null;stage=null;by('result').hidden=true;txt('status','REFUSED: '+(String(e?.message).startsWith('CASE_')?e.message:'case or evidence admission failed')+'. No result exported.');}
 finally{busy=false;refresh();}
}
function setEvents(events){by('events').value=JSON.stringify(events);}
by('example').onclick=()=>work(async()=>{
 sample=await capacityExample();by('case').value=sample.caseText;by('pin').value=sample.pin;
 setEvents([sample.reads.read_meter,sample.reads.read_mirror]);stage='baseline';
});
by('conflict').onclick=()=>work(async()=>{setEvents([sample.reads.read_meter,sample.reads.read_mirror,sample.reads.read_alternate]);stage='conflict';});
by('resolve').onclick=()=>work(async()=>{setEvents([sample.reads.read_meter,sample.reads.read_mirror,sample.reads.read_alternate,{type:'withdraw_lineage',lineage:'alternate_root'},sample.reads.read_capacity]);stage='resolved';});
by('run').onclick=()=>work();
by('export').onclick=()=>{
 if(!current||busy)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(current)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='sutra-pinned-investigation.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
refresh();
