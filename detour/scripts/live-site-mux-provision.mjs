import { mkdir, writeFile } from 'node:fs/promises';

const id = process.env.MUX_TOKEN_ID;
const secret = process.env.MUX_TOKEN_SECRET;
if (!id || !secret) throw new Error('Configure MUX_TOKEN_ID and MUX_TOKEN_SECRET repository secrets');

const sourceUrl = 'https://svs.gsfc.nasa.gov/vis/a000000/a004100/a004185/apollo11_flyover_360p30.mp4';
const marker = 'aafnai-patro-apollo11-visual-history-v1';
const outputPath = 'detour/.mux/live-site.json';

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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function findByPassthrough() {
  for (let page = 1; page <= 100; page += 1) {
    const assets = await api('assets?limit=100&page=' + page);
    const found = assets.find(asset => asset.passthrough === marker);
    if (found) return found;
    if (assets.length < 100) return null;
  }
  throw new Error('Mux asset inventory exceeded 10,000 items; aborting dedupe scan');
}

async function waitForReady(assetId) {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const asset = await api('assets/' + assetId);
    if (asset.status === 'ready') return asset;
    if (asset.status === 'errored') throw new Error('Mux editorial asset processing failed');
    await sleep(3000);
  }
  throw new Error('Timed out waiting for editorial Mux asset');
}

async function waitForStatic(assetId) {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const asset = await api('assets/' + assetId);
    const rendition = asset.static_renditions?.files?.find(file =>
      file.name === 'highest.mp4' || file.resolution === 'highest'
    );
    if (rendition?.status === 'ready') return { asset, rendition };
    if (rendition?.status === 'errored') throw new Error('Mux editorial static rendition failed');
    await sleep(3000);
  }
  throw new Error('Timed out waiting for editorial Mux static rendition');
}

let asset = await findByPassthrough();
const reusedAsset = Boolean(asset);

if (!asset) {
  asset = await api('assets', 'POST', {
    inputs: [{ url: sourceUrl }],
    playback_policies: ['public'],
    video_quality: 'basic',
    passthrough: marker,
    static_renditions: [{ resolution: 'highest', passthrough: marker }],
    meta: {
      title: 'Aafnai Patro — Apollo 11 Visual History',
      external_id: marker,
    },
  });
}

if (asset.status !== 'ready') asset = await waitForReady(asset.id);

let playbackId = asset.playback_ids?.find(item => item.policy === 'public')?.id;
if (!playbackId) {
  playbackId = (await api('assets/' + asset.id + '/playback-ids', 'POST', { policy: 'public' })).id;
}
if (!playbackId) throw new Error('Editorial Mux public Playback ID unavailable');

let rendition = asset.static_renditions?.files?.find(file =>
  file.name === 'highest.mp4' || file.resolution === 'highest'
);
if (!rendition) {
  await api('assets/' + asset.id + '/static-renditions', 'POST', {
    resolution: 'highest',
    passthrough: marker,
  });
}
({ asset, rendition } = await waitForStatic(asset.id));

const staticMp4Url = `https://stream.mux.com/${playbackId}/highest.mp4`;
const posterUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=12`;
const probe = await fetch(staticMp4Url, {
  headers: { Range: 'bytes=0-1023' },
  signal: AbortSignal.timeout(30000),
});
const bytes = (await probe.arrayBuffer()).byteLength;
if (![200, 206].includes(probe.status) || bytes < 1024) {
  throw new Error(`Editorial Mux static probe failed (status ${probe.status}, bytes ${bytes})`);
}

const config = {
  purpose: 'aafnaipatro-on-this-day-editorial-media',
  sourceUrl,
  assetId: asset.id,
  playbackId,
  staticMp4Url,
  posterUrl,
  duration: asset.duration,
  passthrough: marker,
  reusedAsset,
};

await mkdir('detour/.mux', { recursive: true });
await writeFile(outputPath, JSON.stringify(config, null, 2) + '\n');

console.log('Aafnai Patro editorial Mux media is ready.');
console.log(JSON.stringify({
  playbackId,
  duration: asset.duration,
  staticRendition: rendition.name,
  probeStatus: probe.status,
  probeBytes: bytes,
  reusedAsset,
}));
