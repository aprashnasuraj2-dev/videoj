#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const readJson=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const defaultMap=()=>readJson('docs/sutra/verification-map.json');
const norm=file=>{if(typeof file!=='string'||!file||file.includes('\\')||file.startsWith('/')||file.split('/').includes('..'))throw Error('Invalid repository path');return file.replace(/^\.\//,'');};
const matches=(file,suite)=>(suite.exact??[]).includes(file)||(suite.prefixes??[]).some(prefix=>file.startsWith(prefix));
export function classifyChangedFiles(files,map=defaultMap()){
 const clean=[...new Set(files.filter(Boolean).map(norm))].sort(),suiteMap=new Map(),unmapped=[];
 for(const file of clean){
  const hit=map.suites.filter(s=>matches(file,s));
  for(const suite of hit)suiteMap.set(suite.id,suite);
  if(map.managedRoots.some(prefix=>file.startsWith(prefix))&&!hit.length)unmapped.push(file);
 }
 const suites=[...suiteMap.values()].sort((a,b)=>a.id.localeCompare(b.id));
 return Object.freeze({changedFiles:Object.freeze(clean),affectedSuites:Object.freeze(suites.map(s=>s.id)),
  requiredWorkflows:Object.freeze([...new Set(suites.flatMap(s=>s.requiredWorkflows))].sort()),
  invalidatedMetrics:Object.freeze([...new Set(suites.flatMap(s=>s.invalidates))].sort()),
  reasons:Object.freeze(suites.map(s=>Object.freeze({suite:s.id,reason:s.reason}))),unmapped:Object.freeze(unmapped)});
}
export function metricFreshness(metric,affectedSuites){
 const stale=(metric.invalidatedBy??[]).some(id=>affectedSuites.includes(id));
 return Object.freeze({id:metric.id,sourceRevision:metric.sourceRevision,status:stale?'stale':'current',invalidatedBy:stale?metric.invalidatedBy.filter(id=>affectedSuites.includes(id)):[]});
}
const sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/i.test(v);
function changed(base,head){
 if(!sha(base)||!sha(head))throw Error('Impact comparison requires immutable 40-character SHAs.');
 const out=execFileSync('git',['diff','--name-only',base,head],{cwd:root,encoding:'utf8',maxBuffer:1024*1024});
 return out.split(/\r?\n/).filter(Boolean);
}
function reportMetrics(head,map){
 if(!sha(head))throw Error('Metric freshness requires an immutable head SHA.');
 const registry=readJson('docs/sutra/evidence/metrics.json'),rows=[];
 for(const metric of registry.metrics){
  if(!sha(metric.sourceRevision))throw Error('Metric source revision is invalid: '+metric.id);
  let files=[];try{files=changed(metric.sourceRevision,head);}catch(error){throw Error('Cannot compare metric '+metric.id+': '+error.message);}
  const classification=classifyChangedFiles(files,map),fresh=metricFreshness(metric,classification.affectedSuites);
  rows.push({...fresh,profile:metric.profile,changedFileCount:files.length,affectedSuites:classification.affectedSuites,values:metric.values});
 }
 return {schema:1,head,metrics:rows,stale:rows.filter(r=>r.status==='stale').map(r=>r.id)};
}
const args=process.argv.slice(2),map=defaultMap();
if(import.meta.url===new URL('file://'+process.argv[1]).href||fileURLToPath(import.meta.url)===path.resolve(process.argv[1]??'')){
 try{
  let out;
  if(args[0]==='--files')out={schema:1,...classifyChangedFiles(args.slice(1),map)};
  else if(args[0]==='--metrics')out=reportMetrics(args[1],map);
  else if(args.length===2)out={schema:1,base:args[0],head:args[1],...classifyChangedFiles(changed(args[0],args[1]),map)};
  else throw Error('Usage: impact.mjs BASE_SHA HEAD_SHA | --files PATH... | --metrics HEAD_SHA');
  console.log(JSON.stringify(out,null,2));
  if(out.unmapped?.length)process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=2;}
}
