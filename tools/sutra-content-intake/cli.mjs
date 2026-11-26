#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {assessContentManifest,snapshotContentManifest} from './intake.mjs';
const MAX_MANIFEST=512*1024,limits={media:250*1024*1024,transcript:10*1024*1024,guide:10*1024*1024};
// Reject symlink ancestors as well as the leaf. Open without following the
// final symlink and hash in fixed-size chunks, never allocating a whole video.
// As with the pack compiler, use a trusted, stable input directory.
const readBounded=(full,max,consume)=>{
 const before=fs.lstatSync(full);if(!before.isFile()||before.isSymbolicLink()||before.size<1||before.size>max)throw Error('File unavailable or outside size bound.');
 const fd=fs.openSync(full,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
 try{
  const opened=fs.fstatSync(fd);if(!opened.isFile()||opened.dev!==before.dev||opened.ino!==before.ino||opened.size!==before.size)throw Error('File changed before observation.');
  const buffer=Buffer.allocUnsafe(65536);let total=0;
  for(;;){const n=fs.readSync(fd,buffer,0,Math.min(buffer.length,max-total+1),null);if(!n)break;total+=n;if(total>max)throw Error('File exceeded size bound during observation.');consume(buffer.subarray(0,n));}
  const after=fs.fstatSync(fd);if(total!==opened.size||after.size!==opened.size||after.mtimeMs!==opened.mtimeMs||after.ctimeMs!==opened.ctimeMs)throw Error('File changed during observation.');
  return total;
 }finally{fs.closeSync(fd);}
};
const digestFile=(root,relative,max)=>{
 if(typeof relative!=='string'||relative.length>240||!relative||relative.includes('\\\\')||relative.split('/').some(x=>!x||x.startsWith('.')))throw Error('Asset path escaped root.');
 const parts=relative.split('/');let full=root;
 for(const part of parts.slice(0,-1)){full=path.join(full,part);const st=fs.lstatSync(full);if(!st.isDirectory()||st.isSymbolicLink())throw Error('Asset ancestor must be a real directory.');}
 full=path.join(full,parts.at(-1));if(!full.startsWith(root+path.sep))throw Error('Asset path escaped root.');
 const sha=createHash('sha256'),bytes=readBounded(full,max,chunk=>sha.update(chunk));return {path:relative,sha256:sha.digest('hex'),bytes};
};
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4)throw Error('Usage: node cli.mjs MANIFEST.json CONTENT_ROOT');
  const mf=path.resolve(process.argv[2]),chunks=[];readBounded(mf,MAX_MANIFEST,chunk=>chunks.push(Buffer.from(chunk)));
  const manifest=snapshotContentManifest(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)))),root=path.resolve(process.argv[3]),observed={};
  const rootStat=fs.lstatSync(root);if(!rootStat.isDirectory()||rootStat.isSymbolicLink()||fs.realpathSync(root)!==root)throw Error('Content root must be a real, non-aliased directory.');
  for(const kind of Object.keys(limits))observed[kind]=digestFile(root,manifest.assets?.[kind]?.path,limits[kind]);
  process.stdout.write(JSON.stringify(assessContentManifest(manifest,{observedFiles:observed}),null,2)+'\n');
 }catch(error){process.stderr.write(String(error?.message??error)+'\n');process.exitCode=2;}
}
