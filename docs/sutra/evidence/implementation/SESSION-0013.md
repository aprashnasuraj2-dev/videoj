# SUTRA session 0013 implementation evidence — shared execution budgets and diagnostics

- Observed: 2026-11-23T17:11:35+05:45.
- Tested source candidate: `37d0a45371db717b5f44c2f839b8bbb8345538e7`.
- Full shell/Chromium CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45165087393
- Register CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45165087373
- Evidence CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45165087368

## Nested budget inheritance

Caller and peer networks share the same `composition` object. Peer agents therefore consume the caller's:

- total agent-invocation budget;
- remote-call budget;
- per-peer call budget;
- wall-clock deadline;
- guarded model-call/output ceilings.

A deterministic peer test uses a caller budget too small for caller + peer helper work and observes a composition-limit stop rather than a separate peer budget.

## Safe limit diagnostics

Sanitized runtime events now map fixed composition-limit reasons to bounded categories:

- `agent_calls`
- `remote_calls`
- `peer_repeat`
- `deadline`
- fallback `composition`

Raw vendor reason strings are not exported.

When a composition-limit event exists after a model result, `runNetwork` throws `COMPOSITION_LIMIT` with:

- the safe limit category;
- a message stating that partial output is incomplete and not verified;
- at most 2,000 characters of partial model text;
- ASCII control characters removed from the preserved partial text.

The learner UI displays the limit category and prefixes the partial text as **Incomplete partial output** before saying no completed result is claimed.

## Counterexample discovered and retained

An intermediate test assumed partial text itself would contain words such as “limit” or “Skipped”. That was false: the scripted top-level model had already produced a sentence containing “test complete” even though a nested budget event occurred.

This demonstrates why SUTRA must not rewrite or trust the model's wording to establish completion. The authoritative boundary is the runtime limit event/error and the UI's explicit incomplete label.

The failed intermediate shell is retained in GitHub Actions history; the corrected candidate above passed the full workflow.

## Phase 028 exit

Current evidence covers:

- finite depth/invocation/model/output/concurrency/time ceilings;
- nested peer work counted inside caller budgets;
- actual cycle detection while repeated independent runs remain valid;
- descendant cancellation after hard failures/budget exhaustion;
- safe limit category and incomplete partial-result presentation;
- deterministic fixtures for over-budget and valid control runs.

The phase exit is observed: cycles and intentional over-budget requests stop predictably, while legitimate repeated agent work is not falsely classified as a cycle.

Phase 028 can close.
