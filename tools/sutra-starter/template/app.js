import {loadLocalNetwork,runNetwork} from './packages/sutra-runtime/index.js';
import {createScriptedModel} from './packages/sutra-runtime/testing.js';
import {createLocalActionRegistry} from './packages/sutra-actions/index.js';
const $=id=>document.getElementById(id);
const registry=createLocalActionRegistry([{name:'acknowledge',effect:'write_local',destination:'This page only (memory)',description:'Record a synthetic acknowledgement; no persistence or network.',validate:a=>Object.keys(a).length===1&&a.acknowledged===true,execute:async()=>({acknowledged:true})}]);
let proposal=null;
function setPending(value){proposal=value;$('confirm').disabled=!value;$('cancel').disabled=!value;$('prepare').disabled=!!value;}
$('run').addEventListener('click',async()=>{ $('run').disabled=true;$('status').textContent='Running scripted example';$('result').textContent='';
 try{const loaded=await loadLocalNetwork({baseUrl:new URL('/agents/',location.origin).href,expectedOrigin:location.origin,networkName:'learner'});const result=await runNetwork({definition:loaded.definition,request:'Explain synthetic source consistency.',model:createScriptedModel()});$('result').textContent=result.text;$('status').textContent='Scripted example completed; no live AI.';}catch{$('status').textContent='Example incomplete; retry explicitly.';}finally{$('run').disabled=false;}});
$('prepare').addEventListener('click',()=>{setPending(registry.prepare('acknowledge',{acknowledged:true}));$('status').textContent='Proposed: '+proposal.description+' Destination: '+proposal.destination;});
$('confirm').addEventListener('click',async()=>{if(!proposal)return;const id=proposal.id;setPending(null);try{await registry.execute(id);$('status').textContent='Local acknowledgement completed.';}catch{$('status').textContent='Local acknowledgement incomplete; no automatic retry.';}});
$('cancel').addEventListener('click',()=>{if(proposal)registry.cancel(proposal.id);setPending(null);$('status').textContent='Cancelled; no action executed.';});
