import fs from 'node:fs';import {createHash} from 'node:crypto';
const dir=new URL('./vendor/nsdeploy/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('UPSTREAM.json',dir)));
for(const [name,expected]of Object.entries(manifest.files)){
 const data=fs.readFileSync(new URL(name,dir));
 if(createHash('sha256').update(data).digest('hex')!==expected.sha256||createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex')!==expected.upstream_git_blob)throw Error(`Upstream source drift: ${name}`);
}
console.log(`PASS: ${Object.keys(manifest.files).length} unchanged upstream modules at ${manifest.commit}.`);
