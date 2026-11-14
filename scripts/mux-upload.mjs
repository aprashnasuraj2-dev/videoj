// Provision one original DHAGO film, or safely reuse a matching Mux upload/asset.
// Management credentials exist only in GitHub Actions' encrypted environment.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const id = process.env.MUX_TOKEN_ID;
const secret = process.env.MUX_TOKEN_SECRET;
if (!id || !secret) throw Error('Configure MUX_TOKEN_ID and MUX_TOKEN_SECRET repository secrets');
const sourcePath = process.env.DHAGO_MUX_SOURCE || 'apps/preview/public/media/studies-in-thread.mp4';
const outputPath = process.env.DHAGO_MUX_OUTPUT || 'apps/preview/src/media.json';
if (!['apps/preview/public/media/studies-in-thread.mp4','apps/preview/public/media/from-fibre-to-fabric.mp4'].includes(sourcePath))
  throw Error('Refusing unexpected Mux upload source');
if (!['apps/preview/src/media.json','apps/preview/src/media-fibre.json'].includes(outputPath))
  throw Error('Refusing unexpected public playback output');
const file = await readFile(sourcePath);
if (file.byteLength < 100_000) throw Error('Refusing empty or unusually small video file');
const marker = 'dhago-' + createHash('sha256').update(file).digest('hex');
const MAX_FREE_PLAN_ASSETS = 10;

async function api(path, method='GET', body) {
  const res = await fetch('https://api.mux.com/video/v1/' + path, {
    method,
    headers: {
      Authorization:'Basic '+Buffer.from(id+':'+secret).toString('base64'),
      'Content-Type':'application/json',
    },
    body:body ? JSON.stringify(body) : undefined,
    signal:AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw Error(`Mux API ${method} failed (${res.status}); response omitted`);
  return (await res.json()).data;
}
async function listAll(kind) {
  const found=[];
  for (let page=1;page<=100;page++) {
    const batch=await api(kind + '?limit=100&page=' + page);
    if (!Array.isArray(batch)) throw Error('Unexpected Mux API inventory response');
    found.push(...batch);
    if (batch.length<100) return found;
  }
  throw Error('Mux inventory exceeds safety bound; no upload created');
}
const assets = await listAll('assets');
let asset = assets.find(item=>item.passthrough===marker);
if (!asset) {
  // Mux does not create an asset until direct upload finishes. Reusing an
  // unfinished matching upload prevents accidental extra free-plan assets
  // after a runner timeout between signed-URL creation and ingest.
  const uploads=await listAll('uploads');
  const match=uploads.find(item=>item.new_asset_settings?.passthrough===marker &&
    ['waiting','asset_created'].includes(item.status));
  if (match?.status==='asset_created' && match.asset_id)
    asset=await api('assets/'+encodeURIComponent(match.asset_id));

  if (!asset) {
    if (assets.length>=MAX_FREE_PLAN_ASSETS)
      throw Error('Free-plan asset safety ceiling reached; no new Mux upload created');
    const upload=match?.status==='waiting' ? match : await api('uploads','POST',{
      new_asset_settings:{playback_policies:['public'],video_quality:'basic',passthrough:marker},
    });
    if (upload.status!=='waiting' || !upload.url ||
      !/^https:\/\/storage\.googleapis\.com\//.test(upload.url))
      throw Error('Unexpected or expired signed Mux upload URL; no second upload created');
    // Signed Google Cloud Storage URL: credentials are intentionally NOT sent.
    const put=await fetch(upload.url,{method:'PUT',body:file,signal:AbortSignal.timeout(180_000)});
    if (!put.ok) throw Error(`Media upload failed (${put.status}); reuse upload on rerun`);
    for (let n=0;n<120;n++) {
      const state=await api('uploads/'+encodeURIComponent(upload.id));
      if (state.asset_id) { asset=await api('assets/'+encodeURIComponent(state.asset_id));break; }
      if (['errored','cancelled','timed_out'].includes(state.status))
        throw Error('Mux upload ended without an asset');
      await new Promise(resolve=>setTimeout(resolve,3000));
    }
  }
}
if (!asset) throw Error('Upload still processing; rerun safely after checking Mux');
for (let n=0;n<120 && asset.status!=='ready';n++) {
  if (asset.status==='errored') throw Error('Mux asset processing failed');
  await new Promise(resolve=>setTimeout(resolve,3000));
  asset=await api('assets/'+encodeURIComponent(asset.id));
}
const playbackId=asset.playback_ids?.find(item=>item.policy==='public')?.id;
if (asset.passthrough!==marker || asset.status!=='ready' || !playbackId)
  throw Error('Exact-hash, ready public Mux playback unavailable');
if (sourcePath.endsWith('from-fibre-to-fabric.mp4') &&
  !(Number(asset.duration)>=63.9 && Number(asset.duration)<=64.2))
  throw Error('Mux duration does not match the original 64-second film');
await writeFile(outputPath,JSON.stringify({playbackId,contentHash:marker},null,2)+'\n');
console.log('Exact-hash Mux film ready. Browser playback verification is still required.');
console.log(JSON.stringify({playbackId,contentHash:marker}));
