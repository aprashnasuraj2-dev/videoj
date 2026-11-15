import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { preview } from 'vite';

const root = new URL('../', import.meta.url);
const videoPath = fileURLToPath(new URL('public/showcase/detour-showcase-v1.mp4', root));
const posterPath = fileURLToPath(new URL('public/showcase/detour-showcase-v1-poster.jpg', root));
const captionsPath = fileURLToPath(new URL('public/showcase/detour-showcase-v1.vtt', root));
const manifestPath = fileURLToPath(new URL('public/showcase/detour-showcase-v1.json', root));

function probe(path) {
  return JSON.parse(execFileSync('ffprobe', [
    '-v','error','-show_streams','-show_format','-of','json',path,
  ], { encoding:'utf8' }));
}

function frameHash(seconds) {
  const out=execFileSync('ffmpeg',[
    '-nostdin','-loglevel','error','-ss',String(seconds),'-i',videoPath,
    '-frames:v','1','-f','framemd5','-',
  ],{encoding:'utf8'});
  return out.split('\n').find(line=>/^0,/.test(line))?.split(',').at(-1)?.trim();
}

test('071/072 procedural showcase has deterministic provenance, usable A/V and distinct reveal frames', () => {
  for (const path of [videoPath,posterPath,captionsPath,manifestPath]) {
    assert.ok(existsSync(path), `Missing generated showcase asset: ${path}`);
    assert.ok(statSync(path).size>0, `Empty generated showcase asset: ${path}`);
  }
  const info=probe(videoPath);
  const video=info.streams.find(stream=>stream.codec_type==='video');
  const audio=info.streams.find(stream=>stream.codec_type==='audio');
  assert.equal(video?.codec_name,'h264');
  assert.equal(video?.width,1280);
  assert.equal(video?.height,720);
  assert.equal(audio?.codec_name,'aac');
  assert.equal(Number(audio?.sample_rate),48000);
  assert.ok(Number(info.format.duration)>=55.9&&Number(info.format.duration)<=56.1);
  const bytes=readFileSync(videoPath);
  const moov=bytes.indexOf(Buffer.from('moov'));
  const mdat=bytes.indexOf(Buffer.from('mdat'));
  assert.ok(moov>=0&&mdat>=0&&moov<mdat,`Expected fast-start moov before media data, got moov=${moov}, mdat=${mdat}`);
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  assert.equal(manifest.exploredMomentSeconds,18);
  assert.equal(manifest.keptMomentSeconds,42);
  assert.match(manifest.provenance,/no source footage/i);
  const vtt=readFileSync(captionsPath,'utf8');
  assert.match(vtt,/00:00:16\.000 --> 00:00:25\.000/);
  assert.match(vtt,/00:00:38\.000 --> 00:00:47\.000/);
  const explored=frameHash(18);
  const kept=frameHash(42);
  assert.ok(explored&&kept&&explored!==kept,`Expected visibly distinct encoded frames, got ${explored} / ${kept}`);
});

let server;
let browser;
before(async()=>{
  server=await preview({preview:{host:'127.0.0.1',port:0}});
  browser=await chromium.launch({args:['--no-sandbox']});
});
after(async()=>{await browser?.close();await server?.close();});

test('072 generated showcase seeks through a fresh local HTTP browser mount', {timeout:30000}, async t => {
  const page=await browser.newPage({viewport:{width:960,height:720}});
  try {
    const base=server.resolvedUrls.local[0];
    await page.goto(base);
    await page.evaluate(()=>{
      const video=document.createElement('video');
      video.id='phase8-media';
      video.preload='auto';
      video.src=new URL('showcase/detour-showcase-v1.mp4',document.baseURI).href;
      document.body.append(video);
    });
    await page.waitForFunction(()=>document.querySelector('#phase8-media')?.readyState>=2);
    const seek=async seconds=>{
      await page.locator('#phase8-media').evaluate((media,time)=>new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('seek timeout')),5000);
        media.addEventListener('seeked',()=>{clearTimeout(timer);resolve();},{once:true});
        media.currentTime=time;
      }),seconds);
      return page.locator('#phase8-media').evaluate(media=>media.currentTime);
    };
    const at18=await seek(18);
    const at42=await seek(42);
    assert.ok(Math.abs(at18-18)<0.25&&Math.abs(at42-42)<0.25,`Local HTTP seeks: ${at18}, ${at42}`);
    const fetches=await page.evaluate(async()=>{
      const urls=['showcase/detour-showcase-v1-poster.jpg','showcase/detour-showcase-v1.vtt','showcase/detour-showcase-v1.json'];
      return Promise.all(urls.map(async url=>({url,status:(await fetch(new URL(url,document.baseURI))).status})));
    });
    assert.ok(fetches.every(item=>item.status===200),JSON.stringify(fetches));
    t.diagnostic(`Local HTTP showcase seeks: ${at18.toFixed(3)}s → ${at42.toFixed(3)}s; HTTPS qualification remains a release gate.`);
  } finally {await page.close();}
});

test('073 public root exposes the showcase player in the first mobile viewport without a gate', { timeout:30000 }, async t => {
  for (const viewport of [{width:320,height:640},{width:375,height:667},{width:1280,height:900}]) {
    const page=await browser.newPage({viewport});
    try {
      await page.goto(server.resolvedUrls.local[0]);
      await page.locator('.detour-hold:enabled').waitFor();
      const player=await page.locator('.detour').boundingBox();
      assert.ok(player.y<120,`Player starts too low at ${viewport.width}px: y=${player.y}`);
      assert.ok(player.y<viewport.height&&player.y+Math.min(player.height,120)<viewport.height,
        `Player is not meaningfully visible in initial viewport ${JSON.stringify({viewport,player})}`);
      assert.equal(await page.locator('video').evaluate(v=>v.paused),true,'Judge demo must not autoplay');
      assert.match(await page.locator('video').getAttribute('src'),/showcase\/detour-showcase-v1\.mp4$/);
      assert.match(await page.locator('video').getAttribute('poster'),/showcase\/detour-showcase-v1-poster\.jpg$/);
      assert.equal(await page.locator('dialog').count(),0);
      assert.equal(await page.locator('input[type="password"]').count(),0);
      assert.ok(await page.getByRole('button',{name:'Keep my place'}).isVisible());
    } finally {await page.close();}
  }
  t.diagnostic('Public root checked at 320×640, 375×667 and 1280×900: showcase player appears immediately, paused, with no sign-in/gate.');
});
