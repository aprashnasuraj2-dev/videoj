import { mkdir, cp, copyFile, writeFile, lstat, readdir, rm, realpath } from 'node:fs/promises';
import { resolve, dirname, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const packages = ['sutra-runtime','sutra-consent','sutra-actions','sutra-source-tools','sutra-evidence'];
const excluded = new Set(['node_modules','dist','coverage','test','tests','.git','.env','.npmrc']);
async function copySafe(src,dst) {
  const stat=await lstat(src);
  if(stat.isSymbolicLink()) throw Error('Symlink refused: '+src);
  if(stat.isDirectory()) {
    await mkdir(dst,{recursive:true});
    for(const name of (await readdir(src)).sort()){
      if(excluded.has(name)||name.startsWith('.')||/\.(?:pem|key|p12|pfx)$/i.test(name))continue;
      await copySafe(join(src,name),join(dst,name));
    }
  } else if(stat.isFile()) await copyFile(src,dst);
  else throw Error('Unexpected file type');
}
export async function createStarter(destination) {
  if(typeof destination!=='string'||!destination.trim())throw Error('A new output directory is required');
  const out=resolve(destination), parent=await realpath(dirname(out)), target=join(parent,relative(dirname(out),out));
  const rel=relative(repo,target);
  if(!rel||(!rel.startsWith('..'+(process.platform==='win32'?'\\':'/'))&&rel!=='..'&&!isAbsolute(rel)))throw Error('Output must be outside the source repository');
  await mkdir(target); // exclusive: never overwrite an existing directory
  try {
    const templates=join(repo,'tools/sutra-starter/template');
    await copySafe(templates,target);
    await copyFile(join(repo,'LICENSE'),join(target,'LICENSE'));
    for(const name of packages)await copySafe(join(repo,'packages',name),join(target,'packages',name));
    await mkdir(join(target,'public','agents'),{recursive:true});
    await copyFile(join(repo,'packages/sutra-runtime/examples/learner.network.json'),join(target,'public/agents/learner.network.json'));
    await writeFile(join(target,'public/agents/agent-manifest.json'),JSON.stringify({networks:[{name:'learner',front_man:'learner',hocon:'./learner.network.json',description:'Synthetic two-agent SUTRA starter'}],allowed_peers:[],peer_policy:{mode:'closed'}},null,2)+'\n');
    await writeFile(join(target,'public/agents/links.json'),JSON.stringify({version:1,networks:{learner:{}}},null,2)+'\n');
    return target;
  } catch(error) { await rm(target,{recursive:true,force:true});throw error; }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3){console.error('Usage: node tools/sutra-starter/create.mjs NEW_DIRECTORY');process.exitCode=1;}
  else try{console.log(await createStarter(process.argv[2]));}catch(error){console.error(error.message);process.exitCode=1;}
}
