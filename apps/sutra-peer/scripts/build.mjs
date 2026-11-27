import {livingFixture} from '../../../packages/sutra-knowledge/examples/living-investigation.mjs';
import {exportCandidateCapsule} from '../../../packages/sutra-knowledge/candidate-capsule.js';
import {packagePeerCalculations} from '../../../packages/sutra-knowledge/candidate-peer-catalog.js';
import {parseUniqueJson} from '../../../packages/sutra-consent/strict-json.js';
import {stat} from 'node:fs/promises';
import {cp,mkdir,rm,copyFile,writeFile,readFile} from 'node:fs/promises';import {fileURLToPath,pathToFileURL} from 'node:url';import path from 'node:path';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),dist=path.join(root,'dist');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
await copyFile(path.join(root,'index.html'),path.join(dist,'index.html'));
await copyFile(path.join(root,'peer.config.json'),path.join(dist,'peer.config.json'));
await cp(path.join(root,'src'),path.join(dist,'src'),{recursive:true});
await cp(path.join(root,'public'),dist,{recursive:true});
const source=process.argv[2];
let entries, verifyPrivate;
if(source){
 const input=await stat(source);
 if(!input.isFile()||!input.size||input.size>262144)throw Error('Calculation catalog input exceeds the bounded JSON profile');
 const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await readFile(source));
 entries=parseUniqueJson(text,{maxChars:262144,maxDepth:10});
 if(!Array.isArray(entries)||entries.length<1||entries.length>16)throw Error('Expected 1–16 calculation entries');
 const workspace=path.resolve(root,'../sutra-v2');
 const moduleFile=path.join(workspace,'dist/private-affine.wasm');
 // Private proof validation is available when the canonical app was built.
 if(entries.some(item=>typeof item?.text==='string'&&Object.hasOwn(parseUniqueJson(item.text,{maxChars:32768,maxDepth:12}),'statementText'))){
  const {instantiatePrivateEngine}=await import(pathToFileURL(path.join(workspace,'src/private-wasm.js')));
  const {verifyPrivateCandidate}=await import(pathToFileURL(path.join(workspace,'src/candidate-private-proof.js')));
  const engine=await instantiatePrivateEngine(await readFile(moduleFile));
  verifyPrivate=(wire,pin)=>verifyPrivateCandidate(wire,pin,engine);
 }
}else{
 const sample=await livingFixture();
 const capsule=await exportCandidateCapsule(sample.versionText,sample.digest,'primary_view');
 entries=[{id:'synthetic_finance_example',...capsule}];
}
const catalog=await packagePeerCalculations(entries,{verifyPrivate});
const calculations=path.join(dist,'agents','calculations');
await mkdir(calculations);
for(const file of catalog.files)await writeFile(path.join(calculations,file.name),file.text);
await writeFile(path.join(calculations,'catalog.sha256'),catalog.pin+'\n');
console.log('Built independent static SUTRA peer at apps/sutra-peer/dist');
