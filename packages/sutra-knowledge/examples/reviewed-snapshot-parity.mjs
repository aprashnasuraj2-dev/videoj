import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {casePin} from '../pinned-investigation.js';
import {compilerFinanceFixture} from './reviewed-compiler.mjs';
import {exportReviewedProposal} from '../reviewed-claim-compiler.js';
import {verifyReviewedSnapshot,MAX_REVIEWED_SNAPSHOT_BYTES} from '../reviewed-snapshot.js';
const [folder,archiveArg]=process.argv.slice(2);assert.ok(folder&&archiveArg);const archive=resolve(archiveArg);
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex'),enc=x=>Buffer.from(JSON.stringify(x));
const read=stem=>readFileSync(join(folder,stem+'.json')),a=read('reviewed-workspace'),m=read('compiler-missing'),f=read('compiler-complete');
const q=JSON.parse(a),ap=await casePin(q.contractText),aPin=readFileSync(join(folder,'reviewed-workspace.sha256'),'ascii').trim();assert.equal(hash(a),aPin);
const mp=(await compilerFinanceFixture({missing:true})).pin,fp=(await compilerFinanceFixture()).pin;
const cases=[];
function add(name,bytes,reason,contract=ap,pin=hash(bytes),conclusion){cases.push({name,bytes,reason,contract,pin,conclusion});}
add('actual caller reviewed browser report',a,null,ap,aPin,'CONDITIONALLY_SATISFIED');
add('actual missing compiler report',m,null,mp,hash(m),'BLOCKED_MISSING_INPUT');
add('actual complete compiler report',f,null,fp,hash(f),'CONDITIONALLY_REFUTED');
add('wrong external contract',a,'CONTRACT_PIN_MISMATCH',fp);
add('missing contract',a,'CONTRACT_PIN_REQUIRED','');
add('missing snapshot',a,'PIN_REQUIRED',ap,'');
add('different snapshot',f,'PIN_MISMATCH',fp,aPin);
const tampered=Buffer.from(a);tampered[10]^=1;add('one byte',tampered,'PIN_MISMATCH',ap,aPin);
for(const [name,bytes,reason] of [['duplicate',Buffer.from('{"version":1,"version":2}'),'WIRE_REFUSED'],['negative zero',Buffer.from('{"x":-0}'),'WIRE_REFUSED'],['invalid UTF-8',Buffer.from([255]),'WIRE_REFUSED'],['BOM',Buffer.concat([Buffer.from([239,187,191]),a]),'WIRE_REFUSED'],['oversize',Buffer.alloc(MAX_REVIEWED_SNAPSHOT_BYTES+1),'SIZE_OR_TYPE'],['wrong profile',Buffer.from('{"version":"sutra-trial/v2"}'),'REVIEWED_SCHEMA']])add(name,bytes,reason);
for(const [name,mutate] of [['forged status',x=>x.result.target.status='VERIFIED'],['forged relevance',x=>x.result.target.questionRelevance='ESTABLISHED'],['forged method',x=>x.result.target.methodValidity='ESTABLISHED'],['forged receipt',x=>x.result.report.receipts[0].receiptDigest='sha256:'+'0'.repeat(64)],['forged source span',x=>x.result.bindings[0].span.start--],['forged lineage',x=>x.result.target.declaredLineages=['invented']],['changed proposal bytes',x=>x.proposalText+=' ']]){const x=JSON.parse(a);mutate(x);add(name,enc(x),'REPLAY_MISMATCH');}
const x=JSON.parse(a);const proposal=JSON.parse(x.proposalText);proposal.nodes[0].value='999';x.proposalText=JSON.stringify(proposal);add('unreviewed numeric leaf',enc(x),'REPLAY_REFUSED');
const changed=q.contractText+' ',changedPin=await casePin(changed),p=JSON.parse(q.proposalText);p.contractDigest=changedPin;
const alternate=enc(await exportReviewedProposal(changed,changedPin,JSON.stringify(p)));
add('new contract old external pin',alternate,'CONTRACT_PIN_MISMATCH');
add('new contract new external pins',alternate,null,changedPin,hash(alternate),'CONDITIONALLY_SATISFIED');
const dir=mkdtempSync(join(tmpdir(),'sutra-reviewed-parity-'));
try{
 const file=join(dir,'reviewed.json');
 for(const c of cases){
  const js=await verifyReviewedSnapshot(c.bytes,c.pin,c.contract);writeFileSync(file,c.bytes);
  const proc=spawnSync('python3',['-I','-S',archive,file,'--reviewed','--pin',c.pin,'--contract-pin',c.contract],{cwd:dir,encoding:'utf8',timeout:20000});
  assert.equal(proc.status,c.reason?1:0,c.name+': '+proc.stderr);assert.equal(proc.stderr,'',c.name);assert.deepEqual(JSON.parse(proc.stdout),js,c.name);
  if(c.reason)assert.deepEqual(js,{status:'REFUSED',reason:c.reason},c.name);else assert.equal(js.conclusion,c.conclusion,c.name);
  console.log(c.name,js.status,js.reason??js.conclusion);
 }
 const mixed=spawnSync('python3',['-I','-S',archive,file,'--reviewed','--trial','--pin',aPin,'--contract-pin',ap],{cwd:dir,encoding:'utf8',timeout:20000});assert.equal(mixed.status,2);
}finally{rmSync(dir,{recursive:true,force:true});}
console.log('REVIEWED PARITY:',cases.length,'controls;',cases.filter(x=>!x.reason).length,'accepted,',cases.filter(x=>x.reason).length,'refused.');
