import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserRunReceipt} from '../src/browser-run-receipt.js';
test('receipt exports allowlisted runtime metadata, not inputs, messages, evidence or unknown labels',()=>{
 const preview={network:'peer_investigation',graphPin:'a'.repeat(64),model:'model',router:'https://example.org/api/v1',peerUrl:'https://guide.example.org/agents/checklist',limits:{maxModelCalls:6},objective:'secret objective',evidence:{quote:'private quote'}};
 const result={mode:'provider',modelCalls:3,agentCalls:2,text:'secret answer',events:[{kind:'agent',phase:'end',agent:'checklist',origin:'https://guide.example.org',status:'ok',text:'secret answer'},{kind:'tool',phase:'end',tool:'private name',args:'secret args'},{kind:'agent_result',phase:'note',text:'secret payload'}]};
 const receipt=createBrowserRunReceipt({preview,result,consentEvents:[{origin:'https://guide.example.org',contactKind:'peer_manifest',type:'decision',decision:'allow',scope:'once',purpose:'secret purpose'},{origin:'https://other.example.org',contactKind:'peer_manifest',type:'decision',decision:'allow'}]});
 assert.equal(receipt.events.length,2);assert.equal(receipt.events[0].agent,'checklist');assert.equal(receipt.consent.length,1);assert.equal(receipt.consent[0].scope,'once');assert.equal(receipt.authority,'NONE');assert.doesNotMatch(JSON.stringify(receipt),/secret|private quote|private name|other.example.org/);
});
