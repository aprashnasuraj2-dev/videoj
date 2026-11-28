import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateReleaseCi,inspectNpmLock,RELEASE_REQUIRED_JOBS} from '../release-ci-evidence.js';
const head='a'.repeat(40);
const good=()=>Object.entries(RELEASE_REQUIRED_JOBS).map(([name,jobs],i)=>({name,id:i+1,head_sha:head,status:'completed',conclusion:'success',jobs:jobs.map((name,j)=>({name,id:100*(i+1)+j,status:'completed',conclusion:'success'}))}));
test('all exact required workflow and job receipts are necessary, not sufficient for release',()=>{
 const ok=validateReleaseCi(head,good());assert.equal(ok.eligible,true);assert.equal(ok.requiredWorkflows,15);assert.equal(ok.requiredJobs,19);assert.equal(ok.authority,'STRUCTURAL_CI_ONLY');
 for(const mutate of [x=>x.pop(),x=>x[0].head_sha='0'.repeat(40),x=>x[0].status='queued',x=>x[0].conclusion='skipped',x=>x[0].jobs.pop(),x=>x[0].jobs[0].conclusion='failure',x=>x.push(x[0]),x=>x[0].jobs.push(x[0].jobs[0]),x=>x[0].jobs[0].run_id=999,x=>x[0].jobs[0].head_sha='0'.repeat(40)]){
  const c=good();mutate(c);assert.equal(validateReleaseCi(head,c).eligible,false);
 }
 assert.throws(()=>validateReleaseCi('main',good()),/RELEASE_CI_INPUT/);
});
test('npm locks have fixed registry integrity and declared license, not vulnerability clearance',async()=>{
 for(const path of ['apps/sutra-v2/package-lock.json','apps/sutra/package-lock.json','apps/sutra-peer/package-lock.json']){
  const lock=JSON.parse(await readFile(new URL('../../../'+path,import.meta.url),'utf8')),r=inspectNpmLock(lock);
  assert.deepEqual(r.issues,[]);assert.equal(r.authority,'DECLARED_METADATA_ONLY');
  const k=Object.keys(lock.packages).find(Boolean);if(!k)continue;
  lock.packages[k].resolved='https://registry.npmjs.org.evil.invalid/p';lock.packages[k].integrity='sha512-invalid';lock.packages[k].license='UNKNOWN';assert.equal(inspectNpmLock(lock).issues.length,3);
 }
});
