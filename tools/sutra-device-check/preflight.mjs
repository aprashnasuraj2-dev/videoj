#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function inspectDeviceBundle(root){
 const dir=path.resolve(root),required=['index.html','content/content-profile.json','content/source-catalog.json','agents/agent-manifest.json'];
 const files=required.map(rel=>{const full=path.join(dir,rel),stat=fs.lstatSync(full);if(!stat.isFile()||stat.isSymbolicLink()||stat.size<2||stat.size>2*1024*1024)throw Error('Invalid device bundle artifact: '+rel);return Object.freeze({path:rel,bytes:stat.size,sha256:digest(full)});});
 const assetsDir=path.join(dir,'assets'),assets=fs.readdirSync(assetsDir).filter(name=>/\.(?:js|css)$/.test(name)).sort();if(!assets.some(name=>name.endsWith('.js')))throw Error('Device bundle has no executable asset.');
 for(const name of assets){const stat=fs.lstatSync(path.join(assetsDir,name));if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>5*1024*1024)throw Error('Invalid device asset: '+name);}
 return Object.freeze({schema:1,ready:true,buildDirectory:path.basename(dir),required:Object.freeze(files),assetCount:assets.length,
  reviewerCommands:Object.freeze(['node tools/sutra-device-check/cli.mjs DEVICE_RECORD.json > validated-device.json','node tools/sutra-device-check/reviewer-cli.mjs REVIEWER_FEEDBACK.json > validated-reviewer.json']),
  limitation:'Bundle preflight verifies required static artifacts only. It is not physical-device, screen-reader or human acceptance evidence.'});
}
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==3)throw Error('Usage: node preflight.mjs BUILD_DIR');process.stdout.write(JSON.stringify(inspectDeviceBundle(process.argv[2]),null,2)+'\n');}
 catch(error){process.stderr.write(String(error?.message??error)+'\n');process.exitCode=2;}
}
