import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
function blob(text){const b=Buffer.from(text,'utf8');return createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');}
const full=readFileSync(new URL('../evaluation/ambient-human-full-v1.jsonl',import.meta.url),'utf8');
const cats=readFileSync(new URL('../evaluation/ambient-human-categories-v1.jsonl',import.meta.url),'utf8');
const linguists=readFileSync(new URL('../evaluation/ambient-linguist-annotations-v1.jsonl',import.meta.url),'utf8');
test('full AmbiEnt corpus is byte-identical to pinned upstream blob',()=>{assert.equal(full.split(/\n/).filter(Boolean).length,1645);assert.equal(blob(full),'a936db483d95b4d896a21c47ec7bff44c19aeefc');});
test('AmbiEnt category corpus is byte-identical and externally annotated',()=>{const rows=cats.split(/\n/).filter(Boolean).map(JSON.parse);assert.equal(rows.length,100);assert.equal(blob(cats),'58e1aac10ddf95b5fb3861f842cdc6fd80ed5077');assert.ok(rows.every(x=>typeof x.category==='string'&&x.category.length));assert.ok(rows.every(x=>x.premise_ambiguous||x.hypothesis_ambiguous));});

test('AmbiEnt raw linguist annotations are byte-identical and retain multi-annotator evidence',()=>{const rows=linguists.split(/\n/).filter(Boolean).map(JSON.parse);assert.equal(rows.length,2020);assert.equal(blob(linguists),'3b5f5a950ab81dd0294e3fc59f94568c8e6ac2c6');assert.equal(rows.reduce((n,x)=>n+(x.annotations?.length??0),0),4090);assert.equal(rows.filter(x=>(x.annotations?.length??0)>1).length,2011);});
