import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const origin=(process.env.DHAGO_CANONICAL_MEDIA_ORIGIN || 'https://creative.aafnaipatro.com/').replace(/\/+$/,'')+'/';
const timeoutMs=Number(process.env.DHAGO_MEDIA_SYNC_TIMEOUT_MS || 120000);

const files=[
  {
    path:'media/from-fibre-to-fabric.mp4',
    target:'apps/preview/public/media/from-fibre-to-fabric.mp4',
    sha256:'19f1816e0161d37c9dbea8212680c0f453d1eeecf953e3073de9e685152b8815',
    bytes:22676790,
  },
  {
    path:'media/from-fibre-to-fabric.webm',
    target:'apps/preview/public/media/from-fibre-to-fabric.webm',
    sha256:'d9253c8729721c821acd2c9d25246c447c35dd347dfb9b10fe1c7d39aaa537a7',
    bytes:25572521,
  },
  {
    path:'media/from-fibre-to-fabric-captions.vtt',
    target:'apps/preview/public/media/from-fibre-to-fabric-captions.vtt',
    sha256:'e4f82eb11b6d881fc383f3780ec31d8e4f573a06cac27cd602972eaaaeefa973',
    bytes:1253,
  },
  {
    path:'media/from-fibre-to-fabric-poster.webp',
    target:'apps/preview/public/media/from-fibre-to-fabric-poster.webp',
    sha256:'6d27b49a49459aa7daa36357a8c1c5089855d1e58869a19a84ae87b15e111642',
    bytes:189282,
  },
];

const digest=buffer=>createHash('sha256').update(buffer).digest('hex');

for(const entry of files){
  const target=resolve(entry.target);
  let current=null;
  try{current=await readFile(target);}catch{}
  if(current && current.length===entry.bytes && digest(current)===entry.sha256){
    console.log('[DHAGO/media] already canonical '+entry.path);
    continue;
  }

  const url=new URL(entry.path,origin);
  const response=await fetch(url,{
    cache:'no-store',
    headers:{'Cache-Control':'no-cache'},
    signal:AbortSignal.timeout(timeoutMs),
  });
  if(!response.ok) throw new Error(`Canonical media fetch failed for ${entry.path}: HTTP ${response.status}`);
  const buffer=Buffer.from(await response.arrayBuffer());
  const hash=digest(buffer);
  if(buffer.length!==entry.bytes || hash!==entry.sha256){
    throw new Error(`Canonical media mismatch for ${entry.path}: bytes=${buffer.length}, sha256=${hash}`);
  }
  await mkdir(dirname(target),{recursive:true});
  const tmp=target+'.canonical.tmp';
  await writeFile(tmp,buffer);
  try{await rename(tmp,target);}catch(error){
    await rm(tmp,{force:true});
    throw error;
  }
  console.log(`[DHAGO/media] synced ${entry.path} (${buffer.length} bytes, sha256 ${hash})`);
}
