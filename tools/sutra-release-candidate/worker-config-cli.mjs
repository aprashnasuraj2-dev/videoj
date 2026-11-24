#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {renderWorkerConfig} from './worker-config.mjs';
const read=file=>{const p=path.resolve(file),s=fs.statSync(p);if(!s.isFile()||s.size<2||s.size>512*1024)throw Error('Input must be a 2 B–512 KiB JSON file.');return JSON.parse(fs.readFileSync(p,'utf8'));};
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4)throw Error('Usage: node worker-config-cli.mjs BASE_WRANGLER.jsonc RELEASE_CONFIG.json');
  const r=renderWorkerConfig({baseConfig:read(process.argv[2]),releaseConfig:read(process.argv[3])});
  process.stdout.write(JSON.stringify(r,null,2)+'\n');
 }catch(error){process.stderr.write(String(error&&error.message||error)+'\n');process.exitCode=2;}
}
