import {capabilityCatalog,composeAlternatives} from './capabilities.js';
import {mountObjectiveIntake} from './objective-view.js';
const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn)=>{const b=E('button',text);b.type='button';b.addEventListener('click',fn);return b;};
function checkbox(label,description,checked=false){
 const input=E('input');input.type='checkbox';input.checked=checked;
 const box=E('label',undefined,'eh-check');const text=E('span');text.append(E('strong',label));if(description)text.append(E('small',description));box.append(input,text);return {box,input};
}
export function mountCompositionView(root,{openWorkflow,readObjective,onConversion}){
 const section=E('section',undefined,'eh-compose');section.id='eh-compose';
 section.append(E('p','CAPABILITY COMPOSITION / ADVISORY','eh-kicker'),E('h2','What work does the objective require?'),E('p','Select explicit capabilities rather than a fixed team. Compare minimal existing workflow combinations; each actual execution still requires its own validated plan.','eh-copy'));
 const selectors=E('div',undefined,'eh-capability-grid'),requirements=new Map();
 for(const c of capabilityCatalog){const {box,input}=checkbox(c.label,c.detail);requirements.set(c.id,input);selectors.append(box);}
 const boundaries=E('fieldset',undefined,'eh-boundaries');boundaries.append(E('legend','Composition boundaries'));
 const model=checkbox('Consider model-assisted routes','Not authorization to call a model.',true),host=checkbox('Consider trusted host research','Not authorization to contact a host.',true),peer=checkbox('Consider published peers','Separate artifact consent is still required.',false);
 boundaries.append(model.box,host.box,peer.box);
 const actions=E('div',undefined,'eh-actions');
 const examples=[['Exact calculation',['exact_quantity']],['Evidence investigation',['public_sources','semantic_intake','revision','proof_replay']],['Candidate plan + challenge',['candidate_plan','challenge']]];
 for(const [name,ids] of examples)actions.append(button(name,()=>{for(const [id,input] of requirements)input.checked=ids.includes(id);render();}));
 const reset=button('Clear selection',()=>{for(const input of requirements.values())input.checked=false;render();});actions.append(reset);
 const status=E('p',undefined,'eh-state');status.id='eh-compose-status';status.setAttribute('role','status');
 const results=E('div',undefined,'eh-alternatives');
 section.append(actions,selectors,boundaries,status,results);root.append(section);
 function render(){
  const selected=[...requirements].filter(([,input])=>input.checked).map(([id])=>id);
  const result=composeAlternatives(selected,{allowModel:model.input.checked,allowHost:host.input.checked,allowPeer:peer.input.checked});
  status.textContent=selected.length?result.alternatives.length+' candidate composition(s) · '+result.missing.length+' uncovered capability requirement(s)':'No required capabilities selected.';
  results.replaceChildren();
  if(result.missing.length){
   const gap=E('div',undefined,'eh-gap');gap.append(E('h3','Uncovered requirements'),E('p',result.missing.map(id=>capabilityCatalog.find(c=>c.id===id).label).join(' · ')),E('small','No participant is invented to cover a gap. Adjust scope or use an available supported workflow.'));results.append(gap);
  }
  for(const [i,a] of result.alternatives.entries()){
   const card=E('article',undefined,'eh-alternative');
   card.append(E('p','OPTION '+String(i+1).padStart(2,'0')+' · '+a.coverage.toUpperCase()+' COVERAGE','eh-kicker'),E('h3',a.workflows.map(w=>w.title).join(' + ')),E('p',a.workflows.length+' workflow(s) · '+a.modelRoutes+' model-assisted route(s) · '+a.hostRoutes+' host route(s)','eh-state'),E('small','Declared local agent definitions: '+(a.definitions??'Unknown')+' · actual agent instances: not instantiated'));
   const lane=E('div',undefined,'eh-workflow-lanes');
   for(const w of a.workflows){const row=E('div');row.append(E('strong',w.title),E('small',w.kind+' · '+w.details),button('Open '+w.title,()=>openWorkflow(w.id)));lane.append(row);}
   card.append(lane,E('p',a.cost,'eh-copy'));
   if(a.conditions.length){const ul=E('ul');for(const c of a.conditions)ul.append(E('li',c));card.append(E('h4','Conditions to resolve'),ul);}
   results.append(card);
  }
  results.append(E('p',result.qualification,'eh-copy'));
 }
 for(const input of [...requirements.values(),model.input,host.input,peer.input])input.addEventListener('change',render);
 mountObjectiveIntake(section,{readObjective,onConversion,onRequirements(ids){for(const [id,input] of requirements)input.checked=ids.includes(id);render();}});
 render();return section;
}
