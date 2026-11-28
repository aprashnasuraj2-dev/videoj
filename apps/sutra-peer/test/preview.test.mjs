import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import path from 'node:path';import {symlink,unlink} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
test('built peer serves human page and public artifacts independently on loopback',async t=>{
 const port=4195,base=`http://127.0.0.1:${port}`;const child=spawn(process.execPath,['scripts/serve.mjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:'pipe'});
 t.after(()=>child.kill());let stderr='';child.stderr.on('data',d=>stderr+=d);
 let ready=false;for(let i=0;i<50;i++){try{const r=await fetch(base+'/');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}
 assert.ok(ready,'peer preview did not start: '+stderr);
 const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/Checklist guidance/);
 const manifest=await fetch(base+'/agents/agent-manifest.json',{credentials:'omit'});assert.equal(manifest.status,200);assert.equal(manifest.headers.get('access-control-allow-origin'),'*');assert.match(manifest.headers.get('content-type'),/application\/json/);
 const data=await manifest.json();assert.equal(data.networks[0].name,'checklist');
 const graph=await fetch(base+'/agents/checklist.network.json',{credentials:'omit'});assert.equal(graph.status,200);assert.equal(graph.headers.get('access-control-allow-origin'),'*');assert.deepEqual((await graph.json()).tools.map(x=>x.name),['checklist','source_select']);
 const missing=await fetch(base+'/agents/not-published.json');assert.equal(missing.status,404);assert.equal(missing.headers.get('access-control-allow-origin'),null);
 const head=await fetch(base+'/agents/agent-manifest.json',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(head.headers.get('access-control-allow-origin'),'*');
 for(const method of ['POST','PUT','DELETE','PATCH'])assert.equal((await fetch(base+'/agents/checklist.network.json',{method})).status,405);
 const preflight=await fetch(base+'/agents/checklist.network.json',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'Accept'}});assert.equal(preflight.status,204);
 assert.equal((await fetch(base+'/agents/checklist.network.json',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST'}})).status,403);
 assert.equal((await fetch(base+'/agents/checklist.network.json',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'Authorization'}})).status,403);
 assert.equal((await fetch(base+'/agents/checklist.network.json?secret=canary')).status,400);
 const link=path.join(root,'dist','symlink-canary.json');await symlink(path.join(root,'package.json'),link);try{const denied=await fetch(base+'/symlink-canary.json');assert.equal(denied.status,404);assert.doesNotMatch(await denied.text(),/sutra-peer/);}finally{await unlink(link);}
 const [{loadPeerNetwork},{createConsentInspector}]=await Promise.all([
  import('../../../packages/sutra-runtime/index.js'),import('../../../packages/sutra-consent/index.js')
 ]);
 const decisions=[];const inspector=createConsentInspector({decide:async intent=>{decisions.push({kind:intent.kind,origin:intent.origin,network:intent.network});return {decision:'allow',scope:'once'};}});
 const loaded=await loadPeerNetwork({peerUrl:base+'/agents/checklist',inspector,fetchImpl:fetch});
 assert.equal(loaded.name,'checklist');assert.equal(loaded.frontMan,'checklist');assert.deepEqual(loaded.definition.tools.map(x=>x.name),['checklist','source_select']);
 assert.deepEqual(decisions,[{kind:'peer_manifest',origin:base,network:'checklist'},{kind:'peer_graph',origin:base,network:'checklist'}]);
});
