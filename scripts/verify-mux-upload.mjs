// Offline provisioning contract tests. No real Mux requests, charges or credentials.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script=fileURLToPath(new URL('./mux-upload.mjs',import.meta.url));
const SOURCE='apps/preview/public/media/from-fibre-to-fabric.mp4';
const OUTPUT='apps/preview/src/media-fibre.json';
const bootstrap=[
 "import { readFileSync } from 'node:fs';",
 "import { createHash } from 'node:crypto';",
 "const file=readFileSync(process.env.DHAGO_MUX_SOURCE);",
 "const marker='dhago-'+createHash('sha256').update(file).digest('hex');",
 "const ready={id:'asset-verified',status:'ready',passthrough:marker,duration:64,playback_ids:[{policy:'public',id:'new-film-public-id'}]};",
 "const json=data=>Response.json({data});",
 "globalThis.fetch=async (input,init={})=>{",
 " const url=String(input),method=init.method||'GET',scenario=process.env.MUX_MOCK_CASE;",
 " if(url.includes('/video/v1/assets?')){",
 "  if(scenario==='existing')return json([ready]);",
 "  if(scenario==='limit')return json(Array.from({length:10},(_,i)=>({id:'other-'+i,status:'ready',passthrough:'different-'+i})));",
 "  return json([]);",
 " }",
 " if(url.includes('/video/v1/uploads?')){",
 "  if(scenario==='pending')return json([{id:'pending',status:'waiting',new_asset_settings:{passthrough:marker},url:'https://storage.googleapis.com/mock-signed-upload'}]);",
 "  return json([]);",
 " }",
 " if(url.includes('/video/v1/uploads')&&method==='POST')throw Error('Unexpected second Mux upload created');",
 " if(url==='https://storage.googleapis.com/mock-signed-upload'&&method==='PUT')return new Response('',{status:200});",
 " if(url.endsWith('/video/v1/uploads/pending'))return json({id:'pending',status:'asset_created',asset_id:'asset-verified'});",
 " if(url.endsWith('/video/v1/assets/asset-verified'))return json(ready);",
 " throw Error('Unexpected fetch '+method+' '+url);",
 "};"
].join('\n');
const preload='data:text/javascript;base64,'+Buffer.from(bootstrap).toString('base64');

function run(scenario){
 const root=mkdtempSync(join(tmpdir(),'dhago-mux-contract-'));
 try{
  const input=join(root,SOURCE),output=join(root,OUTPUT);
  mkdirSync(dirname(input),{recursive:true});
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(input,Buffer.alloc(100_001,7));
  const result=spawnSync(process.execPath,['--import',preload,script],{
   cwd:root,encoding:'utf8',timeout:8000,
   env:{...process.env,MUX_TOKEN_ID:'offline-only',MUX_TOKEN_SECRET:'offline-only',
    DHAGO_MUX_SOURCE:SOURCE,DHAGO_MUX_OUTPUT:OUTPUT,MUX_MOCK_CASE:scenario},
  });
  return {code:result.status,stdout:result.stdout,stderr:result.stderr,
   config:existsSync(output)?JSON.parse(readFileSync(output,'utf8')):null};
 }finally{rmSync(root,{recursive:true,force:true});}
}
test('exact-hash ready asset reused without a second Mux upload',()=>{
 const r=run('existing');
 assert.equal(r.code,0,r.stderr);
 assert.equal(r.config.playbackId,'new-film-public-id');
 assert.match(r.config.contentHash,/^dhago-[a-f0-9]{64}$/);
});
test('pending upload reused after runner interruption',()=>{
 const r=run('pending');
 assert.equal(r.code,0,r.stderr);
 assert.equal(r.config.playbackId,'new-film-public-id');
});
test('free-plan ceiling prevents a new upload',()=>{
 const r=run('limit');
 assert.notEqual(r.code,0);
 assert.match(r.stderr,/asset safety ceiling reached/);
 assert.equal(r.config,null);
});
