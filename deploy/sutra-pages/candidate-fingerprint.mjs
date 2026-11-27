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
const maxBytes=128*1024*1024,maxFiles=4096;
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
    total+=bytes.length;entries.push({component:label,path:rel||'artifact',bytes:bytes.length,sha256:digest(bytes)});
   }
  }
  await walk(base,'');assert.ok(entries.some(e=>e.component===label),'Empty component');
 }
 return {schema:'sutra-candidate-fingerprint/v1',revision,entries,totalBytes:total,authority:'NONE'};
}
export const encode=record=>Buffer.from(JSON.stringify(record,null,2)+'\n');
export async function verifyFingerprint({manifest,pin,revision,roots}){
 assert.match(pin,/^[a-f0-9]{64}$/);assert.equal(digest(manifest),pin,'Manifest digest mismatch');
 const stored=parseUniqueJson(new TextDecoder('utf-8',{fatal:true}).decode(manifest),{maxChars:2*1024*1024,maxDepth:12});
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
