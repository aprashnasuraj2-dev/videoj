import {NOTEBOOK_LIMITS,noteKinds,noteStates,captureNotebookSources,anchorSelection,inspectAnchor,createNotebook,exportNotebook,parseNotebook,filterNotes,notebookSummary} from './notebook-model.js';

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
 const n=E('label',name,'eh-field');
 n.append(control);
 return n;
}
function options(el,values,selected){
 el.replaceChildren();
 for(const value of values){
  const [id,label]=Array.isArray(value)?value:[value,value.replaceAll('_',' ')];
  const o=E('option',label);
  o.value=id;
  el.append(o);
 }
 if([...el.options].some(o=>o.value===selected))el.value=selected;
}
function select(values,selected){
 const n=E('select');
 options(n,values,selected);
 return n;
}
function textarea(max,rows=4){
 const n=E('textarea');
 n.maxLength=max;
 n.rows=rows;
 return n;
}
function errorCode(e){
 return /^[A-Z_]{1,80}$/.test(e?.message??'')?e.message:'NOTEBOOK_REFUSED';
}
function save(text){
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const a=E('a');
 a.href=url;
 a.download='sutra-evidence-notebook.json';
 document.body.append(a);
 a.click();
 a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const anchorLabels={
 unanchored:'No source selection',
 exact_current:'Exact text and version match',
 exact_text_version_changed:'Exact source text; workspace version changed',
 source_missing:'Source not present in current draft',
 quote_missing:'Selected text missing from changed source',
 changed_unique_match:'Source changed; one possible re-selection',
 changed_multiple_matches:'Source changed; multiple possible re-selections'
};
export function mountNotebook(root){
 const section=E('section');
 section.id='eh-notebook';
 section.append(E('p','RESEARCH NOTEBOOK / EXACT ANNOTATIONS','eh-kicker'),E('h2','Evidence notebook'),E('p','Retain your observations, competing hypotheses, counterexamples and open questions beside exact reviewed-workspace source selections. These notes are local annotations, not admitted evidence or verified claims.','eh-copy'));
 const notebook=createNotebook();
 let sources=[];
 let version=null;
 let active=false;
 let busy=false;
 let selected=null;
 let stagedAnchor=null;
 let imported=null;
 let generation=0;
 let page=0;
 let anchorResults=new Map();
 const status=E('p','No note created.','eh-state');
 status.id='eh-notebook-status';
 status.setAttribute('role','status');
 const counters=E('div',undefined,'eh-notebook-counts');
 const actions=E('div',undefined,'eh-actions');
 const exportButton=button('Download notebook JSON',()=>{
  try{save(exportNotebook(notebook.snapshot().notes));}
  catch(e){status.textContent='Export refused: '+errorCode(e);}
 });
 const fresh=button('New note',()=>{
  selected=null;
  stagedAnchor=null;
  body.value='';
  kind.value='observation';
  noteState.value='open';
  renderEditor();
  body.focus();
 });
 actions.append(fresh,exportButton);
 const split=E('div',undefined,'eh-notebook-grid');
 const left=E('div');
 const sourcePanel=E('section',undefined,'eh-notebook-panel');
 sourcePanel.append(E('h3','Select exact source text'));
 const sourceSelect=select([['','No sources available']]);
 const sourceText=textarea(NOTEBOOK_LIMITS.source,7);
 sourceText.readOnly=true;
 sourceText.setAttribute('aria-label','Exact source text for selection');
 const selectionText=E('p','Select a passage in the source field.','eh-copy');
 const anchorButton=button('Attach selected passage',async()=>{
  if(busy)return;
  const source=sources.find(s=>s.id===sourceSelect.value);
  const start=sourceText.selectionStart,end=sourceText.selectionEnd;
  const sourceGeneration=generation;
  busy=true;
  sync();
  try{
   const a=await anchorSelection(source,start,end,version);
   if(sourceGeneration!==generation)throw Error('NOTEBOOK_SOURCE_CHANGED');
   stagedAnchor=a;
   status.textContent='Exact passage attached to the note editor.';
   renderEditor();
  }catch(e){status.textContent='Selection refused: '+errorCode(e);}
  finally{busy=false;sync();}
 });
 sourceText.addEventListener('select',()=>{
  const start=sourceText.selectionStart,end=sourceText.selectionEnd;
  selectionText.textContent=(end-start)+' UTF-16 code units selected · offsets '+start+'–'+end;
 });
 function displaySource(){
  const s=sources.find(x=>x.id===sourceSelect.value);
  sourceText.value=s?.text??'';
  sourceText.setSelectionRange(0,0);
  selectionText.textContent=s?'Declared lineage: '+s.lineage+' · select exact text.':'No current source selected.';
  sync();
 }
 sourceSelect.addEventListener('change',displaySource);
 sourcePanel.append(field('Current reviewed source',sourceSelect),sourceText,selectionText,anchorButton);
 const editor=E('section',undefined,'eh-notebook-panel');
 const editorTitle=E('h3','New note');
 const kind=select(noteKinds,'observation');
 kind.id='eh-note-kind';
 kind.setAttribute('aria-label','Annotation kind');
 const noteState=select(noteStates,'open');
 const body=textarea(NOTEBOOK_LIMITS.body,6);
 body.placeholder='Write your observation, hypothesis or question…';
 const anchorArea=E('div',undefined,'eh-notebook-anchor');
 const clearAnchor=button('Detach passage',()=>{
  stagedAnchor=null;
  renderEditor();
 });
 const commit=button('Save note',()=>{
  if(busy)return;
  try{
   const patch={kind:kind.value,state:noteState.value,body:body.value.trim(),anchor:stagedAnchor};
   let note;
   if(selected)note=notebook.update(selected,patch);
   else{
    note=notebook.add({kind:patch.kind,body:patch.body,anchor:patch.anchor});
    if(patch.state!=='open')note=notebook.update(note.id,{state:patch.state});
   }
   selected=note.id;
   status.textContent='Note saved in this tab. It is not admitted evidence.';
   render();
   refreshAnchors();
  }catch(e){status.textContent='Note refused: '+errorCode(e);}
 });
 commit.id='eh-notebook-save';
 const remove=button('Remove selected note',()=>{
  if(!selected||busy)return;
  notebook.remove(selected);
  selected=null;
  stagedAnchor=null;
  body.value='';
  status.textContent='Note removed from the local notebook.';
  render();
  refreshAnchors();
 });
 const editorFields=E('div',undefined,'eh-notebook-fields');
 editorFields.append(field('Annotation kind',kind),field('Review state',noteState));
 editor.append(editorTitle,editorFields,field('Note text',body),anchorArea,clearAnchor,commit,remove);
 left.append(sourcePanel,editor);
 const right=E('div');
 const filters=E('div',undefined,'eh-notebook-fields');
 const kindFilter=select([['all','All annotation kinds'],...noteKinds],'all');
 kindFilter.setAttribute('aria-label','Filter annotation type');
 const stateFilter=select([['all','All review states'],...noteStates],'all');
 const query=E('input');
 query.type='search';
 query.maxLength=100;
 query.placeholder='Search notes and quotes';
 filters.append(field('Kind',kindFilter),field('State',stateFilter),field('Search',query));
 const list=E('div',undefined,'eh-notebook-list');
 const pager=E('div',undefined,'eh-actions');
 const previous=button('Previous notes',()=>{page--;renderList();});
 const next=button('Next notes',()=>{page++;renderList();});
 const pageText=E('small');
 pager.append(previous,pageText,next);
 for(const el of [kindFilter,stateFilter,query])el.addEventListener('input',()=>{page=0;renderList();});
 right.append(E('h3','Recorded annotations'),filters,pager,list);
 split.append(left,right);
 const importPanel=E('details',undefined,'eh-timeline');
 importPanel.append(E('summary','Inspect and restore a local notebook'));
 const file=E('input');
 file.type='file';
 file.accept='.json,application/json';
 const importStatus=E('p','No file inspected.','eh-copy');
 const inspect=button('Inspect notebook file',async()=>{
  if(busy)return;
  imported=null;
  const chosen=file.files?.[0];
  if(!chosen||!chosen.size||chosen.size>NOTEBOOK_LIMITS.archive){
   importStatus.textContent='File absent or larger than 256 KiB.';
   sync();
   return;
  }
  busy=true;
  sync();
  try{
   imported=parseNotebook(new TextDecoder('utf-8',{fatal:true}).decode(await chosen.arrayBuffer()));
   importStatus.textContent=imported.length+' structurally valid notes. Source matches are not established until restored and compared.';
  }catch(e){importStatus.textContent='Import refused: '+errorCode(e);}
  finally{busy=false;sync();}
 });
 const restore=button('Replace local notebook with inspected notes',()=>{
  if(busy||!imported)return;
  notebook.replace(imported);
  imported=null;
  selected=null;
  stagedAnchor=null;
  body.value='';
  importStatus.textContent='Notebook restored as annotations. No evidence admitted.';
  render();
  refreshAnchors();
 });
 file.addEventListener('change',()=>{
  imported=null;
  importStatus.textContent='New file selected.';
  sync();
 });
 importPanel.append(field('Notebook JSON file',file),inspect,restore,importStatus);
 section.append(actions,status,counters,split,importPanel,E('p','Notes remain in memory until explicitly exported. Source updates never move annotations automatically. No browser storage, model or external transport is used.','eh-copy'));
 root.append(section);
 function sync(){
  for(const el of [sourceSelect,sourceText,kind,noteState,body,anchorButton,commit,clearAnchor,file,inspect,fresh,exportButton])el.disabled=busy;
  anchorButton.disabled=busy||!sources.some(s=>s.id===sourceSelect.value);
  remove.disabled=busy||!selected;
  restore.disabled=busy||!imported;
  clearAnchor.disabled=busy||!stagedAnchor;
  exportButton.disabled=busy||!notebook.snapshot().notes.length;
 }
 function renderEditor(){
  editorTitle.textContent=selected?'Edit '+selected:'New note';
  anchorArea.replaceChildren();
  if(stagedAnchor){
   anchorArea.append(E('strong','Attached exact passage'),E('pre',stagedAnchor.quote,'eh-quote'),E('small',stagedAnchor.sourceId+' · '+stagedAnchor.start+'–'+stagedAnchor.end),E('small',stagedAnchor.sourcePin));
  }else anchorArea.append(E('p','No passage attached; this note will be unanchored.','eh-copy'));
  sync();
 }
 function selectNote(n){
  if(busy)return;
  selected=n.id;
  kind.value=n.kind;
  noteState.value=n.state;
  body.value=n.body;
  stagedAnchor=n.anchor;
  renderEditor();
  renderList();
 }
 async function refreshAnchors(){
  const ticket=++generation;
  if(!active)return;
  const captured=sources,atVersion=version;
  const notes=notebook.snapshot().notes;
  const map=new Map();
  for(const note of notes){
   try{map.set(note.id,await inspectAnchor(note.anchor,captured,atVersion));}
   catch{map.set(note.id,{status:'quote_missing',positions:[]});}
   if(ticket!==generation)return;
  }
  anchorResults=map;
  renderList();
 }
 function renderList(){
  if(!active)return;
  const notes=filterNotes(notebook.snapshot().notes,{kind:kindFilter.value,state:stateFilter.value,query:query.value});
  const pages=Math.max(1,Math.ceil(notes.length/12));
  page=Math.max(0,Math.min(page,pages-1));
  pageText.textContent=(page+1)+' / '+pages+' · '+notes.length+' notes';
  previous.disabled=page===0;
  next.disabled=page>=pages-1;
  list.replaceChildren();
  for(const n of notes.slice(page*12,page*12+12)){
   const item=E('article',undefined,'eh-notebook-card');
   const anchor=anchorResults.get(n.id);
   item.dataset.note=n.id;
   item.append(E('p',n.kind+' · '+n.state,'eh-kicker'),E('p',n.body),E('small',anchorLabels[anchor?.status]??(n.anchor?'Checking source match…':'No source selection'),'eh-copy'));
   if(n.anchor)item.append(E('pre',n.anchor.quote,'eh-quote'),E('small',n.anchor.sourceId+' · '+n.anchor.start+'–'+n.anchor.end));
   const edit=button('Edit '+n.id,()=>selectNote(n));
   edit.setAttribute('aria-pressed',String(selected===n.id));
   item.append(edit);
   if(n.anchor&&anchor?.positions?.length){
    const jump=button('Inspect current matching text',()=>{
     const source=sources.find(s=>s.id===n.anchor.sourceId);
     if(!source)return;
     sourceSelect.value=source.id;
     displaySource();
     const i=anchor.positions[0];
     sourceText.setSelectionRange(i,i+n.anchor.quote.length);
     sourceText.focus();
     status.textContent='Current match selected for inspection. Attach and save explicitly to replace the old anchor.';
    });
    item.append(jump);
   }
   list.append(item);
  }
  if(!notes.length)list.append(E('p','No matching annotations.','eh-copy'));
 }
 function render(){
  const summary=notebookSummary(notebook.snapshot().notes);
  counters.replaceChildren();
  for(const [name,value] of [['Annotations',summary.total],['Anchored',summary.anchored],['Open questions',summary.kinds.question],['Reviewed',summary.states.reviewed]]){
   const metric=E('div',undefined,'eh-metric');
   metric.append(E('small',name),E('strong',String(value)));
   counters.append(metric);
  }
  renderEditor();
  renderList();
 }
 function update(workspace){
  const next=captureNotebookSources(workspace);
  const nextVersion=workspace?.current?.digest??null;
  if(nextVersion===version&&JSON.stringify(next)===JSON.stringify(sources))return;
  sources=next;
  version=nextVersion;
  anchorResults.clear();
  generation++;
  const previous=sourceSelect.value;
  options(sourceSelect,sources.length?sources.map(s=>[s.id,s.id]):[['','No sources available']],previous);
  displaySource();
  if(active)refreshAnchors();
 }
 render();
 return Object.freeze({
  section,update,setActive(value){
   active=!!value;
   if(active){render();refreshAnchors();}
   else generation++;
  }
 });
}
