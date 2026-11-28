// Model-free, user-initiated access to the same approved local SUTRA web tool.
import {prepareWebSourceCandidate} from './web-source-handoff.js';
// The host, not untrusted browser/model content, decides actor = "user".
const E=(tag,value,cls)=>{const el=document.createElement(tag);if(value!==undefined)el.textContent=value;if(cls)el.className=cls;return el;};
const button=(id,label)=>{const b=E('button',label,'orb-button');b.id=id;b.type='button';return b;};
const field=(label,element)=>{const l=E('label',undefined,'orb-field');l.append(E('span',label),element);return l;};
function link(url){
 const text=E('span',url);
 try{const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port)return text;
  const a=E('a',url);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
 }catch{return text;}
}
const reason=e=>typeof e?.message==='string'&&/^[A-Z_]{1,60}$/.test(e.message)?e.message:'HOST_UNAVAILABLE';
export function createDirectWebPanel(root,{saveFile,stageSource}={}){
 let token=null,cap=null,preview=null,session=null,report=null,timer=null,epoch=0,busy=false,running=false,closed=false;
 const box=E('details',undefined,'orb-event');box.id='orb-direct-web';
 box.append(E('summary','Open the public web — no model required'));
 const intro=E('p','Fetch an exact public HTTPS source or search for candidate links. This uses the local trusted host, not a browser proxy. Every external contact requires approval.','orb-muted');
 const mode=E('select');mode.id='orb-direct-web-mode';
 for(const [value,label] of [['fetch','Read a public URL'],['search','Search the web']]){const option=E('option',label);option.value=value;mode.append(option);}
 const resource=E('input');resource.id='orb-direct-web-resource';resource.type='text';resource.maxLength=1200;resource.placeholder='https://example.org/public-report';
 const backend=E('select');backend.id='orb-direct-web-backend';
 const render=E('input');render.type='checkbox';render.id='orb-direct-web-render';
 const renderField=field('Try JavaScript rendering (local experimental only)',render);
 const prepare=button('orb-direct-web-preview','Review exact web request'),start=button('orb-direct-web-start','Approve and run'),cancel=button('orb-direct-web-cancel','Cancel'),download=button('orb-direct-web-export','Export source or discovery JSON');
 start.classList.add('orb-primary');
 const approve=E('input');approve.type='checkbox';approve.id='orb-direct-web-approve';
 const approval=field('I approve contacting the displayed public destination, scope and resource budget.',approve);
 const controls=E('div',undefined,'orb-controls');controls.append(prepare,start,cancel,download);
 const plan=E('div',undefined,'orb-event');plan.id='orb-direct-web-plan';plan.hidden=true;
 const status=E('p','No external contact has been requested.','orb-muted');status.id='orb-direct-web-status';status.setAttribute('role','status');
 const output=E('div',undefined,'orb-list');output.id='orb-direct-web-result';
 box.append(intro,field('Operation',mode),field('Public source URL or search query',resource),field('Search provider',backend),renderField,controls,approval,plan,status,output);
 root.append(box);
 function sync(){
  const fetchMode=mode.value==='fetch';backend.parentElement.hidden=fetchMode;renderField.hidden=!fetchMode||cap?.jsRendering!=='local_experimental';
  prepare.disabled=busy||running||!resource.value.trim();start.disabled=busy||running||!preview||!approve.checked;cancel.disabled=!running;
  download.disabled=!report;mode.disabled=busy||running;resource.disabled=busy||running;backend.disabled=busy||running;render.disabled=busy||running;approve.disabled=busy||running||!preview;
 }
 function reset(){
  if(running||busy)return;
  epoch++;preview=null;session=null;report=null;plan.hidden=true;plan.replaceChildren();output.replaceChildren();approve.checked=false;
  status.textContent='Review an exact public request before contacting a site.';sync();
 }
 async function call(path,{data,publicCall=false}={}){
  const response=await fetch('/api/research/web/'+path,{method:data?'POST':'GET',cache:'no-store',credentials:'same-origin',
   headers:{...(publicCall?{}:{'X-Sutra-Session':token}),...(data?{'Content-Type':'application/json'}:{})},
   ...(data?{body:JSON.stringify(data)}:{})});
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('HOST_UNAVAILABLE');
  const out=await response.json();if(!response.ok)throw Error(out?.error??'HOST_UNAVAILABLE');return out;
 }
 function showPlan(p){
  plan.hidden=false;plan.replaceChildren(E('h3','Exact web contact approval'),
   E('p','Caller: '+p.actor+' · '+p.request.operation+' · '+p.request.resource),
   E('p',p.disclosure),E('p',p.caveat),
   E('p','Maximum '+p.budget.maxDurationSeconds+' seconds · '+p.budget.maxDocuments+' document attempts · '+p.budget.maxSearches+' searches · '+p.budget.maxDownloadBytes+' reserved response bytes. Provider costs are estimates, not billing guarantees.'),
   E('small','Request SHA-256: '+p.requestPin,'mono'),
   E('p','No authentication, private network access, external writes or automatic claim verification.','orb-muted'));
 }
 function renderResult(r,pin){
  report=r;output.replaceChildren(E('h3',r.operation==='fetch'?'Public source — unverified':'Search results — discovery only'),
   E('p',r.qualification,'orb-muted'));
  for(const d of r.documents??[]){
   const section=E('article',undefined,'orb-event');section.append(E('p','Requested: '));section.lastChild.append(link(d.url));
   const final=E('p','Retrieved: ');final.append(link(d.finalUrl));section.append(final,
    E('small','Retrieved '+d.retrievedAt+' · '+d.mediaType+' · '+d.parser+' · '+d.textDigest,'orb-muted'),
    E('p',d.render?'Rendering: '+d.render.status+' (source remains unverified)':'Static HTTPS extraction'),
    E('pre',d.text.slice(0,3500)+(d.text.length>3500?'\n… truncated in preview; export report for the full extraction.':''))
   );
   if(typeof stageSource==='function'){
    const stage=button('orb-direct-web-stage','Review exact extraction in evidence form');
    const info=E('p','No claim is admitted automatically; source authenticity and truth remain unverified.','orb-muted');
    const eligible=d.text.length<=16384&&new TextEncoder().encode(d.text).length<=16384;
    stage.disabled=!eligible;
    if(!eligible)info.textContent='Source exceeds the 16 KiB evidence-form limit. Export the full report for bounded/manual source selection.';
    stage.onclick=async()=>{
     if(stage.disabled||running||busy||report!==r)return;
     const ticket=epoch;stage.disabled=true;
     try{
      const c=await prepareWebSourceCandidate({report:r,reportPin:pin,sourceId:d.id});
      if(ticket!==epoch||report!==r)return;
      info.textContent=stageSource(c)?'Exact web extraction staged for human review; no automatic claim admission.':'Staging refused: current workspace form is busy or has conflicting evidence.';
     }catch{if(ticket===epoch&&report===r)info.textContent='Staging refused: report or source digest/provenance did not validate.';}
     finally{stage.disabled=!eligible;}
    };section.append(stage,info);
   }
   output.append(section);
  }
  for(const row of r.results??[]){const entry=E('article',undefined,'orb-event');entry.append(E('strong',row.title||'Untitled result'),E('p','Search discovery only — source not read or verified.','orb-muted'));const href=E('p');href.append(link(row.url));entry.append(href);output.append(entry);}
  output.append(E('small','Result SHA-256: '+pin,'mono'));
 }
 async function poll(ticket){
  if(ticket!==epoch||!session||closed)return;
  try{
   const r=await call('status?id='+encodeURIComponent(session.sessionId));
   if(ticket!==epoch||r.sessionId!==session.sessionId||r.requestPin!==session.requestPin)return;
   status.textContent='Local web operation: '+r.state;
   if(['running','cancelling'].includes(r.state)){timer=setTimeout(()=>void poll(ticket),600);return;}
   running=false;
   if(r.state==='closed'&&r.report)renderResult(r.report,r.reportPin);
   else status.textContent='Web operation '+r.state+': '+(r.reason??'unknown')+'. '+(r.outcome??'No completed evidence admitted.');
   sync();
  }catch(e){
   if(ticket!==epoch||closed)return;
   running=false;status.textContent='Local web status unavailable: '+reason(e)+'. Remote contact and completion state unknown.';sync();
  }
 }
 mode.onchange=()=>{resource.placeholder=mode.value==='search'?'Search terms for public sources':'https://example.org/public-report';reset();};
 resource.oninput=reset;backend.onchange=reset;render.onchange=reset;approve.onchange=sync;
 prepare.onclick=async()=>{
  if(prepare.disabled)return;
  reset();const ticket=epoch;busy=true;sync();
  try{
   cap=await call('capabilities',{publicCall:true});
   if(ticket!==epoch||cap.schema!=='sutra-web-access-capabilities/v1'||!/^[0-9a-f]{64}$/.test(cap.sessionToken))throw Error('HOST_UNAVAILABLE');
   token=cap.sessionToken;backend.replaceChildren();
   for(const id of cap.searchBackends){const option=E('option',id);option.value=id;backend.append(option);}
   const type=mode.value;
   if(type==='search'&&!backend.value)throw Error('SEARCH_UNAVAILABLE');
   const p=await call('preview',{data:{operation:type,resource:resource.value.trim(),backend:type==='search'?backend.value:null,render:type==='fetch'&&cap.jsRendering==='local_experimental'&&render.checked}});
   if(ticket!==epoch)return;
   preview=p;showPlan(p);status.textContent='Review before contact; no public request has been dispatched.';
  }catch(e){if(ticket===epoch)status.textContent='Web preview refused: '+reason(e)+'. No external contact authorized.';}
  finally{if(ticket===epoch){busy=false;sync();}}
 };
 start.onclick=async()=>{
  if(start.disabled||!preview)return;const ticket=epoch,p=preview;busy=true;approve.checked=false;sync();
  try{
   if(Date.now()>=p.expiresAt)throw Error('APPROVAL_EXPIRED');
   const started=await call('start',{data:{planPin:p.planPin,requestPin:p.requestPin,approvalId:p.approvalId,approvePublicContact:true,approveEstimatedCost:true}});
   if(ticket!==epoch)return;
   preview=null;session=started;running=true;status.textContent='Approved public web operation started.';void poll(ticket);
  }catch(e){if(ticket===epoch){preview=null;status.textContent='Web start refused or status unknown: '+reason(e);}}
  finally{if(ticket===epoch){busy=false;sync();}}
 };
 cancel.onclick=async()=>{
  if(!running||!session)return;
  try{await call('cancel',{data:{sessionId:session.sessionId}});status.textContent='Cancellation requested; awaiting terminal state.';}
  catch(e){status.textContent='Cancellation status unknown: '+reason(e);}
 };
 download.onclick=()=>{if(report&&saveFile)saveFile(JSON.stringify(report,null,2),'sutra-approved-web-access.json');};
 sync();
 return Object.freeze({element:box,close(){closed=true;clearTimeout(timer);epoch++;}});
}
