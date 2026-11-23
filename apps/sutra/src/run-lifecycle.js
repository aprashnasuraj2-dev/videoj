export const RUN_STATES=Object.freeze(['idle','running','cancelling','failed','complete']);

const transitionTable=Object.freeze({
  idle:new Set(['running']),
  running:new Set(['cancelling','failed','complete']),
  cancelling:new Set(['failed']),
  failed:new Set(['running']),
  complete:new Set(['running'])
});

export function createRunLifecycle({onChange=()=>{}}={}){
  if(typeof onChange!=='function')throw new TypeError('onChange must be callable');
  let state='idle',detail='Not started.',revision=0;
  const emit=()=>{
    const snapshot=Object.freeze({state,detail,revision});
    try{onChange(snapshot);}catch{}
    return snapshot;
  };
  const move=(next,nextDetail)=>{
    if(!RUN_STATES.includes(next))throw new Error('Unknown run lifecycle state.');
    if(!transitionTable[state].has(next))throw new Error(`Invalid run lifecycle transition ${state} -> ${next}.`);
    state=next;detail=String(nextDetail||'').slice(0,240);revision++;
    return emit();
  };
  emit();
  return Object.freeze({
    snapshot:()=>Object.freeze({state,detail,revision}),
    start:(message='Run started.')=>move('running',message),
    cancel:(message='Cancellation requested. Current output is incomplete.')=>move('cancelling',message),
    fail:(message='Run failed. No complete result is claimed.')=>move('failed',message),
    complete:(message='Run completed.')=>move('complete',message)
  });
}
