// Differential verification of actual exported bytes against independent Python.
// Each control has an explicit expected result; agreement alone is not a pass.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createProofCapsule,verifyProofCapsule,MAX_CAPSULE_BYTES,mutateCapsuleByte} from '../proof-capsule.js';
const args=process.argv.slice(2);
assert.equal(args.length,5,'current capsule, current pin, old capsule, old pin, independent verifier archive required');
const [currentPath,currentPinPath,oldPath,oldPinPath,archive]=args.map(p=>resolve(p));
const current=readFileSync(currentPath),old=readFileSync(oldPath),currentPin=readFileSync(currentPinPath,'ascii').trim(),oldPin=readFileSync(oldPinPath,'ascii').trim();
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
assert.equal(hash(current),currentPin);assert.equal(hash(old),oldPin);
const text=current.toString('utf8'),envelope=JSON.parse(text),payload=JSON.parse(envelope.payloadText),cases=[];
const bytes=x=>Buffer.from(x);
const rootToken='"declaredRoots":'+payload.state.result.declaredRoots;
assert.ok(envelope.payloadText.includes(rootToken));
function add(name,value,status,detail,pin){const b=bytes(value);cases.push({name,bytes:b,pin:pin??hash(b),status,detail});}
const accepted=(name,value,conclusion='REFUTED',pin)=>add(name,value,'VERIFIED',conclusion,pin);
const rejected=(name,value,reason,pin)=>add(name,value,'REFUSED',reason,pin);
function wrap(raw){return JSON.stringify({...envelope,payloadText:raw,payloadDigest:hash(raw)});}
function altered(name,mutate,reason){const p=structuredClone(payload);mutate(p);rejected(name,wrap(JSON.stringify(p)),reason);}
accepted('exact current',current,'REFUTED',currentPin);accepted('exact historical',old,'SUPPORTED',oldPin);
// Actual guided-history prefixes exercise both remaining decision states.
// A semantically valid alternative is accepted only against its own new pin.
for(const [name,length,conclusion] of [['withdrawn',3,'UNDERDETERMINED'],['conflicted',7,'CONFLICTED']]){
 const alternative=await createProofCapsule(JSON.stringify(payload.state.events.slice(0,length)));
 accepted('valid alternative '+name,alternative.bytes,conclusion,alternative.expectedDigest);
 rejected('alternative '+name+' with retained current pin',alternative.bytes,'PIN_MISMATCH',currentPin);
}
rejected('old bytes with current pin',old,'PIN_MISMATCH',currentPin);
rejected('one changed byte with retained pin',mutateCapsuleByte(current),'PIN_MISMATCH',currentPin);
rejected('trailing space with retained pin',text+' ','PIN_MISMATCH',currentPin);
accepted('outer whitespace with independently replaced pin',' \t\r\n'+text+'\n');
accepted('reformatted envelope',JSON.stringify(envelope,null,2));
accepted('reordered envelope',JSON.stringify({payloadText:envelope.payloadText,payloadDigest:envelope.payloadDigest,format:envelope.format}));
accepted('escaped envelope key',text.replace('"format"','"f\\u006frmat"'));
accepted('payload pretty formatting and recomputed payload hash',wrap(JSON.stringify(payload,null,2)));
accepted('equivalent integral number spelling',wrap(envelope.payloadText.replace(rootToken,rootToken+'.0')));
accepted('equivalent exponent spelling',wrap(envelope.payloadText.replace(rootToken,rootToken+'e0')));
accepted('platform Number rounding boundary',wrap(envelope.payloadText.replace(rootToken,rootToken+'.0000000000000001')));
const padded=Buffer.concat([current,Buffer.alloc(MAX_CAPSULE_BYTES-current.length,32)]);
accepted('exact byte cap',padded);rejected('one byte beyond cap',Buffer.concat([padded,Buffer.from(' ')]),'SIZE_OR_TYPE');
rejected('empty bytes',Buffer.alloc(0),'SIZE_OR_TYPE');
for(const [name,pin] of [['empty',''],['short',currentPin.slice(0,-1)],['long',currentPin+'0'],['upper-case',currentPin.toUpperCase()],['leading whitespace',' '+currentPin],['trailing newline',currentPin+'\n'],['wrong alphabet','sha256:'+'g'.repeat(64)]])rejected('invalid pin '+name,current,'PIN_REQUIRED',pin);
for(const [name,raw] of [['duplicate key',text.replace('"format":','"format":"sutra-proof-capsule/v1","format":')],['escaped duplicate key',text.replace('"format":','"f\\u006frmat":"sutra-proof-capsule/v1","format":')],['trailing content',text+'null'],['non-JSON whitespace','\u00a0'+text],['BOM','\ufeff'+text],['empty JSON',''],['lone high surrogate',text.replace('"format":','"extra":"\\ud800","format":')],['lone low surrogate',text.replace('"format":','"extra":"\\udc00","format":')],['unbounded nesting','['.repeat(80)+'0'+']'.repeat(80)]])rejected('outer '+name,raw||' ','WIRE_REFUSED');
for(const [name,invalid] of [['illegal lead',[0xff]],['overlong encoding',[0xc0,0xaf]],['encoded surrogate',[0xed,0xa0,0x80]],['truncated scalar',[0xf0,0x9f,0x92]]])rejected('UTF-8 '+name,Buffer.from(invalid),'WIRE_REFUSED');
for(const [name,o] of [['unknown field',{...envelope,extra:true}],['wrong format',{...envelope,format:'sutra-proof-capsule/v2'}],['wrong digest type',{...envelope,payloadDigest:7}],['bad digest alphabet',{...envelope,payloadDigest:'sha256:'+'x'.repeat(64)}],['non-string payload',{...envelope,payloadText:{}}],['array envelope',[]],['null envelope',null]])rejected(name,JSON.stringify(o),'ENVELOPE_SCHEMA');
rejected('payload changed without updating inner hash',JSON.stringify({...envelope,payloadText:envelope.payloadText+' '}),'PAYLOAD_MISMATCH');
rejected('empty inner payload',wrap(''),'WIRE_REFUSED');
for(const [name,raw] of [['duplicate payload member',envelope.payloadText.replace('"format":','"format":"sutra-proof-payload/v1","format":')],['escaped duplicate payload member',envelope.payloadText.replace('"format":','"f\\u006frmat":"sutra-proof-payload/v1","format":')],['duplicate result member',envelope.payloadText.replace('"declaredRoots":','"declaredRoots":2,"declaredRoots":')],['non-integer',envelope.payloadText.replace(rootToken,'"declaredRoots":2.5')],['unsafe integer',envelope.payloadText.replace(rootToken,'"declaredRoots":9007199254740992')],['negative zero',envelope.payloadText.replace(rootToken,'"declaredRoots":-0')],['infinite exponent',envelope.payloadText.replace(rootToken,'"declaredRoots":1e999')],['deep nested payload','['.repeat(40)+'0'+']'.repeat(40)],['lone surrogate payload',envelope.payloadText.replace('"format":','"extra":"\\ud800","format":')]]){
 assert.notEqual(raw,envelope.payloadText,name);rejected(name,wrap(raw),'WIRE_REFUSED');
}
altered('embedded external pin',p=>p.expectedDigest=currentPin,'PAYLOAD_SCHEMA');
altered('unknown payload field',p=>p.extra=true,'PAYLOAD_SCHEMA');altered('computation version',p=>p.computation.debugger='other','PAYLOAD_SCHEMA');altered('removed qualification',p=>p.limitations.pop(),'PAYLOAD_SCHEMA');altered('wrong event container',p=>p.state.events={},'PAYLOAD_SCHEMA');altered('wrong state format',p=>p.state.version='other','PAYLOAD_SCHEMA');altered('case whitespace',p=>p.caseText+=' ','CASE_ANCHOR_MISMATCH');altered('changed case digest',p=>p.caseDigest='sha256:'+'0'.repeat(64),'CASE_ANCHOR_MISMATCH');
altered('forged target outcome',p=>p.state.result.claims.target.state='SUPPORTED','REPLAY_MISMATCH');altered('forged unrelated outcome',p=>p.state.result.claims.control_ok.state='REFUTED','REPLAY_MISMATCH');altered('forged root count',p=>p.state.result.declaredRoots=99,'REPLAY_MISMATCH');altered('forged returned world',p=>p.state.result.claims.target.survivingWorlds=['w000'],'REPLAY_MISMATCH');altered('forged history',p=>p.state.result.historyDigest=oldPin,'REPLAY_MISMATCH');altered('forged source',p=>p.state.events[0].sourceText+=' ','REPLAY_REFUSED');altered('forged copy identity',p=>p.state.events.find(e=>e.type==='add_copies').artifacts[0].id='copy_99','REPLAY_REFUSED');altered('duplicated read',p=>p.state.events.push(p.state.events[0]),'REPLAY_REFUSED');altered('overlong event history',p=>{while(p.state.events.length<25)p.state.events.push({type:'withdraw_lineage',lineage:'sample_two'});},'REPLAY_REFUSED');altered('unknown event type',p=>p.state.events.push({type:'authorize_external_action'}),'REPLAY_REFUSED');altered('event depth',p=>p.state.events.push({type:'read',extra:[[[[[[[[[0]]]]]]]]]}),'REPLAY_REFUSED');
const work=mkdtempSync(join(tmpdir(),'sutra-capsule-parity-'));
try{
 let verified=0,refused=0;
 for(const c of cases){
  const js=await verifyProofCapsule(c.bytes,c.pin);
  const filename=join(work,'capsule.json');writeFileSync(filename,c.bytes);
  const python=spawnSync('python3',['-I','-S',archive,filename,'--pin',c.pin],{cwd:work,encoding:'utf8',timeout:10000,maxBuffer:1048576});
  assert.equal(python.error,undefined,c.name);assert.equal(python.stderr,'',c.name);
  const py=JSON.parse(python.stdout);assert.equal(js.status,c.status,c.name+' JS');assert.equal(py.status,c.status,c.name+' Python');assert.equal(python.status,c.status==='VERIFIED'?0:1,c.name+' exit');
  if(c.status==='VERIFIED'){
   for(const key of ['capsuleDigest','payloadDigest','caseDigest','historyDigest'])assert.equal(js[key],py[key],c.name+' '+key);
   assert.equal(js.result.claims.target.state,c.detail,c.name);assert.equal(py.conclusion,c.detail,c.name);verified++;
  }else{assert.equal(js.reason,c.detail,c.name+' JS');assert.equal(py.reason,c.detail,c.name+' Python');refused++;}
 }
 console.log('PARITY: '+cases.length+' explicit controls; '+verified+' accepted, '+refused+' refused; both verifiers agree on every reason and all accepted identities.');
}finally{rmSync(work,{recursive:true,force:true});}
