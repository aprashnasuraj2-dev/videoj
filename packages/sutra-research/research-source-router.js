// Bounded, deterministic discovery routing; no website/publisher domain allowlist.
// The objective influences provider priority, not what public HTTPS sites may be read.
import {DISCOVERY_BACKENDS} from './providers.js';
const fail=code=>{throw Object.assign(Error('Research router refused: '+code),{code});};
const contains=(text,pattern)=>pattern.test(text);
const patterns=Object.freeze({
 biomedical:/(?:\b(?:clinical|patient|medicine|medical|disease|treatment|cancer|health|immun|genom|protein|biomarker|vaccine|pharm|epidemiol|trial|pubmed|pmc|microbiol)\w*\b|स्वास्थ्य|चिकित्सा|रोग|औषध)/iu,
 physical:/(?:\b(?:physics|quantum|mathematics|algorithm|computer|semiconductor|engineering|artificial intelligence|machine learning|robotics|arxiv|computer science|software|network|optimization|materials|chemistry|statistics)\b|इन्जिनियरिङ|प्रविधि)/iu,
 scholarship:/(?:\b(?:paper|papers|publication|study|studies|research|citation|citations|journal|peer.review|academic|scientific|scholar|doi|literature|systematic review|meta.analysis|preprint|author|thesis|economics|sociology|history)\b|अनुसन्धान|शोध|अध्ययन|पत्रिका)/iu,
 general:/(?:\b(?:latest|today|news|current|website|product|price|travel|company|policy|laws|business|weather|stock|events|restaurant|hotel)\b|समाचार|आज|मूल्य)/iu
});
export function selectResearchBackends(objective,available,{max=5}={}){
 if(typeof objective!=='string'||!objective.trim()||!Array.isArray(available)||!Number.isSafeInteger(max)||max<1||max>8)fail('ROUTING');
 const allowed=new Set(available.filter(id=>DISCOVERY_BACKENDS.includes(id)));
 const terms=objective.toLowerCase(),isBio=contains(terms,patterns.biomedical),isPhysical=contains(terms,patterns.physical),isScholar=contains(terms,patterns.scholarship)||isBio||isPhysical,isGeneral=contains(terms,patterns.general);
 // Specialized collections are a routing priority, not an exclusive search universe.
 const priority=isBio
  ?['europepmc','openalex','crossref','semanticscholar','brave','tavily','arxiv','wikipedia']
  :isPhysical
   ?['semanticscholar','arxiv','openalex','crossref','brave','tavily','europepmc','wikipedia']
   :isScholar
    ?['openalex','crossref','semanticscholar','europepmc','arxiv','brave','tavily','wikipedia']
    :isGeneral
     ?['brave','tavily','wikipedia','openalex','crossref','semanticscholar','europepmc','arxiv']
     :['brave','tavily','openalex','crossref','semanticscholar','wikipedia','europepmc','arxiv'];
 const chosen=priority.filter(id=>allowed.has(id)).slice(0,max);
 if(!chosen.length)fail('SEARCH_UNAVAILABLE');
 const mode=isBio?'biomedical':isPhysical?'technical':isScholar?'academic':isGeneral?'general_web':'mixed';
 return Object.freeze({schema:'sutra-discovery-route/v1',mode,providers:Object.freeze(chosen),available:Object.freeze([...allowed]),scope:'public_discovery_not_fulltext_authority',sitePolicy:'any_public_https_under_existing_admission'});
}
