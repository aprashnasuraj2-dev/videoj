// Laboratory performance profile for the built static learner.
// Conditions: headless Chromium in GitHub Actions, 1280x800 viewport,
// CDP network profile = 1 Mbps down/up and 150 ms latency.
// This is not a field/mobile-network benchmark.
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const assert=require('node:assert/strict');

const mime=file=>({
 '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
 '.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.svg':'image/svg+xml',
 '.png':'image/png','.webp':'image/webp'
}[path.extname(file)]??'application/octet-stream');
const listFiles=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>
 entry.isDirectory()?listFiles(path.join(dir,entry.name)):[path.join(dir,entry.name)]);

(async()=>{
 const app=path.resolve(__dirname,'..'),dist=path.join(app,'dist'),base='http://127.0.0.1:4285';
 let servedMediaBodyBytes=0,completedMediaResponses=0,observedMediaServerRequests=0;
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  const relative=pathname==='/'?'index.html':decodeURIComponent(pathname).replace(/^\/+/, '');
  const file=path.resolve(dist,relative);
  if(!file.startsWith(dist+path.sep)&&file!==path.join(dist,'index.html')){res.writeHead(403);res.end();return;}
  try{
   const stat=fs.statSync(file);if(!stat.isFile())throw Error();
   const isMedia=pathname==='/media/timing-fixture.mp4'&&req.method==='GET';
   if(isMedia)observedMediaServerRequests++;
   res.writeHead(200,{'Content-Type':mime(file),'Content-Length':stat.size,'Cache-Control':'no-store'});
   if(isMedia)res.once('finish',()=>{servedMediaBodyBytes+=stat.size;completedMediaResponses++;});
   fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('not found');}
 });
 let browser;
 try{
  await new Promise((resolve,reject)=>server.once('error',reject).listen(4285,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  const client=await context.newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions',{
   offline:false,latency:150,downloadThroughput:125000,uploadThroughput:125000,
   connectionType:'cellular3g'
  });
  let encoded=0,mediaEncoded=0;
  const requestTypes=new Map(),urls=new Map();
  client.on('Network.responseReceived',event=>{requestTypes.set(event.requestId,event.type);urls.set(event.requestId,event.response.url);});
  client.on('Network.loadingFinished',event=>{
   const bytes=Number(event.encodedDataLength)||0;encoded+=bytes;
   if((urls.get(event.requestId)??'').includes('/media/'))mediaEncoded+=bytes;
  });
  const mediaRequests=[];page.on('request',r=>{if(r.url().includes('/media/timing-fixture.mp4'))mediaRequests.push(r.url());});

  const start=performance.now();
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.getByRole('searchbox',{name:'Search source transcript'}).waitFor();
  const transcriptMs=performance.now()-start;
  const bytesAtTranscript=encoded;
  assert.equal(mediaRequests.length,0,'text-first transcript cannot trigger MP4 download');
  assert.ok(transcriptMs<5000,`transcript usable in ${Math.round(transcriptMs)}ms exceeds 5s target`);

  await page.getByRole('searchbox',{name:'Search source transcript'}).fill('timing marker');
  assert.equal(await page.locator('#timing-transcript-panel .transcript-cue').count(),1);

  const videoStart=performance.now();
  await page.getByRole('button',{name:'Load source media'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Actual media duration: 8.0 seconds.'),null,{timeout:15000});
  const videoReadyMs=performance.now()-videoStart;
  const bytesAfterVideo=encoded;
  assert.equal(mediaRequests.length,1);
  const sourceFixture=fs.readFileSync(path.join(dist,'media/timing-fixture.mp4'));
  assert.equal(observedMediaServerRequests,1,'explicit media load creates exactly one source fixture GET');
  assert.equal(completedMediaResponses,1,'a complete source body must actually leave the lab server');
  assert.equal(servedMediaBodyBytes,sourceFixture.byteLength,'HTTP server confirms exact uncompressed fixture bytes delivered');
  assert.ok(servedMediaBodyBytes>0,'never report zero media transfer after successful native playback');

  const seekStart=performance.now();
  await page.getByRole('button',{name:'Inspect featured source cue'}).click();
  await page.waitForFunction(()=>document.querySelector('#timing-status').textContent.includes('Source cue reached.'));
  const seekMs=performance.now()-seekStart;
  assert.ok(Math.abs(await page.locator('video').evaluate(video=>video.currentTime)-2)<=1);

  // Static compressed bundle inventory: HTML/CSS/JS/JSON/VTT/SVG only; excludes MP4.
  const shellFiles=listFiles(dist).filter(file=>!['.mp4','.map'].includes(path.extname(file)));
  const shellGzip=shellFiles.reduce((sum,file)=>sum+zlib.gzipSync(fs.readFileSync(file),{level:9}).byteLength,0);
  assert.ok(shellGzip<=700*1024,`compressed shell ${shellGzip} exceeds 700 KiB target`);

  const result={
   profile:{browser:'Chromium headless',viewport:'1280x800',downMbps:1,upMbps:1,latencyMs:150},
   shellGzipBytes:shellGzip,
   transcriptUsableMs:Math.round(transcriptMs),
   encodedBytesAtTranscript:Math.round(bytesAtTranscript),
   mediaRequestsBeforeExplicitLoad:0,
   videoReadyAfterClickMs:Math.round(videoReadyMs),
   encodedBytesAfterVideo:Math.round(bytesAfterVideo),
   incrementalEncodedBytesAfterVideo:Math.round(bytesAfterVideo-bytesAtTranscript),
   mediaEncodedBytes:mediaEncoded>0?Math.round(mediaEncoded):null,
   mediaEncodedBytesObserved:mediaEncoded>0,
   sourceMediaResponseBytes:servedMediaBodyBytes,
   sourceMediaResponseCount:completedMediaResponses,
   nativeSeekFeedbackMs:Math.round(seekMs)
  };
  console.log('PERF '+JSON.stringify(result));
  console.log('PASS: 1 Mbps/150 ms lab profile keeps transcript usable <5s with zero MP4 requests, shell <=700 KiB gzip, server-confirmed positive MP4 response bytes, and native seek feedback. CDP transfer accounting is nullable when not observed.');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(()=>resolve()));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
