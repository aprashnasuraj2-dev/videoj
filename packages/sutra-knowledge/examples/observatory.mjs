import {createVerifier,replayReport} from '../index.js';
import {beamGraph} from './beam.mjs';
const kernel=createVerifier();
const before=await kernel.evaluate(beamGraph());
const after=await kernel.evaluate(beamGraph('2500000000'));
const forged=before.reportText.replace('constraint_satisfied','constraint_refuted');
const find=(r,id)=>r.report.receipts.find(x=>x.id===id).outcome;
const evidence={
 scope:'synthetic deterministic engineering development demonstration; not structural safety, deployed-site or independent-consumer evidence',
 before:{outcome:find(before,'deflection_limit'),deflection:find(before,'deflection'),stats:before.stats},
 after:{outcome:find(after,'deflection_limit'),deflection:find(after,'deflection'),stats:after.stats},
 exactReplay:await replayReport(beamGraph(),before.reportText),
 forgedAccepted:await replayReport(beamGraph(),forged),
 staleAccepted:await replayReport(beamGraph('2500000000'),before.reportText)
};
if(evidence.before.outcome.status!=='constraint_satisfied'||evidence.after.outcome.status!=='constraint_refuted'||after.stats.executed.length!==5||after.stats.reused.length!==11||!evidence.exactReplay||evidence.forgedAccepted||evidence.staleAccepted)throw Error('CAPABILITY_DEMONSTRATION_FAILED');
console.log(JSON.stringify(evidence,null,2));
