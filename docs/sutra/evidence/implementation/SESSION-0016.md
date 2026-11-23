# SUTRA session 0016 implementation evidence — safe run-provenance inspector

- Observed: 2026-11-23T17:45:49+05:45.
- Tested source candidate: `ee4a4829ee756b756b4d2dad7cc1223cf84d8e70`.
- Full shell/Chromium CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45170096228
- Register CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45170096241
- Evidence CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45170096227
- Scope: Phase 047 redacted provenance inspector. No public deployment, live provider claim, factual review or release occurred.

## Inspector identity and run binding

The optional browser inspector now displays the exact pinned:

- Open Agentic Web Profile 0.3 commit `a0ceda34e4f2e653223e13e63282abc9b60eaf7c`;
- nsDeploy/runtime revision `486ecf26aa8775963f9b765f894734bef1ac9817`;
- build revision supplied by the Vite build environment;
- active graph SHA-256 SRI digest;
- run kind/status;
- caller-selected model ID and router identity.

Local scripted, source-scripted and peer-composition runs all use the same provenance subsystem.

## Bounded provenance state

Added `apps/sutra/src/provenance-store.js`.

The store:

- keeps at most 12 completed runs;
- permits at most four simultaneously active run records;
- keys overlapping executions by explicit run ID so local/source/peer runs cannot overwrite one another;
- bounds agent/tool/origin/consent/action lists;
- bounds elapsed time and numeric call counters;
- stores only a fixed execution-limit subset;
- exports a versioned JSON object containing only sanitized summaries.

No prompt, model response, tool argument, private-context value, receipt payload or arbitrary error message is accepted into the exported schema.

## Runtime, contact and budget data

For each run, the inspector records only sanitized:

- contacted **origins**, with path/query/fragment discarded;
- consent decision kind, allow/deny, once/session and remembered state;
- agent and tool names from sanitized runtime events;
- agent/model/remote call counts;
- elapsed milliseconds;
- configured max agent/model/remote budgets;
- composition-limit categories;
- fixed error codes.

The UI represents complete, failed, cancelled and partial runs separately.

## Action outcomes

Reviewed local action receipts may append only:

- action reference;
- request ID;
- status: succeeded, rejected, unknown or not_started.

Action result payloads are deliberately not exported. A known `result.outcome: rejected` is normalized to rejected. Ambiguous registry failures remain `unknown`.

## Redaction mechanism

Public labels use a character allow-list **and** a sensitive-pattern rejection policy. Values resembling bearer tokens, API keys, secrets, tokens, passwords or `sk-...` credentials are replaced by `unknown`.

Runtime agent/tool/limit labels go through the same policy; there is no separate weaker path.

Origins are parsed and reduced to `URL.origin`, so URLs containing path/query material cannot leak that material into provenance.

## Export

The inspector exposes an explicit **Download redacted provenance JSON** action. Chromium downloads `sutra-run-provenance.json` and parses it successfully.

The browser test verifies:

- exact spec/runtime revisions;
- active graph SHA-256;
- selected BYOK model/router;
- peer and router origins;
- agent/call/budget metadata;
- consent decisions;
- bounded history;
- absence of the synthetic BYOK credential canary;
- absence of raw routed model-request text.

Unit tests inject a private canary through consent/runtime fields and arbitrary error/action payloads and verify it is absent from `exportData()`.

## Inspector isolation

The provenance panel is a closed optional `<details>` surface.

All render/update/export helpers catch their own failures; provenance does not own execution policy.

Chromium removes the entire provenance panel after a cancelled peer run, then:

1. re-runs transcript evidence validation successfully;
2. plays the native timing video;
3. observes the actual media clock advance;
4. pauses normally.

Therefore inspector absence/failure does not own playback or the local evidence flow.

## Retained failures

Four intermediate failures are intentionally retained and are not counted as success:

- run **45169335475** — the first allow-list sanitizer still allowed a credential-shaped string as a syntactically valid public identifier;
- run **45169474354** — agent/tool runtime labels still used the older character-only path and leaked the synthetic canary into the test export;
- run **45169623505** — the human-readable fixed router label was over-redacted to `unknown` because safe parentheses were not in the punctuation allow-list;
- run **45169892087** — after page reload the optional inspector was closed, so a Chromium assertion incorrectly used rendered `innerText` instead of DOM `textContent` for cancellation state.

The final candidate above passes app tests, inference/source/consent/API tests, pinned runtime verification, runtime tests, independent peer tests, Chromium and the standalone consent example.

## Counterexample and limit

A provenance allow-list cannot prove that a semantically public-looking identifier is never sensitive. SUTRA therefore combines structural allow-listing with sensitive-pattern rejection and, more importantly, never accepts raw prompts/private values into the provenance API in the first place.

This inspector is execution provenance, not factual provenance. It identifies which graph/runtime/router/model/contact/action boundary produced a run; it does not establish that the model answer or lesson claim is true.

## Phase 047 exit

Current evidence covers all ten Phase 047 checklist items:

- exact spec/runtime identity;
- recomputed graph SHA-256;
- contacted origins and consent decisions;
- model/router/agent/tool/call/budget metadata;
- partial failures and action outcomes;
- credential/private/raw-text exclusion;
- bounded memory and user-initiated export;
- credential/private canary tests;
- panel failure isolation from evidence/playback;
- reviewed revision-linked artifact.

The phase exit is observed: a reviewer can identify spec/runtime/graph/model/router/origins without secret exposure.

Phase 047 can close.
