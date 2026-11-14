/** Repeatable compressed-size inventory with explicit adoption boundaries. */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const root=resolve('dist');
if(!existsSync(root))throw Error('dist/ absent; run npm run build first');
const compressed=bytes=>({rawBytes:bytes.byteLength,gzipBytes:gzipSync(bytes,{level:9}).byteLength,brotliBytes:brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).byteLength});
const joinSources=paths=>Buffer.concat(paths.flatMap(path=>[Buffer.from('/* '+path+' */\n'),readFileSync(path),Buffer.from('\n')]));
const group=(methodology,paths)=>({methodology,files:paths,...compressed(joinSources(paths))});

const playerCss=['src/video/dhago.css'];
const playerBehavior=['src/create-player.ts','src/video/skin.ts','src/video/living-loom.ts','src/video/stream-history.ts','src/video/metadata-lanes.ts','src/video/skin.html'];
const playerFiles=[...playerCss,...playerBehavior];
const ribbonFiles=['src/ribbon/ribbon.ts','src/ribbon/ribbon.css'];
const stressFiles=['src/stress-lab/harness.ts','apps/preview/src/stress-loader.ts','apps/preview/src/stress.ts','apps/preview/src/stress.css','apps/preview/stress.html','apps/preview/public/stress-sw.js'];

const player=group('DHAGO-authored player CSS, TypeScript and HTML template concatenated and compressed as one stream; excludes @videojs/html runtime/scaffold, demo application, media and screenshots',playerFiles);
player.css={files:playerCss,...compressed(joinSources(playerCss))};
player.behaviorAndTemplate={files:playerBehavior,...compressed(joinSources(playerBehavior))};
const ribbon=group('Host-neutral reusable ribbon TypeScript + CSS only; excludes demo host, media and Video.js',ribbonFiles);
const stressLab=group('Authored Stress Lab application source: portable harness, isolated browser loader, DHAGO specimen controller, route CSS/HTML and fixture service worker; excludes player/runtime dependencies and media',stressFiles);

const files=[];
const walk=p=>{for(const item of readdirSync(p).sort()){const absolute=join(p,item);if(statSync(absolute).isDirectory())walk(absolute);else if(/\.(js|css)$/.test(item)){const bytes=readFileSync(absolute);files.push({path:relative(root,absolute).replaceAll('\\','/'),...compressed(bytes)})}}};
walk(root);files.sort((a,b)=>b.gzipBytes-a.gzipBytes);
const sum=key=>files.reduce((n,x)=>n+x[key],0);
const totalGzip=sum('gzipBytes'),target=550_000;
const data={
  dhagoPlayerAuthoredLayer:player,
  portableAuthoredLayer:player,
  reusableRibbon:ribbon,
  stressLabApplication:stressLab,
  emittedDemoBuild:{
    methodology:'all emitted JavaScript and CSS in the full multi-page Vite demo build; each file compressed independently',
    warning:'sum of all output chunks is not a real one-page download and is not the reusable skin alone',
    generatedFrom:'current dist/ directory',
    totalJsCssRawBytes:sum('rawBytes'),
    totalJsCssGzipBytes:totalGzip,
    totalJsCssBrotliBytes:sum('brotliBytes'),
    informationalBudgetGzipBytes:target,
    informationalBudgetMet:totalGzip<=target,
    assets:files
  }
};
writeFileSync(join(root,'dhago-size.json'),JSON.stringify(data,null,2)+'\n');
const fmt=x=>(x/1024).toFixed(1)+' KiB';
console.log('[DHAGO/size] player '+fmt(player.rawBytes)+' raw / '+fmt(player.gzipBytes)+' gzip / '+fmt(player.brotliBytes)+' brotli.');
console.log('[DHAGO/size] ribbon '+fmt(ribbon.rawBytes)+' raw / '+fmt(ribbon.gzipBytes)+' gzip / '+fmt(ribbon.brotliBytes)+' brotli.');
console.log('[DHAGO/size] Stress Lab '+fmt(stressLab.rawBytes)+' raw / '+fmt(stressLab.gzipBytes)+' gzip / '+fmt(stressLab.brotliBytes)+' brotli.');
console.log('[DHAGO/size] full multi-page JS+CSS '+fmt(sum('rawBytes'))+' raw / '+fmt(totalGzip)+' gzip / '+fmt(sum('brotliBytes'))+' brotli; not a one-page transfer.');
if(totalGzip>target)console.warn('[DHAGO/size] Whole-build informational budget exceeded; inspect optional chunks.');
