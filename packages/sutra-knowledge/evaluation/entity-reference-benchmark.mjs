import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import path from 'node:path';import {analyzeSemanticContext} from '../semantic-context-analyzer.js';
const rows=readFileSync(new URL('./altentities-human-reference-v1.jsonl',import.meta.url),'utf8').trim().split('\n').map(JSON.parse);
export function runEntityReferenceBenchmark(){
 const states={},domains={},splits={};let review=0;
 for(const r of rows){
  const a=analyzeSemanticContext({question:r.humanExpression,sources:[{text:r.alternativeQuestion}]}),state=a.diagnostics.find(x=>x.family==='entity_identity').state;
  states[state]=(states[state]??0)+1;domains[r.domain]??={records:0,review:0};domains[r.domain].records++;domains[r.domain].review+=state==='REVIEW_REQUIRED';
  splits[r.upstreamSplit]??={records:0,review:0};splits[r.upstreamSplit].records++;splits[r.upstreamSplit].review+=state==='REVIEW_REQUIRED';review+=state==='REVIEW_REQUIRED';
 }
 return {version:'sutra-entity-reference-benchmark/v1',records:rows.length,reviewRequired:review,reviewRate:review/rows.length,states,domains,splits,decisionAuthority:'NONE',
  boundary:'AltEntities human expressions identify one of two explicitly supplied entity candidates. This benchmark measures whether SUTRA preserves an entity-resolution obligation. It does not measure whether SUTRA selected the correct target entity.'};
}
if(fileURLToPath(import.meta.url)===path.resolve(process.argv[1]??''))console.log(JSON.stringify(runEntityReferenceBenchmark(),null,2));
