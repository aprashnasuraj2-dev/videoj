# SUTRA session 0014 implementation evidence — host action registry and reviewed local writes

- Observed: 2026-11-23T17:21:26+05:45.
- Tested source candidate: `0e0c42c9ab2e060a61f299ff23b90ffcd9ffc52c`.
- Full shell/Chromium CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45166574357
- Register CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45166574751
- Evidence CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45166574391

## Runtime action boundary

`runNetwork` now accepts an optional host-owned `actionRegistry`. Before model execution it requires the registry to expose the pinned runtime's catalog and presentation-validation methods. Invalid registry-like objects fail with `ACTION_REGISTRY` and zero model calls.

The learner graph explicitly opts into bounded CRUSE version 1. The restricted compiler accepts exactly:

```json
{"cruse":{"version":1}}
```

and rejects other versions, extra CRUSE fields and non-object forms before inference. This keeps action catalog exposure opt-in rather than silently enabling a wider presentation surface.

With CRUSE enabled, the pinned runner injects only the host registry catalog matching the exact caller base/network into the learner invocation. Agents receive proposal metadata, not direct executable functions.

## Registered SUTRA actions

Added `apps/sutra/src/review-actions.js`, built on the pinned `ActionRegistry`.

Two local-only actions are registered with explicit `effect: "write"`:

1. `save-review-card` — save the reviewed evidence receipt in this browser only.
2. `export-receipt` — download the reviewed evidence receipt as a local JSON file.

Both use strict nested receipt schemas and re-run the SUTRA evidence validator against the approved source catalog before a plan can reach confirmation or execution.

Prepared plans and their arguments are recursively frozen. Changing arguments therefore requires a new prepare/confirmation flow; the confirmed payload cannot be mutated after preview.

## Confirmation and outcomes

The review dialog now previews the same action/origin/effect/argument structure the registry passes into its confirmation callback.

- Cancel returns without executing an action.
- Confirmed save writes exactly the reviewed receipt.
- Known local-storage rejection is returned as a rejected action result.
- Ambiguous write/export failure becomes `unknown` and is never automatically retried.
- Confirmed export creates a local JSON download and returns the resulting filename.
- Action receipts receive deterministic invocation/request IDs from the registry.

The existing review store remains bounded, source-version validated and duplicate-commit safe.

## Browser observations

Chromium on the tested candidate observes:

- the registered catalog contains both action names and `effect: write`;
- cancelling the save preview leaves the review list unchanged;
- confirming the save produces one persisted review;
- confirming export emits a JSON browser download;
- exporting does not create an extra saved review;
- the saved review survives page reload;
- BYOK state remains memory-only across the same reload checks.

The ordinary local scripted network also runs with the host-owned registry attached, exercising the browser runtime action-catalog path without granting direct write execution to the model.

## Retained failures

Two intermediate failures are preserved and not counted:

- https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45165924184 — runtime test expected action catalog injection before the graph opted into CRUSE. The fix was to add explicit CRUSE v1 metadata and compiler validation, not to bypass the pinned runner's opt-in rule.
- https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45166333206 — Chromium read `innerText` from a catalog inside a closed `details` element and saw an empty string. The test was corrected to inspect DOM `textContent`; the registry data itself was present.

## Phase/task interpretation

This candidate establishes P023-05: narrow registered actions are exposed through the actual browser runtime interface.

It also establishes P023-09: the runtime entry path, action registry, public graph and real local browser run form a reviewed runtime artifact. **P023-03 remains open** because scripted/browser-fixture inference is not a real configured provider invocation; therefore Phase 023 does not close.

For Phase 029, the newly registered save/export actions join the already verified payload validation, confirmation, cancellation, request/receipt binding and unknown-outcome safeguards. The exit condition is observed: cancelling changes no stored state, and changing a reviewed payload requires a fresh immutable preparation/confirmation.

Phase 029 can close.

## Limits

A locally downloaded JSON file is not proof of factual correctness or external persistence. A browser action proposal is not execution. Model text still cannot directly invoke these actions; user confirmation remains the execution boundary.

No live provider, public deployment, original lesson rights, factual review, physical-device evidence or submission is established by this work.
