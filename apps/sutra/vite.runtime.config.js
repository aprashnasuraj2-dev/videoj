import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const local=x=>fileURLToPath(new URL(x,import.meta.url));
export default defineConfig({
 root:local('./'),
 publicDir:false,
 resolve:{dedupe:['@videojs/html']},
 build:{
  outDir:local('./dist'),
  emptyOutDir:false,
  copyPublicDir:false,
  minify:true,
  lib:{entry:local('./src/runtime-entry.js'),formats:['es'],fileName:()=> 'runtime/sutra-runtime.js'},
  rollupOptions:{output:{inlineDynamicImports:true}}
 }
});
