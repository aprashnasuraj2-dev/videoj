import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const hashedAsset=/^[^/]+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9.]+$/;
const graphVersion=/^[a-f0-9]{40}$/;

function filesUnder(root){
 if(!fs.existsSync(root))return [];
 const out=[];
 const walk=(dir)=>{
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const full=path.join(dir,entry.name);
   if(entry.isSymbolicLink())throw new Error('Symlinks are not allowed in retained rollout assets.');
   if(entry.isDirectory())walk(full);
   else if(entry.isFile())out.push(full);
  }
 };
 walk(root);return out;
}
function gitBlobSha(bytes){
 return createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
}
function sameBytes(a,b){
 const left=fs.readFileSync(a),right=fs.readFileSync(b);
 return left.length===right.length&&left.equals(right);
}
function immutableCandidates(previousDir){
 const rows=[];
 for(const file of filesUnder(path.join(previousDir,'assets'))){
  const rel=path.relative(previousDir,file).split(path.sep).join('/');
  const name=path.basename(file);
  if(!hashedAsset.test(name))throw new Error(`Refusing unversioned previous build asset: ${rel}`);
  rows.push({source:file,relative:rel,kind:'hashed_asset'});
 }
 for(const file of filesUnder(path.join(previousDir,'agents','v'))){
  const rel=path.relative(previousDir,file).split(path.sep).join('/');
  const parts=rel.split('/');
  if(parts.length!==4||parts[0]!=='agents'||parts[1]!=='v'||!graphVersion.test(parts[2])||!/^[-A-Za-z0-9_]+\.network\.json$/.test(parts[3]))
   throw new Error(`Refusing malformed versioned graph path: ${rel}`);
  const bytes=fs.readFileSync(file);
  if(gitBlobSha(bytes)!==parts[2])throw new Error(`Versioned graph hash does not match bytes: ${rel}`);
  rows.push({source:file,relative:rel,kind:'versioned_graph'});
 }
 return rows;
}

export function retainRolloutAssets({previousDir,nextDir}={}){
 if(typeof previousDir!=='string'||typeof nextDir!=='string'||!previousDir||!nextDir)throw new TypeError('previousDir and nextDir are required.');
 const previous=path.resolve(previousDir),next=path.resolve(nextDir);
 if(previous===next)throw new Error('Previous and next build directories must differ.');
 if(!fs.existsSync(previous)||!fs.statSync(previous).isDirectory())throw new Error('Previous build directory is unavailable.');
 if(!fs.existsSync(next)||!fs.statSync(next).isDirectory())throw new Error('Next build directory is unavailable.');
 const copied=[],reused=[];
 for(const item of immutableCandidates(previous)){
  const target=path.join(next,...item.relative.split('/'));
  if(fs.existsSync(target)){
   if(!fs.statSync(target).isFile()||!sameBytes(item.source,target))throw new Error(`Immutable rollout collision: ${item.relative}`);
   reused.push(item.relative);continue;
  }
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(item.source,target);
  copied.push(item.relative);
 }
 return Object.freeze({copied:Object.freeze(copied),reused:Object.freeze(reused)});
}

function cliArgs(argv){
 const out={};
 for(let i=0;i<argv.length;i++){
  if(argv[i]==='--previous')out.previousDir=argv[++i];
  else if(argv[i]==='--next')out.nextDir=argv[++i];
  else throw new Error(`Unknown rollout-retention argument: ${argv[i]}`);
 }
 return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const result=retainRolloutAssets(cliArgs(process.argv.slice(2)));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
 }catch(error){
  process.stderr.write(String(error?.message??error)+'\n');process.exitCode=1;
 }
}
