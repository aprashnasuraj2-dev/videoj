const STATES=Object.freeze({
 idle:Object.freeze({busy:false,tone:'neutral'}),
 loading:Object.freeze({busy:true,tone:'progress'}),
 running:Object.freeze({busy:true,tone:'progress'}),
 cancelling:Object.freeze({busy:true,tone:'progress'}),
 empty:Object.freeze({busy:false,tone:'neutral'}),
 consent:Object.freeze({busy:false,tone:'progress'}),
 denied:Object.freeze({busy:false,tone:'warning'}),
 input_error:Object.freeze({busy:false,tone:'warning'}),
 error:Object.freeze({busy:false,tone:'danger'}),
 cancelled:Object.freeze({busy:false,tone:'warning'}),
 completed:Object.freeze({busy:false,tone:'success'})
});

export const learnerScreenStates=STATES;

export function applyScreenState(node,state,message){
 if(!node||typeof node.setAttribute!=='function'||!node.dataset)throw new TypeError('A status element is required.');
 const meta=STATES[state];
 if(!meta)throw new TypeError('Unknown learner screen state.');
 node.dataset.state=state;
 node.dataset.tone=meta.tone;
 node.setAttribute('aria-busy',String(meta.busy));
 if(message!==undefined){
  if(typeof message!=='string')throw new TypeError('Status message must be text.');
  node.textContent=message;
 }
 return meta;
}
