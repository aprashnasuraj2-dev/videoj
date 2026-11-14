import { readFileSync, writeFileSync } from 'node:fs';

const [lighthousePath, sizePath, outBase='test-results/submission/performance-evidence']=process.argv.slice(2);
if(!lighthousePath||!sizePath)throw new Error('Usage: node scripts/summarize-performance.mjs lighthouse.json dhago-size.json [outBase]');
const lhr=JSON.parse(readFileSync(lighthousePath,'utf8'));
const sizes=JSON.parse(readFileSync(sizePath,'utf8'));
const score=name=>Math.round((lhr.categories?.[name]?.score ?? 0)*100);
const audit=id=>lhr.audits?.[id];
const network=audit('network-requests')?.details?.items ?? [];
const transfer=network.reduce((sum,item)=>sum+(Number(item.transferSize)||0),0);
const metric={
  measuredAt:new Date().toISOString(),
  url:lhr.finalDisplayedUrl ?? lhr.finalUrl,
  lighthouseMobile:{
    performance:score('performance'),
    accessibility:score('accessibility'),
    bestPractices:score('best-practices'),
    seo:score('seo'),
    lcpMs:audit('largest-contentful-paint')?.numericValue ?? null,
    cls:audit('cumulative-layout-shift')?.numericValue ?? null,
    tbtMs:audit('total-blocking-time')?.numericValue ?? null,
    inpMs:audit('interaction-to-next-paint')?.numericValue ?? null,
    requestCount:network.length,
    transferBytes:transfer,
  },
  portableAuthoredLayer:sizes.portableAuthoredLayer,
  notes:[
    'Lighthouse is a lab mobile run, so TBT is reported; INP may be unavailable without field data.',
    'Page-load transfer includes requests observed by Lighthouse and is separate from the DHAGO-authored layer.',
    'DHAGO size excludes @videojs/html runtime/scaffold, demo application, Mux media and screenshots.'
  ]
};
writeFileSync(outBase+'.json',JSON.stringify(metric,null,2)+'\n');
const kb=n=>n==null?'n/a':(n/1024).toFixed(1)+' kB';
const ms=n=>n==null?'n/a':Math.round(n)+' ms';
const cls=metric.lighthouseMobile.cls==null?'n/a':metric.lighthouseMobile.cls.toFixed(3);
const p=metric.portableAuthoredLayer;
const md=`# DHAGO final performance / size evidence

| Metric | Measured value |
| --- | ---: |
| Lighthouse mobile Performance | ${metric.lighthouseMobile.performance} |
| Accessibility | ${metric.lighthouseMobile.accessibility} |
| Best Practices | ${metric.lighthouseMobile.bestPractices} |
| SEO | ${metric.lighthouseMobile.seo} |
| LCP | ${ms(metric.lighthouseMobile.lcpMs)} |
| CLS | ${cls} |
| TBT | ${ms(metric.lighthouseMobile.tbtMs)} |
| INP | ${ms(metric.lighthouseMobile.inpMs)} |
| Page-load requests observed | ${metric.lighthouseMobile.requestCount} |
| Page-load transfer observed | ${kb(metric.lighthouseMobile.transferBytes)} |
| DHAGO authored layer raw | ${kb(p.rawBytes)} |
| DHAGO authored layer gzip | ${kb(p.gzipBytes)} |
| DHAGO authored layer brotli | ${kb(p.brotliBytes)} |

**Boundary:** the DHAGO authored-layer number is the custom CSS, TypeScript and HTML template compressed as one stream. It excludes the Video.js runtime/scaffold, demo application, Mux media and screenshots. The Lighthouse transfer figure is the separate end-to-end public page-load measurement.

**Lab limitation:** Lighthouse reports TBT. INP is only shown if the run exposes it; otherwise it remains \`n/a\` rather than being inferred.
`;
writeFileSync(outBase+'.md',md);
console.log(md);
