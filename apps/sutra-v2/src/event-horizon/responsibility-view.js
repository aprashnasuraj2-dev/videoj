import {composeResponsibilities,RESPONSIBILITY_LIMITS} from './responsibility-composer.js';

const E=(tag,text,cls)=>{
 const n=document.createElement(tag);
 if(text!==undefined)n.textContent=text;
 if(cls)n.className=cls;
 return n;
};
function button(text,fn){
 const b=E('button',text);
 b.type='button';
 b.addEventListener('click',fn);
 return b;
}
function field(name,control){
 const l=E('label',name,'eh-field');
 l.append(control);
 return l;
}
function input(value,max){
 const n=E('input');
 n.type='text';n.value=value;n.maxLength=max;
 return n;
}
function area(value){
 const n=E('textarea');
 n.rows=3;n.maxLength=RESPONSIBILITY_LIMITS.instructions;n.value=value;
 return n;
}
export function mountResponsibilityComposer(root,{onStage}){
 const section=E('details',undefined,'eh-responsibility-composer');
 section.id='eh-responsibility-composer';
 section.append(E('summary','Build a team from responsibilities'),E('p','Name the actual responsibilities for this objective. Compare different numbers of definitions without a predetermined agent cast. No external capability or model call is authorized here.','eh-copy'));
 let sequence=0;
 const next=()=>({id:'responsibility_'+(++sequence),label:'',instructions:''});
 let rows=[next()];
 let composed=null;
 const budget=E('select');
 for(let i=1;i<=8;i++){
  const o=E('option',String(i));o.value=String(i);budget.append(o);
 }
 budget.value='4';
 const rowsArea=E('div',undefined,'eh-responsibility-rows');
 const status=E('p','Declare responsibilities to compare arrangements.','eh-state');
 status.id='eh-responsibility-status';
 status.setAttribute('role','status');
 const results=E('div',undefined,'eh-responsibility-results');
 const add=button('Add responsibility',()=>{
  if(rows.length>=RESPONSIBILITY_LIMITS.duties)return;
  rows.push(next());
  drawRows();
  invalidate();
 });
 const compare=button('Compare team arrangements',()=>{
  try{
   composed=composeResponsibilities(rows.map(x=>({...x})),{maxModelCalls:Number(budget.value)});
   status.textContent=composed.alternatives.length+' validated structural arrangements · no execution';
   drawResults();
  }catch{
   composed=null;
   status.textContent='Composition refused: use unique valid identifiers, nonempty labels and instructions.';
   results.replaceChildren();
  }
 });
 const actions=E('div',undefined,'eh-actions');
 actions.append(add,compare);
 section.append(field('Model-call cap for feasibility comparison',budget),rowsArea,actions,status,results);
 root.append(section);
 budget.addEventListener('change',invalidate);
 function invalidate(){
  composed=null;results.replaceChildren();
  status.textContent='Responsibilities changed. Compare new arrangements.';
 }
 function drawRows(){
  rowsArea.replaceChildren();
  for(const [i,r] of rows.entries()){
   const row=E('article',undefined,'eh-responsibility-row');
   row.dataset.responsibility=String(i);
   const id=input(r.id,50),label=input(r.label,RESPONSIBILITY_LIMITS.label),instructions=area(r.instructions);
   label.placeholder='Example: Route planning';
   instructions.placeholder='Describe the work and its acceptance limits';
   for(const [key,control] of [['id',id],['label',label],['instructions',instructions]])control.addEventListener('input',()=>{
    r[key]=control.value;
    invalidate();
   });
   const remove=button('Remove responsibility '+(i+1),()=>{
    rows=rows.filter(x=>x!==r);
    drawRows();invalidate();
   });
   remove.disabled=rows.length===1;
   row.append(E('h4','Responsibility '+(i+1)),field('Definition identifier',id),field('Responsibility label',label),field('Responsibility instructions',instructions),remove);
   rowsArea.append(row);
  }
  add.disabled=rows.length>=RESPONSIBILITY_LIMITS.duties;
 }
 function drawResults(){
  const c=composed;
  results.replaceChildren();
  if(!c)return;
  for(const a of c.alternatives){
   const card=E('article',undefined,'eh-responsibility-option');
   card.dataset.arrangement=a.id;
   card.append(E('p',a.fullVisitFeasible?'WITHIN MINIMUM CALL CAP':'FULL VISIT EXCEEDS CAP','eh-kicker'),E('h4',a.definitionCount+' definition'+(a.definitionCount===1?'':'s')+' for '+a.responsibilityCount+' responsibilities'),E('p','At least '+a.minFullVisitModelCalls+' model request'+(a.minFullVisitModelCalls===1?'':'s')+' to visit every definition once; selected cap '+a.maxModelCalls,'eh-state'));
   const roster=E('div',undefined,'eh-responsibility-assignments');
   for(const group of a.assignments){
    const item=E('div');
    item.append(E('strong',group.definition+(group.entry?' · entry':'')));
    const list=E('ul');
    for(const id of group.duties)list.append(E('li',c.duties.find(x=>x.id===id).label));
    item.append(list);roster.append(item);
   }
   card.append(roster,E('p',a.qualification,'eh-copy'),button('Replace designer draft with '+a.definitionCount+' definition'+(a.definitionCount===1?'':'s'),()=>{
    if(c!==composed)return;
    onStage(a.definition,a.maxModelCalls);
   }));
   results.append(card);
  }
  results.append(E('p',c.qualification,'eh-copy'));
 }
 drawRows();
 return section;
}
