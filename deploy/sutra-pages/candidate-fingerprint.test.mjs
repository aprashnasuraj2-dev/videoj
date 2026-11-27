import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,cp,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fingerprint,encode,verifyFingerprint} from './candidate-fingerprint.mjs';
test('retained candidate verifies after local restoration; fails on missing, changed, extra, wrong revision and untrusted manifest',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'sutra-retain-'));
 try{
  const roots={},restored={};const revision='a'.repeat(40);
  for(const name of ['pages','guide','worker','functions','policy']){
   roots[name]=join(dir,name);await mkdir(roots[name]);await writeFile(join(roots[name],'content'),name);
   restored[name]=join(dir,'restored-'+name);await cp(roots[name],restored[name],{recursive:true});
  }
  const manifest=encode(await fingerprint(revision,roots)),pin=createHash('sha256').update(manifest).digest('hex'),input={manifest,pin,revision,roots:restored};
  assert.equal((await verifyFingerprint(input)).status,'matched');
  await assert.rejects(verifyFingerprint({...input,revision:'b'.repeat(40)}),/Revision mismatch/);
  await assert.rejects(verifyFingerprint({...input,pin:'0'.repeat(64)}),/Manifest digest mismatch/);
  await writeFile(join(restored.pages,'content'),'changed');await assert.rejects(verifyFingerprint(input),/Candidate bytes/);
  await writeFile(join(restored.pages,'content'),'pages');await writeFile(join(restored.guide,'extra'),'extra');await assert.rejects(verifyFingerprint(input),/Candidate bytes/);
  await rm(join(restored.guide,'extra'));await rm(join(restored.worker,'content'));await assert.rejects(verifyFingerprint(input),/Empty component/);
  await writeFile(join(restored.worker,'content'),'worker');await symlink(join(restored.worker,'content'),join(restored.worker,'link'));await assert.rejects(verifyFingerprint(input),/Symbolic link/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
