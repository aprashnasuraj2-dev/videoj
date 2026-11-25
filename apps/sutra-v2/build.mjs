import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const node=process.execPath;
const vite=resolve(root,'apps/sutra/node_modules/vite/bin/vite.js');
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{cwd:root,stdio:'inherit',env:process.env});if(r.error)throw r.error;if(r.status!==0)throw Error('Command failed: '+cmd+' '+args.join(' '));};
if(!existsSync(vite))throw Error('Missing pinned SUTRA toolchain. Run npm ci --prefix apps/sutra first.');
run('sh',['packages/sutra-knowledge/support-lattice/build-wasm.sh']);
run(node,[vite,'build','apps/sutra-v2']);
run(node,['apps/sutra-v2/stage-lesson.mjs']);
const html=await readFile(resolve(here,'dist/index.html'),'utf8');
if(!html.includes('SUTRA')||!html.includes('Investigative Learning')||!html.includes('KNOWLEDGE COMPILER'))throw Error('Built artifact is not the SUTRA v2 product entry.');
for(const file of ['dist/_headers','dist/support-lattice.wasm','dist/content/content-profile.json','dist/content/source-catalog.json','dist/transcripts/synthetic-timing.txt','dist/media/timing-fixture.mp4'])if(!existsSync(resolve(here,file)))throw Error('Missing staged V2 artifact: '+file);
console.log(JSON.stringify({product:'sutra-v2',entry:'apps/sutra-v2/dist/index.html',legacyToolchain:'apps/sutra',deployment:false}));
