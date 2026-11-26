import test from 'node:test';
import assert from 'node:assert/strict';
import {createProtocolWorkspace} from '../protocol-workspace.js';
test('enrolled credential in approved endpoint metadata refuses before transport',async()=>{
 const credential='SYNTHETIC_ROUTE_CANARY_12345678';let calls=0,seed=1;
 const limits={maxCalls:2,maxInputBytes:50000,maxOutputTokens:1024,maxConcurrent:1};
 const workspace=createProtocolWorkspace({connections:[{id:'custom',label:'Local model',protocol:'ollama-chat-json',transportClass:'local',endpoint:'http://127.0.0.1:11434/api/'+credential,models:['local/model']}],globalLimits:limits,defaultProfileLimits:limits,randomBytes:n=>new Uint8Array(n).fill(seed++),clock:()=>0,exchange:async()=>{calls++;throw Error('unexpected contact');}});
 const handle=workspace.addProfile({providerId:'custom',label:'Operator',credential}).handle;
 await assert.rejects(workspace.execute({handle,model:'local/model',inputBytes:20,maxOutputTokens:128,operation:{question:'Test'}}),e=>e.code==='SECRET_ECHO'&&!e.message.includes(credential));assert.equal(calls,0);
});
