import test from 'node:test';import assert from 'node:assert/strict';
import {createScriptedRunAuthority} from '../src/scripted-run-authority.js';
test('run epochs refuse overlap and cannot be revived by a late completion',()=>{
 const gate=createScriptedRunAuthority(),a=gate.begin('network');
 assert.equal(gate.begin('network'),null);
 assert.equal(gate.current('network',a),true);
 assert.deepEqual(gate.revoke(),['network']);assert.equal(a.controller.signal.aborted,true);
 const b=gate.begin('network');
 assert.equal(gate.finish('network',a),false);
 assert.equal(gate.current('network',a),false);
 assert.equal(gate.current('network',b),true);
 assert.equal(gate.finish('network',b),true);
 assert.equal(gate.current('network',b),false);
});
test('navigation revokes both local scripted modes while preserving independent fresh attempts',()=>{
 const gate=createScriptedRunAuthority(),a=gate.begin('network'),b=gate.begin('source');
 assert.deepEqual(gate.revoke(),['network','source']);
 assert.equal(a.controller.signal.aborted,true);assert.equal(b.controller.signal.aborted,true);
 assert.notEqual(gate.begin('source'),null);assert.deepEqual(gate.revoke(),['source']);
});
