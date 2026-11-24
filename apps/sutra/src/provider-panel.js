import {discoverProvider,runProviderLesson} from './provider-run.js';
import {applyScreenState} from './status-state.js';
export function mountProviderPanel({baseUrl,sources,origin=location.origin}){
 const $=id=>document.getElementById(id);
 const check=$('provider-check'),run=$('provider-run'),cancel=$('provider-cancel'),question=$('provider-question'),status=$('provider-status'),output=$('provider-output'),answer=$('provider-answer'),list=$('provider-receipts'),metrics=$('provider-metrics');
 let model=null,active=null;
 const set=(s,m)=>applyScreenState(status,s,m);
 const clear=()=>{output.hidden=true;answer.textContent='';list.replaceChildren();metrics.textContent='';};
 function controls(){check.disabled=!!active;run.disabled=!!active||!model;cancel.disabled=!active||active.kind!=='run'||active.controller.signal.aborted;question.disabled=!!active||!model;}
 check.addEventListener('click',async()=>{
  if(active)return;model=null;clear();
  const operation={kind:'check',controller:new AbortController()};active=operation;controls();set('loading','Checking configuration without calling a model…');
  try{const found=await discoverProvider({origin,signal:operation.controller.signal});
   if(found.state==='configured'){model=found.model;set('idle','Model configured: '+model+'. A run may still be refused by quota or provider availability. No personal key is needed.');}
   else set('denied','Site-funded inference is disabled. The lesson, transcript, source checks and local review remain available.');
  }catch{set('error','Inference configuration could not be confirmed. No model request was made.');}
  finally{active=null;controls();}
 });
 run.addEventListener('click',async()=>{
  if(active||!model)return;clear();
  if(!question.value.trim()||question.value.length>1200){set('input_error','Enter a question of 1–1200 characters.');return;}
  const operation={kind:'run',controller:new AbortController()};active=operation;controls();set('running','Running the configured model and bounded source tools…');
  try{
   const result=await runProviderLesson({origin,baseUrl,model,question:question.value,sources,signal:operation.controller.signal});
   if(operation.controller.signal.aborted)throw Error('cancelled');
   answer.textContent=result.text;
   for(const receipt of result.receipts){const li=document.createElement('li');li.textContent=receipt.sourceId+' / '+receipt.sourceVersion+' · '+receipt.start+'–'+receipt.end+' s · '+receipt.excerpt;list.append(li);}
   if(!result.receipts.length){const li=document.createElement('li');li.textContent='No catalog-matched source receipt was retrieved. Do not treat the model answer as evidence.';list.append(li);}
   const u=result.usage;metrics.textContent=result.agentCalls+' agent invocations · '+result.modelCalls+' model calls · '+u.reported+'/'+u.calls+' calls reported token usage. '+(u.complete?'Reported input/output/total tokens: '+u.promptTokens+'/'+u.completionTokens+'/'+u.totalTokens+'.':'Usage incomplete; total run cost is unknown.')+' No automatic retries.';
   output.hidden=false;set('completed','Model run completed. Interpretation remains unverified; retrieved receipts establish catalog consistency only.');
  }catch{clear();set(operation.controller.signal.aborted?'cancelled':'error',operation.controller.signal.aborted?'Inference cancelled. No completed answer is claimed.':'Inference stopped or quota exhausted. No completed answer is claimed. The local lesson remains available; retry only explicitly.');}
  finally{active=null;controls();run.focus();}
 });
 cancel.addEventListener('click',()=>{if(active?.kind==='run'){active.controller.abort();controls();set('cancelling','Cancelling inference…');}});
 window.addEventListener('pagehide',()=>{active?.controller.abort();model=null;});
 controls();
}
