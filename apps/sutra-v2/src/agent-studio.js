import {createProviderWorkspace} from '../../../packages/sutra-inference/provider-workspace.js';
import {admitProofCase} from '../../../packages/sutra-knowledge/agent-bridge.js';
import {runAgentCouncil} from '../../../packages/sutra-knowledge/agent-council.js';
import {beamGraph} from '../../../packages/sutra-knowledge/examples/beam.mjs';
const by=id=>document.getElementById(id);
const form=by('studio-form'),runButton=by('studio-run'),cancelButton=by('studio-cancel'),exportButton=by('studio-export');
const fields=[...form.querySelectorAll('input,select,textarea'),by('studio-reset-case')];
const fixture=()=>JSON.stringify({obligationId:'beam_deflection',methods:[{id:'stiffer_assumption',constraintId:'deflection_limit',graphText:beamGraph('10000000000')},{id:'softer_assumption',constraintId:'deflection_limit',graphText:beamGraph('2500000000')}]});
let active=null,current=null,epoch=0;
function status(message,state){const el=by('studio-status');el.textContent=message;el.dataset.state=state;}
function clear(){current=null;exportButton.disabled=true;by('studio-result').hidden=true;by('studio-trace').replaceChildren();by('studio-methods').replaceChildren();}
function busy(value){for(const field of fields)field.disabled=value;runButton.disabled=value;cancelButton.disabled=!value;if(value)exportButton.disabled=true;}
function invalidate(){epoch++;active?.abort();clear();status('Configuration changed. Run a fresh council.','idle');}
function element(tag,value,className){const x=document.createElement(tag);x.textContent=value;if(className)x.className=className;return x;}
function render(r,configuration,calls){
 by('studio-result').hidden=false;by('studio-round-count').textContent=String(r.rounds.length);by('studio-calls').textContent=String(calls);by('studio-agreement').textContent=r.agreement.replaceAll('_',' ').toLowerCase();
 const outcomes=new Map(r.methods.map(m=>[m.methodId,m.outcome.status]));
 for(const round of r.rounds){
  const section=document.createElement('section');section.className='studio-round';section.append(element('h4','Round '+round.round));
  for(const agent of round.agents){
   const item=document.createElement('article');item.className='studio-agent-event';item.dataset.agent=agent.agentId;item.dataset.status=agent.status;
   item.append(element('strong',configuration.agents.find(x=>x.id===agent.agentId).role),element('small',agent.providerId+' / '+agent.model),element('p',agent.status==='PROPOSED'?'Proposed '+agent.methodId+' → '+outcomes.get(agent.methodId):'Refused: '+agent.reason));
   section.append(item);
  }
  by('studio-trace').append(section);
 }
 for(const method of r.methods){
  const article=document.createElement('article');article.className='studio-method';article.dataset.outcome=method.outcome.status;
  article.append(element('strong',method.methodId),element('p',method.outcome.status.replaceAll('_',' ')),element('small',method.graphDigest,'mono'));
  by('studio-methods').append(article);
 }
}
function syntheticSend(strategy,expected){
 return async({providerId,model,operation})=>{
  if(providerId!==expected.id||model!==expected.model||operation.kind!=='reviewed-method-council-v1')throw Error('MOCK_REFUSED');
  await new Promise(resolve=>setTimeout(resolve,45));
  const ids=operation.methodIds,first=ids[0],last=ids.at(-1);
  let methodId=operation.agentId==='agent_one'?first:last;
  if(strategy==='reconsider'&&operation.round>1&&operation.feedback.some(x=>x.verification==='constraint_refuted'))methodId=operation.feedback.find(x=>x.verification==='constraint_refuted').methodId;
  const payload={version:1,obligationId:operation.obligationId,methodId};
  if(strategy==='hostile'&&operation.agentId==='agent_two')payload.verified=true;
  return {actualInputBytes:1,actualOutputTokens:1,value:{text:JSON.stringify(payload)}};
 };
}
function setup(config){
 const cap=config.callCap,limits={maxCalls:cap,maxInputBytes:100000,maxOutputTokens:cap*256,maxConcurrent:Math.min(2,cap)};
 const catalog=config.connections.map(c=>({id:c.id,label:c.id,models:[c.model]}));
 const workspace=createProviderWorkspace({catalog,globalLimits:limits,defaultProfileLimits:limits,transports:config.connections.map(c=>({providerId:c.id,send:syntheticSend(config.strategy,c)}))});
 const handles=new Map();
 for(const c of config.connections){
  const random=new Uint8Array(24);crypto.getRandomValues(random);
  const credential='SYNTHETIC_ONLY_'+Array.from(random,x=>x.toString(16).padStart(2,'0')).join('');
  handles.set(c.id,workspace.addProfile({providerId:c.id,label:c.id,credential}).handle);
 }
 return {workspace,routes:config.agents.map(x=>({id:x.id,role:x.role,handle:handles.get(x.connectionId),model:x.model,shareScope:'reviewed-question-and-method-feedback'}))};
}
function readConfig(){
 const connections=['a','b'].map(slot=>({slot,id:by('studio-provider-'+slot).value.trim(),model:by('studio-model-'+slot).value.trim()}));
 if(connections[0].id===connections[1].id)throw Error('DUPLICATE_CONNECTION');
 for(const c of connections)if(!/^[a-z][a-z0-9-]{0,31}$/.test(c.id)||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(c.model))throw Error('CONNECTION');
 const agents=['a','b'].map((slot,i)=>{const c=connections.find(x=>x.slot===by('studio-route-'+slot).value);return {id:i?'agent_two':'agent_one',role:by('studio-role-'+slot).value.trim(),connectionId:c.id,model:c.model};});
 const question=by('studio-question').value.trim(),caseText=by('studio-case').value;
 admitProofCase(caseText);
 return {connections,agents,question,caseText,rounds:Number(by('studio-rounds').value),callCap:Number(by('studio-call-cap').value),strategy:by('studio-strategy').value};
}
form.addEventListener('input',invalidate);
by('studio-reset-case').addEventListener('click',()=>{by('studio-case').value=fixture();invalidate();});
cancelButton.addEventListener('click',()=>{if(!active)return;active.abort();clear();status('Council cancelled. Late adapter results cannot publish.','cancelled');});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(active)return;clear();
 if(!by('studio-share').checked){status('Approve the scoped sharing before starting the local rehearsal.','refused');return;}
 const ticket=++epoch,controller=new AbortController();active=controller;busy(true);status('Running local agents and independent verification…','busy');
 try{
  const config=readConfig(),{workspace,routes}=setup(config);
  const r=await runAgentCouncil({caseText:config.caseText,question:config.question,workspace,routes,maxRounds:config.rounds,maxOutputTokens:256,signal:controller.signal});
  if(ticket!==epoch||controller.signal.aborted)return;
  const calls=workspace.budgetSnapshot().global.used.calls;
  if(r.termination==='CANCELLED_OR_TIMEOUT'){status('Council timed out. No late results accepted.','cancelled');return;}
  render(r,config,calls);
  // Deliberately retain no capability handle or synthetic credential in the trace.
  current={version:'sutra-local-council-trace/v1',configuration:config,result:r,calls};
  status('Local council completed: '+r.termination+'. '+r.agreement+'. No live inference or decision authority.','complete');
 }catch{if(ticket===epoch&&!controller.signal.aborted)status('Council refused. Check the connection IDs, model IDs and reviewed case.','refused');}
 finally{if(active===controller){active=null;busy(false);exportButton.disabled=!current;}}
});
exportButton.addEventListener('click',()=>{
 if(!current||active)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='sutra-local-council-trace.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 status('Trace export requested. It includes the question and reviewed case; no credential handles.','complete');
});
by('studio-case').value=fixture();
