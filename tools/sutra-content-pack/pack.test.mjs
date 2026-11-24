import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildContentPack,assertReviewedGuideFragment} from './pack.mjs';
import {contentReviewStatement} from '../sutra-content-intake/intake.mjs';
import {validateContentProfile,MAX_REVIEWED_MEDIA_BYTES,deriveReviewedTracks} from '../../packages/sutra-content-profile/index.js';
import {assertReviewedGuideDerivative} from '../../packages/sutra-content-profile/guide-derivative.js';

const sha=x=>createHash('sha256').update(x).digest('hex');
async function fixture(){
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'sutra-content-src-'));
 await fsp.mkdir(path.join(root,'media'));await fsp.mkdir(path.join(root,'text'));
 const media=Buffer.from('fake mp4 bytes');
 const transcript=Buffer.from('Disconnect power. Verify zero energy.\n');
 const guide=Buffer.from('<!doctype html><section id="isolate">Disconnect power. Verify zero energy.</section>');
 await fsp.writeFile(path.join(root,'media','lesson.mp4'),media);
 await fsp.writeFile(path.join(root,'text','transcript.txt'),transcript);
 await fsp.writeFile(path.join(root,'text','guide.html'),guide);
 const manifest={schema:1,contentVersion:'lesson-v1',lesson:{title:'Reviewed isolation lesson',durationSeconds:12},
  assets:{media:{path:'media/lesson.mp4',sha256:sha(media)},transcript:{path:'text/transcript.txt',sha256:sha(transcript)},guide:{path:'text/guide.html',sha256:sha(guide)}},
  rights:{media:{basis:'owned',evidenceRef:'private:rights/media-1',publicDistributionDeclared:true},transcript:{basis:'owned',evidenceRef:'private:rights/transcript-1',publicDistributionDeclared:true},guide:{basis:'written_permission',evidenceRef:'private:rights/guide-1',publicDistributionDeclared:true}},
  review:{status:'reviewed',reviewedAt:'2026-11-24T00:00:00Z',statement:contentReviewStatement}};
 const semantic={schema:1,contentVersion:'lesson-v1',title:'Reviewed isolation lesson',observedAt:'2026-11-24T00:00:00Z',sourceId:'lesson-source',sourceVersion:'v1',featuredCueId:'isolate',
  cues:[{id:'isolate',start:2,end:7,text:'Disconnect power. Verify zero energy.'}],
  videoClaim:{title:'Video evidence',scope:'isolation_step',claimKey:'zero_energy_step',value:true,provenance:'Reviewed lesson media',dateBasis:'Human review observation'},
  guideClaim:{title:'Written guide',scope:'isolation_step',claimKey:'zero_energy_step',value:true,excerpt:'Disconnect power. Verify zero energy.',provenance:'Reviewed written guide',anchor:'isolate',dateBasis:'Human review observation'},
  ui:{noticeTitle:'Reviewed lesson evidence',noticeBody:'Media, transcript and written guide are version-bound to the reviewed content record.'}};
 return {root,manifest,semantic,media,transcript,guide};
}
test('compiler emits one reviewed hash-addressed pack that passes the shared content validator',async()=>{
 const f=await fixture(),out=f.root+'-out';
 try{
  const r=await buildContentPack({manifest:f.manifest,semantic:f.semantic,contentRoot:f.root,outputDir:out});
  assert.equal(r.profile.mode,'reviewed');assert.equal(validateContentProfile(r.profile,r.sourceCatalog).profile.mode,'reviewed');
  assert.ok(r.profile.media.video.includes(r.record.mediaSha256));assert.ok(r.profile.transcript.path.includes(r.record.transcriptSha256));assert.ok(r.profile.guideClaim.sourceHref.includes(r.record.guideSha256));assert.equal(r.profile.guideClaim.sourceHash,r.record.guideSha256);assert.match(r.profile.guideClaim.provenance,/Safe published excerpt derivative/);
  const publicGuide=fs.readFileSync(path.join(out,r.profile.guideClaim.sourceHref.split('#')[0].slice(1)));assert.equal(sha(publicGuide),r.record.guideSha256);assert.ok(publicGuide.length<=65536);assert.match(publicGuide.toString('utf8'),new RegExp(sha(f.guide)));assert.match(publicGuide.toString('utf8'),/default-src 'none'/);assert.deepEqual(assertReviewedGuideDerivative(publicGuide.toString('utf8'),r.profile.guideClaim,f.semantic.guideClaim.anchor),{inputSha256:sha(f.guide),truthStatus:'unverified'});
  assert.match(r.record.recordHash,/^[a-f0-9]{64}$/);assert.match(r.record.intakeRecordHash,/^[a-f0-9]{64}$/);
  for(const rel of [r.profile.media.video,r.profile.transcript.path,r.profile.guideClaim.sourceHref.split('#')[0]])assert.ok(fs.existsSync(path.join(out,rel.slice(1))));
  assert.match(fs.readFileSync(path.join(out,r.profile.media.captions.slice(1)),'utf8'),/00:00:02\.000 --> 00:00:07\.000/);
  assert.match(fs.readFileSync(path.join(out,r.profile.media.chapters.slice(1)),'utf8'),/isolate-chapter/);
 }finally{await fsp.rm(f.root,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
});
test('compiler refuses incomplete human declarations and altered source bytes',async()=>{
 const cases=[
  f=>{f.manifest.review={status:'pending',reviewedAt:null,statement:null};},
  async f=>{await fsp.writeFile(path.join(f.root,'text','transcript.txt'),'Different transcript.\n');},
  async f=>{await fsp.writeFile(path.join(f.root,'text','guide.html'),'<p>no anchor</p>');},
  async f=>{await fsp.writeFile(path.join(f.root,'media','lesson.mp4'),'different media');}
 ];
 for(const mutate of cases){
  const f=await fixture(),out=f.root+'-out';
  try{await mutate(f);await assert.rejects(buildContentPack({manifest:f.manifest,semantic:f.semantic,contentRoot:f.root,outputDir:out}));}
  finally{await fsp.rm(f.root,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
 }
});
test('compiler refuses semantic divergence, out-of-range cues and development-only reviewed UI copy',async()=>{
 const cases=[
  f=>{f.semantic.guideClaim.claimKey='different';},
  f=>{f.semantic.cues[0].end=13;},
  f=>{f.semantic.ui.noticeBody='Synthetic fixture pending';},
  f=>{f.semantic.featuredCueId='missing';}
 ];
 for(const mutate of cases){
  const f=await fixture(),out=f.root+'-out';
  try{mutate(f);await assert.rejects(buildContentPack({manifest:f.manifest,semantic:f.semantic,contentRoot:f.root,outputDir:out}));}
  finally{await fsp.rm(f.root,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
 }
});
test('compiler never overwrites an existing output directory',async()=>{
 const f=await fixture(),out=f.root+'-existing';
 try{await fsp.mkdir(out);await assert.rejects(buildContentPack({manifest:f.manifest,semantic:f.semantic,contentRoot:f.root,outputDir:out}),/already exists/);}
 finally{await fsp.rm(f.root,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
});

test('pack compiler rejects accessor-backed semantic and manifest data without invoking getters',async()=>{
 const f=await fixture(),out=f.root+'-out';let touched=0;
 try{
  Object.defineProperty(f.semantic,'title',{enumerable:true,get(){touched++;return 'bad';}});
  await assert.rejects(buildContentPack({manifest:f.manifest,semantic:f.semantic,contentRoot:f.root,outputDir:out}),/Invalid semantic metadata data/);assert.equal(touched,0);
  const g=await fixture();try{Object.defineProperty(g.manifest,'assets',{enumerable:true,get(){touched++;return {};}});await assert.rejects(buildContentPack({manifest:g.manifest,semantic:g.semantic,contentRoot:g.root,outputDir:g.root+'-out'}),/Invalid content manifest data/);assert.equal(touched,0);}finally{await fsp.rm(g.root,{recursive:true,force:true});await fsp.rm(g.root+'-out',{recursive:true,force:true});}
 }finally{await fsp.rm(f.root,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
});

test('compiler rejects active, hidden, duplicate or detached guide markup instead of claiming anchored evidence',async()=>{
 const cases=[
  '<!doctype html><script src="/assets/hostile.js"></script><section id="isolate">Disconnect power. Verify zero energy.</section>',
  '<section id="isolate">Wrong text.</section><p>Disconnect power. Verify zero energy.</p>',
  '<!--<section id="isolate">Disconnect power. Verify zero energy.</section>-->',
  '<section id="isolate" hidden>Disconnect power. Verify zero energy.</section>',
  '<section id="isolate">Disconnect power. Verify zero energy.</section><section id="isolate">duplicate</section>'
 ];
 for(const value of cases){const f=await fixture(),out=f.root+'-out';try{
  const bytes=Buffer.from(value);await fsp.writeFile(path.join(f.root,'text','guide.html'),bytes);f.manifest.assets.guide.sha256=sha(bytes);
  await assert.rejects(buildContentPack({manifest:f.manifest,semantic:f.semantic,contentRoot:f.root,outputDir:out}),/Guide/);assert.equal(fs.existsSync(out),false);
 }finally{await fsp.rm(f.root,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}}
});
test('guide fragment decoding preserves literal markup text and rejects ambiguous entities',()=>{
 assert.doesNotThrow(()=>assertReviewedGuideFragment('<section id="claim">A &amp; B &lt;tag&gt; &#39;quote&#39;</section>','claim',"A & B <tag> 'quote'"));
 assert.throws(()=>assertReviewedGuideFragment('<section id="claim">A &unknown; B</section>','claim','A &unknown; B'),/entity/);
 assert.throws(()=>assertReviewedGuideFragment('<section id="claim">A &amp;lt; B</section>','claim','A < B'),/exactly match/);
});
test('compiler snapshots the reviewed manifest before awaiting source files',async()=>{
 const f=await fixture(),out=f.root+'-out';try{
  const result=buildContentPack({manifest:f.manifest,semantic:f.semantic,contentRoot:f.root,outputDir:out});
  f.manifest.lesson.durationSeconds=1;f.manifest.rights.media.publicDistributionDeclared=false;f.manifest.assets.media.sha256='f'.repeat(64);
  const pack=await result;assert.equal(pack.sourceCatalog.sources[0].duration,12);
 }finally{await fsp.rm(f.root,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
});

test('compiler refuses symlinked input ancestors and output aliases into input tree',async()=>{
 const f=await fixture(),out=f.root+'-out',outside=await fsp.mkdtemp(path.join(os.tmpdir(),'sutra-content-outside-')),alias=f.root+'-alias';
 try{
  await fsp.rename(path.join(f.root,'text'),path.join(outside,'text'));
  await fsp.symlink(path.join(outside,'text'),path.join(f.root,'text'),'dir');
  await assert.rejects(buildContentPack({manifest:f.manifest,semantic:f.semantic,contentRoot:f.root,outputDir:out}),/Invalid source directory/);
  assert.equal(fs.existsSync(out),false);
  await fsp.unlink(path.join(f.root,'text'));await fsp.rename(path.join(outside,'text'),path.join(f.root,'text'));
  await fsp.symlink(f.root,alias,'dir');
  await assert.rejects(buildContentPack({manifest:f.manifest,semantic:f.semantic,contentRoot:alias,outputDir:out}),/real directory/);
  await assert.rejects(buildContentPack({manifest:f.manifest,semantic:f.semantic,contentRoot:f.root,outputDir:path.join(alias,'public-copy')}),/must not overlap/);
  assert.equal(fs.existsSync(path.join(f.root,'public-copy')),false);
 }finally{await fsp.rm(alias,{force:true});await fsp.rm(f.root,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});await fsp.rm(outside,{recursive:true,force:true});}
});

test('compiler refuses oversized learner media and transcript before creating output',async()=>{
 for(const [rel,limit] of [['media/lesson.mp4',MAX_REVIEWED_MEDIA_BYTES],['text/transcript.txt',2*1024*1024]]){
  const f=await fixture(),out=f.root+'-out';
  try{await fsp.truncate(path.join(f.root,rel),limit+1);await assert.rejects(buildContentPack({manifest:f.manifest,semantic:f.semantic,contentRoot:f.root,outputDir:out}),/Invalid source file/);assert.equal(fs.existsSync(out),false);}
  finally{await fsp.rm(f.root,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
 }
});

test('compiled native tracks are exact shared catalog derivatives; overlapping chapters are omitted',async()=>{
 const f=await fixture(),out=f.root+'-out';
 try{
  f.semantic.cues.push({id:'overlap',start:3,end:4,text:'Verify zero energy.'});
  const r=await buildContentPack({manifest:f.manifest,semantic:f.semantic,contentRoot:f.root,outputDir:out}),expected=deriveReviewedTracks(r.sourceCatalog.sources[0]);
  assert.equal(expected.chapters,null);
  assert.equal(fs.readFileSync(path.join(out,r.profile.media.chapters.slice(1)),'utf8'),'WEBVTT\n\n');
  assert.equal(fs.readFileSync(path.join(out,r.profile.media.captions.slice(1)),'utf8'),expected.captions);
 }finally{await fsp.rm(f.root,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
});
