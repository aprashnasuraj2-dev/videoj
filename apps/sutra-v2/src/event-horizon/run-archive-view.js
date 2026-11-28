import {sealRunArchive,readRunArchive,eventAccounting,compareRunRecords,eventDescription,createRunLibrary,RUN_ARCHIVE_LIMITS} from './run-archive.js';
import {replayJournalPrefix} from './replay.js';

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
function field(name,el){
 const l=E('label',name,'eh-field');
 l.append(el);
 return l;
}
function options(el,items,selected){
 el.replaceChildren();
 for(const [id,label] of items){
  const o=E('option',label);
  o.value=id;
  el.append(o);
 }
 if([...el.options].some(o=>o.value===selected))el.value=selected;
}
function save(record){
 const url=URL.createObjectURL(new Blob([record.text],{type:'application/json'}));
 const a=E('a');
 a.href=url;
 a.download='sutra-run-'+record.snapshot.runId+'.json';
 document.body.append(a);
 a.click();
 a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const readable=s=>String(s).replaceAll('_',' ').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase();
function definitions(pairs){
 const dl=E('dl',undefined,'eh-details');
 for(const [k,v] of pairs)dl.append(E('dt',k),E('dd',String(v??'Unknown')));
 return dl;
}
export function mountRunArchive(root,{feed}){
 const section=E('section');
 section.id='eh-run-archive';
 section.append(E('p','EXECUTION RECEIPTS / READ-ONLY ARCHIVE','eh-kicker'),E('h2','Run archive'),E('p','Capture retained execution metadata, inspect exact historical event prefixes, compare runs and export an integrity-bound archive. Import never restores credentials, model authority, execution or source truth.','eh-copy'));
 const library=createRunLibrary();
 let active=false;
 let busy=false;
 let selected=null;
 let compareId=null;
 let prefix=0;
 let filter='all';
 let page=0;
 const status=E('p','No run captured.','eh-state');
 status.id='eh-run-archive-status';
 status.setAttribute('role','status');
 const current=E('select');
 const capture=button('Capture selected run',async()=>{
  if(busy||!current.value)return;
  const id=current.value,events=feed.events(id);
  busy=true;
  sync();
  try{
   const record=await sealRunArchive(events);
   library.add(record,'local_feed');
   choose(record.digest);
   status.textContent='Retained '+record.events.length+' validated metadata events. No execution restored.';
  }catch{status.textContent='Capture refused. Run missing, incomplete or archive too large.';}
  finally{busy=false;sync();}
 });
 const refresh=button('Refresh retained run list',()=>refreshRuns());
 const captureControls=E('div',undefined,'eh-archive-fields');
 captureControls.append(field('Retained runtime run',current),capture,refresh);
 const importPanel=E('details',undefined,'eh-timeline');
 importPanel.append(E('summary','Inspect a local execution archive'));
 const file=E('input');
 file.type='file';
 file.accept='.json,application/json';
 const importButton=button('Validate and inspect archive',async()=>{
  if(busy)return;
  const f=file.files?.[0];
  if(!f||!f.size||f.size>RUN_ARCHIVE_LIMITS.chars){
   status.textContent='Select a bounded JSON archive no larger than 256 KiB.';
   return;
  }
  busy=true;
  sync();
  try{
   const record=await readRunArchive(new TextDecoder('utf-8',{fatal:true}).decode(await f.arrayBuffer()));
   library.add(record,'imported_file');
   choose(record.digest);
   status.textContent='Archive digest and closed journal transitions matched. Historical authenticity is not established.';
  }catch{status.textContent='Archive refused: invalid digest, event transition or shape.';}
  finally{busy=false;sync();}
 });
 importPanel.append(field('Execution archive file',file),importButton);
 const shelf=E('div',undefined,'eh-archive-shelf');
 const detail=E('div',undefined,'eh-archive-detail');
 const comparePanel=E('section',undefined,'eh-archive-compare');
 const compareSelect=E('select');
 compareSelect.addEventListener('change',()=>{compareId=compareSelect.value||null;renderCompare();});
 const compareResults=E('div');
 comparePanel.append(E('h3','Compare recorded metadata'),field('Second retained archive',compareSelect),compareResults);
 section.append(captureControls,importPanel,status,E('h3','Local archive shelf'),shelf,detail,comparePanel);
 root.append(section);
 function selectedRecord(){return library.list().find(x=>x.record.digest===selected)?.record??null;}
 function choose(digest){
  selected=digest;
  prefix=selectedRecord()?.events.length??0;
  page=0;
  filter='all';
  render();
 }
 function refreshRuns(){
  if(!active)return;
  const prior=current.value;
  options(current,[['','Select retained run'],...feed.runs().map(r=>[r.runId,r.runId+' · '+r.origin+' · '+r.status])],prior);
  sync();
 }
 function sync(){
  capture.disabled=busy||!current.value;
  refresh.disabled=busy;
  current.disabled=busy;
  file.disabled=busy;
  importButton.disabled=busy;
 }
 current.addEventListener('change',sync);
 function renderShelf(){
  shelf.replaceChildren();
  for(const item of library.list()){
   const r=item.record;
   const card=E('article',undefined,'eh-archive-card');
   card.append(E('strong',r.snapshot.runId),E('small',item.origin==='local_feed'?'Captured from local journal':'Imported file · authenticity unknown'),E('p',r.snapshot.origin+' · '+r.snapshot.status+' · '+r.events.length+' events','eh-copy'));
   const open=button('Inspect '+r.snapshot.runId,()=>choose(r.digest));
   open.setAttribute('aria-pressed',String(r.digest===selected));
   const download=button('Download archive',()=>save(r));
   const remove=button('Remove from shelf',()=>{
    library.remove(r.digest);
    if(selected===r.digest){selected=null;prefix=0;}
    if(compareId===r.digest)compareId=null;
    render();
   });
   card.append(open,download,remove);
   shelf.append(card);
  }
  if(!shelf.childElementCount)shelf.append(E('p','Capture a retained run or explicitly import an archive.','eh-copy'));
 }
 function renderDetail(){
  detail.replaceChildren();
  const r=selectedRecord();
  if(!r)return;
  detail.append(E('h3','Recorded run '+r.snapshot.runId),definitions([
   ['Origin',r.snapshot.origin],['Version',r.snapshot.version],['Recorded state',r.snapshot.status],
   ['Archive digest',r.digest],['Retained events',r.events.length],
   ['Billing and actual token use','Unknown'],['Execution authority','None']
  ]));
  const scrubber=E('input');
  scrubber.type='range';
  scrubber.min='0';
  scrubber.max=String(r.events.length);
  scrubber.step='1';
  scrubber.value=String(prefix);
  const scrubStatus=E('p','','eh-state');
  const graphRows=E('div',undefined,'eh-archive-state-list');
  const accounting=E('div',undefined,'eh-archive-accounting');
  const filters=E('select');
  options(filters,[['all','All event types'],...new Set(r.events.map(e=>e.type))].map(x=>Array.isArray(x)?x:[x,x]),filter);
  const events=E('div',undefined,'eh-archive-events');
  const nav=E('div',undefined,'eh-actions');
  const previous=button('Previous events',()=>{page--;renderEvents();});
  const next=button('Next events',()=>{page++;renderEvents();});
  const pageLabel=E('small');
  nav.append(previous,pageLabel,next);
  function renderEvents(){
   const list=r.events.slice(0,prefix).filter(e=>filter==='all'||e.type===filter);
   const pages=Math.max(1,Math.ceil(list.length/30));
   page=Math.max(0,Math.min(page,pages-1));
   events.replaceChildren();
   for(const e of list.slice(page*30,page*30+30)){
    const d=eventDescription(e);
    const row=E('article',undefined,'eh-archive-event');
    row.append(E('small','#'+e.sequence+' · '+e.type),E('strong',d.title),E('p',d.detail,'eh-copy'));
    events.append(row);
   }
   if(!list.length)events.append(E('p','No recorded events in this prefix/filter.','eh-copy'));
   previous.disabled=page===0;
   next.disabled=page===pages-1;
   pageLabel.textContent=(page+1)+' / '+pages+' · '+list.length+' events';
  }
  function renderPrefix(){
   scrubStatus.textContent='Historical prefix '+prefix+' / '+r.events.length+' · no execution';
   const g=replayJournalPrefix(r.events,prefix);
   graphRows.replaceChildren();
   for(const node of g.nodes){
    const row=E('article',undefined,'eh-archive-state-row');
    row.append(E('strong',node.label),E('small',node.kind+' · '+node.status));
    graphRows.append(row);
   }
   if(!g.nodes.length)graphRows.append(E('p','No admitted entities at this sequence.','eh-copy'));
   accounting.replaceChildren();
   const metrics=eventAccounting(r.events.slice(0,prefix));
   for(const [key,value] of Object.entries(metrics)){
    if(value===0&&key!=='events')continue;
    const m=E('div',undefined,'eh-metric');
    m.append(E('small',readable(key)),E('strong',String(value)));
    accounting.append(m);
   }
   renderEvents();
  }
  scrubber.addEventListener('input',()=>{prefix=Number(scrubber.value);page=0;renderPrefix();});
  filters.addEventListener('change',()=>{filter=filters.value;page=0;renderEvents();});
  const final=button('Show full retained history',()=>{
   prefix=r.events.length;
   scrubber.value=String(prefix);
   page=0;
   renderPrefix();
  });
  detail.append(field('Historical sequence',scrubber),final,scrubStatus,E('h4','State at selected sequence'),graphRows,E('h4','Observed accounting'),accounting,E('p','Counts are journal observations, not estimated cost, actual provider billing or independent model confirmations. Unknown remote outcomes are not refunded by this view.','eh-copy'),field('Filter event type',filters),nav,events);
  renderPrefix();
 }
 function renderCompare(){
  const a=selectedRecord(),b=library.list().find(x=>x.record.digest===compareId)?.record;
  compareResults.replaceChildren();
  if(!a||!b){
   compareResults.append(E('p','Select two retained archives to compare their recorded metadata.','eh-copy'));
   return;
  }
  const diff=compareRunRecords(a,b);
  compareResults.append(E('p','Same declared version: '+(diff.sameVersion?'yes':'no')+' · same origin: '+(diff.sameOrigin?'yes':'no'),'eh-state'));
  const rows=E('div',undefined,'eh-archive-differences');
  for(const t of diff.tasks.filter(x=>x.relation!=='same_metadata')){
   const row=E('article',undefined,'eh-archive-card');
   row.append(E('strong',t.id),E('small',readable(t.relation)),E('p',(t.before??'Absent')+' → '+(t.after??'Absent'),'eh-copy'));
   rows.append(row);
  }
  if(!rows.childElementCount)rows.append(E('p','No task declaration/state differences in matched metadata.','eh-copy'));
  for(const m of diff.accounting.filter(x=>x.delta!==0)){
   const row=E('article',undefined,'eh-archive-card');
   row.append(E('strong',readable(m.key)),E('p',m.before+' → '+m.after+' · '+(m.delta>0?'+':'')+m.delta,'eh-copy'));
   rows.append(row);
  }
  compareResults.append(rows,E('p',diff.qualification,'eh-copy'));
 }
 function render(){
  renderShelf();
  renderDetail();
  const choices=[['','Select comparison archive'],...library.list().filter(x=>x.record.digest!==selected).map(x=>[x.record.digest,x.record.snapshot.runId+' · '+x.record.digest.slice(7,19)])];
  if(!choices.some(x=>x[0]===compareId))compareId=null;
  options(compareSelect,choices,compareId??'');
  renderCompare();
  sync();
 }
 const unsubscribe=feed.subscribe(()=>{if(active&&!busy)refreshRuns();});
 render();
 return Object.freeze({section,setActive(v){active=!!v;if(active){refreshRuns();render();}},destroy(){unsubscribe();}});
}
