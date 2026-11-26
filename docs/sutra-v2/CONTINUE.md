# “Continue with SUTRA” — active V2 execution contract

> **Binding queue reset — 2026-11-26.** The user retired the 379 remaining SUTRA1 pending tasks. The **sole active execution checklist is [CHECKLIST.md](CHECKLIST.md)**. SUTRA1 remains historical evidence/reusable implementation only. Never resume an old SUTRA1 pending/next task unless the user explicitly asks to inspect or restore that historical task.

The phrases **“continue sutra”**, **“continue with sutra”**, capitalization variants and equivalent unambiguous wording mean:

> **Resolve the latest remote V2 state, reconcile exact CI/branch drift, then keep implementing the next dependency-ready unchecked task from `docs/sutra-v2/CHECKLIST.md`.**

They do not mean: resume the old V1 queue, repeat a status summary, restart from chat memory, create a background automation, merge/release, spend money, use real credentials, deploy publicly or contact third parties.

## 1. Product mission

Read [LIVING-KNOWLEDGE.md](LIVING-KNOWLEDGE.md) first. SUTRA is a living computational knowledge system for discovering, challenging, maintaining, revising and acting on important knowledge. Persistent, accountable, model-replaceable investigations—not general chatbot intelligence—are the product.

The integrated product target is:

**question/evidence → materially distinct interpretations → review → conditional computation → consequential clarification → persistent investigation → challenge/counterexample → changed evidence → impact report → independently replayable export**

At least two specialist domains must use the same architecture. Models remain replaceable proposals, not authority.

## 2. Sole work-selection source

Use [CHECKLIST.md](CHECKLIST.md) as the only active work cursor.

1. Reconcile the live central branch, PR #50, child PRs #51–#60 and validation-only #61 before selecting work.
2. Compare current remote heads with the baseline recorded in the checklist and `progress.json`.
3. Inspect exact-head workflow outcomes. A newer SHA never inherits an older green result.
4. Resume the current `[~]` task if still valid. Otherwise select the first dependency-ready `[ ]` task in the checklist’s default execution order.
5. If a task depends on a genuine `[!]` external blocker, continue another independent dependency-ready task instead of fabricating evidence.
6. Newly discovered concrete work is added to the V2 checklist with a stable V2 task ID and acceptance condition.
7. Never use former SUTRA1 phase order, old `next_task`, old pending count or old release/submission work as the default queue.

The V1 workspace under `docs/sutra/` may be consulted only for reusable source, exact evidence, security constraints and counterexamples needed by the selected V2 task.

**Optional capability boundary (V2-190):** Web access is a standalone optional future capability, disabled and unregistered by default. No dependency from the core reasoning, evidence acquisition, knowledge compiler, investigation workspace or execution pipeline; no existing completion gate depends on it. Reuse security primitives in one direction only. Future integration requires a separate architectural decision. No live providers, paid calls or external deployment without explicit authorization. Schedule WEB-001–004 after higher-priority foundation work.

## 3. Execution loop

A continuation turn is not complete because a status report exists. While safe, authorized, dependency-ready engineering remains:

**inspect → design → implement → adversarially challenge → verify exact source → register → commit → re-read remote → continue**

Prefer reuse/adapters over duplicate implementations. Component success ≠ system success. Preserve counterexamples and failed revisions.

Do not ask the user to re-authorize ordinary reversible engineering already inside scope. Stop dependent work only for:
- a genuine external/user-owned input;
- a safety or authority boundary;
- a destructive/irreversible action outside established scope;
- an explicit instruction to stop.

## 4. Exact evidence states

Historical registers (including reuse-first snapshots and prior `next` fields) are reference only. The current machine reconciliation, parallel head registry, roadmap observation and active checklist must agree. Full Living Knowledge closure is controlled only by the active checklist and exact acceptance evidence.

- **Candidate:** implementation exists but required exact-source evidence is incomplete/cancelled/running.
- **Scoped verified:** exact immutable source has passing evidence for the stated component scope.
- **Integrated verified:** current combined source has required integration evidence.
- **Externally validated:** required human/device/provider/public/expert evidence was actually collected.

Never promote one state to another by inference. Cancelled CI is incomplete evidence, not a passing result and not automatically a code failure. Older green combined revisions do not certify newer manifests.

## 5. Checkpoint transaction

After each material implementation/evidence change, update together:

1. source/tests/formal model;
2. `CHECKLIST.md` task state and any newly discovered task;
3. `progress.json` current task/next queue/exact heads/evidence;
4. `roadmap.json` + `ROADMAP.md` only when a broad gate status/scope changes;
5. `PARALLEL-WORKSTREAMS.md` when child ownership/head/evidence changes;
6. `SESSIONS.md` with exact observed evidence/failures/next action;
7. `DECISIONS.md` when architecture/scope/authority/work-selection rules change.

Read back the remote commit before claiming the checkpoint is saved. A checkpoint commit cannot contain its own SHA; record tested source/parent, then cite the checkpoint commit in the handoff.

## 6. Parallel branch discipline

- PRs #51–#60 remain independent child workstreams until deliberately integrated.
- Resolve exact head, base drift, changed paths and CI before editing a child.
- Preserve branch-specific failure/correction history.
- Scoped child green does not close a broad Living Knowledge gate.
- PR #61 is **validation-only / DO NOT MERGE**. Rebuild it from exact child heads when needed; it is not the integration merge vehicle.
- The central V2 branch is the coordination/integration line. Integrate reviewed child capabilities there deliberately, with exact combined evidence.

## 7. V1 retirement and inheritance

The 379 former V1 pending tasks are retired and removed from the current legacy checklist files.

Retain:
- verified V1 task/evidence history;
- omissions and historical blocker records;
- reusable runtime/consent/privacy/replay/browser/evidence/Open-Kit code;
- real failures and counterexamples.

Do not retain as active work:
- former V1 `[ ]` items;
- former V1 `next_task` or ready queue;
- V1 completion percentages;
- old competition/release sequencing unless a V2 task explicitly needs the inherited boundary.

Retirement is not completion or waiver. If V2 still needs a capability formerly described by V1, it must appear in the active V2 checklist/roadmap.

## 8. Release and authority boundaries

“Continue with SUTRA” does **not** authorize:
- merge to production/default branch;
- paid inference or real provider credentials;
- DNS/domain/public deployment or promotion;
- outreach to users/testers/experts/third parties;
- official release/submission;
- fabricated human, physical-device, source-rights, provider or real-world evidence.

Use the explicit external blockers in the active checklist. Continue independent engineering around them.

## 9. Handoff

Report:
- exact current central/child/validation heads relevant to the work;
- tasks completed/advanced by active V2 task ID;
- exact checks actually observed;
- retained failures/counterexamples;
- genuine external blockers;
- next dependency-ready V2 checklist item.

But if the user said **continue with SUTRA** and further authorized engineering is possible in the current session, keep working rather than stopping at the handoff.
