/** Repeatable compressed asset inventory for this full multi-page Vite build.
 * It deliberately does NOT mislabel all preview JS as the portable skin.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root=resolve('dist');
if (!existsSync(root)) throw Error('dist/ absent; run npm run build first');
const files=[];
const walk=p=>{
  for (const item of readdirSync(p).sort()) {
    const absolute=join(p,item);
    if(statSync(absolute).isDirectory())walk(absolute);
    else if (/\.(js|css)$/.test(item)){
      const bytes=readFileSync(absolute);
      files.push({
        path:relative(root,absolute).replaceAll('\\','/'),
        rawBytes:bytes.byteLength,
        gzipBytes:gzipSync(bytes,{level:9}).byteLength
      });
    }
  }
};
walk(root);
const sum=key=>files.reduce((n,x)=>n+x[key],0);
const totalGzip=sum('gzipBytes');
const target=550_000; // full multi-page demo estimate, not portable skin's transfer budget
const data={
  methodology:'all emitted JavaScript and CSS in full multi-page Vite build; independently gzip-9 each file',
  warning:'sum of all output chunks is not a real one-page download and not the reusable skin alone',
  generatedFrom:'current dist/ directory',
  totalJsCssGzipBytes:totalGzip,
  totalJsCssRawBytes:sum('rawBytes'),
  informationalBudgetGzipBytes:target,
  informationalBudgetMet:totalGzip<=target,
  assets:files.sort((a,b)=>b.gzipBytes-a.gzipBytes)
};
writeFileSync(join(root,'dhago-size.json'),JSON.stringify(data,null,2)+'\n');
console.log('[DHAGO/size] full multi-page JS+CSS emitted '+files.length+' files, gzip total '+(totalGzip/1024).toFixed(1)+' KiB, raw '+(sum('rawBytes')/1024).toFixed(1)+' KiB.');
console.log('[DHAGO/size] This inventory is NOT first-visit transfer nor only the exported skin.');
console.log('[DHAGO/size] largest chunks:',JSON.stringify(files.slice(0,5),null,0));
if(totalGzip>target)console.warn('[DHAGO/size] Exceeded informational whole-build budget; inspect the largest optional chunks.');
