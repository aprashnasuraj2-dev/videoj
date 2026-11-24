import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';import {assessContentManifest,contentReviewStatement} from './intake.mjs';
const h=s=>createHash('sha256').update(s).digest('hex');
const data={media:'synthetic-media-bytes',transcript:'Synthetic transcript.',guide:'Synthetic guide.'};
const manifest=()=>({schema:1,contentVersion:'lesson-v1',lesson:{title:'Synthetic lesson intake fixture',durationSeconds:180},assets:{media:{path:'media/lesson.mp4',sha256:h(data.media)},transcript:{path:'text/transcript.txt',sha256:h(data.transcript)},guide:{path:'text/guide.txt',sha256:h(data.guide)}},rights:{media:{basis:'owned',evidenceRef:'private:rights-media-001',publicDistributionDeclared:true},transcript:{basis:'owned',evidenceRef:'private:rights-transcript-001',publicDistributionDeclared:true},guide:{basis:'written_permission',evidenceRef:'private:rights-guide-001',publicDistributionDeclared:true}},review:{status:'pending',reviewedAt:null,statement:null}});
const observed=()=>({media:{path:'media/lesson.mp4',sha256:h(data.media),bytes:Buffer.byteLength(data.media)},transcript:{path:'text/transcript.txt',sha256:h(data.transcript),bytes:Buffer.byteLength(data.transcript)},guide:{path:'text/guide.txt',sha256:h(data.guide),bytes:Buffer.byteLength(data.guide)}});
test('matching bytes and rights declaration remain incomplete until explicit human factual review declaration',()=>{
 const r=assessContentManifest(manifest(),{observedFiles:observed()});assert.equal(r.bytesMatch,true);assert.equal(r.rightsDeclared,true);assert.equal(r.reviewDeclared,false);assert.equal(r.structuralIntakeComplete,false);assert.match(r.limitation,/not proven/);
});
test('reviewed declaration can complete structural evidence but never upgrades human declarations to proof',()=>{
 const m=manifest();m.review={status:'reviewed',reviewedAt:'2026-11-24T00:00:00Z',statement:contentReviewStatement};const r=assessContentManifest(m,{observedFiles:observed()});
 assert.equal(r.structuralIntakeComplete,true);assert.match(r.limitation,/human evidence/);
});
test('hash drift, undeclared public distribution and malformed review fail or stay incomplete',()=>{
 const o=observed();o.guide.sha256='f'.repeat(64);assert.equal(assessContentManifest(manifest(),{observedFiles:o}).bytesMatch,false);
 const m=manifest();m.rights.guide.publicDistributionDeclared=false;assert.equal(assessContentManifest(m,{observedFiles:observed()}).rightsDeclared,false);
 const bad=manifest();bad.review={status:'reviewed',reviewedAt:'2026-11-24T00:00:00Z',statement:'reviewed'};assert.throws(()=>assessContentManifest(bad,{observedFiles:observed()}));
});
test('CLI computes actual file hashes from a bounded content root and refuses symlink/changed bytes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sutra-content-'));try{
  fs.mkdirSync(path.join(dir,'media'));fs.mkdirSync(path.join(dir,'text'));fs.writeFileSync(path.join(dir,'media/lesson.mp4'),data.media);fs.writeFileSync(path.join(dir,'text/transcript.txt'),data.transcript);fs.writeFileSync(path.join(dir,'text/guide.txt'),data.guide);
  const mf=path.join(dir,'manifest.json');fs.writeFileSync(mf,JSON.stringify(manifest()));const cli=new URL('./cli.mjs',import.meta.url).pathname;
  const ok=spawnSync(process.execPath,[cli,mf,dir],{encoding:'utf8'});assert.equal(ok.status,0);assert.equal(JSON.parse(ok.stdout).bytesMatch,true);
  fs.unlinkSync(path.join(dir,'text/guide.txt'));fs.symlinkSync(path.join(dir,'text/transcript.txt'),path.join(dir,'text/guide.txt'));const bad=spawnSync(process.execPath,[cli,mf,dir],{encoding:'utf8'});assert.equal(bad.status,2);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('rights evidence references must stay opaque/private rather than exposing public document URLs',()=>{
 for(const ref of ['https://example.com/contract.pdf','/local/path','private:','private:../secret']){
  const m=manifest();m.rights.media.evidenceRef=ref;assert.throws(()=>assessContentManifest(m,{observedFiles:observed()}));
 }
 const m=manifest();m.rights.media.evidenceRef='private:rights/media-2026-001';assert.equal(assessContentManifest(m,{observedFiles:observed()}).rights.media.evidenceRef,'private:rights/media-2026-001');
});
