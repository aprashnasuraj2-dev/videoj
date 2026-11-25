import {readFile,readdir,lstat} from 'node:fs/promises';
import {resolve,relative,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {securityHeaders} from '../../services/sutra-api/worker.js';
import {guideCandidateHeaders,assertV2StaticHeaders,rootStaticPolicy,V2_STATIC_CSP,GUIDE_ORIGIN} from '../../apps/sutra-v2/static-headers.mjs';
const root=dirname(fileURLToPath(import.meta.url)),original=resolve(root,'../../apps/sutra-v2/dist'),candidate=resolve(root,'dist'),guide=resolve(root,'../../apps/sutra-peer/dist');
const read=(dir,name)=>readFile(resolve(dir,name));
const digest=b=>createHash('sha256').update(b).digest('hex');
async function inventory(dir){
 const paths=[];
 async function walk(d){for(const entry of await readdir(d)){const p=resolve(d,entry),s=await lstat(p);if(s.isSymbolicLink())throw Error('Unexpected symbolic link');if(s.isDirectory())await walk(p);else if(s.isFile())paths.push(relative(dir,p).split(sep).join('/'));else throw Error('Unexpected build entry');}}
 await walk(dir);return paths.sort();
}
const src=await inventory(original),dst=await inventory(candidate),peer=await inventory(guide);
const index=(await read(original,'index.html')).toString();assert.match(index,/Investigative Learning/);assert.match(index,/KNOWLEDGE COMPILER/);
assert.deepEqual(dst, [...src.filter(p=>p!=='_routes.json'),'_routes.json'].sort());
for(const file of src.filter(p=>!['_headers','_routes.json'].includes(p)))assert.equal(digest(await read(original,file)),digest(await read(candidate,file)),file);
const routes=JSON.parse(await read(candidate,'_routes.json'));
assert.deepEqual(routes,{version:1,include:['/api/*'],exclude:[]});
const cfg=JSON.parse(await read(resolve(root,'../../services/sutra-api'),'wrangler.private.jsonc'));
const expected=securityHeaders(cfg.vars);
const learnerHeaders=(await read(candidate,'_headers')).toString();
for(const [key,value] of Object.entries(expected))if(key!=='Content-Security-Policy')assert.ok(learnerHeaders.includes('  '+key+': '+value+'\n'),key);
const originalHeaders=(await read(original,'_headers')).toString();
assertV2StaticHeaders(originalHeaders);
assert.equal(learnerHeaders,guideCandidateHeaders(originalHeaders));
assert.equal(rootStaticPolicy(learnerHeaders),V2_STATIC_CSP.replace("connect-src 'self';","connect-src 'self' "+GUIDE_ORIGIN+";"));
assert.doesNotMatch(expected['Content-Security-Policy'],/wasm-unsafe-eval|unsafe-eval/);
assert.throws(()=>guideCandidateHeaders(originalHeaders.replace(" 'wasm-unsafe-eval'",'')));
assert.ok((await read(original,'_headers')).toString().includes("connect-src 'self';"));
assert.ok(learnerHeaders.includes("connect-src 'self' https://sutra-guide.aafnaipatro.com;"));
assert.equal(cfg.vars.SUTRA_ENABLE_INFERENCE,'false');
assert.ok(!cfg.routes&&!cfg.assets&&!cfg.workers_dev&&!cfg.preview_urls);
const guideHeaders=(await read(guide,'_headers')).toString();
assert.match(guideHeaders,/\/agents\/\*\n  Access-Control-Allow-Origin: \*/);
assert.equal((guideHeaders.match(/Access-Control-Allow-Origin/g)||[]).length,1);
assert.doesNotMatch(guideHeaders,/Access-Control-Allow-Credentials/);
for(const name of ['index.html','agents/agent-manifest.json','agents/checklist.network.json','agents/links.json'])assert.ok(peer.includes(name),name);
for(const files of [dst,peer])for(const f of files){assert.ok(!/(^|\/)(\.env(?:\.|$)|node_modules|\.git|functions|\.wrangler)(\/|$)/.test(f));assert.ok(!/\.(pem|key|p12)$/i.test(f));}
assert.ok(!peer.includes('_routes.json'));
console.log(JSON.stringify({learnerFiles:dst.length,guideFiles:peer.length,unchangedLearnerAssets:src.filter(p=>!['_headers','_routes.json'].includes(p)).length,apiOnly:true,guideCors:'public artifacts only',inference:'disabled',deployment:'not performed'}));
