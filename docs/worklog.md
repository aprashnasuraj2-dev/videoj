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

## 2026-11-13 — Boundary states and exact-build preparation

- Visually reviewed existing 1600px and 375px captures: the woven chapter ribbon is central and recognizable, with accessible labels on small controls. Kept playback interaction conventional rather than adding a loom animation or invented media metrics.
- Fixed exclusive WebVTT end-time boundary: the final chapter now remains present at the film endpoint. De-duplicated chapter readout DOM writes per time update. Synchronize collection cards and journal notes from their data-start boundaries on initial load, seek and ended state; hide external cards in the `nochapters` variant.
- Added touch-emulated Playwright coverage for mobile play, chapter selection and captions, plus initial and ending chapter states. Physical-screen-reader and real-phone checks remain outstanding.
- Added CI source-to-release workflow that stages an immutable `dist-<source SHA>` branch containing exact build files and SHA-256 manifest. It cannot deploy, mutate Cloudflare DNS or copy secret keys; R2 release remains a deliberately separate verified operation.

## 2026-11-13 — Exact release parity restored

- Merged PR #4 to `main` as `72ec6c324f646c6dcb18708bc86d3f0d415f39c2`; reviewed source head passed 30/30 Chromium checks. GitHub Actions successfully prepared immutable build branch `dist-72ec6c324f64` containing 78 files with SHA-256 manifest.
- Scanned dedicated Cloudflare R2 `dhago-studio-static`: 10 missing hash-named assets, with shared language chunks and binary film/poster already present. Uploaded only the 10 missing assets and verified each exact readback. Detected one stale `preview.html`, saved rollback and replaced from the immutable release.
- Compared the entire release: 76 text objects match the SHA-256 manifest; original film `0158d496a0ca9950e078e1ae4b985a6f` and poster `a9fc197275fe0222c02252afc3f13acb` match their expected MD5 object IDs and sizes. No missing or changed contents remained.
- Saved old public `index.html` and `journal.html` to `releases/2026-11-13-pre72ec6c/` before publishing exact immutable release HTML, journal first and homepage last. Verified new R2 readback hashes. Both custom domains and journal respond publicly in independent HTTP checks; post-release real Chromium smoke remains the next release gate.
- Archived exact-source 30-test evidence and pre-release public smoke separately in the owner-selected Google Drive folder. No additional Mux asset, Patro worker, zone-level rule, or unrelated R2 bucket was modified.

## 2026-11-13 — Post-publication acceptance

- Public browser run [43443029329](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43443029329) PASS after full immutable R2 release: source verification successful and **2/2 production Chromium smoke tests** passed. Mux media actually advances; chapter seeking and journal scene note work. Prior external browser codec limitations remain platform-specific counterevidence, not a revoked pass.
- Checked latest Contra challenge guidelines directly: public playable v10 skin, visual + several English sentences, Nov 16 11:59pm PST deadline, 25-point criteria plus 2 possible bonuses. Join/form acceptance still requires owner's authorized sign-in and agreement. No entry submitted, no receipt asserted.
- Reconciled completed technical Mux integration and real-site journal checklist entries, without marking owner/device tasks complete.

## 2026-11-13 — Thread craft recovery against current released main

- Identified old unmerged PR #3 as divergent by 26 commits and failing one pointer-hold Playwright assertion (29 passing / one failing source test); do not merge it directly.
- Ported cue-based woven joins, restrained held-tension response, media-event buffering and native caption legibility onto immutable released main, preserving its final-frame chapter/readout fixes and Mux/live journal acceptance.
- Replaced early pointerleave/lostcapture release logic with a bounded, abortable window-scoped pointerup/cancel/blur gesture lifecycle. This specifically addresses the prior regression where slider capture changes aborted visual tension mid-drag.
- Added a narrow, high-chapter-count de-clutter rule and both drag-outside and cancellation regression checks. Exact branch CI must pass before merge/publication. The published R2 build remains unchanged.

## 2026-11-13 — CI feedback: use the native Video.js drag state

