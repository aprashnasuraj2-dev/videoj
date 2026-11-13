# Worklog

## 2026-11-13 - Initialization

- The user requested full implementation of the approved 10-page plan in `aprashnasuraj2-dev/videoj`, with all 100 steps tracked in the repository.
- Confirmed repository was empty; initialized main through the connected GitHub app.
- Copied all 100 original steps, in order, into `steps.json`. No steps are declared complete by copying them.
- Node 24.22.1 / npm 11.9.0 / Git 2.52.0 are available. npm registry and GitHub read access work, with noticeable network latency.
- Official CLI resolves to 10.4.0; verified version-matched HTML instructions and official skin guidance.
- Current stage: Phase 1, brief and constraints. Next: create evidence documents, then official Scaffold baseline.
- No public demo, Mux account asset, physical-device result, or contest submission is claimed.

## 2026-11-13 — Candidate audit and workflow preparation

- Audited all 100 rows against source; prior tracker was 27 DONE. Reconciled independently evidenced items to 38 DONE; unexecuted behavior claims remain IN_PROGRESS.
- Clean npm install, typecheck and production build pass. Added six Playwright cases plus axe scope and responsive capture. Browser download was corrupt; system Chromium launch then failed due to runtime socket restrictions. No browser pass claimed.
- Added candidate CI, exact-revision source packaging with checksums, and Mux provisioning with content-hash reuse. Mux uses runner secrets only and exports public configuration for review; no automatic default-branch mutation.
- Actual Mux upload, ready state, browser playback, public deployment, screenshots, physical-device checks and submission remain unverified.
- Direct default-branch push was rejected by automatic approval review; changes prepared on a review branch instead. Next: run CI there, confirm repository secret names, run Mux workflow after authorized integration, review public configuration, then verify real playback.

## 2026-11-13 — Design-first revision

- Owner clarified: focus on competitive craft, revise checklist as needed, and defer Mux upload. Removed automatic push trigger from Mux workflow.
- Retrieved actual CI evidence: 5/6 tests passed (real controls and four viewport sizes); axe failed on unnamed settings trigger. Added explicit accessible name.
- Inspected desktop and 320px screenshots. Found invisible woven track despite passing keyboard seek: position:relative caused zero-width content in the inherited full-width chapter geometry. Restored absolute track positioning. Corrected horizontal volume thumb geometry.
- Added real-cue chapter readout and distinct weave patterns; no invented media state. Expanded affected behavior/accessibility tests. See design-priorities.md for review criteria and rejected scope.

## 2026-11-13 — Durable storage and deeper interaction fixes

- Saved CI development evidence ZIP to the owner's selected Drive folder and verified file metadata/parent. See docs/storage.md for the actual file ID and URL.
- Added manual Drive archive workflow with separate Google OAuth secrets, revision filenames, resumable uploads, checksum verification and receipts. Connected Drive access is not assumed to exist inside GitHub runners.
- Deeper browser checks exposed fullscreen shelf loss: fullscreen state is reflected on the button, not the container. Switched layout rules to native :fullscreen and reserved shelf height. Slider keyboard tests now target the actual focusable thumb; chapter navigation restores focus to that thumb.
- Added Apache-2.0 LICENSE and NOTICE; lazy-loaded optional Mux engine. No Mux upload or contest submission performed.
