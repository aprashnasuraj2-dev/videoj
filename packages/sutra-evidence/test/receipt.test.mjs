import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {validateReceipt,validateEvidenceClaim} from '../index.js';
const receipt=JSON.parse(fs.readFileSync(new URL('../examples/receipt.json',import.meta.url)));
const sources=JSON.parse(fs.readFileSync(new URL('../examples/sources.json',import.meta.url)));
const run=(r=receipt,s=sources)=>validateReceipt(r,{sources:s});
test('shape-only does not claim matched or true evidence',()=>assert.equal(validateReceipt(receipt).level,'shape_only'));
test('matches expected independently supplied catalog',()=>assert.equal(run().level,'catalog_matched'));
for (const [name,patch,code] of [
 ['changed media',{mediaHash:'b'.repeat(64)},'MEDIA_MISMATCH'],['changed source version',{sourceVersion:'v2'},'VERSION_MISMATCH'],
 ['negative timestamp',{start:-1},'INTERVAL'],['inverted interval',{end:11},'INTERVAL'],['non-finite interval',{end:Infinity},'INTERVAL'],
 ['fabricated cue',{cueId:'invented'},'MISSING_CUE'],['wrong source',{sourceId:'other'},'MISSING_SOURCE'],
 ['modified source',{sourceHash:'a'.repeat(64)},'HASH_MISMATCH'],['altered quotation',{excerpt:'invented'},'QUOTE_MISMATCH'],
 ['incorrect cue interval',{start:13},'CUE_RANGE'],['outside media',{end:100},'OUTSIDE_MEDIA'],
 ['impossible date',{retrievedAt:'2026-02-30T00:00:00Z'},'DATE'],['missing zone',{retrievedAt:'2026-01-01T00:00:00'},'DATE'],
 ['private extra field',{apiKey:'synthetic-canary'},'UNKNOWN_FIELD'],['self-asserted truth',{verification:'verified'},'SELF_VERIFICATION']
]) test(name,()=>{const result=run({...receipt,...patch});assert.equal(result.valid,false);assert.ok(result.errors.some(e=>e.code===code));assert.ok(!JSON.stringify(result).includes('synthetic-canary'));});
test('ambiguous source fails closed',()=>assert.ok(run(receipt,[...sources,...sources]).errors.some(e=>e.code==='AMBIGUOUS_SOURCE')));
test('invalid cue metadata fails closed',()=>{const s=structuredClone(sources);s[0].cues[0].end=100;assert.ok(run(receipt,s).errors.some(e=>e.code==='CATALOG'));});
test('nonobjects and missing fields rejected',()=>{for(const value of [null,[],{},'text'])assert.equal(run(value).valid,false);});
test('CLI succeeds from an independent working directory',()=>{const result=spawnSync(process.execPath,[new URL('../cli.mjs',import.meta.url).pathname,new URL('../examples/receipt.json',import.meta.url).pathname,new URL('../examples/sources.json',import.meta.url).pathname],{cwd:'/tmp',encoding:'utf8'});assert.equal(result.status,0);assert.equal(JSON.parse(result.stdout).level,'catalog_matched');});
test('CLI input failure is distinct from invalid evidence',()=>{const result=spawnSync(process.execPath,[new URL('../cli.mjs',import.meta.url).pathname,'/missing/receipt.json'],{encoding:'utf8'});assert.equal(result.status,2);});


test('source excerpt claim requires exact catalog-backed quote and returns a stable source reference',()=>{
 const claim={version:1,kind:'source_excerpt',text:receipt.excerpt,receipt};
 const result=validateEvidenceClaim(claim,{sources});
 assert.equal(result.valid,true);assert.equal(result.state,'source_backed_unverified');assert.equal(result.truthStatus,'unverified');
 assert.deepEqual(result.sourceRef,{sourceId:receipt.sourceId,sourceVersion:receipt.sourceVersion,sourceHash:receipt.sourceHash,mediaHash:receipt.mediaHash,cueId:receipt.cueId,start:receipt.start,end:receipt.end});
 assert.equal(result.excerpt,receipt.excerpt);
});
test('interpretation remains explicitly unverified even when its evidence receipt is catalog matched',()=>{
 const claim={version:1,kind:'interpretation',text:'A model-authored interpretation that is not a quotation.',receipt};
 const result=validateEvidenceClaim(claim,{sources});
 assert.equal(result.valid,true);assert.equal(result.state,'interpretation_unverified');assert.equal(result.truthStatus,'unverified');
 assert.equal(result.excerpt,receipt.excerpt);
 assert.notEqual(result.excerpt,claim.text);
});
test('claim validator preserves unsupported state for invented sources, altered quotes and missing independent catalog',()=>{
 const quote={version:1,kind:'source_excerpt',text:receipt.excerpt,receipt};
 assert.equal(validateEvidenceClaim({...quote,receipt:{...receipt,cueId:'invented'}},{sources}).state,'unsupported');
 const altered=validateEvidenceClaim({...quote,text:'changed quotation'},{sources});
 assert.equal(altered.valid,false);assert.ok(altered.errors.some(e=>e.code==='CLAIM_QUOTE_MISMATCH'));
 const noCatalog=validateEvidenceClaim(quote);
 assert.equal(noCatalog.valid,false);assert.equal(noCatalog.state,'unsupported');assert.ok(noCatalog.errors.some(e=>e.code==='CATALOG_REQUIRED'));
});
test('claim cannot self-upgrade, add fields or hide invalid receipt behind interpretation text',()=>{
 for(const claim of [
  {version:1,kind:'source_excerpt',text:receipt.excerpt,receipt,verification:'verified'},
  {version:2,kind:'source_excerpt',text:receipt.excerpt,receipt},
  {version:1,kind:'verified_fact',text:receipt.excerpt,receipt},
  {version:1,kind:'interpretation',text:'summary',receipt:{...receipt,sourceHash:'a'.repeat(64)}}
 ]){
  const result=validateEvidenceClaim(claim,{sources});assert.equal(result.valid,false);assert.equal(result.state,'unsupported');
 }
});
