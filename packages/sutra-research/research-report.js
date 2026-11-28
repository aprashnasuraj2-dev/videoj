// A readable local report of candidate evidence, not generated factual conclusions.
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\\\x60*_{}\[\]()#+!|~]/g,m=>'\\'+m).replace(/[\r\n\f]+/g,' ');
export function formatMarkdownReport(report){
 const lines=['# SUTRA autonomous research — candidate evidence','', '**Objective:** '+esc(report.objective),'','**Status:** '+esc(report.state)+' / '+esc(report.terminationReason),'','**Qualification:** '+esc(report.qualification),'','## Research methodology',''];
 for(const q of report.researchPlan?.questions??[])lines.push('- '+esc(q.question)+' — '+esc(q.status)+'; '+q.attemptedQueries+' query waves. Acceptance is not established.');
 if(report.modelConfiguration){
  lines.push('','## Model configuration','', 'Web access: '+esc(report.modelConfiguration.webAccess)+'; review configuration: '+esc(report.modelConfiguration.reviewMode)+'.');
  for(const r of report.modelConfiguration.roles)lines.push('- '+esc(r.role)+': '+esc(r.vendor)+' / '+esc(r.model));
 }
 if(report.modelOnlyAnswer)lines.push('','## Model answer without web research','',esc(report.modelOnlyAnswer.text),'','No external evidence was acquired or verified.');
 if(report.intelligence){
  lines.push('','## Reviewed candidate findings','',esc(report.intelligence.qualification),'');
  for(const c of report.intelligence.claims.filter(c=>c.publicationStatus!=='withheld_from_findings')){
   lines.push('- **'+esc(c.kind)+' / '+esc(c.reviewStatus)+':** '+esc(c.statement));
   for(const cite of c.citations)lines.push('  - “'+esc(cite.quote)+'” — '+esc(cite.sourceId)+(cite.locator.page?', page '+cite.locator.page:'')+', offsets '+cite.locator.startOffset+'–'+cite.locator.endOffset+'.');
   if(c.review){lines.push('  - Model reviewer assessment: '+esc(c.review.reason));for(const cite of c.review.citations)lines.push('    - “'+esc(cite.quote)+'” — '+esc(cite.sourceId)+', offsets '+cite.locator.startOffset+'–'+cite.locator.endOffset+'.');}
  }
  lines.push('','## Withheld or disputed candidate findings','');
  for(const c of report.intelligence.claims.filter(c=>c.publicationStatus==='withheld_from_findings'))lines.push('- '+esc(c.id)+': '+esc(c.reviewStatus)+(c.review?' — '+esc(c.review.reason):'')+'.');
  for(const g of report.intelligence.gaps)lines.push('- Model-proposed gap: '+esc(g));
  lines.push('','## Competing evidence assessments','');
  for(const c of report.intelligence.conflicts??[]){lines.push('- '+esc(c.id)+' — '+esc(c.relation)+' / '+esc(c.status)+': '+esc(c.reason));for(const x of c.citations)lines.push('  - “'+esc(x.quote)+'” — '+esc(x.sourceId)+', offsets '+x.locator.startOffset+'–'+x.locator.endOffset+'.');}
 }
 lines.push('','## Search history','');
 for(const q of report.queries)lines.push('- '+esc(q.query)+' — '+esc(q.provider)+'; '+esc(q.reason));
 lines.push('','## Evidence excerpts','');
 for(const p of report.passages){const loc=p.locator;lines.push('- “'+esc(p.supportingText)+'” — '+esc(p.sourceId)+(loc.page?', PDF page '+loc.page:'')+', extracted-text offsets '+loc.startOffset+'–'+loc.endOffset+'.');}
 if(!report.passages.length)lines.push('No candidate evidence was admitted.');
 lines.push('','## Potential numerical discrepancies','');
 const numbers=new Map((report.evidenceIndex?.numericObservations??[]).map(x=>[x.id,x]));
 for(const c of report.evidenceIndex?.numericComparisons??[]){const a=numbers.get(c.left),b=numbers.get(c.right);if(a&&b)lines.push('- '+esc(a.exactText)+' ('+esc(a.sourceId)+') versus '+esc(b.exactText)+' ('+esc(b.sourceId)+'); '+esc(c.reason));}
 if(!report.evidenceIndex?.numericComparisons?.length)lines.push('No narrowly matched discrepancy was detected; this is not evidence of agreement.');
 lines.push('','## Source lineage (independence not established)','');
 for(const g of report.evidenceIndex?.lineage?.exactTextGroups??[])lines.push('- Identical extracted text: '+g.sourceIds.map(esc).join(', ')+'; not separate independent corroboration.');
 for(const g of report.evidenceIndex?.lineage?.nearDuplicates??[])lines.push('- Potential common origin: '+esc(g.left)+' / '+esc(g.right)+'.');
 lines.push('','## Source inventory','');
 for(const d of report.documents)lines.push('- '+esc(d.id)+': '+esc(d.url)+(d.finalUrl&&d.finalUrl!==d.url?' → '+esc(d.finalUrl):'')+' — '+esc(d.mediaType)+'; digest '+esc(d.textDigest)+(d.extractionTruncated?' (extraction truncated)':'')+'.');
 lines.push('','## Gaps and reservations','', 'Unmatched objective terms: '+esc(report.coverage.unmatchedTerms.join(', ')||'none (lexical diagnostic only)')+'.','', 'Searches reserved: '+report.usage.searches+'; documents reserved: '+report.usage.documents+'; response bytes reserved: '+report.usage.reservedBytes+'; estimated cost micros reserved: '+report.usage.reservedCostMicros+'.','', 'Source independence, empirical truth, causal conclusions and final vendor cost remain unverified.','');
 return lines.join('\n');
}
