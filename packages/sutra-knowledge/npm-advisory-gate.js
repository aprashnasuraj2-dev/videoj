// Fail closed on missing, inconsistent or high/critical npm audit results.
// This gate is advisory-database evidence, not a complete vulnerability guarantee.
export function evaluateNpmAudit(report,exitCode){
 const severities=['info','low','moderate','high','critical'];
 const fail=reason=>({eligible:false,reason,authority:'NPM_ADVISORY_DATABASE_ONLY'});
 if(!report||report.auditReportVersion!==2||report.error||!report.metadata||!report.vulnerabilities||Array.isArray(report.vulnerabilities)||typeof report.vulnerabilities!=='object')return fail('AUDIT_UNAVAILABLE');
 const counts=report.metadata.vulnerabilities;
 if(!counts||!Number.isSafeInteger(counts.total)||counts.total<0||severities.some(s=>!Number.isSafeInteger(counts[s])||counts[s]<0))return fail('AUDIT_COUNTS');
 const observed=Object.fromEntries(severities.map(s=>[s,0]));
 for(const row of Object.values(report.vulnerabilities)){
  if(!row||!Object.hasOwn(observed,row.severity))return fail('AUDIT_SEVERITY');
  observed[row.severity]++;
 }
 if(severities.some(s=>observed[s]!==counts[s])||Object.values(observed).reduce((a,b)=>a+b,0)!==counts.total)return fail('AUDIT_INCONSISTENT');
 if(counts.high||counts.critical)return {...fail('HIGH_OR_CRITICAL_ADVISORY'),counts};
 if(exitCode!==0)return {...fail('AUDIT_COMMAND_FAILED'),counts};
 return {eligible:true,reason:null,counts,authority:'NPM_ADVISORY_DATABASE_ONLY'};
}

// Current reviewed Vite minor line; a new minor/major requires advisory review.
export function reviewedVitePatch(version){
 const m=typeof version==='string'&&/^8[.]3[.](0|[1-9][0-9]*)$/.exec(version);
 return Boolean(m&&Number.isSafeInteger(Number(m[1]))&&Number(m[1])>=7);
}
