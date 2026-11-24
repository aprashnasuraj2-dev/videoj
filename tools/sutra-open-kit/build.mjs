import { mkdir, cp, copyFile, readFile, writeFile, readdir, lstat, rm, realpath } from 'node:fs/promises';
import { resolve, dirname, join, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createStarter } from '../sutra-starter/create.mjs';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const forbiddenNames=/(?:^|\/)(?:\.env(?:\.[^/]*)?|\.npmrc|\.git|node_modules|credentials\.json|secrets\.json)(?:\/|$)|\.(?:pem|key|p12|pfx)$/i;
const forbiddenContent=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bgithub_pat_[A-Za-z0-9_]{30,}\b/,/\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/,/\bAKIA[A-Z0-9]{16}\b/];
export function scan(path,bytes){
 if(forbiddenNames.test(path)||bytes.length>2*1024*1024)throw Error('Unsafe candidate path or size: '+path);
 const value=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 if(value.includes('\0')||forbiddenContent.some(re=>re.test(value)))throw Error('Candidate content rejected: '+path);
}
export async function inventory(root,{excludeManifest=false}={}){
 const files=[];
 async function walk(dir){
  for(const name of (await readdir(dir)).sort()){
   const full=join(dir,name),path=relative(root,full).split(sep).join('/');
   if(excludeManifest&&path==='MANIFEST.json')continue;
   const stat=await lstat(full);
   if(stat.isSymbolicLink())throw Error('Symlink in candidate: '+path);
   if(stat.isDirectory()){if(forbiddenNames.test(path))throw Error('Forbidden directory: '+path);await walk(full);}
   else if(stat.isFile()){const bytes=await readFile(full);scan(path,bytes);files.push({path,bytes:bytes.length,sha256:hash(bytes)});}
   else throw Error('Unexpected entry: '+path);
  }
 }
 await walk(root);return files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
export async function verify(root){
 const manifest=JSON.parse(await readFile(join(root,'MANIFEST.json'),'utf8'));
 if(manifest.schema!==1||!/^open-kit-dev-[a-f0-9]{40}$/.test(manifest.candidate)||manifest.candidate!=='open-kit-dev-'+manifest.sourceRevision||manifest.publication!=='development-only')throw Error('Invalid manifest');
 const actual=await inventory(root,{excludeManifest:true});
 if(JSON.stringify(actual)!==JSON.stringify(manifest.files))throw Error('Candidate inventory mismatch');
 return manifest;
}
export async function build(destination){
 const out=resolve(destination), parent=await realpath(dirname(out)), target=join(parent,relative(dirname(out),out));
 const rel=relative(repo,target);
 if(!rel||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel)))throw Error('Output must be outside source repository');
 const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
 if(!/^[a-f0-9]{40}$/.test(revision))throw Error('Invalid source revision');
 const dirty=execFileSync('git',['status','--porcelain','--untracked-files=no','--','tools/sutra-starter','tools/sutra-open-kit','packages/sutra-runtime','packages/sutra-actions','packages/sutra-consent','packages/sutra-source-tools','packages/sutra-evidence','LICENSE'],{cwd:repo,encoding:'utf8'}).trim();
 if(dirty)throw Error('Tracked candidate inputs differ from recorded source revision');
 await mkdir(target);
 try{
  const starter=await createStarter(join(target,'publisher-starter'));
  for(const [source,name] of [['sutra-evidence','evidence-validator'],['sutra-consent','consent-inspector']]){
   const dir=join(target,name);await cp(join(starter,'packages',source),dir,{recursive:true,errorOnExist:true,force:false});
   await copyFile(join(repo,'LICENSE'),join(dir,'LICENSE'));
  }
  await copyFile(join(repo,'LICENSE'),join(target,'LICENSE'));
  await copyFile(join(repo,'tools/sutra-open-kit/README.md'),join(target,'README.md'));
  const artifacts=[['evidence-validator','@sutra/evidence','index.js','cli.mjs'],['consent-inspector','@sutra/consent','index.js','examples/'],['publisher-starter','sutra-agentic-site-starter','app.js','starter.test.mjs']];
  const metadata=[];
  for(const [directory,name,entry,example] of artifacts){
   const pkg=JSON.parse(await readFile(join(target,directory,'package.json'),'utf8'));
   if(pkg.name!==name||pkg.license!=='Apache-2.0')throw Error('Unexpected package identity');
   metadata.push({directory,name,sourceVersion:pkg.version,entry,example,license:'Apache-2.0',candidateVersion:pkg.version+'+git.'+revision});
  }
  const manifest={schema:1,candidate:'open-kit-dev-'+revision,sourceRevision:revision,publication:'development-only',artifacts:metadata,files:await inventory(target)};
  await writeFile(join(target,'MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
  await verify(target);return manifest;
 }catch(error){await rm(target,{recursive:true,force:true});throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [command,path]=process.argv.slice(2);
 try{if(!path||!['build','verify'].includes(command))throw Error('Usage: node build.mjs build|verify DIRECTORY');const m=await (command==='build'?build(path):verify(path));console.log(m.candidate+' verified '+m.files.length+' files');}catch(error){console.error(error.message);process.exitCode=1;}
}
