import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {validateReceipt} from '../index.js';
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