- First clean-branch CI at `61bfbe5`: typecheck/build and 34 browser checks passed, but one custom mouse-hold data-attribute expectation failed. The former PR #3 had the same failure; repeating a homemade pointer listener would be an unsound fix.
- Removed all new seek pointer listeners. Video.js v10 already reflects dragging through `media-time-slider[data-dragging]` (used in its own scaffold CSS), so the tactile CSS now keys off that exact native state. Keyboard and playback semantics are unchanged.
- Replaced synthetic custom state tests with native attribute presentation tests, a forced-colors chapter-marker check, real keyboard navigation, buffering event tests and reduced-motion behavior. Run CI on the corrected exact head before merging.

## 2026-11-13 — Thread craft merged and exact source shipped to Cloudflare R2

- Recovered the unmerged, failing physical-thread PR #3 (26 commits behind); replaced fragile pointer handler with Video.js' own `media-time-slider[data-dragging]` state. PR #6 was verified at `e765854`: 35/35 source Chromium tests PASS, clean typecheck/build. Merged as `a6492362b634799f3f23611e95eb88d003474d1f`; closed obsolete PR #3 without merging its failing head.
- Main workflow [43461852782](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43461852782) passed source verification and live Mux/journal smoke **before** the new R2 HTML publication. Do not label this post-release evidence.
- Staging workflow [43461852795](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43461852795) produced immutable `dist-a6492362b634` containing 78 files, release-manifest with SHA-256 and the exact merged source.
- Read dedicated `dhago-studio-static` R2 objects. Seven new hashed resources were absent; uploaded only those seven, then read every one back and verified SHA-256 and byte sizes. 73/76 text files already matched the new build; the only remaining differences were `index.html`, `journal.html`, `preview.html`, each confirmed byte-identical to the old `72ec6c3` manifest.
- Backed up all three prior HTML entry points under `releases/2026-11-13-prea6492362/` and verified backup SHA-256. Published new journal, preview and finally homepage HTML, verifying each new SHA-256 on R2 readback. Final complete audit: **76/76 UTF-8 source SHA-256**, plus **2/2 original binary media ETag-MD5/size** matches = **78/78** immutable objects.
- No Patro worker, zone-wide route/DNS rule, other bucket, legacy hashed resource, Mux asset, or unrelated object was changed. Post-new-publication browser smoke must still run separately. External web-fetch environment could not open the site; that result is not equivalent to a playback failure.

## 2026-11-13 — New production acceptance and independently reproducible handoff

