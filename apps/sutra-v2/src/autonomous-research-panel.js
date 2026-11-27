// Objective-first local research UI. Only the already-selected shared model
// connections are sent to the trusted same-origin host. No provider key enters DOM.
const E=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(id,text)=>{const e=E('button',text,'orb-button');e.id=id;e.type='button';return e;};
const field=(name,input)=>{const e=E('label',undefined,'orb-field');e.append(E('span',name),input);return e;};
const reason=e=>typeof e?.message==='string'&&/^[A-Z_]{1,60}$/.test(e.message)?e.message:'HOST_UNAVAILABLE';
export function createAutonomousResearchPanel(root,{getModels,openConnections,onEvent=()=>{},onState=()=>{},canStart=()=>true,saveFile}){
 let token=null,plan=null,session=null,cursor=0,epoch=0,timer=null,busy=false,running=false,report=null,mode=null,reconnects=0;
 const objective=E('textarea');objective.id='orb-autonomous-objective';objective.maxLength=1000;objective.rows=3;objective.placeholder='Ask a question, investigate a claim, or explore an idea…';
 const prepare=button('orb-autonomous-prepare','Prepare investigation'),connect=button('orb-autonomous-connections','Model connections'),start=button('orb-autonomous-start','Launch investigation'),cancel=button('orb-autonomous-cancel','Cancel'),download=button('orb-autonomous-export','Export report');
 start.classList.add('orb-primary');
 const approve=E('input');approve.type='checkbox';approve.id='orb-autonomous-approve';
 const preview=E('div',undefined,'orb-event');preview.id='orb-autonomous-preview';preview.hidden=true;
 const status=E('p','Ready to prepare. A local research host is needed for execution.','orb-muted');status.id='orb-autonomous-status';status.setAttribute('role','status');
 const result=E('div',undefined,'orb-list');result.id='orb-autonomous-result';
 const controls=E('div',undefined,'orb-controls');controls.append(prepare,connect,start,cancel,download);
 root.append(E('p','OBJECTIVE-FIRST WORKSPACE','orb-kicker'),E('h2','Explore with SUTRA'),field('What would you like to investigate?',objective),controls,preview,field('I approve the displayed model recipients, public web access when needed, and the estimated request limits.',approve),status,result);
 function state(text,name){status.textContent=text;status.dataset.state=name;}
 function sync(){objective.disabled=busy||running;prepare.disabled=busy||running||!objective.value.trim();approve.disabled=!plan||busy||running;start.disabled=!plan||!approve.checked||busy||running;cancel.disabled=!running||busy;download.disabled=!report||busy;}
 function reset(){if(running)return;epoch++;plan=null;report=null;preview.hidden=true;preview.replaceChildren();approve.checked=false;result.replaceChildren();state('Prepare a fresh investigation using the shared model pool.','idle');sync();}
 function selectedModels(){return getModels().map(x=>({vendor:x.vendor,model:x.model}));}
 async function request(path,{method='GET',data,publicRequest=false}={}){
  const response=await fetch('/api/research/'+path,{method,cache:'no-store',credentials:'same-origin',headers:{...(publicRequest?{}:{'X-Sutra-Session':token}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('HOST_UNAVAILABLE');
  const value=await response.json();if(!response.ok)throw Error(value?.error??'HOST_UNAVAILABLE');return value;
 }
 function showPlan(p){
  preview.hidden=false;preview.replaceChildren(E('h3','Exact approval preview'),E('p',p.objective),E('p','Selected model pool: '+p.models.map(m=>m.vendor+' / '+m.model).join(' · ')),E('p','Web access: on demand · '+(p.searchBackends.length?'search: '+p.searchBackends.join(', '):'general search unavailable')+' · direct public HTTPS retrieval'),E('p','Maximum '+p.budget.maxModelCalls+' model calls · '+p.budget.maxSearches+' searches · '+p.budget.maxDocuments+' document attempts · '+p.budget.maxDurationSeconds+' seconds'),E('p','Reserved estimated ceiling: USD '+(p.budget.maxCostMicros/1000000).toFixed(3)+' (not an invoice guarantee). Public objective and bounded evidence may be disclosed to the selected models.'),E('small',p.planPin,'mono'),E('small','Review configuration: '+p.reviewMode,'orb-muted'));
 }
 function render(r,pin){
  report=r;result.replaceChildren(E('h3','Investigation result'),E('p',r.terminationReason.replaceAll('_',' ')),E('p',r.qualification,'orb-muted'));
  if(r.modelOnlyAnswer){const a=E('article',undefined,'orb-event');a.append(E('h4','Answer without web research'),E('p',r.modelOnlyAnswer.text),E('small','No external evidence acquired or verified.','orb-muted'));result.append(a);}
  const findings=r.intelligence?.claims??[];
  if(findings.length){result.append(E('h4','Citation-backed candidate findings'));for(const c of findings){const a=E('article',undefined,'orb-event');a.append(E('strong',c.publicationStatus.replaceAll('_',' ')),E('p',c.publicationStatus==='withheld_from_findings'?'Withheld candidate '+c.id:c.statement));for(const cite of c.citations??[])a.append(E('p','“'+cite.quote+'” — '+cite.sourceId+' · offsets '+cite.locator.startOffset+'–'+cite.locator.endOffset));if(c.review)a.append(E('small','Reviewer: '+c.review.verdict+' · '+c.review.reason));result.append(a);}}
  if(r.documents?.length){result.append(E('h4','Acquired sources'));for(const d of r.documents){const a=E('article',undefined,'orb-event');a.append(E('strong',d.id),E('p',d.finalUrl??d.url),E('small',d.mediaType+' · '+d.textDigest));result.append(a);}}
  for(const gap of r.intelligence?.gaps??[])result.append(E('p','Model-proposed gap: '+gap,'orb-muted'));
  for(const conflict of r.intelligence?.conflicts??[])result.append(E('p','Competing evidence: '+conflict.relation+' · '+conflict.status+' · '+conflict.reason,'orb-muted'));
  if(r.usage)result.append(E('p','Model calls '+(r.usage.modelCalls??0)+' · searches '+r.usage.searches+' · document attempts '+r.usage.documents+' · estimated reserved USD '+(r.usage.reservedCostMicros/1000000).toFixed(4),'orb-muted'));
  if(pin)result.append(E('small','Report SHA-256: '+pin,'mono'));
 }
 async function poll(ticket){
  if(ticket!==epoch||!session)return;
  try{
   const r=await request('status?id='+encodeURIComponent(session.sessionId)+'&after='+cursor);
   if(ticket!==epoch||r.sessionId!==session.sessionId||r.planPin!==session.planPin)return;
   if(!Array.isArray(r.events)||!Number.isSafeInteger(r.nextCursor)||r.nextCursor!==cursor+r.events.length)throw Error('EVENT_SEQUENCE');
   for(const [i,e] of r.events.entries()){if(e.sessionId!==session.sessionId||e.sequence!==cursor+i+1)throw Error('EVENT_SEQUENCE');onEvent(e,r.mode);}
   cursor=r.nextCursor;reconnects=0;
   state((r.mode==='injected_fixture'?'TEST FIXTURE':'LOCAL HOST')+' · '+r.state+' · '+cursor+' recorded operation events',r.state);
   if(['running','cancelling'].includes(r.state)){timer=setTimeout(()=>void poll(ticket),600);return;}
   running=false;onState(false);if(r.state==='closed'&&r.report)render(r.report,r.reportPin);else if(r.reason)state(r.state+' · '+r.reason,r.state);sync();
  }catch(e){if(ticket!==epoch)return;state('Connection interrupted: '+reason(e)+'. Host status unknown; no completion claimed.','disconnected');if(++reconnects<=8)timer=setTimeout(()=>void poll(ticket),Math.min(8000,1600*reconnects));else{running=false;onState(false);sync();state('Host disconnected. Execution status is unknown; no result or successful cancellation is claimed.','disconnected');}}
 }
 objective.addEventListener('input',reset);approve.addEventListener('change',sync);connect.onclick=openConnections;
 prepare.onclick=async()=>{
  if(prepare.disabled)return;reset();const ticket=epoch;busy=true;sync();state('Reading local host capabilities…','preparing');
  try{
   const models=selectedModels();if(!models.length||models.length>3)throw Error('MODEL_SELECTION');
   const caps=await request('capabilities',{publicRequest:true});if(caps?.schema!=='sutra-local-research-capabilities/v1'||typeof caps.sessionToken!=='string')throw Error('HOST_UNAVAILABLE');
   token=caps.sessionToken;mode=caps.mode;
   if(models.some(m=>!caps.configuredModelVendors.includes(m.vendor)))throw Error('MODEL_CREDENTIAL');
   const p=await request('preview',{method:'POST',data:{objective:objective.value.trim().replace(/\s+/gu,' '),models}});
   if(ticket!==epoch)return;plan=p;showPlan(p);state('Review the shared model pool and scope. No provider request sent.','previewed');
  }catch(e){if(ticket===epoch)state(reason(e)==='MODEL_SELECTION'?'Select one to three model connections first. No avatar assignment is needed.':reason(e)==='MODEL_CREDENTIAL'?'One or more selected model providers are not configured in the local host.':'Local host unavailable or plan refused: '+reason(e)+'. No provider request made.','refused');}
  finally{if(ticket===epoch){busy=false;sync();}}
 };
 start.onclick=async()=>{
  if(start.disabled||!canStart()){state('Finish or cancel the other active workspace operation first.','refused');return;}
  const ticket=epoch,p=plan;busy=true;approve.checked=false;sync();
  try{
   // A changed pool or question invalidates the prepared request before dispatch.
   const current=selectedModels();if(JSON.stringify(current)!==JSON.stringify(p.models.map(({vendor,model})=>({vendor,model})))||objective.value.trim().replace(/\s+/gu,' ')!==p.objective)throw Error('PLAN_CHANGED');
   if(Date.now()>=p.expiresAt)throw Error('APPROVAL_EXPIRED');
   const s=await request('start',{method:'POST',data:{approvedPlanPin:p.planPin,approvePublicContact:true,approveEstimatedCost:true,approveModelDisclosure:true}});
   if(ticket!==epoch)return;session=s;cursor=0;reconnects=0;plan=null;running=true;onState(true);state((mode==='injected_fixture'?'TEST FIXTURE':'LOCAL HOST')+' · investigation started','running');void poll(ticket);
  }catch(e){if(ticket===epoch){plan=null;state('Launch refused or status unknown: '+reason(e),'refused');}}
  finally{if(ticket===epoch){busy=false;sync();}}
 };
 cancel.onclick=async()=>{if(cancel.disabled||!session)return;busy=true;sync();try{await request('cancel',{method:'POST',data:{sessionId:session.sessionId}});state('Cancellation requested; awaiting confirmed terminal state.','cancelling');}catch(e){state('Cancellation status unknown: '+reason(e),'disconnected');}finally{busy=false;sync();}};
 download.onclick=()=>{if(report&&saveFile)saveFile(JSON.stringify(report),'sutra-autonomous-research-report.json');};
 sync();return Object.freeze({invalidate(){if(!busy&&!running)reset();},close(){clearTimeout(timer);epoch++;},isRunning(){return running;}});
}
