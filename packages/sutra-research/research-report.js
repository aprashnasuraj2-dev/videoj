// A readable local report of candidate evidence, not generated factual conclusions.
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\\\x60*_{}\[\]()#+!|~]/g,m=>'\\'+m).replace(/[\r\n\f]+/g,' ');
export function formatMarkdownReport(report){
 const lines=['# SUTRA autonomous research — candidate evidence','', '**Objective:** '+esc(report.objective),'','**Status:** '+esc(report.state)+' / '+esc(report.terminationReason),'','**Qualification:** '+esc(report.qualification),'','## Research methodology',''];
 for(const q of report.researchPlan?.questions??[])lines.push('- '+esc(q.question)+' — '+esc(q.status)+'; '+q.attemptedQueries+' query waves. Acceptance is not established.');
 lines.push('','## Search history','');
 for(const q of report.queries)lines.push('- '+esc(q.query)+' — '+esc(q.provider)+'; '+esc(q.reason));
 lines.push('','## Evidence excerpts','');
 for(const p of report.passages){const loc=p.locator;lines.push('- “'+esc(p.supportingText)+'” — '+esc(p.sourceId)+(loc.page?', PDF page '+loc.page:'')+', extracted-text offsets '+loc.startOffset+'–'+loc.endOffset+'.');}
 if(!report.passages.length)lines.push('No candidate evidence was admitted.');
 lines.push('','## Potential numerical discrepancies','');
 const numbers=new Map((report.evidenceIndex?.numericObservations??[]).map(x=>[x.id,x]));
 for(const c of report.evidenceIndex?.numericComparisons??[]){const a=numbers.get(c.left),b=numbers.get(c.right);if(a&&b)lines.push('- '+esc(a.exactText)+' ('+esc(a.sourceId)+') versus '+esc(b.exactText)+' ('+esc(b.sourceId)+'); '+esc(c.reason));}
 if(!report.evidenceIndex?.numericComparisons?.length)lines.push('No narrowly matched discrepancy was detected; this is not evidence of agreement.');
 lines.push('','## Source inventory','');
 for(const d of report.documents)lines.push('- '+esc(d.id)+': '+esc(d.url)+(d.finalUrl&&d.finalUrl!==d.url?' → '+esc(d.finalUrl):'')+' — '+esc(d.mediaType)+'; digest '+esc(d.textDigest)+(d.extractionTruncated?' (extraction truncated)':'')+'.');
 lines.push('','## Gaps and reservations','', 'Unmatched objective terms: '+esc(report.coverage.unmatchedTerms.join(', ')||'none (lexical diagnostic only)')+'.','', 'Searches reserved: '+report.usage.searches+'; documents reserved: '+report.usage.documents+'; response bytes reserved: '+report.usage.reservedBytes+'; estimated cost micros reserved: '+report.usage.reservedCostMicros+'.','', 'Source independence, empirical truth, causal conclusions and final vendor cost remain unverified.','');
 return lines.join('\n');
}
