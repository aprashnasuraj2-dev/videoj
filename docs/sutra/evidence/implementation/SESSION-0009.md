# SUTRA session 0009 implementation evidence — explicit run lifecycle and bounded read retry

- Observed: 2026-11-23, Asia/Kathmandu.
- Tested product/source candidate: `fb300b9df50a59768c64ee0d8f7c01389d74f27f`.
- Full shell CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45161898243
- Register CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45161898180
- Evidence CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45161898170
- Scope: Phase 026 lifecycle/cancellation/retry completion. No public deployment, live provider call, paid inference, original lesson claim or submission occurred.

## Explicit lifecycle

Added `apps/sutra/src/run-lifecycle.js`, a finite state machine with exactly five public states:

- `idle`
- `running`
- `cancelling`
- `failed`
- `complete`

The peer composition UI renders the current state in an ARIA live region. Starting a run creates a fresh AbortController. The cancel control is enabled only while the run is `running`; cancellation moves to `cancelling`, aborts the controller, resolves any pending consent dialog as denied so the UI cannot hang, and ultimately records `failed` with explicit incomplete-result wording. A completed controlled run moves to `complete`.

A cancelled run is never relabeled as complete. The visible result says the interrupted output is incomplete and not verified, and provenance records `CANCELLED`.

## Browser cancellation and media continuity

Chromium exercised the following sequence on the tested candidate:

1. initial lifecycle is `idle`;
2. a consented loopback peer run enters `running` and finishes `complete`;
3. after the app reloads and the synthetic native timing fixture is mounted, the peer URL is re-entered;
4. the manifest request is deliberately held at the transport boundary;
5. the user cancels the active run;
6. lifecycle reaches `failed` with incomplete/cancelled wording and no completed peer result;
7. the run control becomes available again and the cancel control becomes disabled;
8. the native video is played again after cancellation and its actual media clock advances before pause.

This establishes that cancelling the agent run does not break ordinary native media playback in the controlled browser fixture. It does not establish physical-device behavior.

## Bounded source retries

The read-only source MCP transport now has a maximum of two transport attempts per RPC operation: the initial attempt plus at most one retry.

Retry occurs only for:

- a transport rejection before a usable response; or
- a 5xx response.

The implementation does not retry successful-but-malformed JSON/content/schema responses. Cancellation terminates the transport instead of entering another attempt. All transport attempts still consume the existing overall source-call ceiling.

Each attempt emits a sanitized `source_attempt` runtime event containing only the method name, `attempt`, and `maxAttempts`. Tests observe a first failed read followed by attempt 2, and confirm the private synthetic failure string is absent from exported runtime events.

## Retained failed browser candidates

Two intermediate browser runs are intentionally retained and are not counted as success:

- https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45161277792 — first cancellation fixture waited for a transient `running` state at a timing-sensitive point and timed out.
- https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45161634271 — the stabilized state assertion revealed that the browser test had reloaded the page earlier, correctly clearing the peer URL; the cancellation scenario therefore failed before consent. The fixture was corrected to re-enter the peer URL after reload.

The final candidate above passed build, app unit tests, inference/source/consent/API tests, pinned runtime verification, runtime tests, independent peer tests, Chromium browser tests and the standalone consent example.

## Phase 026 exit boundary

Observed on the tested candidate:

- fragmented streamed tool arguments are assembled only after valid completion;
- malformed model/provider output fails without invented success;
- child/model errors are sanitized and propagated;
- cancellation aborts outstanding work and prevents later model calls;
- interrupted output is visibly incomplete;
- read retries are finite and attempt-counted;
- cancellation does not disrupt the controlled native media player;
- the lifecycle artifact and actionable error states are present.

Phase 026 therefore has current automated evidence for all ten checklist items, including its exit condition.

## Limits

Component success is not system success. These tests use synthetic/loopback fixtures. They do not prove:

- live OpenRouter browser CORS or account validity;
- a funded keyless visitor path;
- public HTTPS peer interoperability;
- factual truth of lesson content;
- rights-cleared original media;
- physical iPhone decode/seek behavior;
- participant eligibility, outside adoption, release or Devpost submission.
