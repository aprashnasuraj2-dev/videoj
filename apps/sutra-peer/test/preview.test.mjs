import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import path from 'node:path';import {fileURLToPath} from 'node:url';
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
 const missing=await fetch(base+'/agents/not-published.json');assert.equal(missing.status,404);
});
