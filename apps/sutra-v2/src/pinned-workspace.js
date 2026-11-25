import {capacityExample} from '../../../packages/sutra-knowledge/pinned-investigation.js';
import {alignedInvestigationExport} from '../../../packages/sutra-knowledge/aligned-investigation.js';
import {createAlignedCapsule,verifyAlignedCapsule,MAX_ALIGNED_CAPSULE_BYTES} from '../../../packages/sutra-knowledge/aligned-capsule.js';
const by=id=>document.getElementById('pinned-'+id),txt=(id,v)=>{by(id).textContent=v;};
let busy=false,current=null,sample=null,stage=null,cap=null,verifiedCap=null;
const capStatus=(state,text)=>{by('capsule-status').dataset.state=state;txt('capsule-status',text);};
function clear(){current=null;by('result').hidden=true;txt('status','Input changed. Evaluate the exact current text.');}
function refresh(){
 for(const id of ['case','pin','events','example','run'])by(id).disabled=busy;
 by('export').disabled=busy||!current;
 by('conflict').disabled=busy||stage!=='baseline'||!current;
 by('resolve').disabled=busy||stage!=='conflict'||!current;
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
by('conflict').onclick=()=>work(async()=>{setEvents([sample.reads.read_meter,sample.reads.read_mirror,sample.reads.read_alternate]);stage='conflict';});
by('resolve').onclick=()=>work(async()=>{setEvents([sample.reads.read_meter,sample.reads.read_mirror,sample.reads.read_alternate,{type:'withdraw_lineage',lineage:'alternate_root'},sample.reads.read_capacity]);stage='resolved';});
by('run').onclick=()=>work();
by('export').onclick=()=>{
 if(!current||busy)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(current)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='sutra-pinned-investigation.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
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
