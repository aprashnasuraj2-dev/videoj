import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const id = process.env.MUX_TOKEN_ID;
const secret = process.env.MUX_TOKEN_SECRET;
if (!id || !secret) throw new Error('Configure MUX_TOKEN_ID and MUX_TOKEN_SECRET repository secrets');

const mediaPath = 'detour/public/showcase/detour-showcase-v1.mp4';
const outputPath = 'detour/.mux/public.json';
const file = await readFile(mediaPath);
const digest = createHash('sha256').update(file).digest('hex');
const marker = 'detour-' + digest;

async function api(path, method = 'GET', body) {
  const response = await fetch('https://api.mux.com/video/v1/' + path, {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Mux API ${method} ${path} failed (${response.status}); response body omitted`);
  if (response.status === 204) return null;
  return (await response.json()).data;
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function findByPassthrough() {
  for (let page = 1; page <= 100; page += 1) {
    const assets = await api('assets?limit=100&page=' + page);
    const match = assets.find(asset => asset.passthrough === marker);
    if (match) return match;
    if (assets.length < 100) return null;
  }
  throw new Error('Mux asset inventory exceeded 10,000 items; aborting dedupe scan');
}

async function waitForAsset(assetId) {
  let asset;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    asset = await api('assets/' + assetId);
    if (asset.status === 'ready') return asset;
    if (asset.status === 'errored') throw new Error('Mux asset processing failed');
    await sleep(3000);
  }
  throw new Error('Timed out waiting for Mux asset to become ready');
}

async function waitForHighest(assetId) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const asset = await api('assets/' + assetId);
    const highest = asset.static_renditions?.files?.find(file => file.name === 'highest.mp4' || file.resolution === 'highest');
    if (highest?.status === 'ready') return { asset, highest };
    if (highest?.status === 'errored') throw new Error('Mux highest static rendition failed');
    await sleep(3000);
  }
  throw new Error('Timed out waiting for Mux highest static rendition');
}

let asset = await findByPassthrough();
let reused = Boolean(asset);

if (!asset) {
  const upload = await api('uploads', 'POST', {
    new_asset_settings: {
      playback_policies: ['public'],
      video_quality: 'basic',
      passthrough: marker,
      static_renditions: [{ resolution: 'highest' }],
      meta: { title: 'DETOUR Video.js skin showcase', external_id: marker.slice(0, 128) },
    },
  });
  const uploaded = await fetch(upload.url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': 'video/mp4' },
    signal: AbortSignal.timeout(180000),
  });
  if (!uploaded.ok) throw new Error(`Mux direct-upload PUT failed (${uploaded.status})`);

  let assetId;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const state = await api('uploads/' + upload.id);
    if (state.asset_id) {
      assetId = state.asset_id;
      break;
    }
    if (['errored', 'cancelled', 'timed_out'].includes(state.status)) throw new Error('Mux upload did not create an asset');
    await sleep(3000);
  }
  if (!assetId) throw new Error('Timed out waiting for Mux upload asset ID');
  asset = await waitForAsset(assetId);
} else if (asset.status !== 'ready') {
  asset = await waitForAsset(asset.id);
}

let playbackId = asset.playback_ids?.find(item => item.policy === 'public')?.id;
if (!playbackId) {
  const playback = await api('assets/' + asset.id + '/playback-ids', 'POST', { policy: 'public' });
  playbackId = playback.id;
  asset = await api('assets/' + asset.id);
}
if (!playbackId) throw new Error('Mux public Playback ID unavailable');

let highest = asset.static_renditions?.files?.find(item => item.name === 'highest.mp4' || item.resolution === 'highest');
if (!highest) {
  await api('assets/' + asset.id + '/static-renditions', 'POST', { resolution: 'highest', passthrough: marker });
}
({ asset, highest } = await waitForHighest(asset.id));

const staticMp4Url = `https://stream.mux.com/${playbackId}/highest.mp4`;
const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;
const posterUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=42`;

const probe = await fetch(staticMp4Url, {
  headers: { Range: 'bytes=0-1023' },
  redirect: 'follow',
  signal: AbortSignal.timeout(30000),
});
const probeBytes = (await probe.arrayBuffer()).byteLength;
if (![200, 206].includes(probe.status) || probeBytes < 1024 || !/^video\/mp4(?:;|$)/.test(probe.headers.get('content-type') || '')) {
  throw new Error(`Mux static rendition probe failed (status ${probe.status}, bytes ${probeBytes}, type omitted)`);
}

const config = {
  playbackId,
  contentHash: marker,
  staticRendition: 'highest.mp4',
  staticMp4Url,
  hlsUrl,
  posterUrl,
  sourceSha256: digest,
  sourceBytes: file.byteLength,
  reusedAsset: reused,
};
await mkdir('detour/.mux', { recursive: true });
await writeFile(outputPath, JSON.stringify(config, null, 2) + '\n');

console.log('DETOUR Mux provisioning passed: public Playback ID and highest.mp4 are ready.');
console.log(JSON.stringify({
  playbackId,
  contentHash: marker,
  staticRendition: highest.name,
  probeStatus: probe.status,
  probeBytes,
  reusedAsset: reused,
}));
