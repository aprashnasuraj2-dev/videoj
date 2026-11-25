import {planQuiz,readQuizObservation,discoverQuizCapability,quizTransfer} from '../../../packages/sutra-knowledge/quiz-frontier.js';
import {createConsentInspector} from '../../../packages/sutra-consent/index.js';
const by=id=>document.getElementById(id),txt=(id,value)=>{by(id).textContent=value;};
const pred=by('quiz-prediction'),plan=by('quiz-plan'),discover=by('quiz-discover'),observe=by('quiz-observe'),exp=by('quiz-export'),url=by('quiz-peer-url'),dialog=by('quiz-consent');
let state=null,extra=[],publishers=[],result=null,busy=false,withdrawn=false,history=null;
const controls=[pred,plan,discover,observe,exp,url];
function refresh(){
 pred.disabled=plan.disabled=url.disabled=busy;
 discover.disabled=busy||!state||!!result||withdrawn;observe.disabled=busy||!state||!!result||withdrawn;exp.disabled=busy||!result||withdrawn;
 by('quiz-withdraw').disabled=busy||!result||withdrawn;by('quiz-restore').disabled=busy||!withdrawn;by('quiz-history').disabled=busy||!history;
}
function reset(){state=null;extra=[];publishers=[];result=null;withdrawn=false;history=null;txt('quiz-history-status','');for(const id of ['quiz-cost','quiz-next','quiz-worlds'])txt(id,'—');txt('quiz-evidence','');txt('quiz-peer-status','No contact attempted.');delete by('quiz-peer-status').dataset.state;delete by('quiz-status').dataset.state;by('quiz-transfer').hidden=true;txt('quiz-transfer-status','');refresh();}
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
 txt('quiz-status','Prediction '+result.feedback.replace('prediction_','')+'. '+(result.answer==='a_higher'?'A is higher':'A is not higher')+' after equal weighting. Scope: original synthetic exercise only.');by('quiz-status').dataset.state=result.status;
 const percent=v=>{const [n,d]=v.split('/').map(Number);return (100*n/d).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')+'%';};
 txt('quiz-evidence','Observed '+result.nodeId+' = '+result.value+'\nA beginner '+percent(result.standardized.a_beginner_rate)+' · advanced '+percent(result.standardized.a_advanced_rate)+'\nB beginner '+percent(result.standardized.b_beginner_rate)+' · advanced '+percent(result.standardized.b_advanced_rate)+'\nEqual-weighted A '+percent(result.standardized.a_standardized)+' · B '+percent(result.standardized.b_standardized)+'\nExcluded '+result.excludedWorlds.join(', ')+'\nSource '+result.evidence.sourceDigest);
 by('quiz-transfer').hidden=false;
}));
by('quiz-transfer-check').addEventListener('click',()=>{const r=quizTransfer(by('quiz-transfer-answer').value);txt('quiz-transfer-status',(r.correct?'Correct. ':'Reconsider. ')+r.explanation);});
exp.addEventListener('click',()=>{
 if(!result||busy)return;const blob=URL.createObjectURL(new Blob([JSON.stringify({version:1,plan:state,publishers,result},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=blob;a.download='sutra-subgroup-investigation.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(blob),1000);
});
refresh();

by('quiz-withdraw').addEventListener('click',()=>work(async()=>{
 if(!result||withdrawn)return;
 const prior={version:1,plan:state,publishers:[...publishers],result};
 const next=await planQuiz(extra,{sourceAvailable:false});
 if(next.plan.status!=='insufficient_observations')throw Error('WITHDRAWAL_NOT_ABSTAINED');
 history={version:1,transition:'simulated_source_withdrawal',prior,current:next};
 state=next;result=null;withdrawn=true;
 txt('quiz-cost','Unresolved');txt('quiz-next','No decisive evidence');txt('quiz-worlds',String(state.plan.worlds.length));
 txt('quiz-status','Source withdrawn in this simulation. Both models remain mathematically valid; their opposing conclusions cannot be distinguished.');by('quiz-status').dataset.state='evidence_withdrawn';
 txt('quiz-evidence','');by('quiz-transfer').hidden=true;txt('quiz-transfer-status','');
 txt('quiz-history-status','Historical result preserved, not current. All advertised observations depended on the same withdrawn source. Witness: '+state.plan.witness.join(' vs ')+'.');
}));
by('quiz-restore').addEventListener('click',()=>work(async()=>{
 if(!withdrawn)return;
 state=await planQuiz(extra);withdrawn=false;render();
 txt('quiz-history-status','Source availability restored. Read the decisive evidence again before claiming a current conclusion.');
}));
by('quiz-history').addEventListener('click',()=>{
 if(!history||busy)return;const blob=URL.createObjectURL(new Blob([JSON.stringify(history,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=blob;a.download='sutra-withdrawal-history.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(blob),1000);
});
