import test from 'node:test';
import assert from 'node:assert/strict';
import {createProtocolWorkspace} from '../protocol-workspace.js';
test('custom JSON encoder cannot disclose another enrolled credential through escaped wire fields',async()=>{
 const secret='ENCODER_CANARY_987654';let contacts=0,seed=1;
 const limits={maxCalls:2,maxInputBytes:50000,maxOutputTokens:1024,maxConcurrent:1};
 const adapter={id:'custom-json',encode:()=>JSON.stringify({note:secret}).replace(secret,'\\u0045'+secret.slice(1)),decode:()=>({text:'unexpected',outputTokens:1})};
 const w=createProtocolWorkspace({connections:[{id:'custom',label:'Custom',protocol:adapter.id,transportClass:'hosted',endpoint:'https://example.com/chat',models:['model/a']}],adapters:[adapter],globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,exchange:async()=>{contacts++;throw Error('contact');}});
 const a=w.addProfile({providerId:'custom',label:'A',credential:'SYNTHETIC_CREDENTIAL_A'}).handle;
 w.addProfile({providerId:'custom',label:'B',credential:secret});
 await assert.rejects(w.execute({handle:a,model:'model/a',inputBytes:20,maxOutputTokens:128,operation:{question:'Test'}}),e=>e.code==='SECRET_ECHO'&&!e.message.includes(secret));
 assert.equal(contacts,0);assert.equal(w.budgetSnapshot().global.used.calls,0);
});
