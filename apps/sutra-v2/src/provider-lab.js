import {createProviderWorkspace} from '../../../packages/sutra-inference/provider-workspace.js';

const by=id=>document.getElementById(id);
const catalog=[
 {id:'provider-a',label:'Provider A',models:['alpha-fast','alpha-reasoning']},
 {id:'provider-b',label:'Provider B',models:['beta-balanced','beta-long-context']}
];
const profileLimits=Object.freeze({maxCalls:3,maxInputBytes:12000,maxOutputTokens:1200,maxConcurrent:1});
const globalLimits=Object.freeze({maxCalls:6,maxInputBytes:24000,maxOutputTokens:2400,maxConcurrent:2});
const syntheticSend=providerId=>async({providerId:actual,model,credential,operation})=>{
 if(actual!==providerId||typeof credential!=='string'||credential.length<8)throw Error('SYNTHETIC_ADAPTER_REFUSED');
 if(!operation||operation.kind!=='routing_rehearsal')throw Error('SYNTHETIC_ADAPTER_REFUSED');
 return {
  actualInputBytes:Math.min(96+model.length,operation.inputBytes),
  actualOutputTokens:12,
  value:Object.freeze({status:'synthetic_rehearsal_complete',providerId:actual,model})
 };
};
const workspace=createProviderWorkspace({
 catalog,globalLimits,defaultProfileLimits:profileLimits,leaseTicks:45000,
 transports:[
  {providerId:'provider-a',send:syntheticSend('provider-a')},
  {providerId:'provider-b',send:syntheticSend('provider-b')}
 ]
});
const handles=new Map();
const form=by('provider-form'),kind=by('provider-kind'),label=by('provider-label'),key=by('provider-key');
const reveal=by('provider-reveal'),status=by('provider-status'),profiles=by('provider-profiles');
const callCap=by('provider-call-cap'),tokenCap=by('provider-token-cap');

function providerMeta(id){return catalog.find(x=>x.id===id);}
function setStatus(text,state=''){status.textContent=text;if(state)status.dataset.state=state;else delete status.dataset.state;}
function updateMetrics(){
 const snapshot=workspace.budgetSnapshot();
 by('provider-count').textContent=String(workspace.list().length);
 by('provider-calls').textContent=String(snapshot.global.used.calls);
 by('provider-active').textContent=String(snapshot.global.used.active);
}
function pill(text){
 const el=document.createElement('span');el.className='provider-pill';el.textContent=text;return el;
}
function render(){
 profiles.replaceChildren();
 const rows=workspace.list();
 for(const profile of rows){
  const card=document.createElement('article');card.className='provider-card';card.dataset.profile=profile.profileId;
  const head=document.createElement('div');head.className='provider-card-head';
  const title=document.createElement('div');
  const name=document.createElement('strong');name.textContent=profile.label;
  const provider=document.createElement('span');provider.textContent=profile.providerLabel;
  title.append(name,provider);
  const state=pill(profile.budget.enabled?'Ready':'Disabled');state.dataset.state=profile.budget.enabled?'ready':'disabled';
  head.append(title,state);
  const facts=document.createElement('div');facts.className='provider-facts';
  facts.append(
   pill(profile.models.length+' models'),
   pill(profile.budget.used.calls+' / '+profile.budget.limits.maxCalls+' calls'),
   pill(profile.budget.used.outputTokens+' / '+profile.budget.limits.maxOutputTokens+' reserved tokens')
  );
  const controls=document.createElement('div');controls.className='provider-card-controls';
  const modelLabel=document.createElement('label');modelLabel.textContent='Model';
  const model=document.createElement('select');model.setAttribute('aria-label','Model for '+profile.label);
  for(const value of profile.models){const option=document.createElement('option');option.value=value;option.textContent=value;model.append(option);}
  const rehearse=document.createElement('button');rehearse.type='button';rehearse.textContent='Run local rehearsal';
  const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Remove';
  rehearse.addEventListener('click',async()=>{
   if(rehearse.disabled)return;
   rehearse.disabled=true;remove.disabled=true;setStatus('Rehearsing provider selection locally — no provider contact…','busy');
   try{
    const handle=handles.get(profile.profileId);if(!handle)throw Error('MISSING_HANDLE');
    const result=await workspace.execute({
     handle,model:model.value,inputBytes:256,maxOutputTokens:64,
     operation:{kind:'routing_rehearsal',inputBytes:256}
    });
    setStatus(profile.label+' routed to '+result.model+' in the local synthetic adapter. No LLM request was sent.','complete');
   }catch{
    setStatus('Local routing rehearsal was refused. No provider request was sent.','refused');
   }finally{render();}
  });
  remove.addEventListener('click',()=>{
   try{
    const handle=handles.get(profile.profileId);if(!handle)throw Error();
    workspace.removeProfile(handle);handles.delete(profile.profileId);
    setStatus(profile.label+' removed. Its ephemeral credential handle is invalid; budget history remains internal to this tab.','removed');
   }catch{setStatus('Profile removal was refused.','refused');}
   render();
  });
  controls.append(modelLabel,model,rehearse,remove);
  card.append(head,facts,controls);profiles.append(card);
 }
 if(!rows.length){
  const empty=document.createElement('p');empty.className='provider-empty';empty.textContent='Add a profile to rehearse multi-provider routing without contacting an LLM.';profiles.append(empty);
 }
 updateMetrics();
}
reveal.addEventListener('click',()=>{
 const showing=key.type==='text';key.type=showing?'password':'text';reveal.textContent=showing?'Show':'Hide';reveal.setAttribute('aria-pressed',String(!showing));
});
kind.addEventListener('change',()=>{
 const meta=providerMeta(kind.value);if(meta)setStatus(meta.label+' selected. Add a test credential to create an ephemeral profile.','selection');
});
form.addEventListener('submit',event=>{
 event.preventDefault();
 const credential=key.value;
 try{
  const calls=Number(callCap.value),tokens=Number(tokenCap.value);
  const added=workspace.addProfile({
   providerId:kind.value,label:label.value.trim(),credential,
   limits:{maxCalls:calls,maxInputBytes:12000,maxOutputTokens:tokens,maxConcurrent:1}
  });
  handles.set(added.profile.profileId,added.handle);
  key.value='';key.type='password';reveal.textContent='Show';reveal.setAttribute('aria-pressed','false');
  setStatus(added.profile.label+' added for this tab only. The form credential was cleared and no provider was contacted.','added');
 }catch{
  key.value='';
  setStatus('Profile setup was refused. Use a non-empty name and a test credential of at least 8 characters.','refused');
 }
 render();
});
render();
