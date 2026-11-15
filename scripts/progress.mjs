import { readFileSync, writeFileSync } from 'node:fs';

const steps = JSON.parse(readFileSync(new URL('../docs/steps.json', import.meta.url)));
const legacy = steps.slice(0,100);
const excellence = steps.slice(100);
const states = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE'];
if (legacy.length !== 100 || legacy.some((s,i) => s.id !== i+1 || !states.includes(s.status) || (s.status === 'DONE' && !s.evidence.length))) throw Error('Invalid historical steps');
const allowed = ['NOT STARTED','IN PROGRESS','IMPLEMENTED','VERIFIED','BLOCKED'];
if (excellence.some((s,i)=>!/^EX-0[1-9]-[0-9]{3}$/.test(s.id) || !allowed.includes(s.status) || !s.acceptanceCriteria || !s.sourceFiles?.length || !s.verificationMethod || !s.evidenceLocation?.length || (s.status==='VERIFIED' && s.evidenceLocation.every(x=>x.startsWith('PENDING'))) || excellence.findIndex(x=>x.id===s.id)!==i)) throw Error('Invalid excellence tasks or unsupported verification');
const counts = Object.fromEntries(states.map(s => [s, legacy.filter(x => x.status === s).length]));
const next = legacy.find(s => s.status !== 'DONE');
const status = { updated: new Date().toISOString(), total:100, counts, firstIncomplete: next?.id ?? null, phase: next?.phase ?? 10, blockers: legacy.filter(s => s.status === 'BLOCKED').map(s => ({id:s.id,title:s.title,evidence:s.evidence})) };
writeFileSync(new URL('../docs/status.json',import.meta.url), JSON.stringify(status,null,2)+'\n');
let md = '# DHAGO: 100-step implementation checklist\n\n';
md += `**${counts.DONE}/100 complete** | ${counts.IN_PROGRESS} in progress | ${counts.BLOCKED} blocked | Updated ${status.updated}\n\n`;
md += 'This is evidence-based task completion, not a percentage of contest quality. See [worklog](worklog.md), [status](status.json) and [plan](PLAN.md). Blocked steps remain unchecked; independent later work may continue.\n\n';
let phase=0;
for (const s of legacy) {
 if (s.phase!==phase) { phase=s.phase; md+=`## ${s.phaseTitle}\n\n`; }
 md+=`- [${s.status==='DONE'?'x':' '}] **${String(s.id).padStart(3,'0')} - ${s.title}** - ${s.status}\n\n  ${s.detail}\n`;
 if (s.evidence.length) md+='\n  Evidence: '+s.evidence.map(x=>`[${x}](${x.startsWith('http')?x:'../'+x})`).join(', ')+'\n';
 md+='\n';
}
const ec = Object.fromEntries(allowed.map(s=>[s,excellence.filter(t=>t.status===s).length]));
status.excellence = {total:excellence.length,counts:ec,phases:Array.from({length:9},(_,i)=>{
 const rows=excellence.filter(t=>t.phase===i+1);return {phase:i+1,total:rows.length,verified:rows.filter(t=>t.status==='VERIFIED').length,complete:rows.length>0&&rows.every(t=>t.status==='VERIFIED')};
}),phase10:'OWNER ONLY — NOT SUBMITTED'};
writeFileSync(new URL('../docs/status.json',import.meta.url),JSON.stringify(status,null,2)+'\n');
let updated='# DHAGO — Competition Excellence Checklist\n\n';
updated+='Current phases 1–9 are authoritative. The historical 100-step plan is retained below and in the first 100 JSON rows. IMPLEMENTED is not VERIFIED. Phase 10 belongs to the owner.\n\n';
updated+=ec.VERIFIED+'/'+excellence.length+' VERIFIED · '+ec.IMPLEMENTED+' IMPLEMENTED · '+ec['IN PROGRESS']+' IN PROGRESS · '+ec.BLOCKED+' BLOCKED\n\n';
let currentPhase=0,currentArea='';
for (const t of excellence){
 if(t.phase!==currentPhase){currentPhase=t.phase;currentArea='';updated+='## Phase '+currentPhase+'\n\n';}
 if(t.area!==currentArea){currentArea=t.area;updated+='### '+currentArea+'\n\n';}
 updated+='- ['+(t.status==='VERIFIED'?'x':' ')+'] **'+t.id+': '+t.title+'** — '+t.status+'\n\n';
 updated+='  Existing: '+t.existingImplementation+'\n\n  Required: '+t.requiredImprovement+'\n\n  Acceptance: '+t.acceptanceCriteria+'\n\n  Verification: '+t.verificationMethod+'\n\n  Source files: '+t.sourceFiles.join(', ')+'\n\n  Evidence: '+t.evidenceLocation.join('; ')+'\n\n  Blocker: '+(t.remainingBlocker||'none recorded')+'\n\n';
}
updated+='## Historical 100-step plan, retained\n\n';
updated+=md+'\n\n## Phase 10 — Owner only\n\nNot submitted. No challenge terms accepted.\n';
md=updated;
writeFileSync(new URL('../docs/CHECKLIST.md',import.meta.url),md);
console.log(JSON.stringify(status,null,2));
