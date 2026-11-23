# SUTRA session 0008 — first bounded external MCP integration

- Development branch: `sutra/caller-peer-failure-boundary`, draft PR #49.
- Exact verified code candidate: `e2766f1ca8bc1b09d2495af977f749e4a8317de1`.
- Observed green CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45178921845/job/137707320526 (app, runtime, consent, pinned vendor, independent peer and four Chromium scripts).
- Recorded at 2026-11-23T18:53:00+05:45. This time is the evidence entry timestamp, not a claim of exact CI completion time.
- Additional candidate `12aae467ce7ebfd7cd1929f0360d1d8ca598fd7e` includes same-page local video availability assertion. That later suite is pending and is **not** credited here until complete.

## Implemented

- Added an opt-in, fixed-origin, stateless `2025-06-18` MCP HTTP client in `packages/sutra-runtime/external-mcp.js` with no cookies, authorization, redirects, paid inference, dynamic tool execution, SSE sessions or proxy.
- External MCP graph refs must be a single exact `{url: ...}` object matching the injected host's chosen URL and must target HTTPS `/mcp` (HTTP loopback only for controlled browser tests).
- The third-party discovery boundary asks the existing reusable inspector **before** initialize, initialized notification and tools-list requests. A second authorization occurs **before** actual `tools/call`, even when discovery was approved.
- Only `read_public` may be advertised, with an exact input schema and an explicit read-only annotation. Tool output is bounded, limited to five records and labelled `third_party_unverified`; a publisher's assertion of read-only intent and the material's factual truth remain unproven.
- The caller's pinned reference runner is unchanged. External call/consent failures abort the invoking host rather than allowing a model to describe an unsuccessful tool as completed. The rest of the local learning shell remains independently usable.

## Observed verification at the exact green candidate

- Node tests: approved discovery/call ordering and 4 expected JSON-RPC POSTs, no authorization/cookies, refusal before discovery traffic, refusal before tool call, invalid endpoints, extra or writing tools, protocol mismatch, JSON-RPC ID mismatch, HTML/oversized results and cancellation.
- Chromium: separate loopback origins, a real browser preflight/CORS path, no external POSTs upon discovery denial, no `tools/call` on denied invocation, successful 4-POST approved flow, no cookie or private request/trace leakage, and CORS failure producing no completed read.
- Existing learner browser script verified synthetic video playback and evidence checking; it is a separate test from the denied MCP call. The added same-page video-after-denial assertion is pending CI, so P033-10 is not credited yet.
- All source artifacts retained under draft PR; CI source check uses the exact commit listed above.

## Limits and unsupported claims

- This is a controlled **synthetic read-only MCP fixture**, not an actual external approved partner service and not a general MCP client. No real third-party production endpoint, user OAuth, session/SSE transport, real semantics or developer adoption has been observed.
- External metadata/tool annotations are not sufficient to prove read-only semantics; endpoint ownership/permission still requires independent verification.
- Public HTTPS CORS, provider/BYOK credentials, full challenge interoperability, licensed original lesson and factual review remain pending.
- No public launch, domain route, paid-model call, zip or submission occurred.

## Next

- Observe the pending browser run for the same-page local media/evidence after denied MCP. Only then consider P033-10 and phase exit.
- Identify an authorized real public-read MCP host and run explicit bounded compatibility tests (P039-01/05/07), with provider credentials separate from MCP auth. Then continue private credential canaries for P035-05.
- Continue strict development-only status; no major checklist gate or official submission is bypassed.

## Superseding final observation: consent phase exit passed

- Following the earlier evidence entry, GitHub Actions run https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45179248410/job/137708455358 completed successfully on exact commit `12aae467ce7ebfd7cd1929f0360d1d8ca598fd7e` (run updated 2026-11-23T13:01:56Z). This supersedes the previously pending browser outcome; it does not change the earlier test history.
- The added Chromium scenario denied MCP discovery **before any external POST**, then performed the local source-catalog consistency check and loaded the real native synthetic timing video successfully in the same browser session. The entire learner test pipeline, runtime checks, pinned vendor integrity and four Chromium suites also passed.
- On this final observation, `SUTRA-P033-10` closes; phase 033 now has ten verified checks. Overall register: **204 / 1,000 verified; 13 phases complete**. No outside MCP publisher, public deployment, paid provider or challenge conformance is thereby established.
