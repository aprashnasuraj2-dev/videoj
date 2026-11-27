import {createRoleReviewCheckpoint,openRoleReviewCheckpoint,projectRoleReviewEvents,verifyRoleReviewCheckpoint} from '../../../packages/sutra-knowledge/role-review-checkpoint.js';
import {impactProjection} from './impact-projection.js';
import {runInvestigationReview,ROLE_REVIEW_TASKS} from '../../../packages/sutra-knowledge/investigation-role-review.js';
import {createFrameDriver} from './frame-driver.js';
import {investigationGraph,traceDependencies} from './investigation-graph.js';
import {createCouncilActivity} from './council-activity.js';
import {renderGuestbook} from './orbit-guestbook.js';
// Agent-native SUTRA. Presentation-only simulation and public council telemetry are separate.
import './orbit.css';
const $=id=>document.getElementById(id), E=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const S=(tag,attrs={})=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const btn=(text,fn,cls='orb-button')=>{const b=E('button',text,cls);b.type='button';b.addEventListener('click',fn);return b;};
const ROLE=[['planner','Bot','Planner','methodical','#ef7854'],['researcher','Drone','Researcher','exploratory','#52c4a2'],['coder','Gear','Coder','precise','#9397ff'],['analyst','Orb','Analyst','quantitative','#f1bd65'],['coordinator','Node','Coordinator','synthetic','#e78dc3'],['critic','Spark','Critic','skeptical','#b7ec77']];
const STATIONS=[
 ['Question','Frame the investigation','review-question'],['Evidence','Stage exact source text','review-source-id'],['Quantities','Review source spans','review-select-text'],['Interpretations','Competing proposed meanings','review-semantic-list'],['Compute','Evaluate conditional outcomes','review-semantic-run'],['Challenge','Preview evidence withdrawal','review-source-revise-panel'],['Impact','Compare source revisions','review-transaction-panel'],['History','Retain and compare versions','review-history-panel'],['Verify','Inspect replay and export','review-roundtrip-run'],['Consent','Exact disclosure approval','operator-model-console'],['Routes','Model connections','agent-studio'],['Recovery','Restore missing evidence','review-recovery-panel']
];
const PROVIDERS=[['openai','OpenAI','openai-compatible-json','https://api.openai.com/v1/chat/completions'],['anthropic','Anthropic','anthropic-messages-json','https://api.anthropic.com/v1/messages'],['google','Google Gemini','openai-compatible-json','https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'],['ollama','Ollama','ollama-chat-json','http://127.0.0.1:11434/api/chat'],['openrouter','OpenRouter','openai-compatible-json','https://openrouter.ai/api/v1/chat/completions'],['custom','Custom','openai-compatible-json','']];
const steps=[
 [0,'thinking','Frame a bounded question',0,1],[1,'working','Inspect the synthetic source inventory',1,2],[2,'working','Select declared numeric tokens',2,3],[3,'thinking','Compare competing interpretations',3,4],[3,'working','Rehearse conditional calculation',4,5],[5,'communicating','Propose withdrawal challenge',5,3],[4,'working','Record hypothetical impact',6,0],[0,'waiting','Require human review before revision',7,4],[4,'communicating','Prepare a replay handoff',8,5],[5,'working','Distinguish computation from truth',8,4]
];
let root,agents=[],stationGroups=[],edges=[],mode='map',selected=0,selectedStation=null,simulation=false,playing=false,index=0,elapsed=0,lastTick=0,rotation=0,targetRotation=0,zoom=1,drag=null,latest=null,events=[],configs=[],policy='ask',era=false,lastState='',rehearsalFinished=false,konami=0,sound=false,audio=null;
const councilActivity=createCouncilActivity();
let graphSelection=null,lastWorkspaceStatus='';
let activeReview=null,reviewResult=null,reviewState='idle',impactView=null;const reviewEvents=[];
let checkpointExport=null,checkpointOpened=null,checkpointBusy=false,checkpointEpoch=0,checkpointVersion=undefined,checkpointController=null,checkpointStatus='No imported checkpoint.';
const reviewStations={frame:0,evidence:1,compute:4,analysis:3,challenge:5,coordinate:8};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const frameDriver=createFrameDriver({request:fn=>requestAnimationFrame(fn),cancel:id=>cancelAnimationFrame(id),visible:()=>!document.hidden,onFrame:frame});
function go(id){const t=$(id);if(!t)return;for(let p=t;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;const focus=t.tagName==='DETAILS'?t.querySelector('summary'):t;if(!focus.matches('button,a,input,textarea,select,summary,[tabindex]'))focus.tabIndex=-1;if(!focus.disabled)focus.focus({preventScroll:true});t.scrollIntoView({block:'start'});}
function beep(kind='click'){if(!sound)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio??=new AC();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=kind==='done'?660:kind==='error'?160:330;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.1);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.11);}catch{}}
function icon(type,color){
 const g=S('g',{stroke:color,'stroke-width':2.4,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'});
 const shape=(tag,attrs)=>g.append(S(tag,attrs));
 if(type==='Bot'){shape('path',{d:'M0 -16 V-23 M-4 -23 H4 M-19 -8 H-23 V7 H-19 M19 -8 H23 V7 H19'});shape('rect',{x:-18,y:-16,width:36,height:32,rx:8,fill:'#172721'});shape('rect',{x:-11,y:-6,width:6,height:8,rx:2,fill:color,class:'orb-eyes'});shape('rect',{x:5,y:-6,width:6,height:8,rx:2,fill:color,class:'orb-eyes'});shape('path',{d:'M-6 9 H6'});}
 if(type==='Drone'){shape('circle',{r:12,fill:'#172721'});shape('circle',{r:5,fill:color});for(const [x,y] of [[-16,-16],[16,-16],[-16,16],[16,16]]){shape('path',{d:'M0 0 L'+x+' '+y});const rotor=S('g',{transform:'translate('+x+' '+y+')'});rotor.append(S('circle',{r:7}),S('path',{d:'M-7 0 H7 M0 -7 V7',class:'orb-spin'}));g.append(rotor);}}
 if(type==='Gear'){for(const [x,y,r,cl] of [[-7,-4,13,'orb-spin'],[12,10,8,'orb-spin reverse']]){const wrap=S('g',{transform:'translate('+x+' '+y+')'}),gear=S('g',{class:cl});let d='';for(let i=0;i<32;i++){const a=i*Math.PI/16,rad=i%4===0||i%4===3?r:r+4;d+=(i?'L':'M')+(Math.cos(a)*rad)+' '+(Math.sin(a)*rad)+' ';}gear.append(S('path',{d:d+'Z',fill:'#172721'}),S('circle',{r:r*.4,fill:color}));wrap.append(gear);g.append(wrap);}}
 if(type==='Orb'){shape('circle',{r:18,class:'orb-pulse'});shape('circle',{r:12,fill:'#172721'});shape('circle',{r:6,fill:color});const ring=S('g',{class:'orb-spin'});ring.append(S('ellipse',{rx:24,ry:10,transform:'rotate(-35)'}),S('circle',{cx:20,cy:-10,r:3,fill:color}));g.append(ring);}
 if(type==='Node'){for(let i=0;i<5;i++){const x=Math.cos(i*2*Math.PI/5)*20,y=Math.sin(i*2*Math.PI/5)*20;shape('path',{d:'M0 0 L'+x+' '+y});shape('circle',{cx:x,cy:y,r:5,fill:'#172721'});}shape('circle',{r:9,fill:color});}
 if(type==='Spark'){shape('path',{d:'M0 -23 L5 -9 L18 -16 L13 -3 L25 0 L12 5 L18 18 L4 13 L0 25 L-5 12 L-18 18 L-13 4 L-25 0 L-12 -5 L-18 -18 L-4 -12 Z',fill:'#172721'});shape('ellipse',{rx:10,ry:5});shape('circle',{r:3,fill:color,class:'orb-eyes'});}
 return g;
}
function announce(text){$('orb-live').textContent=text;}
function record(kind,from,to,text){const e={kind,from,to,text,time:new Date().toISOString(),seq:(events.at(-1)?.seq??0)+1};events.push(e);if(events.length>120)events.shift();if(from!==null&&agents[from]){const a=agents[from];a.notes.push(e);if(a.notes.length>10)a.notes.shift();}if(from!==null&&to!==null&&from!==to)edges.push({from,to,born:performance.now(),kind});if(edges.length>36)edges.shift();renderLog();if(selectedStation===null||kind==='WORKSPACE'||kind==='LOCAL CONFIG')renderInspector();announce(kind+': '+text);frameDriver.wake();}
function renderLog(){const box=$('orb-log');box.replaceChildren();const list=events.slice(-12).reverse();if(!list.length)box.append(E('p','No operation events. Start the labeled rehearsal or run the local council.','orb-muted'));for(const e of list){const row=E('article',undefined,'orb-event');row.append(E('small',e.kind.toUpperCase()+' · '+e.time.slice(11,19)),E('strong',e.from===null?'Workspace':ROLE[e.from][1]+(e.to===null?'':' → '+ROLE[e.to][1])),E('p',e.text));box.append(row);}}
function existingAction(text,id,cls='orb-button'){const target=$(id),b=btn(text,()=>{if(!target.disabled)target.click();},cls);b.disabled=!!target.disabled;return b;}
function graphDetail(box,station){
 const g=investigationGraph(latest),kinds=station===1?['evidence','declared_lineage']:station===2?['reviewed_quantity']:['candidate_interpretation'];
 const nodes=g.nodes.filter(n=>kinds.includes(n.kind)),byId=new Map(g.nodes.map(n=>[n.id,n]));
 box.append(E('h3','Recorded dependencies'),E('p',g.qualification,'orb-muted'));
 if(!nodes.length){box.append(E('p','No matching dependency nodes recorded.','orb-muted'));return;}
 const label=E('label','Inspect dependency node');label.htmlFor='orb-graph-node';const select=E('select');select.id='orb-graph-node';
 for(const n of nodes){const option=E('option',n.id);option.value=n.id;select.append(option);}
 if(nodes.some(n=>n.id===graphSelection))select.value=graphSelection;
 const details=E('div',undefined,'orb-event');
 function inspect(){
  const id=select.value;graphSelection=id;details.replaceChildren();
  const up=traceDependencies(g,id),down=traceDependencies(g,id,true);
  for(const [title,items] of [['Upstream dependencies',up],['Downstream affected nodes',down]]){
   details.append(E('strong',title+' · '+items.size));
   if(!items.size)details.append(E('p','None recorded','orb-muted'));
   for(const other of [...items].slice(0,30)){const n=byId.get(other);details.append(E('p',(n?.kind??'node')+' · '+other,'orb-muted'));}
   if(items.size>30)details.append(E('p','Showing 30 of '+items.size+' nodes. Open full investigation graph for detailed inspection.','orb-muted'));
  }
  const direct=g.edges.filter(e=>e.dependent===id||e.dependency===id);
  for(const edge of direct.slice(0,30))details.append(E('small',edge.dependent+' depends on '+edge.dependency+' · '+edge.relation+' · '+edge.authority));
 }
 select.addEventListener('change',inspect);box.append(label,select,details);inspect();
 box.append(btn('Open full investigation graph',()=>{setMode('investigation',true);$('sutra-master').querySelector('[data-sm-view="evidence"]')?.click();go('sm-work');}));
}
function updateImpactView(state){
 try{impactView=state.counterfactual?impactProjection(state.counterfactual):null;}catch{impactView=null;}
 const affectedKinds=new Set(impactView?.nodes.map(n=>n.kind)??[]);
 const stationKinds={0:['question'],1:['evidence','declared_lineage'],2:['reviewed_quantity'],3:['candidate_interpretation'],4:['candidate_interpretation']};
 for(const [i,group] of stationGroups.entries())group.dataset.affected=String((stationKinds[i]??[]).some(k=>affectedKinds.has(k)));
}
function counterfactualDetail(box,s,i){
 const p=impactView,kind=s.counterfactual?.kind;
 if(i===5&&s.sources.length){
  const label=E('label','Source to challenge');label.htmlFor='orb-withdraw-source';const pick=E('select');pick.id='orb-withdraw-source';pick.disabled=s.busy;
  const original=$('review-source-revise-pick');
  for(const source of s.sources){const o=E('option',source.id);o.value=source.id;pick.append(o);}
  if(s.sources.some(x=>x.id===original.value))pick.value=original.value;
  pick.addEventListener('change',()=>{original.value=pick.value;original.dispatchEvent(new Event('change',{bubbles:true}));});
  box.append(label,pick,existingAction('Preview versioned source withdrawal','review-source-withdraw-version-preview','orb-primary'));
  if(!s.baseline)box.append(E('p','Retain the evaluated version as baseline first.','orb-muted'));
 }
 if(!p){box.append(E('p','No canonical versioned impact to display. Preview a withdrawal or revision first.','orb-muted'));return;}
 box.append(E('h3',kind==='applied-revision'?'Applied revision impact':'Proposed child — no change applied'),E('p',p.beforeDigest+' → '+p.afterDigest,'orb-muted'));
 const counts=E('p',p.nodes.length+' affected recorded nodes · '+p.edges.length+' recorded path edges');counts.id='orb-impact-counts';box.append(counts);
 const groupOrder=[['question','declared_lineage','evidence'],['reviewed_quantity'],['candidate_interpretation']];
 const groups=groupOrder.map(kinds=>p.nodes.filter(n=>kinds.includes(n.kind)));
 const maxRows=Math.max(1,...groups.map(g=>g.length)),height=44+maxRows*38;
 const svg=S('svg',{viewBox:'0 0 420 '+height,width:'100%',role:'img','aria-label':'Affected recorded dependency paths. Text alternative follows.'}),positions=new Map();
 for(const [col,group] of groups.entries())for(const [row,n] of group.entries())positions.set(n.id,{x:8+col*139,y:28+row*38,w:126,h:28,n});
 const headers=['Evidence / question','Quantities','Interpretations'];
 for(const [col,label] of headers.entries()){const t=S('text',{x:71+col*139,y:16,'text-anchor':'middle',class:'orb-impact-label'});t.textContent=label;svg.append(t);}
 for(const e of p.edges){const a=positions.get(e.dependency),b=positions.get(e.dependent);if(!a||!b)continue;const path=S('path',{d:'M'+(a.x+a.w)+' '+(a.y+a.h/2)+' C'+(a.x+a.w+12)+' '+(a.y+a.h/2)+' '+(b.x-12)+' '+(b.y+b.h/2)+' '+b.x+' '+(b.y+b.h/2),class:'orb-impact-edge','data-version-state':e.state});svg.append(path);}
 for(const {x,y,w,h,n} of positions.values()){const g=S('g',{'data-node-state':n.state,'data-root':String(n.root)});g.append(S('rect',{x,y,width:w,height:h,rx:4,class:'orb-impact-node'}));const t=S('text',{x:x+w/2,y:y+17,'text-anchor':'middle',class:'orb-impact-label'});const name=n.id.slice(n.id.indexOf(':')+1);t.textContent=name.length>18?name.slice(0,16)+'…':name;g.append(t);svg.append(g);}
 box.append(svg,E('p','Solid lines: both versions. Dashed lines: one version only. Root outlines: directly changed inputs.','orb-muted'));
 const list=E('details',undefined,'orb-event');list.append(E('summary','Exact affected nodes and edges'));
 for(const n of p.nodes)list.append(E('p',n.id+' · '+n.state+(n.root?' · changed input':'')));
 for(const e of p.edges)list.append(E('p',e.dependency+' → '+e.dependent+' · '+e.relation+' · '+e.authority+' · '+e.state));
 box.append(list);
 const rows=E('div');rows.id='orb-impact-candidates';
 for(const c of p.candidates){const item=E('article',undefined,'orb-event');item.dataset.affected=String(c.dependencyAffected);item.append(E('strong',c.id),E('p',c.before+' → '+c.after),E('small',(c.dependencyAffected?'Affected recorded dependency':'No affected recorded dependency')+' · '+(c.reviewRequired?'Review required':'No new scoped review issue')));rows.append(item);}
 box.append(rows,E('p',p.qualification,'orb-muted'));
 if(kind==='withdrawal-preview')box.append(existingAction('Confirm withdrawal and replay child','review-source-withdraw-version-apply','orb-primary'));
 if(kind==='transaction-preview')box.append(btn('Review and confirm atomic revision',()=>go('review-transaction-panel'),'orb-primary'));
}
function stationDetail(box,i){
 const s=latest;if(!s)return;
 if(i===0){
  const label=E('label','Investigation question');label.htmlFor='orb-station-question';
  const input=E('textarea');input.id='orb-station-question';input.rows=3;input.maxLength=1000;input.value=s.question;
  box.append(label,input,btn('Apply question to draft',()=>{const target=$('review-question');if(target.disabled)return;target.value=input.value;target.dispatchEvent(new Event('input',{bubbles:true}));renderInspector();},'orb-primary'),E('p','Changing the question invalidates the current computation. Historical baselines remain separate.','orb-muted'));
  for(const [id,label] of [['finance','Finance'],['engineering','Network engineering'],['statistics','Statistics'],['two-groups','Two-group comparison']])box.append(existingAction((s.question?'Replace draft: ':'Load example: ')+label,'review-sample-'+id));
 }else if(i===1||i===2){
  box.append(E('p',s.sources.length+' staged sources · '+s.bindings.length+' reviewed quantities','orb-muted'));
  for(const source of s.sources){const row=E('article',undefined,'orb-event');row.append(E('strong',source.id),E('small','Declared lineage: '+source.lineage));for(const b of s.bindings.filter(x=>x.sourceId===source.id))row.append(E('p',b.id+' = '+source.text.slice(b.start,b.end)+' '+b.type.unit));box.append(row);}
 }else if(i===3||i===4){
  box.append(E('p',s.proposalCount+' staged candidates'));
  if(s.current){for(const c of s.current.report.investigation.candidates){const row=E('article',undefined,'orb-event');row.append(E('strong',c.meaning),E('p',String(c.computation?.status??c.reason??'REFUSED').replaceAll('_',' ')));box.append(row);}box.append(E('p','Conditional computation only; meaning remains unverified.','orb-muted'));}
  box.append(existingAction('Evaluate current candidates','review-semantic-run','orb-primary'));
 }else if(i===5||i===6){
  box.append(E('p',s.baseline?'Baseline retained. Review a versioned challenge.':'No retained baseline. Evaluate a version first.','orb-muted'));
  box.append(existingAction('Retain current baseline','review-semantic-retain'),btn('Open challenge and impact view',()=>{setMode('investigation',true);const b=$('sutra-master').querySelector('[data-sm-view="challenge"]');b?.click();},'orb-primary'));
  counterfactualDetail(box,s,i);
 }else if(i===7){
  box.append(E('p',s.history?s.history.view.versions.length+' exact versions retained':'No retained history'),existingAction('Start history from root','review-history-create'),existingAction('Append current child','review-history-append'));
 }else if(i===8){
  box.append(E('p',s.current?'Current version: '+s.current.digest:'No current version','orb-muted'),existingAction('Export version','review-semantic-export'),existingAction('Save separate digest','review-semantic-export-pin'));
  if(s.current)for(const [k,v] of Object.entries(s.current.report.investigation.verification))box.append(E('p',k.replace(/([A-Z])/g,' $1')+': '+String(v).replaceAll('_',' '),'orb-muted'));
 }else if(i===9){box.append(btn('Inspect permission matrix',()=>setMode('policy',true),'orb-primary'));}
 else if(i===10){box.append(btn('Open six connection drafts',()=>setMode('routes',true),'orb-primary'));}
 else if(i===11){box.append(E('p','Recovery requires the exact retained baseline or a separately pinned report. No missing input is invented.','orb-muted'));}
 if([1,2,3,4].includes(i))graphDetail(box,i);
}
function renderInspector(){const a=agents[selected],box=$('orb-inspect');box.replaceChildren();if(selectedStation!==null){const [name,desc,id]=STATIONS[selectedStation];box.append(E('p','INVESTIGATION STATION','orb-kicker'),E('h2',name),E('p',desc),btn('Open '+name,()=>go(id),'orb-primary'));stationDetail(box,selectedStation);return;}
 const info=ROLE[selected],cfg=configs[a.route];box.append(E('p','AGENT / '+info[0].toUpperCase(),'orb-kicker'),E('h2',info[1]+' / '+info[2]),E('p',info[3]+' personality · '+a.status,'orb-muted'));
 const metrics=E('div',undefined,'orb-meters');for(const [name,value] of [['Rehearsal energy',Math.round(a.energy)+'%'],['Rehearsal completions',String(a.done)]]){const row=E('div');row.append(E('small',name),E('strong',value));metrics.append(row);}box.append(metrics,E('p','Route draft: '+cfg.name+' / '+(cfg.model||'not configured'),'orb-muted'),E('p','Simulated reservation: '+a.reserved+' / '+a.cap+' units · '+(a.activeRoute??'no hypothetical model route'),'orb-muted'),btn('Edit route',()=>setMode('routes',true)));
 const artifact=reviewResult?.version===latest?.current?.digest?reviewResult?.artifacts.find(x=>x.agentId===info[0]):null;
 if(artifact){const d=E('details',undefined,'orb-event');d.append(E('summary','Admitted local '+artifact.kind+' artifact'),E('pre',JSON.stringify(artifact.value,null,2)));box.append(d);}
 box.append(E('h3','Recent activity (up to 10)'));if(!a.notes.length)box.append(E('p','No recorded activity.','orb-muted'));for(const e of a.notes.slice().reverse())box.append(E('p',e.kind+' · '+e.text,'orb-event-note'));
}
function selectAgent(i){selected=i;selectedStation=null;for(const [k,a] of agents.entries())a.g.setAttribute('aria-pressed',String(k===i));for(const [k,n] of stationGroups.entries())n.setAttribute('aria-pressed','false');renderInspector();beep();}
function selectStation(i){selectedStation=i;for(const [k,n] of stationGroups.entries())n.setAttribute('aria-pressed',String(k===i));for(const a of agents)a.g.setAttribute('aria-pressed','false');renderInspector();beep();}
function keyClick(g,fn){g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-pressed','false');g.addEventListener('click',fn);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});}
function setupMap(){
 const svg=$('orb-map');const bg=S('g',{class:'orb-rings'});for(const r of [64,118,177,229])bg.append(S('circle',{cx:360,cy:270,r}));for(let i=0;i<12;i++){const a=i*Math.PI/6;bg.append(S('line',{x1:360+Math.cos(a)*74,y1:270+Math.sin(a)*74,x2:360+Math.cos(a)*229,y2:270+Math.sin(a)*229}));}svg.append(bg);
 const trace=S('g',{id:'orb-traces','aria-hidden':'true'});svg.append(trace);const core=S('g',{class:'orb-core'});core.append(S('circle',{cx:360,cy:270,r:58}),S('text',{x:360,y:263,'text-anchor':'middle',class:'orb-core-title'}),S('text',{x:360,y:285,'text-anchor':'middle',class:'orb-core-sub'}));core.children[1].textContent='SUTRA';core.children[2].textContent='INVESTIGATION';svg.append(core);
 for(const [i,[name,desc]] of STATIONS.entries()){const g=S('g',{class:'orb-station','aria-label':name+' station: '+desc});g.append(S('circle',{r:18,class:'orb-station-ring'}),S('circle',{r:4,class:'orb-station-dot'}));const t=S('text',{y:31,'text-anchor':'middle'});t.textContent=name;g.append(t);keyClick(g,()=>selectStation(i));stationGroups.push(g);svg.append(g);}
 for(const [i,[id,type,role,personality,color]] of ROLE.entries()){const g=S('g',{class:'orb-agent','aria-label':type+' '+role});g.append(S('circle',{r:34,class:'orb-agent-halo',stroke:color}),icon(type,color));const name=S('text',{y:45,'text-anchor':'middle',class:'orb-agent-name'});name.textContent=type;const status=S('text',{y:57,'text-anchor':'middle',class:'orb-agent-status'});status.textContent='idle';g.append(name,status);keyClick(g,()=>selectAgent(i));svg.append(g);const angle=i*Math.PI/3-Math.PI/2;agents.push({id,route:i,x:360+Math.cos(angle)*134,y:270+Math.sin(angle)*134,vx:0,vy:0,station:null,status:'idle',energy:100,done:0,responses:0,reserved:0,cap:2048,activeRoute:null,notes:[],g,statusText:status});}
 svg.addEventListener('pointerdown',e=>{if(e.target.closest('[role=button]'))return;drag={x:e.clientX,rotation:targetRotation};svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{if(drag){targetRotation=drag.rotation+(e.clientX-drag.x)*.008;frameDriver.wake();}});for(const event of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(event,()=>{drag=null;});
 svg.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoom=Math.min(1.18,Math.max(.72,zoom-e.deltaY*.001));frameDriver.wake();},{passive:false});
 const list=$('orb-list');for(const [i,[name]] of STATIONS.entries())list.append(btn(name,()=>selectStation(i)));const roster=$('orb-roster');for(const [i,[,type,role]] of ROLE.entries())roster.append(btn(type+' · '+role,()=>selectAgent(i)));
}
function coordinates(i,r){const angle=i*Math.PI/6-Math.PI/2+rotation;return [360+Math.cos(angle)*r*zoom,270+Math.sin(angle)*r*zoom];}
function frame(now,dt){
 const mapVisible=root&&!root.hidden&&(mode==='map'||mode==='swarm');
 let moving=false;
 if(mapVisible){
  rotation=reduced.matches||Math.abs(targetRotation-rotation)<.001?targetRotation:rotation+(targetRotation-rotation)*Math.min(1,dt*10);
  moving=rotation!==targetRotation;
  for(const [i,g] of stationGroups.entries()){const [x,y]=coordinates(i,214);g.setAttribute('transform','translate('+x+' '+y+')');}
  for(const [i,a] of agents.entries()){
   const [tx,ty]=coordinates(a.station??i*2,a.station===null?126:166);
   if(reduced.matches||(Math.hypot(tx-a.x,ty-a.y)<.15&&Math.hypot(a.vx,a.vy)<.15)){a.x=tx;a.y=ty;a.vx=a.vy=0;}
   else{a.vx+=(tx-a.x)*145*dt;a.vy+=(ty-a.y)*145*dt;const damping=Math.exp(-19*dt);a.vx*=damping;a.vy*=damping;a.x+=a.vx*dt;a.y+=a.vy*dt;moving=true;}
   a.g.setAttribute('transform','translate('+a.x+' '+a.y+')');a.g.dataset.status=a.status;a.statusText.textContent=a.status;
  }
  const trace=$('orb-traces');if(trace.childNodes.length||edges.length)trace.replaceChildren();
  edges=edges.filter(e=>now-e.born<2400);
  for(const e of edges){const a=agents[e.from],b=agents[e.to];if(!a||!b)continue;const progress=reduced.matches?.6:Math.min(1,(now-e.born)/1800);trace.append(S('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'orb-link'}),S('circle',{cx:a.x+(b.x-a.x)*progress,cy:a.y+(b.y-a.y)*progress,r:4,class:'orb-packet'}));}
 }else edges=edges.filter(e=>now-e.born<2400);
 if(playing){elapsed+=dt;if(elapsed>=1.35){elapsed=0;step();}}
 if(simulation&&playing&&now-lastTick>750){lastTick=now;for(const a of agents){a.energy=Math.max(0,Math.min(100,a.energy+(a.status==='working'?-2:a.status==='idle'?1:0)));}if(mapVisible)updateMetrics();}
 return playing||(mapVisible&&(moving||edges.length>0));
}
function updateMetrics(){const a=agents[selected];if(!a||selectedStation!==null)return;const v=$('orb-inspect').querySelector('.orb-meters strong');if(v)v.textContent=Math.round(a.energy)+'%';}
function rehearsalRoute(a){
 const configured=c=>Boolean(c?.model.trim()&&c?.endpoint.trim());
 const preferred=configs[a.route];if(configured(preferred))return preferred;
 for(const id of String(preferred?.fallback??'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean)){const c=configs.find(x=>x.id===id);if(configured(c))return c;}
 return configs.filter(configured).sort((a,b)=>(Number(a.priority)||999)-(Number(b.priority)||999)||a.id.localeCompare(b.id))[0]??null;
}
function step(){if(!simulation||rehearsalFinished)return;if(index>=steps.length){playing=false;rehearsalFinished=true;for(const a of agents){if(a.status==='working')a.done++;a.status='idle';a.station=null;}record('SIMULATED',null,null,'Rehearsal complete. No source, model or investigation was changed.');renderControls();beep('done');return;}
 for(const a of agents)if(a.status!=='idle'){if(a.status==='working')a.done++;a.status='idle';a.station=null;}const [from,status,text,station,to]=steps[index];const a=agents[from],route=rehearsalRoute(a),units=status==='working'?256:status==='thinking'?128:64;const reservation=route?Math.min(units,Math.max(1,Math.min(4096,Number(route.tokens)||1024))):0;if(a.reserved+reservation>a.cap){playing=false;a.status='waiting';a.station=station;record('SIMULATED',from,null,'Rehearsal reservation cap reached. Increase this role’s simulated budget in API routes, then resume.');renderControls();return;}index++;a.reserved+=reservation;a.activeRoute=route?.id??null;a.status=status;a.station=station;if(status==='working')a.energy=Math.max(0,a.energy-6);record('SIMULATED',from,to,text+(route?' · hypothetical route '+route.name+' / '+route.model+' · '+reservation+' simulated token units':' · deterministic local step, no model selected'));renderControls();}
function start(){if(activeReview){announce('Finish or cancel the deterministic review before rehearsal.');return;}if($('studio-run').disabled){announce('Wait for the current actual council to finish before starting a rehearsal.');return;}if(policy==='deny'){record('SIMULATED',null,null,'Rehearsal denied by local rehearsal policy.');return;}if(!simulation||rehearsalFinished){index=0;elapsed=0;rehearsalFinished=false;for(const a of agents){a.done=0;a.energy=100;a.reserved=0;a.activeRoute=null;a.station=null;a.status='idle';}simulation=true;record('SIMULATED',null,null,'Explicit deterministic rehearsal started. No external calls or hidden model thoughts.');}playing=true;renderControls();}
function cancel(){playing=false;simulation=false;index=0;rehearsalFinished=false;for(const a of agents){a.status='idle';a.station=null;}record('SIMULATED',null,null,'Rehearsal stopped; no investigation mutation.');renderControls();}
function renderControls(){$('orb-play').textContent=playing?'Pause rehearsal':index>0&&!rehearsalFinished?'Resume rehearsal':'Start simulated rehearsal';$('orb-step').disabled=playing||!simulation||rehearsalFinished;$('orb-stop').disabled=!simulation;$('orb-progress').textContent=(simulation?'SIMULATED · '+index+'/'+steps.length:'Rehearsal idle')+' · no external model contact';frameDriver.wake();}
function setMode(next,write=false){mode=next;if(write&&location.hash!=='#'+next)history.pushState(null,'','#'+next);root.dataset.mode=next;$('orb-play').hidden=next!=='map'&&next!=='swarm';$('orb-map-title').textContent=next==='swarm'?'Agent swarm / role activity':'Six roles. Twelve stations.';for(const b of root.querySelectorAll('[data-orb-mode]'))b.setAttribute('aria-pressed',String(b.dataset.orbMode===next));for(const p of root.querySelectorAll('[data-orb-panel]'))p.hidden=p.dataset.orbPanel!==next&&!(p.dataset.orbPanel==='map'&&next==='swarm');if(next==='swarm')selectAgent(selected);if(next==='routes')renderRoutes();if(next==='policy')renderPolicy();if(next==='audit')renderAudit();if(next==='guestbook')renderGuestbook($('orb-guestbook'));if(next==='investigation'){$('orb-investigation').append($('sutra-master'));$('sutra-master').hidden=false;}else if($('sutra-master'))$('sutra-master').hidden=true;frameDriver.wake();}
function routeInput(label,value,fn,type='text'){const wrap=E('label',undefined,'orb-field');wrap.append(E('span',label));const input=E('input');input.type=type;input.value=value;input.autocomplete='off';input.addEventListener('input',()=>fn(input.value));wrap.append(input);return wrap;}
function renderRoutes(){const box=$('orb-routes');box.replaceChildren(E('h2','Model routes / six connection drafts'),E('p','Descriptors only. No API keys here. Existing SUTRA council accepts two connections per run, and the local operator exports approved plans. Draft temperature is metadata; fallback and priority govern only the labeled rehearsal route selector, not actual transport authority.','orb-muted'));
 const grid=E('div',undefined,'orb-route-grid');for(const [i,c] of configs.entries()){const card=E('section',undefined,'orb-route');card.append(E('h3',c.name),routeInput('Model ID',c.model,v=>{c.model=v;renderInspector();}),routeInput('Endpoint descriptor',c.endpoint,v=>c.endpoint=v),routeInput('Local credential environment name (not a key)',c.credentialEnv??'',v=>c.credentialEnv=v),routeInput('Temperature (draft)',c.temperature,v=>c.temperature=v,'number'),routeInput('Token budget (draft)',c.tokens,v=>c.tokens=v,'number'),routeInput('Fallback (draft)',c.fallback,v=>c.fallback=v),routeInput('Priority (draft)',c.priority,v=>c.priority=v,'number'));
 const proto=E('label',undefined,'orb-field');proto.append(E('span','Protocol'));const select=E('select');for(const p of ['openai-compatible-json','anthropic-messages-json','ollama-chat-json']){const o=E('option',p);o.value=p;select.append(o);}select.value=c.protocol;select.addEventListener('change',()=>c.protocol=select.value);proto.append(select);card.append(proto);
 for(const slot of ['a','b'])card.append(btn('Stage in council '+slot.toUpperCase(),()=>{if(!c.model.trim()||!c.endpoint.trim()){announce('Enter model and endpoint before staging.');return;}for(const [key,value] of [['provider',c.id],['model',c.model],['endpoint',c.endpoint],['protocol',c.protocol]]){const target=$('studio-'+key+'-'+slot);target.value=value;target.dispatchEvent(new Event('input',{bubbles:true}));target.dispatchEvent(new Event('change',{bubbles:true}));}record('LOCAL CONFIG',null,null,'Staged '+c.name+' descriptor in council '+slot.toUpperCase()+'. Existing consent must be reviewed again.');go('studio-provider-'+slot);}));
 for(const slot of ['a','b'])card.append(btn('Stage loopback runner '+slot.toUpperCase(),()=>{let url;try{url=new URL(c.endpoint);if(!['http:','https:'].includes(url.protocol)||!['127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||!c.model.trim())throw Error();if(c.credentialEnv&&!/^[A-Z_][A-Z0-9_]{0,75}$/.test(c.credentialEnv))throw Error();}catch{announce('Local runner requires a literal loopback endpoint, a model ID and a valid environment name.');return;}for(const [id,value] of [['studio-provider-'+slot,c.id],['studio-model-'+slot,c.model],['studio-protocol-'+slot,c.protocol],['studio-local-endpoint-'+slot,c.endpoint],['studio-local-env-'+slot,c.credentialEnv??'']]){const x=$(id);if(x.disabled)return;x.value=value;x.dispatchEvent(new Event('input',{bubbles:true}));}const auth=$('studio-local-auth-'+slot);const desired=c.credentialEnv?(c.protocol==='anthropic-messages-json'?'anthropic-key':'bearer'):'none';const option=Array.from(auth.options).find(x=>x.value===desired);if(option){auth.value=option.value;auth.dispatchEvent(new Event('input',{bubbles:true}));}record('LOCAL CONFIG',null,null,'Loopback descriptor staged. Review authentication and exact disclosure before exporting.');go('studio-local-runner');}));grid.append(card);}box.append(grid,btn('Open council and disclosure controls',()=>go('agent-studio'),'orb-primary'),btn('Open ephemeral test credential vault',()=>go('operator-model-console')),btn('Multiple test credential profiles',()=>go('provider-form')),btn('Export approved local model plan',()=>go('studio-local-runner')));
 const assign=E('section',undefined,'orb-route');assign.append(E('h3','Assign rehearsal agent routes'));for(const [i,a] of agents.entries()){const label=E('label',undefined,'orb-field');label.append(E('span',ROLE[i][1]+' / '+ROLE[i][2]));const sel=E('select');for(const [k,c] of configs.entries()){const o=E('option',c.name);o.value=String(k);sel.append(o);}sel.value=String(a.route);sel.addEventListener('change',()=>{a.route=Number(sel.value);renderInspector();});label.append(sel);assign.append(label,routeInput(ROLE[i][1]+' simulated reservation cap',String(a.cap),v=>{a.cap=Math.max(0,Math.min(100000,Math.floor(Number(v)||0)));},'number'));}box.append(assign,E('p','Rehearsal routing: use the assigned configured route first, then its comma-separated fallback provider IDs, then the lowest numbered configured priority. Simulated reservations do not represent actual token use, billing, or a provider request.','orb-muted'));}
function saveReviewFile(text,name,mime='application/json'){
 const url=URL.createObjectURL(new Blob([text],{type:mime})),a=E('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function renderCheckpointControls(){
 if(!$('orb-checkpoint-status'))return;
 const current=latest?.current?.digest;
 $('orb-review-start').disabled=checkpointBusy||!!activeReview||!current||!!latest.busy||$('studio-run').disabled;
 $('orb-checkpoint-export').disabled=checkpointBusy||!!activeReview||!reviewResult||reviewResult.version!==current;
 $('orb-checkpoint-export-pin-button').disabled=!checkpointExport||checkpointExport.checkpoint.versionDigest!==current;
 $('orb-checkpoint-inspect').disabled=checkpointBusy||!!activeReview||!current||!$('orb-checkpoint-file').files?.length||!$('orb-checkpoint-pin').value.trim();
 $('orb-checkpoint-verify').disabled=checkpointBusy||!!activeReview||!checkpointOpened||checkpointOpened.checkpoint.versionDigest!==current||checkpointOpened.checkpoint.status!=='completed';
 $('orb-checkpoint-cancel').disabled=!checkpointController;
 $('orb-checkpoint-status').textContent=checkpointStatus;
 $('orb-checkpoint-export-pin').textContent=checkpointExport?'Retain separately: '+checkpointExport.pin:'';
 const slider=$('orb-checkpoint-sequence');slider.disabled=!checkpointOpened;slider.max=String(checkpointOpened?.checkpoint.events.length??0);
 if(!checkpointOpened){slider.value='0';$('orb-checkpoint-timeline').replaceChildren();}else renderCheckpointTimeline();
}
function renderCheckpointTimeline(){
 if(!checkpointOpened)return;
 const sequence=Number($('orb-checkpoint-sequence').value),p=projectRoleReviewEvents(checkpointOpened,sequence),box=$('orb-checkpoint-timeline');box.replaceChildren(E('p','Recorded event '+p.sequence+' / '+checkpointOpened.checkpoint.events.length+' · not live activity','orb-muted'));
 for(const t of p.taskStates)box.append(E('p',t.agentId+' · '+t.status));
}
function clearCheckpointImport(){
 checkpointEpoch++;checkpointController?.abort();checkpointController=null;checkpointBusy=false;checkpointOpened=null;checkpointStatus='No imported checkpoint.';renderCheckpointControls();
}
async function exportRoleCheckpoint(){
 if(checkpointBusy||!reviewResult||reviewResult.version!==latest?.current?.digest)return;
 const result=reviewResult,events=reviewEvents.slice(),ticket=++checkpointEpoch;checkpointBusy=true;renderCheckpointControls();
 try{const cp=await createRoleReviewCheckpoint(result,events);if(ticket!==checkpointEpoch||reviewResult!==result||latest?.current?.digest!==result.version)return;checkpointExport=cp;saveReviewFile(cp.text,'sutra-role-review-checkpoint.json');}
 catch{if(ticket===checkpointEpoch)checkpointStatus='Checkpoint export refused.';}
 finally{if(ticket===checkpointEpoch){checkpointBusy=false;renderCheckpointControls();}}
}
async function inspectRoleCheckpoint(){
 if(checkpointBusy||activeReview||!latest?.current)return;
 const file=$('orb-checkpoint-file').files?.[0],pin=$('orb-checkpoint-pin').value.trim(),version=latest.current.digest,ticket=++checkpointEpoch;checkpointBusy=true;checkpointOpened=null;renderCheckpointControls();
 try{
  if(!file||file.size<1||file.size>32768)throw Error('CHECKPOINT_SIZE');
  const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer()),opened=await openRoleReviewCheckpoint(text,pin,version);
  if(ticket!==checkpointEpoch||latest?.current?.digest!==version)return;
  checkpointOpened=opened;$('orb-checkpoint-sequence').max=String(opened.checkpoint.events.length);$('orb-checkpoint-sequence').value=String(opened.checkpoint.events.length);
  checkpointStatus='Pinned recorded checkpoint · '+opened.checkpoint.status+' · historical identity unverified.';
 }catch{if(ticket===checkpointEpoch)checkpointStatus='Checkpoint refused. Check file bytes, separately retained pin and current version.';}
 finally{if(ticket===checkpointEpoch){checkpointBusy=false;renderCheckpointControls();}}
}
async function verifyImportedCheckpoint(){
 if(checkpointBusy||activeReview||!checkpointOpened||!latest?.current)return;
 const cp=checkpointOpened,version=latest.current,ticket=++checkpointEpoch,controller=new AbortController();checkpointController=controller;checkpointBusy=true;checkpointStatus='Fresh local recomputation in progress.';renderCheckpointControls();
 try{
  const r=await verifyRoleReviewCheckpoint({checkpointText:cp.text,checkpointPin:cp.pin,versionText:version.versionText,versionPin:version.digest,signal:controller.signal,assertCurrent:()=>{if(ticket!==checkpointEpoch||latest?.current?.digest!==version.digest)throw Error('STALE_CHECKPOINT');}});
  if(ticket!==checkpointEpoch)return;checkpointStatus=r.status+' · '+r.checkedArtifacts+' artifact digests · historical identity and truth remain unverified.';
 }catch{if(ticket===checkpointEpoch)checkpointStatus=controller.signal.aborted?'Checkpoint recomputation cancelled.':'Checkpoint recomputation refused.';}
 finally{if(ticket===checkpointEpoch){checkpointBusy=false;checkpointController=null;renderCheckpointControls();}}
}
function invalidateCheckpointVersion(version){
 if(checkpointVersion===version)return;
 const hadCheckpoint=checkpointBusy||!!checkpointExport||!!checkpointOpened;
 checkpointVersion=version;checkpointEpoch++;checkpointController?.abort();checkpointController=null;checkpointBusy=false;checkpointExport=null;checkpointOpened=null;
 checkpointStatus=hadCheckpoint?'Checkpoint detached: current version changed.':'No imported checkpoint.';
}
function renderRoleReview(){
 const panel=$('orb-review-panel');if(!panel)return;
 renderCheckpointControls();
 $('orb-review-cancel').disabled=!activeReview;
 $('orb-review-status').textContent=reviewState==='idle'?(latest?.current?'Ready for a pinned deterministic review.':'Evaluate a reviewed investigation first.'):'Local deterministic review · '+reviewState;
 const out=$('orb-review-results');out.replaceChildren();
 if(reviewResult&&reviewResult.version===latest?.current?.digest){
  out.append(E('p','Version '+reviewResult.version+' · '+reviewResult.artifacts.length+' admitted local task artifacts · no model calls','orb-muted'));
  for(const artifact of reviewResult.artifacts){const role=ROLE.find(x=>x[0]===artifact.agentId),details=E('details',undefined,'orb-event');details.append(E('summary',(role?.[1]??artifact.agentId)+' / '+artifact.kind),E('pre',JSON.stringify(artifact.value,null,2)));out.append(details);}
 }
}
function stopRoleReview(reason='cancelled'){
 if(!activeReview)return;activeReview.controller.abort();reviewState=reason;renderRoleReview();
}
async function startRoleReview(){
 if(checkpointBusy||activeReview||!latest?.current||latest.busy||$('studio-run').disabled)return;
 if(simulation)cancel();
 const current=latest.current,controller=new AbortController(),runId='review_'+crypto.randomUUID(),run={controller,runId,version:current.digest};
 activeReview=run;reviewResult=null;reviewEvents.length=0;reviewState='running';
 for(const a of agents){a.status='queued';a.station=null;}
 renderRoleReview();updateCouncil();renderInspector();frameDriver.wake();
 const isCurrent=()=>{if(activeReview!==run||latest?.current?.digest!==run.version)throw Error('STALE_REVIEW');};
 try{
  const result=await runInvestigationReview({versionText:current.versionText,versionPin:current.digest,runId,signal:controller.signal,assertCurrent:isCurrent,onEvent:e=>{
   if(activeReview!==run||latest?.current?.digest!==run.version)return;
   reviewEvents.push(e);
   const i=ROLE.findIndex(a=>a[0]===e.agentId);if(i<0)return;const a=agents[i];
   a.status=e.status==='executing'?'working':e.status;a.station=reviewStations[e.taskId]??null;
   if(e.status==='executing'){
    const task=ROLE_REVIEW_TASKS.find(t=>t.id===e.taskId);
    for(const id of task.dependsOn){const source=ROLE_REVIEW_TASKS.find(t=>t.id===id),from=ROLE.findIndex(x=>x[0]===source.agentId);if(from>=0&&from!==i)edges.push({from,to:i,born:performance.now(),kind:'LOCAL DETERMINISTIC REVIEW'});}
   }
   record('LOCAL DETERMINISTIC REVIEW',i,null,e.taskId+' · '+e.status);renderRoleReview();
  }});
  if(activeReview!==run||latest?.current?.digest!==run.version)return;
  reviewResult=result;reviewState=result.status;
 }catch{if(activeReview===run&&latest?.current?.digest===run.version)reviewState='refused';}
 finally{
  if(activeReview===run){activeReview=null;for(const a of agents)if(['queued','working','validating'].includes(a.status)){a.status='cancelled';a.station=null;}renderRoleReview();updateCouncil();renderInspector();frameDriver.wake();}
 }
}
function invalidateRoleReview(version){
 if(activeReview&&activeReview.version!==version){activeReview.controller.abort();activeReview=null;reviewState='stale';reviewEvents.length=0;for(const a of agents){a.status='idle';a.station=null;}updateCouncil();frameDriver.wake();}
 if(reviewResult&&reviewResult.version!==version){reviewResult=null;reviewEvents.length=0;reviewState='stale';for(const a of agents){a.status='idle';a.station=null;}frameDriver.wake();}
}
function updateCouncil(){
 const box=$('orb-council-summary');if(!box)return;
 const expression=$('studio-mode').value==='expression',approved=$('studio-'+(expression?'expression-share':'share')).checked,running=$('studio-run').disabled;
 $('orb-council-status').textContent=$('studio-status').textContent;
 $('orb-council-approval').textContent=approved?'Current scoped rehearsal approval is selected.':'No current approval. Review the exact disclosure in the council controls.';
 $('orb-council-execute').disabled=!approved||running||!!activeReview;
 $('orb-council-cancel').disabled=$('studio-cancel').disabled;
 const result=$('orb-council-results');result.replaceChildren();
 for(const item of $('studio-methods').children){const r=E('article',undefined,'orb-event');r.append(E('strong',item.querySelector('strong')?.textContent??'Conditional result'),E('p',item.querySelector('p')?.textContent??''));result.append(r);}
 if(!$('studio-result').hidden)result.prepend(E('p',$('studio-interpretation').textContent));
 const routes=$('orb-council-routes');routes.replaceChildren();for(const slot of ['a','b']){const route=$('studio-route-'+slot).value;routes.append(E('p',$('studio-role-'+slot).value+' → '+$('studio-provider-'+route).value+' / '+$('studio-model-'+route).value));}
 renderCouncilActivity();renderRoleReview();
 $('orb-council-budget').textContent='Maximum '+$('studio-rounds').value+' rounds · '+$('studio-call-cap').value+' reserved calls · 256 output tokens per call. Local scripted transport only.';
}
function renderCouncilActivity(){
 const box=$('orb-council-activity');if(!box)return;
 const run=councilActivity.snapshot();box.replaceChildren(E('h3','Recorded council execution'));
 if(!run){box.append(E('p','No council execution recorded in this session.','orb-muted'));return;}
 box.append(E('p','Run '+run.runId+' · '+run.status+' · local scripted transport (not live inference)','orb-muted'));
 for(const [i,a] of run.agents.entries()){const row=E('article',undefined,'orb-event');row.append(E('strong','Council slot '+String.fromCharCode(65+i)),E('p',a.status+' · round '+a.round+' · '+a.requests+' requests · '+a.responses+' responses · '+a.proposals+' admitted proposals'));box.append(row);}
}
function renderPolicy(){const box=$('orb-policy');box.replaceChildren(E('h2','Permission boundary'),E('p','Rehearsal policy is separate from the real SUTRA consent gate. No external action, payment, automatic disclosure, or provider execution is granted by this screen.','orb-muted'));const label=E('label',undefined,'orb-field');label.append(E('span','Allow deterministic local rehearsal'));const sel=E('select');for(const [v,t] of [['ask','Explicit start required'],['deny','Deny rehearsal']]){const o=E('option',t);o.value=v;sel.append(o);}sel.value=policy;sel.addEventListener('change',()=>{policy=sel.value;if(policy==='deny'&&simulation)cancel();renderPolicy();});label.append(sel);box.append(label);
 const matrix=E('table',undefined,'orb-policy-table');const head=E('thead'),hr=E('tr');for(const x of ['Scope','Authority'])hr.append(E('th',x));head.append(hr);matrix.append(head);const body=E('tbody');for(const [scope,state] of [['Local synthetic computation','Explicit user action'],['Source disclosure','Exact existing consent'],['External model execution','Not enabled in browser'],['Act / pay','Not supported'],['Credential persistence','Denied']]){const tr=E('tr');tr.append(E('th',scope),E('td',state));body.append(tr);}matrix.append(body);box.append(matrix,E('pre',JSON.stringify({rehearsal:policy,external:'not-enabled',payments:'not-supported',credentials:'ephemeral-only'},null,2)),btn('Review exact model permission',()=>go('operator-model-console'),'orb-primary'),btn('Review council disclosure',()=>go('studio-mode')));}
function renderAudit(){const box=$('orb-audit');box.replaceChildren(E('h2','Activity journal'),E('p','This bounded in-memory journal is not a signed receipt or independent audit. Canonical investigation exports carry their own separately retained pins.','orb-muted'));for(const e of events.slice().reverse()){const row=E('article',undefined,'orb-event');row.append(E('small','#'+e.seq+' · '+e.time+' · '+e.kind),E('p',e.text));box.append(row);}box.append(btn('Download activity journal (unsigned)',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({qualification:'Unsigned presentation journal; not proof',events},null,2)],{type:'application/json'}));const a=E('a');a.href=url;a.download='sutra-activity-journal.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}),btn('Open canonical history and pins',()=>go('review-history-panel'),'orb-primary'));}
function setEra(){const apply=()=>{era=!era;root.dataset.era=era?'1997':'now';document.body.classList.toggle('orb-retro',era);$('orb-era').textContent=era?'Return to now':'1997 mode';$('orb-era').setAttribute('aria-pressed',String(era));};if(document.startViewTransition&&!reduced.matches)document.startViewTransition(apply);else apply();}
function initialize(){
 root=E('section',undefined,'orb-shell');root.id='sutra-orbit';root.dataset.era='now';root.setAttribute('aria-labelledby','orb-title');
 root.innerHTML='<div class="orb-mast"><div><p class="orb-kicker">SUTRA / LIVING KNOWLEDGE SYSTEM</p><h1 id="orb-title">Intelligence in orbit<span>.</span></h1><p class="orb-lede">An inhabited investigation space. Evidence moves through review, computation and challenge — not through a chat transcript.</p></div><div class="orb-top-actions"><button id="orb-era" type="button" aria-pressed="false">1997 mode</button><button id="orb-theme" type="button" aria-pressed="false">Dark theme</button><button id="orb-sound" type="button" aria-pressed="false">Sound off</button><button id="orb-command" type="button">Ctrl / ⌘ K</button><button id="orb-offline" type="button">Enable offline shell</button></div></div><div class="orb-retro-ticker" aria-hidden="true">✦ SUTRA ORBITAL NETWORK / 1997 MODE / LOCAL KNOWLEDGE ✦</div><nav id="orb-nav" aria-label="SUTRA spaces"></nav><div class="orb-question-band"><div><p class="orb-kicker">CURRENT INVESTIGATION</p><p id="orb-question">No question selected</p></div><span id="orb-state">Not evaluated</span><button id="orb-edit" type="button">Open question</button></div><div data-orb-panel="map"><div class="orb-stage"><section class="orb-visual" aria-labelledby="orb-map-title"><div class="orb-stage-head"><div><p class="orb-kicker">01 / ORBITAL WORKSPACE</p><h2 id="orb-map-title">Six roles. Twelve stations.</h2></div><div class="orb-rotate"><button id="orb-prev" aria-label="Rotate left" type="button">←</button><button id="orb-next" aria-label="Rotate right" type="button">→</button><button id="orb-zoom" type="button">Zoom</button></div></div><svg id="orb-map" viewBox="0 0 720 540" aria-label="Interactive orbital map of agents and investigation stations"></svg><div class="orb-map-foot"><span>Drag empty space to rotate · Ctrl + wheel to zoom</span><span>Role avatars are visual representations</span></div><div class="orb-controls"><button id="orb-play" type="button" class="orb-primary">Start simulated rehearsal</button><button id="orb-step" type="button" disabled>Step</button><button id="orb-stop" type="button" disabled>Stop</button><button id="orb-council" type="button">Open actual local council</button></div><p id="orb-progress" class="orb-muted">Rehearsal idle · no external model contact</p><section id="orb-council-summary" class="orb-council-summary" aria-labelledby="orb-council-title"><p class="orb-kicker">ACTUAL SUTRA COUNCIL / LOCAL SCRIPTED TRANSPORT</p><h2 id="orb-council-title">Council flight controls</h2><div id="orb-council-routes"></div><p id="orb-council-budget" class="orb-muted"></p><p id="orb-council-approval" class="orb-muted"></p><div class="orb-controls"><button id="orb-council-review" type="button">Review exact disclosure</button><button id="orb-council-execute" class="orb-primary" type="button" disabled>Execute approved council</button><button id="orb-council-cancel" type="button" disabled>Cancel actual council</button></div><p id="orb-council-status" role="status"></p><div id="orb-council-activity"></div><div id="orb-council-results"></div></section><section id="orb-review-panel" class="orb-council-summary" aria-labelledby="orb-review-title"><p class="orb-kicker">ACTUAL LOCAL DETERMINISTIC TASK GRAPH</p><h2 id="orb-review-title">Six-role investigation review</h2><p class="orb-muted">Review a pinned evaluated version using six distinct local tasks. No live inference, new evidence or decision authority.</p><div class="orb-controls"><button type="button" id="orb-review-start" class="orb-primary" disabled>Run six-role review</button><button type="button" id="orb-review-cancel" disabled>Cancel review</button></div><p id="orb-review-status" role="status"></p><div id="orb-review-results"></div><details id="orb-checkpoint-panel"><summary>Review checkpoint and recorded event playback</summary><p class="orb-muted">Local files contain metadata and artifact hashes only. Retain the checkpoint pin separately. Imported playback does not run agents or restore consent.</p><div class="orb-controls"><button type="button" id="orb-checkpoint-export" disabled>Export review checkpoint</button><button type="button" id="orb-checkpoint-export-pin-button" disabled>Download separate checkpoint pin</button></div><p id="orb-checkpoint-export-pin" class="orb-muted"></p><label for="orb-checkpoint-file">Checkpoint JSON file</label><input id="orb-checkpoint-file" type="file" accept="application/json,.json"><label for="orb-checkpoint-pin">Separately retained checkpoint SHA-256 pin</label><input id="orb-checkpoint-pin" maxlength="71" autocomplete="off"><div class="orb-controls"><button type="button" id="orb-checkpoint-inspect" disabled>Inspect recorded checkpoint</button><button type="button" id="orb-checkpoint-verify" disabled>Recompute and compare artifact digests</button><button type="button" id="orb-checkpoint-cancel" disabled>Cancel recomputation</button></div><p id="orb-checkpoint-status" role="status"></p><label for="orb-checkpoint-sequence">Recorded event sequence</label><input id="orb-checkpoint-sequence" type="range" min="0" max="0" value="0" disabled><div id="orb-checkpoint-timeline"></div></details></section><details><summary>Accessible station list</summary><div id="orb-list" class="orb-list"></div></details><div id="orb-roster" class="orb-list" aria-label="Agent roster"></div></section><aside class="orb-side" aria-label="Agent and station inspector"><div id="orb-inspect"></div><section class="orb-comms"><p class="orb-kicker">02 / LIVE ACTIVITY</p><h2>Comms & events</h2><div id="orb-log"></div></section></aside></div></div><section data-orb-panel="investigation" id="orb-investigation" hidden></section><section data-orb-panel="routes" id="orb-routes" hidden></section><section data-orb-panel="policy" id="orb-policy" hidden></section><section data-orb-panel="audit" id="orb-audit" hidden></section><section data-orb-panel="guestbook" id="orb-guestbook" hidden></section><p id="orb-live" role="status" aria-live="polite" class="orb-live"></p><dialog id="orb-dialog" aria-labelledby="orb-dialog-title"><h2 id="orb-dialog-title">Go to a SUTRA station</h2><label for="orb-search">Filter stations</label><input id="orb-search" autocomplete="off"><div id="orb-command-list" class="orb-list"></div><button id="orb-close" type="button">Close</button></dialog>';
 const master=$('sutra-master');master.before(root);const oldLink=E('a','Guided debugger fixture','orb-fixture-link');oldLink.href='?surface=debugger';$('orb-nav').append(oldLink);const prior=root.parentElement.querySelector('.intro h1');if(prior)prior.replaceWith(E('h2',prior.textContent));const masterTitle=$('sm-title');if(masterTitle?.tagName==='H1'){const h=E('h2',masterTitle.textContent);h.id=masterTitle.id;masterTitle.replaceWith(h);}
 configs=PROVIDERS.map(([id,name,protocol,endpoint],i)=>({id,name,protocol,endpoint,model:'',temperature:'0.2',tokens:'1024',priority:String(i+1),fallback:''}));
 for(const [id,label] of [['map','Ring map'],['swarm','Agent swarm'],['investigation','Investigation'],['routes','API routes'],['policy','Policy'],['audit','Activity journal'],['guestbook','Guestbook']]){const b=btn(label,()=>setMode(id,true),'orb-nav-button');b.dataset.orbMode=id;$('orb-nav').append(b);}
 setupMap();$('orb-checkpoint-export').onclick=exportRoleCheckpoint;$('orb-checkpoint-export-pin-button').onclick=()=>{if(checkpointExport)saveReviewFile(checkpointExport.pin+'\n','sutra-role-review-checkpoint.sha256','text/plain');};$('orb-checkpoint-file').onchange=clearCheckpointImport;$('orb-checkpoint-pin').oninput=clearCheckpointImport;$('orb-checkpoint-inspect').onclick=inspectRoleCheckpoint;$('orb-checkpoint-verify').onclick=verifyImportedCheckpoint;$('orb-checkpoint-cancel').onclick=()=>checkpointController?.abort();$('orb-checkpoint-sequence').oninput=renderCheckpointTimeline;$('orb-review-start').onclick=startRoleReview;$('orb-review-cancel').onclick=()=>stopRoleReview();$('orb-council-review').onclick=()=>go($('studio-mode').value==='expression'?'studio-disclosure-title':'studio-method-consent');$('orb-council-execute').onclick=()=>{if(!$('orb-council-execute').disabled)$('studio-form').requestSubmit($('studio-run'));};$('orb-council-cancel').onclick=()=>{if(!$('studio-cancel').disabled)$('studio-cancel').click();};const observer=new MutationObserver(updateCouncil);for(const id of ['studio-status','studio-result','studio-run','studio-cancel','studio-methods'])observer.observe($(id),{attributes:true,childList:true,subtree:true,characterData:true});$('studio-form').addEventListener('input',()=>queueMicrotask(updateCouncil));updateCouncil();root.querySelector('.orb-mast>div').append($('orb-play'));$('orb-edit').onclick=()=>go('review-question');$('orb-prev').onclick=()=>{targetRotation-=Math.PI/6;frameDriver.wake();};$('orb-next').onclick=()=>{targetRotation+=Math.PI/6;frameDriver.wake();};$('orb-zoom').onclick=()=>{zoom=zoom>.95?.78:1.03;frameDriver.wake();};$('orb-play').onclick=()=>{if(playing){playing=false;renderControls();}else start();};$('orb-step').onclick=()=>step();$('orb-stop').onclick=cancel;$('orb-council').onclick=()=>go('agent-studio');$('orb-era').onclick=setEra;$('orb-theme').onclick=()=>{const dark=root.dataset.theme!=='dark';root.dataset.theme=dark?'dark':'light';$('orb-theme').textContent=dark?'Light theme':'Dark theme';$('orb-theme').setAttribute('aria-pressed',String(dark));};$('orb-sound').onclick=()=>{sound=!sound;$('orb-sound').textContent=sound?'Sound on':'Sound off';$('orb-sound').setAttribute('aria-pressed',String(sound));beep();};
 $('orb-offline').onclick=async()=>{if(!('serviceWorker' in navigator)||!isSecureContext){announce('Offline shell requires a secure browser context.');return;}try{const registration=await navigator.serviceWorker.register('./orbit-sw.js');await navigator.serviceWorker.ready;announce('Offline fallback enabled. No investigation data is cached.');}catch{announce('Offline registration failed. No offline availability claimed.');}};
 const dialog=$('orb-dialog'),filter=()=>{const term=$('orb-search').value.toLowerCase();$('orb-command-list').replaceChildren();for(const [name,desc,id] of STATIONS.filter(x=>(x[0]+' '+x[1]).toLowerCase().includes(term)))$('orb-command-list').append(btn(name,()=>{dialog.close();go(id);}));};const open=()=>{filter();if(!dialog.open)dialog.showModal();$('orb-search').focus();};$('orb-command').onclick=open;$('orb-close').onclick=()=>dialog.close();$('orb-search').oninput=filter;
 const sequence=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();return;}if(e.target.matches('input,textarea,select,[contenteditable]'))return;if(e.key.toLowerCase()===sequence[konami].toLowerCase()){konami++;if(konami===sequence.length){konami=0;setEra();announce('Secret era unlocked.');}}else konami=0;});
 document.addEventListener('sutra-council-event',event=>{
  const d=event.detail;if(!councilActivity.apply(d))return;
  if(d.phase==='started'&&activeReview)stopRoleReview('cancelled by council');
  if(d.phase==='started'&&simulation){playing=false;simulation=false;for(const x of agents){x.status='idle';x.station=null;}renderControls();}
  // The two configurable council slots are not six independent role avatars. No synthetic handoff is drawn.
  record('LOCAL SCRIPTED COUNCIL',null,null,'Run '+d.runId+' · '+d.phase+(d.agent?' · '+d.agent+' · round '+d.round:''));
  renderCouncilActivity();
 });
 setMode('map');renderInspector();renderLog();if(new URLSearchParams(location.search).get('surface')==='debugger'){root.hidden=true;master.hidden=true;const workspace=$('reviewed-workspace'),economics=$('economics-lab');economics.before(workspace);document.querySelector('.sm-lab-heading')?.remove();const old=document.querySelector('.intro h2');if(old)old.replaceWith(E('h1',old.textContent));return;}const requested=location.hash.slice(1);if(['swarm','investigation','routes','policy','audit','guestbook'].includes(requested))setMode(requested);window.addEventListener('popstate',()=>{const next=location.hash.slice(1);if(['map','swarm','investigation','routes','policy','audit','guestbook'].includes(next))setMode(next);else if(!next)setMode('map');});document.addEventListener('visibilitychange',()=>{if(document.hidden)frameDriver.stop();else frameDriver.wake();});reduced.addEventListener('change',()=>frameDriver.wake());frameDriver.wake();
}
export function updateOrbit(state){latest=state;if(!root)initialize();invalidateRoleReview(state.current?.digest);invalidateCheckpointVersion(state.current?.digest);renderRoleReview();updateImpactView(state);$('orb-question').textContent=state.question||'No question selected';const triage=state.current?.report.investigation.triage.state;$('orb-state').textContent=triage?triage.replaceAll('_',' '):state.baseline?'Draft / historical baseline retained':'Not evaluated';const key=JSON.stringify([state.current?.digest,state.status,state.baseline?.digest,state.busy,state.proposalCount,state.question,state.sources,state.bindings,state.history?.digest,state.counterfactual?.kind,state.counterfactual?.after?.digest,state.withdrawal]);if(key!==lastState){lastState=key;const focused=document.activeElement?.id==='orb-graph-node';if(state.status&&state.status!==lastWorkspaceStatus)record('WORKSPACE',null,null,state.status);else renderInspector();lastWorkspaceStatus=state.status;if(focused)$('orb-graph-node')?.focus({preventScroll:true});}}
