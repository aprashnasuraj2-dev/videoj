#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {makeCounterbalancedPlan,scoreStudy} from './study.mjs';
const MAX=256*1024;
const read=file=>{const full=path.resolve(file),stat=fs.statSync(full);if(!stat.isFile()||stat.size<2||stat.size>MAX)throw Error('Study input must be a 2 B–256 KiB JSON file.');return JSON.parse(fs.readFileSync(full,'utf8'));};
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)){
 try{
  const [command,...args]=process.argv.slice(2);let result;
  if(command==='plan'&&args.length===1)result=makeCounterbalancedPlan({seed:args[0]});
  else if(command==='score'&&args.length===2)result=scoreStudy({plan:read(args[0]),observations:read(args[1])});
  else throw Error('Usage: node cli.mjs plan RECORDED_SEED | node cli.mjs score PLAN.json OBSERVATIONS.json');
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
 }catch(error){process.stderr.write(String(error?.message??error)+'\n');process.exitCode=2;}
}
