// Exact actual browser-exported bytes, independently replayed by the
// downloaded standalone Python verifier. Agreement alone is not a pass.
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createAlignedCapsule,verifyAlignedCapsule,MAX_ALIGNED_CAPSULE_BYTES} from '../aligned-capsule.js';
import {createProofCapsule,verifyProofCapsule} from '../proof-capsule.js';
import {capacityExample,pinnedInvestigationExport,casePin} from '../pinned-investigation.js';
const args=process.argv.slice(2);assert.equal(args.length,5);
const [currentPath,currentPinPath,oldPath,oldPinPath,archive]=args.map(resolvePath=>resolve(resolvePath));
const current=readFileSync(currentPath),old=readFileSync(oldPath),pin=readFileSync(currentPinPath,'ascii').trim(),op=readFileSync(oldPinPath,'ascii').trim();
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const fixture=await capacityExample(),cp=fixture.pin,cases=[];
assert.equal(hash(current),pin);assert.equal(hash(old),op);
function add(name,bytes,reason,expectedPin=hash(bytes),caseDigest=cp,conclusion=null){cases.push({name,bytes:Buffer.from(bytes),reason,pin:expectedPin,caseDigest,conclusion});}
add('current',current,null,pin,cp,'REFUTED');add('historical',old,null,op,cp,'UNDERDETERMINED');
add('old snapshot current pin',old,'PIN_MISMATCH',pin);
add('missing snapshot pin',current,'PIN_REQUIRED','');
add('missing case pin',current,'CASE_PIN_REQUIRED',pin,'');
add('different case pin',current,'CASE_PIN_MISMATCH',pin,'sha256:'+'0'.repeat(64));
const altered=Buffer.from(current);altered[10]^=1;add('one-byte change',altered,'PIN_MISMATCH',pin);
add('whitespace change',Buffer.concat([current,Buffer.from(' ')]),'PIN_MISMATCH',pin);
add('restored exact bytes',current,null,pin,cp,'REFUTED');
for(const [name,b,reason] of [
 ['duplicate keys',Buffer.from('{"format":1,"format":2}'),'WIRE_REFUSED'],
 ['invalid UTF-8',Buffer.from([255]),'WIRE_REFUSED'],
 ['BOM',Buffer.concat([Buffer.from([239,187,191]),current]),'WIRE_REFUSED'],
 ['negative zero',Buffer.from('{"x":-0}'),'WIRE_REFUSED'],
 ['lone surrogate',Buffer.from('{"x":"\\ud800"}'),'WIRE_REFUSED'],
 ['oversize',Buffer.alloc(MAX_ALIGNED_CAPSULE_BYTES+1),'SIZE_OR_TYPE']
])add(name,b,reason);
const object=JSON.parse(current);
for(const [name,mutate,reason] of [
 ['forged conclusion',b=>b.investigation.result.state='SUPPORTED','REPLAY_MISMATCH'],
 ['forged schema',b=>b.investigation.alignment.schemaDigest='sha256:'+'0'.repeat(64),'REPLAY_MISMATCH'],
 ['forged event identity',b=>b.investigation.result.eventDigest='sha256:'+'0'.repeat(64),'REPLAY_MISMATCH'],
 ['substituted valid history with stale result',b=>b.investigation.eventText='[]','REPLAY_MISMATCH'],
 ['changed source bytes',b=>b.investigation.eventText=b.investigation.eventText.replace('30/1','10/1'),'REPLAY_REFUSED'],
 ['changed case bytes',b=>b.investigation.caseText+=' ','CASE_PIN_MISMATCH'],
 ['profile downgrade',b=>b.investigation.version='sutra-pinned-investigation/v1','CAPSULE_SCHEMA'],
 ['omitted limitations',b=>b.limitations=[],'CAPSULE_SCHEMA']
]){const b=structuredClone(object);mutate(b);add(name,Buffer.from(JSON.stringify(b)),reason);}
const c=JSON.parse(object.investigation.caseText),g=JSON.parse(c.worlds[0].graphText);g.nodes.find(n=>n.id==='target').op='ge';c.worlds[0].graphText=JSON.stringify(g);
const text=JSON.stringify(c),newPin=await casePin(text),legacy=await pinnedInvestigationExport(text,newPin,object.investigation.eventText);
const forged=Buffer.from(JSON.stringify({...object,investigation:{...legacy,version:object.investigation.version,alignment:object.investigation.alignment}}));
add('repinned mixed equation',forged,'REPLAY_REFUSED',hash(forged),newPin);
// Counterexample: a different, valid aligned case with its own newly
// trusted pins is replayable. The original case pin prevents substitution.
const alternateCase=fixture.caseText+' ',alternateCasePin=await casePin(alternateCase);
const alternate=await createAlignedCapsule(alternateCase,alternateCasePin,object.investigation.eventText);
add('valid alternate case with retained original case pin',alternate.bytes,'CASE_PIN_MISMATCH',alternate.expectedDigest,cp);
add('valid alternate case with its own pins',alternate.bytes,null,alternate.expectedDigest,alternateCasePin,'REFUTED');
const fixed=await createProofCapsule('[]');
add('fixed-fixture capsule in aligned profile',fixed.bytes,'CAPSULE_SCHEMA',fixed.expectedDigest,cp);
const dir=mkdtempSync(join(tmpdir(),'sutra-aligned-parity-'));
try{
 const file=join(dir,'proof.json');
 writeFileSync(file,current);
 const wrongProfile=spawnSync('python3',['-I','-S',archive,file,'--pin',pin],{encoding:'utf8',cwd:dir,timeout:20000});
 // The fixed envelope parser checks its depth bound before schema, so a
 // nested aligned capsule must be refused at the wire boundary in both.
 assert.equal(wrongProfile.status,1);const fixedRefusal=JSON.parse(wrongProfile.stdout);
 assert.deepEqual(fixedRefusal,{status:'REFUSED',reason:'WIRE_REFUSED'});
 assert.deepEqual(await verifyProofCapsule(current,pin),fixedRefusal);
 const mixedFlags=spawnSync('python3',['-I','-S',archive,file,'--pin',pin,'--case-pin',cp],{encoding:'utf8',cwd:dir,timeout:20000});assert.equal(mixedFlags.status,2);
 for(const x of cases){
  const js=await verifyAlignedCapsule(x.bytes,x.pin,x.caseDigest);writeFileSync(file,x.bytes);
  const proc=spawnSync('python3',['-I','-S',archive,file,'--aligned','--pin',x.pin,'--case-pin',x.caseDigest],{encoding:'utf8',cwd:dir,timeout:20000});
  assert.equal(proc.status,x.reason?1:0,x.name+': '+proc.stderr);assert.equal(proc.stderr,'',x.name);
  const py=JSON.parse(proc.stdout);assert.deepEqual(js,py,x.name);
  if(x.reason)assert.deepEqual(js,{status:'REFUSED',reason:x.reason},x.name);
  else{assert.equal(js.status,'VERIFIED',x.name);assert.equal(js.conclusion,x.conclusion,x.name);assert.equal(js.capsuleDigest,x.pin);assert.equal(js.caseDigest,x.caseDigest);}
  console.log(x.name,js.status,js.reason??js.conclusion);
 }
}finally{rmSync(dir,{recursive:true,force:true});}
console.log('ALIGNED PARITY:',cases.length,'explicit controls;',cases.filter(x=>!x.reason).length,'accepted,',cases.filter(x=>x.reason).length,'refused.');
