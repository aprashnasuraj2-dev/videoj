import {quantityUnits} from './local-computation.js';
import {prepareLocalBatch,MAX_LOCAL_TASKS} from './local-batch.js';
const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function button(text,fn){const b=E('button',text);b.type='button';b.addEventListener('click',fn);return b;}
function field(name,control){const l=E('label',name,'eh-field');l.append(control);return l;}
function input(value,max=64){const el=E('input');el.type='text';el.maxLength=max;el.value=value;return el;}
function select(values,value){const el=E('select');fill(el,values,value);return el;}
function fill(el,values,value){el.replaceChildren(...values.map(v=>{const o=E('option',v);o.value=v;return o;}));if(values.includes(value))el.value=value;}
function save(value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=E('a');a.href=url;a.download='sutra-local-batch.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export function mountBatchWorkshop(root,{publish,onObserve}){
 const section=E('section');section.id='eh-batch';
 section.append(E('p','LOCAL DATAFLOW / DETERMINISTIC','eh-kicker'),E('h2','Task workshop'),E('p','Build a bounded chain or parallel set of exact quantity conversions. Name your logical task owners; reuse an owner for several tasks or assign different owners. No AI invocation, external contact or permission is requested.','eh-copy'));
 const concurrency=select(['1','2','3','4'],'2'),rows=E('div',undefined,'eh-batch-rows'),summary=E('p',undefined,'eh-state'),status=E('p','Edit a plan before executing.','eh-state'),result=E('div',undefined,'eh-batch-results');
 status.id='eh-batch-status';status.setAttribute('role','status');
 const preview=E('pre',undefined,'eh-quote');preview.hidden=true;
 let entries=[],sequence=0,controller=null,current=null,runSequence=0,prepared=null;
 function nextRow(owner='local_owner'){
  const id='task_'+(++sequence);
  return {id,owner,kind:'length',from:'mm',to:'m',value:'1000',predecessor:null};
 }
 function invalidate(){prepared=null;current=null;preview.hidden=true;result.replaceChildren();status.textContent='Plan changed. Review before executing.';sync();}
 function snapshot(){return entries.map(r=>({...r,value:r.predecessor===null?r.value:null}));}
 function sync(){
  const busy=controller!==null;
  add.disabled=busy||entries.length>=MAX_LOCAL_TASKS;review.disabled=busy||!entries.length;run.disabled=busy||!prepared;cancel.disabled=!busy;download.disabled=busy||!current||current.result.artifacts.length===0;observe.disabled=!current;concurrency.disabled=busy;
  for(const el of rows.querySelectorAll('input,select,button'))el.disabled=busy||el.dataset.remove==='true'&&entries.length===1||el.dataset.inputMode==='dependency';
  summary.textContent=entries.length+' declared task(s) · '+new Set(entries.map(r=>r.owner)).size+' declared owner(s) · 0 model calls';
 }
 function draw(){
  rows.replaceChildren();
  for(const r of entries){
   const card=E('article',undefined,'eh-batch-row');card.dataset.batchTask=r.id;card.append(E('h3',r.id));
   const owner=input(r.owner),kind=select(Object.keys(quantityUnits),r.kind),from=select(quantityUnits[r.kind],r.from),to=select(quantityUnits[r.kind],r.to),value=input(r.value??'1000',50),dependency=E('select');
   for(const [id,label] of [['','Declared input'],...entries.filter(p=>p.id!==r.id).map(p=>[p.id,p.id+' output'])]){const o=E('option',label);o.value=id;dependency.append(o);}
   dependency.value=r.predecessor??'';value.dataset.inputMode=r.predecessor===null?'declared':'dependency';
   for(const [key,control] of [['owner',owner],['value',value],['from',from],['to',to]])control.addEventListener('input',()=>{r[key]=control.value;invalidate();});
   kind.addEventListener('change',()=>{r.kind=kind.value;r.from=quantityUnits[r.kind][0];r.to=quantityUnits[r.kind].at(-1);fill(from,quantityUnits[r.kind],r.from);fill(to,quantityUnits[r.kind],r.to);invalidate();});
   dependency.addEventListener('change',()=>{r.predecessor=dependency.value||null;value.dataset.inputMode=r.predecessor===null?'declared':'dependency';invalidate();});
   const remove=button('Remove '+r.id,()=>{entries=entries.filter(p=>p.id!==r.id);for(const p of entries)if(p.predecessor===r.id)p.predecessor=null;draw();invalidate();});remove.dataset.remove='true';
   const fields=E('div',undefined,'eh-batch-fields');fields.append(field('Task owner',owner),field('Quantity kind',kind),field('From unit',from),field('To unit',to),field('Input source',dependency),field('Declared magnitude',value));card.append(fields,remove);rows.append(card);
  }
  sync();
 }
 const add=button('Add task',()=>{if(entries.length<MAX_LOCAL_TASKS){entries.push(nextRow());draw();invalidate();}});
 const review=button('Review exact plan',()=>{try{prepared=prepareLocalBatch(snapshot(),{concurrency:Number(concurrency.value)});preview.textContent=JSON.stringify(prepared.plan,null,2);preview.hidden=false;status.textContent='Local plan validated. Execute explicitly when ready.';}catch{prepared=null;preview.hidden=true;status.textContent='Plan refused: check owner identifiers, exact values, units and dependency cycles.';}sync();});
 const run=button('Execute local tasks',async()=>{
  if(controller||!prepared)return;
  const plan=prepared,abort=new AbortController(),runId='eh_batch_'+(++runSequence);
  controller=abort;current=null;result.replaceChildren();status.textContent='Executing admitted deterministic tasks…';sync();
  try{
   const r=await plan.execute({runId,signal:abort.signal,onExecutionEvent:publish});
   if(controller!==abort)return;
   current=r;status.textContent='Local run: '+r.result.status+' · '+r.result.artifacts.length+' admitted result(s)';
   for(const t of r.result.tasks){const a=r.result.artifacts.find(a=>a.taskId===t.id),card=E('article',undefined,'eh-batch-result');card.append(E('strong',t.id+' · '+t.status),E('p',t.agentId+' · deterministic task owner','eh-copy'));if(a)card.append(E('p',a.value.value+' '+a.value.unit,'eh-state'),E('small',a.value.digest));result.append(card);}
   result.append(E('p',r.qualification,'eh-copy'),E('small','Plan pin: '+r.planPin));
  }catch{status.textContent='Execution refused. No result claimed.';}finally{if(controller===abort){controller=null;sync();}}
 });run.id='eh-batch-run';
 const cancel=button('Cancel local run',()=>{controller?.abort();status.textContent='Cancellation requested.';});
 const observe=button('Inspect recorded execution',()=>{if(current)onObserve(current.result.runId);});
 const download=button('Download plan and results',()=>{if(current&&!controller&&current.result.artifacts.length)save(current);});
 const actions=E('div',undefined,'eh-actions');actions.append(add,review,run,cancel,observe,download);
 concurrency.addEventListener('change',invalidate);section.append(field('Concurrent task limit',concurrency),summary,rows,actions,status,preview,result);root.append(section);
 entries.push(nextRow());draw();
 return Object.freeze({section,cancel(){controller?.abort();}});
}
