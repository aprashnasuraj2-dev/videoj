import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root=resolve('.');
const targets=[
  resolve('apps/preview'),
  resolve('submission'),
  resolve('scripts/write-final-evidence.mjs'),
];
const forbidden=[
  'github.com/aprashnasuraj2-dev/videoj',
  'aprashnasuraj2-dev/videoj',
  '"repositoryUrl"',
];
const extensions=new Set(['.html','.md','.json','.ts','.js','.mjs','.css']);
const files=[];
const ext=p=>{const i=p.lastIndexOf('.');return i>=0?p.slice(i):''};
const walk=p=>{
  if(!existsSync(p))return;
  const st=statSync(p);
  if(st.isDirectory()){
    for(const name of readdirSync(p)){
      if(['node_modules','dist','test-results'].includes(name))continue;
      walk(join(p,name));
    }
    return;
  }
  if(extensions.has(ext(p)))files.push(p);
};
targets.forEach(walk);
const leaks=[];
for(const file of files){
  const text=readFileSync(file,'utf8');
  for(const value of forbidden){
    if(text.includes(value))leaks.push(relative(root,file)+': '+value);
  }
}
if(leaks.length)throw new Error('Private-source boundary violated:\n'+leaks.join('\n'));
console.log('[DHAGO/privacy] public release + submission materials contain no private project URL.');
