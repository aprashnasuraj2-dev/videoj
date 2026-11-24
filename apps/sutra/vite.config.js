import {sutraApiPlugin} from '../../services/sutra-api/vite-plugin.js';
import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const local=x=>fileURLToPath(new URL(x,import.meta.url));
export default defineConfig({root:local('./'),plugins:[sutraApiPlugin()],base:'./',resolve:{dedupe:['@videojs/html']},server:{fs:{allow:[local('../../')]}},build:{outDir:local('./dist'),emptyOutDir:true,rollupOptions:{
 input:{app:local('./index.html'),runtime:local('./src/runtime-entry.js')},
 output:{
  entryFileNames:chunk=>chunk.name==='runtime'?'runtime/sutra-runtime.js':'assets/[name]-[hash].js',
  chunkFileNames:'assets/[name]-[hash].js',
  assetFileNames:'assets/[name]-[hash][extname]'
 }
}}});
