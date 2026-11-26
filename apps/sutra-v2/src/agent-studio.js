import {createProtocolWorkspace} from '../../../packages/sutra-inference/protocol-workspace.js';
import {admitProofCase} from '../../../packages/sutra-knowledge/agent-bridge.js';
import {runAgentCouncil} from '../../../packages/sutra-knowledge/agent-council.js';
import {runExpressionCouncil} from '../../../packages/sutra-knowledge/expression-council.js';
import {compilerFinanceFixture} from '../../../packages/sutra-knowledge/examples/reviewed-compiler.mjs';
import {beamGraph} from '../../../packages/sutra-knowledge/examples/beam.mjs';
const by=id=>document.getElementById(id);
const form=by('studio-form'),runButton=by('studio-run'),cancelButton=by('studio-cancel'),exportButton=by('studio-export');
const fields=[...form.querySelectorAll('input,select,textarea'),by('studio-reset-case'),by('studio-load-finance')];
const fixture=()=>JSON.stringify({obligationId:'beam_deflection',methods:[{id:'stiffer_assumption',constraintId:'deflection_limit',graphText:beamGraph('10000000000')},{id:'softer_assumption',constraintId:'deflection_limit',graphText:beamGraph('2500000000')}]});
let active=null,current=null,epoch=0;
function status(message,state){const el=by('studio-status');el.textContent=message;el.dataset.state=state;}
function clear(){current=null;exportButton.disabled=true;by('studio-result').hidden=true;by('studio-trace').replaceChildren();by('studio-methods').replaceChildren();by('studio-interpretation').textContent='';}
function busy(value){for(const field of fields)field.disabled=value;runButton.disabled=value;cancelButton.disabled=!value;if(value)exportButton.disabled=true;}
function revoke(){by('studio-share').checked=false;by('studio-expression-share').checked=false;}
function invalidate(){epoch++;active?.abort();clear();status('Configuration changed. Run a fresh council.','idle');}
function showMode(){const expression=by('studio-mode').value==='expression';for(const id of ['studio-method-question','studio-method-case','studio-method-consent'])by(id).hidden=expression;by('studio-expression-fields').hidden=!expression;}
function element(tag,value,className){const x=document.createElement(tag);x.textContent=value;if(className)x.className=className;return x;}
function render(r,configuration,calls){
 const expression=configuration.mode==='expression',artifacts=expression?r.candidates:r.methods;
 const key=x=>expression?x.expression:x.methodId,verdict=x=>expression?x.target.status:x.outcome.status;
 by('studio-result').hidden=false;by('studio-round-count').textContent=String(r.rounds.length);by('studio-calls').textContent=String(calls);by('studio-agreement').textContent=r.agreement.replaceAll('_',' ').toLowerCase();
 by('studio-interpretation').textContent=expression?r.state.replaceAll('_',' ')+' — semantic review required; agreement cannot resolve divergent outcomes.':'Method selection only; independent computation is conditional on the reviewed graphs.';
 const outcomes=new Map(artifacts.map(m=>[key(m),verdict(m)]));
 for(const round of r.rounds){
  const section=document.createElement('section');section.className='studio-round';section.append(element('h4','Round '+round.round));
  for(const agent of round.agents){
   const item=document.createElement('article');item.className='studio-agent-event';item.dataset.agent=agent.agentId;item.dataset.status=agent.status;
   const route=configuration.agents.find(x=>x.id===agent.agentId);
   item.append(element('strong',route.role),element('small',agent.providerId+' / '+agent.model),element('p',agent.status==='PROPOSED'?'Proposed '+key(agent)+' → '+outcomes.get(key(agent)):agent.status==='ABSTAINED'?'Abstained — no proposal':'Refused: '+agent.reason));
   section.append(item);
  }
  by('studio-trace').append(section);
 }
 for(const method of artifacts){
  const article=document.createElement('article');article.className='studio-method';article.dataset.outcome=verdict(method);
  article.append(element('strong',key(method)),element('p',verdict(method).replaceAll('_',' ')),element('small',expression?method.proposalDigest:method.graphDigest,'mono'));
  by('studio-methods').append(article);
 }
}
function syntheticPayload(strategy,operation){
 if(operation.kind==='reviewed-method-council-v1'){
  const ids=operation.methodIds,first=ids[0],last=ids.at(-1);
  let methodId=operation.agentId==='agent_one'?first:last;
  if(strategy==='reconsider'&&operation.round>1&&operation.feedback.some(x=>x.verification==='constraint_refuted'))methodId=operation.feedback.find(x=>x.verification==='constraint_refuted').methodId;
  const payload={version:1,obligationId:operation.obligationId,methodId};
  if(strategy==='hostile'&&operation.agentId==='agent_two')payload.verified=true;
  return payload;
 }
 if(operation.kind!=='reviewed-expression-council-v1')throw Error('MOCK_REFUSED');
 const ids=operation.bindings.map(x=>x.id);
 if(ids.length<2)return {version:1,kind:'abstain'};
 let expression;
 if(['ocf25','ppe25','ocf26','ppe26'].every(x=>ids.includes(x))){
  expression=operation.agentId==='agent_one'?'[ocf26] > [ocf25]':'([ocf26] - [ppe26]) > ([ocf25] - [ppe25])';
 }else{
  // Scripted comparison, not interpretation of arbitrary user questions.
  expression='['+ids.at(-1)+'] '+(operation.agentId==='agent_one'?'>':'<=')+' ['+ids[0]+']';
 }
 if(strategy==='reconsider'&&operation.round>1&&operation.feedback.some(x=>x.verification==='CONDITIONALLY_REFUTED'))expression=operation.feedback.find(x=>x.verification==='CONDITIONALLY_REFUTED').expression;
 const payload={version:1,kind:'expression',expression};
 if(strategy==='hostile'&&operation.agentId==='agent_two')payload.verified=true;
 return payload;
}
function setup(config){
 const cap=config.callCap,limits={maxCalls:cap,maxInputBytes:100000,maxOutputTokens:cap*256,maxConcurrent:Math.min(2,cap)};
 const connections=config.connections.map(c=>({id:c.id,label:c.id,models:[c.model],protocol:c.protocol,endpoint:c.endpoint,transportClass:'hosted'}));
 const workspace=createProtocolWorkspace({connections,globalLimits:limits,defaultProfileLimits:limits,exchange:async request=>{
  const expected=connections.find(c=>c.id===request.connectionId);
  if(!expected||expected.models[0]!==request.model||expected.endpoint!==request.endpoint||expected.protocol!==request.protocol)throw Error('MOCK_REFUSED');
  const wire=JSON.parse(request.bodyText),operation=JSON.parse(wire.messages.at(-1).content);
  await new Promise(resolve=>setTimeout(resolve,45));
  const result=JSON.stringify(syntheticPayload(config.strategy,operation));
  const body=request.protocol==='anthropic-messages-json'?{type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text:result}],usage:{output_tokens:1}}:{choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:result}}],usage:{completion_tokens:1}};
  return {status:200,bodyText:JSON.stringify(body)};
 }});
 const handles=new Map();
 for(const c of connections){
  const random=new Uint8Array(24);crypto.getRandomValues(random);
  const credential='SYNTHETIC_ONLY_'+Array.from(random,x=>x.toString(16).padStart(2,'0')).join('');
  handles.set(c.id,workspace.addProfile({providerId:c.id,label:c.id,credential}).handle);
 }
 return {workspace,routes:config.agents.map(x=>({id:x.id,role:x.role,handle:handles.get(x.connectionId),model:x.model,shareScope:config.mode==='expression'?'reviewed-question-bindings-and-conditional-feedback':'reviewed-question-and-method-feedback'}))};
}
function readConfig(){
 const connections=['a','b'].map(slot=>({slot,id:by('studio-provider-'+slot).value.trim(),model:by('studio-model-'+slot).value.trim(),protocol:by('studio-protocol-'+slot).value,endpoint:by('studio-endpoint-'+slot).value.trim()}));
 if(connections[0].id===connections[1].id)throw Error('DUPLICATE_CONNECTION');
 for(const c of connections)if(!/^[a-z][a-z0-9-]{0,31}$/.test(c.id)||!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(c.model))throw Error('CONNECTION');
 const agents=['a','b'].map((slot,i)=>{const c=connections.find(x=>x.slot===by('studio-route-'+slot).value);return {id:i?'agent_two':'agent_one',role:by('studio-role-'+slot).value.trim(),connectionId:c.id,model:c.model};});
 const mode=by('studio-mode').value,common={mode,connections,agents,rounds:Number(by('studio-rounds').value),callCap:Number(by('studio-call-cap').value),strategy:by('studio-strategy').value};
 if(mode==='expression')return {...common,contractText:by('studio-contract').value,contractPin:by('studio-contract-pin').value.trim(),disclosure:{bindingIds:by('studio-bindings').value.split(',').map(x=>x.trim()).filter(Boolean),includeValues:by('studio-include-values').checked}};
 const question=by('studio-question').value.trim(),caseText=by('studio-case').value;admitProofCase(caseText);
 return {...common,question,caseText};
}
form.addEventListener('input',event=>{if(!['studio-share','studio-expression-share'].includes(event.target.id))revoke();showMode();invalidate();});
by('studio-reset-case').addEventListener('click',()=>{by('studio-case').value=fixture();revoke();invalidate();});
by('studio-load-finance').addEventListener('click',async()=>{revoke();invalidate();const ticket=epoch;try{const f=await compilerFinanceFixture();if(ticket!==epoch||active)return;by('studio-contract').value=f.contractText;by('studio-contract-pin').value=f.pin;by('studio-bindings').value='ocf25,ppe25,ocf26,ppe26';by('studio-include-values').checked=false;status('Reviewed example loaded. Approve the selected disclosure before running.','idle');}catch{if(ticket===epoch)status('Example unavailable.','refused');}});
cancelButton.addEventListener('click',()=>{if(!active)return;active.abort();clear();status('Council cancelled. Late adapter results cannot publish.','cancelled');});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(active)return;clear();
 const expression=by('studio-mode').value==='expression';
 if(!by(expression?'studio-expression-share':'studio-share').checked){status('Approve the scoped sharing before starting the local rehearsal.','refused');return;}
 revoke();
 const ticket=++epoch,controller=new AbortController();active=controller;busy(true);status('Running local agents and independent verification…','busy');
 try{
  const config=readConfig(),{workspace,routes}=setup(config);
  const options={workspace,routes,maxRounds:config.rounds,maxOutputTokens:256,signal:controller.signal};
  const r=expression?await runExpressionCouncil({...options,contractText:config.contractText,contractPin:config.contractPin,disclosure:config.disclosure}):await runAgentCouncil({...options,caseText:config.caseText,question:config.question});
  if(ticket!==epoch||controller.signal.aborted)return;
  const calls=workspace.budgetSnapshot().global.used.calls;
  if(r.termination==='CANCELLED_OR_TIMEOUT'){status('Council timed out. No late results accepted.','cancelled');return;}
  render(r,config,calls);
  // Export omits endpoint descriptors as well as credential handles.
  current={version:'sutra-local-council-trace/v1',configuration:{...config,connections:config.connections.map(({endpoint,...c})=>c)},result:r,calls};
  status('Local council completed: '+r.termination+'. '+r.agreement+'. No live inference or decision authority.','complete');
 }catch{if(ticket===epoch&&!controller.signal.aborted)status('Council refused. Check connection descriptors, reviewed input, pin and disclosure.','refused');}
 finally{if(active===controller){active=null;busy(false);exportButton.disabled=!current;}}
});
exportButton.addEventListener('click',()=>{
 if(!current||active)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='sutra-local-council-trace.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 status('Trace export requested. It includes reviewed input; no credential handles or endpoint descriptors.','complete');
});
by('studio-case').value=fixture();showMode();
