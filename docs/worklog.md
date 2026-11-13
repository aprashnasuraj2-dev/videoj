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

## 2026-11-13 — Passing core and mobile craft review

- Revision 1cae217: 17/17 Chromium checks pass; saved full evidence to Drive and recorded exact file ID. Reviewed isolated bright/dark footage and 320px captures. Ribbon and chapter readout now remain visible; control shelf stays legible independent of footage.
- Mobile critique: three unlabelled lower-row icons looked accidental. Revised them into three evenly sized, labelled Captions / Settings / Screen targets. Fresh affected checks required before claiming that refinement verified.
- Checklist remains subordinate to craft; broad preference and media-edge rows remain in progress because the automated suite does not cover every case in those rows. Physical-phone, screen-reader, production and bonus evidence remain pending.

## Hosting boundary

Attempted preview deployment for exact revision 2ed92ded to Vercel team `surajdev2`. Vercel returned 403: connection does not have permission to create a project. No existing project is linked to this repo; no local authenticated Vercel CLI is installed. No deployment URL or public-access claim is recorded. Continue design/source/evidence work independently.

## Latest verified source

- Revision 2ed92ded: 17/17 checks pass after labelled mobile controls; current open-menu capture included. Core functionality remains verified after the visual refinement.
- Remaining high-value handoff: public hosting needs project-creation access; physical-phone/screen-reader checks remain; Mux upload stays deferred per owner direction. Final submission terms and receipt remain pending.

## Mobile screenshot follow-through

- Although 2ed92ded passed behavior checks, actual screenshot inspection found its Settings visual label missing and the other labels left-aligned. Corrected all three with simple consistent text spans and centered labels; added assertions that all three labels are visible at narrow widths. This refinement is revision fdcc1a45 and must pass its affected checks.

## 2026-11-13 — Critical live repair, verified CI and cross-service reconciliation

- Reproduced exact-head CI regression on prior commit: enlarged root font triggered Scaffold's `@container width < 15rem` logic and hid Captions. Scoped an accessible override to DHAGO; added four distinct restrained selvages to chapter cards, matching journal notes, and corrected inaccurate 'silent' film copy to synthesized low-volume ambient audio. Commit `4f3f86c` passed 26/26 CI with real Mux test.
- Cloudflare verified dedicated R2 bucket and both existing custom domains; unrelated Patro routes untouched. Initial live public homepage used local MP4 and /journal.html returned 404. Uploaded versioned `assets/demo-mux-4f3f86c.js`, `assets/dhago-refine-4f3f86c.css`, `assets/journal-mux-4f3f86c.js` and `journal.html`; published updated index.html last. Readback verified all objects. Preserved prior index as `releases/2026-11-13-before-mux/index.html` for rollback.
- Independently confirmed both homepage domains and new public journal HTTP content. The live browser observed proper Mux element and correct manifest URL but failed video decoding in its environment; CI Chromium plays/seeks the same public Mux ID. Do not misrepresent either result as universal compatibility.
- Tried auto-build route: existing `dhago-studio` Pages project is Direct Uploads and cannot change source; creating a new Git-integrated Pages project failed with Cloudflare Git installation issue (API 8000011). Retained original R2 origin, DNS and rules instead.
- Verified latest GitHub CI artifact and copied 35 MB passing evidence directly into Google Drive folder, file ID `1j7FHURfdYk6Wn0LlNrF8jDLjixnC4ml7`. No user tokens were placed in files, browser bundles or commits.
- Remaining release blockers: complete production dist deployment instead of incremental R2 patch; physical/branded-browser compatibility and journal seek; full owner review and contest submission (not authorized/claimed).

## 2026-11-13 — Thread metaphor made interactive (feature candidate)

- Kept the research-grounded plain-weave/coloured inlay concept, added small purely visual stitches at real chapter boundaries, a bounded hold-to-tension cue via CSS `:active`, and caption cue readability treatment. The standard Video.js seek slider stays intact.
- Wired a subtle waiting-state appearance to real HTML media lifecycle events. No fake buffered progress, continuous motion loop or simulated quality selector. Reduced-motion and forced-colors exclusions included.
- Rejected spooling play icons, floating fiber particles and ceremonial protective-thread patterns: they would compromise recognizability, cost and/or cultural specificity without improving time navigation.
- Dedicated Playwright tests added for true cue-derived knots, conventional keyboard seeking, held ribbon feedback and event-driven buffering. Commit/CI evidence required before marking completion; changes not yet deployed to Cloudflare.

- First CI exposed two regressions: chapter `position:relative` collapsed the full-width absolute slider track (0px) and CSS `:active` did not reliably tension the visual strip. Corrected knot pseudo-elements to be relatively positioned *without* moving the chapter's containing block; pointerdown/up/cancel/leave on the real slider now controls a local data attribute. Baseline width assertion preserved. No passing result claimed until exact-head rerun.
