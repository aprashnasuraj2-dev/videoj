// Development-only selector; no auto-adoption. Conservative handling of ambiguous date attachment.
import {analyzeSemanticContext} from '../semantic-context-analyzer.js';
import {classifyTemporalAmbiguity} from './temporal-ambiguity-selector-v2.mjs';
export const VERSION='sutra-temporal-selector/v3';
export function classifyTemporalAmbiguityV3(question){
 const a=analyzeSemanticContext({question}),p=a.profile,t=p.temporalEvidence,prior=classifyTemporalAmbiguity(question);
 const out=(state,reason)=>Object.freeze({version:VERSION,state,reason,decisionAuthority:'NONE'});
 if(a.admission==='REFUSE'||t.invalidDate)return out('ABSTAIN','REFUSED_OR_INVALID_DATE');
 if(p.temporalAnchor==='MIXED_ABSOLUTE_RELATIVE')return out('ABSTAIN','MIXED_ANCHOR');
 if(p.temporalAnchor==='EXPLICIT_ABSOLUTE'){
  if(t.questionAnchors.some(x=>x.kind==='BARE_YEAR_LIKE')&&!t.attachedYears.length)return out('ABSTAIN','UNRESOLVED_YEAR_ATTACHMENT');
  return out('PREDICT_UNAMBIGUOUS','ATTACHED_OR_NAMED_DATE_CUE');
 }
 if(p.temporalAnchor==='EXPLICIT_RELATIVE')return out('PREDICT_AMBIGUOUS','RELATIVE_REFERENCE_TIME_REQUIRED');
 if(t.implicitState)return out('PREDICT_AMBIGUOUS','CHANGEABLE_STATE_WITHOUT_TIME');
 if(prior.state==='PREDICT_AMBIGUOUS')return out(prior.state,prior.reason);
 return out('ABSTAIN','INSUFFICIENT_TEMPORAL_EVIDENCE');
}
