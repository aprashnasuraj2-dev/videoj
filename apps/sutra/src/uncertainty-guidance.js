const STATES=new Set(['missing_source','unresolved_conflict','incomparable','invalid_source','consistent_unverified']);
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
  consistent_unverified:Object.freeze({
   disposition:'unverified_match',
   label:'Structured match, truth unverified',
   nextAction:'Review semantic support and source reliability before treating the matching values as factual.'
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
