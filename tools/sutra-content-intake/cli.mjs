#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {assessContentManifest} from './intake.mjs';
const MAX_MANIFEST=512*1024,limits={media:250*1024*1024,transcript:10*1024*1024,guide:10*1024*1024};
const digestFile=(root,relative,max)=>{
 const full=path.resolve(root,...relative.split('/')),prefix=path.resolve(root)+path.sep;
 if(!full.startsWith(prefix))throw Error('Asset path escaped root.');
 const lst=fs.lstatSync(full);if(!lst.isFile()||lst.isSymbolicLink()||lst.size<1||lst.size>max)throw Error('Asset file unavailable or outside size bound.');
 const bytes=fs.readFileSync(full);return {path:relative,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
};
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4)throw Error('Usage: node cli.mjs MANIFEST.json CONTENT_ROOT');
  const mf=path.resolve(process.argv[2]),stat=fs.statSync(mf);if(!stat.isFile()||stat.size<2||stat.size>MAX_MANIFEST)throw Error('Manifest must be a 2 B–512 KiB JSON file.');
  const manifest=JSON.parse(fs.readFileSync(mf,'utf8')),root=fs.realpathSync(path.resolve(process.argv[3])),observed={};
  for(const kind of Object.keys(limits))observed[kind]=digestFile(root,manifest.assets?.[kind]?.path,limits[kind]);
  process.stdout.write(JSON.stringify(assessContentManifest(manifest,{observedFiles:observed}),null,2)+'\n');
 }catch(error){process.stderr.write(String(error?.message??error)+'\n');process.exitCode=2;}
}
