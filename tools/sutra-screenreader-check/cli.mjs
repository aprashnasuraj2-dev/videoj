#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {validateAssistiveTechRecord} from './screenreader.mjs';
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3)throw Error('Usage: node cli.mjs SCREEN_READER_RECORD.json');
  const file=path.resolve(process.argv[2]),stat=fs.statSync(file);if(!stat.isFile()||stat.size<2||stat.size>256*1024)throw Error('Input must be a 2 B–256 KiB JSON file.');
  process.stdout.write(JSON.stringify(validateAssistiveTechRecord(JSON.parse(fs.readFileSync(file,'utf8'))),null,2)+'\n');
 }catch(error){process.stderr.write(String(error?.message??error)+'\n');process.exitCode=2;}
}
