import {createNetworkDesigner,composeProfile,parseDesign,designGraph,DESIGN_LIMITS} from './network-designer.js';
import {layoutGraph} from './layout.js';

const E=(tag,text,cls)=>{
 const n=document.createElement(tag);
 if(text!==undefined)n.textContent=text;
 if(cls)n.className=cls;
 return n;
};
const S=(tag,attrs={})=>{
 const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));
 return n;
};
function button(text,fn){
 const n=E('button',text);
 n.type='button';
 n.addEventListener('click',fn);
 return n;
}
function field(label,control){
 const n=E('label',label,'eh-field');
 n.append(control);
 return n;
}
function input(value='',max=60){
 const n=E('input');
 n.type='text';
 n.value=value;
 n.maxLength=max;
 return n;
}
function textarea(value='',max=12000){
 const n=E('textarea');
 n.value=value;
 n.maxLength=max;
 n.rows=5;
 return n;
}
function options(el,items,value){
 el.replaceChildren();
 for(const entry of items){
  const [id,label]=Array.isArray(entry)?entry:[entry,entry];
  const o=E('option',label);
  o.value=id;
  el.append(o);
 }
 if([...el.options].some(o=>o.value===value))el.value=value;
}
function select(items,value){
 const n=E('select');
 options(n,items,value);
 return n;
}
function errorCode(e){
 for(const c of [e?.code,e?.message])if(typeof c==='string'&&/^[A-Z_]{1,80}$/.test(c))return c;
 return 'DESIGN_REFUSED';
}
function download(name,text){
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const a=E('a');
 a.href=url;
 a.download=name;
 document.body.append(a);
 a.click();
 a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function mountNetworkDesigner(root){
 const section=E('section');
 section.id='eh-network-designer';
 section.append(E('p','OPEN AGENTIC WEB / LOCAL AUTHORING','eh-kicker'),E('h2','Network designer'),E('p','Create portable declarative agent definitions and connect optional delegation paths. The existing runtime compiler checks every accepted edit. This screen never executes a model, publishes an artifact, or grants authority.','eh-copy'));
 const designer=createNetworkDesigner();
 let selected='specialist';
 let imported=null;
 let busy=false;
 let dirty=false;
 let serial=0;
 let layoutMode='auto';
 const status=E('p','One local definition. No instances running.','eh-state');
 status.id='eh-design-status';
 status.setAttribute('role','status');
 const summary=E('div',undefined,'eh-design-metrics');
 const toolbar=E('div',undefined,'eh-actions');
 const undo=button('Undo accepted edit',()=>mutate(()=>designer.undo(),'Previous definition restored.'));
 const redo=button('Redo accepted edit',()=>mutate(()=>designer.redo(),'Next definition restored.'));
 const reset=button('Reset to single definition',()=>mutate(()=>designer.reset(),'Single-definition draft restored.'));
 const exportButton=button('Export validated network JSON',async()=>{
  if(busy||dirty)return;
  busy=true;
  sync();
  try{
   const record=await designer.exportBundle();
   download(record.name+'.network.json',record.text);
   digest.textContent='Exported exact bytes: '+record.digest+' · front '+record.front;
   status.textContent='Local validated definition exported. Nothing published.';
  }catch(e){status.textContent='Export refused: '+errorCode(e);}
  finally{busy=false;sync();}
 });
 const digest=E('p','','eh-copy');
 toolbar.append(undo,redo,reset,exportButton);
 const presets=E('details',undefined,'eh-timeline');
 presets.append(E('summary','Start from a topology template'));
 const profile=select([['single','Single specialist'],['parallel','Parallel delegation'],['hierarchy','Bounded hierarchy'],['challenge','Competing interpretations']],'single');
 const count=select(Array.from({length:12},(_,i)=>String(i+1)),'1');
 profile.addEventListener('change',()=>{
  count.disabled=profile.value==='single';
  if(profile.value==='single')count.value='1';
  else if(Number(count.value)<2)count.value='2';
 });
 const loadPreset=button('Replace with template',()=>{
  mutate(()=>designer.replace(composeProfile(profile.value,Number(count.value))),'Template admitted as a local definition. It has not executed.');
 });
 presets.append(E('p','Templates declare possible delegation, not mandatory agent invocation or independent expertise.','eh-copy'),field('Topology',profile),field('Definition count',count),loadPreset);
 const metadata=E('details',undefined,'eh-timeline');
 metadata.append(E('summary','Network metadata and limits'));
 const networkDescription=textarea('',2000);
 const networkSteps=select(Array.from({length:8},(_,i)=>String(i+1)),'4');
 const applyMetadata=button('Apply network metadata',()=>{
  mutate(()=>designer.edit({type:'metadata',description:networkDescription.value,steps:Number(networkSteps.value)}),'Network metadata updated.');
 });
 metadata.append(field('Public network description',networkDescription),field('Default maximum steps',networkSteps),applyMetadata);
 const layout=E('div',undefined,'eh-design-layout');
 const main=E('div');
 const inspector=E('aside',undefined,'eh-design-inspector');
 inspector.setAttribute('aria-label','Agent definition editor');
 const graphHead=E('div',undefined,'eh-design-graph-head');
 const layoutChoice=select(['auto','radial','layered','clustered','grid','list'],'auto');
 layoutChoice.addEventListener('change',()=>{
  layoutMode=layoutChoice.value;
  renderGraph();
 });
 graphHead.append(E('h3','Declared delegation graph'),field('Layout',layoutChoice));
 const graph=E('div',undefined,'eh-design-graph');
 const roster=E('div',undefined,'eh-design-roster');
 roster.setAttribute('aria-label','Agent definitions');
 const nameInput=input('specialist_1');
 const add=button('Add definition',()=>{
  mutate(()=>designer.edit({type:'add',name:nameInput.value.trim()}),'Definition added. Connect it to make it reachable.',nameInput.value.trim());
 });
 const addFields=E('div',undefined,'eh-design-fields');
 addFields.append(field('New definition ID',nameInput),add);
 const graphNote=E('p','','eh-copy');
 main.append(graphHead,graph,graphNote,addFields,roster);
 layout.append(main,inspector);
 const importPanel=E('details',undefined,'eh-timeline');
 importPanel.append(E('summary','Inspect a local network JSON file'));
 const file=E('input');
 file.type='file';
 file.accept='.json,application/json';
 const importStatus=E('p','No file inspected.','eh-state');
 importStatus.setAttribute('role','status');
 const inspect=button('Inspect selected network',async()=>{
  if(busy)return;
  const chosen=file.files?.[0];
  imported=null;
  if(!chosen||!chosen.size||chosen.size>DESIGN_LIMITS.bytes){
   importStatus.textContent='Select a JSON file no larger than 64 KiB.';
   sync();
   return;
  }
  busy=true;
  sync();
  try{
   const raw=new TextDecoder('utf-8',{fatal:true}).decode(await chosen.arrayBuffer());
   imported=parseDesign(raw);
   importStatus.textContent='Compiler accepted '+imported.definition.tools.length+' local definitions. Current draft unchanged.';
  }catch(e){importStatus.textContent='Import refused: '+errorCode(e);}
  finally{busy=false;sync();}
 });
 const use=button('Replace draft with inspected network',()=>{
  if(!imported||busy)return;
  const value=imported.definition;
  if(mutate(()=>designer.replace(value),'Inspected graph staged. No execution or publication.',value.tools[0].name)){
   imported=null;
   importStatus.textContent='Imported definition now editable.';
  }
  sync();
 });
 file.addEventListener('change',()=>{
  imported=null;
  importStatus.textContent='New file selected. Inspect it before use.';
  sync();
 });
 importPanel.append(field('Local graph file',file),inspect,use,importStatus);
 const rawPanel=E('details',undefined,'eh-timeline');
 rawPanel.append(E('summary','Current validated definition JSON'));
 const raw=E('pre','','eh-quote');
 rawPanel.append(raw);
 section.append(toolbar,status,digest,summary,presets,metadata,layout,importPanel,rawPanel);
 root.append(section);
 function mutate(fn,message,choose){
  if(busy)return false;
  try{
   const next=fn();
   selected=next.definition.tools.some(a=>a.name===(choose??selected))?choose??selected:next.front;
   dirty=false;
   digest.textContent='';
   status.textContent=message;
   render();
   return true;
  }catch(e){
   status.textContent='Edit refused: '+errorCode(e)+'. Previous validated definition preserved.';
   return false;
  }
 }
 function uniqueName(state){
  let name;
  do{name='specialist_'+(++serial);}while(state.definition.tools.some(a=>a.name===name));
  return name;
 }
 function choose(id,focus=false){
  selected=id;
  dirty=false;
  renderGraph();
  renderInspector();
  sync();
  if(focus)[...roster.querySelectorAll('button[data-definition]')].find(b=>b.dataset.definition===id)?.focus({preventScroll:true});
 }
 function renderGraph(){
  const state=designer.snapshot();
  const projection=designGraph(state);
  const positions=layoutGraph(projection,layoutMode);
  graph.replaceChildren();
  if(positions.mode==='list'){
   graph.append(E('p','List projection selected. Every definition remains editable below.','eh-copy'));
  }else{
   const svg=S('svg',{viewBox:'0 0 '+positions.width+' '+positions.height,role:'img','aria-label':'Declared delegation graph; use definition list to edit'});
   const byKey=new Map(positions.positions.map(p=>[p.key,p]));
   for(const edge of projection.edges){
    const a=byKey.get(edge.from),b=byKey.get(edge.to);
    if(!a||!b)continue;
    const line=S('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#92bdb8','stroke-width':1.6,'stroke-dasharray':'5 3'});
    const title=S('title');
    title.textContent=edge.from+' may delegate to '+edge.to;
    line.append(title);
    svg.append(line);
   }
   for(const node of projection.nodes){
    const p=byKey.get(node.key);
    if(!p)continue;
    const g=S('g',{transform:'translate('+p.x+' '+p.y+')'});
    const active=node.id===selected;
    const reachable=state.analysis.reachable.includes(node.id);
    const color=active?'#f6cc80':reachable?'#92d9b4':'#8e9ba3';
    const shape=S('rect',{x:-50,y:-24,width:100,height:48,rx:9,fill:'#172b32',stroke:color,'stroke-width':active?3:1.5});
    const title=S('text',{y:2,'text-anchor':'middle','font-size':11,fill:'#e8f1ef'});
    title.textContent=node.id.length>14?node.id.slice(0,12)+'…':node.id;
    const subtitle=S('text',{y:16,'text-anchor':'middle','font-size':9,fill:color});
    subtitle.textContent=node.front?'entry definition':reachable?'reachable':'unreachable';
    g.append(shape,title,subtitle);
    g.style.cursor='pointer';
    g.addEventListener('click',()=>choose(node.id,true));
    svg.append(g);
   }
   graph.append(svg);
  }
  graphNote.textContent=state.analysis.unreachable.length?state.analysis.unreachable.length+' disconnected definition(s). They cannot be reached from the current front.':'All definitions reachable from the current front. Actual calls are not implied.';
  roster.replaceChildren();
  for(const n of state.analysis.nodes){
   const b=button('',()=>choose(n.id,true));
   b.dataset.definition=n.id;
   b.className='eh-design-node';
   b.setAttribute('aria-pressed',String(n.id===selected));
   b.append(E('strong',n.id),E('small',(n.id===state.front?'Entry · ':'')+(n.reachable?'Reachable':'Disconnected')+' · '+n.outgoing.length+' delegation(s)'));
   roster.append(b);
  }
 }
 function renderInspector(){
  const state=designer.snapshot();
  const a=state.definition.tools.find(x=>x.name===selected);
  inspector.replaceChildren(E('p','DEFINITION EDITOR','eh-kicker'));
  if(!a){
   inspector.append(E('p','Select a definition.','eh-copy'));
   return;
  }
  inspector.append(E('h3',a.name),E('p','No live instance or model route.','eh-copy'));
  const rename=input(a.name);
  const description=textarea(a.function.description,2000);
  const instructions=textarea(a.instructions);
  const steps=select(Array.from({length:8},(_,i)=>String(i+1)),String(a.max_steps??state.definition.max_steps??8));
  const editorFields=E('div',undefined,'eh-design-fields');
  editorFields.append(field('Public description',description),field('Public instructions',instructions),field('Maximum steps',steps));
  const apply=button('Apply definition fields',()=>{
   mutate(()=>designer.edit({type:'update',name:a.name,description:description.value,instructions:instructions.value,steps:Number(steps.value)}),'Definition fields admitted.');
  });
  const renameButton=button('Rename definition',()=>mutate(()=>designer.edit({type:'rename',name:a.name,nextName:rename.value.trim()}),'Definition and all references renamed.',rename.value.trim()));
  const front=button('Make entry definition',()=>mutate(()=>designer.edit({type:'front',name:a.name}),'Canonical first definition changed.'));
  front.disabled=a.name===state.front;
  const remove=button('Remove definition and links',()=>mutate(()=>designer.edit({type:'remove',name:a.name}),'Definition removed together with its incoming links.'));
  remove.disabled=state.definition.tools.length===1;
  inspector.append(field('Definition ID',rename),renameButton,editorFields,apply,front,remove);
  const schema=E('details',undefined,'eh-timeline');
  schema.append(E('summary','Invocation parameter schema'));
  const schemaText=textarea(JSON.stringify(a.function.parameters,null,2),16384);
  const applySchema=button('Apply parameter schema',()=>mutate(()=>designer.edit({type:'parameters',name:a.name,text:schemaText.value}),'Parameter schema admitted by existing compiler.'));
  schema.append(field('Closed JSON schema',schemaText),applySchema);
  inspector.append(schema,E('h4','Optional delegation paths'));
  const choices=state.definition.tools.filter(x=>x.name!==a.name&&!a.tools.includes(x.name)).map(x=>x.name);
  const target=select(choices);
  const connect=button('Connect selected definition',()=>mutate(()=>designer.edit({type:'connect',from:a.name,to:target.value}),'Declared delegation admitted.'));
  connect.disabled=!choices.length;
  inspector.append(field('Delegate to',target),connect);
  if(!a.tools.length)inspector.append(E('p','No delegation required.','eh-copy'));
  for(const ref of a.tools){
   const row=E('div',undefined,'eh-design-link');
   row.append(E('strong',ref),button('Inspect '+ref,()=>choose(ref,true)),button('Disconnect '+ref,()=>mutate(()=>designer.edit({type:'disconnect',from:a.name,to:ref}),'Delegation removed.')));
   inspector.append(row);
  }
  for(const el of [description,instructions,steps,schemaText]){
   el.addEventListener('input',()=>{
    dirty=true;
    status.textContent='Unapplied field edits. Apply or select a definition to discard.';
    sync();
   });
  }
 }
 function sync(){
  const state=designer.snapshot();
  undo.disabled=busy||!state.canUndo;
  redo.disabled=busy||!state.canRedo;
  reset.disabled=busy;
  exportButton.disabled=busy||dirty;
  loadPreset.disabled=busy;
  applyMetadata.disabled=busy;
  add.disabled=busy||state.definition.tools.length>=DESIGN_LIMITS.agents;
  inspect.disabled=busy;
  use.disabled=busy||!imported;
  file.disabled=busy;
  profile.disabled=busy;
  count.disabled=busy||profile.value==='single';
  networkDescription.disabled=busy;
  networkSteps.disabled=busy;
  nameInput.disabled=busy;
  inspector.inert=busy;
 }
 function render(){
  const state=designer.snapshot();
  nameInput.value=uniqueName(state);
  networkDescription.value=state.definition.metadata.description;
  networkSteps.value=String(state.definition.max_steps??8);
  raw.textContent=JSON.stringify(state.definition,null,2);
  summary.replaceChildren();
  for(const [name,value] of [['Definitions',state.analysis.definitionCount],['Possible links',state.analysis.edgeCount],['Maximum depth',state.analysis.maxDepth],['Running instances',0]]){
   const box=E('div',undefined,'eh-metric');
   box.append(E('small',name),E('strong',String(value)));
   summary.append(box);
  }
  renderGraph();
  renderInspector();
  sync();
 }
 count.disabled=true;
 render();
 return section;
}
