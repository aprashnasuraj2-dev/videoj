import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));const read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
test('manifest publishes exactly the checklist network and no executable metadata',()=>{
 const m=read('public/agents/agent-manifest.json');assert.equal(m.networks.length,1);assert.deepEqual(m.networks[0],{name:'checklist',front_man:'checklist',hocon:'./checklist.network.json',description:m.networks[0].description});assert.equal(m.coded_tools,undefined);assert.equal(m.actions,undefined);
});
test('resolved graph is declarative and exposes checklist plus narrow source helper',()=>{
 const g=read('public/agents/checklist.network.json');assert.deepEqual(g.tools.map(x=>x.name),['checklist','source_select']);assert.deepEqual(g.tools[0].tools,['source_select']);assert.deepEqual(g.tools[1].tools,[]);
 const text=JSON.stringify(g);for(const forbidden of ['class_name','toolbox','requests_get','api_key','Authorization'])assert.ok(!text.includes(forbidden));
});
test('links file is explicit and has no undeclared peer binding',()=>assert.deepEqual(read('public/agents/links.json'),{version:1,networks:{checklist:{}}}));
test('peer package has no caller UI dependency or private server dependency',()=>{
 const pkg=read('package.json');assert.deepEqual(pkg.dependencies,undefined);assert.deepEqual(pkg.devDependencies,undefined);
 const source=fs.readFileSync(path.join(root,'src/main.js'),'utf8');assert.ok(!source.includes('../sutra/'));assert.ok(!source.includes('services/sutra-api'));
});
test('build output is a self-contained static publication',()=>{
 for(const p of ['dist/index.html','dist/peer.config.json','dist/src/main.js','dist/src/style.css','dist/agents/agent-manifest.json','dist/agents/checklist.network.json','dist/agents/links.json'])assert.ok(fs.statSync(path.join(root,p)).isFile(),p);
 const built=read('dist/agents/agent-manifest.json');assert.equal(built.networks[0].name,'checklist');
});
test('origin configuration refuses to invent a same-site production peer',()=>{
 const c=read('peer.config.json');assert.equal(c.preview_origin,'http://127.0.0.1:4185');assert.equal(c.production_status,'unassigned_not_deployed');assert.equal(c.production_origin,null);assert.match(c.production_origin_requirement,/different registrable domain/i);assert.equal(c.caller_production_origin,'https://sutra.aafnaipatro.com');assert.equal(c.ownership,'same_project_owner');
});
