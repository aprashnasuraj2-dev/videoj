import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {exportMediaAnnotation} from '../annotation.js';
const receipt=JSON.parse(await readFile(new URL('../examples/receipt.json',import.meta.url),'utf8'));
const sources=JSON.parse(await readFile(new URL('../examples/sources.json',import.meta.url),'utf8'));
const media={sourceId:receipt.sourceId,mediaHash:receipt.mediaHash,url:'https://media.example.org/video.mp4',type:'Video',format:'video/mp4'};
test('portable annotation derives exact cue and quote, preserves catalog identity without truth claim',()=>{
 const x=exportMediaAnnotation(receipt,{sources,media});
 assert.equal(x.annotation.body.value,receipt.excerpt);
 assert.equal(x.cueHref,media.url+'#t='+receipt.start+','+receipt.end);
 assert.equal(x.integrity.sourceHash,receipt.sourceHash);assert.equal(x.integrity.mediaHash,receipt.mediaHash);
 assert.equal(x.truthStatus,'unverified');assert.equal(x.authority,'NONE');
});
test('requires independently matched receipt and exact mapping, refuses unsafe URL and unrepresentable interval',()=>{
 for(const options of [{media},{sources,media:{...media,mediaHash:'0'.repeat(64)}},{sources,media:{...media,url:'https://user:secret@media.example.org/video.mp4'}},{sources,media:{...media,url:'https://media.example.org/video.mp4?token=secret'}},{sources,media:{...media,url:'javascript:alert(1)'}},{sources,media:{...media,type:'Video',format:'text/html'}}])assert.throws(()=>exportMediaAnnotation(receipt,options));
 assert.throws(()=>exportMediaAnnotation({...receipt,excerpt:'forged'},{sources,media}),/CATALOG_REQUIRED/);
 const r={...receipt,start:receipt.start+0.00001},s=structuredClone(sources);s.find(x=>x.id===r.sourceId).cues.find(x=>x.id===r.cueId).start=r.start;
 assert.throws(()=>exportMediaAnnotation(r,{sources:s,media}),/FRAGMENT_PRECISION/);
});
