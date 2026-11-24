import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareReleaseArtifacts,validatePreparedRelease,validateReleaseConfig} from './release.mjs';
import {validateContentProfile} from '../../packages/sutra-content-profile/index.js';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const MAX_FILE=300*1024*1024,MAX_TOTAL=500*1024*1024;
const posix=p=>p.split(path.sep).join('/');
const safeRelative=p=>typeof p==='string'&&p.length>0&&p.length<=512&&!p.startsWith('/')&&!p.includes('\\')&&!p.split('/').some(x=>!x||x==='.'||x==='..'||x.startsWith('.'));

async function regularFile(root,relative,max=MAX_FILE){
 if(!safeRelative(relative))throw Error('Unsafe candidate path: '+relative);
 const full=path.resolve(root,...relative.split('/')),prefix=path.resolve(root)+path.sep;
 if(!full.startsWith(prefix))throw Error('Candidate path escaped root.');
 let dir=root;for(const part of relative.split('/').slice(0,-1)){dir=path.join(dir,part);const parent=await fs.lstat(dir);if(!parent.isDirectory()||parent.isSymbolicLink())throw Error('Candidate input contains a symlink or non-directory ancestor.');}
 const stat=await fs.lstat(full);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>max)throw Error('Candidate input is not a bounded regular file: '+relative);
 return {full,bytes:await fs.readFile(full)};
}
async function walk(root,dir=root,out=[]){
 const entries=await fs.readdir(dir,{withFileTypes:true});
 for(const entry of entries){
  if(entry.name.startsWith('.'))throw Error('Hidden candidate entry is not permitted: '+entry.name);
  const full=path.join(dir,entry.name),stat=await fs.lstat(full);
  if(stat.isSymbolicLink())throw Error('Candidate source contains a symlink: '+posix(path.relative(root,full)));
  if(stat.isDirectory())await walk(root,full,out);
  else if(stat.isFile()){
   const rel=posix(path.relative(root,full));
   if(!safeRelative(rel)||stat.size<1||stat.size>MAX_FILE)throw Error('Invalid candidate source file: '+rel);
   out.push({rel,full,size:stat.size});
  }else throw Error('Unsupported candidate source entry.');
 }
 return out;
}
async function copyTree(source,destination,files){
 const total=files.reduce((s,f)=>s+f.size,0);
 if(total>MAX_TOTAL)throw Error('Candidate source exceeds aggregate size bound.');
 await fs.mkdir(destination,{recursive:false});
 for(const file of files){
  const target=path.join(destination,...file.rel.split('/'));
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.copyFile(file.full,target);
 }
 return files.map(x=>x.rel);
}
async function readJson(root,relative,max){
 const {bytes}=await regularFile(root,relative,max);
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 catch{throw Error('Invalid JSON input: '+relative);}
}
async function removeIfPresent(root,relative){
 if(!safeRelative(relative))throw Error('Unsafe removal path.');
 const full=path.resolve(root,...relative.split('/')),prefix=path.resolve(root)+path.sep;
 if(!full.startsWith(prefix))throw Error('Removal escaped candidate.');
 try{
  const stat=await fs.lstat(full);
  if(!stat.isFile()||stat.isSymbolicLink())throw Error('Refusing non-file removal.');
  await fs.unlink(full);
 }catch(error){if(error?.code!=='ENOENT')throw error;}
}
async function removeEmptyParents(root,relative){
 let dir=path.dirname(path.join(root,...relative.split('/')));
 while(dir.startsWith(path.resolve(root)+path.sep)){
  let names;try{names=await fs.readdir(dir);}catch{return;}
  if(names.length)return;
  await fs.rmdir(dir);dir=path.dirname(dir);
 }
}
export async function inventoryCandidate(root,{exclude=['agents/release-candidate.json']}={}){
 const files=(await walk(root)).filter(f=>!exclude.includes(f.rel)).sort((a,b)=>a.rel<b.rel?-1:a.rel>b.rel?1:0);
 const out=[];let total=0;
 for(const file of files){
  const bytes=await fs.readFile(file.full);total+=bytes.length;
  out.push({path:'/'+file.rel,bytes:bytes.length,sha256:digest(bytes)});
 }
 const core={schema:1,totalBytes:total,fileCount:out.length,files:out};
 return {...core,inventorySha256:digest(Buffer.from(JSON.stringify(core)))};
}

