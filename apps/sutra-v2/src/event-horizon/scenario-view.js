import {prepareScenarios,runScenarios,parseAxisValues,summarizeScenarios,resultMatrix,exportScenarioCase,exportScenarioSummary,SCENARIO_LIMITS} from './scenario-model.js';
import {starterGraph,graphText,parseGraph,formatDimension} from './proof-model.js';

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
function field(name,control){
 const l=E('label',name,'eh-field');
 l.append(control);
 return l;
}
function options(el,values,selected){
 el.replaceChildren();
 for(const x of values){
  const [id,label]=Array.isArray(x)?x:[x,x];
  const o=E('option',label);
  o.value=id;
  el.append(o);
 }
 if([...el.options].some(o=>o.value===selected))el.value=selected;
}
function save(name,text){
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const a=E('a');
 a.href=url;
 a.download=name;
 document.body.append(a);
 a.click();
 a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function errorCode(e){return /^[A-Z_]{1,80}$/.test(e?.message??'')?e.message:'SCENARIO_REFUSED';}
function display(outcome){
 if(!outcome)return 'Not computed';
 if(typeof outcome.value==='string')return outcome.value.replace(/\/1$/,'')+' · '+formatDimension(outcome.dimension);
 return outcome.status.replaceAll('_',' ')+(outcome.reason?' · '+outcome.reason:'');
}
function semanticColor(o){
 if(!o)return 'unknown';
 if(o.status==='constraint_satisfied')return 'satisfied';
 if(o.status==='constraint_refuted')return 'refuted';
 if(['incompatible','indeterminate','blocked'].includes(o.status))return 'blocked';
 return 'quantity';
}
export function mountScenarioView(root){
 const section=E('section');
 section.id='eh-scenarios';
 section.append(E('p','EXACT SENSITIVITY / CONDITIONAL SCENARIOS','eh-kicker'),E('h2','Scenario matrix'),E('p','Vary one or two declared inputs and evaluate every scenario with SUTRA’s exact kernel. Compare constraints and outputs without assigning probabilities, financial advice or real-world validity.','eh-copy'));
 let nodes=starterGraph();
 let plan=null;
 let result=null;
 let controller=null;
 let selected=null;
 let imported=null;
 let reading=false;
 const source=E('p','Using declared capacity example.','eh-state');
 const status=E('p','Review a scenario plan before evaluation.','eh-state');
 status.id='eh-scenario-status';
 status.setAttribute('role','status');
 const reset=button('Use capacity example',()=>{
  stage(starterGraph(),'Declared capacity example');
 });
 const importPanel=E('details',undefined,'eh-timeline');
 importPanel.append(E('summary','Import an admitted graph JSON'));
 const file=E('input');
 file.type='file';
 file.accept='.json,application/json';
 const importStatus=E('p','No file inspected.','eh-copy');
 const inspect=button('Inspect graph file',async()=>{
  if(controller||reading)return;
  imported=null;
  const chosen=file.files?.[0];
  if(!chosen||!chosen.size||chosen.size>65536){
   importStatus.textContent='Select a graph JSON no larger than 64 KiB.';
   sync();
   return;
  }
  reading=true;
  sync();
  try{
   imported=parseGraph(new TextDecoder('utf-8',{fatal:true}).decode(await chosen.arrayBuffer())).nodes;
   importStatus.textContent=imported.length+' structurally valid declarations. Current graph unchanged.';
  }catch(e){importStatus.textContent='Import refused: '+errorCode(e);}
  finally{reading=false;sync();}
 });
 const use=button('Use inspected graph',()=>{
  if(!imported||controller||reading)return;
  stage(imported,'Inspected local graph');
  imported=null;
  importStatus.textContent='Graph staged for scenario planning.';
  sync();
 });
 file.addEventListener('change',()=>{
  imported=null;
  importStatus.textContent='New file selected.';
  sync();
 });
 importPanel.append(field('Graph JSON file',file),inspect,use,importStatus);
 const first=E('select');
 const second=E('select');
 const firstValues=E('textarea');
 const secondValues=E('textarea');
 for(const t of [firstValues,secondValues]){
  t.rows=3;
  t.maxLength=2048;
  t.placeholder='90, 100, 110';
 }
 const output=E('select');
 const form=E('div',undefined,'eh-scenario-fields');
 form.append(field('First declared input',first),field('Exact first input values',firstValues),field('Second input (optional)',second),field('Exact second input values',secondValues),field('Output or constraint to inspect',output));
 const preview=E('div',undefined,'eh-scenario-preview');
 const review=button('Review scenario plan',()=>{
  try{
   plan=prepareScenarios({nodes,first:{id:first.value,values:parseAxisValues(firstValues.value)},second:second.value?{id:second.value,values:parseAxisValues(secondValues.value)}:null,output:output.value});
   result=null;
   selected=null;
   status.textContent='Plan validated: '+plan.caseCount+' cases · '+plan.nodeCases+' node-case evaluations before reuse.';
   renderPreview();
   renderResults();
  }catch(e){
   plan=null;
   status.textContent='Plan refused: '+errorCode(e);
   renderPreview();
  }
  sync();
 });
 review.id='eh-scenario-review';
 const run=button('Evaluate scenarios locally',async()=>{
  if(!plan||controller||reading)return;
  const abort=new AbortController();
  controller=abort;
  const captured=plan;
  result=null;
  selected=null;
  status.textContent='Evaluating '+captured.caseCount+' exact scenarios…';
  renderResults();
  sync();
  try{
   const computed=await runScenarios(captured,{signal:abort.signal,onProgress(p){
    if(controller===abort)status.textContent=p.completed+' / '+p.total+' scenarios replayed · '+p.executed+' node executions · '+p.reused+' reused receipts';
   }});
   if(controller!==abort)return;
   result=computed;
   selected=result.outcomes[0]?.id??null;
   status.textContent='Scenario run '+result.status+' · '+result.outcomes.length+' retained exact results.';
   renderResults();
  }catch(e){status.textContent='Scenario execution refused: '+errorCode(e);}
  finally{
   if(controller===abort){controller=null;sync();}
  }
 });
 run.id='eh-scenario-run';
 const cancel=button('Cancel scenarios',()=>{
  controller?.abort();
  status.textContent='Cancellation requested. Only completed replayed results may be retained.';
 });
 const exportSummary=button('Download scenario summary',()=>{
  if(result)save('sutra-scenario-summary.json',exportScenarioSummary(result));
 });
 const actions=E('div',undefined,'eh-actions');
 actions.append(review,run,cancel,exportSummary);
 const metrics=E('div',undefined,'eh-scenario-metrics');
 const matrix=E('div',undefined,'eh-scenario-table');
 const inspector=E('aside',undefined,'eh-right');
 inspector.setAttribute('aria-label','Scenario receipt inspector');
 const resultPanel=E('div',undefined,'eh-scenario-results');
 resultPanel.append(matrix,inspector);
 const qualification=E('p','','eh-copy');
 section.append(source,reset,importPanel,form,actions,status,preview,metrics,resultPanel,qualification);
 root.append(section);
 function sync(){
  const busy=!!controller||reading;
  for(const el of [first,second,firstValues,output,review,reset,file,inspect])el.disabled=busy;
  secondValues.disabled=busy||!second.value;
  run.disabled=busy||!plan;
  cancel.disabled=!controller;
  exportSummary.disabled=busy||!result;
  use.disabled=busy||!imported;
 }
 function invalidate(){
  if(controller)return;
  plan=null;
  result=null;
  selected=null;
  status.textContent='Scenario inputs changed. Review a new plan.';
  renderPreview();
  renderResults();
  sync();
 }
 function stage(next,label='Current proof graph'){
  if(controller||reading)return false;
  const admitted=parseGraph(graphText(next));
  nodes=admitted.nodes;
  source.textContent=label+' · '+nodes.length+' declarations.';
  const inputs=nodes.filter(n=>n.kind==='input');
  const ids=inputs.map(n=>[n.id,n.id+' · '+n.value+' · '+formatDimension(n.dimension)]);
  options(first,ids,inputs[0]?.id);
  options(second,[['','One input only'],...ids],'');
  options(output,nodes.map(n=>[n.id,n.id+' · '+n.kind]),nodes.find(n=>n.kind==='constraint')?.id??nodes.at(-1)?.id);
  firstValues.value=inputs[0]?.id==='available'?'80, 100, 120, 140':inputs[0]?.value??'';
  secondValues.value='';
  invalidate();
  return true;
 }
 for(const el of [first,second,firstValues,secondValues,output])el.addEventListener('input',invalidate);
 function renderPreview(){
  preview.replaceChildren();
  if(!plan)return;
  const details=E('details',undefined,'eh-timeline');
  details.append(E('summary','Reviewed scenario plan'));
  const pairs=[
   'First input: '+plan.first.id+' = '+plan.first.values.join(', '),
   plan.second?'Second input: '+plan.second.id+' = '+plan.second.values.join(', '):'One input only',
   'Output: '+plan.output,
   plan.caseCount+' cases · '+plan.nodeCases+' node-case upper bound',
   'No external contact or model calls'
  ];
  for(const text of pairs)details.append(E('p',text,'eh-copy'));
  preview.append(details);
 }
 function renderInspector(){
  inspector.replaceChildren(E('p','EXACT SCENARIO RECEIPT','eh-kicker'));
  const record=result?.outcomes.find(x=>x.id===selected);
  if(!record){
   inspector.append(E('h3','Select a computed cell'),E('p','No outcome is inferred for unfinished scenarios.','eh-copy'));
   return;
  }
  inspector.append(E('h3',record.id),E('p',display(record.receipt.outcome),'eh-state'));
  for(const [id,value] of Object.entries(record.changes))inspector.append(E('p',id+' = '+value,'eh-copy'));
  inspector.append(E('small','Graph: '+record.graphDigest,'eh-copy'),E('small','Receipt: '+record.receipt.receiptDigest,'eh-copy'));
  const details=E('details',undefined,'eh-timeline');
  details.append(E('summary','Canonical receipt'),E('pre',JSON.stringify(record.receipt,null,2),'eh-quote'));
  inspector.append(details,button('Download this replayable case',()=>save('sutra-'+record.id+'.json',exportScenarioCase(result,record.id))));
 }
 function renderResults(){
  metrics.replaceChildren();
  matrix.replaceChildren();
  qualification.textContent='';
  if(!result){
   matrix.append(E('p','No retained scenario result.','eh-copy'));
   renderInspector();
   return;
  }
  const summary=summarizeScenarios(result);
  const metricValues=[
   ['Completed',summary.completed+' / '+summary.total],
   ['Satisfied',summary.statuses.constraint_satisfied??0],
   ['Refuted',summary.statuses.constraint_refuted??0],
   ['Reused receipts',result.stats.reused]
  ];
  for(const [name,value] of metricValues){
   const m=E('div',undefined,'eh-metric');
   m.append(E('small',name),E('strong',String(value)));
   metrics.append(m);
  }
  if(summary.minimum&&summary.maximum){
   const m=E('p','Comparable exact range: '+summary.minimum.value+' to '+summary.maximum.value+' · '+formatDimension(summary.minimum.dimension),'eh-copy');
   metrics.append(m);
  }
  const table=E('table');
  const caption=E('caption',result.plan.output+' · conditional outcomes');
  table.append(caption);
  const thead=E('thead'),header=E('tr');
  const corner=E('th',result.plan.first.id+(result.plan.second?' / '+result.plan.second.id:''));
  corner.scope='col';
  header.append(corner);
  for(const v of result.plan.second?.values??['Output']){
   const th=E('th',v);th.scope='col';header.append(th);
  }
  thead.append(header);
  table.append(thead);
  const tbody=E('tbody');
  for(const row of resultMatrix(result)){
   const tr=E('tr');
   const rowHead=E('th',row.value);
   rowHead.scope='row';
   tr.append(rowHead);
   for(const cell of row.cells){
    const td=E('td');
    const b=button(display(cell.outcome),()=>{
     selected=cell.id;
     for(const el of table.querySelectorAll('button[data-scenario]'))el.setAttribute('aria-pressed',String(el.dataset.scenario===selected));
     renderInspector();
    });
    b.dataset.scenario=cell.id;
    b.dataset.state=semanticColor(cell.outcome);
    b.disabled=!cell.available;
    b.setAttribute('aria-pressed',String(cell.id===selected));
    b.setAttribute('aria-label',row.value+(cell.value!==null?', '+cell.value:'')+' · '+display(cell.outcome));
    td.append(b);
    tr.append(td);
   }
   tbody.append(tr);
  }
  table.append(tbody);
  matrix.append(table);
  qualification.textContent=result.qualification;
  renderInspector();
 }
 stage(nodes,'Declared capacity example');
 return Object.freeze({section,stage,cancel(){controller?.abort();}});
}
