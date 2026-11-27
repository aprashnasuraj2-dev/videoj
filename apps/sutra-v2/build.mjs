import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readFile,copyFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const node=process.execPath;
const vite=resolve(root,'apps/sutra-v2/node_modules/vite/bin/vite.js');
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{cwd:root,stdio:'inherit',env:process.env});if(r.error)throw r.error;if(r.status!==0)throw Error('Command failed: '+cmd+' '+args.join(' '));};
if(!existsSync(vite))throw Error('Missing pinned SUTRA toolchain. Run npm ci --prefix apps/sutra-v2 first.');
run('sh',['packages/sutra-knowledge/support-lattice/build-wasm.sh']);
const privateTarget=resolve(root,process.env.SUTRA_PRIVATE_CARGO_TARGET??'tmp/private-affine-target');
run('cargo',['build','--release','--locked','--target','wasm32-unknown-unknown','--target-dir',privateTarget,
 '--manifest-path','packages/sutra-knowledge/private-affine/Cargo.toml']);
const privateBytes=await readFile(resolve(privateTarget,'wasm32-unknown-unknown/release/sutra_private_affine.wasm'));
await mkdir(resolve(here,'public'),{recursive:true});
await writeFile(resolve(here,'public/private-affine.wasm'),privateBytes);
await writeFile(resolve(here,'src/generated-private-pin.js'),
 'export const PRIVATE_WASM_SHA256='+JSON.stringify(createHash('sha256').update(privateBytes).digest('hex'))+';\n');

run(node,[vite,'build','apps/sutra-v2']);
await copyFile(resolve(here,'_headers'),resolve(here,'dist/_headers'));
run('python3',['packages/sutra-knowledge/reference/build_offline_verifier.py','apps/sutra-v2/dist']);
const html=await readFile(resolve(here,'dist/index.html'),'utf8');
if(!html.includes('SUTRA')||!html.includes('Debugger for conclusions')||!html.includes('KNOWLEDGE COMPILER'))throw Error('Built artifact is not the SUTRA v2 product entry.');
for(const file of ['dist/_headers','dist/support-lattice.wasm','dist/private-affine.wasm','dist/sutra-proof-verifier.pyz','dist/sutra-proof-verifier.pyz.sha256'])if(!existsSync(resolve(here,file)))throw Error('Missing staged V2 artifact: '+file);
console.log(JSON.stringify({product:'sutra-v2',entry:'apps/sutra-v2/dist/index.html',deployment:false}));
