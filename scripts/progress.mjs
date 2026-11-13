import { readFileSync, writeFileSync } from 'node:fs';

const steps = JSON.parse(readFileSync(new URL('../docs/steps.json', import.meta.url)));
const states = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE'];
if (steps.length !== 100 || steps.some((s,i) => s.id !== i+1 || !states.includes(s.status) || (s.status === 'DONE' && !s.evidence.length))) throw Error('Invalid step list or missing completion evidence');
const counts = Object.fromEntries(states.map(s => [s, steps.filter(x => x.status === s).length]));
const next = steps.find(s => s.status !== 'DONE');
const status = { updated: new Date().toISOString(), total:100, counts, firstIncomplete: next?.id ?? null, phase: next?.phase ?? 10, blockers: steps.filter(s => s.status === 'BLOCKED').map(s => ({id:s.id,title:s.title,evidence:s.evidence})) };
writeFileSync(new URL('../docs/status.json',import.meta.url), JSON.stringify(status,null,2)+'\n');
let md = '# DHAGO: 100-step implementation checklist\n\n';
md += `**${counts.DONE}/100 complete** | ${counts.IN_PROGRESS} in progress | ${counts.BLOCKED} blocked | Updated ${status.updated}\n\n`;
md += 'This is evidence-based task completion, not a percentage of contest quality. See [worklog](worklog.md), [status](status.json) and [plan](PLAN.md). Blocked steps remain unchecked; independent later work may continue.\n\n';
let phase=0;
for (const s of steps) {
 if (s.phase!==phase) { phase=s.phase; md+=`## ${s.phaseTitle}\n\n`; }
 md+=`- [${s.status==='DONE'?'x':' '}] **${String(s.id).padStart(3,'0')} - ${s.title}** - ${s.status}\n\n  ${s.detail}\n`;
 if (s.evidence.length) md+='\n  Evidence: '+s.evidence.map(x=>`[${x}](${x.startsWith('http')?x:'../'+x})`).join(', ')+'\n';
 md+='\n';
}
writeFileSync(new URL('../docs/CHECKLIST.md',import.meta.url),md);
console.log(JSON.stringify(status,null,2));
