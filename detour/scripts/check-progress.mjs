import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const checklist = readFileSync(new URL('../CHECKLIST.md', import.meta.url), 'utf8');
const progress = readFileSync(new URL('../PROGRESS.md', import.meta.url), 'utf8');
const phases = [...checklist.matchAll(/^## (\d{2}) · .+$/gm)];
const steps = [...checklist.matchAll(/^- \[([ x])\] \*\*(\d{3})\. (.+)\*\*\n((?:  - .+\n)+)/gm)];

assert.equal(phases.length, 10, 'Expected ten phases');
assert.equal(steps.length, 100, 'Expected exactly 100 checklist rows with details');

for (const [index, [, number]] of phases.entries()) {
  const start = phases[index].index;
  const end = phases[index + 1]?.index ?? checklist.length;
  assert.equal(Number(number), index + 1, 'Phase headings must be ordered');
  assert.equal(steps.filter(step => step.index > start && step.index < end).length, 10);
}

for (const [index, [, status, id, , details]] of steps.entries()) {
  assert.equal(Number(id), index + 1, 'Step IDs must be unique and ordered');
  for (const field of ['Objective', 'Work', 'Deliverable', 'Pass condition']) {
    assert.ok(details.includes(`  - **${field}** — `), `Step ${id} is missing ${field}`);
  }
  if (status === 'x') {
    assert.match(details, /^  - \*\*Evidence\*\* — \S/m, `Step ${id} needs evidence`);
  }
}

const verified = steps.filter(step => step[1] === 'x').length;
const currentPhase = progress.match(/^Phase: (\d{2})$/m)?.[1];
const resume = progress.match(/^Resume step: (\d{3}|Complete)$/m)?.[1];
assert.ok(currentPhase && resume, 'Progress needs a phase and resume step');
if (resume === 'Complete') {
  assert.equal(verified, steps.length, 'All steps need evidence before completion');
  assert.equal(currentPhase, '10');
} else {
  const next = steps.find(step => step[2] === resume);
  assert.equal(next?.[1], ' ', 'Resume step must exist and be unchecked');
  const phase = Math.ceil(Number(resume) / 10);
  assert.equal(Number(currentPhase), phase, 'Resume step must belong to the current phase');
}
console.log(`${verified}/${steps.length} verified. Phase ${currentPhase}. Resume step ${resume}.`);
