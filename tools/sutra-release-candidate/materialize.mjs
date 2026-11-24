import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareReleaseArtifacts,validatePreparedRelease,validateReleaseConfig} from './release.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const MAX_FILE=300*1024*1024,MAX_TOTAL=500*1024*1024;
const posix=p=>p.split(path.sep).join('/');
const safeRelative=p=>typeof p==='string'&&p.length>0&&p.length<=512&&!p.startsWith('/')&&!p.includes('\\')&&!p.split('/').some(x=>!x||x==='.'||x==='..'||x.startsWith('.'));

async function regularFile(root,relative,max=MAX_FILE){
 if(!safeRelative(relative))throw Error('Unsafe candidate path: '+relative);
 const full=path.resolve(root,...relative.split('/')),prefix=path.resolve(root)+path.sep;
 if(!full.startsWith(prefix))throw Error('Candidate path escaped root.');
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
async function copyTree(source,destination){
 const files=await walk(source),total=files.reduce((s,f)=>s+f.size,0);
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
 const files=(await walk(root)).filter(f=>!exclude.includes(f.rel)).sort((a,b)=>a.rel.localeCompare(b.rel));
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
 const source=await fs.realpath(path.resolve(sourceDist)),destination=path.resolve(outputDir);
 try{await fs.lstat(destination);throw Error('Release output already exists; refuse overwrite.');}
 catch(error){if(error?.code!=='ENOENT')throw error;}
 const sourceStat=await fs.lstat(source);
 if(!sourceStat.isDirectory()||sourceStat.isSymbolicLink())throw Error('Source dist must be a real directory.');
 if(destination.startsWith(source+path.sep)||source.startsWith(destination+path.sep)||destination===source)throw Error('Source and output must be separate trees.');

 const manifest=await readJson(source,'agents/agent-manifest.json',65536);
 const links=await readJson(source,'agents/links.json',65536),graphs={},stale=new Set();
 for(const entry of manifest.networks??[]){
  if(typeof entry?.name!=='string'||typeof entry?.hocon!=='string')throw Error('Invalid development manifest network.');
  const graphUrl=new URL(entry.hocon,'https://candidate.invalid/agents/');
  if(graphUrl.origin!=='https://candidate.invalid'||graphUrl.search||graphUrl.hash||!graphUrl.pathname.startsWith('/agents/'))throw Error('Unsafe development graph URL.');
  const relative=graphUrl.pathname.slice(1);
  graphs[entry.name]=await readJson(source,relative,128*1024);stale.add(relative);
  const alias='agents/'+entry.name+'.network.json';
  try{await regularFile(source,alias,128*1024);stale.add(alias);}
  catch(error){if(error?.code!=='ENOENT')throw error;}
 }
 const prepared=prepareReleaseArtifacts({manifest,links,graphs,config:cfg});
 await copyTree(source,destination);
 for(const relative of stale){await removeIfPresent(destination,relative);await removeEmptyParents(destination,relative);}

 await fs.writeFile(path.join(destination,'agents','agent-manifest.json'),JSON.stringify(prepared.manifest,null,2)+'\n');
 await fs.writeFile(path.join(destination,'agents','links.json'),JSON.stringify(prepared.links,null,2)+'\n');
 for(const value of Object.values(prepared.graphs)){
  const relative='agents/'+value.path.replace(/^\.\//,'');
  if(!safeRelative(relative))throw Error('Unsafe generated graph path.');
  const target=path.join(destination,...relative.split('/'));
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,value.bytes);
 }
 const runtime=await regularFile(destination,'runtime/sutra-runtime.js',2*1024*1024);
 const index=await regularFile(destination,'index.html',2*1024*1024);
 const verified=validatePreparedRelease(prepared),inventory=await inventoryCandidate(destination);
 const record={...prepared.releaseRecord,runtimeSha256:digest(runtime.bytes),indexSha256:digest(index.bytes),candidateInventorySha256:inventory.inventorySha256,
  stageOne:{interactionUi:'/index.html',runtime:'/runtime/sutra-runtime.js',manifest:'/agents/agent-manifest.json',links:'/agents/links.json',router:prepared.manifest.llm_router.base_url,networkCount:prepared.manifest.networks.length}};
 const recordCore=structuredClone(record);delete recordCore.recordSha256;
 record.recordSha256=digest(Buffer.from(JSON.stringify(recordCore,null,2)+'\n'));
 await fs.writeFile(path.join(destination,'agents','release-candidate.json'),JSON.stringify(record,null,2)+'\n');
 return {outputDir:destination,verified,record,inventory};
}
