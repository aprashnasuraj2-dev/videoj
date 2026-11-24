import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {retainRolloutAssets} from '../tools/rollout-retention.mjs';

const blob=bytes=>createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
const write=(root,rel,content)=>{const file=path.join(root,...rel.split('/'));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);return file;};

test('rollout retention carries old hashed JS/CSS and content-addressed graphs but never mutable pointers',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sutra-rollout-'));
 const previous=path.join(root,'previous'),next=path.join(root,'next');fs.mkdirSync(previous);fs.mkdirSync(next);
 const oldGraph=Buffer.from('{"version":"old","safe":true}\n'),oldHash=blob(oldGraph);
 write(previous,'assets/index-OLDHASH99.js','old-js');
 write(previous,'assets/theme-OLDHASH88.css','old-css');
 write(previous,`agents/v/${oldHash}/learner.network.json`,oldGraph);
 write(previous,'index.html','STALE HTML MUST NOT COPY');
 write(previous,'agents/agent-manifest.json','{"stale":true}');
 write(previous,'agents/learner.network.json','{"stale":"alias"}');
 write(previous,'media/timing-fixture.mp4','STALE MEDIA');

 write(next,'assets/index-NEWHASH99.js','new-js');
 write(next,'index.html','NEW HTML');
 write(next,'agents/agent-manifest.json','{"new":true}');
 write(next,'agents/learner.network.json','{"new":"alias"}');
 const result=retainRolloutAssets({previousDir:previous,nextDir:next});
 assert.deepEqual(result.copied.sort(),[
  `agents/v/${oldHash}/learner.network.json`,'assets/index-OLDHASH99.js','assets/theme-OLDHASH88.css'
 ].sort());
 assert.equal(fs.readFileSync(path.join(next,'index.html'),'utf8'),'NEW HTML');
 assert.equal(fs.readFileSync(path.join(next,'agents/agent-manifest.json'),'utf8'),'{"new":true}');
 assert.equal(fs.readFileSync(path.join(next,'agents/learner.network.json'),'utf8'),'{"new":"alias"}');
 assert.equal(fs.existsSync(path.join(next,'media/timing-fixture.mp4')),false);
 assert.deepEqual(fs.readFileSync(path.join(next,'agents','v',oldHash,'learner.network.json')),oldGraph);
 fs.rmSync(root,{recursive:true,force:true});
});

test('retention is idempotent and rejects immutable-path byte collisions',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sutra-rollout-'));
 const previous=path.join(root,'previous'),next=path.join(root,'next');fs.mkdirSync(previous);fs.mkdirSync(next);
 write(previous,'assets/index-SAMEHASH1.js','same');
 write(next,'assets/index-SAMEHASH1.js','same');
 assert.deepEqual(retainRolloutAssets({previousDir:previous,nextDir:next}).reused,['assets/index-SAMEHASH1.js']);
 write(next,'assets/index-SAMEHASH1.js','different');
 assert.throws(()=>retainRolloutAssets({previousDir:previous,nextDir:next}),/Immutable rollout collision/);
 fs.rmSync(root,{recursive:true,force:true});
});

test('retention rejects unversioned assets and forged graph hashes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sutra-rollout-'));
 const previous=path.join(root,'previous'),next=path.join(root,'next');fs.mkdirSync(previous);fs.mkdirSync(next);
 write(previous,'assets/plain.js','not hashed');
 assert.throws(()=>retainRolloutAssets({previousDir:previous,nextDir:next}),/unversioned/);
 fs.rmSync(path.join(previous,'assets'),{recursive:true,force:true});
 write(previous,`agents/v/${'a'.repeat(40)}/learner.network.json`,'{"forged":true}');
 assert.throws(()=>retainRolloutAssets({previousDir:previous,nextDir:next}),/hash does not match/);
 fs.rmSync(root,{recursive:true,force:true});
});
