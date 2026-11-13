// Management credentials exist only in the runner environment. Never print responses/URLs.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const id=process.env.MUX_TOKEN_ID, secret=process.env.MUX_TOKEN_SECRET;
if (!id || !secret) throw Error('Configure MUX_TOKEN_ID and MUX_TOKEN_SECRET repository secrets');
const file=await readFile('apps/preview/public/media/studies-in-thread.mp4');
const marker='dhago-'+createHash('sha256').update(file).digest('hex');
async function api(path, method='GET', body) {
 const res=await fetch('https://api.mux.com/video/v1/'+path, {method,
 headers:{Authorization:'Basic '+Buffer.from(id+':'+secret).toString('base64'),'Content-Type':'application/json'},
 body:body ? JSON.stringify(body):undefined, signal:AbortSignal.timeout(30000)});
 if (!res.ok) throw Error(`Mux API ${method} failed (${res.status}); response omitted`);
 return (await res.json()).data;
}
// Discover the exact content hash first, avoiding duplicate assets on workflow reruns.
let asset;
for(let page=1;page<=100;page++) {
 const assets=await api('assets?limit=100&page='+page);
 asset=assets.find(a=>a.passthrough===marker);
 if(asset || assets.length<100) break;
 if(page===100) throw Error('Asset inventory exceeds safety bound; no upload created');
}
if (!asset) {
 const upload=await api('uploads','POST',{new_asset_settings:{playback_policies:['public'],video_quality:'basic',passthrough:marker}});
 const put=await fetch(upload.url,{method:'PUT',body:file,signal:AbortSignal.timeout(120000)});
 if(!put.ok) throw Error(`Media upload failed (${put.status})`);
 for(let n=0;n<120;n++) {
  const state=await api('uploads/'+upload.id);
  if(state.asset_id) { asset=await api('assets/'+state.asset_id); break; }
  if(['errored','cancelled','timed_out'].includes(state.status)) throw Error('Upload did not complete');
  await new Promise(r=>setTimeout(r,3000));
 }
}
if(!asset) throw Error('Timed out waiting for asset; rerun after checking Mux');
for(let n=0;n<120 && asset.status!=='ready';n++) {
 if(asset.status==='errored') throw Error('Mux asset processing failed');
 await new Promise(r=>setTimeout(r,3000)); asset=await api('assets/'+asset.id);
}
const playbackId=asset.playback_ids?.find(p=>p.policy==='public')?.id;
if(asset.status!=='ready' || !playbackId) throw Error('Ready public playback not available');
await writeFile('apps/preview/src/media.json',JSON.stringify({playbackId,contentHash:marker},null,2)+'\n');
console.log('Ready public playback configuration saved; browser playback verification still required.');
