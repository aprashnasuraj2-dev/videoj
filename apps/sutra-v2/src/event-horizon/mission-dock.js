// Persistent navigation-level observation of the custom designer's operation.
// Does not initiate model calls or expand the approved plan.
const E=(tag,text,cls)=>{
 const n=document.createElement(tag);
 if(text!==undefined)n.textContent=text;
 if(cls)n.className=cls;
 return n;
};
function button(text,fn){
 const b=E('button',text);
 b.type='button';b.addEventListener('click',fn);
 return b;
}
const states={
 preparing:'Checking publisher route',
 previewed:'Exact plan awaiting approval',
 running:'Approved model execution',
 completed:'Candidate result retained',
 refused:'Operation refused',
 cancelled:'Operation cancelled'
};
export function mountMissionDock(root,{onOpen,onObserve,onCancel}){
 const section=E('aside',undefined,'eh-mission-dock');
 section.id='eh-mission-dock';
 section.hidden=true;
 section.setAttribute('aria-label','Designed network operation');
 const heading=E('h4','Network operation');
 const status=E('p','','eh-state');
 status.setAttribute('role','status');
 const detail=E('small','','eh-copy');
 let state=null;
 const open=button('Open network designer',()=>onOpen());
 const inspect=button('Inspect runtime trace',()=>{if(state?.traceId)onObserve(state.traceId);});
 const cancel=button('Cancel network operation',()=>onCancel());
 const actions=E('div',undefined,'eh-mission-actions');
 actions.append(open,inspect,cancel);
 section.append(heading,status,detail,actions);
 root.append(section);
 function update(next){
  state=next;
  section.hidden=!next||!Object.hasOwn(states,next.phase);
  if(section.hidden)return;
  section.dataset.phase=next.phase;
  status.textContent=states[next.phase];
  detail.textContent=next.phase==='preparing'?'No model request authorized.':next.phase==='previewed'?'Approve the exact preview in the designer.':next.phase==='running'?'At most '+next.maxModelCalls+' model requests; observed transport is not billing.':'The designer retains the latest operation status; no new authority granted.';
  inspect.disabled=!next.traceId;
  cancel.disabled=!next.busy;
 }
 return Object.freeze({update,section,destroy(){section.remove();}});
}
