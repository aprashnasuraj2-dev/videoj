// Browser plan preparation only: the trusted operator is a separate Node process.
import {buildHostedHybridPlan,HOSTED_GATEWAY_PROFILES} from '../../../packages/sutra-knowledge/hosted-plan.js';
const E=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const field=(title,input)=>{const label=E('label',undefined,'orb-field');label.append(E('span',title),input);return label;};
const input=(id,type='text')=>{const e=E('input');e.id=id;e.type=type;if(type==='text'){e.autocomplete='off';e.maxLength=1024;}return e;};
const select=(id,options)=>{const e=E('select');e.id=id;for(const [v,label] of options){const o=E('option',label);o.value=v;e.append(o);}return e;};
const button=(id,text)=>{const e=E('button',text);e.type='button';e.id=id;return e;};
const roles=[
 ['planner','Planner','Propose a bounded framing using the selected bindings.'],
 ['researcher','Researcher','Identify a possible interpretation of the available reviewed quantities; do not invent evidence.'],
 ['coder','Coder','Propose a dimensionally plausible mathematical comparison.'],
 ['analyst','Analyst','Propose a competing quantitative interpretation.'],
 ['critic','Critic','Challenge an assumption by proposing an alternative conditional comparison.'],
 ['coordinator','Coordinator','Propose an alternative that addresses the stated question; do not vote.']
];
export function createHostedPlanPanel(root,{saveFile}){
 let version=null,blocked=false,pending=null,epoch=0,preparing=false;
 const help=E('p','No network or API keys in this browser. Select up to six model specialists, exact model IDs and per-slot binding scopes. Provider configuration is exported locally; the Node gateway separately requires hosted disclosure approval.','orb-muted');
 const hint=E('p','Evaluate an investigation first.','orb-muted'),slots=E('div',undefined,'orb-list'),rows=[];
 for(const [id,label,role] of roles){
  const card=E('fieldset',undefined,'orb-event');card.append(E('legend',label));
  const enabled=input('orb-hosted-enable-'+id,'checkbox'),vendor=select('orb-hosted-vendor-'+id,HOSTED_GATEWAY_PROFILES.map(p=>[p.vendor,p.vendor])),model=input('orb-hosted-model-'+id),bindings=input('orb-hosted-bindings-'+id),values=input('orb-hosted-values-'+id,'checkbox');
  vendor.value=HOSTED_GATEWAY_PROFILES[rows.length%HOSTED_GATEWAY_PROFILES.length].vendor;model.maxLength=100;model.placeholder='Exact provider model ID';
  bindings.placeholder='Comma-separated binding IDs';card.append(field('Include this specialist',enabled),field('Provider',vendor),field('Model ID',model),field('Approved binding descriptors',bindings),field('Also disclose raw numeric values',values));slots.append(card);
  rows.push({id,role,enabled,vendor,model,bindings,values});
 }
 const rounds=select('orb-hosted-rounds',[['1','1'],['2','2'],['3','3']]),tokens=select('orb-hosted-tokens',[['128','128'],['256','256'],['512','512'],['1024','1024']]);tokens.value='256';
 const prepare=button('orb-hosted-prepare','Prepare exact hosted plan'),exportButton=button('orb-hosted-export','Export hosted operator configuration'),approve=input('orb-hosted-export-approve','checkbox'),status=E('p','No hosted plan prepared.','orb-muted');status.id='orb-hosted-status';status.setAttribute('role','status');
 const preview=E('pre');preview.id='orb-hosted-preview';preview.hidden=true;
 const actions=E('div',undefined,'orb-controls');actions.append(prepare,exportButton);
 root.append(help,hint,slots,field('Maximum rounds (eight slot-round ceiling)',rounds),field('Output token cap per request',tokens),actions,field('I approve exporting the full pinned investigation, including reviewed source text, to my local operator.',approve),status,preview);
 const controls=()=>{prepare.disabled=blocked||!version||preparing;approve.disabled=!pending||blocked||preparing;exportButton.disabled=!pending||!approve.checked||blocked||preparing;};
 const invalidate=()=>{epoch++;pending=null;preparing=false;approve.checked=false;preview.hidden=true;preview.textContent='';status.textContent='Configuration changed. Prepare and review a fresh plan.';controls();};
 for(const r of rows)for(const e of [r.enabled,r.vendor,r.model,r.bindings,r.values])e.addEventListener('input',invalidate);
 rounds.addEventListener('input',invalidate);tokens.addEventListener('input',invalidate);approve.addEventListener('change',controls);
 prepare.onclick=async()=>{
  if(prepare.disabled)return;invalidate();const selected=rows.filter(r=>r.enabled.checked),v=version,ticket=epoch;preparing=true;controls();
  try{
   const specialists=selected.map(r=>({id:r.id,role:r.role,vendor:r.vendor.value,model:r.model.value.trim(),bindingIds:r.bindings.value.split(',').map(x=>x.trim()).filter(Boolean),includeValues:r.values.checked,feedbackFrom:[]}));
   const b=await buildHostedHybridPlan({versionText:v.versionText,versionPin:v.digest,specialists,maxRounds:Number(rounds.value),maxOutputTokens:Number(tokens.value),maxConcurrent:Math.min(2,Math.max(1,selected.length))});
   if(ticket!==epoch||version?.digest!==v.digest||blocked)return;pending=b;preview.textContent=JSON.stringify(b.preview,null,2);preview.hidden=false;status.textContent=selected.length+' specialist slots prepared. Review exact recipients, scopes and resource limits. No request made.';
  }catch(e){if(ticket===epoch)status.textContent='Plan refused. Check model IDs, selected bindings, and the eight-slot-round limit ('+(typeof e?.code==='string'?e.code:'INVALID')+').';}
  finally{if(ticket===epoch){preparing=false;controls();}}
 };
 exportButton.onclick=()=>{
  if(exportButton.disabled||!pending||pending.preview.versionDigest!==version?.digest)return;const p=pending;approve.checked=false;saveFile(p.text,'sutra-hosted-hybrid-config.json');status.textContent='Local export requested. Retain plan pin: '+p.planPin+' · run hosted-hybrid.mjs --plan before separately approving execution.';controls();
 };
 controls();
 return {update(next,isBlocked=false){
  blocked=!!isBlocked;
  if(next?.digest!==version?.digest){
   version=next??null;invalidate();let ids=[];
   if(version)try{ids=JSON.parse(JSON.parse(version.versionText).contractText).bindings.map(b=>b.id);}catch{}
   hint.textContent=version?'Current version '+version.digest+' · available bindings: '+(ids.join(', ')||'none'):'Evaluate an investigation first.';
   for(const r of rows){r.bindings.value=ids.length<=16?ids.join(', '):'';r.values.checked=false;}
  }else version=next??null;
  if(blocked){approve.checked=false;}
  controls();
 }};
}
