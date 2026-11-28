import {readFileSync} from 'node:fs';import {AMBIGUITY_FAMILIES} from '../semantic-question-engine.js';
const alt=JSON.parse(readFileSync(new URL('./altentities-human-reference-manifest-v1.json',import.meta.url),'utf8'));
const tab=JSON.parse(readFileSync(new URL('./tab-human-ambiguity-v1/manifest.json',import.meta.url),'utf8'));
const scope=JSON.parse(readFileSync(new URL('./scope-ambiguity-human-v1/manifest.json',import.meta.url),'utf8'));
const direct={
 entity_identity:{status:'DIRECT_HUMAN_TASK_EVIDENCE',sources:[{dataset:'AltEntities',records:alt.statistics.referenceRecords,evidence:'human indirect referring expressions with target entity'},{dataset:'TAB discourse anaphora',records:21,evidence:'expert-checked ambiguous prompts with interpretations'}],limitation:'AltEntities is reference selection rather than a binary ambiguity label; TAB anaphora is visualizable discourse ambiguity.'},
 reporting_period:{status:'DIRECT_HUMAN_AMBIGUITY_LABEL',sources:[{dataset:'TempAmbiQA',records:8162,evidence:'manually labeled temporally ambiguous/unambiguous questions'}],limitation:'Temporal ambiguity is broader/narrower than every reporting-period issue in SUTRA.'},
 negation_scope:{status:'DIRECT_HUMAN_SCOPE_EVIDENCE',sources:[{dataset:'McGill scope 2A',records:58,evidence:'human-validated scope/control sentences; 29 scope targets and 29 controls'}],limitation:'Construction-level scope evidence, not a general negation-scope truth oracle.'},
 quantifier_scope:{status:'DIRECT_HUMAN_SCOPE_EVIDENCE',sources:[{dataset:'McGill scope 1B',records:837,evidence:'final human-validated scope sentences'},{dataset:'McGill scope 2B',records:218,evidence:'109 scope targets plus 109 controls'}],limitation:'Covers selected operator interactions, not all quantifier phenomena.'}
};
const related={
 metric_definition:[{dataset:'AmbiEnt category annotations',records:18,evidence:'lexical ambiguity category',limitation:'Lexical ambiguity does not establish metric-definition ambiguity.'}],
 aggregation:[{dataset:'TAB syntax conjunction + discourse ellipsis',records:172,evidence:'expert-checked linguistic ambiguity prompts',limitation:'Coordination/ellipsis is related compositional evidence, not numeric aggregation validation.'}],
 conditional_scope:[{dataset:'AmbiEnt category annotations',records:7,evidence:'scopal ambiguity category',limitation:'Category is broader than SUTRA conditional scope and is not mapped case-by-case.'}],
 modality:[{dataset:'AmbiEnt category annotations',records:42,evidence:'pragmatic ambiguity category',limitation:'Pragmatic ambiguity is not a direct modality label.'}],
 causal_vs_observational:[{dataset:'AmbiEnt category annotations',records:42,evidence:'pragmatic ambiguity category',limitation:'Pragmatic ambiguity does not establish causal-vs-observational ambiguity.'}]
};
export function buildExternalHumanEvidenceMatrix(){
 const rows=AMBIGUITY_FAMILIES.map(f=>({family:f,...(direct[f]??{status:'NO_DIRECT_HUMAN_FAMILY_EVIDENCE',sources:[],limitation:'Current direct evidence is model-authored or from an external semantic task that is not a human ambiguity label.'}),relatedSources:related[f]??[]}));
 const directFamilies=rows.filter(x=>x.status.startsWith('DIRECT_')).map(x=>x.family),gaps=rows.filter(x=>!x.status.startsWith('DIRECT_')).map(x=>x.family);
 return {version:'sutra-external-human-evidence-matrix/v1',families:rows.length,directFamilies,directFamilyCount:directFamilies.length,directCoverage:directFamilies.length/rows.length,gaps,gapCount:gaps.length,
  sourceSummary:{altEntitiesHumanReferences:alt.statistics.referenceRecords,tabMainLinguisticPrompts:tab.totalRecords,mcgillScopeBaseRows:scope.baseArtifacts.reduce((n,x)=>n+x.rows,0),tempAmbiQARecords:8162,ambientCategoryRecords:100},
  rows,boundary:'Direct coverage means an external human task or annotation directly exercises the named SUTRA family. Related linguistic datasets are listed separately and never promoted to direct family validation. Public-corpus presence does not prove model-training independence.'};
}
if(import.meta.url===new URL(process.argv[1], 'file://').href)console.log(JSON.stringify(buildExternalHumanEvidenceMatrix(),null,2));
