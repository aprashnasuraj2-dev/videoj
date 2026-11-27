// Offline candidate identity and restoration check; never deploys or reads credentials.
import {readFile,readdir,lstat,writeFile} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {parseUniqueJson} from '../../packages/sutra-consent/strict-json.js';
const digest=b=>createHash('sha256').update(b).digest('hex');
const labels=['pages','guide','worker','functions','policy'];
const forbidden=/(^|\/)(\.env(?:\.|$)|node_modules|\.git|\.wrangler)(\/|$)|\.(pem|key|p12)$/i;
const maxBytes=128*1024*1024,maxFiles=1024;
const secretRules=[
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/],
 ['provider-token',/(?:sk-(?:proj-|or-v1-|svcacct-)?[A-Za-z0-9_-]{24,}|gsk_[A-Za-z0-9]{30,}|AIza[A-Za-z0-9_-]{35})/],
 ['github-token',/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
 ['aws-access-id',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
 ['literal-bearer',/\bBearer [A-Za-z0-9._~-]{24,}\b/],
 ['literal-secret-assignment',/\b(?:SUTRA_PROVIDER_KEY|GEMINI_API_KEY|GROQ_API_KEY|OPENROUTER_API_KEY|OPENAI_API_KEY|CLOUDFLARE_API_TOKEN)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{20,}/i],
 ['build-canary',/SUTRA_BUILD_SECRET_CANARY_[A-Z0-9]{24,}/]
];
export function assertNoSecret(bytes,path){
 const raw=bytes.toString('latin1');
 for(const [rule,pattern] of secretRules)if(pattern.test(raw))throw Error('Refused potential embedded credential: '+path+' ('+rule+')');
}

export async function fingerprint(revision,roots){
 assert.match(revision,/^[a-f0-9]{40}$/);
 assert.deepEqual(Object.keys(roots).sort(),[...labels].sort());
 const entries=[];let total=0;
 for(const label of labels){
  const base=resolve(roots[label]);
  async function walk(p,rel){
   const s=await lstat(p);assert.ok(!s.isSymbolicLink(),'Symbolic link refused');
   if(rel)assert.ok(!forbidden.test(rel),'Sensitive path refused');
   if(s.isDirectory()){
    for(const name of (await readdir(p)).sort())await walk(resolve(p,name),relative(base,resolve(p,name)).split(sep).join('/'));
   }else{
    assert.ok(s.isFile(),'Non-regular file refused');
    assert.ok(entries.length<maxFiles&&s.size<=maxBytes-total,'Candidate bound exceeded');
    const bytes=await readFile(p);assert.equal(bytes.length,s.size);
    assertNoSecret(bytes,label+'/'+(rel||'artifact'));
    total+=bytes.length;entries.push({component:label,path:rel||'artifact',bytes:bytes.length,sha256:digest(bytes)});
   }
  }
  await walk(base,'');assert.ok(entries.some(e=>e.component===label),'Empty component');
 }
 return {schema:'sutra-candidate-fingerprint/v1',revision,entries,totalBytes:total,authority:'NONE'};
}
export const encode=record=>{const bytes=Buffer.from(JSON.stringify(record,null,2)+'\n');assert.ok(bytes.length<=262144,'Manifest bound exceeded');return bytes;};
export async function verifyFingerprint({manifest,pin,revision,roots}){
 assert.match(pin,/^[a-f0-9]{64}$/);assert.equal(digest(manifest),pin,'Manifest digest mismatch');
 const stored=parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(manifest),{maxChars:262144,maxDepth:12});
 assert.equal(stored.revision,revision,'Revision mismatch');
 const actual=await fingerprint(revision,roots);
 assert.deepEqual(stored,actual,'Candidate bytes or inventory changed');
 return {status:'matched',revision,files:actual.entries.length,bytes:actual.totalBytes,authority:'NONE',qualification:'Offline artifact identity only; no deployed rollback or data-migration verification.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,revision,manifestPath,pinPath,pages,guide,worker,functions,policy]=process.argv.slice(2);
 assert.equal(process.argv.length,11);
 const roots={pages,guide,worker,functions,policy};
 if(mode==='create'){
  const bytes=encode(await fingerprint(revision,roots));
  await writeFile(manifestPath,bytes,{flag:'wx'});await writeFile(pinPath,digest(bytes)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:'recorded',revision,sha256:digest(bytes),authority:'NONE'}));
 }else if(mode==='verify'){
  console.log(JSON.stringify(await verifyFingerprint({manifest:await readFile(manifestPath),pin:(await readFile(pinPath,'utf8')).trim(),revision,roots})));
 }else throw Error('Expected create or verify');
}
