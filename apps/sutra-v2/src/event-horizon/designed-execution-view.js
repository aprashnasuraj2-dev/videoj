import {prepareDesignedExecution} from './designed-execution.js';
const E=(tag,text,cls)=>{
 const n=document.createElement(tag);
 if(text!==undefined)n.textContent=text;
 if(cls)n.className=cls;
 return n;
};
function button(text,fn){
 const n=E('button',text);
 n.type='button';
 n.addEventListener('click',fn);
 return n;
}
function field(text,el){
 const n=E('label',text,'eh-field');
 n.append(el);
 return n;
}
function download(record){
 const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
 const a=E('a');
 a.href=url;
 a.download='sutra-designed-run-receipt.json';
 document.body.append(a);
 a.click();
 a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function mountDesignedExecution(root,{snapshot,isDirty,onStart,onEvent,onEnd,onObserve}){
 const section=E('section',undefined,'eh-designed-execution');
 section.id='eh-designed-execution';
 section.append(E('p','EXPLICIT MODEL EXECUTION','eh-kicker'),E('h3','Run this network'),E('p','Use only the current publisher’s configured model router. Your objective, declared instructions and derived messages may be sent to that model. No peer, search, private evidence or write capability is available here.','eh-copy'));
 const objective=E('textarea');
 objective.rows=3;
 objective.maxLength=1000;
 objective.placeholder='Enter a task for the current definitions';
 const budget=E('select');
 for(let i=1;i<=8;i++){
  const o=E('option',String(i));o.value=String(i);budget.append(o);
 }
 budget.value='4';
 const status=E('p','No model route contacted.','eh-state');
 status.id='eh-designed-status';
 status.setAttribute('role','status');
 const previewArea=E('div',undefined,'eh-designed-preview');
 const output=E('div',undefined,'eh-designed-result');
 const approval=E('input');
 approval.type='checkbox';
 const approveLabel=field('Approve this exact plan and its disclosed model requests',approval);
 let plan=null,controller=null,result=null,traceId=null,phase='idle',ticket=0;
 const prepare=button('Prepare exact execution plan',async()=>{
  if(controller||isDirty()||!objective.value.trim())return;
  const state=snapshot(),objectiveText=objective.value.trim(),calls=Number(budget.value),generation=++ticket;
  const abort=new AbortController();
  controller=abort;phase='preparing';plan=null;result=null;traceId=null;approval.checked=false;
  previewArea.replaceChildren();output.replaceChildren();
  status.textContent='Checking publisher route. No objective or model request sent.';
  sync();
  try{
   const current=()=>generation===ticket&&!isDirty()&&snapshot().revision===state.revision&&objective.value.trim()===objectiveText&&Number(budget.value)===calls;
   const p=await prepareDesignedExecution({definition:state.definition,name:state.name,objective:objectiveText,origin:location.origin,maxModelCalls:calls,signal:abort.signal,isCurrent:current});
   if(!current()||abort.signal.aborted)throw Error('STALE');
   plan=p;phase='previewed';
   renderPreview();
   status.textContent='Exact plan ready. No model request dispatched.';
  }catch{
   phase='refused';status.textContent='Preparation refused: no compatible configured route, changed draft or cancelled request. No model request dispatched.';
  }finally{if(controller===abort){controller=null;sync();}}
 });
 prepare.id='eh-designed-prepare';
 const run=button('Run approved network',async()=>{
  if(controller||!plan||!approval.checked||isDirty())return;
  const p=plan,abort=new AbortController();
  controller=abort;phase='running';result=null;output.replaceChildren();
  traceId=onStart?.();
  status.textContent='Running approved network…';
  sync();
  try{
   const r=await p.run({approvedPlanPin:p.planPin,signal:abort.signal,onEvent:e=>onEvent?.(traceId,e)});
   result=r;phase='completed';
   status.textContent='Completed candidate · '+r.receipt.agentCalls+' agent invocations · '+r.receipt.modelCalls+' model requests.';
   output.append(E('h4','Candidate result'),E('pre',r.text,'eh-quote'),E('p',r.receipt.qualification,'eh-copy'));
   onEnd?.(traceId,'completed');
  }catch(e){
   phase=abort.signal.aborted?'cancelled':'refused';
   const counts=e?.dispatch;
   status.textContent='Execution '+phase+' · '+(counts?.attempted??0)+' attempts · '+(counts?.responses??0)+' complete transport responses. No completed answer claimed.';
   if(counts?.outcome==='outcome_unknown')output.append(E('p','A dispatched request has an unknown remote outcome. Billing is unverified. Do not assume a refund or retry automatically.','eh-copy'));
   onEnd?.(traceId,phase);
  }finally{
   if(controller===abort){controller=null;plan=null;approval.checked=false;sync();}
  }
 });
 run.id='eh-designed-run';
 const cancel=button('Cancel network operation',()=>{
  if(controller){controller.abort();status.textContent='Cancellation requested.';}
 });
 const receipt=button('Download metadata receipt',()=>{if(result)download(result.receipt);});
 const observe=button('Inspect recorded runtime',()=>{if(traceId)onObserve?.(traceId);});
 const actions=E('div',undefined,'eh-actions');
 actions.append(prepare,run,cancel,observe,receipt);
 section.append(field('Network objective',objective),field('Maximum model requests',budget),status,previewArea,approveLabel,actions,output);
 root.append(section);
 function renderPreview(){
  const p=plan.preview;
  previewArea.replaceChildren(E('h4','Approval preview'),E('p',p.destination,'eh-state'),E('p',p.route.model+' · '+p.route.provider+' · '+p.route.backend,'eh-copy'),E('p',p.declaredDefinitions+' definitions · '+p.reachableDefinitions+' reachable · at most '+p.limits.maxModelCalls+' model requests · no external tools','eh-copy'),E('p','Exact objective: '+p.objective,'eh-copy'),E('small','Plan: '+plan.planPin,'eh-copy'));
  const details=E('details',undefined,'eh-timeline');
  details.append(E('summary','Exact instructions, schema, limits and disclosure'),E('pre',JSON.stringify(p,null,2),'eh-quote'));
  previewArea.append(details);
 }
 function invalidate(){
  if(phase==='running'||phase==='preparing'){
   ticket++;
   controller?.abort();
  }
  plan=null;approval.checked=false;previewArea.replaceChildren();
  if(!controller){phase='idle';status.textContent='Draft changed. Prepare a new exact plan.';}
  sync();
 }
 function sync(){
  const busy=!!controller;
  objective.disabled=busy;budget.disabled=busy;
  prepare.disabled=busy||isDirty()||!objective.value.trim();
  approval.disabled=busy||!plan;
  run.disabled=busy||!plan||!approval.checked||isDirty();
  cancel.disabled=!busy;
  receipt.disabled=busy||!result;
  observe.disabled=!traceId;
  section.dataset.phase=phase;
 }
 objective.addEventListener('input',invalidate);
 budget.addEventListener('change',invalidate);
 approval.addEventListener('change',sync);
 sync();
 return Object.freeze({invalidate,sync,cancel(){controller?.abort();},isRunning:()=>!!controller});
}