- Main documentation-only push `3e416abe` gave post-new-release [CI 43464044415](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43464044415): **35/35 source Chromium tests**, **2/2 real public Mux and Studio Journal tests** passed after R2 cutover; the previous run (43461852782) was pre-cutover only. Full 78/78 R2 hash evidence retained.
- Source handover workflow from PR #8, main `5d31666a74770ca0043afe63ccf6e44e16d5be2c`, passed clean ZIP extraction, dependency installation, typecheck, production build and release manifest consistency. ZIP CRC and all embedded SHA-256 receipts independently verified; source ZIP has 135 entries and no dependency/build duplication.
- Four verified artifacts saved to requested Drive folder: [35-test source evidence](https://drive.google.com/file/d/189RiUTl1EbD5QjKuYOyJu1hn_j0LLcoq/view?usp=drivesdk), [curated visual/proof package](https://drive.google.com/file/d/1V9K153-YruJy2j01t2BhukbW1QYAGYGd/view?usp=drivesdk), [post-release public smoke](https://drive.google.com/file/d/1dCaDYpHLsNj7GHU1SUsXOzKblgqhAQjI/view?usp=drivesdk), [reproducible source package](https://drive.google.com/file/d/1lJZhQS_rXjYPLoTm03ex6fEi_JP6BXNT/view?usp=drivesdk). Media remains unchanged and original; screenshots are real, unedited browser captures.
- Updated exact source/production boundaries and checklist **#89 DONE**, bringing tally to 82 DONE, 9 IN_PROGRESS, 9 NOT_STARTED. Real phone/screenreader, account-level Mux retention, eligibility/terms and observed entry receipt remain pending; do not prematurely mark them complete.

## 2026-11-14 — Judge polish and compatibility audit

- The production release remains `a6492362b634`. Rechecked the two active R2 custom domains, 76/76 text SHA-256 hashes and 2/2 original-media ETag/size pairs. Public responses for the homepages, Studio Journal and shared player script matched the manifest. The remote MP4 honored an HTTP byte-range request. The preceding three HTML entry points remain available for rollback.
- Public Mux HLS exposed 540p, 480p and 270p, plus stereo AAC. Downloaded and decoded the final fragment of each track. The previously published homepage and Journal have a passing public Chromium smoke from [main CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43466299086). Account-level retention and usage remain open.
- [Polish PR #10](https://github.com/aprashnasuraj2-dev/videoj/pull/10) aligns stitches to clipped cue boundaries, adds a compact clock layout, improves menu and caption treatment, and exposes an explicit backup link after a stream error. Four regression tests cover touch cancellation outside the slider, uneven and dense cue sets, settings and hour-long clock at 320 px, and the backup playback flow.
- [First PR CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43519028964) passed stream playback and 37 other tests. Its clock test exposed a narrow-layout wrap with the runner's font metrics. The compact controls now reserve grid columns for time and sound and allow the two times to wrap within their own column. The regression also exercises wider monospace metrics.
- Emulation exercised Chromium, Firefox and Playwright Linux WebKit. Linux WebKit did not expose the fullscreen capability on either mobile profile. Physical iPhone Safari, Android Chrome, assistive technology, an unaided trial and competition receipt remain open.

## 2026-11-14 — Storyboard and tactile finish

- Mux Video API resolved the configured public playback ID to the original film by its content-hash marker. The asset was Ready, standard, and approximately 64.08 seconds, with one visible asset in the token's environment. This establishes the standard public asset for step #65. Billing, account plan, cumulative delivery and availability throughout judging remain open.
- The native Video.js slider renders real frames from the Mux storyboard. The preview stays inside the player at each end and keeps the time and chapter display if the image fails. The ribbon uses native drag coordinates for a small traveling highlight and releases with a brief elastic return. Reduced motion and system high-contrast modes have stationary treatments.
- The buffered state uses Video.js visibility and delay with a woven indicator. Timecode rollover and hour-wide compact layout have dedicated regression tests. Chapter title announcements continue to use the Video.js keyboard behavior. Stitches remain decorative.
- Contra's public page reports 2026-11-17 07:59 UTC, equivalent to November 17 at 1:44 p.m. Nepal time. Public requirements and both bonus fields are documented in the handoff. Signed-in form restrictions and submission remain open.

## 2026-11-14 — Production cutover and final package

- Merged the verified final revision `dd6ec8bd217ade07707359f33b13fbbba928a5e2`. [Merged source run](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43521973553) passed 41/41 tests. The local build matched all 78 CI-generated SHA-256 entries.
- Uploaded seven new hashed assets and saved the preceding three HTML entry points under `releases/2026-11-14-predd6ec8bd/`. Published Journal, preview, then homepage. After cutover, 76 text SHA-256 checks and two media ETag/size checks passed. Public HTTPS confirmed both homepages and the Journal. [Post-cutover CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43521973553/job/132220457558) passed 2/2 with decoded Mux playback and Journal seeking.
- Source and visuals are recorded in [storage.md](storage.md) and the [entry handoff](../submission/entry-handoff.md). The physical-device, screen reader, Mux usage and owner entry checks remain open.


## 2026-11-14 — Fibre-film final coherence pass

- Reconciled current main after the fibre migration and retired-Mux cleanup. Direct R2 delivery is canonical and active Mux configuration remains null until the fibre film has its own verified playback ID.
- Found two judge-visible legacy references that search-only cleanup missed: the Stress Lab noscript fallback and standalone Ribbon demo still selected `studies-in-thread.mp4`; the Ribbon also carried retired chapter labels. Retargeted those public surfaces to *From Fibre to Fabric* while intentionally retaining legacy media files as historical/test fixtures.
- Rewrote active release instructions around exact CI artifact → immutable manifest → R2 publication with `release-manifest.json` last. Mux is optional until the canonical fibre film receives its own verified asset.
- Re-read the live Contra challenge through its current public challenge record: ACTIVE, deadline 2026-11-17 07:59 UTC, public Video.js v10 URL + visual + short description required; Mux playback ID and real live-site URL are optional bonus fields. No legal checkbox was accepted.
- Added `submission/final-submission.md` with copy-ready title, descriptions, feature/technical/accessibility/originality/media/license statements, live links, 60-second walkthrough, screenshot shortlist and legal-safe checklist.
- This branch must pass exact-head Chromium, Firefox and WebKit verification before merge; no contest submission or paid action is authorized by this work.
