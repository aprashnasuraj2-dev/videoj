import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const local=x=>fileURLToPath(new URL(x,import.meta.url));
export default defineConfig({root:local('./'),base:'./',resolve:{dedupe:['@videojs/html']},server:{fs:{allow:[local('../../')]}},build:{outDir:local('./dist'),emptyOutDir:true}});
