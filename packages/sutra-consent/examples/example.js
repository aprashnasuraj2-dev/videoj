import {createConsentInspector} from '../index.js';
const intentOut=document.querySelector('#intent'),result=document.querySelector('#result'),choice=document.querySelector('#decision');
let simulatedCalls=0;
const inspector=createConsentInspector({decide:async intent=>{
  intentOut.textContent=JSON.stringify(intent,null,2);
  if(choice.value==='deny')return {decision:'deny',scope:'once'};
  return {decision:'allow',scope:choice.value==='session'?'session':'once'};
}});
document.querySelector('#run').addEventListener('click',async()=>{
  try{
    await inspector.perform({origin:'https://peer.example/',kind:'peer_manifest',purpose:'Load a public peer manifest',disclosure:['network name'],network:'checklist'},async()=>{simulatedCalls++;return {simulated:true};});
    result.textContent='Approved. Simulated transport count: '+simulatedCalls+'\n'+JSON.stringify(inspector.exportEvents(),null,2);
  }catch(error){result.textContent='Denied before transport ('+(error.code||'ERROR')+'). Simulated transport count: '+simulatedCalls;}
});
