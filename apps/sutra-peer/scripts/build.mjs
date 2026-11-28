import {cp,mkdir,rm,copyFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import path from 'node:path';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),dist=path.join(root,'dist');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
await copyFile(path.join(root,'index.html'),path.join(dist,'index.html'));
await copyFile(path.join(root,'peer.config.json'),path.join(dist,'peer.config.json'));
await cp(path.join(root,'src'),path.join(dist,'src'),{recursive:true});
await cp(path.join(root,'public'),dist,{recursive:true});
for(const [name,source] of [["LICENSE.txt","LICENSE"],["NOTICE.txt","NOTICE"]])await copyFile(path.resolve(root,'../..',source),path.join(dist,name));
console.log('Built independent static SUTRA peer at apps/sutra-peer/dist');
