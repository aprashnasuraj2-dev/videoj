/** Repeatable compressed-size inventory.
 * The authored DHAGO layer is reported separately from Video.js, the demo app,
 * Mux media and screenshots. Whole-build output remains informational.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const root=resolve('dist');
if (!existsSync(root)) throw Error('dist/ absent; run npm run build first');

const compressed = bytes => ({
  rawBytes: bytes.byteLength,
  gzipBytes: gzipSync(bytes,{level:9}).byteLength,
  brotliBytes: brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).byteLength,
});
const joinSources = paths => Buffer.concat(paths.flatMap(path => [
  Buffer.from(`/* ${path} */\n`),
  readFileSync(path),
  Buffer.from('\n'),
]));

const authoredCssFiles=['src/video/dhago.css'];
const authoredBehaviorFiles=['src/create-player.ts','src/video/skin.ts','src/video/living-loom.ts','src/video/skin.html'];
const authoredFiles=[...authoredCssFiles,...authoredBehaviorFiles];
const portablePayload=joinSources(authoredFiles);
const cssPayload=joinSources(authoredCssFiles);
const behaviorPayload=joinSources(authoredBehaviorFiles);

const files=[];
const walk=p=>{
  for (const item of readdirSync(p).sort()) {
    const absolute=join(p,item);
    if(statSync(absolute).isDirectory())walk(absolute);
    else if (/\.(js|css)$/.test(item)){
      const bytes=readFileSync(absolute);
      files.push({path:relative(root,absolute).replaceAll('\\','/'),...compressed(bytes)});
    }
  }
};
walk(root);
files.sort((a,b)=>b.gzipBytes-a.gzipBytes);
const sum=key=>files.reduce((n,x)=>n+x[key],0);
const totalGzip=sum('gzipBytes');
const target=550_000;
const data={
  portableAuthoredLayer:{
    methodology:'DHAGO-authored CSS, TypeScript and HTML template concatenated and compressed as one stream; excludes @videojs/html runtime/scaffold, demo application, media and screenshots',
    files:authoredFiles,
    ...compressed(portablePayload),
    css:{files:authoredCssFiles,...compressed(cssPayload)},
    behaviorAndTemplate:{files:authoredBehaviorFiles,...compressed(behaviorPayload)}
  },
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
const layer=data.portableAuthoredLayer;
console.log(`[DHAGO/size] authored layer ${(layer.rawBytes/1024).toFixed(1)} KiB raw / ${(layer.gzipBytes/1024).toFixed(1)} KiB gzip / ${(layer.brotliBytes/1024).toFixed(1)} KiB brotli.`);
console.log('[DHAGO/size] Video.js runtime/scaffold, demo app, media and screenshots are excluded from that layer.');
console.log(`[DHAGO/size] full multi-page JS+CSS: ${files.length} files, ${(totalGzip/1024).toFixed(1)} KiB gzip; not a first-visit transfer.`);
console.log('[DHAGO/size] largest emitted chunks:',JSON.stringify(files.slice(0,5),null,0));
if(totalGzip>target)console.warn('[DHAGO/size] Whole-build informational budget exceeded; inspect optional chunks.');
