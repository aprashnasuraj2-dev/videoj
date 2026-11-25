import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {casePin} from '../pinned-investigation.js';
import {recoveryTrialFixture,exportTrialPartition,compareTrialVersions} from '../trial-partition.js';
import {verifyTrialSnapshot,MAX_TRIAL_SNAPSHOT_BYTES} from '../trial-snapshot.js';
const [folder,archiveArg]=process.argv.slice(2);assert.ok(folder&&archiveArg);const archive=resolve(archiveArg);
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex'),enc=x=>Buffer.from(JSON.stringify(x)),f=await recoveryTrialFixture(),p=await recoveryTrialFixture('preliminary');
const read=stem=>{const bytes=readFileSync(join(folder,'trial-'+stem+'.json')),pin=readFileSync(join(folder,'trial-'+stem+'.sha256'),'ascii').trim();assert.equal(hash(bytes),pin);return {bytes,pin};};
const a=read('aggregate'),b=read('partition'),c=read('comparison'),cases=[];
function add(name,bytes,reason,source=f.pin,after=undefined,pin=hash(bytes),conclusion){cases.push({name,bytes,reason,source,after,pin,conclusion});}
add('aggregate',a.bytes,null,f.pin,undefined,a.pin,'NOT_TESTED');
add('partition',b.bytes,null,f.pin,undefined,b.pin,'REFUTED_IN_DECLARED_PARTITION');
add('comparison',c.bytes,null,p.pin,f.pin,c.pin,'NOT_ESTABLISHED');
add('historical snapshot current pin',a.bytes,'PIN_MISMATCH',f.pin,undefined,b.pin);
add('missing snapshot pin',b.bytes,'PIN_REQUIRED',f.pin,undefined,'');
add('missing source pin',b.bytes,'SOURCE_PIN_REQUIRED','');
add('missing after pin',c.bytes,'AFTER_SOURCE_PIN_REQUIRED',p.pin);
add('wrong after pin',c.bytes,'AFTER_SOURCE_PIN_MISMATCH',p.pin,p.pin);
add('wrong source pin',b.bytes,'SOURCE_PIN_MISMATCH',p.pin);
add('extra after pin',b.bytes,'SOURCE_PIN_PROFILE',f.pin,p.pin);
const altered=Buffer.from(b.bytes);altered[10]^=1;add('one byte',altered,'PIN_MISMATCH',f.pin,undefined,b.pin);
for(const [name,bytes,reason] of [['duplicate keys',Buffer.from('{"version":1,"version":2}'),'WIRE_REFUSED'],['negative zero',Buffer.from('{"x":-0}'),'WIRE_REFUSED'],['invalid UTF-8',Buffer.from([255]),'WIRE_REFUSED'],['BOM',Buffer.concat([Buffer.from([239,187,191]),b.bytes]),'WIRE_REFUSED'],['oversize',Buffer.alloc(MAX_TRIAL_SNAPSHOT_BYTES+1),'SIZE_OR_TYPE']])add(name,bytes,reason);
for(const [name,mutate] of [['forged universal',x=>x.result.universalObservedLower='SUPPORTED_IN_DECLARED_PARTITION'],['forged causal claim',x=>x.result.universalCausalBenefit='PROVEN'],['forged interval',x=>x.result.rows[3].reportedAdjusted.intervalPosition='ABOVE_NULL'],['forged receipt',x=>x.result.rows[0].report.receipts[0].receiptDigest='sha256:'+'0'.repeat(64)],['scope leakage',x=>x.result.population='Every patient']]){const x=JSON.parse(b.bytes);mutate(x);add(name,enc(x),'REPLAY_MISMATCH');}
const changed=f.sourceText+' ',newPin=await casePin(changed),newBytes=enc(await exportTrialPartition(changed,newPin,'partition'));
add('new source original pin',newBytes,'SOURCE_PIN_MISMATCH');add('new source new pins',newBytes,null,newPin,undefined,hash(newBytes),'REFUTED_IN_DECLARED_PARTITION');
const synthetic=JSON.parse(f.sourceText);synthetic.studyId='synthetic_zero_event';for(const r of [synthetic.aggregate,...synthetic.strata]){r.treatedEvents=0;r.controlEvents=0;r.adjusted.lower=100;r.adjusted.point=100;r.adjusted.upper=100;}
const syntheticText=JSON.stringify(synthetic),sp=await casePin(syntheticText),sb=enc(await exportTrialPartition(syntheticText,sp,'partition'));add('generic zero control count',sb,null,sp,undefined,hash(sb),'REFUTED_IN_DECLARED_PARTITION');
const dir=mkdtempSync(join(tmpdir(),'sutra-trial-parity-'));
try{
 const file=join(dir,'trial.json');
 for(const x of cases){
  const js=await verifyTrialSnapshot(x.bytes,x.pin,x.source,x.after);writeFileSync(file,x.bytes);
  const args=['-I','-S',archive,file,'--trial','--pin',x.pin,'--source-pin',x.source];if(x.after!==undefined)args.push('--after-source-pin',x.after);
  const proc=spawnSync('python3',args,{cwd:dir,encoding:'utf8',timeout:20000});assert.equal(proc.status,x.reason?1:0,x.name+': '+proc.stderr);assert.equal(proc.stderr,'',x.name);assert.deepEqual(JSON.parse(proc.stdout),js,x.name);
  if(x.reason)assert.deepEqual(js,{status:'REFUSED',reason:x.reason},x.name);else assert.equal(js.conclusion,x.conclusion,x.name);
  console.log(x.name,js.status,js.reason??js.conclusion);
 }
}finally{rmSync(dir,{recursive:true,force:true});}
console.log('TRIAL PARITY:',cases.length,'controls;',cases.filter(x=>!x.reason).length,'accepted,',cases.filter(x=>x.reason).length,'refused.');
