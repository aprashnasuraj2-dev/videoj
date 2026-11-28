// Navigation over existing registered workspace views, never an execution router.
export const workspaceGroups=Object.freeze([
 Object.freeze({name:'Investigate',ids:Object.freeze(['runtime','composition','knowledge','notebook'])}),
 Object.freeze({name:'Compute & verify',ids:Object.freeze(['computation','batch','proof','scenarios'])}),
 Object.freeze({name:'Agentic web',ids:Object.freeze(['atlas','designer','archive'])})
]);
const descriptions=Object.freeze({
 runtime:'Observe actual execution and recorded dependencies',
 composition:'Interpret an objective and choose required capabilities',
 knowledge:'Inspect sources, interpretations and dependencies',
 notebook:'Write observations, hypotheses and counterexamples',
 computation:'Convert a typed quantity without a model',
 batch:'Build and execute an exact local task graph',
 proof:'Edit and replay a conditional proof',
 scenarios:'Compare exact alternative assumptions',
 atlas:'Inspect portable published agent definitions',
 designer:'Author and approve a local agent network',
 archive:'Inspect, compare and export retained execution metadata'
});
const aliases=Object.freeze({
 runtime:'activity graph topology trace mission',
 composition:'objective requirements plan route',
 knowledge:'evidence source meaning lineage',
 notebook:'notes research annotation',
 computation:'calculator units conversion',
 batch:'tasks dag schedule',
 proof:'verify receipt revision exact',
 scenarios:'sensitivity assumptions matrix',
 atlas:'discovery publisher passport',
 designer:'compose graph agents build execute',
 archive:'history replay journal export'
});
export function workspaceCommands(entries){
 if(!Array.isArray(entries)||entries.length>24)throw Error('NAVIGATION_REGISTRY');
 const byId=new Map(entries.map(e=>[e.id,e]));
 if(byId.size!==entries.length)throw Error('NAVIGATION_DUPLICATE');
 const commands=[];
 for(const group of workspaceGroups)for(const id of group.ids){
  const e=byId.get(id);
  if(!e)continue;
  commands.push(Object.freeze({id,name:e.name,group:group.name,description:descriptions[id]??'',aliases:aliases[id]??''}));
  byId.delete(id);
 }
 for(const e of byId.values())commands.push(Object.freeze({id:e.id,name:e.name,group:'Other tools',description:'',aliases:''}));
 return Object.freeze(commands);
}
export function searchWorkspaceCommands(commands,query){
 const tokens=String(query??'').trim().toLowerCase().slice(0,100).split(/\s+/).filter(Boolean);
 return commands.map((command,index)=>{
  const name=command.name.toLowerCase(),id=command.id.toLowerCase();
  const hay=[name,id,command.group,command.description,command.aliases].join(' ').toLowerCase();
  if(!tokens.every(t=>hay.includes(t)))return null;
  const score=tokens.reduce((sum,t)=>sum+(name===t?10:name.startsWith(t)?6:id===t?5:name.includes(t)?3:1),0);
  return {command,index,score};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.command);
}
const E=(tag,text,cls)=>{
 const el=document.createElement(tag);
 if(text!==undefined)el.textContent=text;
 if(cls)el.className=cls;
 return el;
};
function button(text,action){
 const b=E('button',text);
 b.type='button';
 b.addEventListener('click',action);
 return b;
}
export function mountWorkspaceNavigation(root,entries,{onSelect}){
 const commands=workspaceCommands(entries);
 const nav=E('nav',undefined,'eh-tabs');
 nav.setAttribute('aria-label','Adaptive workspace views');
 const groups=E('div',undefined,'eh-nav-groups');
 const controls=E('div',undefined,'eh-nav-control');
 const current=E('div',undefined,'eh-nav-current');
 const activeTitle=E('strong','Runtime');
 const activeDescription=E('small',descriptions.runtime);
 current.append(E('small','CURRENT WORKSPACE'),activeTitle,activeDescription);
 const launch=button('Find a workspace',()=>open());
 launch.id='eh-workspace-launcher';
 controls.append(current,launch);
 const buttons=new Map();
 for(const group of [...new Set(commands.map(c=>c.group))]){
  const section=E('div',undefined,'eh-nav-group');
  section.append(E('span',group,'eh-nav-label'));
  const items=E('div',undefined,'eh-nav-items');
  for(const command of commands.filter(c=>c.group===group)){
   const b=button(command.name,()=>onSelect(command.id));
   b.dataset.view=command.id;
   b.setAttribute('aria-controls',entries.find(e=>e.id===command.id).panelId);
   b.setAttribute('aria-pressed','false');
   b.title=command.description;
   buttons.set(command.id,b);
   items.append(b);
  }
  section.append(items);
  groups.append(section);
 }
 nav.append(controls,groups);
 root.append(nav);
 const dialog=E('dialog',undefined,'eh-command-dialog');
 dialog.setAttribute('aria-labelledby','eh-command-heading');
 const heading=E('h3','Open a workspace');
 heading.id='eh-command-heading';
 const input=E('input');
 input.type='search';input.maxLength=100;input.placeholder='Search: proof, notes, agents…';
 input.setAttribute('aria-label','Search workspace tools');
 const results=E('div',undefined,'eh-command-results');
 const count=E('p','','eh-copy');
 count.setAttribute('role','status');
 const close=button('Close workspace finder',()=>dialog.close());
 dialog.append(heading,E('p','Navigation only — opening a workspace never authorizes execution.','eh-copy'),input,count,results,close);
 root.append(dialog);
 let visible=[],index=0,previousFocus=null;
 function choose(id){
  dialog.close();
  onSelect(id);
  buttons.get(id)?.focus({preventScroll:true});
 }
 function render(){
  visible=searchWorkspaceCommands(commands,input.value);
  index=0;
  results.replaceChildren();
  count.textContent=visible.length+' matching workspace'+(visible.length===1?'':'s');
  for(const command of visible){
   const b=button('',()=>choose(command.id));
   b.className='eh-command-item';
   b.dataset.command=command.id;
   b.append(E('strong',command.name),E('small',command.group+' · '+command.description));
   results.append(b);
  }
  if(!visible.length)results.append(E('p','No matching workspace. Try a different search.','eh-copy'));
  highlight();
 }
 function highlight(){
  [...results.querySelectorAll('button')].forEach((b,i)=>b.dataset.highlight=String(i===index));
 }
 function open(){
  if(dialog.open)return;
  previousFocus=document.activeElement;
  input.value='';
  render();
  dialog.showModal();
  input.focus();
 }
 input.addEventListener('input',render);
 input.addEventListener('keydown',e=>{
  if(!visible.length)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();index=(index+(e.key==='ArrowDown'?1:-1)+visible.length)%visible.length;highlight();
   results.querySelectorAll('button')[index]?.scrollIntoView({block:'nearest'});
  }else if(e.key==='Enter'){
   e.preventDefault();choose(visible[index].id);
  }
 });
 dialog.addEventListener('close',()=>{
  if(previousFocus?.isConnected&&document.activeElement===document.body)previousFocus.focus({preventScroll:true});
  previousFocus=null;
 });
 return Object.freeze({nav,select(id){
  const c=commands.find(c=>c.id===id);
  if(!c)return;
  activeTitle.textContent=c.name;activeDescription.textContent=c.description;
  for(const [key,b] of buttons)b.setAttribute('aria-pressed',String(key===id));
 },destroy(){if(dialog.open)dialog.close();dialog.remove();nav.remove();}});
}
