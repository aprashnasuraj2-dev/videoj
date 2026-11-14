import { readFileSync, writeFileSync } from 'node:fs';

const [lighthousePath, sizePath, outBase='test-results/submission/performance-evidence']=process.argv.slice(2);
if(!lighthousePath||!sizePath)throw new Error('Usage: node scripts/summarize-performance.mjs lighthouse.json dhago-size.json [outBase]');
const lhr=JSON.parse(readFileSync(lighthousePath,'utf8'));
const sizes=JSON.parse(readFileSync(sizePath,'utf8'));
const score=name=>Math.round((lhr.categories?.[name]?.score ?? 0)*100);
const audit=id=>lhr.audits?.[id];
const network=audit('network-requests')?.details?.items ?? [];
const resources=audit('resource-summary')?.details?.items ?? [];
const totalResource=resources.find(item=>item.resourceType==='total');
const requestCount=network.length || Number(totalResource?.requestCount) || 0;
const transfer=network.length
  ? network.reduce((sum,item)=>sum+(Number(item.transferSize)||0),0)
  : Number(totalResource?.transferSize)||0;
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
    requestCount,
    transferBytes:transfer,
  },
  portableAuthoredLayer:sizes.portableAuthoredLayer,
  dhagoPlayerAuthoredLayer:sizes.dhagoPlayerAuthoredLayer,
  reusableRibbon:sizes.reusableRibbon,
  stressLabApplication:sizes.stressLabApplication,
  emittedDemoBuild:sizes.emittedDemoBuild,
  notes:[
    'Lighthouse is a lab mobile run, so TBT is reported; INP may be unavailable without field data.',
    'Page-load transfer includes requests observed by Lighthouse and is separate from the DHAGO-authored layer.',
    'DHAGO size excludes @videojs/html runtime/scaffold, demo application, film media and screenshots.'
  ]
};
writeFileSync(outBase+'.json',JSON.stringify(metric,null,2)+'\n');
const kb=n=>n==null?'n/a':(n/1024).toFixed(1)+' kB';
const ms=n=>n==null?'n/a':Math.round(n)+' ms';
const cls=metric.lighthouseMobile.cls==null?'n/a':metric.lighthouseMobile.cls.toFixed(3);
const p=metric.dhagoPlayerAuthoredLayer;
const r=metric.reusableRibbon;
const s=metric.stressLabApplication;
const d=metric.emittedDemoBuild;
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
| Reusable ribbon raw | ${kb(r.rawBytes)} |
| Reusable ribbon gzip | ${kb(r.gzipBytes)} |
| Reusable ribbon brotli | ${kb(r.brotliBytes)} |
| Stress Lab authored app raw | ${kb(s.rawBytes)} |
| Stress Lab authored app gzip | ${kb(s.gzipBytes)} |
| Stress Lab authored app brotli | ${kb(s.brotliBytes)} |
| Full multipage emitted JS+CSS raw | ${kb(d.totalJsCssRawBytes)} |
| Full multipage emitted JS+CSS gzip | ${kb(d.totalJsCssGzipBytes)} |
| Full multipage emitted JS+CSS brotli | ${kb(d.totalJsCssBrotliBytes)} |

**Boundaries:** player, ribbon and Stress Lab are source-level authored groups compressed separately; they are not additive transfer estimates. The full multipage emitted number sums all JS/CSS chunks and is also not a one-page transfer. Video/media/screenshots are excluded from the authored groups. Lighthouse remains the separate end-to-end public page-load measurement.

**Lab limitation:** Lighthouse reports TBT. INP is only shown if the run exposes it; otherwise it remains \`n/a\` rather than being inferred.
`;
writeFileSync(outBase+'.md',md);
console.log(md);
