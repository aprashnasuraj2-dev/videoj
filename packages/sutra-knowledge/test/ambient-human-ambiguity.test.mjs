import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
function blob(text){const b=Buffer.from(text,'utf8');return createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');}
const full=readFileSync(new URL('../evaluation/ambient-human-full-v1.jsonl',import.meta.url),'utf8');
const cats=readFileSync(new URL('../evaluation/ambient-human-categories-v1.jsonl',import.meta.url),'utf8');
test('full AmbiEnt corpus is byte-identical to pinned upstream blob',()=>{assert.equal(full.split(/\n/).filter(Boolean).length,1645);assert.equal(blob(full),'a936db483d95b4d896a21c47ec7bff44c19aeefc');});
test('AmbiEnt category corpus is byte-identical and externally annotated',()=>{const rows=cats.split(/\n/).filter(Boolean).map(JSON.parse);assert.equal(rows.length,100);assert.equal(blob(cats),'58e1aac10ddf95b5fb3861f842cdc6fd80ed5077');assert.ok(rows.every(x=>typeof x.category==='string'&&x.category.length));assert.ok(rows.every(x=>x.premise_ambiguous||x.hypothesis_ambiguous));});
