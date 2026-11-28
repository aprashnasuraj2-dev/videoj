import {emptyGraph,projectTaskRun,createResearchProjection,localToolGraph} from './projection.js';
import {identityStyle,layoutGraph,layouts} from './layout.js';
import './workspace.css';
import {mountKnowledgeView,mountComputationView} from './explorers.js';
import {mountCompositionView} from './composition-view.js';
import {mountAtlasView} from './atlas-view.js';
import {fitViewport,zoomViewport,panViewport,centerViewport,viewBox,entityPage,projectGraphFilter} from './navigation.js';
import {replayJournalPrefix} from './replay.js';
import {mountBatchWorkshop} from './batch-workshop.js';
import {mountProofView} from './proof-view.js';
import {publishTaskExecution} from '../execution-channel.js';
const E=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const S=(tag,attrs={})=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const label=s=>String(s??'Unknown').replaceAll('_',' ');
function button(text,fn){const b=E('button',text);b.type='button';b.addEventListener('click',fn);return b;}
function field(name,control){const l=E('label',name,'eh-field');l.append(control);return l;}
function metric(name){const wrap=E('div',undefined,'eh-metric'),value=E('strong','—');wrap.append(E('small',name),value);return {wrap,value};}
function glyph(n,p){
 const {color,shape}=identityStyle(n),g=S('g',{transform:'translate('+p.x+' '+p.y+')'});
 const border=S('circle',{r:29,fill:'none',stroke:color,'stroke-opacity':'.25','stroke-dasharray':'2 5'});
 g.append(border);
 const attrs={fill:'#13252D',stroke:color,'stroke-width':2};
 if(shape==='circle')g.append(S('circle',{r:20,...attrs}));
 else if(shape==='square')g.append(S('rect',{x:-19,y:-19,width:38,height:38,rx:5,...attrs}));
 else if(shape==='diamond')g.append(S('path',{d:'M0 -23 L23 0 L0 23 L-23 0 Z',...attrs}));
 else if(shape==='document')g.append(S('path',{d:'M-16 -21 H8 L17 -12 V21 H-16 Z M8 -21 V-12 H17',...attrs}));
 else g.append(S('path',{d:'M-20 0 L-10 -18 H10 L20 0 L10 18 H-10 Z',...attrs}));
 if(n.status==='executing'||n.status==='validating')g.append(S('circle',{r:34,fill:'none',stroke:color,'stroke-width':2,'stroke-dasharray':'5 4'}));
 g.append(S('circle',{r:4,fill:color}));
 const name=S('text',{y:43,'text-anchor':'middle',fill:'#E6EFEF','font-size':12});
 name.textContent=n.label.length>22?n.label.slice(0,20)+'…':n.label;
 const status=S('text',{y:58,'text-anchor':'middle',fill:'#B2C7CC','font-size':10});status.textContent=label(n.status);
 g.append(name,status);return g;
}
export function mountAdaptiveWorkspace(root,{feed,openTool,openWorkflow}){
 const section=E('section',undefined,'eh-shell');section.id='eh-workspace';section.setAttribute('aria-labelledby','eh-title');
 const head=E('div',undefined,'eh-head'),heading=E('h2','Intelligence takes the shape of the problem.');heading.id='eh-title';
 const lead=E('div');lead.append(E('p','EVENT HORIZON / ADAPTIVE WORKSPACE','eh-kicker'),heading,E('p','Observe the actual task graph and research activity. Participants appear only from recorded runtime state.','eh-copy'));
 const mark=E('span','Read-only runtime projection','eh-mark');head.append(lead,mark);
 const controls=E('div',undefined,'eh-controls'),runSelect=E('select'),layoutSelect=E('select'),filter=E('input'),kindFilter=E('select'),relationFilter=E('select');
 filter.type='search';filter.placeholder='Filter names and types';filter.maxLength=100;
 for(const mode of layouts){const o=E('option',mode==='auto'?'Adaptive layout':label(mode));o.value=mode;layoutSelect.append(o);}
 for(const [id,name] of [['all','All entities'],['participants','Agents and invocations'],['operations','Tasks and tools'],['evidence','Evidence']]){const o=E('option',name);o.value=id;kindFilter.append(o);}
 for(const [id,name] of [['all','All relationships'],['assignment','Assignments'],['dependency','Dependencies'],['invocation ancestry','Observed ancestry']]){const o=E('option',name);o.value=id;relationFilter.append(o);}
 controls.append(field('Run',runSelect),field('Layout',layoutSelect),field('Filter entities',filter),field('Entity type',kindFilter),field('Relationship type',relationFilter));
 const counters=E('div',undefined,'eh-metrics'),agents=metric('Agent / task-owner instances'),invocations=metric('Retained invocations'),entities=metric('Entities'),links=metric('Recorded relations');
 counters.append(agents.wrap,invocations.wrap,entities.wrap,links.wrap);
 const status=E('p','No recorded execution.','eh-status');status.id='eh-status';status.setAttribute('role','status');
 const qualification=E('p',undefined,'eh-copy');
 const split=E('div',undefined,'eh-split'),left=E('div',undefined,'eh-left'),right=E('aside',undefined,'eh-right');right.setAttribute('aria-label','Selected entity details');
 const canvas=E('div',undefined,'eh-canvas');canvas.setAttribute('aria-label','Visual topology; equivalent interactive list below');
 const roster=E('div',undefined,'eh-roster');roster.setAttribute('aria-label','Runtime entities');
 const rosterTitle=E('h3','Participants and operations');
 const viewportControls=E('div',undefined,'eh-viewport-controls'),zoomText=E('small','100%');
 const pageControls=E('div',undefined,'eh-page-controls'),pageText=E('small');
 left.append(viewportControls,canvas,rosterTitle,pageControls,roster);split.append(left,right);
 const timeline=E('details',undefined,'eh-timeline');timeline.append(E('summary','Recorded event timeline'));const eventList=E('ol'),replayControls=E('div',undefined,'eh-replay-controls'),replayInput=E('input'),replayText=E('p',undefined,'eh-state');replayInput.type='range';replayInput.min='0';replayInput.step='1';replayInput.id='eh-replay-sequence';replayControls.append(field('Recorded event sequence',replayInput),replayText);timeline.append(replayControls,eventList);
 const footer=E('p','Visualization does not execute agents, grant consent, or verify factual truth. Use the existing research, review and proof controls to perform operations.','eh-copy');
 const objectiveSlot=E('div',undefined,'eh-objective-slot');objectiveSlot.id='eh-objective-slot';objectiveSlot.hidden=true;
 const tabs=E('nav',undefined,'eh-tabs');tabs.setAttribute('aria-label','Adaptive workspace views');
 const runtime=E('div');runtime.id='eh-runtime';runtime.append(controls,counters,status,qualification,split,timeline,footer);
 section.append(head,objectiveSlot,tabs,runtime);root.prepend(section);
 let selection=null,selectedRun='empty',latestObservedId=null,autoFollow=true,graph=emptyGraph(),destroyed=false,active=true,viewMode='runtime',localSequence=0;
 const localRuns=new Map(),placements=[];
 let pageIndex=0,viewport=null,currentSvg=null,viewportKey=null,currentPositions=new Map(),drag=null,replaySequence=null,replayEvents=[],liveGraph=emptyGraph();
 const research=createResearchProjection();
 const snapshots=()=>{const list=feed.runs().map(r=>projectTaskRun(r,feed.events(r.runId))).filter(Boolean);const trace=research.snapshot();if(trace)list.push(trace);list.push(...localRuns.values());return list;};
 function visibleGraph(){return projectGraphFilter(graph,{query:filter.value,kind:kindFilter.value,relation:relationFilter.value});}
 function applyViewport(){if(!viewport||!currentSvg)return;currentSvg.setAttribute('viewBox',viewBox(viewport));zoomText.textContent=Math.round(viewport.zoom*100)+'%';}
 function fit(){if(!viewport)return;viewport=fitViewport(viewport.extentWidth,viewport.extentHeight);applyViewport();}
 function zoom(factor){if(!viewport)return;viewport=zoomViewport(viewport,factor);applyViewport();}
 function pan(dx,dy){if(!viewport)return;viewport=panViewport(viewport,dx*viewport.width,dy*viewport.height);applyViewport();}
 const viewportButtons=[button('Zoom in',()=>zoom(1.35)),button('Zoom out',()=>zoom(1/1.35)),button('Fit graph',fit),button('Pan left',()=>pan(-.2,0)),button('Pan right',()=>pan(.2,0)),button('Pan up',()=>pan(0,-.2)),button('Pan down',()=>pan(0,.2))];
 viewportControls.append(...viewportButtons,zoomText);
 const prevPage=button('Previous entities',()=>{pageIndex--;render();}),nextPage=button('Next entities',()=>{pageIndex++;render();});pageControls.append(prevPage,pageText,nextPage);
 const goLive=button('Return to current run state',()=>{replaySequence=null;refresh();});replayControls.append(goLive);
 replayInput.addEventListener('input',()=>{if(!replayEvents.length)return;autoFollow=false;replaySequence=Number(replayInput.value);selection=null;pageIndex=0;refresh();});
 function inspect(){
  const n=graph.nodes.find(n=>n.key===selection);right.replaceChildren(E('p','ENTITY INSPECTOR','eh-kicker'));
  if(!n){right.append(E('h3','Select an entity'),E('p','Inspect a recorded agent, invocation, task, tool or evidence node. No activity is inferred from the visual layout.','eh-copy'));return;}
  right.append(E('h3',n.label),E('p',label(n.kind)+' · '+label(n.status),'eh-state'));
  const dl=E('dl',undefined,'eh-details');
  const pairs=[['Identifier',n.id],['Run',graph.runId??'Unknown'],['Version',graph.version??'Not supplied'],['Task kind',n.taskKind],['Assigned agent',n.agentId],['Active tasks',n.activeCount],['Assigned tasks',n.taskCount],['Waiting for',n.waitingFor?.join(', ')],['Reported host role (not instance)',n.reportedRole],['Recorded parent span',n.parentId],['Admitted passages',n.passages],['Start receipt',n.startUnknown?'Unknown':undefined]];
  for(const [k,v] of pairs)if(v!==undefined&&v!==null&&v!==''){dl.append(E('dt',k),E('dd',String(v)));}
  right.append(dl);
  if(n.routeAttempts?.length||n.consultationSlots?.length){right.append(E('h4','Recorded transport phases'));for(const a of n.routeAttempts??[])right.append(E('p',a.routeId+' · '+a.phase,'eh-copy'));for(const a of n.consultationSlots??[])right.append(E('p',a.slotId+' · '+a.phase,'eh-copy'));right.append(E('p','Phase receipt is not billing or truth verification.','eh-copy'));}
  right.append(E('h4','Recorded relationships'));
  const rel=graph.edges.filter(e=>e.from===n.key||e.to===n.key);
  if(!rel.length)right.append(E('p','No recorded relationship.','eh-copy'));
  for(const e of rel){const other=graph.nodes.find(x=>x.key===(e.from===n.key?e.to:e.from));if(!other)continue;const b=button((e.from===n.key?'To ':'From ')+other.label,()=>choose(other.key,true));right.append(b,E('small',e.kind+' · '+e.authority,'eh-copy'));}
 }
 function choose(id,focus=false){
  if(!graph.nodes.some(n=>n.key===id))return;selection=id;
  let view=visibleGraph(),index=view.nodes.findIndex(n=>n.key===id);
  if(index<0&&focus){filter.value='';kindFilter.value='all';view=visibleGraph();index=view.nodes.findIndex(n=>n.key===id);pageIndex=Math.floor(index/32);render();}
  if(index>=0&&Math.floor(index/32)!==pageIndex){pageIndex=Math.floor(index/32);render();}
  if(focus&&viewport&&currentPositions.has(id)&&viewport.zoom>1){const p=currentPositions.get(id);viewport=centerViewport(viewport,p.x,p.y);applyViewport();}
  for(const b of roster.querySelectorAll('button[data-entity]'))b.setAttribute('aria-pressed',String(b.dataset.entity===id));
  for(const g of canvas.querySelectorAll('[data-entity]'))g.setAttribute('data-selected',String(g.dataset.entity===id));
  inspect();
  if(focus)[...roster.querySelectorAll('button[data-entity]')].find(b=>b.dataset.entity===id)?.focus({preventScroll:true});
 }
 function draw(view){
  canvas.replaceChildren();currentSvg=null;drag=null;currentPositions=new Map();const layout=layoutGraph(view,layoutSelect.value);
  viewportControls.hidden=layout.mode==='list'||!view.nodes.length;
  if(!view.nodes.length){const empty=E('div',undefined,'eh-empty');empty.append(E('span','◌','eh-empty-glyph'),E('h3',graph.nodes.length?'No matching entities':'A universe begins with an objective.'),E('p',graph.nodes.length?'Change or clear the filter.':'No synthetic agents, metrics or activity are displayed.','eh-copy'));canvas.append(empty);return;}
  if(layout.mode==='list'){canvas.append(E('p','List projection selected. Every retained entity remains inspectable below.','eh-copy'));return;}
  const signature=graph.id+'|'+layout.mode+'|'+layout.width+'|'+layout.height;
  if(!viewport||viewportKey!==signature){viewport=fitViewport(layout.width,layout.height);viewportKey=signature;}
  const svg=S('svg',{viewBox:viewBox(viewport),role:'img','aria-label':view.nodes.length+' entities; '+view.edges.length+' recorded relationships'});currentSvg=svg;
  const pos=new Map(layout.positions.map(p=>[p.key,p]));currentPositions=pos;
  svg.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType==='touch'||e.target.closest?.('[data-entity]')||viewport.zoom<=1)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};svg.setPointerCapture?.(e.pointerId);});
  svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const box=svg.getBoundingClientRect();if(!box.width||!box.height)return;viewport=panViewport(viewport,(drag.x-e.clientX)*viewport.width/box.width,(drag.y-e.clientY)*viewport.height/box.height);drag.x=e.clientX;drag.y=e.clientY;applyViewport();});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(type,()=>{drag=null;});
  for(const e of view.edges){const a=pos.get(e.from),b=pos.get(e.to);if(!a||!b)continue;const line=S('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:e.kind==='assignment'?'#59727E':'#A5C5BD','stroke-width':1.2,'stroke-dasharray':e.kind==='assignment'?'2 5':'none'});const title=S('title');title.textContent=e.kind+' · '+e.authority;line.append(title);svg.append(line);}
  for(const n of view.nodes){const p=pos.get(n.key);if(!p)continue;const g=glyph(n,p);g.dataset.entity=n.key;g.setAttribute('data-selected',String(selection===n.key));g.addEventListener('click',()=>choose(n.key,true));svg.append(g);}
  canvas.append(svg);applyViewport();
 }
 function render(){
  if(destroyed||!active||viewMode!=='runtime')return;
  const view=visibleGraph(),focused=document.activeElement?.dataset?.entity;
  agents.value.textContent=graph.agentCount===null?'Unknown':String(graph.agentCount);
  invocations.value.textContent=graph.invocationCount===null?'Unknown':String(graph.invocationCount);
  entities.value.textContent=String(graph.nodes.length);links.value.textContent=String(graph.edges.length);
  const summary=graph.label+' · '+label(graph.status);
  if(status.textContent!==summary)status.textContent=summary;
  qualification.textContent=graph.qualification;
  if(selection&&!graph.nodes.some(n=>n.key===selection))selection=null;
  draw(view);roster.replaceChildren();
  const page=entityPage(view.nodes,pageIndex);pageIndex=page.index;pageControls.hidden=page.pages<=1;prevPage.disabled=page.index===0;nextPage.disabled=page.index===page.pages-1;pageText.textContent=page.total?(page.start+1)+'–'+page.end+' of '+page.total:'0 entities';
  for(const n of page.nodes){
   const b=button('',()=>choose(n.key));b.className='eh-entity';b.dataset.entity=n.key;b.setAttribute('aria-pressed',String(n.key===selection));
   b.append(E('strong',n.label),E('small',label(n.kind)+' · '+label(n.status)));roster.append(b);
  }
  if(!view.nodes.length)roster.append(E('p','No entities to inspect.','eh-copy'));
  inspect();eventList.replaceChildren();
  replayControls.hidden=!replayEvents.length;replayInput.max=String(replayEvents.length);replayInput.value=String(replaySequence??replayEvents.length);replayText.textContent=replaySequence===null?'Current retained state · '+replayEvents.length+' events':'Historical prefix · '+replaySequence+' / '+replayEvents.length+' events · no execution';goLive.disabled=replaySequence===null;
  for(const e of [...graph.events].reverse()){const li=E('li');li.append(E('strong','#'+e.sequence+' '+e.label),E('span',e.detail));eventList.append(li);}
  if(!graph.events.length)eventList.append(E('li','No retained events.'));
  if(focused)[...roster.querySelectorAll('button[data-entity]')].find(b=>b.dataset.entity===focused)?.focus({preventScroll:true});
 }
 function refresh(preferred){
  if(preferred)latestObservedId=preferred;
  if(autoFollow&&preferred){if(selectedRun!==preferred){selection=null;pageIndex=0;replaySequence=null;}selectedRun=preferred;}
  if(!active)return;
  const all=snapshots(),options=[emptyGraph(),...all];
  if(!options.some(g=>g.id===selectedRun)){selectedRun=all.at(-1)?.id??'empty';selection=null;pageIndex=0;replaySequence=null;}
  liveGraph=options.find(g=>g.id===selectedRun)??options[0];graph=liveGraph;
  replayEvents=liveGraph.journalBacked?feed.events(liveGraph.runId):[];
  if(replaySequence!==null){try{graph=replayJournalPrefix(replayEvents,replaySequence);}catch{graph={...emptyGraph(),id:'refused-replay',label:'Recorded replay refused',status:'refused',qualification:'The selected historical event prefix could not be reconstructed. No current execution or result is claimed.'};}}
  const signature=options.map(g=>g.id+' '+g.label).join('|');
  if(runSelect.dataset.signature!==signature){runSelect.replaceChildren();for(const g of options){const o=E('option',g.label+(g.runId?' · '+g.runId:''));o.value=g.id;runSelect.append(o);}runSelect.dataset.signature=signature;}
  runSelect.value=selectedRun;render();
 }
 runSelect.addEventListener('change',()=>{autoFollow=false;selectedRun=runSelect.value;selection=null;pageIndex=0;replaySequence=null;refresh();});
 layoutSelect.addEventListener('change',()=>{viewportKey=null;render();});filter.addEventListener('input',()=>{pageIndex=0;render();});for(const select of [kindFilter,relationFilter])select.addEventListener('change',()=>{pageIndex=0;viewportKey=null;render();});
 const follow=button('Follow latest activity',()=>{autoFollow=true;selection=null;pageIndex=0;replaySequence=null;const list=snapshots();selectedRun=list.some(g=>g.id===latestObservedId)?latestObservedId:list.at(-1)?.id??'empty';refresh();});controls.append(follow);
 const knowledge=mountKnowledgeView(section,{openTool});
 const computation=mountComputationView(section,{onStart(label){const id='local_'+(++localSequence);const g=localToolGraph({id,label,status:'executing'});localRuns.set(g.id,g);if(localRuns.size>8)localRuns.delete(localRuns.keys().next().value);refresh(g.id);return {id,label};},onEnd(operation,status){if(!operation)return;const g=localToolGraph({...operation,status});if(g&&localRuns.has(g.id)){localRuns.set(g.id,g);refresh(g.id);}}});
 const composition=mountCompositionView(section,{openWorkflow(id){if(id==='direct_compute')switchView('computation');else openWorkflow(id);}});
 const atlas=mountAtlasView(section);
 const batch=mountBatchWorkshop(section,{publish:publishTaskExecution,onObserve(runId){autoFollow=false;selectedRun='task/'+encodeURIComponent(runId);selection=null;pageIndex=0;replaySequence=null;switchView('runtime');}});
 const proof=mountProofView(section);
 const views=[['runtime','Runtime',runtime],['composition','Compose',composition],['knowledge','Knowledge',knowledge.section],['computation','Direct compute',computation],['atlas','Agent Atlas',atlas],['batch','Task workshop',batch.section],['proof','Proof workbench',proof]];
 function switchView(next){viewMode=next;for(const [id,,panel] of views)panel.hidden=id!==next;for(const b of tabs.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.view===next));knowledge.setActive(active&&next==='knowledge');if(next==='runtime')refresh();}
 for(const [id,name,panel] of views){const b=button(name,()=>switchView(id));b.dataset.view=id;b.setAttribute('aria-controls',panel.id);tabs.append(b);}
 function setActive(value){active=!!value;for(const {node,marker} of placements){if(active)objectiveSlot.append(node);else marker.after(node);}objectiveSlot.hidden=!active||!placements.length;knowledge.setActive(active&&viewMode==='knowledge');if(active)refresh();}
 function attachObjective(elements){for(const node of elements){if(!node||placements.some(p=>p.node===node))continue;const marker=document.createComment('Original objective control position');node.before(marker);placements.push({node,marker});}setActive(active);}
 const unsubscribe=feed.subscribe((event,snapshot)=>{const p=projectTaskRun(snapshot);if(p)refresh(p.id);});
 switchView('runtime');
 return Object.freeze({
  startResearch(){research.begin();refresh(research.snapshot().id);},
  observeResearch(e,mode){if(research.accept(e,mode))refresh(research.snapshot().id);},
  endResearch(status){research.end(status);refresh(research.snapshot()?.id);},
  setActive,attachObjective,updateKnowledge(state){knowledge.update(state);},
  destroy(){destroyed=true;batch.cancel();unsubscribe();section.remove();}
 });
}
