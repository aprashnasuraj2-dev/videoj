import {recoveryTrialFixture,exportTrialPartition,compareTrialVersions} from '../../../packages/sutra-knowledge/trial-partition.js';
import {trialSnapshotDigest} from '../../../packages/sutra-knowledge/trial-snapshot.js';
const by=id=>document.getElementById('trial-'+id);
let busy=false,current=null,epoch=0;
const titles={aggregate:'All randomized participants',invasive_ventilation:'Invasive ventilation',oxygen_only:'Oxygen without invasive ventilation',no_respiratory_support:'No respiratory support'};
const pct=v=>{const [n,d]=v.split('/').map(Number);return (100*n/d).toFixed(2)+'%';};
const decimal=v=>{const [n,d]=v.split('/').map(Number);return (n/d).toFixed(2);};
function controls(){for(const id of ['aggregate','partition','compare'])by(id).disabled=busy;by('export').disabled=busy||!current;by('pin-export').disabled=busy||!current;}
function render(bundle){
 const r=bundle.result,body=by('rows');body.replaceChildren();
 if(bundle.kind==='comparison'){
  by('summary').textContent=r.declaredStudyRoots+' declared study root. Preliminary and final reports are not independent replication. '+r.changes.length+' changed reported field(s).';
  for(const c of r.changes){const p=document.createElement('p');p.textContent=(titles[c.id]??c.id)+' · '+c.field+' · '+decimal(c.before)+' → '+decimal(c.after);body.append(p);}
 }else{
  by('summary').textContent=r.mode==='aggregate'?'Aggregate direction: '+r.rows[0].observedDirection+'. Universal subgroup direction: NOT TESTED.':'Universal lower observed proportion: '+(r.descriptiveCounterexamples.length?'REFUTED in declared partition':'SUPPORTED in declared partition')+'. '+r.descriptiveCounterexamples.length+' descriptive counterexample(s). Universal causal benefit: NOT ESTABLISHED.';
  for(const row of r.rows){
   const card=document.createElement('section'),h=document.createElement('h4'),p=document.createElement('p'),q=document.createElement('p');
   h.textContent=titles[row.id]??row.id;
   p.textContent='Observed events: '+row.counts.treatedEvents+'/'+row.counts.treatedTotal+' ('+pct(row.treatedRisk)+') vs '+row.counts.controlEvents+'/'+row.counts.controlTotal+' ('+pct(row.controlRisk)+'). Direction: '+row.observedDirection+'.';
   q.textContent='Reported age-adjusted rate ratio '+decimal(row.reportedAdjusted.point)+' (95% CI '+decimal(row.reportedAdjusted.lower)+'–'+decimal(row.reportedAdjusted.upper)+'); interval '+row.reportedAdjusted.intervalPosition.replaceAll('_',' ').toLowerCase()+'. Not a recomputed adjusted effect.';
   card.append(h,p,q);body.append(card);
  }
 }
}
async function run(mode){
 if(busy)return;busy=true;current=null;const ticket=++epoch;controls();by('rows').replaceChildren();by('pins').textContent='';by('summary').textContent='Evaluating locally…';by('status').dataset.state='working';
 try{
  const f=await recoveryTrialFixture('final');
  const bundle=mode==='compare'?await (async()=>{const p=await recoveryTrialFixture('preliminary');return compareTrialVersions(p.sourceText,p.pin,f.sourceText,f.pin);})():await exportTrialPartition(f.sourceText,f.pin,mode);
  if(ticket!==epoch)return;
  const bytes=new TextEncoder().encode(JSON.stringify(bundle)),snapshotPin=await trialSnapshotDigest(bytes),r=bundle.result;
  if(ticket!==epoch)return;
  render(bundle);current={bytes,snapshotPin};by('pins').textContent='Snapshot pin: '+snapshotPin+'\nSource pin: '+(r.sourceDigest??r.beforeDigest)+(r.afterDigest?'\nAfter-source pin: '+r.afterDigest:'');by('status').textContent='Computed from the pinned normalized extract. No clinical decision or external request.';by('status').dataset.state='ready';
 }catch{current=null;by('summary').textContent='No result claimed.';by('status').textContent='REFUSED: source or calculation could not be reconstructed.';by('status').dataset.state='refused';}
 finally{busy=false;controls();}
}
by('aggregate').onclick=()=>run('aggregate');by('partition').onclick=()=>run('partition');by('compare').onclick=()=>run('compare');
function download(bytes,name,type){const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
by('export').onclick=()=>{if(current&&!busy)download(current.bytes,'sutra-trial-evidence.json','application/json');};
by('pin-export').onclick=()=>{if(current&&!busy)download(current.snapshotPin+'\n','sutra-trial-evidence.sha256','text/plain');};
controls();
