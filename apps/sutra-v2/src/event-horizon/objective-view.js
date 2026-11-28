import {analyzeObjective,confirmRequirements} from './objective-intake.js';
import {capabilityCatalog} from './capabilities.js';

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
function field(name,el){
 const label=E('label',name,'eh-field');
 label.append(el);
 return label;
}
export function mountObjectiveIntake(root,{readObjective,onRequirements,onConversion}){
 const panel=E('section',undefined,'eh-objective-intake');
 panel.id='eh-objective-intake';
 panel.append(E('h3','Interpret the objective locally'),E('p','A strict whole-objective conversion parser can identify a zero-agent calculation. For broader objectives, inspect lexical suggestions and confirm the actual requirements yourself.','eh-copy'));
 const objective=E('textarea');
 objective.rows=3;
 objective.maxLength=1000;
 objective.placeholder='Example: Convert 2.5 kN to N';
 const status=E('p','No objective analyzed.','eh-state');
 status.id='eh-intake-status';
 status.setAttribute('role','status');
 const results=E('div',undefined,'eh-intake-results');
 let analysis=null;
 const read=button('Use current research objective',()=>{
  objective.value=String(readObjective()??'').slice(0,1000);
  invalidate();
  objective.focus();
 });
 const analyze=button('Analyze objective locally',()=>{
  try{
   analysis=analyzeObjective(objective.value);
   render();
  }catch{
   analysis=null;
   status.textContent='Objective refused by local input bounds.';
   results.replaceChildren();
  }
 });
 const clear=button('Clear objective draft',()=>{
  objective.value='';
  invalidate();
 });
 const actions=E('div',undefined,'eh-actions');
 actions.append(read,analyze,clear);
 panel.append(field('Objective to interpret',objective),actions,status,results);
 root.prepend(panel);
 objective.addEventListener('input',invalidate);
 function invalidate(){
  analysis=null;
  results.replaceChildren();
  status.textContent='Objective changed. Analyze before choosing a route.';
 }
 function renderConversion(a){
  if(!a.conversion)return;
  const box=E('div',undefined,'eh-intake-conversions');
  if(!a.conversion.candidates.length){
   box.append(E('h4','No admitted conversion'),E('p',a.conversion.reason.replaceAll('_',' '),'eh-copy'));
  }else{
   box.append(E('h4',a.conversion.candidates.length===1?'Direct exact calculation candidate':'Choose the intended quantity kind'));
   for(const item of a.conversion.candidates){
    const row=E('article',undefined,'eh-intake-candidate');
    row.append(E('strong',item.value+' '+item.from+' → '+item.to),E('p','Declared quantity kind: '+item.kind,'eh-copy'),E('small','Zero model, peer or search calls.'),button('Stage '+item.kind+' conversion',()=>{
     if(analysis!==a||objective.value.trim()!==a.text)return;
     onConversion(item);
    }));
    box.append(row);
   }
  }
  results.append(box);
 }
 function render(){
  const a=analysis;
  results.replaceChildren();
  const states={empty:'Enter an objective',closed_conversion:'Closed conversion candidate identified',clarify_quantity:'Quantity kind is ambiguous',unsupported_conversion:'Closed conversion refused',review_required:'Review suggested requirements',unclassified:'No supported intent identified'};
  status.textContent=states[a.status];
  if(a.status==='empty')return;
  renderConversion(a);
  if(a.status==='unclassified')results.append(E('p','No workflow is assumed. Select requirements manually below, or refine your objective.','eh-copy'));
  const choices=E('div',undefined,'eh-capability-grid');
  const controls=new Map();
  const suggestions=new Map(a.hints.map(h=>[h.id,h]));
  for(const c of capabilityCatalog){
   const hint=suggestions.get(c.id);
   const input=E('input');
   input.type='checkbox';
   // Suggestions are not silently confirmed. Require user selection.
   input.checked=false;
   const label=E('label',undefined,'eh-check');
   const text=E('span');
   text.append(E('strong',c.label),E('small',hint?hint.reason+' · '+hint.matches.map(m=>m.text).join(', '):'Not suggested; choose if required'));
   label.append(input,text);
   choices.append(label);
   controls.set(c.id,input);
  }
  const selectHints=button('Select lexical suggestions for review',()=>{
   for(const [id,input] of controls)input.checked=suggestions.has(id);
  });
  const apply=button('Apply selected capability requirements',()=>{
   if(analysis!==a||objective.value.trim()!==a.text)return;
   const selected=[...controls].filter(([,input])=>input.checked).map(([id])=>id);
   const decision=confirmRequirements(a,selected);
   onRequirements(decision.requirements);
   status.textContent=selected.length+' user-selected requirements staged in composer.';
  });
  const toolbar=E('div',undefined,'eh-actions');
  toolbar.append(selectHints,apply);
  results.append(E('h4','Confirm required capabilities'),choices,toolbar,E('p',a.qualification,'eh-copy'));
 }
 return panel;
}
