import {cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {guideCandidateHeaders,GUIDE_ORIGIN} from '../../apps/sutra-v2/static-headers.mjs';
const root=dirname(fileURLToPath(import.meta.url)),src=resolve(root,'../../apps/sutra-v2/dist'),out=resolve(root,'dist');
const privateConfig=JSON.parse(await readFile(resolve(root,'../../services/sutra-api/wrangler.private.jsonc'),'utf8'));
const intended=GUIDE_ORIGIN;
if(privateConfig.vars.SUTRA_PEER_ORIGINS!==intended||privateConfig.vars.SUTRA_ENABLE_INFERENCE!=='false'||privateConfig.workers_dev!==false||privateConfig.preview_urls!==false)throw Error('Unsafe deployment candidate configuration');
const index=await readFile(resolve(src,'index.html'),'utf8');
if(!index.includes('Investigative Learning')||!index.includes('KNOWLEDGE COMPILER'))throw Error('Pages candidate source is not SUTRA v2');
const header=await readFile(resolve(src,'_headers'),'utf8');
const candidateHeaders=guideCandidateHeaders(header);
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await cp(src,out,{recursive:true});
// Only the explicitly selected two-account candidate may contact the guide.
// The original Vite build retains its default self-only CSP.
await writeFile(resolve(out,'_headers'),candidateHeaders);
await writeFile(resolve(out,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]},null,2)+'\n');
console.log('Prepared disabled-inference Pages candidate; exact guide origin, API-only Functions routing. No deployment.');
