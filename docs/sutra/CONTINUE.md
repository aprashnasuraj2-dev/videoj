# “Continue with sutra” execution procedure

This applies to SUTRA continuation requests, regardless of case or surrounding punctuation. It is an instruction for a future active assistant session, not a background automation, model invocation or permission to contact other people.

## Public release gate

The participant explicitly directed on 23 November 2026: do not jump to release before all major checklist work is complete. Keep public deployment, domain/route assignment, public inference enablement and promotion closed until the applicable major product, security, conformance and acceptance gates have current passing evidence. A passing build, browser fixture or deployment-free dry-run alone cannot satisfy this gate. Continue independent engineering and report remaining major gates; do not treat a Cloudflare configuration file as release authorization.

On 24 November the participant explicitly tightened the ordering: stop further deployment preparation and prioritize the unfinished engineering checklist. Do not reconnect cloud accounts or advance domain/DNS, staging/public deployment, release or promotion merely because build candidates exist. Keep genuine human/external gates pending and continue independent local/CI engineering; use the latest register queue and dependency checks.

## Latest implementation checkpoint — 0045

2026-11-24T20:47:00+05:45: **706/1,093 overall verified; 616/1,000 original; 380 pending; six omissions; one hardware blocker.** X010-33/34 verified 19/19 at their exact source revisions. Added X010-35/36 source admission/static capability and caller timestamp candidates; no credit before exact CI. [Evidence](evidence/implementation/SESSION-0045.md).

Next: Observe exact X010-35/36 CI; continue source, consent and inference integrity engineering under P078-02. Keep real-content, live-model, human and release gates pending.

## Resume sequence

1. Read root `AGENTS.md` and applicable nested instructions. Use the repo selected by the user; do not guess from unrelated player projects.
2. Resolve the current remote default branch and the recorded work branch. Check local `git status` if a checkout exists. Never reset, overwrite or discard unrelated user edits.
3. Read `docs/sutra/README.md`, `progress.json`, `PROGRESS.md`, the latest entries in `SESSIONS.md`, `DECISIONS.md`, `CHECKLIST.md` and the relevant workstream file. Consult `COVERAGE.md` for cross-cutting gates.
4. Run `node docs/sutra/tools/progress.mjs check` and `status` when an executor is available. With connector-only access, perform equivalent structural checks and state that the local command was not run.
5. Compare the current source with `last_observed_code_sha`, the last session checkpoint and any active task. Inspect relevant changed files, CI/artifacts and public release facts when needed. A stored success is stale if its code, media, graph, configuration or dependent service materially changed.
6. Reopen affected task checkboxes or record blocked/stale evidence. Append an explicit correction instead of silently rewriting history. Do not re-run unrelated expensive checks without a new reason.
7. Select the active task if still valid; otherwise choose the next dependency-ready incomplete task. Use `next_task` and `ready_engineering_queue` as hints, not as a substitute for dependency checks. Explain the concrete next action briefly and do the work.
8. If a participant-owned input is missing, record the narrow blocker, ask only for the necessary input and continue independent authorized engineering. Do not treat elapsed time as consent or fabricate footage, participation, ownership or test results.
9. Complete implementation and meaningful validation appropriate to the changed behavior. “Continue” authorizes continuing the established project scope; it does not expand scope to destructive unrelated changes or unsolicited outreach.
10. Update task checkboxes, task evidence, cursor, blocker records and the readable handoff. Append the session entry and any new decisions. Run the register audit again.
11. Persist the checkpoint in the repository using a meaningful commit or the active PR/branch workflow. Read back the remote result before claiming it is saved. Preserve applicable repo release/PR conventions; a Git commit does not itself establish deployment.
12. Report the concrete result, actual checks, material limitations and next task. A user who asks to continue expects work beyond a plan, unless a genuine blocker prevents every independent task.

## Dependencies and independent work

The PDF's phase dependencies are sequencing guidance. Evaluate real data/build dependencies at task level:

- Eligibility, content rights, consent to user research and required entrant narration are hard gates for the corresponding participation/publication claims. They do not prevent a safe local app skeleton, runtime spike, synthetic corpus, compliance mapping or tool API design.
- Do not publish unlicensed content just because implementation is otherwise ready. Synthetic fixtures may support engineering tests but cannot impersonate real user research or original live demo evidence.
- Browser integration depends on the isolated app and pinned runtime. Peer execution depends on compatible public artifacts, exact resolution, consent and caller budgets. Validation metrics depend on a frozen corpus/rubric and actual runtime.
- Public promotion depends on the staging artifact and core security/conformance evidence. Final claims depend on the exact shipped source and actual results. Phase 100 depends on final reports and verified assets, not a simulated Devpost receipt.
- When a dependency is unavailable, record `needs_user_input`, `external_service`, `environment`, `technical_failure` or `decision` as appropriate, with an unblock condition and independent alternatives.
- Do not mark a pending external task blocked merely because it has not yet been attempted. Blocked means a specific dependency has been identified and prevents that task from proceeding.

## Checkpoint transaction

Update the following together in one logical change:

1. Actual product/source changes and applicable evidence artifacts.
2. Checkbox states in the detailed checklist; at most one `[~]` item.
3. `progress.json`: `current_task`, `next_task`, ready queue, task records, blockers, source revision and live release/submission state.
4. `PROGRESS.md`: concise observed result, exact next action, missing input and changed paths.
5. `SESSIONS.md`: dated entry with task IDs, commands/observations, result, source revision and next action.
6. `DECISIONS.md` if scope, architecture, targets, optional features or interpretation changed.
7. Added-scope tasks for newly discovered work that is not covered by existing IDs.

Use `Asia/Kathmandu` with an explicit numeric offset for human-facing timestamps. Record source revisions as immutable SHAs. The checkpoint commit cannot contain its own hash: record the tested code SHA/parent in the files, then cite the actual new checkpoint commit in the user handoff. The next session resolves that commit from Git history; no self-referential amend loop is required.

## Evidence and state updates

A verified task record has `state: "verified"`, `verified_at`, and at least one evidence object containing `artifact`, `description`, `result: "pass"`, `source_revision` and `observed_at`. An artifact may be a repository path or a stable public URL. Record the actual command/observation and its limit; a file existing alone does not prove the feature works.

An active task uses `state: "active"` and `next_action`. A blocked task uses `state: "blocked"`, `blocker_id` and `next_action`, with a matching blocker in the register. An intentionally omitted task uses `state: "omitted"`, `decision_id`, `reason` and `scope_basis`; the decision must be in `DECISIONS.md` and explain why the omission is permitted. Never omit mandatory gates merely because they are difficult.

If prior verified evidence becomes stale, reopen the checkbox to pending/active/blocked, retain the old evidence in history and describe what changed in `SESSIONS.md`. Do not count an archived passing result as current.

## Stop and continuation behavior

Do not ask permission merely because the last session ended or the user used the continuation phrase. Follow established scope and authorization, resolve ordinary reversible implementation choices, and keep working. Pause dependent work only for a genuine missing input or required decision. Do not send messages to testers, buy services, alter unrelated production routes or file the official entry without applicable authorization.

Once the package is delivered, report package delivery separately from `submission.devpost_state`. Only an observed submitted confirmation changes the latter to `submitted`; include its actual evidence. Do not create a background automation from the continuation phrase.
