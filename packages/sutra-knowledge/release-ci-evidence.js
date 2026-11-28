/** Structural validation only: trusted CI receipts and license/security review remain external. */
export const RELEASE_REQUIRED_JOBS=Object.freeze({
  "Validate SUTRA knowledge kernel": [
    "browser",
    "knowledge"
  ],
  "Validate SUTRA publisher starter": [
    "standalone"
  ],
  "Classify SUTRA verification impact": [
    "impact"
  ],
  "Validate SUTRA browser compatibility matrix": [
    "freshness"
  ],
  "Validate SUTRA operator model approval browser": [
    "operator-browser"
  ],
  "Validate SUTRA progress register": [
    "register"
  ],
  "Validate SUTRA workspace browser": [
    "workspace-browser"
  ],
  "Validate SUTRA provider measurement gate": [
    "measurement"
  ],
  "Validate SUTRA Open Kit candidate": [
    "candidate"
  ],
  "Validate SUTRA engineering evaluation": [
    "freshness",
    "historical-source-regression"
  ],
  "SUTRA autonomous research": [
    "postgres",
    "pdf-sandbox",
    "research"
  ],
  "Validate SUTRA Cloudflare ingress": [
    "ingress"
  ],
  "Validate SUTRA evidence library": [
    "evidence"
  ],
  "Validate SUTRA learner shell": [
    "shell"
  ],
  "Validate SUTRA neutral consumer": [
    "neutral"
  ]
});
export function validateReleaseCi(head,runs,required=RELEASE_REQUIRED_JOBS){
 if(typeof head!=='string'||!/^[0-9a-f]{40}$/.test(head)||!Array.isArray(runs))throw Error('RELEASE_CI_INPUT');
 const failures=[],accepted=[];
 for(const [name,jobNames] of Object.entries(required)){
  const matching=runs.filter(r=>r?.name===name&&r.head_sha===head);
  if(matching.length!==1){failures.push({workflow:name,reason:matching.length?'DUPLICATE_EXACT_RUN':'MISSING_EXACT_RUN'});continue;}
  const r=matching[0];
  if(!Number.isSafeInteger(r.id)||r.id<=0||r.status!=='completed'||r.conclusion!=='success'){failures.push({workflow:name,reason:'RUN_NOT_SUCCESS'});continue;}
  if(!Array.isArray(r.jobs)){failures.push({workflow:name,reason:'MISSING_JOB_RECEIPTS'});continue;}
  const found=[];
  for(const job of jobNames){
   const ms=r.jobs.filter(j=>j?.name===job);
   if(ms.length!==1||ms[0].status!=='completed'||ms[0].conclusion!=='success'||!Number.isSafeInteger(ms[0].id)||ms[0].id<=0||(ms[0].run_id!==undefined&&ms[0].run_id!==r.id)||(ms[0].head_sha!==undefined&&ms[0].head_sha!==head)){
    failures.push({workflow:name,job,reason:'REQUIRED_JOB_NOT_SUCCESS'});continue;
   }
   found.push({name:job,id:ms[0].id});
  }
  if(found.length===jobNames.length)accepted.push({name,id:r.id,jobs:found});
 }
 return {schema:'sutra-release-ci-evidence/v1',head,requiredWorkflows:Object.keys(required).length,requiredJobs:Object.values(required).reduce((n,x)=>n+x.length,0),accepted,failures,eligible:failures.length===0,authority:'STRUCTURAL_CI_ONLY'};
}
export function inspectNpmLock(lock){
 if(lock?.lockfileVersion!==3||!lock.packages||typeof lock.packages!=='object'||Array.isArray(lock.packages)||!Object.hasOwn(lock.packages,''))throw Error('LOCK_SCHEMA');
 const rows=[],issues=[];
 const allowed=new Set(['MIT','Apache-2.0','MPL-2.0','ISC','BSD-3-Clause','0BSD']);
 for(const [path,p] of Object.entries(lock.packages)){
  if(!path)continue;
  if(!path.startsWith('node_modules/')||!p||typeof p!=='object'){issues.push({path,reason:'LOCK_ENTRY'});continue;}
  rows.push({path,name:path.split('node_modules/').at(-1),version:p.version,license:p.license??null,dev:p.dev===true,optional:p.optional===true,integrity:p.integrity??null,resolved:p.resolved??null});
  if(typeof p.version!=='string'||!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(p.version))issues.push({path,reason:'VERSION'});
  if(typeof p.integrity!=='string'||!/^sha512-[A-Za-z0-9+/]{86}==$/.test(p.integrity))issues.push({path,reason:'INTEGRITY'});
  if(typeof p.resolved!=='string'||!/^https:\/\/registry\.npmjs\.org\/[A-Za-z0-9@._%+/-]+\.tgz$/.test(p.resolved))issues.push({path,reason:'REGISTRY'});
  if(!allowed.has(p.license))issues.push({path,reason:'LICENSE_REVIEW'});
 }
 rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 return {entries:rows,issues,metadataPass:issues.length===0,licenseReview:rows.filter(r=>r.license==='MPL-2.0').map(r=>r.path),authority:'DECLARED_METADATA_ONLY'};
}
