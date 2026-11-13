// Optional GitHub runner archive. OAuth credentials never leave process memory.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const folder='1uBHKAcUv2G8mfn3e9Q01A-F1Cp5U7RL5';
const {GOOGLE_DRIVE_CLIENT_ID:client_id,GOOGLE_DRIVE_CLIENT_SECRET:client_secret,GOOGLE_DRIVE_REFRESH_TOKEN:refresh_token}=process.env;
if(!client_id||!client_secret||!refresh_token) throw Error('Configure the three GOOGLE_DRIVE_* OAuth secrets; Mux credentials cannot authorize Google Drive');
const auth=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id,client_secret,refresh_token,grant_type:'refresh_token'}),signal:AbortSignal.timeout(30000)});
if(!auth.ok) throw Error(`Drive authentication failed (${auth.status}); response omitted`);
const {access_token}=await auth.json();
const headers={Authorization:'Bearer '+access_token};
const receipt=[];
for(const name of await readdir('handoff')) {
 if(!/^dhago-[a-z0-9-]+\.(zip|json|txt)$/.test(name)) throw Error('Unexpected archive filename; refusing upload');
 const bytes=await readFile('handoff/'+name);
 const md5=createHash('md5').update(bytes).digest('hex');
 const sha256=createHash('sha256').update(bytes).digest('hex');
 const q=`'${folder}' in parents and name = '${name}' and trashed = false`;
 const list=await fetch('https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q,fields:'files(id,name,md5Checksum,webViewLink)',spaces:'drive'}),{headers,signal:AbortSignal.timeout(30000)});
 if(!list.ok) throw Error(`Drive inventory failed (${list.status})`);
 const matches=(await list.json()).files;
 if(matches.length>1) throw Error('Ambiguous existing archive; refusing duplicate');
 let file=matches[0];
 if(file && file.md5Checksum!==md5) throw Error('Existing archive differs; use a new revision filename');
 if(!file) {
  const metadata={name,parents:[folder],description:'DHAGO development/submission candidate archive; not proof of contest submission.'};
  const session=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,md5Checksum,webViewLink,parents',{method:'POST',headers:{...headers,'Content-Type':'application/json','X-Upload-Content-Type':'application/octet-stream','X-Upload-Content-Length':String(bytes.length)},body:JSON.stringify(metadata),signal:AbortSignal.timeout(30000)});
  if(!session.ok) throw Error(`Drive upload session failed (${session.status}); response omitted`);
  const location=session.headers.get('location');
  if(!location || !new URL(location).hostname.endsWith('.googleapis.com') || new URL(location).protocol!=='https:') throw Error('Unexpected Drive upload destination');
  const res=await fetch(location,{method:'PUT',headers:{...headers,'Content-Type':'application/octet-stream'},body:bytes,signal:AbortSignal.timeout(120000)});
  if(!res.ok) throw Error(`Drive archive upload failed (${res.status}); response omitted`);
  file=await res.json();
  if(file.md5Checksum!==md5) throw Error('Drive checksum verification failed');
 }
 receipt.push({name,id:file.id,url:file.webViewLink,sha256,md5});
}
await writeFile('drive-receipt.json',JSON.stringify({folder,files:receipt},null,2)+'\n');
console.log(`Verified ${receipt.length} durable archive files; see drive-receipt.json`);
