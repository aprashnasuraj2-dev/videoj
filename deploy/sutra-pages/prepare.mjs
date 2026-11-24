import {cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url)),src=resolve(root,'../../apps/sutra/dist'),out=resolve(root,'dist');
await readFile(resolve(src,'index.html'));await readFile(resolve(src,'_headers'));
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await cp(src,out,{recursive:true});
await writeFile(resolve(out,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]},null,2)+'\n');
