const STATES=new Set(['missing_source','unresolved_conflict','incomparable','invalid_source','matching_values_unreviewed','exact_excerpt_match_unverified']);
const ref=claim=>claim?Object.freeze({
 sourceKind:claim.sourceKind,
 sourceId:claim.sourceId,
 sourceVersion:claim.sourceVersion,
 cueId:typeof claim.cueId==='string'?claim.cueId:null,
 start:Number.isFinite(claim.start)?claim.start:null,
 end:Number.isFinite(claim.end)?claim.end:null
}):null;

export function buildUncertaintyGuidance(comparison){
 if(!comparison||typeof comparison!=='object'||!STATES.has(comparison.status))throw new TypeError('Known comparison state required.');
 const actualSources=Object.freeze([ref(comparison.video),ref(comparison.guide)].filter(Boolean));
 const map={
  missing_source:Object.freeze({
   disposition:'abstain',
   label:'Unsupported comparison',
   nextAction:'Connect or review the missing original source before deciding whether the claims agree.'
  }),
  unresolved_conflict:Object.freeze({
   disposition:'abstain',
   label:'Unresolved disagreement',
   nextAction:'Inspect the separate original excerpts and have a human reviewer resolve the disagreement; do not select a winner automatically.'
  }),
  incomparable:Object.freeze({
   disposition:'abstain',
   label:'Not comparable',
   nextAction:'Align the question and source scope before comparing these records.'
  }),
  invalid_source:Object.freeze({
   disposition:'abstain',
   label:'Invalid source record',
   nextAction:'Repair or replace the invalid source record before using it as evidence.'
  }),
  matching_values_unreviewed:Object.freeze({
   disposition:'abstain',
   label:'Matching values, agreement unreviewed',
   nextAction:'Inspect both original excerpts before describing the sources as agreeing; matching metadata alone is insufficient.'
  }),
  exact_excerpt_match_unverified:Object.freeze({
   disposition:'unverified_match',
   label:'Exact excerpt match, truth unverified',
   nextAction:'The quoted source text matches exactly; still review provenance and factual reliability before using it as truth.'
  })
 };
 const policy=map[comparison.status];
 return Object.freeze({
  status:comparison.status,
  disposition:policy.disposition,
  label:policy.label,
  nextAction:policy.nextAction,
  sourceRefs:actualSources,
  certification:'none'
 });
}
