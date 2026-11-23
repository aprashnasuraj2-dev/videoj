#!/usr/bin/env node
import fs from 'node:fs';
import {validateEvidenceBytes} from './annotation.js';
const [annotationFile,manifestFile,transcriptFile,...extra]=process.argv.slice(2);
if(!annotationFile||!manifestFile||!transcriptFile||extra.length){
 console.error('Usage: node annotation-cli.mjs ANNOTATION.json MANIFEST.json TRANSCRIPT.vtt');process.exitCode=2;
}else{
 try{
  const read=(file,max=2*1024*1024)=>{const data=fs.readFileSync(file);if(data.length>max)throw Error('size');return data;};
  const annotation=JSON.parse(read(annotationFile).toString('utf8')),manifest=JSON.parse(read(manifestFile).toString('utf8'));
  const transcript=read(transcriptFile);
  const result=await validateEvidenceBytes(annotation,{manifest,resources:{[manifest.resources.find(x=>x.role==='transcript')?.id]:transcript}});
  console.log(JSON.stringify(result,null,2));process.exitCode=result.valid&&result.level==='transcript_verified'?0:1;
 }catch{
  console.error('Unable to validate bounded evidence inputs. Check files, JSON syntax and the 2 MiB input limit.');process.exitCode=2;
 }
}
