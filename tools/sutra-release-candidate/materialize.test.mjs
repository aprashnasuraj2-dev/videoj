import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import fsp from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import {materializeReleaseCandidate,inventoryCandidate} from './materialize.mjs';
import {launchSpecCommit,currentSpecCommit,currentSpecBlob} from './release.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const mediaBytes=Buffer.from('reviewed-media-bytes'),transcriptBytes=Buffer.from('Reviewed source cue.\n'),guideBytes=Buffer.from('<!doctype html><section id="claim">Reviewed guide excerpt.</section>');
const mediaSha=sha(mediaBytes),transcriptSha=sha(transcriptBytes),guideSha=sha(guideBytes);
const sourceCatalog={schema:1,contentVersion:'lesson-v1',sources:[{id:'lesson-source',version:'v1',hash:transcriptSha,mediaHash:mediaSha,duration:8,cues:[{id:'featured',start:2,end:4,text:'Reviewed source cue.'}]}]};
const catalogBytes=Buffer.from(JSON.stringify(sourceCatalog,null,2)+'\n'),catalogSha=sha(catalogBytes);
const reviewedProfile={schema:1,mode:'reviewed',contentVersion:'lesson-v1',title:'Reviewed lesson',observedAt:'2026-11-24T01:00:00Z',primarySourceId:'lesson-source',featuredCueId:'featured',catalog:{path:'./source-catalog.json',sha256:catalogSha},transcript:{path:'/transcripts/release/'+transcriptSha+'/lesson.txt',sha256:transcriptSha},media:{video:'/media/release/'+mediaSha+'/lesson.mp4',poster:'/media/release/'+mediaSha+'/poster.svg',chapters:'/media/release/'+transcriptSha+'/chapters.vtt',captions:'/media/release/'+transcriptSha+'/captions.vtt'},videoClaim:{title:'Video source',scope:'lesson_step',claimKey:'step_presence',value:true,provenance:'Reviewed lesson media',dateBasis:'Review observation'},guideClaim:{sourceKind:'guide',sourceId:'guide',sourceVersion:'v1',title:'Written guide',scope:'lesson_step',claimKey:'step_presence',value:true,excerpt:'Reviewed guide excerpt.',provenance:'Reviewed written guide',sourceHref:'/guides/release/'+guideSha+'/reviewed.html#claim',sourceHash:guideSha,observedAt:'2026-11-24T01:00:00Z',dateBasis:'Review observation'},ui:{noticeTitle:'Reviewed lesson evidence',noticeBody:'Media, transcript and guide are version-bound to the reviewed content record.'}};
const profileBytes=Buffer.from(JSON.stringify(reviewedProfile,null,2)+'\n'),profileSha=sha(profileBytes);
const packCore={schema:1,contentVersion:'lesson-v1',intakeRecordHash:'4'.repeat(64),profileSha256:profileSha,catalogSha256:catalogSha,mediaSha256:mediaSha,transcriptSha256:transcriptSha,guideSha256:guideSha,publicPaths:{profile:'/content/content-profile.json',catalog:'/content/source-catalog.json',media:reviewedProfile.media.video,transcript:reviewedProfile.transcript.path,guide:reviewedProfile.guideClaim.sourceHref.split('#')[0]}};
const packRecord={...packCore,recordHash:sha(Buffer.from(JSON.stringify(packCore,null,2)+'\n')),limitation:'fixture'};
const contentEvidence={status:'reviewed_attested',contentVersion:'lesson-v1',profileSha256:profileSha,catalogSha256:catalogSha,mediaSha256:mediaSha,transcriptSha256:transcriptSha,guideSha256:guideSha,intakeRecordHash:'4'.repeat(64),rightsAttested:true,factualReviewAttested:true,evidenceRef:'private:content/lesson-v1'};
const cfg=()=>({schema:1,sourceRevision:'a'.repeat(40),publicOrigin:'https://sutra.example',peerOrigin:'https://guide.example',backend:'self_hosted',selfHostedGatewayUrl:'https://operator.example/v1/chat/completions',model:'provider/model-v1',
 liveEvidence:{status:'live_verified',backend:'self_hosted',model:'provider/model-v1',observedAt:'2026-11-24T01:00:00Z',runRecordHash:'b'.repeat(64),costReportHash:'c'.repeat(64),usageComplete:true,judgePathPassed:true},
 budgetEvidence:{approved:true,costMode:'operator_owned',spendCeilingUsd:0,judgingReserveRuns:50,evidenceRef:'private:budget/sutra-001'},contentEvidence,
 spec:{launchCommit:launchSpecCommit,compatibilityCommit:currentSpecCommit,compatibilityBlob:currentSpecBlob}});

