import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';
const base='http://127.0.0.1:4296',origin='http://127.0.0.1:4283';
test('controlled MCP fixture enforces origin/methods and serves only read operations',async t=>{
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'4296',CALLER_ORIGIN:origin},stdio:'pipe'});t.after(()=>child.kill());
 let ready=false;for(let i=0;i<60;i++){try{const r=await fetch(base+'/');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}assert.ok(ready);
 const preflight=await fetch(base+'/mcp',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,mcp-protocol-version'}});
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);assert.equal(preflight.headers.get('access-control-allow-credentials'),null);
 const refused=await fetch(base+'/mcp',{method:'OPTIONS',headers:{Origin:'http://attacker.example','Access-Control-Request-Method':'POST'}});assert.equal(refused.status,403);
 const request=async body=>fetch(base+'/mcp',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const init=await request({jsonrpc:'2.0',id:1,method:'initialize',params:{}});assert.equal((await init.json()).result.protocolVersion,'2025-06-18');
 const listed=await request({jsonrpc:'2.0',id:2,method:'tools/list',params:{}});assert.deepEqual((await listed.json()).result.tools.map(x=>x.name),['lookup','not_declared']);
 const read=await request({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'lookup',arguments:{request:'hello'}}});assert.equal((await read.json()).result.structuredContent.truthStatus,'unverified');
 const write=await request({jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'write',arguments:{request:'x'}}});assert.ok((await write.json()).error);
});
