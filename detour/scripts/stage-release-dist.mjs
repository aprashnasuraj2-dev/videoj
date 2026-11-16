import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const source=git('rev-parse','HEAD');
const branch=`detour-dist-${source.slice(0,12)}`;
const root='published-dist';
const manifestName='detour-release-manifest.json';
const list=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const path=join(dir,entry.name);
  return entry.isDirectory()?list(path):[path];
});
if(!existsSync('dist/index.html')||!existsSync('dist/showcase/detour-showcase-v1.mp4')) {
  throw new Error('Successful release build is missing required DETOUR outputs');
}
const files=list('dist').sort().map(path=>({
  key:relative('dist',path).replaceAll('\\\\','/'),
  sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),
  bytes:statSync(path).size,
}));
const manifest={
  project:'DETOUR',
  source_sha:source,
  build_run_id:process.env.DETOUR_BUILD_RUN_ID ?? process.env.GITHUB_RUN_ID,
  artifact:`detour-production-dist-${source}`,
  file_count:files.length,
  files,
};
const existing=git('ls-remote','--heads','origin',`refs/heads/${branch}`);
if(existing){
  git('fetch','--no-tags','origin',`refs/heads/${branch}`);
  const previous=JSON.parse(git('show',`FETCH_HEAD:${manifestName}`));
  if(previous.source_sha!==source||JSON.stringify(previous.files)!==JSON.stringify(files)) {
    throw new Error(`Existing ${branch} does not contain the same successful bytes`);
  }
  console.log(`Immutable DETOUR dist already staged at ${branch}`);
  process.exit(0);
}
rmSync(root,{recursive:true,force:true});
cpSync('dist',root,{recursive:true});
writeFileSync(manifestName,JSON.stringify(manifest,null,2)+'\n');
git('config','user.name','github-actions[bot]');
git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com');
git('switch','-c',branch);
git('add','-f',root,manifestName);
git('commit','-m',`build: immutable DETOUR dist for ${source}`);
git('push','origin',`HEAD:refs/heads/${branch}`);
console.log(`Staged ${files.length} files on ${branch}`);