export async function materializeReleaseCandidate({sourceDist,outputDir,config}){
 const cfg=validateReleaseConfig(config);
 const requested=path.resolve(sourceDist),requestedStat=await fs.lstat(requested);
 if(!requestedStat.isDirectory()||requestedStat.isSymbolicLink())throw Error('Source dist must be a real directory, not a symlink.');
 const source=await fs.realpath(requested),requestedOutput=path.resolve(outputDir);
 const destination=path.join(await fs.realpath(path.dirname(requestedOutput)),path.basename(requestedOutput));
 try{await fs.lstat(destination);throw Error('Release output already exists; refuse overwrite.');}
 catch(error){if(error?.code!=='ENOENT')throw error;}
 const sourceStat=await fs.lstat(source);
 if(!sourceStat.isDirectory()||sourceStat.isSymbolicLink())throw Error('Source dist must be a real directory.');
 if(destination.startsWith(source+path.sep)||source.startsWith(destination+path.sep)||destination===source)throw Error('Source and output must be separate trees.');

 // Walk before any content read. Reject symlinks and special files throughout the input tree.
 const sourceFiles=await walk(source);
 const packRecord=await readJson(source,'content/content-pack-record.json',65536);
 if(!packRecord||packRecord.schema!==1||packRecord.contentVersion!==cfg.contentEvidence.contentVersion||!packRecord.publicPaths||typeof packRecord.recordHash!=='string'||!/^[a-f0-9]{64}$/.test(packRecord.recordHash))throw Error('Reviewed content pack record is missing or invalid.');
 const packCore={schema:packRecord.schema,contentVersion:packRecord.contentVersion,intakeRecordHash:packRecord.intakeRecordHash,profileSha256:packRecord.profileSha256,catalogSha256:packRecord.catalogSha256,mediaSha256:packRecord.mediaSha256,transcriptSha256:packRecord.transcriptSha256,guideSha256:packRecord.guideSha256,publicPaths:packRecord.publicPaths};
 if(digest(Buffer.from(JSON.stringify(packCore,null,2)+'\n'))!==packRecord.recordHash)throw Error('Reviewed content pack record hash mismatch.');
 const ev=cfg.contentEvidence;
 if(packRecord.intakeRecordHash!==ev.intakeRecordHash||packRecord.profileSha256!==ev.profileSha256||packRecord.catalogSha256!==ev.catalogSha256||packRecord.mediaSha256!==ev.mediaSha256||packRecord.transcriptSha256!==ev.transcriptSha256||packRecord.guideSha256!==ev.guideSha256)throw Error('Release config does not bind the reviewed content pack record.');
 const profileFile=await regularFile(source,'content/content-profile.json',65536);
 let profileDocument;try{profileDocument=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(profileFile.bytes));}catch{throw Error('Invalid release content profile JSON.');}
 if(profileDocument?.catalog?.path!=='./source-catalog.json')throw Error('Release content catalog path must be the fixed local source-catalog path.');
 const catalogFile=await regularFile(source,'content/source-catalog.json',262144);
 let catalogDocument;try{catalogDocument=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(catalogFile.bytes));}catch{throw Error('Invalid release source catalog JSON.');}
 const content=validateContentProfile(profileDocument,catalogDocument),evidence=cfg.contentEvidence;
 if(content.profile.mode!=='reviewed'||content.profile.contentVersion!==evidence.contentVersion||content.profile.guideClaim===null)throw Error('Release content profile is not reviewed.');
 const profileSha=digest(profileFile.bytes),catalogSha=digest(catalogFile.bytes);
 if(profileSha!==evidence.profileSha256||catalogSha!==evidence.catalogSha256||content.profile.catalog.sha256!==catalogSha)throw Error('Release content profile/catalog hash mismatch.');
 if(content.source.hash!==evidence.transcriptSha256||content.source.mediaHash!==evidence.mediaSha256)throw Error('Release transcript/media identity mismatch.');
 if(content.profile.videoClaim.scope!==content.profile.guideClaim.scope||content.profile.videoClaim.claimKey!==content.profile.guideClaim.claimKey)throw Error('Release comparison sources do not address the same declared question.');
 const mediaPath=content.profile.media.video.slice(1),transcriptPath=content.profile.transcript.path.slice(1),guidePath=content.profile.guideClaim.sourceHref.split('#')[0].slice(1);
 const mediaFile=await regularFile(source,mediaPath,300*1024*1024),transcriptFile=await regularFile(source,transcriptPath,10*1024*1024),guideFile=await regularFile(source,guidePath,10*1024*1024);
 if(digest(mediaFile.bytes)!==evidence.mediaSha256||digest(transcriptFile.bytes)!==evidence.transcriptSha256||digest(guideFile.bytes)!==evidence.guideSha256||
  content.profile.transcript.sha256!==evidence.transcriptSha256||content.profile.guideClaim.sourceHash!==evidence.guideSha256)throw Error('Release media/transcript/guide bytes do not match reviewed evidence.');
 if(/synthetic|fixture|pending/i.test(content.profile.ui.noticeTitle+' '+content.profile.ui.noticeBody))throw Error('Reviewed release content still carries development-only UI claims.');

 const manifest=await readJson(source,'agents/agent-manifest.json',65536);
 const links=await readJson(source,'agents/links.json',65536),graphs={},stale=new Set();
 for(const entry of manifest.networks??[]){
  if(typeof entry?.name!=='string'||typeof entry?.hocon!=='string')throw Error('Invalid development manifest network.');
  const graphUrl=new URL(entry.hocon,'https://candidate.invalid/agents/');
  if(!/^\.\/v\/[A-Za-z0-9_-]+\/[A-Za-z][A-Za-z0-9_]{0,59}\.network\.json$/.test(entry.hocon)||graphUrl.origin!=='https://candidate.invalid'||graphUrl.search||graphUrl.hash||graphUrl.pathname!=='/agents/'+entry.hocon.slice(2))throw Error('Unsafe development graph URL.');
  const relative=graphUrl.pathname.slice(1);
  graphs[entry.name]=await readJson(source,relative,128*1024);stale.add(relative);
  const alias='agents/'+entry.name+'.network.json';
  try{await regularFile(source,alias,128*1024);stale.add(alias);}
  catch(error){if(error?.code!=='ENOENT')throw error;}
 }
 const prepared=prepareReleaseArtifacts({manifest,links,graphs,config:cfg});
 // Only known publication paths and compiled browser assets may enter a candidate.
 // Drop every historical graph, development-only inventory and old synthetic lesson file;
 // the candidate inventory is freshly computed after writing the release graphs.
 const required=new Set(['index.html','_headers','runtime/sutra-runtime.js','agents/agent-manifest.json','agents/links.json','content/content-profile.json','content/source-catalog.json','content/content-pack-record.json',mediaPath,transcriptPath,guidePath,content.profile.media.poster.slice(1),content.profile.media.chapters.slice(1),content.profile.media.captions.slice(1)]);
 const devOnly=new Set(['agents/artifact-inventory.json','guides/synthetic-comparison-guide.html','media/timing-captions.vtt','media/timing-chapters.vtt','media/timing-fixture.mp4','media/timing-poster.svg','media/timing-source.json','transcripts/synthetic-timing.txt']);
 const approved=[];
 for(const file of sourceFiles){const rel=file.rel;
  if(stale.has(rel)||devOnly.has(rel)||/^agents\/v\/[A-Za-z0-9_-]+\/[A-Za-z][A-Za-z0-9_]{0,59}\.network\.json$/.test(rel)||/^agents\/[A-Za-z][A-Za-z0-9_]{0,59}\.network\.json$/.test(rel))continue;
  if(!required.has(rel)&&!/^assets\/[A-Za-z0-9_.-]+\.(?:js|css|woff2?|ttf)$/.test(rel))throw Error('Unexpected candidate input path: '+rel);
  approved.push(file);
 }
 await copyTree(source,destination,approved);

 await fs.writeFile(path.join(destination,'agents','agent-manifest.json'),JSON.stringify(prepared.manifest,null,2)+'\n');
 await fs.writeFile(path.join(destination,'agents','links.json'),JSON.stringify(prepared.links,null,2)+'\n');
 for(const value of Object.values(prepared.graphs)){
  const relative='agents/'+value.path.replace(/^\.\//,'');
  if(!safeRelative(relative))throw Error('Unsafe generated graph path.');
  const target=path.join(destination,...relative.split('/'));
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,value.bytes);
 }
 // Build input is assumed stable and trusted while materializing; path controls do not scan arbitrary JS for embedded secrets.
 const runtime=await regularFile(destination,'runtime/sutra-runtime.js',2*1024*1024);
 const index=await regularFile(destination,'index.html',2*1024*1024);
 const verified=validatePreparedRelease(prepared),inventory=await inventoryCandidate(destination);
 const record={...prepared.releaseRecord,contentPackRecordHash:packRecord.recordHash,runtimeSha256:digest(runtime.bytes),indexSha256:digest(index.bytes),candidateInventorySha256:inventory.inventorySha256,content:{mode:content.profile.mode,contentVersion:content.profile.contentVersion,profileSha256:profileSha,catalogSha256:catalogSha,mediaSha256:evidence.mediaSha256,transcriptSha256:evidence.transcriptSha256,guideSha256:evidence.guideSha256},
  stageOne:{interactionUi:'/index.html',runtime:'/runtime/sutra-runtime.js',manifest:'/agents/agent-manifest.json',links:'/agents/links.json',router:prepared.manifest.llm_router.base_url,networkCount:prepared.manifest.networks.length}};
 const recordCore=structuredClone(record);delete recordCore.recordSha256;
 record.recordSha256=digest(Buffer.from(JSON.stringify(recordCore,null,2)+'\n'));
 await fs.writeFile(path.join(destination,'agents','release-candidate.json'),JSON.stringify(record,null,2)+'\n');
 return {outputDir:destination,verified,record,inventory};
}
