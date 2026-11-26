#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildContentPack} from './pack.mjs';
const read=file=>{const full=path.resolve(file),s=fs.statSync(full);if(!s.isFile()||s.size<2||s.size>1024*1024)throw Error('JSON input must be a 2 B–1 MiB file.');return JSON.parse(fs.readFileSync(full,'utf8'));};
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==6)throw Error('Usage: node cli.mjs CONTENT_MANIFEST.json SEMANTIC_METADATA.json CONTENT_ROOT OUTPUT_DIR');
  const r=await buildContentPack({manifest:read(process.argv[2]),semantic:read(process.argv[3]),contentRoot:process.argv[4],outputDir:process.argv[5]});
  process.stdout.write(JSON.stringify(r.record,null,2)+'\n');
 }catch(error){process.stderr.write(String(error&&error.message||error)+'\n');process.exitCode=2;}
}
