import {spawnSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {evaluateNpmAudit,reviewedVitePatch} from './npm-advisory-gate.js';
import {inspectNpmLock} from './release-ci-evidence.js';
const digest=b=>createHash('sha256').update(b).digest('hex');
const output=resolve(process.argv[2]??'sutra-dependency-audit');
await mkdir(output,{recursive:true});
// npm rejects identical user and global config paths (both /dev/null).
await writeFile(resolve(output,'empty-global-npmrc'),'');
const revision=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});if(revision.status!==0)throw Error('REVISION');
const results=[];
for(const dir of ['apps/sutra-v2','apps/sutra','apps/sutra-peer']){
 const lockPath=resolve(dir,'package-lock.json'),before=await readFile(lockPath),lock=JSON.parse(before),metadata=inspectNpmLock(lock);
 const base={directory:dir,lockSha256:digest(before),entries:metadata.entries.length,metadataPass:metadata.metadataPass};
 if(!metadata.metadataPass){results.push({...base,eligible:false,reason:'LOCK_METADATA'});continue;}
 // A known direct advisory must not disappear merely because the registry has not ingested it.
 const vite=lock.packages['node_modules/vite'];if(vite&&!reviewedVitePatch(vite.version)){results.push({...base,eligible:false,reason:'VITE_PATCH_FLOOR_REVIEW',version:vite.version});continue;}
 if(metadata.entries.length===0){results.push({...base,eligible:true,reason:'EMPTY_LOCK_NO_NPM_DEPENDENCIES'});continue;}
 const r=spawnSync('npm',['audit','--package-lock-only','--ignore-scripts','--include=dev','--include=optional','--audit-level=high','--registry=https://registry.npmjs.org/','--json'],{cwd:resolve(dir),encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024,env:{PATH:process.env.PATH,HOME:process.env.HOME,CI:'true',npm_config_userconfig:'/dev/null',npm_config_globalconfig:resolve(output,'empty-global-npmrc'),npm_config_fetch_retries:'0'}});
 let report=null;try{report=JSON.parse(r.stdout??'');}catch{}
 const after=await readFile(lockPath);const result=evaluateNpmAudit(report,r.status);
 const name=dir.replaceAll('/','-');
 if(report&&!report.error)await writeFile(resolve(output,name+'.json'),JSON.stringify(report,null,2)+'\n');
 const code=report?.error?.code;const diagnostic=typeof code==='string'&&/^[A-Z0-9_]{1,40}$/.test(code)?code:r.error?.code==='ETIMEDOUT'?'ETIMEDOUT':/double-loading config/i.test(r.stderr??'')?'DUPLICATE_CONFIG':null;
 results.push({...base,exitCode:r.status,diagnostic,...result,...(digest(before)!==digest(after)?{eligible:false,reason:'LOCK_MUTATED'}:{})});
}
const summary={schema:'sutra-npm-advisory-audit/v1',revision:revision.stdout.trim(),observedAt:new Date().toISOString(),registry:'https://registry.npmjs.org/',results,eligible:results.every(x=>x.eligible),qualification:'Locked npm dependencies only; not deployed asset rights, OS packages, vendored code, browser binary, Rust or Python toolchains.'};
await writeFile(resolve(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));if(!summary.eligible)process.exitCode=1;
