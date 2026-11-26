#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {materializeReleaseCandidate} from './materialize.mjs';
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==5)throw Error('Usage: node cli.mjs RELEASE_CONFIG.json SOURCE_DIST OUTPUT_DIR');
  const cfg=path.resolve(process.argv[2]),stat=fs.statSync(cfg);
  if(!stat.isFile()||stat.size<2||stat.size>512*1024)throw Error('Release config must be a 2 B–512 KiB JSON file.');
  const result=await materializeReleaseCandidate({config:JSON.parse(fs.readFileSync(cfg,'utf8')),sourceDist:process.argv[3],outputDir:process.argv[4]});
  process.stdout.write(JSON.stringify({outputDir:result.outputDir,verified:result.verified,record:result.record},null,2)+'\n');
 }catch(error){process.stderr.write(String(error?.message??error)+'\n');process.exitCode=2;}
}
