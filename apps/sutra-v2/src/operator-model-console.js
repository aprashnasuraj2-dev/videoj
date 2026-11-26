import {createProviderWorkspace} from '../../../packages/sutra-inference/provider-workspace.js';
import {prepareApprovedExpressionCouncil} from '../../../packages/sutra-knowledge/approved-expression-council.js';
import {compilerFinanceFixture} from '../../../packages/sutra-knowledge/examples/reviewed-compiler.mjs';
const by=id=>document.getElementById(id);
const scope='reviewed-question-bindings-and-conditional-feedback';
const limits={maxCalls:4,maxInputBytes:100000,maxOutputTokens:4096,maxConcurrent:1};
const calls=[];
const workspace=createProviderWorkspace({
 catalog:[{id:'local-a',label:'Local provider A',models:['local/model-a']},{id:'local-b',label:'Local provider B',models:['local/model-b']}],
 globalLimits:limits,defaultProfileLimits:{maxCalls:2,maxInputBytes:50000,maxOutputTokens:2048,maxConcurrent:1},
 transports:['local-a','local-b'].map(providerId=>({providerId,async send(request){
  calls.push(Object.freeze({providerId:request.providerId,model:request.model,leaseId:request.leaseId}));
  return {actualInputBytes:1,actualOutputTokens:8,value:{text:JSON.stringify({version:1,kind:'expression',expression:'[ocf26]>[ocf25]'})}};
 }}))
});
let enrolled=null,preview=null,busy=false,epoch=0;
const provider=by('operator-provider'),model=by('operator-model'),credential=by('operator-credential'),values=by('operator-values');
const state=(name,text)=>{by('operator-status').dataset.state=name;by('operator-status').textContent=text;};
function invalidate(text='Configuration changed. Create a new exact approval preview.'){
 epoch++;preview=null;by('operator-plan').textContent='No approval preview.';by('operator-pin').textContent='';by('operator-approve').checked=false;by('operator-approve').disabled=true;by('operator-run').disabled=true;by('operator-result').textContent='';if(enrolled)state('staged',text);else state('idle','No model authority granted.');
}
function syncModel(){
 const wanted=provider.value==='local-a'?'local/model-a':'local/model-b';
 for(const o of model.options)o.hidden=o.value!==wanted;model.value=wanted;
}
function controls(){
 by('operator-enroll').disabled=busy||!!enrolled||credential.value.length<8;
 by('operator-remove').disabled=busy||!enrolled;
 by('operator-preview').disabled=busy||!enrolled;
 by('operator-run').disabled=busy||!preview||!by('operator-approve').checked;
 for(const x of [provider,model,credential,values])x.disabled=busy||!!enrolled&&x!==values;
}
async function work(fn){
 if(busy)return;busy=true;controls();const ticket=epoch;
 try{await fn(ticket);}catch(error){if(ticket===epoch){preview=null;by('operator-approve').checked=false;by('operator-approve').disabled=true;by('operator-run').disabled=true;state('refused','Operation refused. No model authority is current.');by('operator-result').textContent=error?.code??error?.message??'REFUSED';}}
 finally{busy=false;controls();}
}
provider.addEventListener('change',()=>{syncModel();invalidate();controls();});
model.addEventListener('change',()=>{invalidate();controls();});
values.addEventListener('change',()=>{invalidate();controls();});
credential.addEventListener('input',controls);
by('operator-approve').addEventListener('change',controls);
by('operator-enroll').addEventListener('click',()=>work(async ticket=>{
 const secret=credential.value,providerId=provider.value,label='Operator ephemeral '+providerId;
 const added=workspace.addProfile({providerId,label,credential:secret});credential.value='';
 if(ticket!==epoch){workspace.removeProfile(added.handle);return;}
 enrolled={handle:added.handle,profile:added.profile,providerId,model:model.value};
 by('operator-profile').textContent=added.profile.providerLabel+' · '+added.profile.profileId+' · '+model.value;
 state('enrolled','Credential enrolled in memory. No request has been dispatched.');controls();
}));
by('operator-remove').addEventListener('click',()=>{
 if(!enrolled||busy)return;workspace.removeProfile(enrolled.handle);enrolled=null;invalidate('Credential removed. Any approval is revoked.');
 by('operator-profile').textContent='No credential enrolled.';state('revoked','Credential removed. Any prior approval is invalid.');controls();
});
by('operator-preview').addEventListener('click',()=>work(async ticket=>{
 if(!enrolled)return;const fixture=await compilerFinanceFixture();if(ticket!==epoch||!enrolled)return;
 const disclosure={bindingIds:['ocf25','ocf26'],includeValues:values.checked};
 const routes=[{id:'reviewer',role:'Propose one comparison',handle:enrolled.handle,model:enrolled.model,shareScope:scope}];
 const approval=await prepareApprovedExpressionCouncil({contractText:fixture.contractText,contractPin:fixture.pin,disclosure,routes,workspace,maxRounds:1,maxOutputTokens:128,timeoutMs:5000});
 if(ticket!==epoch)return;preview={approval,fixture,profileId:enrolled.profile.profileId};
 by('operator-plan').textContent=JSON.stringify(approval.plan,null,2);by('operator-pin').textContent=approval.planPin;
 by('operator-approve').disabled=false;by('operator-approve').checked=false;state('previewed','Exact approval preview created. No request dispatched.');controls();
}));
by('operator-run').addEventListener('click',()=>work(async ticket=>{
 if(!preview||!enrolled||!by('operator-approve').checked||preview.profileId!==enrolled.profile.profileId)return;
 const approval=preview.approval,pin=approval.planPin;preview=null;by('operator-approve').checked=false;by('operator-approve').disabled=true;by('operator-run').disabled=true;
 const result=await approval.execute({approveDisclosure:true,approvedPlanPin:pin});
 if(ticket!==epoch)return;by('operator-result').textContent='Conditional result: '+(result.candidates[0]?.target.status??'NO_ADMITTED_PROPOSAL')+' · local scripted calls '+calls.length+' · authority '+result.decisionAuthority;
 state('consumed','One-shot approval consumed. Create a new preview before any further run.');controls();
}));
syncModel();controls();
