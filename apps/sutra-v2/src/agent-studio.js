import {reviewedContractHandoff,investigationHandoff} from './workspace-handoff.js';
import {validateReviewedContract} from '../../../packages/sutra-knowledge/reviewed-claim-compiler.js';
import {createProtocolWorkspace} from '../../../packages/sutra-inference/protocol-workspace.js';
import {admitProofCase} from '../../../packages/sutra-knowledge/agent-bridge.js';
import {runAgentCouncil} from '../../../packages/sutra-knowledge/agent-council.js';
import {runExpressionCouncil} from '../../../packages/sutra-knowledge/expression-council.js';
import {admitCouncilDisclosure} from '../../../packages/sutra-knowledge/council-disclosure.js';
import {admitLocalCouncilConfig,LOCAL_COUNCIL_VERSION} from '../../../packages/sutra-knowledge/local-council-config.js';
import {verifyLocalCouncilTransfer} from '../../../packages/sutra-knowledge/local-council-transfer.js';
import {createExpressionReviewReceipt,verifyExpressionReviewReceipt} from '../../../packages/sutra-knowledge/expression-review-receipt.js';
import {expressionReviewQuestions,previewExpressionReviewAnswers,VERSION as REVIEW_ANSWERS_VERSION} from '../../../packages/sutra-knowledge/expression-review-answers.js';
import {casePin} from '../../../packages/sutra-knowledge/pinned-investigation.js';
import {sealExpressionInvestigation} from '../../../packages/sutra-knowledge/expression-investigation.js';
import {compilerFinanceFixture} from '../../../packages/sutra-knowledge/examples/reviewed-compiler.mjs';
import {beamGraph} from '../../../packages/sutra-knowledge/examples/beam.mjs';
const by=id=>document.getElementById(id);
const form=by('studio-form'),runButton=by('studio-run'),cancelButton=by('studio-cancel'),exportButton=by('studio-export');
const fields=[...form.querySelectorAll('input,select,textarea'),by('studio-reset-case'),by('studio-load-finance')];
const fixture=()=>JSON.stringify({obligationId:'beam_deflection',methods:[{id:'stiffer_assumption',constraintId:'deflection_limit',graphText:beamGraph('10000000000')},{id:'softer_assumption',constraintId:'deflection_limit',graphText:beamGraph('2500000000')}]});
const receiptButton=by('studio-export-receipt'),replayButton=by('studio-replay-receipt'),versionButton=by('studio-export-version');
let active=null,current=null,epoch=0,replayEpoch=0,transferEpoch=0,verifiedTransfer=null,reviewEpoch=0,reviewExport=null;
function status(message,state){const el=by('studio-status');el.textContent=message;el.dataset.state=state;}
function clear(){resetReviewPreview();by('studio-review-preview').disabled=true;by('studio-review-reset').disabled=true;current=null;exportButton.disabled=true;receiptButton.disabled=true;versionButton.disabled=true;by('studio-offer-version').disabled=true;by('studio-receipt-digest').textContent='';by('studio-version-digest').textContent='';by('studio-version-help').hidden=true;by('studio-result').hidden=true;by('studio-trace').replaceChildren();by('studio-methods').replaceChildren();by('studio-interpretation').textContent='';by('studio-applied-scopes').hidden=true;by('studio-applied-scopes').replaceChildren();by('studio-local-plan-commands').hidden=true;by('studio-local-plan-commands').textContent='';by('studio-local-plan-status').dataset.state='idle';by('studio-local-plan-status').textContent='Configuration changed; export a fresh local plan.';by('studio-review').hidden=true;by('studio-review-summary').textContent='';by('studio-review-steps').replaceChildren();}
function busy(value){for(const field of fields)field.disabled=value;runButton.disabled=value;cancelButton.disabled=!value;by('studio-handoff-load').disabled=value;by('studio-handoff-dismiss').disabled=value;if(value)exportButton.disabled=true;}
function revoke(){by('studio-share').checked=false;by('studio-expression-share').checked=false;by('studio-local-export-approve').checked=false;}
function resetReplay(){replayEpoch++;const el=by('studio-replay-status');el.textContent='Input changed. Replay again.';el.dataset.state='idle';replayButton.disabled=false;}
function invalidate(){epoch++;active?.abort();clear();resetReplay();resetTransfer();status('Configuration changed. Run a fresh council.','idle');}
function showMode(){const expression=by('studio-mode').value==='expression';for(const id of ['studio-method-question','studio-method-case','studio-method-consent'])by(id).hidden=expression;by('studio-expression-fields').hidden=!expression;}
const bindingList=id=>by(id).value.split(',').map(x=>x.trim()).filter(Boolean);
function readDisclosure(){
 const d={bindingIds:bindingList('studio-bindings'),includeValues:by('studio-include-values').checked};
 if(by('studio-custom-scopes').checked)d.agentScopes=['a','b'].map((slot,i)=>({agentId:i?'agent_two':'agent_one',bindingIds:bindingList('studio-scope-'+slot),includeValues:by('studio-values-'+slot).checked,feedbackFrom:by('studio-peer-'+slot).checked?[i?'agent_one':'agent_two']:[]}));
 return d;
}
const agentName=id=>id==='agent_one'?'Agent 1':'Agent 2';
function scopeCards(target,scopes){
 target.replaceChildren();
 for(const scope of scopes){
  const card=document.createElement('article');card.className='studio-scope-card';card.dataset.agent=scope.agentId;
  card.append(element('strong',agentName(scope.agentId)),element('p',scope.bindingIds.join(', ')),element('small',(scope.includeValues?'Raw values allowed':'Descriptors only')+' · '+(scope.feedbackFrom.length?'Peer feedback from '+scope.feedbackFrom.map(agentName).join(', '):'No peer feedback')));
  target.append(card);
 }
}
function showScopes(){
 const custom=by('studio-custom-scopes').checked;by('studio-agent-scopes').hidden=!custom;
 const el=by('studio-scope-status'),target=by('studio-scope-summary');target.replaceChildren();
 try{
  const grant=admitCouncilDisclosure(readDisclosure(),['agent_one','agent_two']);
  scopeCards(target,grant.scopes);el.dataset.state='ready';el.textContent=custom?'Individual permissions ready for review.':'Uniform team permissions ready for review.';
 }catch(error){
  el.dataset.state='refused';el.textContent=error?.code==='DISCLOSURE_FLOW'?'Peer feedback would flow from a broader evidence scope to a narrower one. Remove that direction.':'Complete valid binding subsets and raw-value permissions before approval.';
 }
}
function element(tag,value,className){const x=document.createElement(tag);x.textContent=value;if(className)x.className=className;return x;}
function render(r,configuration,calls){
 const expression=configuration.mode==='expression',artifacts=expression?r.candidates:r.methods;
 const key=x=>expression?x.expression:x.methodId,verdict=x=>expression?x.target.status:x.outcome.status;
 by('studio-result').hidden=false;by('studio-round-count').textContent=String(r.rounds.length);by('studio-calls').textContent=String(calls);by('studio-agreement').textContent=r.agreement.replaceAll('_',' ').toLowerCase();
 by('studio-interpretation').textContent=expression?r.state.replaceAll('_',' ')+' — semantic review required; agreement cannot resolve divergent outcomes.':'Method selection only; independent computation is conditional on the reviewed graphs.';
 if(expression&&r.reviewPlan){
  by('studio-review').hidden=false;by('studio-review-summary').textContent=r.reviewPlan.opposingPairs?r.reviewPlan.steps.length+' prioritized review prompts separate '+r.reviewPlan.coveredPairs+' of '+r.reviewPlan.opposingPairs+' opposing pairs. They do not validate meaning.':'No opposing pair to separate; review intended meaning and any missing candidates.';
  renderReviewQuestions(r);
 }
 if(expression&&r.disclosure.agentScopes){
  const target=by('studio-applied-scopes');target.hidden=false;target.append(element('h3','Applied evidence permissions'));
  const cards=document.createElement('div');cards.className='studio-scope-preview';scopeCards(cards,r.disclosure.agentScopes);target.append(cards);
 }
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
  const signal=phase=>document.dispatchEvent(new CustomEvent('sutra-council-event',{detail:{phase,agent:operation.agentId,round:operation.round}}));
  signal('request');
  await new Promise(resolve=>setTimeout(resolve,45));
  let result;try{result=JSON.stringify(syntheticPayload(config.strategy,operation));signal('response');}catch(error){signal('refused');throw error;}
  const body=request.protocol==='anthropic-messages-json'?{type:'message',role:'assistant',stop_reason:'end_turn',content:[{type:'text',text:result}],usage:{output_tokens:1}}:request.protocol==='ollama-chat-json'?{done:true,done_reason:'stop',message:{role:'assistant',content:result},eval_count:1}:{choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:result}}],usage:{completion_tokens:1}};
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
 if(mode==='expression')return {...common,roundPolicy:by('studio-round-policy').value,contractText:by('studio-contract').value,contractPin:by('studio-contract-pin').value.trim(),disclosure:readDisclosure()};
 const question=by('studio-question').value.trim(),caseText=by('studio-case').value;admitProofCase(caseText);
 return {...common,question,caseText};
}
form.addEventListener('input',event=>{
 if(event.target.id==='studio-custom-scopes'&&event.target.checked){
  // Start with the selected binding envelope, never silently grant raw
  // values or peer feedback in customized mode.
  for(const slot of ['a','b'])if(!by('studio-scope-'+slot).value.trim())by('studio-scope-'+slot).value=by('studio-bindings').value;
 }
 if(!['studio-share','studio-expression-share','studio-local-export-approve'].includes(event.target.id))revoke();
 showMode();showScopes();invalidate();
});
by('studio-reset-case').addEventListener('click',()=>{by('studio-case').value=fixture();revoke();invalidate();});
by('studio-load-finance').addEventListener('click',async()=>{revoke();invalidate();const ticket=epoch;try{const f=await compilerFinanceFixture();if(ticket!==epoch||active)return;by('studio-contract').value=f.contractText;by('studio-contract-pin').value=f.pin;by('studio-bindings').value='ocf25,ppe25,ocf26,ppe26';by('studio-include-values').checked=false;by('studio-custom-scopes').checked=false;for(const slot of ['a','b']){by('studio-scope-'+slot).value='';by('studio-values-'+slot).checked=false;by('studio-peer-'+slot).checked=false;}showScopes();status('Reviewed example loaded. Approve the selected disclosure before running.','idle');}catch{if(ticket===epoch)status('Example unavailable.','refused');}});
cancelButton.addEventListener('click',()=>{if(!active)return;active.abort();clear();status('Council cancelled. Late adapter results cannot publish.','cancelled');});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(active)return;clear();
 const expression=by('studio-mode').value==='expression';
 if(!by(expression?'studio-expression-share':'studio-share').checked){status('Approve the scoped sharing before starting the local rehearsal.','refused');return;}
 revoke();
 const ticket=++epoch,controller=new AbortController();active=controller;busy(true);status('Running local agents and independent verification…','busy');
 try{
  const config=readConfig();if(expression)admitCouncilDisclosure(config.disclosure,config.agents.map(x=>x.id));const {workspace,routes}=setup(config);
  const options={workspace,routes,maxRounds:config.rounds,maxOutputTokens:256,signal:controller.signal};
  const r=expression?await runExpressionCouncil({...options,contractText:config.contractText,contractPin:config.contractPin,disclosure:config.disclosure,roundPolicy:config.roundPolicy}):await runAgentCouncil({...options,caseText:config.caseText,question:config.question});
  if(ticket!==epoch||controller.signal.aborted)return;
  const calls=workspace.budgetSnapshot().global.used.calls;
  if(r.termination==='CANCELLED_OR_TIMEOUT'){status('Council timed out. No late results accepted.','cancelled');return;}
  render(r,config,calls);
  // Export omits endpoint descriptors as well as credential handles.
  current={version:'sutra-local-council-trace/v1',configuration:{...config,connections:config.connections.map(({endpoint,...c})=>c)},result:r,calls};
  status('Local council completed: '+r.termination+'. '+r.agreement+'. No live inference or decision authority.','complete');
 }catch{if(ticket===epoch&&!controller.signal.aborted)status('Council refused. Check connection descriptors, reviewed input, pin and disclosure.','refused');}
 finally{if(active===controller){active=null;busy(false);exportButton.disabled=!current;receiptButton.disabled=!(current?.configuration.mode==='expression'&&current.result.candidates.length);versionButton.disabled=!(current?.configuration.mode==='expression'&&current.result.uniqueCompiledProposals>=2);by('studio-offer-version').disabled=versionButton.disabled;}}
});
exportButton.addEventListener('click',()=>{
 if(!current||active)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='sutra-local-council-trace.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 status('Trace export requested. It includes reviewed input; no credential handles or endpoint descriptors.','complete');
});
receiptButton.addEventListener('click',async()=>{
 if(!current||active||current.configuration.mode!=='expression')return;
 const snapshot=current,ticket=epoch;receiptButton.disabled=true;
 try{
  const c=snapshot.configuration,r=await createExpressionReviewReceipt({contractText:c.contractText,contractPin:c.contractPin,bindingIds:c.disclosure.bindingIds,expressions:snapshot.result.candidates.map(x=>x.expression)});
  if(ticket!==epoch||current!==snapshot)return;
  const url=URL.createObjectURL(new Blob([r.receiptText],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='sutra-expression-review-receipt.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  by('studio-receipt-digest').textContent='Retain this receipt pin separately: '+r.receiptPin;
 }catch{if(ticket===epoch&&current===snapshot)by('studio-receipt-digest').textContent='Receipt refused.';}
 finally{if(ticket===epoch&&current===snapshot)receiptButton.disabled=false;}
});
versionButton.addEventListener('click',async()=>{
 if(!current||active||current.configuration.mode!=='expression'||current.result.uniqueCompiledProposals<2)return;
 const snapshot=current,ticket=epoch;versionButton.disabled=true;
 try{
  const c=snapshot.configuration,r=await createExpressionReviewReceipt({contractText:c.contractText,contractPin:c.contractPin,bindingIds:c.disclosure.bindingIds,expressions:snapshot.result.candidates.map(x=>x.expression)});
  const sealed=await sealExpressionInvestigation({contractText:c.contractText,contractPin:c.contractPin,receiptText:r.receiptText,receiptPin:r.receiptPin});
  if(ticket!==epoch||current!==snapshot)return;
  const url=URL.createObjectURL(new Blob([sealed.version.versionText],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='sutra-expression-investigation.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  by('studio-version-digest').textContent='Retain this investigation pin separately: '+sealed.version.digest;
  by('studio-version-help').hidden=false;
 }catch{if(ticket===epoch&&current===snapshot)by('studio-version-digest').textContent='Version refused. Review the distinct admitted candidates and artifact size.';}
 finally{if(ticket===epoch&&current===snapshot)versionButton.disabled=false;}
});
for(const id of ['studio-receipt-text','studio-receipt-expected'])by(id).addEventListener('input',resetReplay);
replayButton.addEventListener('click',async()=>{
 const ticket=++replayEpoch,el=by('studio-replay-status');replayButton.disabled=true;el.dataset.state='busy';el.textContent='Recomputing locally…';
 try{
  const r=await verifyExpressionReviewReceipt({contractText:by('studio-contract').value,contractPin:by('studio-contract-pin').value.trim(),receiptText:by('studio-receipt-text').value,receiptPin:by('studio-receipt-expected').value.trim()});
  if(ticket!==replayEpoch)return;
  el.dataset.state='reproduced';el.textContent=r.status+' · '+r.candidateCount+' candidates · '+r.state+' · semantic review required.';
 }catch{if(ticket===replayEpoch){el.dataset.state='refused';el.textContent='Receipt refused. Check exact receipt bytes, both retained pins and recomputed results.';}}
 finally{if(ticket===replayEpoch)replayButton.disabled=false;}
});
const localPlanButton=by('studio-export-local-plan');
let exportingPlan=false;
localPlanButton.addEventListener('click',async()=>{
 const el=by('studio-local-plan-status'),commands=by('studio-local-plan-commands');
 if(active||exportingPlan)return;
 commands.hidden=true;commands.textContent='';
 if(!by('studio-local-export-approve').checked){el.dataset.state='refused';el.textContent='Approve the full reviewed-contract export first.';return;}
 const ticket=epoch;by('studio-local-export-approve').checked=false;exportingPlan=true;localPlanButton.disabled=true;
 try{
  const c=readConfig();if(c.mode!=='expression')throw Error('EXPRESSION_REQUIRED');
  const used=new Set(c.agents.map(x=>x.connectionId));
  const connections=c.connections.filter(x=>used.has(x.id)).map(x=>{
   const authMode=by('studio-local-auth-'+x.slot).value,env=by('studio-local-env-'+x.slot).value.trim();
   if(authMode==='none'&&env)throw Error('UNUSED_ENV');
   return {id:x.id,label:x.id,protocol:x.protocol,endpoint:by('studio-local-endpoint-'+x.slot).value.trim(),models:[x.model],authMode,credentialEnv:authMode==='none'?null:env};
  });
  const config={version:LOCAL_COUNCIL_VERSION,contractText:c.contractText,contractPin:c.contractPin,disclosure:c.disclosure,connections,agents:c.agents,budget:{maxCalls:c.callCap,maxInputBytes:100000,maxOutputTokens:c.callCap*256,maxConcurrent:Math.min(2,c.callCap)},maxRounds:c.rounds,maxOutputTokens:256,roundPolicy:c.roundPolicy,timeoutMs:15000,transportDeadlineMs:10000};
  const text=JSON.stringify(config,null,2),admitted=await admitLocalCouncilConfig(text);
  if(ticket!==epoch||active)return;
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),anchor=document.createElement('a');anchor.href=url;anchor.download='sutra-local-council-config.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  el.dataset.state='complete';el.textContent='Configuration export requested. No endpoint contact. Review CLI preview before executing. Retain plan pin: '+admitted.planPin;
  commands.textContent='node apps/sutra-v2/local-council.mjs --plan < sutra-local-council-config.json\n\nnode apps/sutra-v2/local-council.mjs --execute-local --approve-local-disclosure --approve-plan '+admitted.planPin+' --export-version --portable-output < sutra-local-council-config.json > sutra-local-result.json';
  commands.hidden=false;
 }catch{if(ticket===epoch){el.dataset.state='refused';el.textContent='Local configuration refused. Check reviewed contract/pin, scopes, literal loopback endpoints, protocols and environment names.';}}
 finally{exportingPlan=false;localPlanButton.disabled=false;}
});
function resetTransfer(){
 transferEpoch++;verifiedTransfer=null;by('studio-transfer-download').disabled=true;by('studio-transfer-help').hidden=true;by('studio-transfer-verify').disabled=false;
 const el=by('studio-transfer-status');el.dataset.state='idle';el.textContent='Inputs changed. Verify the portable result again.';
}
for(const id of ['studio-transfer-file','studio-transfer-plan-pin','studio-transfer-receipt-pin','studio-transfer-version-pin'])by(id).addEventListener('input',resetTransfer);
by('studio-transfer-verify').addEventListener('click',async()=>{
 const ticket=++transferEpoch,el=by('studio-transfer-status'),button=by('studio-transfer-verify');verifiedTransfer=null;by('studio-transfer-download').disabled=true;by('studio-transfer-help').hidden=true;button.disabled=true;el.dataset.state='busy';el.textContent='Recomputing conditional evidence locally…';
 try{
  const file=by('studio-transfer-file').files[0];if(!file||file.size<1||file.size>262144)throw Error('TRANSFER_SIZE');
  const contractText=by('studio-contract').value,contractPin=by('studio-contract-pin').value.trim(),expectedPlanPin=by('studio-transfer-plan-pin').value.trim(),expectedReceiptPin=by('studio-transfer-receipt-pin').value.trim(),expectedVersionPin=by('studio-transfer-version-pin').value.trim()||null;
  const transferText=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer());
  if(ticket!==transferEpoch)return;
  const result=await verifyLocalCouncilTransfer({transferText,contractText,contractPin,expectedPlanPin,expectedReceiptPin,expectedVersionPin});
  if(ticket!==transferEpoch)return;
  verifiedTransfer=result;el.dataset.state='reproduced';el.textContent=result.status+' · '+result.candidateCount+' candidates · '+result.state+(result.version?' · exact root version reproduced':' · receipt only')+' · semantic review required. No model authorship verified.';
  by('studio-transfer-download').disabled=!result.version;by('studio-transfer-help').hidden=!result.version;
 }catch{if(ticket===transferEpoch){el.dataset.state='refused';el.textContent='Portable result refused. Check the exact reviewed contract, retained plan/receipt/version pins and recomputed root.';}}
 finally{if(ticket===transferEpoch)button.disabled=false;}
});
by('studio-transfer-download').addEventListener('click',()=>{
 const version=verifiedTransfer?.version;if(!version)return;
 const url=URL.createObjectURL(new Blob([version.versionText],{type:'application/json'})),anchor=document.createElement('a');anchor.href=url;anchor.download='sutra-verified-local-investigation.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 by('studio-transfer-status').textContent='Verified version download requested. Retain its pin separately: '+version.versionPin;
});
by('studio-case').value=fixture();showMode();showScopes();

function resetReviewPreview(){reviewEpoch++;reviewExport=null;by('studio-review-export').disabled=true;by('studio-review-candidates').replaceChildren();by('studio-review-status').textContent='';delete by('studio-review-status').dataset.state;}
function renderReviewQuestions(r){
 const questions=expressionReviewQuestions(r.reviewPlan);
 const formula=id=>{const entry=r.triage?.contrast.entries.find(x=>x.id===id);return r.candidates.find(x=>x.proposalDigest===entry?.computation?.proposalDigest)?.expression??id;};
 for(const q of questions){
  const item=element('li',q.prompt);const label=element('label','Answer '+q.id.replace('review_',''));label.htmlFor='studio-'+q.id;
  const select=document.createElement('select');select.id='studio-'+q.id;select.dataset.reviewQuestion=q.id;select.append(new Option('Not sure / leave unanswered',''));
  for(const opt of q.options)select.append(new Option(q.kind==='EXPRESSION_STRUCTURE'?formula(opt):opt==='INCLUDED'?'Include this binding':opt==='NOT_INCLUDED'?'Do not include this binding':opt,opt));
  item.append(element('p',q.choices.map(c=>formula(c.candidateId)+' — '+(q.kind==='EXPRESSION_STRUCTURE'?'review complete expression':c.choice)).join(' | ')),label,select);by('studio-review-steps').append(item);
  select.addEventListener('input',()=>{resetReviewPreview();by('studio-review-preview').disabled=false;});
 }
 by('studio-review-preview').disabled=!questions.length;by('studio-review-reset').disabled=!questions.length;
}
by('studio-review-reset').addEventListener('click',()=>{for(const s of by('studio-review-steps').querySelectorAll('select'))s.value='';resetReviewPreview();by('studio-review-preview').disabled=false;by('studio-review-status').textContent='Answers cleared. Original proposals remain unchanged.';});
by('studio-review-preview').addEventListener('click',async()=>{
 if(!current||active||current.configuration.mode!=='expression')return;
 const snapshot=current,runTicket=epoch;resetReviewPreview();const ticket=reviewEpoch;by('studio-review-preview').disabled=true;
 try{
  const c=snapshot.configuration,r=await createExpressionReviewReceipt({contractText:c.contractText,contractPin:c.contractPin,bindingIds:c.disclosure.bindingIds,expressions:snapshot.result.candidates.map(x=>x.expression)});
  const answers=[...by('studio-review-steps').querySelectorAll('select')].filter(s=>s.value).map(s=>({questionId:s.dataset.reviewQuestion,choice:s.value}));
  const answersText=JSON.stringify({version:REVIEW_ANSWERS_VERSION,receiptPin:r.receiptPin,answers}),answersPin=await casePin(answersText);
  const preview=await previewExpressionReviewAnswers({contractText:c.contractText,contractPin:c.contractPin,receiptText:r.receiptText,receiptPin:r.receiptPin,answersText,answersPin});
  if(ticket!==reviewEpoch||runTicket!==epoch||current!==snapshot)return;
  const el=by('studio-review-status');el.dataset.state='complete';el.textContent=preview.status.replaceAll('_',' ')+' · '+preview.remainingCandidateIds.length+' of '+preview.candidates.length+' supplied candidates not contradicted by answers. Original disagreement is retained; no adoption or authority.';
  for(const candidate of preview.candidates){const card=element('article','', 'studio-method');card.dataset.compatibility=candidate.compatibility;card.append(element('strong',candidate.expression),element('p',candidate.conditionalState.replaceAll('_',' ')),element('small',candidate.compatibility.replaceAll('_',' ')));by('studio-review-candidates').append(card);}
  reviewExport={version:REVIEW_ANSWERS_VERSION,receiptText:r.receiptText,receiptPin:r.receiptPin,answersText,answersPin,preview};by('studio-review-export').disabled=false;
 }catch{if(ticket===reviewEpoch&&runTicket===epoch){by('studio-review-status').dataset.state='refused';by('studio-review-status').textContent='Answer preview refused. Re-run the council and review the supplied alternatives.';}}
 finally{if(ticket===reviewEpoch&&runTicket===epoch)by('studio-review-preview').disabled=false;}
});
by('studio-review-export').addEventListener('click',()=>{if(!reviewExport||!current||active)return;const url=URL.createObjectURL(new Blob([JSON.stringify(reviewExport,null,2)],{type:'application/json'})),anchor=document.createElement('a');anchor.href=url;anchor.download='sutra-expression-review-answers.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});

reviewedContractHandoff.subscribe(offer=>{
 by('studio-handoff').hidden=!offer;
 by('studio-handoff-status').textContent=offer?'Immutable evidence snapshot '+offer.pin+' · review and explicitly load.':'No offered evidence.';
 by('studio-handoff-load').disabled=!!active;by('studio-handoff-dismiss').disabled=!!active;
});
by('studio-handoff-dismiss').addEventListener('click',()=>{if(!active)reviewedContractHandoff.clear(reviewedContractHandoff.read());});
by('studio-handoff-load').addEventListener('click',async()=>{
 const offer=reviewedContractHandoff.read(),ticket=epoch;if(!offer||active)return;
 by('studio-handoff-load').disabled=true;
 try{
  await validateReviewedContract(offer.text,offer.pin);
  const c=JSON.parse(offer.text);if(!c.bindings.length||c.question.text.length>2000)throw Error('HANDOFF_PROFILE');
  if(ticket!==epoch||active||reviewedContractHandoff.read()!==offer)return;
  revoke();invalidate();by('studio-mode').value='expression';by('studio-contract').value=offer.text;by('studio-contract-pin').value=offer.pin;
  // Do not choose an arbitrary subset of a large contract or grant disclosure.
  by('studio-bindings').value=c.bindings.length<=16?c.bindings.map(b=>b.id).join(','):'';
  by('studio-include-values').checked=false;by('studio-custom-scopes').checked=false;
  for(const slot of ['a','b']){by('studio-scope-'+slot).value='';by('studio-values-'+slot).checked=false;by('studio-peer-'+slot).checked=false;}
  showMode();showScopes();reviewedContractHandoff.clear(offer);
  status('Offered contract replayed and loaded in this tab. '+(c.bindings.length>16?'Select at most 16 binding IDs. ':'Review the selected binding IDs. ')+'Fresh disclosure approval is required; no model called.','idle');
 }catch{if(ticket===epoch&&reviewedContractHandoff.read()===offer)by('studio-handoff-status').textContent='Offer refused: exact reviewed contract or supported profile required.';}
 finally{if(!active)by('studio-handoff-load').disabled=false;}
});
by('studio-offer-version').addEventListener('click',async()=>{
 if(!current||active||current.configuration.mode!=='expression'||current.result.uniqueCompiledProposals<2)return;
 const snapshot=current,ticket=epoch;by('studio-offer-version').disabled=true;
 try{
  const c=snapshot.configuration,r=await createExpressionReviewReceipt({contractText:c.contractText,contractPin:c.contractPin,bindingIds:c.disclosure.bindingIds,expressions:snapshot.result.candidates.map(x=>x.expression)});
  const sealed=await sealExpressionInvestigation({contractText:c.contractText,contractPin:c.contractPin,receiptText:r.receiptText,receiptPin:r.receiptPin});
  if(ticket!==epoch||current!==snapshot||active)return;
  investigationHandoff.offer(sealed.version.versionText,sealed.version.digest);
  const receiver=by('reviewed-workspace');receiver.open=true;const panel=by('review-handoff');panel.scrollIntoView({block:'center'});by('review-handoff-preview').focus({preventScroll:true});
  status('Exact version offered for explicit replay in the evidence workspace. No interpretation adopted.','complete');
 }catch{if(ticket===epoch&&current===snapshot)status('Investigation offer refused. Check the distinct candidates and artifact size.','refused');}
 finally{if(ticket===epoch&&current===snapshot)by('studio-offer-version').disabled=false;}
});
