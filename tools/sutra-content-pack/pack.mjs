import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assessContentManifest} from '../sutra-content-intake/intake.mjs';
import {validateContentProfile} from '../../packages/sutra-content-profile/index.js';

const ID=/^[A-Za-z][A-Za-z0-9._:-]{0,127}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys)=>plain(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const safePath=v=>typeof v==='string'&&v.length<=240&&!v.startsWith('/')&&!v.includes('\\')&&!v.split('/').some(x=>!x||x==='.'||x==='..'||x.startsWith('.'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>JSON.stringify(value,null,2)+'\n';
const html=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const vttText=s=>s.replace(/\r?\n/g,' ').replace(/-->/g,'→').trim();
const stamp=seconds=>{
 const ms=Math.round(seconds*1000),h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),sec=Math.floor(ms%60000/1000),x=ms%1000;
 return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0')+'.'+String(x).padStart(3,'0');
};
async function readRegular(root,relative,max){
 if(!safePath(relative))throw Error('Unsafe source path: '+relative);
 const full=path.resolve(root,...relative.split('/')),prefix=path.resolve(root)+path.sep;
 if(!full.startsWith(prefix))throw Error('Source path escaped root.');
 const stat=await fs.lstat(full);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>max)throw Error('Invalid source file: '+relative);
 return {full,bytes:await fs.readFile(full),size:stat.size};
}
function validateClaim(c,guide){
 const keys=guide?['title','scope','claimKey','value','excerpt','provenance','anchor','dateBasis']:['title','scope','claimKey','value','provenance','dateBasis'];
 if(!exact(c,keys)||typeof c.title!=='string'||!c.title.trim()||c.title.length>120||typeof c.scope!=='string'||!c.scope.trim()||c.scope.length>160||
  !ID.test(c.claimKey||'')||!['string','number','boolean'].includes(typeof c.value)||typeof c.provenance!=='string'||!c.provenance.trim()||c.provenance.length>240||
  typeof c.dateBasis!=='string'||!c.dateBasis.trim()||c.dateBasis.length>120)throw Error('Invalid claim metadata.');
 if(guide&&(typeof c.excerpt!=='string'||!c.excerpt.trim()||c.excerpt.length>1200||!ID.test(c.anchor||'')))throw Error('Invalid guide claim.');
}
function validateSemantic(meta){
 const keys=['schema','contentVersion','title','observedAt','sourceId','sourceVersion','featuredCueId','cues','videoClaim','guideClaim','ui'];
 if(!exact(meta,keys)||meta.schema!==1||!ID.test(meta.contentVersion||'')||typeof meta.title!=='string'||!meta.title.trim()||meta.title.length>160||!ISO.test(meta.observedAt)||
  !ID.test(meta.sourceId||'')||typeof meta.sourceVersion!=='string'||!meta.sourceVersion.trim()||meta.sourceVersion.length>100||!ID.test(meta.featuredCueId||'')||
  !Array.isArray(meta.cues)||meta.cues.length<1||meta.cues.length>500)throw Error('Invalid semantic metadata.');
 const ids=new Set();
 for(const cue of meta.cues){
  if(!exact(cue,['id','start','end','text'])||!ID.test(cue.id||'')||ids.has(cue.id)||!Number.isFinite(cue.start)||!Number.isFinite(cue.end)||cue.start<0||cue.end<=cue.start||
   typeof cue.text!=='string'||!cue.text.trim()||cue.text.length>2000)throw Error('Invalid cue metadata.');
  ids.add(cue.id);
 }
 if(!ids.has(meta.featuredCueId))throw Error('Featured cue missing.');
 validateClaim(meta.videoClaim,false);validateClaim(meta.guideClaim,true);
 if(meta.videoClaim.scope!==meta.guideClaim.scope||meta.videoClaim.claimKey!==meta.guideClaim.claimKey)throw Error('Video and guide claims must address the same declared question.');
 if(!exact(meta.ui,['noticeTitle','noticeBody'])||typeof meta.ui.noticeTitle!=='string'||!meta.ui.noticeTitle.trim()||typeof meta.ui.noticeBody!=='string'||!meta.ui.noticeBody.trim()||
  /synthetic|fixture|pending/i.test(meta.ui.noticeTitle+' '+meta.ui.noticeBody))throw Error('Reviewed UI copy contains development-only claims.');
 return structuredClone(meta);
}
function makeVtt(cues,suffix){
 let out='WEBVTT\n\n';
 for(const cue of cues)out+=cue.id+suffix+'\n'+stamp(cue.start)+' --> '+stamp(cue.end)+'\n'+vttText(cue.text)+'\n\n';
 return out;
}
function makePoster(title){
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="'+html(title)+'"><rect width="1280" height="720" fill="#111"/><text x="80" y="360" fill="#fff" font-family="system-ui,sans-serif" font-size="54">'+html(title)+'</text><text x="80" y="430" fill="#ccc" font-family="system-ui,sans-serif" font-size="28">Reviewed lesson media</text></svg>';
}
async function write(root,relative,bytes){
 if(!safePath(relative))throw Error('Unsafe output path.');
 const target=path.join(root,...relative.split('/'));await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes,{flag:'wx'});
}
export async function buildContentPack({manifest,semantic,contentRoot,outputDir}){
 const meta=validateSemantic(semantic),root=await fs.realpath(path.resolve(contentRoot)),out=path.resolve(outputDir);
 try{await fs.lstat(out);throw Error('Output already exists; refuse overwrite.');}catch(error){if(error?.code!=='ENOENT')throw error;}
 const media=await readRegular(root,manifest.assets?.media?.path,250*1024*1024);
 const transcript=await readRegular(root,manifest.assets?.transcript?.path,10*1024*1024);
 const guide=await readRegular(root,manifest.assets?.guide?.path,10*1024*1024);
 const observed={media:{path:manifest.assets.media.path,sha256:digest(media.bytes),bytes:media.size},transcript:{path:manifest.assets.transcript.path,sha256:digest(transcript.bytes),bytes:transcript.size},guide:{path:manifest.assets.guide.path,sha256:digest(guide.bytes),bytes:guide.size}};
 const intake=assessContentManifest(manifest,{observedFiles:observed});
 if(!intake.structuralIntakeComplete||intake.contentVersion!==meta.contentVersion)throw Error('Content intake is not structurally complete for this version.');
 if(meta.cues.some(c=>c.end>manifest.lesson.durationSeconds))throw Error('Cue timing exceeds declared lesson duration.');
 let transcriptText,guideText;
 try{transcriptText=new TextDecoder('utf-8',{fatal:true}).decode(transcript.bytes);guideText=new TextDecoder('utf-8',{fatal:true}).decode(guide.bytes);}catch{throw Error('Transcript and guide must be UTF-8.');}
 for(const cue of meta.cues)if(!transcriptText.includes(cue.text))throw Error('Transcript does not contain exact cue text: '+cue.id);
 if(!guideText.includes('id="'+meta.guideClaim.anchor+'"')&&!guideText.includes("id='"+meta.guideClaim.anchor+"'"))throw Error('Guide anchor missing.');
 if(!guideText.includes(meta.guideClaim.excerpt))throw Error('Guide excerpt missing.');
 const ext=path.extname(manifest.assets.media.path).toLowerCase();if(ext!=='.mp4'&&ext!=='.webm')throw Error('Reviewed media must be MP4 or WebM.');
 const guideName=path.basename(manifest.assets.guide.path);if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.html$/i.test(guideName))throw Error('Reviewed guide must be a safe HTML file.');
 const mediaBase='media/release/'+observed.media.sha256,transcriptBase='transcripts/release/'+observed.transcript.sha256,guideBase='guides/release/'+observed.guide.sha256;
 const sourceCatalog={schema:1,contentVersion:meta.contentVersion,sources:[{id:meta.sourceId,version:meta.sourceVersion,hash:observed.transcript.sha256,mediaHash:observed.media.sha256,duration:manifest.lesson.durationSeconds,cues:meta.cues}]};
 const catalogBytes=Buffer.from(canonical(sourceCatalog)),catalogSha=digest(catalogBytes);
 const profile={schema:1,mode:'reviewed',contentVersion:meta.contentVersion,title:meta.title,observedAt:meta.observedAt,primarySourceId:meta.sourceId,featuredCueId:meta.featuredCueId,
  catalog:{path:'./source-catalog.json',sha256:catalogSha},transcript:{path:'/'+transcriptBase+'/lesson.txt',sha256:observed.transcript.sha256},
  media:{video:'/'+mediaBase+'/lesson'+ext,poster:'/'+mediaBase+'/poster.svg',chapters:'/'+transcriptBase+'/chapters.vtt',captions:'/'+transcriptBase+'/captions.vtt'},
  videoClaim:meta.videoClaim,guideClaim:{sourceKind:'guide',sourceId:'reviewed-guide',sourceVersion:meta.contentVersion,title:meta.guideClaim.title,scope:meta.guideClaim.scope,claimKey:meta.guideClaim.claimKey,value:meta.guideClaim.value,excerpt:meta.guideClaim.excerpt,provenance:meta.guideClaim.provenance,sourceHref:'/'+guideBase+'/'+guideName+'#'+meta.guideClaim.anchor,sourceHash:observed.guide.sha256,observedAt:meta.observedAt,dateBasis:meta.guideClaim.dateBasis},ui:meta.ui};
 validateContentProfile(profile,sourceCatalog);
 const profileBytes=Buffer.from(canonical(profile)),profileSha=digest(profileBytes);
 await fs.mkdir(out,{recursive:false});
 await write(out,'content/content-profile.json',profileBytes);await write(out,'content/source-catalog.json',catalogBytes);
 await write(out,mediaBase+'/lesson'+ext,media.bytes);await write(out,mediaBase+'/poster.svg',makePoster(meta.title));
 await write(out,transcriptBase+'/lesson.txt',transcript.bytes);await write(out,transcriptBase+'/chapters.vtt',makeVtt(meta.cues,'-chapter'));await write(out,transcriptBase+'/captions.vtt',makeVtt(meta.cues,''));
 await write(out,guideBase+'/'+guideName,guide.bytes);
 const core={schema:1,contentVersion:meta.contentVersion,intakeRecordHash:intake.recordHash,profileSha256:profileSha,catalogSha256:catalogSha,mediaSha256:observed.media.sha256,transcriptSha256:observed.transcript.sha256,guideSha256:observed.guide.sha256,
  publicPaths:{profile:'/content/content-profile.json',catalog:'/content/source-catalog.json',media:profile.media.video,transcript:profile.transcript.path,guide:profile.guideClaim.sourceHref.split('#')[0]}};
 const record={...core,recordHash:digest(Buffer.from(canonical(core))),limitation:'Byte packaging is verified. Legal rights, reviewer competence, cue timing correctness, semantic truth and public deployment remain human/external evidence.'};
 await write(out,'content/content-pack-record.json',canonical(record));
 return {profile,sourceCatalog,record};
}