async function fixture(){
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'sutra-release-src-'));
 for(const dir of ['agents/v/old','runtime','assets','content','media/release/'+mediaSha,'media/release/'+transcriptSha,'transcripts/release/'+transcriptSha,'guides/release/'+guideSha])await fsp.mkdir(path.join(root,dir),{recursive:true});
 const graph={metadata:{description:'x'},tools:[{name:'learner',function:{description:'x',parameters:{type:'object'}},instructions:'x',tools:[]}]};
 const names=['learner','source_learner','linked_learner'];
 const manifest={networks:names.map(name=>({name,front_man:'learner',hocon:'./v/old/'+name+'.network.json'})),allowed_peers:[],peer_policy:{mode:'closed'},deployment:{mode:'static'}};
 const links={version:1,networks:{learner:{},source_learner:{},linked_learner:{guide_peer:'https://old.invalid/agents/checklist'}}};
 await fsp.writeFile(path.join(root,'agents','agent-manifest.json'),JSON.stringify(manifest));await fsp.writeFile(path.join(root,'agents','links.json'),JSON.stringify(links));
 for(const name of names){await fsp.writeFile(path.join(root,'agents','v','old',name+'.network.json'),JSON.stringify(graph));await fsp.writeFile(path.join(root,'agents',name+'.network.json'),JSON.stringify(graph));}
 await fsp.writeFile(path.join(root,'runtime','sutra-runtime.js'),'export const runtime=true;\n');await fsp.writeFile(path.join(root,'index.html'),'<!doctype html><main id="app"></main>');await fsp.writeFile(path.join(root,'assets','app.js'),'console.log("app");');
 await fsp.writeFile(path.join(root,'content','content-profile.json'),profileBytes);await fsp.writeFile(path.join(root,'content','source-catalog.json'),catalogBytes);await fsp.writeFile(path.join(root,'content','content-pack-record.json'),JSON.stringify(packRecord,null,2)+'\n');
 await fsp.writeFile(path.join(root,'media','release',mediaSha,'lesson.mp4'),mediaBytes);await fsp.writeFile(path.join(root,'media','release',mediaSha,'poster.svg'),'<svg/>');await fsp.writeFile(path.join(root,'media','release',transcriptSha,'chapters.vtt'),'WEBVTT\n');await fsp.writeFile(path.join(root,'media','release',transcriptSha,'captions.vtt'),'WEBVTT\n');
 await fsp.writeFile(path.join(root,'transcripts','release',transcriptSha,'lesson.txt'),transcriptBytes);await fsp.writeFile(path.join(root,'guides','release',guideSha,'reviewed.html'),guideBytes);

 return root;
}
test('materializer creates separate release tree, removes stale dev graphs and writes hash-addressed release graphs',async()=>{
 const src=await fixture(),out=src+'-out';try{
  const r=await materializeReleaseCandidate({sourceDist:src,outputDir:out,config:cfg()});assert.equal(r.verified.valid,true);assert.match(r.record.runtimeSha256,/^[a-f0-9]{64}$/);assert.equal(r.record.stageOne.runtime,'/runtime/sutra-runtime.js');
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'agents','agent-manifest.json')));assert.equal(manifest.llm_router.publisher_funded,true);
  for(const entry of manifest.networks){assert.match(entry.hocon,/^\.\/release\/[a-f0-9]{64}\//);assert.equal(fs.existsSync(path.join(out,'agents',entry.name+'.network.json')),false);assert.equal(fs.existsSync(path.join(out,'agents','v','old',entry.name+'.network.json')),false);assert.equal(fs.existsSync(path.join(out,'agents',entry.hocon.slice(2))),true);}
  assert.equal(fs.readFileSync(path.join(out,'assets','app.js'),'utf8'),'console.log("app");');assert.ok(fs.existsSync(path.join(out,'agents','release-candidate.json')));
 }finally{await fsp.rm(src,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
});
test('candidate inventory excludes its own release record and is stable across repeated reads',async()=>{
 const src=await fixture(),out=src+'-out';try{
  await materializeReleaseCandidate({sourceDist:src,outputDir:out,config:cfg()});const a=await inventoryCandidate(out),b=await inventoryCandidate(out);
  assert.deepEqual(a,b);assert.equal(a.files.some(x=>x.path==='/agents/release-candidate.json'),false);assert.match(a.inventorySha256,/^[a-f0-9]{64}$/);
 }finally{await fsp.rm(src,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
});
test('source/output overlap, existing output and source symlink fail closed',async()=>{
 const src=await fixture();try{
  await assert.rejects(materializeReleaseCandidate({sourceDist:src,outputDir:path.join(src,'child'),config:cfg()}),/separate trees/);
  const existing=src+'-exists';await fsp.mkdir(existing);await assert.rejects(materializeReleaseCandidate({sourceDist:src,outputDir:existing,config:cfg()}),/already exists/);await fsp.rm(existing,{recursive:true});
  await fsp.symlink(path.join(src,'runtime','sutra-runtime.js'),path.join(src,'assets','linked.js'));
  await assert.rejects(materializeReleaseCandidate({sourceDist:src,outputDir:src+'-bad',config:cfg()}),/symlink/);
  await fsp.rm(src+'-bad',{recursive:true,force:true});
 }finally{await fsp.rm(src,{recursive:true,force:true});}
});

test('materializer refuses synthetic mode, content byte drift and comparison-scope drift even with valid provider/budget evidence',async()=>{
 for(const mutate of [
  async root=>{const p=structuredClone(reviewedProfile);p.mode='synthetic';await fsp.writeFile(path.join(root,'content','content-profile.json'),JSON.stringify(p,null,2)+'\n');},
  async root=>{await fsp.writeFile(path.join(root,'media','release',mediaSha,'lesson.mp4'),'altered media');},
  async root=>{const p=structuredClone(reviewedProfile);p.guideClaim.scope='other_scope';const bytes=Buffer.from(JSON.stringify(p,null,2)+'\n');await fsp.writeFile(path.join(root,'content','content-profile.json'),bytes);}
 ]){
  const src=await fixture(),out=src+'-reject';try{await mutate(src);await assert.rejects(materializeReleaseCandidate({sourceDist:src,outputDir:out,config:cfg()}));}finally{await fsp.rm(src,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
 }
});

test('release materializer rejects public transcript drift even when config and catalog still claim the reviewed hash',async()=>{
 const src=await fixture(),out=src+'-transcript-drift';try{
  await fsp.writeFile(path.join(src,'transcripts','release',transcriptSha,'lesson.txt'),'altered transcript');
  await assert.rejects(materializeReleaseCandidate({sourceDist:src,outputDir:out,config:cfg()}),/media\/transcript\/guide bytes/);
 }finally{await fsp.rm(src,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
});

test('release materializer rejects a missing, altered or differently bound content-pack record',async()=>{
 for(const mutate of [
  async root=>fsp.unlink(path.join(root,'content','content-pack-record.json')),
  async root=>{const p=structuredClone(packRecord);p.mediaSha256='f'.repeat(64);await fsp.writeFile(path.join(root,'content','content-pack-record.json'),JSON.stringify(p,null,2)+'\n');},
  async root=>{const p=structuredClone(packRecord);p.recordHash='f'.repeat(64);await fsp.writeFile(path.join(root,'content','content-pack-record.json'),JSON.stringify(p,null,2)+'\n');}
 ]){
  const src=await fixture(),out=src+'-pack-record-reject';try{await mutate(src);await assert.rejects(materializeReleaseCandidate({sourceDist:src,outputDir:out,config:cfg()}));}finally{await fsp.rm(src,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
 }
});
