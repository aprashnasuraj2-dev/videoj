# SUTRA Session 0057 — production fixture boundary and learner stabilization

- Observed: 2026-11-26T19:50:53+05:45
- Tested source revision: `f8c3da48a4d99a6311910b99a40b23d0ea9fa63c`
- Work branch: `sutra/caller-peer-failure-boundary`
- Draft PR: #49
- Result: all 19 exact-source GitHub workflows completed successfully.
- Release state: unchanged; no merge, deployment, public route, paid inference, npm publication or submission occurred.

## Failure-driven correction

The first candidate did not pass. Learner run 45811838732/job 139881387037 failed the production-bundle regression because the development contradiction fixture was statically imported by `apps/sutra/src/comparison-view.js`, so its text remained in the production bundle even though the control was guarded by `import.meta.env.DEV`.

The correction moved the 2-vs-3 contradiction record into `apps/sutra/test/fixtures/synthetic-comparison.mjs`, removed `syntheticComparison` and the development-conflict control/mode from product source, and retained the comparison engine tests against the test-only fixture. Production browser tests now assert the contradiction control is absent.

A later engineering-evaluation run failed because `tools/sutra-evaluation/baseline.mjs` still imported the removed product export. That harness was corrected to import the test fixture. A subsequent learner run found one stale locale browser assertion that still tried to click the removed second comparison button; it was changed to verify the single production evidence action, localized heading, unchanged source excerpt and honest `missing_source` state. These failed intermediate runs remain part of the history and are not counted as passing evidence.

## Exact-head verification

Exact source `f8c3da48a4d99a6311910b99a40b23d0ea9fa63c`:

- Learner shell run 45835173595/job 139962008840: **success**.
  - `npm ci`: success.
  - production build: success.
  - learner app tests: **161/161**.
  - packages/API tests: **171/171**.
  - pinned nsDeploy verifier: **10/10 unchanged modules** at `486ecf26aa8775963f9b765f894734bef1ac9817`.
  - runtime tests: **182/182**.
  - independent peer tests: **8/8**.
  - complete Chromium browser suite: success.
- Browser compatibility run 45835173373: Chromium, Firefox and WebKit matrix jobs all passed.
- Engineering evaluation run 45835173145: success after the fixture import boundary correction.
- Cloudflare ingress run 45835172997: success, including static candidate builds and deployment-free Worker/Pages compilation.
- Commit-wide observation: **19/19 workflows successful**.

The Chromium learner suite specifically observed:
- default learner production UI contains no development contradiction control;
- source transcript remains usable without an MP4 request before explicit media loading;
- the 1 Mbps / 150 ms lab profile keeps transcript usable under five seconds with zero pre-action MP4 requests;
- the visible fresh-viewer hero journey covers evidence, native-media seek, review save/delete, denial resilience, and a 360 px keyboard-only local completion without developer-console setup or external requests.

## Task evidence

### SUTRA-P018-06 — verified

Attack/evaluation fixtures and the deliberately contradictory comparison record are no longer imported by production comparison source. The default content profile has `guideClaim: null`; the default catalog contains only the clearly labeled synthetic timing source. The production build regression rejects known development-fixture/control markers, and the browser regression confirms the development contradiction control is absent.

This does **not** satisfy the rest of Phase 018: original rights-cleared film/written sources, licenses, corpus manifest and human-reviewed provenance remain pending.

### SUTRA-P019-02 — verified

The production build test walks every deployable file and rejects any single asset above the current 25 MiB Cloudflare Pages ceiling. The exact-head production build and learner tests passed this regression.

This is a build-boundary check, not evidence that a final production media origin has been selected or that production CDN limits have been exercised.

### SUTRA-P019-06 — verified

The learner intentionally keeps transcript/evidence available before media, performs no MP4 request until the explicit **Load source media** action, keeps poster handling independent, and validates the low-bandwidth behavior in the Chromium performance profile. Exact-head browser verification passed.

This does not satisfy Phase 019 Range/CORS/final-origin tasks or its phase exit.

### SUTRA-P041-10 — verified; Phase 041 closes

The exact-head hero browser scenario starts from a fresh browser context and completes the question-to-cited-source-to-review flow through visible learner UI. The first task is ahead of optional developer tools in DOM/keyboard order; supporting cue and next action are visible without opening developer traces. The same suite completes the local path at 360 px using keyboard activation.

P041-07 remains the previously recorded permitted omission; the applicable Phase 041 tasks and exit condition are now observed.

## Counterexample / boundary

A green development build is **not** a release. A synthetic timing source is **not** licensed original lesson provenance. Automated accessibility/browser passes are **not** physical-device, screen-reader or user-study acceptance. Provider gate tests are **not** live funded model economics. None of those external/final-state gates is changed by this session.

## Register effect

Four original tasks are newly verified: P018-06, P019-02, P019-06 and P041-10.

- Overall verified: **771 -> 775 / 1,107**
- Original verified: **665 -> 669 / 1,000**
- Original pending: **329 -> 325**
- Omissions: **6** unchanged
- Hardware blockers: **1** unchanged

The remaining queue is dominated by participant/rights/human/provider/hardware/public-production/final-candidate evidence. Continue using `REMAINING_GATE_MAP.md`; do not substitute CI for those events.
