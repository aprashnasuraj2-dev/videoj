# “Continue with SUTRA” — SUTRA2 execution procedure

This is the active SUTRA2 continuation contract. It inherits the durable checkpoint, evidence, release-gate and stop/continuation principles in [SUTRA1 CONTINUE.md](../sutra/CONTINUE.md) while making `docs/sutra-v2/` the active product roadmap.

The phrases **“continue sutra”**, **“continue with sutra”**, capitalization variants, and equivalent unambiguous continuation wording mean: **resume the latest remote SUTRA work and keep engineering**. They do not mean restart from the last chat summary, merely inspect status, or create a background automation.

## Product priority

SUTRA is a debugger for conclusions. Product objective: falsification-first investigative reasoning and reproducibility. Trust/runtime infrastructure: consent, causal integrity, monotonic witnesses, compensation and bounded recovery, as a separate second act. Competition objective: attack a conclusion, expose declared ancestry, compute what survives and a decisive next observation, then verify a portable Proof Capsule offline. No paid inference required.

SUTRA MUST BE MORE INFORMATIVE WHEN ITS CONCLUSION FAILS THAN A NORMAL AI SYSTEM IS WHEN ITS ANSWER SUCCEEDS. Failed conclusions expose cause, changed and surviving claims, decisive dependencies, remaining worlds, and a next observation when one exists; contradictions must never be presented as an ordinary low-confidence vote.

Prioritize the attack/recompute → lineage → decisive observation → Proof Capsule journey over additional agent integrations. Preserve the runtime as the second act; no external action authority follows from a conclusion.

## 1. Resume the real current state

1. Read root `AGENTS.md`, this file, README, PLAN, MIGRATION, CHECKLIST, ROADMAP, `roadmap.json`, `progress.json` and the latest SESSIONS entries.
2. Read [`docs/sutra/CONTINUE.md`](../sutra/CONTINUE.md) and any SUTRA1 source/evidence/decision files relevant to the active v2 dependency. Preserve the old workspace; do not rewrite history to make v2 look cleaner.
3. Resolve the actual remote branch and PR HEAD. The prior chat handoff SHA is a hint, never an assumption.
4. Compare the remote HEAD with the last recorded candidate/verified SHA. Reconcile every material intervening commit before taking new credit.
5. Inspect exact-source workflow state and relevant job logs. A newer SHA cannot inherit an older SHA's green result.

## 2. Continue engineering, not reporting

After reconciliation, continue the current active task if it is still valid. Otherwise select the next dependency-ready incomplete task from the v2 roadmap.

A continuation turn is not complete because a status summary exists. While safe, authorized, dependency-ready engineering remains, continue the loop:

**inspect → implement → challenge → verify → register → commit → re-read remote → continue**

Use adversarial counterexamples, failure injection and independent checks where appropriate. Component success does not imply system success. Preserve counterexamples as permanent regression evidence when they expose a real boundary.

Do not ask the user to re-authorize ordinary reversible work already inside the established SUTRA scope. Stop dependent work only for a genuine external/user-owned input, an authorization boundary, a safety issue, or an explicit instruction to stop.

## 3. Synchronized checkpoint transaction

Implementation and registers move together. After each material implementation/evidence change, update the affected records in the same logical checkpoint:

1. Product/source/formal-model/test changes.
2. `CHECKLIST.md`: mark only evidence-supported state; add newly discovered concrete work instead of hiding it.
3. `roadmap.json` and `ROADMAP.md`: status, dependencies, evidence and known limitations for affected gates.
4. `progress.json`: exact pending/verified source SHA, workflow observations, failures, current state and next queue.
5. `SESSIONS.md`: append what changed, exact evidence observed, unresolved counterexamples and next engineering action.
6. `DECISIONS.md` or equivalent decision register when architecture, scope, authority, release interpretation or omission changes.
7. Commit the checkpoint meaningfully and read the remote result before claiming it is saved.

Do not defer register maintenance until the end of a long engineering sequence. A code commit that materially changes a tracked gate must be followed by synchronized register reconciliation; if its CI is pending, record it as **candidate/pending**, not verified.

## 4. Candidate versus verified evidence

- **Candidate:** implementation exists, but exact required CI/evidence is incomplete or still running.
- **Verified within stated scope:** exact immutable source revision has the required passing evidence and no unresolved contradictory result for the claimed scope.
- Failed revisions remain append-only evidence. Fixing a later revision does not erase the failure.
- If later code invalidates earlier verification, reopen the affected gate and retain the old result as historical evidence.
- Never mark a broad roadmap gate complete because one component, model, browser, synthetic fixture or happy-path test passed.

## 5. SUTRA1 compatibility and inheritance

SUTRA1 is still part of the project history and implementation base.

- Keep `docs/sutra/`, its 1,000-task register, decisions, evidence and source logic intact.
- Inherit its continuation behavior: exact remote reconciliation, dependency checks, checkpoint transactions, failure preservation, evidence freshness and no-soft-exit behavior.
- Reuse SUTRA1 implementation/evidence when a v2 adapter or dependency actually builds on it; cite the exact source/evidence rather than recreating it.
- SUTRA2's roadmap determines new priority. Do **not** mechanically resume old learner tasks or copy old completion counts into v2.
- A v2 architectural change that supersedes a v1 assumption must be recorded explicitly; it does not delete the v1 record.

## 6. CI drift and cross-session work

SUTRA development may advance while a session is checking CI. Treat each source SHA independently.

When the branch advances:
1. identify the intervening commits;
2. inspect their affected gates;
3. reconcile their workflow outcomes;
4. update the pending candidate;
5. keep the previous fully verified SHA separately;
6. continue from the newest valid remote state.

Never move `lastVerifiedKernelSource` merely because the branch HEAD advanced. Never leave new branch work absent from the progress/checklist/session registers.

## 7. Release and authority boundaries

Continuation does not authorize:
- merge or release;
- paid inference;
- real provider credentials;
- production/DNS/domain changes;
- public deployment or promotion;
- outreach to testers or third parties;
- competition submission.

Those require their own applicable gates and authorization. Existing SUTRA1 release restrictions remain in force unless explicitly superseded by a stricter v2 rule.

## 8. Handoff behavior

A handoff should state the exact current branch HEAD, last fully verified source, pending candidate, checks actually observed, open counterexamples, files/registers changed and the next dependency-ready engineering action.

But the handoff is not the goal. If the user said **continue with SUTRA** and the session still has workable engineering capacity, continue working rather than wrapping after the handoff.

Do not create a scheduled/background task from this phrase.
