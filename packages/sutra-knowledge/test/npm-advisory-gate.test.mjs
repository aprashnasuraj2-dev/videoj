import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateNpmAudit,reviewedVitePatch} from '../npm-advisory-gate.js';
const clean=()=>({auditReportVersion:2,vulnerabilities:{},metadata:{vulnerabilities:{info:0,low:0,moderate:0,high:0,critical:0,total:0}}});
test('npm audit receipt cannot confuse unavailability or severity count drift with clean evidence',()=>{
 assert.equal(evaluateNpmAudit(clean(),0).eligible,true);
 for(const report of [null,{}, {error:{code:'ENOTFOUND'}}, {...clean(),auditReportVersion:1}])assert.equal(evaluateNpmAudit(report,0).eligible,false);
 assert.equal(evaluateNpmAudit(clean(),null).eligible,false);
 let r=clean();r.metadata.vulnerabilities.high=1;r.metadata.vulnerabilities.total=1;assert.equal(evaluateNpmAudit(r,0).reason,'AUDIT_INCONSISTENT');
 r.vulnerabilities.sample={severity:'high'};assert.equal(evaluateNpmAudit(r,1).reason,'HIGH_OR_CRITICAL_ADVISORY');assert.equal(evaluateNpmAudit(r,0).eligible,false);
 r=clean();r.metadata.vulnerabilities.moderate=1;r.metadata.vulnerabilities.total=1;r.vulnerabilities.sample={severity:'moderate'};assert.equal(evaluateNpmAudit(r,0).eligible,true);assert.equal(evaluateNpmAudit(r,1).eligible,false);
 r=clean();r.vulnerabilities.sample={severity:'unknown'};assert.equal(evaluateNpmAudit(r,0).reason,'AUDIT_SEVERITY');
});

test('known Vite advisory floor accepts patched stable releases only',()=>{
 for(const v of ['8.3.7','8.3.8','8.3.10'])assert.equal(reviewedVitePatch(v),true,v);
 for(const v of ['8.3.0','8.3.4','8.3.6','8.3.07','8.3.7-beta.1','8.4.0','9.0.0','8x3x8',null])assert.equal(reviewedVitePatch(v),false,String(v));
});
