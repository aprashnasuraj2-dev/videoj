import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import fsp from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {materializeReleaseCandidate,inventoryCandidate} from './materialize.mjs';
import {launchSpecCommit,currentSpecCommit,currentSpecBlob} from './release.mjs';

const cfg=()=>({schema:1,sourceRevision:'a'.repeat(40),publicOrigin:'https://sutra.example',peerOrigin:'https://guide.example',model:'provider/model-v1',
 liveEvidence:{status:'live_verified',model:'provider/model-v1',observedAt:'2026-11-24T01:00:00Z',runRecordHash:'b'.repeat(64),costReportHash:'c'.repeat(64),usageComplete:true,judgePathPassed:true},
 budgetEvidence:{approved:true,spendCeilingUsd:25,judgingReserveRuns:50,evidenceRef:'private:budget/sutra-001'},
 spec:{launchCommit:launchSpecCommit,compatibilityCommit:currentSpecCommit,compatibilityBlob:currentSpecBlob}});

async function fixture(){
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'sutra-release-src-'));
 await fsp.mkdir(path.join(root,'agents','v','old'),{recursive:true});await fsp.mkdir(path.join(root,'runtime'));await fsp.mkdir(path.join(root,'assets'));
 const graph={metadata:{description:'x'},tools:[{name:'learner',function:{description:'x',parameters:{type:'object'}},instructions:'x',tools:[]}]};
 const names=['learner','source_learner','linked_learner'];
 const manifest={networks:names.map(name=>({name,front_man:'learner',hocon:'./v/old/'+name+'.network.json'})),allowed_peers:[],peer_policy:{mode:'closed'},deployment:{mode:'static'}};
 const links={version:1,networks:{learner:{},source_learner:{},linked_learner:{guide_peer:'https://old.invalid/agents/checklist'}}};
 await fsp.writeFile(path.join(root,'agents','agent-manifest.json'),JSON.stringify(manifest));await fsp.writeFile(path.join(root,'agents','links.json'),JSON.stringify(links));
 for(const name of names){await fsp.writeFile(path.join(root,'agents','v','old',name+'.network.json'),JSON.stringify(graph));await fsp.writeFile(path.join(root,'agents',name+'.network.json'),JSON.stringify(graph));}
 await fsp.writeFile(path.join(root,'runtime','sutra-runtime.js'),'export const runtime=true;\n');await fsp.writeFile(path.join(root,'index.html'),'<!doctype html><main id="app"></main>');await fsp.writeFile(path.join(root,'assets','app.js'),'console.log("app");');
 return root;
}
test('materializer creates separate release tree, removes stale dev graphs and writes hash-addressed release graphs',async()=>{
 const src=await fixture(),out=src+'-out';try{
  const r=await materializeReleaseCandidate({sourceDist:src,outputDir:out,config:cfg()});assert.equal(r.verified.valid,true);assert.match(r.record.runtimeSha256,/^[a-f0-9]{64}$/);assert.equal(r.record.stageOne.runtime,'/runtime/sutra-runtime.js');
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'agents','agent-manifest.json')));assert.equal(manifest.llm_router.publisher_funded,true);
  for(const entry of manifest.networks){assert.match(entry.hocon,/^\.\/release\/[a-f0-9]{64}\//);assert.equal(fs.existsSync(path.join(out,'agents',entry.name+'.network.json')),false);assert.equal(fs.existsSync(path.join(out,'agents','v','old',entry.name+'.network.json')),false);assert.equal(fs.existsSync(path.join(out,'agents',entry.hocon.slice(2))),true);}
  assert.equal(fs.readFileSync(path.join(out,'assets','app.js'),'utf8'),'console.log("app");');assert.ok(fs.existsSync(path.join(out,'agents','release-candidate.json')));
 }finally{await fsp.rm(src,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
});
test('candidate inventory excludes its own release record and is stable across repeated reads',async()=>{
 const src=await fixture(),out=src+'-out';try{
  await materializeReleaseCandidate({sourceDist:src,outputDir:out,config:cfg()});const a=await inventoryCandidate(out),b=await inventoryCandidate(out);
  assert.deepEqual(a,b);assert.equal(a.files.some(x=>x.path==='/agents/release-candidate.json'),false);assert.match(a.inventorySha256,/^[a-f0-9]{64}$/);
 }finally{await fsp.rm(src,{recursive:true,force:true});await fsp.rm(out,{recursive:true,force:true});}
});
test('source/output overlap, existing output and source symlink fail closed',async()=>{
 const src=await fixture();try{
  await assert.rejects(materializeReleaseCandidate({sourceDist:src,outputDir:path.join(src,'child'),config:cfg()}),/separate trees/);
  const existing=src+'-exists';await fsp.mkdir(existing);await assert.rejects(materializeReleaseCandidate({sourceDist:src,outputDir:existing,config:cfg()}),/already exists/);await fsp.rm(existing,{recursive:true});
  await fsp.symlink(path.join(src,'runtime','sutra-runtime.js'),path.join(src,'assets','linked.js'));
  await assert.rejects(materializeReleaseCandidate({sourceDist:src,outputDir:src+'-bad',config:cfg()}),/symlink/);
  await fsp.rm(src+'-bad',{recursive:true,force:true});
 }finally{await fsp.rm(src,{recursive:true,force:true});}
});
