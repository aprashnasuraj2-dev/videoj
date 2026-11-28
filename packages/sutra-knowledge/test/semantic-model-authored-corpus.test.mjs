import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const manifest=JSON.parse(readFileSync(new URL('../evaluation/semantic-model-authored-manifest-v1.json',import.meta.url),'utf8'));
const blob=text=>{const b=Buffer.from(text,'utf8');return createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');};
test('model-authored semantic corpus is balanced, explicit and reproducible',()=>{
 const rows=[];for(const shard of manifest.shards){const text=readFileSync(new URL('../evaluation/'+shard.path,import.meta.url),'utf8');assert.equal(blob(text),shard.gitBlob);const part=text.split(/\n/).filter(Boolean).map(JSON.parse);assert.equal(part.length,shard.count);rows.push(...part);}
 assert.equal(rows.length,4000);assert.equal(manifest.hiddenTrainingExampleClaim,false);assert.equal(manifest.humanAnnotation,false);
 const fam=new Map(),dom=new Map(),ids=new Set();for(const row of rows){assert.equal(row.provenance.source,'SUTRA_MODEL_AUTHORED_SYNTHETIC_V1');assert.equal(row.provenance.humanAnnotation,false);assert.equal(row.provenance.hiddenTrainingExampleClaim,false);assert.equal(row.expectedReviewState,'REVIEW_REQUIRED');assert.equal(row.candidateMeanings.length,2);assert.ok(!ids.has(row.id));ids.add(row.id);fam.set(row.family,(fam.get(row.family)||0)+1);dom.set(row.domain,(dom.get(row.domain)||0)+1);}
 assert.equal(fam.size,20);assert.equal(dom.size,10);for(const n of fam.values())assert.equal(n,200);for(const n of dom.values())assert.equal(n,400);
});
