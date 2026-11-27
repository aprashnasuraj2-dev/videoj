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
 const paths=[];let total=0;
 const base=await lstat(dir);assert.ok(base.isDirectory()&&!base.isSymbolicLink(),'Artifact root must be a real directory');
 async function walk(d){for(const entry of await readdir(d)){const p=resolve(d,entry),s=await lstat(p);if(s.isSymbolicLink())throw Error('Unexpected symbolic link');if(s.isDirectory())await walk(p);else if(s.isFile()){total+=s.size;assert.ok(paths.length<128&&total<=32*1024*1024,'Static artifact size/count bound exceeded');paths.push(relative(dir,p).split(sep).join('/'));}else throw Error('Unexpected build entry');}}
 await walk(dir);return paths.sort();
}
const src=await inventory(original),dst=await inventory(candidate),peer=await inventory(guide);
const index=(await read(original,'index.html')).toString();
const {compileNetwork,resolveSymbolicPeerLinks}=await import('../../packages/sutra-runtime/index.js');
const {parseUniqueJson}=await import('../../packages/sutra-consent/strict-json.js');
const json=async(dir,name)=>parseUniqueJson((await read(dir,name)).toString('utf8'));
const callerNetworks=[
 ['investigation','planner','./investigation.network.json'],
 ['reviewed_investigation','planner','./reviewed-investigation.network.json'],
 ['peer_investigation','planner','./peer-investigation.network.json']
];
const guideNetworks=[['checklist','checklist','./checklist.network.json']];
function requirePublication(files,manifest,expected,html,caller){
 const required=['index.html','_headers','agents/agent-manifest.json','agents/links.json',...expected.map(e=>'agents/'+e[2].slice(2))];
 if(caller)required.push('support-lattice.wasm','sutra-proof-verifier.pyz','sutra-proof-verifier.pyz.sha256','_routes.json');
 for(const name of required)assert.ok(files.includes(name),'Missing public artifact: '+name);
 assert.deepEqual(manifest.networks.map(n=>[n.name,n.front_man,n.hocon]),expected,'Publication identity drift');
 assert.deepEqual(manifest.allowed_peers,caller?[GUIDE_ORIGIN]:[]);
 assert.deepEqual(manifest.peer_policy,{mode:caller?'allowlist':'closed'});
 assert.deepEqual(manifest.deployment,{mode:'static'});
 if(caller){
  const entries=[...html.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["'][^>]*>/g)].map(m=>m[1]);
  assert.equal(entries.length,1,'Expected a single Vite runtime entry');
  assert.match(entries[0],/^(?:\.\/|\/)?assets\/[A-Za-z0-9_-]+\.js$/);
  assert.ok(files.includes(entries[0].replace(/^(?:\.\/|\/)/,'')),'Missing browser runtime entry');
 }
 for(const name of files){
  assert.doesNotMatch(name,/(^|\/)(?:\.env(?:\.[^/]*)?|\.git|node_modules|functions|\.wrangler|dhago|detour|afterimage|transcripts|media|content)(?:\/|$)|\.(?:pem|key|p12|map)$/i,'Forbidden publication path: '+name);
 }
}
// Static publication is deliberately closed to an exact inventory plus the
// two generated Vite entry assets. Unknown payloads cannot ride along with
// byte-identical copying from a compromised or stale source directory.
const callerFixed=['index.html','_headers','_routes.json','agents/agent-manifest.json','agents/links.json',...callerNetworks.map(n=>'agents/'+n[2].slice(2)),'support-lattice.wasm','sutra-proof-verifier.pyz','sutra-proof-verifier.pyz.sha256','offline.html','orbit-sw.js','orbit.webmanifest','sutra-orbit.svg'];
const guideFixed=['index.html','_headers','agents/agent-manifest.json','agents/checklist.network.json','agents/links.json','peer.config.json','src/main.js','src/style.css'];
function exactInventory(files,fixed,caller){
 const assets=files.filter(p=>/^assets\/[A-Za-z0-9_-]+\.(?:js|css)$/.test(p));
 if(caller)assert.deepEqual(assets.map(p=>p.slice(p.lastIndexOf('.'))).sort(),['.css','.js'],'Unexpected generated runtime assets');
 else assert.equal(assets.length,0);
 assert.deepEqual([...files].sort(),[...fixed,...assets].sort(),'Unexpected or missing static artifact');
}
exactInventory(dst,callerFixed,true);exactInventory(peer,guideFixed,false);
for(const path of ['extra.json','assets/secret.txt','assets/another.js','agents/extra.network.json','retired/index.html'])assert.throws(()=>exactInventory([...dst,path],callerFixed,true));
assert.throws(()=>exactInventory(dst.filter(p=>p!=='offline.html'),callerFixed,true));
// Bounded, value-redacting defense against accidental embedded credentials.
// This does not read actual secrets or claim to detect arbitrary encodings.
const secretRules=[
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/],
 ['provider-token',/(?:sk-(?:proj-|or-v1-|svcacct-)?[A-Za-z0-9_-]{24,}|gsk_[A-Za-z0-9]{30,}|AIza[A-Za-z0-9_-]{35})/],
 ['github-token',/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
 ['aws-access-id',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
 ['literal-bearer',/\bBearer [A-Za-z0-9._~-]{24,}\b/],
 ['literal-secret-assignment',/\b(?:SUTRA_PROVIDER_KEY|GEMINI_API_KEY|GROQ_API_KEY|OPENROUTER_API_KEY|OPENAI_API_KEY|CLOUDFLARE_API_TOKEN)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{20,}/i],
 ['build-canary',/SUTRA_BUILD_SECRET_CANARY_[A-Z0-9]{24,}/]
];
function assertNoSecret(bytes,path){
 const raw=bytes.toString('latin1');
 for(const [rule,pattern] of secretRules)if(pattern.test(raw))throw Error('Refused potential embedded credential: '+path+' ('+rule+')');
}
for(const token of ['-----BEGIN PRIVATE KEY-----','sk-'+'a'.repeat(32),'gsk_'+'a'.repeat(40),'AIza'+'a'.repeat(35),'ghp_'+'a'.repeat(36),'AKIA'+'A'.repeat(16),'Bearer '+'A'.repeat(32),'SUTRA_PROVIDER_KEY="'+'A'.repeat(32)+'"','SUTRA_BUILD_SECRET_CANARY_'+'A'.repeat(32)]){
 assert.throws(()=>assertNoSecret(Buffer.from('prefix '+token+' suffix'),'synthetic.txt'),e=>e.message.includes('Refused potential embedded credential')&&!e.message.includes(token));
}
for(const [dir,files] of [[candidate,dst],[guide,peer]])for(const path of files)assertNoSecret(await read(dir,path),path);
assert.match((await read(guide,'index.html')).toString(),/Engineering fixture\./);
assert.equal((await json(guide,'peer.config.json')).production_status,'proposed_not_deployed');
console.log('PASS: closed public file inventory, bounded file/byte count, nine redacted credential-canary controls, and explicit fixture qualification.');
const callerManifest=await json(candidate,'agents/agent-manifest.json'),guideManifest=await json(guide,'agents/agent-manifest.json');
requirePublication(dst,callerManifest,callerNetworks,index,true);
requirePublication(peer,guideManifest,guideNetworks,(await read(guide,'index.html')).toString(),false);
const callerLinks=await json(candidate,'agents/links.json');
assert.deepEqual(callerLinks,{version:1,networks:{peer_investigation:{guide_peer:GUIDE_ORIGIN+'/agents/checklist'}}});
for(const [name,frontMan,hocon] of callerNetworks){
 let graph=await json(candidate,'agents/'+hocon.slice(2));
 if(name==='peer_investigation'){
  // This graph deliberately delegates from one local front to a separately published two-agent guide.
  assert.equal(graph.tools.length,1,'Unexpected peer caller graph shape');
  graph=resolveSymbolicPeerLinks(graph,callerLinks,name);
  assert.deepEqual(graph.tools[0].tools,[GUIDE_ORIGIN+'/agents/checklist']);
 }else assert.ok(graph.tools.length>=2,'Missing functional local agent pair');
 assert.equal(compileNetwork(graph,{name,frontMan,allowPeers:name==='peer_investigation',allowWorkspaceEvidence:name==='reviewed_investigation'}).frontMan,frontMan);
}
const guideGraph=await json(guide,'agents/checklist.network.json');
assert.ok(guideGraph.tools.length>=2);
assert.equal(compileNetwork(guideGraph,{name:'checklist',frontMan:'checklist'}).frontMan,'checklist');
assert.match(guideGraph.metadata.description,/synthetic|provenance is pending/i,'Guide fixture must remain labelled');
for(const absent of ['agents/agent-manifest.json','agents/links.json','agents/peer-investigation.network.json','support-lattice.wasm','sutra-proof-verifier.pyz']){
 assert.throws(()=>requirePublication(dst.filter(p=>p!==absent),callerManifest,callerNetworks,index,true),/Missing public artifact/);
}
for(const extra of ['.env.local','assets/private.key','detour/index.html','media/fixture.mp4','assets/index.js.map']){
 assert.throws(()=>requirePublication([...dst,extra],callerManifest,callerNetworks,index,true),/Forbidden publication path/);
}
assert.throws(()=>requirePublication(dst,{...callerManifest,networks:callerManifest.networks.slice(1)},callerNetworks,index,true),/Publication identity drift/);
assert.throws(()=>requirePublication(dst,callerManifest,callerNetworks,index.replace(/<script\b[^>]*\btype=["']module["'][^>]*>/g,''),true),/runtime entry/);
console.log('Verified exact caller/guide publication contracts, all four resolved graphs and twelve negative artifact cases.');
for(const file of ['sutra-proof-verifier.pyz','sutra-proof-verifier.pyz.sha256'])assert.ok(src.includes(file)&&dst.includes(file),file);
const verifier=await read(candidate,'sutra-proof-verifier.pyz');assert.equal((await read(candidate,'sutra-proof-verifier.pyz.sha256')).toString(),'sha256:'+digest(verifier)+'\n');assert.match(index,/Debugger for conclusions/);assert.match(index,/KNOWLEDGE COMPILER/);
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
