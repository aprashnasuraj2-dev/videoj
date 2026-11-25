import {planQuiz,readQuizObservation,discoverQuizCapability,quizTransfer} from '../../../packages/sutra-knowledge/quiz-frontier.js';
import {createConsentInspector} from '../../../packages/sutra-consent/index.js';
const by=id=>document.getElementById(id),txt=(id,value)=>{by(id).textContent=value;};
const pred=by('quiz-prediction'),plan=by('quiz-plan'),discover=by('quiz-discover'),observe=by('quiz-observe'),exp=by('quiz-export'),url=by('quiz-peer-url'),dialog=by('quiz-consent');
let state=null,extra=[],publishers=[],result=null,busy=false;
const controls=[pred,plan,discover,observe,exp,url];
function refresh(){
 pred.disabled=plan.disabled=url.disabled=busy;
 discover.disabled=busy||!state||!!result;observe.disabled=busy||!state||!!result;exp.disabled=busy||!result;
}
function reset(){state=null;extra=[];publishers=[];result=null;for(const id of ['quiz-cost','quiz-next','quiz-worlds'])txt(id,'—');txt('quiz-evidence','');txt('quiz-peer-status','No contact attempted.');delete by('quiz-peer-status').dataset.state;delete by('quiz-status').dataset.state;by('quiz-transfer').hidden=true;txt('quiz-transfer-status','');refresh();}
function render(){
 const p=state.plan.plan;
 txt('quiz-cost',String(p.worstCost));txt('quiz-next',p.observationId);txt('quiz-worlds',String(state.plan.worlds.length));
 txt('quiz-status','Two executable models reproduce the same aggregate rates. Next: '+p.observationId+' (synthetic effort '+p.worstCost+').');by('quiz-status').dataset.state='planned';
}
async function work(fn,failId='quiz-status'){
 if(busy)return;busy=true;refresh();try{await fn();}catch{txt(failId,'Operation refused or unavailable. No new conclusion claimed.');by(failId).dataset.state='refused';}finally{busy=false;refresh();}
}
pred.addEventListener('change',()=>{reset();txt('quiz-status','Prediction changed; plan a new investigation.');});
plan.addEventListener('click',()=>work(async()=>{reset();state=await planQuiz();render();}));
function decide(contact,{signal}){
 return new Promise(resolve=>{
  let done=false;
  const finish=decision=>{if(done)return;done=true;signal?.removeEventListener('abort',deny);dialog.removeEventListener('cancel',cancel);by('quiz-allow').removeEventListener('click',allow);by('quiz-deny').removeEventListener('click',deny);if(dialog.open)dialog.close();resolve({decision,scope:'once'});};
  const allow=()=>finish('allow'),deny=()=>finish('deny'),cancel=e=>{e.preventDefault();deny();};
  if(signal?.aborted){deny();return;}
  txt('quiz-consent-purpose',contact.purpose);txt('quiz-consent-url',contact.resource??contact.origin);
  dialog.addEventListener('cancel',cancel);signal?.addEventListener('abort',deny,{once:true});by('quiz-allow').addEventListener('click',allow);by('quiz-deny').addEventListener('click',deny,{once:true});dialog.showModal();
 });
}
discover.addEventListener('click',()=>work(async()=>{
 const inspector=createConsentInspector({decide}),candidate=await discoverQuizCapability({peerUrl:url.value,inspector});
 const next=await planQuiz([...extra,candidate.offer]);const old=state.plan.plan.worstCost,newCost=next.plan.plan.worstCost;
 extra=[...extra,candidate.offer];publishers=[...publishers,candidate];state=next;render();
 txt('quiz-peer-status','Data-only peer loaded and executed locally with '+candidate.agentCalls+' scripted agent invocation. '+(newCost<old?'Worst-case effort reduced from '+old+' to '+newCost+'.':'No improvement in worst-case effort.')+' No external inference or evidence authority.');
 by('quiz-peer-status').dataset.state=newCost<old?'improved':'redundant';
},'quiz-peer-status'));
observe.addEventListener('click',()=>work(async()=>{
 result=await readQuizObservation({extra,nodeId:state.plan.plan.observationId,prediction:pred.value});
 if(result.status!=='conditional_question_resolved'){txt('quiz-status',result.status);by('quiz-status').dataset.state=result.status;result=null;return;}
 txt('quiz-worlds',String(result.remaining.worlds.length));txt('quiz-cost','0 remaining');txt('quiz-next','Decision invariant');
 txt('quiz-status','Prediction '+result.feedback.replace('prediction_','')+'. A is not higher after equal weighting. Scope: original synthetic exercise only.');by('quiz-status').dataset.state=result.status;
 const percent=v=>{const [n,d]=v.split('/').map(Number);return (100*n/d).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')+'%';};
 txt('quiz-evidence','Observed '+result.nodeId+' = '+result.value+'\nA beginner '+percent(result.standardized.a_beginner_rate)+' · advanced '+percent(result.standardized.a_advanced_rate)+'\nB beginner '+percent(result.standardized.b_beginner_rate)+' · advanced '+percent(result.standardized.b_advanced_rate)+'\nEqual-weighted A '+percent(result.standardized.a_standardized)+' · B '+percent(result.standardized.b_standardized)+'\nExcluded '+result.excludedWorlds.join(', ')+'\nSource '+result.evidence.sourceDigest);
 by('quiz-transfer').hidden=false;
}));
by('quiz-transfer-check').addEventListener('click',()=>{const r=quizTransfer(by('quiz-transfer-answer').value);txt('quiz-transfer-status',(r.correct?'Correct. ':'Reconsider. ')+r.explanation);});
exp.addEventListener('click',()=>{
 if(!result||busy)return;const blob=URL.createObjectURL(new Blob([JSON.stringify({version:1,plan:state,publishers,result},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=blob;a.download='sutra-subgroup-investigation.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(blob),1000);
});
refresh();
