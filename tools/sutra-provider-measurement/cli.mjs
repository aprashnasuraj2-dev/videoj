#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {buildProviderCostReport} from './report.mjs';
const MAX=512*1024;
function readJson(file){
 const stat=fs.statSync(file);if(!stat.isFile()||stat.size<2||stat.size>MAX)throw Error('Input must be a 2 B–512 KiB JSON file.');
 const text=fs.readFileSync(file,'utf8');return JSON.parse(text);
}
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3)throw Error('Usage: node cli.mjs MEASUREMENT.json');
  const report=buildProviderCostReport(readJson(path.resolve(process.argv[2])));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(!report.costComplete)process.exitCode=3;
 }catch(error){process.stderr.write(String(error?.message??error)+'\n');process.exitCode=2;}
}
