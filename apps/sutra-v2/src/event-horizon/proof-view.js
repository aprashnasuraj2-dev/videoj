import {arithmetic,comparisons,PROOF_LIMITS,createProofSession,makeInput,makeOperation,formatDimension,proofProjection,dependencyTrace,outcomeSummary,exportProof,inspectProofArchive,parseGraph} from './proof-model.js';
import {layoutGraph} from './layout.js';

const E=(tag,text,cls)=>{
 const e=document.createElement(tag);
 if(text!==undefined)e.textContent=text;
 if(cls)e.className=cls;
 return e;
};
const S=(tag,attrs={})=>{
 const e=document.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));
 return e;
};
function button(text,fn){
 const b=E('button',text);
 b.type='button';
 b.addEventListener('click',fn);
 return b;
}
function label(name,control){
 const l=E('label',name,'eh-field');
 l.append(control);
 return l;
}
function input(value='',max=160){
 const e=E('input');
 e.type='text';
 e.maxLength=max;
 e.value=value;
 return e;
}
function optionList(select,items,value){
 select.replaceChildren();
 for(const item of items){
  const [id,name]=Array.isArray(item)?item:[item,item];
  const o=E('option',name);
  o.value=id;
  select.append(o);
 }
 if([...select.options].some(o=>o.value===value))select.value=value;
}
function select(items,value){
 const e=E('select');
 optionList(e,items,value);
 return e;
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
function describe(outcome){
 if(!outcome)return 'Not evaluated';
 const state=outcome.status.replaceAll('_',' ');
 return outcome.value===undefined?state+(outcome.reason?' · '+outcome.reason:''):outcome.value.replace(/\/1$/,'')+' · '+formatDimension(outcome.dimension)+' · '+state;
}
const displayError=e=>/^[A-Z_]{1,80}$/.test(e?.message??'')?e.message:'PROOF_REFUSED';
const opLabels={add:'Add (+)',sub:'Subtract (−)',mul:'Multiply (×)',div:'Divide (÷)',eq:'Equal (=)',le:'At most (≤)',lt:'Less than (<)',ge:'At least (≥)',gt:'Greater than (>)'};
function definitions(items){
 const dl=E('dl',undefined,'eh-details');
 for(const [name,value] of items){
  dl.append(E('dt',name),E('dd',String(value??'Unknown')));
 }
 return dl;
}
export function mountProofView(root){
 const section=E('section');
 section.id='eh-proof';
 const title=E('h2','Proof workbench');
 section.append(E('p','EXACT KERNEL / REVISION LAB','eh-kicker'),title,E('p','Construct a typed computation graph, inspect every exact receipt, retain a baseline, and compare a revised result. No model or external contact is required.','eh-copy'));
 const session=createProofSession();
 let selected=null;
 let editing=null;
 let busy=false;
 let imported=null;
 let mode='all';
 let query='';
 let serial=0;
 const status=E('p','Declared example ready; evaluate before claiming a result.','eh-state');
 status.id='eh-proof-status';
 status.setAttribute('role','status');
 const counters=E('div',undefined,'eh-proof-counts');
 const actions=E('div',undefined,'eh-actions');
 const evaluate=button('Evaluate exact graph',async()=>{
  if(busy)return;
  busy=true;
  status.textContent='Evaluating and replaying the graph…';
  sync();
  try{
   const result=await session.evaluate();
   status.textContent='Exact graph evaluated and replayed locally · '+result.report.receipts.length+' receipts.';
  }catch(e){
   status.textContent='Evaluation refused: '+displayError(e);
  }finally{
   busy=false;
   render();
  }
 });
 evaluate.id='eh-proof-evaluate';
 const baseline=button('Retain current baseline',()=>{
  try{
   session.retain();
   status.textContent='Baseline retained. Edit declarations to compare a new version.';
  }catch(e){status.textContent=displayError(e);}
  render();
 });
 const clear=button('Clear baseline',()=>{
  session.clearBaseline();
  render();
 });
 const reset=button('Reset example',()=>{
  session.reset();
  selected=null;
  editing=null;
  imported=null;
  resetEditor();
  status.textContent='Example reset; no evaluated result.';
  render();
 });
 const download=button('Download replayable proof',()=>{
  const state=session.snapshot();
  if(state.current){try{save('sutra-proof.json',exportProof(state.current));}catch(e){status.textContent='Export refused: '+displayError(e);}}
 });
 const graphDownload=button('Download graph JSON',()=>{
  save('sutra-graph.json',JSON.stringify({schemaVersion:1,nodes:session.snapshot().nodes},null,2));
 });
 actions.append(evaluate,baseline,clear,download,graphDownload,reset);
 const layout=E('div',undefined,'eh-proof-layout');
 const left=E('div');
 const side=E('aside',undefined,'eh-right');
 side.setAttribute('aria-label','Proof node inspector');
 const editor=E('section',undefined,'eh-proof-editor');
 editor.append(E('h3','Edit a declaration'));
 const nodeKind=select([['input','Declared input'],['derive','Derived quantity'],['constraint','Constraint']],'input');
 const nodeId=input('input_1',64);
 const magnitude=input('1',50);
 const basis=input('Declared input',160);
 const dimensions=[input('0',3),input('0',3),input('0',3)];
 for(const e of dimensions)e.inputMode='numeric';
 const inFields=E('div',undefined,'eh-proof-fields');
 inFields.append(label('Exact magnitude',magnitude),label('Basis / assumption',basis),label('Length exponent',dimensions[0]),label('Mass exponent',dimensions[1]),label('Time exponent',dimensions[2]));
 const op=select(arithmetic.map(id=>[id,opLabels[id]]),'add');
 const leftArg=select([]);
 const rightArg=select([]);
 const opFields=E('div',undefined,'eh-proof-fields');
 opFields.append(label('Operation',op),label('First quantity',leftArg),label('Second quantity',rightArg));
 const editStatus=E('p',undefined,'eh-copy');
 const saveNode=button('Add declaration',()=>{
  if(busy)return;
  try{
   let node;
   if(nodeKind.value==='input'){
    if(dimensions.some(e=>!/^[-]?(0|[1-9]\d?)$/.test(e.value)))throw Error('DIMENSION_INPUT');
    node=makeInput({id:nodeId.value.trim(),value:magnitude.value.trim(),dimension:dimensions.map(e=>Number(e.value)),basis:basis.value.trim()});
   }else{
    node=makeOperation({id:nodeId.value.trim(),kind:nodeKind.value,op:op.value,left:leftArg.value,right:rightArg.value});
   }
   session.edit({operation:editing?'replace':'append',id:editing??node.id,node});
   selected=node.id;
   status.textContent='Graph changed. Previous proof is no longer current.';
   editing=null;
   resetEditor();
   render();
  }catch(e){editStatus.textContent='Declaration refused: '+displayError(e);}
 });
 saveNode.id='eh-proof-save-node';
 const cancelEdit=button('New declaration',()=>{
  editing=null;
  resetEditor();
 });
 editor.append(label('Node kind',nodeKind),label('Stable node identifier',nodeId),inFields,opFields,saveNode,cancelEdit,editStatus);
 function availableId(){
  const ids=new Set(session.snapshot().nodes.map(n=>n.id));
  let id;
  do{id='node_'+(++serial);}while(ids.has(id));
  return id;
 }
 function setKind(){
  const k=nodeKind.value;
  inFields.hidden=k!=='input';
  opFields.hidden=k==='input';
  const prior=op.value;
  optionList(op,(k==='constraint'?comparisons:arithmetic).map(id=>[id,opLabels[id]]),prior);
 }
 nodeKind.addEventListener('change',setKind);
 function resetEditor(){
  nodeId.disabled=false;
  nodeId.value=availableId();
  nodeKind.value='input';
  magnitude.value='1';
  basis.value='Declared input';
  for(const e of dimensions)e.value='0';
  editStatus.textContent='New node. Inputs are declared assumptions, not verified observations.';
  saveNode.textContent='Add declaration';
  setKind();
 }
 function edit(n){
  editing=n.id;
  nodeId.value=n.id;
  nodeId.disabled=true;
  nodeKind.value=n.kind;
  const quantities=session.snapshot().nodes.filter(q=>q.kind!=='constraint'&&q.id!==editing).map(q=>q.id);
  optionList(leftArg,quantities,n.args?.[0]);
  optionList(rightArg,quantities,n.args?.[1]);
  setKind();
  if(n.kind==='input'){
   magnitude.value=n.value;
   basis.value=n.basis;
   dimensions.forEach((e,i)=>e.value=String(n.dimension[i]));
  }else{
   op.value=n.op;
   leftArg.value=n.args[0];
   rightArg.value=n.args[1];
  }
  saveNode.textContent='Apply declaration';
  editStatus.textContent='Editing '+n.id+'. A successful change invalidates the current evaluation.';
  nodeKind.focus();
 }
 const filterBar=E('div',undefined,'eh-proof-fields');
 const search=input('',100);
 search.type='search';
 search.placeholder='Filter identifiers';
 const type=select([['all','All nodes'],['input','Inputs'],['derive','Derivations'],['constraint','Constraints'],['issues','Non-satisfied / incompatible / blocked']],'all');
 filterBar.append(label('Find node',search),label('Show',type));
 const canvas=E('div',undefined,'eh-proof-canvas');
 const roster=E('div',undefined,'eh-proof-roster');
 roster.setAttribute('aria-label','Proof nodes');
 const listTitle=E('h3','Graph declarations');
 const nav=E('div',undefined,'eh-actions');
 let page=0;
 const pageText=E('small');
 const prev=button('Previous nodes',()=>{page--;renderNodes();});
 const next=button('Next nodes',()=>{page++;renderNodes();});
 nav.append(prev,pageText,next);
 left.append(editor,listTitle,filterBar,canvas,nav,roster);
 layout.append(left,side);
 search.addEventListener('input',()=>{query=search.value.trim().toLowerCase();page=0;renderNodes();});
 type.addEventListener('change',()=>{mode=type.value;page=0;renderNodes();});
 const diffPanel=E('section',undefined,'eh-proof-diff');
 const historyPanel=E('details',undefined,'eh-timeline');
 historyPanel.append(E('summary','Local version history'));
 const historyList=E('div',undefined,'eh-proof-history');
 historyPanel.append(historyList);
 const importPanel=E('details',undefined,'eh-timeline');
 importPanel.append(E('summary','Import a graph or replayable proof'));
 const file=E('input');
 file.type='file';
 file.accept='.json,application/json';
 const importStatus=E('p','No file inspected.','eh-state');
 importStatus.setAttribute('role','status');
 const importResult=E('div');
 const inspectFile=button('Inspect selected file',async()=>{
  if(busy)return;
  imported=null;
  importResult.replaceChildren();
  const chosen=file.files?.[0];
  if(!chosen||!chosen.size||chosen.size>PROOF_LIMITS.archive){
   importStatus.textContent='File refused: missing or larger than 256 KiB.';
   sync();
   return;
  }
  busy=true;
  sync();
  try{
   const raw=new TextDecoder('utf-8',{fatal:true}).decode(await chosen.arrayBuffer());
   try{
    imported=await inspectProofArchive(raw);
    importStatus.textContent='Exact proof archive replay matched. No current graph changed.';
    importResult.append(E('p',imported.report.graphDigest,'eh-copy'),E('p',imported.nodes.length+' nodes · original canonical report matched','eh-state'));
   }catch(archiveError){
    const graph=parseGraph(raw);
    imported={nodes:graph.nodes};
    importStatus.textContent='Graph admitted structurally. No proof report claimed.';
    importResult.append(E('p',graph.nodes.length+' valid declarations','eh-copy'));
   }
  }catch(e){importStatus.textContent='Import refused: '+displayError(e);}
  finally{busy=false;sync();}
 });
 const useFile=button('Replace draft with inspected graph',()=>{
  if(!imported||busy)return;
  try{
   session.replace(imported.nodes);
   selected=null;
   editing=null;
   imported=null;
   resetEditor();
   status.textContent='Imported declarations staged. Evaluate again to create a current result.';
   importStatus.textContent='Graph copied to draft; no permission or execution restored.';
   importResult.replaceChildren();
   render();
  }catch(e){importStatus.textContent='Import refused: '+displayError(e);}
 });
 file.addEventListener('change',()=>{
  imported=null;
  importResult.replaceChildren();
  importStatus.textContent='New file selected; inspect before importing.';
  sync();
 });
 importPanel.append(label('Local JSON file',file),inspectFile,useFile,importStatus,importResult);
 section.append(actions,status,counters,layout,diffPanel,historyPanel,importPanel,E('p','Exact replay establishes the conditional computation only. Assumptions, measurements, units and real-world applicability require separate review.','eh-copy'));
 root.append(section);
 function sync(){
  const state=session.snapshot();
  evaluate.disabled=busy;
  baseline.disabled=busy||!state.current;
  clear.disabled=busy||!state.baseline;
  download.disabled=busy||!state.current;
  graphDownload.disabled=busy;
  reset.disabled=busy;
  inspectFile.disabled=busy;
  useFile.disabled=busy||!imported;
  file.disabled=busy;
  for(const e of editor.querySelectorAll('input,select,button'))e.disabled=busy||e===nodeId&&editing!==null;
  if(!busy){
   for(const e of side.querySelectorAll('button[data-edit]'))e.disabled=false;
  }else for(const e of side.querySelectorAll('button[data-edit]'))e.disabled=true;
  for(const e of historyList.querySelectorAll('button'))e.disabled=busy;
 }
 function selectNode(id,focus=false){
  selected=id;
  renderNodes();
  if(focus){
   const b=[...roster.querySelectorAll('button[data-proof-node]')].find(e=>e.dataset.proofNode===id);
   b?.focus({preventScroll:true});
  }
 }
 function renderInspector(state){
  const n=state.nodes.find(x=>x.id===selected);
  side.replaceChildren(E('p','RECEIPT MICROSCOPE','eh-kicker'));
  if(!n){
   side.append(E('h3','Select a graph node'),E('p','Trace the exact inputs, dependencies and receipt identity.','eh-copy'));
   return;
  }
  const receipt=state.current?.report.receipts.find(r=>r.id===n.id);
  side.append(E('h3',n.id),E('p',describe(receipt?.outcome),'eh-state'));
  if(n.kind==='input'){
   side.append(definitions([['Magnitude',n.value],['Dimension',formatDimension(n.dimension)],['Basis',n.basis]]));
  }else{
   side.append(definitions([['Operation',opLabels[n.op]],['First input',n.args[0]],['Second input',n.args[1]]]));
  }
  if(receipt){
   side.append(definitions([['Node digest',receipt.nodeDigest],['Receipt digest',receipt.receiptDigest]]));
   const raw=E('details',undefined,'eh-timeline');
   raw.append(E('summary','Exact receipt JSON'),E('pre',JSON.stringify(receipt,null,2),'eh-quote'));
   side.append(raw);
  }
  const trace=dependencyTrace(state.nodes,n.id);
  side.append(E('h4','Dependencies'),E('p',trace.upstream.length+' upstream · '+trace.downstream.length+' downstream','eh-copy'));
  for(const [caption,ids] of [['Inputs',trace.upstream],['Affected nodes',trace.downstream]]){
   if(ids.length){
    side.append(E('h4',caption));
    for(const id of ids)side.append(button(id,()=>{
     mode='all';
     type.value='all';
     query='';
     search.value='';
     page=Math.floor(state.nodes.findIndex(x=>x.id===id)/24);
     selectNode(id,true);
    }));
   }
  }
  const editButton=button('Edit this declaration',()=>edit(n));
  editButton.dataset.edit='true';
  const remove=button('Remove this node',()=>{
   try{
    session.edit({operation:'remove',id:n.id});
    selected=null;
    editing=null;
    resetEditor();
    status.textContent='Node removed. Evaluate the new graph.';
    render();
   }catch(e){status.textContent='Removal refused: '+displayError(e);}
  });
  remove.dataset.edit='true';
  side.append(editButton,remove);
  sync();
 }
 function renderCanvas(nodes,edges,trace){
  canvas.replaceChildren();
  if(!nodes.length){
   canvas.append(E('p','No nodes match the filter.','eh-copy'));
   return;
  }
  if(nodes.length>64){
   canvas.append(E('p','Large graph: use the paginated, searchable node list.','eh-copy'));
   return;
  }
  const graph={nodes,edges};
  const p=layoutGraph(graph,'layered');
  if(p.mode==='list')return;
  const svg=S('svg',{viewBox:'0 0 '+p.width+' '+p.height,role:'img','aria-label':'Proof dependency graph; accessible node list below'});
  const position=new Map(p.positions.map(x=>[x.key,x]));
  for(const e of edges){
   const a=position.get(e.from),b=position.get(e.to);
   if(!a||!b)continue;
   const l=S('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#739b9a','stroke-width':1.5});
   svg.append(l);
  }
  for(const n of nodes){
   const at=position.get(n.key);
   if(!at)continue;
   const g=S('g',{transform:'translate('+at.x+' '+at.y+')'});
   const color=n.id===selected?'#f6cc80':trace.upstream.includes(n.id)?'#8dd5f4':trace.downstream.includes(n.id)?'#e9a271':'#91d9b2';
   const box=S('rect',{x:-49,y:-23,width:98,height:46,rx:8,fill:'#172b32',stroke:color,'stroke-width':n.id===selected?3:1.5});
   const title=S('text',{y:4,'text-anchor':'middle','font-size':11,fill:'#e8f1ef'});
   title.textContent=n.id.length>15?n.id.slice(0,13)+'…':n.id;
   g.append(box,title);
   g.style.cursor='pointer';
   g.addEventListener('click',()=>{
    page=Math.floor(nodes.findIndex(x=>x.id===n.id)/24);
    selectNode(n.id,true);
   });
   svg.append(g);
  }
  canvas.append(svg);
 }
 function renderNodes(){
  const state=session.snapshot();
  const projection=proofProjection(state.nodes,state.current?.report);
  const trace=dependencyTrace(state.nodes,selected);
  const nodes=projection.nodes.filter(n=>{
   const matches=mode==='all'||mode===n.definition.kind||mode==='issues'&&['constraint_refuted','incompatible','indeterminate','blocked'].includes(n.status);
   return matches&&(!query||n.id.toLowerCase().includes(query));
  });
  const keys=new Set(nodes.map(n=>n.id));
  renderCanvas(nodes,projection.edges.filter(e=>keys.has(e.from)&&keys.has(e.to)),trace);
  const pages=Math.max(1,Math.ceil(nodes.length/24));
  page=Math.max(0,Math.min(page,pages-1));
  roster.replaceChildren();
  for(const n of nodes.slice(page*24,page*24+24)){
   const b=button('',()=>selectNode(n.id,true));
   b.dataset.proofNode=n.id;
   b.className='eh-proof-node';
   b.dataset.relation=n.id===selected?'selected':trace.upstream.includes(n.id)?'upstream':trace.downstream.includes(n.id)?'downstream':'other';
   b.setAttribute('aria-pressed',String(n.id===selected));
   b.append(E('strong',n.id),E('small',n.definition.kind+' · '+describe(n.receipt?.outcome)));
   roster.append(b);
  }
  if(!nodes.length)roster.append(E('p','No matching declarations.','eh-copy'));
  prev.disabled=page===0;
  next.disabled=page>=pages-1;
  pageText.textContent=(page+1)+' / '+pages+' · '+nodes.length+' nodes';
  renderInspector(state);
 }
 function renderDiff(){
  const state=session.snapshot();
  diffPanel.replaceChildren(E('h3','Revision impact'));
  if(!state.baseline){
   diffPanel.append(E('p','Evaluate and retain a baseline to compare a revision.','eh-copy'));
   return;
  }
  diffPanel.append(E('small','Baseline: '+state.baseline.report.graphDigest,'eh-copy'));
  if(!state.current){
   diffPanel.append(E('p','Draft not evaluated. Baseline remains unchanged.','eh-copy'));
   return;
  }
  const diff=session.diff();
  diffPanel.append(E('p',diff.closure.changed.length+' changed declarations · '+diff.closure.affected.length+' affected nodes · '+diff.closure.unaffected.length+' unaffected','eh-state'));
  const table=E('div',undefined,'eh-proof-diff-list');
  for(const c of diff.changes.filter(x=>x.relation!=='unchanged')){
   const card=E('article',undefined,'eh-proof-diff-row');
   card.append(E('strong',c.id+' · '+c.relation.replaceAll('_',' ')),E('p','Before: '+describe(c.before),'eh-copy'),E('p','After: '+describe(c.after),'eh-copy'));
   table.append(card);
  }
  if(!table.childElementCount)table.append(E('p','No receipt changes.','eh-copy'));
  diffPanel.append(table,E('p','Structural invalidation and exact outcomes, not independent empirical verification.','eh-copy'));
 }
 function renderHistory(){
  const state=session.snapshot();
  historyList.replaceChildren();
  for(const [i,h] of state.history.entries()){
   const card=E('article',undefined,'eh-proof-history-row');
   card.append(E('strong',h.report.graphDigest),E('small',h.report.receipts.length+' receipts · replayed locally'),button('Restore declarations as draft',()=>{
    session.restore(i);
    selected=null;
    editing=null;
    resetEditor();
    status.textContent='Historical declarations restored as an unevaluated draft.';
    render();
   }));
   historyList.append(card);
  }
  if(!state.history.length)historyList.append(E('p','No retained local versions.','eh-copy'));
 }
 function render(){
  const state=session.snapshot();
  const currentArgs=[leftArg.value,rightArg.value];
  const quantities=state.nodes.filter(n=>n.kind!=='constraint'&&n.id!==editing).map(n=>n.id);
  optionList(leftArg,quantities,currentArgs[0]);
  optionList(rightArg,quantities,currentArgs[1]);
  counters.replaceChildren();
  const stats=[['Declarations',state.nodes.length],['Receipts',state.current?.report.receipts.length??0],['Kernel executions',state.current?.stats.executed.length??'—'],['Reused receipts',state.current?.stats.reused.length??'—']];
  for(const [name,value] of stats){
   const box=E('div',undefined,'eh-metric');
   box.append(E('small',name),E('strong',String(value)));
   counters.append(box);
  }
  if(state.current){
   const summary=outcomeSummary(state.current.report);
   const text=E('p',Object.entries(summary).map(([k,v])=>v+' '+k.replaceAll('_',' ')).join(' · '),'eh-copy');
   counters.append(text);
  }
  renderNodes();
  renderDiff();
  renderHistory();
  sync();
 }
 resetEditor();
 render();
 return section;
}
