import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCheckpointWriter,inspectCheckpoint} from '../research-checkpoint.js';
test('atomic checkpoint binds digest and carries no restart authorization',async()=>{
 const parent=await mkdtemp(join(tmpdir(),'sutra-research-')),dir=join(parent,'session');
 try{
  const write=await createCheckpointWriter(dir),s={schema:'sutra-autonomous-research-checkpoint/v1',authority:'NONE',sessionId:'s1',sequence:1,pending:{state:'dispatch_unknown'}};
  await write(s);await write({...s,sequence:2});const path=join(dir,'checkpoint.json'),raw=await readFile(path,'utf8'),e=JSON.parse(raw);
  const restored=inspectCheckpoint(raw,e.digest);assert.equal(restored.checkpoint.sequence,2);assert.equal(restored.canAutomaticallyResume,false);
  assert.throws(()=>inspectCheckpoint(raw,'wrong'),/DIGEST/);assert.throws(()=>inspectCheckpoint(JSON.stringify({...e,payload:e.payload+' '}),e.digest),/DIGEST/);
  await assert.rejects(write({...s,sequence:1}),/STATE/);assert.equal((await stat(path)).mode&0o777,0o600);
  await assert.rejects(createCheckpointWriter(dir));
 }finally{await rm(parent,{recursive:true,force:true});}
});
