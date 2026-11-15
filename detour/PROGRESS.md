# DETOUR progress

Phase: 10
Resume step: 091

| Item | Current state |
| --- | --- |
| Verified | 90/100. Step 002 is now verified by official Contra multiple-submission guidance. Phase 8 is complete; Phase 9 steps 081–089 are verified except human-only 090; Phase 10 steps 092–095 and 098 are verified. |
| Next | 091. Multiple-submission eligibility is resolved; the signed-in current form field names, limits and acceptance state still unlock 096/097/099. Step 090 still needs a fresh uncoached human reviewer; 100 follows actual submission. |
| Open dependencies | 091 signed-in live-form confirmation; 017 first-use study; 062 physical phones; 064 NVDA/VoiceOver; 065 native 200% zoom; 090 fresh uncoached judging pass; 099 owner submission and 100 post-submission verification. No further independent Phase 10 acceptance step bypasses 091. |
| Prototype / public release | Preferred submission route: `https://detour-entry.aafnaipatro.com/mux/` on checkpoint runtime `d430f2ee49fa93a460c150fd90205b13fe5327be` / `detour-dist-d430f2ee49fa`; redundant mirror `https://detour.aafnaipatro.com/mux/` intentionally retains the earlier single-place `a3b43f74…` runtime; independent rollback remains `https://detour-backup.aafnaipatro.com/` / `detour-dist-50ac9661e315`. |
| Source baseline | Multi-checkpoint runtime `d430f2ee49fa93a460c150fd90205b13fe5327be` passed full Validate DETOUR run `43770989069`; the strengthened checkpoint behavior proof at test-only head `b4ebfe8f…` passed Mux run `43771166704`. Post-promotion public-edge verification proved C1–C4, dedupe, persistent Return, focus-preserving render and individual Delete on `detour-entry`. |






## 2026-11-16 · Final checkpoint presentation evidence accepted

- Final evidence run **43772874624** passed completely from the promoted public checkpoint route. Artifact **14184539322**, ZIP digest `sha256:2281c1083ff62fcdbb9e207a9e0709fb02d35247e06287ca3469694c78dafcc5`.
- **Hero:** `hero-1280-checkpoints.png`, 1248×806, 85,773 B, SHA-256 `039b00f0104433c673dca18e8a41bb11fc477c79759a793b3c2bc308a785cb20`. Four C1–C4 brackets are visible at current 00:15; hovered C1 expands to `C1 00:42 ↩`.
- **Raw interaction:** `interaction-960x720.webm`, 6.28s, 960×720 VP8, no audio, SHA-256 `448b50908f3b81f7a5ca823d53eeb9ebdcd95bbe5e0b156790df3de044938151`. It saves C1 and C2, explores ~8s, returns through C1 to 42s, and leaves both checkpoints present.
- Compact real-cue captions, recovery and alternate-media single-place compatibility captures also passed in the same artifact. The duplicate Playwright recorder file is intentionally excluded from owner packaging.
- Latest full Validate DETOUR run **43772874561** also passed; runtime remains the accepted `d430f2ee…` checkpoint build.
- Owner Master Pack **v4** is sealed from verified bytes: `DETOUR_COMPETITION_MASTERPACK_v4.zip`, SHA-256 `9770949632f6f293a5c1984fa2363994bbe78bfdd3dcfacb9bd74df14bd54da8`. The exact reusable tarball inside is the CI artifact bytes, not a local repack.

## 2026-11-16 · Checkpoint recording seek-settlement correction

- Evidence run `43772667773` reached the final recording and returned through C1, but only one checkpoint existed. Diagnosis: the script waited for `currentTime≈18` but not for native seeking to settle; **Keep my place** was therefore still correctly disabled and the keyboard Enter could not create C2.
- The recording harness now waits for the actual enabled Hold control before each keyboard save, asserts two checkpoints exist before exploring onward, and waits for C1 to re-enable before keyboard Return. Runtime behavior is unchanged.

## 2026-11-16 · Final checkpoint interaction clip scope

- Evidence run `43772451384` successfully passed the new four-checkpoint hero/detail, real-cue compact caption, recovery and alternate-media stages, then timed out waiting to remove C2 immediately after the recorded asynchronous C1 Return.
- Individual Delete, focus preservation and the in-flight Return safety lock are already executable acceptance behavior in the Mux regression and public edge proof. The short presentation clip does not need to duplicate every edge case.
- Final clip scope is intentionally clearer: **save C1 at ~42s → save C2 at ~18s → explore ~8s → Return through C1 → show C1+C2 still present**. The hero proves the full C1–C4 capacity; the test suite proves removal and Clear behavior.

## 2026-11-16 · Phase 9 checkpoint evidence capture correction

- Public checkpoint release behavior is already accepted; this correction is presentation-only.
- Phase 9 evidence run `43772179620` produced the new desktop checkpoint hero/detail, then failed in the compact captions step because the script required an active caption cue at **00:15**. The authored VTT has cues at **00:00–00:06**, **00:16–00:25** and **00:38–00:47**, so 00:15 is intentionally between cues.
- Fixed the capture state to move from the four-checkpoint overview to saved **C3 at 00:18**, focus C3, and then require a genuinely active caption cue before the compact screenshot. No player/runtime behavior or public release changed.
- Next evidence run should produce desktop checkpoint hero/detail, compact checkpoint+caption state, recovery state, alternate-media single-place proof and the interaction clip.

## 2026-11-16 · Multi-place checkpoint release accepted and promoted

- Corrected candidate **86e3b15b…** passed full validation run **43769776693**: Chromium, Firefox, desktop WebKit, packed external host, final audit, footprint budget, responsive/keyboard/preferences/emulated-touch probes, checklist validation and immutable dist staging all passed.
- Final craft pass keeps the saved-point visual language tied to DETOUR's original lime open bracket: C1–C4 are open C/bracket marks at rest, then close into a high-contrast timestamp chip only on hover/focus. The Mux copy now says **“Keep up to four places. Explore freely. Return from the rail.”**
- Strengthened the Mux behavioral test: a save within 0.75s deduplicates instead of adding a checkpoint; Delete removes only the focused checkpoint; returning does not consume checkpoints; Clear removes all.
- Strengthened Mux runs **43770360075**, **43770637091** and **43770808193** progressively tightened the keyboard proof. Direct DOM reproduction confirmed Delete removes only C2. The decisive diagnosis is that checkpoint buttons are intentionally **disabled while a Return transaction is in flight**, so an early C2 focus attempt correctly fails rather than starting a competing seek.
- The test now waits for C2 to re-enable after Return completes, then focuses it, forces a marker re-render, verifies focus survives, and presses Delete. This preserves the safety lock instead of bypassing it.
- Additional defensive polish remains: Return will not steal focus from a newer control choice, and marker rendering preserves the focused checkpoint slot across legitimate `seeking/seeked/progress` rebuilds with `preventScroll`.

- First exact-head full validation run **43769433525** found a real backward-compatibility regression: default single-place hosts received an inert third `.detour-checkpoints` rail child even with marker mode disabled. Existing dense-chapter geometry tests correctly rejected **3 !== 2** in both the full Chromium suite and Phase 7.
- Fix: create the checkpoint layer only when `returnUi: 'marker'` is actually enabled. Default one-place hosts retain the historical two-child rail DOM exactly; the tests are not weakened.

- Owner proposed replacing the single always-visible Return surface with multiple timeline places. Implemented a backward-compatible package candidate: default hosts retain the original one-place explicit Return/Stay UI, while hosts can opt into `maxPlaces: 4` with `returnUi: 'marker'`.
- In marker mode, C1–C4 persist on the familiar seek rail. Hover/focus expands each marker to show its timestamp; click/tap returns to that checkpoint without consuming it; Delete/Backspace removes the focused checkpoint; **Clear** removes all checkpoints for touch users. Near-duplicate saves are deduplicated and source changes clear all checkpoints.
- The Mux competition route opts into the four-checkpoint mode and removes the permanent Return panel from its normal state. The package cap of four is deliberate: unlimited bookmarks would clutter the short showcase and weaken the reversible-seeking concept.
- **Accepted runtime:** `d430f2ee49fa…` passed full run `43770989069` across Chromium, Firefox, desktop WebKit, packed external host, footprint, responsive/keyboard/preferences/emulated-touch probes, audit and immutable staging. Mux run `43771166704` passed the strengthened checkpoint behavior proof after test-only timing corrections. The runtime is promoted to isolated Worker `detour-checkpoints-release` and `https://detour-entry.aafnaipatro.com/mux/`; public edge verification observed matching source/dist headers, Mux `readyState=4`, C1–C4 at 42/30/18/08, duplicate suppression, Return from 15→42.35 with all checkpoints retained, focus surviving a forced render, and C2-only Delete with live announcement.


## 2026-11-16 · Public-route incident check and redundant branded entry route

- Owner reported `https://detour.aafnaipatro.com/mux/` as dead from their local network. Do not treat that single vantage as proof of global outage.
- Cloudflare custom-domain state is intact: `detour.aafnaipatro.com` remains enabled on Worker `detour-mux-release`, with its generated proxied DNS record and active frozen deployment.
- Fresh Cloudflare Browser Rendering from another edge returned **HTTP 200**, title **DETOUR — Keep your place**, frozen source `a3b43f74c765…`, storage `r2`, and the expected Mux release headers. An independent Firecrawl browser reported the Mux video at **readyState 4**, **networkState 1**, duration **55.985333s**, and no media error.
- Added a second branded custom domain, **`https://detour-entry.aafnaipatro.com/mux/`**. It initially mirrored the old runtime for incident isolation, then was deliberately reassigned after checkpoint acceptance to isolated Worker `detour-checkpoints-release` on `d430f2ee…`. Final public verification proved the four-checkpoint interaction; the old `detour.aafnaipatro.com` route remains untouched as the single-place mirror.
- The independent older rollback `https://detour-backup.aafnaipatro.com/` also returned **HTTP 200** on its frozen `50ac9661…` build.
- **Release decision:** use `https://detour-entry.aafnaipatro.com/mux/` as the preferred submission URL for the accepted C1–C4 runtime. Keep `https://detour.aafnaipatro.com/mux/` as the unchanged single-place mirror and `detour-backup` as the independent no-Mux rollback.

## 2026-11-15 · Final competitive positioning and master-pack v2

- Refreshed the late public field. The challenge is now crowded with strong object/metaphor skins — film strips, camera lenses, tactile hardware, transit systems, games, gesture layers and cinematic shells — and a new late post also describes anchoring a moment on the timeline. A generic “bookmark a moment” story is no longer sufficient.
- Locked DETOUR's narrower winning lane: **“Most video players let you seek. DETOUR lets you leave without losing where you came from.”** The complete mechanism is the differentiator: one familiar seek bar, separate current/held positions, free exploration, explicit one-action Return, explicit discard, and source/race-safe reusable implementation.
- Rebuilt the owner submission master pack around a three-state authentic-browser board (**Hold 00:42 → Explore 00:15 → Return 00:42**) plus an **8.20s H.264 judge reel**, while retaining the raw hero and raw 6.08s browser recording as evidence fallbacks.
- Added a concise reusable-engineering brief exposing host ownership, package exports, source-epoch state, duplicate-return suppression, manual-seek precedence, live/audio capability boundaries, accessibility mechanisms and provider separation. The reusable `.tgz` itself remains the previously verified artifact.
- Superseded presentation pack: `DETOUR_COMPETITION_MASTERPACK_v2.zip`. Current owner pack after the route incident is `DETOUR_COMPETITION_MASTERPACK_v3.zip`, SHA-256 `091c9c166fba581175f5f79916fe2a793b6fccf961cf80027373e2970ab8356e`. Exact Contra field binding remains step 091/097.
- **Decision:** do not add late chapters, thumbnails, AI, voice control, 3D hardware or another theme. Those are crowded lanes and would increase verification risk without strengthening DETOUR's core playback primitive.

## 2026-11-15 · Step 002 verified by official Contra multiple-submission guidance

- Contra's official Help Center article **“Challenges on Contra: A new way to earn”** (published 2026-04-06) answers the exact eligibility question: participants may submit more than once to a challenge as long as the submissions are **unique** and meet the challenge criteria. It also states challenges are open to Contra independents unless a challenge says otherwise.
- The Video.js Skins Design Challenge guidelines contain no contrary per-participant cap. DETOUR's Phase 1/2 evidence already establishes it as a separate concept from DHAGO rather than a duplicate submission.
- **002 is now verified.** Verified count becomes **90/100**.
- **091 remains open, but its blocker is narrower:** the public challenge API does not expose the signed-in submission form's exact labels, required/optional state, media/file limits or acceptance result. The entrant must open the current joined form and record those facts before 096/097/099 can pass.

## 2026-11-15 · Earlier 091 public-form recheck (superseded on eligibility)

- Re-read the active Contra Video.js Skins Design Challenge after the release freeze. Public challenge state remains **submissions enabled**, deadline `2026-11-17T07:59:00Z` (Nov 17, 13:44 NPT), with **1,097 participants** and **253 submissions** at this recheck.
- At that point the public challenge payload exposed no joined-form schema, upload limits or accepted-media field contract. Public `submissionInstructions` and `termsAndConditionsUrl` were null.
- This entry originally treated second-entry permission as unresolved. The later official Contra Help Center finding above supersedes that part: multiple unique challenge submissions are allowed.
- **Remaining action is narrower:** inspect the signed-in current form for exact fields, required/optional state and media limits, then bind the prepared DETOUR payload. Step 090 remains a fresh-human gate.

## 2026-11-15 · Branded public-host privacy correction

- The competition demo moved to `https://detour.aafnaipatro.com/mux/`; the independent rollback moved to `https://detour-backup.aafnaipatro.com/`.
- These are branded custom Worker domains. Judge-facing pages, release metadata and submission copy must not expose the account-level `workers.dev` hostname.
- The underlying `workers.dev` endpoints are disabled for both DETOUR Workers; they are not usable submission routes or submission evidence.

## 2026-11-15 · Bonus URL roles separated and live-site use corrected

- **Competition submission demo / Mux +1:** `https://detour.aafnaipatro.com/mux/`. This is the judge-facing DETOUR showcase and the only URL to use as the playable submission demo. It plays public Mux Playback ID `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`.
- **Independent live-site use / +1:** `https://aafnaipatro.com/on-this-day/video/apollo-11/`. This is an Aafnai Patro **On This Day** editorial history page using a NASA Apollo 11 landing-site visualization through the reusable skin. It is not a contest landing page and does not use the Mux showcase media.
- **Do not substitute these URLs for one another.** The Mux Worker satisfies the playable competition demo/Mux path; the Aafnai Patro editorial page is evidence of genuine site use.
- Cloudflare Browser Rendering observed the editorial page at HTTPS 200 with a ~47-second Apollo 11 video, captions and the required controls. To remove NASA-origin latency as a judging dependency, the NASA source was separately ingested into Mux as editorial asset Playback ID `kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U`; the Aafnai Patro Worker proxies that distinct asset behind its own media URL. A fresh Cloudflare interaction probe held at **12s**, sought to **2s**, and returned to exactly **12.000s** while remaining paused.
- The temporary `aafnaipatro.com/labs/detour*` route and Worker `aafnai-detour-live-v1` were deleted after this correction. They are not submission or bonus evidence.
- The current live-site CI gate is `tests/live-site.test.mjs`; it targets only the editorial URL and waits for real remote seeks to settle before recording the held point.
- Checklist count remains **89/100** because step 078 was already checked; the evidence basis is now the distinct editorial placement rather than the retired lab page.

## 2026-11-15 · Authenticated Contra recheck and final rights/package reconciliation

- The connected Contra session authenticated successfully and retrieved the active Video.js Skins Design Challenge. Challenge-level state reports **submissions enabled** and deadline `2026-11-17T07:59:00Z`; the public requirements remain consistent with the recorded rule register.
- The available Contra challenge action does **not** expose the signed-in entrant's joined-form fields or an account-specific rule permitting a second entry. Its public “Join to submit!” header is presentation metadata, not proof of join state or entry allowance. **002/091 remain open.**
- Reconciled `RIGHTS.md` from the historical Phase 8 source to the actual public authority `a3b43f74…` / `detour-dist-a3b43f74c765`, time-zero poster and completed step-094 audit.
- Independent extraction of reusable artifact 14161323994 confirmed `detour-video-skin-0.1.0.tgz` is **16,417 B**, SHA-256 `6c3680164f42bf582fe739b0e82af73826d35aea9a3f2ae8558c90cd6d6ad5cc`, with exactly **15 files** and no management-secret/API-hook match.
- No new independent checklist item can honestly pass without 090/091 or owner submission. Resume remains **091**.

## 2026-11-15 · Phase 10 verification accepted — 092–095 and 098

- Validate DETOUR run **43713525858** passed end-to-end at verification head `b9b1495f4f66422dfa369cafcad2738fff6b4592`. The repaired exact-public gate passed 092 and 093: signed-out HTTPS, @videojs/html **10.4.0**, real Mux captions/playback, **42.35→18→42.350s** Return, desktop keyboard controls, 375×667 touch-shaped controls and the bright alternate-media route.
- **094 accepted.** The final audit scanned **69 emitted text files**, verified Apache-2.0 plus project-authored media provenance and permissive pinned production dependency licenses, and checked a **15-file** package dry-run for leaked internal/demo/test/report material or Mux management hooks.
- **095 accepted.** The tarball installed into a fresh external host and returned to **42.350s** in Chromium, Firefox and desktop WebKit. Artifact **14161323994** preserves the reusable package (ZIP digest `sha256:1077a7f45a101090985f065e6e57b3d2899cc2dedd9d8e93ccbc94f7c3b4c304`). Production-dist artifact **14161094736** is also preserved (ZIP digest `sha256:76282311a905aed6d325d2adfa04b73844360b7b13042648ab071470381ab3bc`).
- **098 accepted.** The judging route remains `/mux/` on public runtime source `a3b43f74c7652c707c3703193ab1081820bafa79` / `detour-dist-a3b43f74c765`; the independent rollback remains `detour-release` / `detour-dist-50ac9661e315`. Run 43713525858 re-tested both public paths. The five later branch commits changed CI/tests/docs/release metadata but no `detour/skin/` runtime file, so a bookkeeping redeploy is not required.
- Prepared the [Phase 10 owner handoff](submission-report/PHASE-10-HANDOFF.md): internal official-rubric rehearsal, must-fix list, provisional form payload and exact freeze/rollback record. **096/097 stay unchecked** because their pass conditions depend on 091's live account/form evidence. The internal point estimate is not an official score.
- Verified count is **89/100**. Resume at **091**: confirm second-entry/current-form eligibility, then close 096/097. Step 090 remains fresh-human only; 099 is owner submission and 100 is post-submission verification.

## 2026-11-15 · Phase 10 first exact-public control run diagnostic

- Run 43713238320 **passed 092**: exact public HTTPS source/dist headers, pinned @videojs/html 10.4.0, real captions, 42.35→18→42.350 Return and 206/1,024-byte backup all succeeded.
- Step 093 reached and successfully **entered fullscreen by keyboard Enter**, then timed out waiting for native Escape to leave fullscreen. This does not show that the fullscreen control failed; it shows native Escape behavior is not a reliable proxy for activating the control's exit state in this automation context.
- The public control gate now uses the same focused fullscreen button + **Enter** for both enter and exit. Settings still independently requires **Escape** to close its menu and restore focus. No product code or acceptance minimum is relaxed.
- 092–095 remain unchecked until the corrected exact-head run completes and the final audit/package stages execute.

## 2026-11-15 · Phase 10 steps 092–095 implemented (acceptance pending)

- Added `tests/phase10-public.test.mjs` against the **actual submitted candidate URL**, not local preview. Step 092 pins HTTPS/source/dist, @videojs/html **10.4.0**, real Mux playback, captions, 42.35→18→Return and a 206/1,024-byte independent backup probe.
- The same public test exercises the five required controls with **desktop keyboard** and a **375×667 touch-enabled Chromium context**: play/pause, real seek + time, mute, fullscreen, plus Settings→Escape focus restoration. It also checks all five remain visible over the bright alternate media. Touch is browser emulation and does not close physical-device step 062.
- Added `scripts/final-audit.mjs`: scans built text assets for Mux management credential/API hooks, checks public config keys, exact media hash/provenance, Apache-2.0 entry license, production dependency licenses, dist directory boundaries, and `npm pack --dry-run` contents.
- Expanded the package README with exact pack/install/build instructions, minimal host-owned media/captions example, VOD/source-reset limits and license/media boundaries. The packed-host test now explicitly requires `skin/format-time.js`.
- CI now preserves a success-only `detour-video-skin-0.1.0.tgz` artifact in addition to the production dist. **092–095 remain unchecked until this exact head passes.**

## 2026-11-15 · Step 088 accepted; Phase 10 independent verification begins

- Mux/public run 43712857162 passed the new executable language audit in **3.78s**. It opened the actual signed-out primary route, alternate-media route and blocked-provider recovery state.
- Primary title is `DETOUR — Keep your place`; alternate title is `DETOUR — Another video`. Visible creative copy contains no Mux/R2, workflow, GitHub Actions, fixture/debug, source-SHA, detour-dist, developer or old “Independent host” terminology.
- Recovery presents exactly the host-owned **Try video again / Use backup video** surface; the nested generic player error stays hidden in this host only. The public playback config remains a machine resource and is not presented as creative UI.
- **088 accepted.** Phase 9 is **9/10 complete**; **090 remains intentionally open** because its pass condition requires a fresh uncoached human reviewer. The creator and automated browser are not substitutes.
- **091 also remains open** because public rules do not establish account-level second-entry permission/current joined-form fields. Per CONTINUE.md, resume independent work at **092** rather than stopping on those owner/account dependencies.

## 2026-11-15 · Phase 9 evidence set accepted — 082–087 and 089

- Final public capture run 43712329599 passed against deployed source `a3b43f74c7652c707c3703193ab1081820bafa79`; artifact 14161336344, ZIP digest `sha256:2229dabdc21c38a2310d7e7dad70044492ae1a9e1fb23609e142018a57f3a5e7`.
- **082 hero:** 1248×806 player-only held state, current **00:18 / 00:55**, lime origin bracket and visible **Return to 00:42**.
- **083 detail:** 1246×135 direct browser crop includes current playhead, full bracket, time pair and Return ticket; no composited overlay.
- **084 difficult states:** 363×356 compact frame requires a real active caption cue at 18s; 363×548 recovery frame blocks the primary provider and shows exactly one viewer-facing Retry/backup surface.
- **085 clip:** 6.08s, 960×720 VP8, **no audio stream**, real keyboard/focus interaction, verified final media time **42.0s**. No overlay simulates completion.
- **086 alternate:** 944×635 distinct `daylight-study.mp4`, duration **01:04**, same skin/mark/Return behavior.
- **087/089:** [presentation manifest](submission-report/PHASE-9-PRESENTATION.md) locks rationale, alt text, filenames, dimensions, byte sizes and SHA-256s. The six selected assets each demonstrate a different outcome; the duplicate raw Playwright recording is intentionally excluded.
- Resume **088** for executable creative-route copy/metadata audit. **090 remains human-only** and will not be checked by automation.

## 2026-11-15 · Phase 9 recovery/capture candidate deployed for final public proof

- Full run 43711976766 passed source `a3b43f74c7652c707c3703193ab1081820bafa79` across Chromium, Firefox and desktop WebKit. The new bounded WebKit settlement check observed **real native ended**, then visible ended/replay UI with `data-media-state=ended` in all three engines.
- Successful CI staged **74 files** at immutable `detour-dist-a3b43f74c765`.
- Updated only Cloudflare Worker `detour-mux-release` to that immutable branch; deployment id `df263a1169024f2598b63aec0bb41bbe`. The independent `detour-release` rollback remains untouched.
- The final public evidence gate now points at this exact source/dist. It must prove the single recovery surface and regenerate the hero/detail/caption/recovery/alternate/clip set before 082–089 are promoted.

## 2026-11-15 · Phase 9 evidence review — recovery duplication and capture fidelity fixes (validation pending)

- Evidence run 43711518943 successfully produced the hero, detail, compact, recovery, alternate-context and **6.32s** interaction clip after making held-state duration assertions source-aware. The clip returned to **42.0s** and uses real keyboard/focus input with no overlay that simulates playback.
- Visual review found one genuine public-copy defect: when Mux failed, the host recovery panel and the reusable player's generic `This video could not load / Try again` error were both visible. The Mux host now suppresses only its nested generic player error while its host-level recovery owns Retry/backup. Other DETOUR hosts keep the generic player error unchanged.
- Tightened the evidence capture rather than accepting weak frames: compact capture now requires a real active caption cue while held at 18s; detail crop includes 34px above the shelf so the lime held bracket is not clipped; recovery capture asserts no duplicate error surface.
- Full run 43711379164 exposed a desktop-WebKit timing race after a **real native ended event**: the immediate test assertion ran before the DETOUR ended UI became visible. The test now waits up to 2s for the actual `.detour-ended` and replay controls; it still requires real UI visibility and does not dispatch/fabricate an ended event.
- These changes require fresh full CI and a new immutable public candidate before 082–086 can be accepted.

## 2026-11-15 · Phase 9 step 081 accepted; evidence capture milestone starts

- Public verification run 43711048857 passed the deployed `c647d59d6f00…` candidate. Reviewed its actual artifact: at 375×667 player top is **65.98px** versus **155.28px** before polish; at 1280×900 player bottom is **869.44px** versus **933.83px**, so the full desktop cold player now fits the expected viewport.
- The reviewed mobile frame begins at generated **00:00:00.000** and the player clock reads **00:00 / 00:55**. Held state shows actual 18s media with **00:18 / 00:55**, the lime held bracket and **Return to 00:42**; healthy recovery/provider UI is absent.
- Full exact source `c647d59d6f00dae6f753a20ebc163ef12bcd5992` remains green in run 43710674795 across Chromium, Firefox, desktop WebKit, packed-host, responsive and keyboard probes. Follow-up exact-head run 43711048833 also passed.
- **081 accepted.** Added a separate public evidence capture workflow for 082–086: player-only wide hero, control-shelf detail, 375px captions, provider-recovery state, distinct-media alternate mount and an authentic 6–10s keyboard/focus interaction recording. The capture script verifies real times rather than fabricating overlays.
- Resume at **082**. Step 090 still requires an uncoached human reviewer and cannot be replaced by automation.

## 2026-11-15 · Phase 9 step 081 — polished immutable build deployed (public requalification pending)

- Full DETOUR run 43710674795 passed the polished source `c647d59d6f00dae6f753a20ebc163ef12bcd5992` across production build, R2 fallback, architecture, packed host, Chromium, Firefox, desktop WebKit, footprint and responsive/keyboard/touch-emulation probes. It staged **75 files** at immutable `detour-dist-c647d59d6f00`.
- Dedicated Mux run 43710674865 passed after fixing the first real polish regression: author CSS `.mux-panel { display:flex }` overrode the HTML `hidden` state. Added an explicit `.mux-panel[hidden] { display:none; }` rather than weakening the assertion.
- Mux provisioning run 43710535679 reused the same content-hash asset and public Playback ID, confirming **206 / 1,024 B** for the same static rendition; the updated public config uses the time-zero poster.
- Updated only isolated Worker `detour-mux-release` to immutable `detour-dist-c647d59d6f00` / source `c647d59d6f00…`; Cloudflare deployment id `24268d4b668c4827b3cea936ba8fe113`. The independent `detour-release` rollback remains unchanged.
- Public signed-out assertions are now tightened to require hidden healthy recovery UI, viewer-benefit copy, time-zero poster, `00:00 / 00:55` and `00:18 / 00:55` clocks, mobile Hold/Return, and a 1280×900 player that fits entirely inside the viewport. **081 remains unchecked until this public gate passes and its capture is reviewed.**

## 2026-11-15 · Phase 9 step 081 — three cold-path friction fixes implemented (public qualification pending)

- Downloaded and reviewed the actual signed-out public capture artifact from Mux verification run 43710251344 rather than relying on the older fixture boards. At 375×667 the player began at y=155px because an **80.5px technical source panel** sat above it; the visible page repeated “Mux-hosted”/“fallback” infrastructure copy before the viewer reached the interaction.
- The cold poster was the Mux frame at ~42s and visibly embedded **00:00:41.917** while the real control clock was **0:00**. That made the very first frame contradict the actual playback position.
- The held-state control clock rendered Video.js smart time as **0:18 / 0:55** while the signature action said **Return to 00:42**. The mechanism was correct, but the visual time grammar was inconsistent precisely where the judge compares current vs held time.
- Implemented only those three high-impact fixes: healthy playback hides recovery/provider UI and uses viewer-benefit copy; the Mux poster is now the time-zero thumbnail; and a visual **MM:SS** clock shares DETOUR's formatter with the Return ticket while the native `media-time` elements remain present as visually hidden semantic time values.
- Added Mux tests for the time-zero poster, healthy-copy boundary, hidden recovery panel, `00:18 / 00:55` visual clock and failure-triggered backup path. This commit requests immutable dist staging after the full DETOUR gate. **081 remains unchecked until the new immutable build is deployed and the signed-out public mobile/keyboard checks pass.**

## 2026-11-15 · Phase 8 complete — frozen public Mux candidate and rollback

- **076 accepted.** Mux provisioning run 43705427292 attempt 2 produced public Playback ID `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ` for the exact showcase hash. Dedicated verification run 43706451003 passed 3/3: public 206 byte range, production-built Hold → 18s → 42.350s Return and blocked-provider fallback.
- Full implementation source `a9bbfcb4ee6810c2e6a5ed0e1f32c731b3780e6a` passed complete DETOUR run 43706450932 and staged **75 files** at immutable `detour-dist-a9bbfcb4ee68`. The new isolated Cloudflare Worker `detour-mux-release` serves that branch and redirects its root to `/mux/`; the older `detour-release` Worker was not modified.
- **076/077 public acceptance.** Run 43707445255 passed 3/3 public-release checks: signed-out HTTPS 200; 375×667 Mux media seekable; Hold 42.35 → seek 18 → Return **42.350s**; fallback byte range **206 / 1,024 B**; blocked Mux exposed recovery and loaded the fallback with no stale mark; 1280×900 desktop smoke rendered a 1248×804 seekable player and exposed fallback.
- **079 accepted.** [Rights/operations](submission-report/RIGHTS.md) separates project-authored media rights, Apache-2.0 entry source, permissive runtime dependency licenses, build-only tools and service retention. Operational restoration responsibility is assigned to the repository/challenge operator; final notices/bundle audit remains step 094.
- **080 accepted.** [Phase 8 freeze](submission-report/PHASE-8-FREEZE.md) locks source/dist, Mux ID/URL, captions, media hash, Worker, R2 fallback and rollback. Real-site bonus remains explicitly skipped. Physical phone, screen-reader and native 200% zoom evidence remain open under 062/064/065.
- Phase 8 is **10/10 complete**. Resume Phase 9 at **081** without mutating the frozen media/service identifiers unless the corresponding release gates are repeated.

## 2026-11-15 · Mux asset provisioned; host and recovery proof implemented (validation pending)

- Re-ran Mux workflow 43705427292 after repository secrets were configured. Attempt 2 completed successfully: public Playback ID `Ml1c1QHJ0001lK9x2dZych2nACRmtSdDl02Iraqzwj22wQ`, content hash `detour-fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1`, `highest.mp4` ready, anonymous byte probe **206 / 1,024 B**, artifact 14158174193. Management credentials remained masked and are not copied into source.
- Added a production-built `/mux/` host that uses the exact same skin and Mux-hosted static rendition, keeps descriptive captions, and exposes explicit Retry Mux / Use fallback video recovery. The already-qualified showcase MP4 remains the independent fallback.
- Added dedicated Mux CI rather than making the core R2 validation depend on optional service availability. Tests require anonymous Mux byte-range access, real 42.35 → 18 → 42.35 DETOUR behavior, blocked-Mux recovery, and stale-mark clearing on source replacement.
- This is **implementation evidence only** until the exact-head Mux workflow and full DETOUR pipeline pass. The commit requests immutable dist staging only after full CI success.

## 2026-11-15 · Release and rights handoff reconciliation (079 in progress)

- Converted the stale initial-prototype release placeholder into an evidence-based handoff: immutable asset source `50ac9661e315`, separately validated core source `1016bd1`, verified release and rollback, explicit omissions and owner-only proof gaps. See [release handoff](submission-report/RELEASE.md).
- Added [asset rights and operational retention inventory](submission-report/RIGHTS.md) covering procedural video/audio, poster, VTT, package source, runtime/build dependencies, Worker/R2 and optional Mux. Rights provenance is engineering evidence, **not** proof of account billing, license sign-off or availability; **079 remains unchecked**.
- Checklist 078 remains the only additional accepted step in this continuation. Resume 076 on repository-secret availability; otherwise complete owner-independent 079 audits and 080 freeze preparations. CI on this head is required before asserting new build validation.

## 2026-11-15 · Mux CI failure diagnosed; explicit real-site skip (078)

- At source `5e7cbed11dd40c22d49d3e90c2f8b04734f2e7b2`, [Actions run 43704372300](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43704372300) failed in `provision` because **both** `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` were empty. The script exited before any Mux API call. This does not mean Mux playback or the core skin failed. No Mux Playback ID has been qualified.
- Adjusted only the optional Mux workflow to preflight both credentials and issue a conspicuous warning/step summary when absent. Both provision and artifact upload are conditional; a green workflow when credentials are missing is **not** evidence that Mux passed. Re-run after the owner configures both repository secrets and use a real signed-out playback/seek test before checking 076.
- **078 accepted by explicit skip:** the production `/integration/` example establishes reusable skin portability but is not independently evidenced as an authentic separate audience-serving website. Do not claim the additional real-site bonus. See [decision](design/PHASE-8.md#step-078-real-site-bonus-skip--2026-11-15).
- Previously qualified baseline remains [Actions run 43703881941](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43703881941), including R2-backed byte-range media and signed-out Hold → Seek → Return; it is independent of the optional Mux workflow. Newly modified workflow and progress documentation require fresh exact-head CI before acceptance; no new test run is represented as passed here.
- **Next actionable:** 076 after GitHub secrets are configured; independently audit 079 rights and media/service ownership, and advance the 080 release freeze where physical-device and owner evidence are not required.

## 2026-11-15 · 072 accepted; 075 Mux reserve decision

- [Actions run 43703881941](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43703881941) passed the complete pipeline on source `1016bd1b39d817261fc0a5b0d3cbdc2252c2ce6e`. The strict public-release test completed in **3.725 s**: HTTPS 200, pinned source/dist headers, MP4 byte range **206 / 1,024 B / video/mp4 / Accept-Ranges: bytes**, poster/VTT checks, then signed-out Hold at 42.35 → seek 18 → Return at **42.350 s**, remaining paused.
- **072 accepted.** Public transport is isolated Cloudflare Worker + private R2 binding; the bucket's public `r2.dev` endpoint is disabled. The verified frozen source remains `detour-dist-50ac9661e315`.
- **075 GO.** The official challenge offers **+1 point** for using Mux when the submitted player plays a Mux-hosted video, the form includes the public Playback ID, and the asset remains live through judging. At this checkpoint roughly **45.5 h** remained before the challenge deadline, so reserve **90 active engineering minutes** for the optional path (~3.3% of that buffer). Stop/skip the bonus if a ready public playback path plus signed-out browser seek proof is not achieved inside the cap.
- Lowest-risk implementation: keep R2 MP4 as default/fallback; upload the same DETOUR showcase as a separate content-hash-keyed Mux asset with `playback_policies:["public"]`, `video_quality:"basic"`, and current `static_renditions:[{resolution:"highest"}]`. Use only public Playback ID/URL client-side; management credentials stay in GitHub Actions secrets. Static MP4 is preferred for the bonus path because it preserves DETOUR's native `<video>` contract across Chromium/Firefox/WebKit without adding an HLS runtime to the reusable core.

## 2026-11-15 · Global R2 release storage after regional-cache failure

- [Actions run 43703342426](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43703342426) showed that per-edge Cache API warming was not sufficient: a cold GitHub runner region still timed out waiting for media metadata.
- Created isolated R2 bucket `detour-release-assets` in APAC and attached it to `detour-release` as binding `DETOUR_ASSETS`, with no new long-lived credential. The Worker stores objects under the frozen source SHA and hydrates a missing object once from the immutable dist branch.
- Prehydrated the 8 root-critical release objects. R2 inventory is **8 objects / 1,063,733 B** including the exact **871,570 B MP4**, **46,768 B poster**, index, player/showcase JS/CSS and VTT. Subsequent regions read durable R2 objects rather than GitHub or a regional cache.
- The public response now reports `X-DETOUR-Storage: r2` when served from durable storage. The strict 072 test remains unchanged and must pass from CI before acceptance.

## 2026-11-15 · Cache-backed HTTPS transport after first public gate

- [Actions run 43702919194](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43702919194) reached the public origin but timed out waiting for video metadata. Independent resource probes showed the cause: immutable JS/CSS/VTT requests through raw-GitHub proxying took roughly **7–10 s each**, making repeated video-range fetches unsuitable for the 30 s first-load gate.
- Updated only the release Worker transport: each immutable file is fetched once, normalized, stored in `caches.default` under the frozen source SHA, and then served from Cloudflare cache. MP4 range requests now slice the cached full object deterministically and return 206 without refetching raw GitHub for each byte range.
- External prewarm after deployment measured the same JS/CSS/VTT resources at roughly **0.17–0.31 s**, versus the earlier 7–10 s. The strict HTTPS browser gate is intentionally unchanged and must pass before 072 closes.

## 2026-11-15 · Public HTTPS origin and exact-browser gate (validation pending)

- Full source `50ac9661e315f099d3121850a57dd398cbeb5865` passed Actions run 43702266692 and staged **70 files / 2,163,553 B** at immutable branch `detour-dist-50ac9661e315`. The 871,570 B showcase MP4 SHA-256 is `fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1`.
- Deployed isolated Cloudflare Worker `detour-release` at `https://detour-backup.aafnaipatro.com/`, pinned to that immutable branch/source. It corrects MIME types, exposes source/dist headers and preserves upstream byte ranges with an explicit 206 slicing fallback. An independent public fetch returned the expected DETOUR title/tagline; no login/gate was observed.
- Added `tests/https-release.test.mjs`: a fresh 375×667 Chromium context must receive the pinned source headers, load the real poster/VTT/MP4, fetch bytes 0–1023 as **206 / 1,024 B / video/mp4 / Accept-Ranges: bytes**, then execute Hold at 42.35 → seek 18 → Return within ±0.5 s while remaining paused. This exact browser gate is pending CI.
- Frozen dist staging is now explicit/manual or `[stage-dist]` commit-message gated so ordinary validation commits do not create one immutable branch per run.

## 2026-11-15 · Immutable dist branch fallback for HTTPS release (validation pending)

- Exact source `bc6c473668ae3b05faff1a037e5b0655949abedf` passed validation and produced artifact 14157281055: **1,631,159 B ZIP**, SHA-256 `9ffdf3b8a9f0e210acfae38618a56af3fd22f7680acfcd96b30c00405da8501b`; expanded release is 2,163,553 B and contains the 871,570 B showcase MP4.
- Cloudflare Pages Direct Upload asset JWTs cannot be redeemed through the connected API boundary (upload session succeeds; asset upload returns authorization failure). The isolated `detour-videojs` Pages project was created but has not received a deployment; no existing Pages project was changed.
- Added successful-CI staging to an immutable `detour-dist-<source12>` branch with a SHA-256/byte manifest. This gives a frozen public origin source for an isolated Worker fallback without embedding or rebuilding release binaries. The stage runs only after the full checklist validator and browser suite pass.
- 072 stays open until the resulting HTTPS Worker origin passes signed-out playback, byte-range seek, poster and captions.

## 2026-11-15 · Immutable release artifact for Direct Upload (validation pending)

- Cloudflare Pages Git-connected project creation returned Cloudflare error 8000011 (internal Pages Git installation issue) even though the connection has Pages Write. Existing Patro/DHAGO projects were not modified.
- Added a success-only CI artifact containing the exact production `detour/dist/` bytes, named with the source SHA and retained 14 days. This is the input for isolated Pages Direct Upload; it prevents deployment from rebuilding different bytes or depending on the broken Git integration.
- Keep 072 open until that artifact is deployed and signed-out HTTPS seek/poster/caption checks pass.

## 2026-11-15 · Static release-asset materialization

- Added a DETOUR-only write workflow that runs only when its own workflow file changes or by explicit manual dispatch. It regenerates the already-tested showcase and `daylight-study`, verifies duration and SHA-256s, then force-adds exactly six static media files and commits them if bytes changed.
- This is intentionally separate from validation CI. It contains no Cloudflare/Mux credential and cannot touch DHAGO/Patro assets. Once materialized, Cloudflare Pages can run Vite without depending on FFmpeg in its build image.

## 2026-11-15 · Judge demo and portability accepted; HTTPS gate active

- Exact source `34261f03c8df75bbeed847879de7269ab794fb55` passed [Actions run 43701045585](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43701045585).
- **073:** root showcase appears immediately at 320×640, 375×667 and 1280×900, remains paused, exposes Keep, uses the verified showcase MP4/poster and has no dialog/password gate.
- **074:** the production-built `/integration/` host uses `daylight-study.mp4` with separate captions and the same package skin; Hold at 42.35 → seek 18 → Return landed at **42.350s**.
- Closed 073 and 074. Resume 072 because the same media bundle still needs signed-out HTTPS playback and seek qualification. The planned Cloudflare route is isolated from existing Patro/DHAGO Pages projects.

## 2026-11-15 · Production multi-page portability fix (validation pending)

- Run 43700686209 reached the new 074 test but timed out because Vite's production build emitted only the root entry; `integration/index.html` was a source/dev page, not a built production page.
- Added explicit Vite multi-page inputs for the public showcase and independent integration host. This makes the portability proof exercise a real production artifact rather than relying on a dev-server fallback. No skin branching or media-specific logic was added to the package.

## 2026-11-15 · Phase 8 portability implementation (validation pending)

- Prepared the independent-host example to default to `daylight-study.mp4` + its own VTT rather than the public showcase or the regression fixture. Media selection remains a host concern; the same `createDetourPlayer` skin entry is reused unchanged.
- Added an explicit 074 browser proof: load `integration/`, verify the distinct clip/captions, hold at 42.35s, seek to 18s and Return to the saved point within ±0.5s. This is a separate host context, not a special skin variant.
- Both 073 and 074 now share the next exact-head CI gate; neither is checked until that run is green.

## 2026-11-15 · Hosted-runner performance diagnostic correction

- Run 43700337821 passed the new 073 root composition and all ordinary browser/package work, but one of the *secondary* five-fresh/five-repeat diagnostic samples reported a 350ms process-wide Long Task on the GitHub-hosted runner. The dedicated five-run signature performance gate still passed.
- Kept the normative 069 assertion unchanged in the dedicated five-run control trace. The broader cold/repeat-context sampler now records >50ms process-wide tasks as diagnostics instead of attributing every browser/runner task to DETOUR controls. This preserves performance evidence without converting host scheduling noise into a product failure.

## 2026-11-15 · Phase 8 one-screen judge demo implementation (validation pending)

- Public root now selects the 56s showcase by default with its real poster and captions; automated Phase 7 regressions explicitly request the unchanged 64s `navigation-study` fixture through a non-visual query parameter so release media cannot silently rewrite QA assumptions.
- Reworked only the demo-page framing: compact wordmark/tagline and minimal top padding place the player immediately in view instead of behind a large hero heading. No gate, intro animation, autoplay or alternate site mode is added.
- Extended showcase tests to check the root at 320×640, 375×667 and 1280×900: player must start above 120 CSS px, be meaningfully visible in the first viewport, remain paused, use the showcase MP4/poster, expose Keep, and contain no dialog/password gate. Pending exact-head CI.

## 2026-11-15 · Phase 8 step 071 accepted; 072 local bundle ready

- Exact source `87afdf6a740bbcce95caaa04e2c02886071c895c` passed [Actions 43699914256](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43699914256). Showcase verification passed **2/2**: deterministic provenance/A-V/frame separation and a fresh local HTTP browser mount seeking exactly **18.000s → 42.000s**.
- Closed 071. The selected asset is the custom 56s procedural study; the unchanged 64s `navigation-study` stays the tested fallback. No external footage/music or DHAGO media is on the critical path.
- Kept 072 open because local HTTP is not HTTPS. The MP4/poster/VTT/manifest implementation is ready; public byte-range/seek/caption validation will close it during release work.
- Resume at 073: move the playable showcase to the public root with a compact first-viewport composition. Do not change Phase 7 tests to the 56s media; they retain an explicit fixture query.

## 2026-11-15 · Phase 8 generator-scope correction (validation pending)

- Run 43699456032 proved the **new showcase verification itself passes**, but the full Chromium regression correctly failed because the first Phase 8 duration edit changed the shared legacy fixture encoder from 64s to 56s while the showcase encoder still carried a 64s cap. That altered Phase 7's established source duration and invalidated regression assumptions.
- Restored `encodeFixture()` to exactly 64s and scoped the **56s** cap only to `encodeShowcase()`. This is a generator fix, not a test relaxation. The existing Phase 7 baseline remains 64s; only the dedicated Phase 8 media is 56s.

## 2026-11-15 · Phase 8 custom media implementation (validation pending)

- Selected a **56-second deterministic procedural motion study** rather than external stock/documentary footage. It is generated only from FFmpeg color/grid/box/text filters plus a low-level synthetic sine bed; the existing silent `navigation-study` remains the fallback. No DHAGO media or third-party footage/music is reused.
- Added a generated bundle contract: 1280×720 H.264/AAC fast-start MP4, poster extracted from the actual 42s frame, descriptive VTT and JSON provenance/timing manifest. Binary outputs stay generated/ignored; source instructions remain reviewable.
- Added `showcase.test.mjs`: ffprobe verifies codec/dimensions/audio/duration; MP4 atom order verifies fast-start; frame hashes at 18s and 42s must differ; fresh Vite-preview Chromium must seek to both times and fetch poster/VTT/manifest over local HTTP. HTTPS qualification remains step 072/release work.
- CI will run the showcase verification after the production build. Step 071 remains unchecked until this exact implementation passes; step 072 cannot pass before HTTPS verification.

## 2026-11-15 · Phase 7 automated/browser acceptance and Phase 8 handoff

- Exact source `9eeeb770b4f7cc7d7d5ba4c766095f05c2116be2` passed [Actions run 43698982276](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43698982276) with architecture, packed external-host, full Chromium/Firefox/desktop-WebKit, footprint and all Phase 7 probes. The final race set includes a real 8s Return deadline followed by a late resolution and a fresh-page waiting → pause → Return sequence.
- Checked 061, 063 and 066–070. Visual review of artifact 14155597667 confirmed representative 240px held/settings/pending, 1280px settings, forced-colors, 200% CSS-layout zoom and Arabic long-clock captures have no clipped signature action or horizontal loss. Step 065 remains open because CSS zoom is not native browser zoom.
- Kept 062, 064 and 065 open with exact evidence boundaries. Physical Android/iPhone and NVDA/VoiceOver are not available through this executor; the prepared [device QA protocol](design/DEVICE-QA.md) is the handoff. Per CONTINUE.md, advance independently to Phase 8 at 071 rather than idling on external QA.
- Performance gate: incremental gzip **1,815 B / 15,360 B**. Five fresh-context and five repeat-context Chromium runs at 320px observed zero Long Tasks over 50ms; scripting/layout durations are recorded in CI. Headless LayerTree did not expose a stable compositing-layer count, so no GPU/compositing-cost claim is made.

## 2026-11-15 · Independent timeout and buffering-race probes (validation pending)

- Split 068's real 8s timeout/stale completion and provider-wait/pause/Return cases into separate fresh pages. This avoids carrying a replaced Video.js store and synthetic timer state into the buffering fixture.
- The timeout case still waits the actual production 8s deadline and resolves the old promise after failure. The buffering case now starts from a clean player and mirrors the already-verified waiting fixture before pausing and returning. No product behavior was relaxed.

## 2026-11-15 · Waiting-fixture alignment (validation pending)

- Run 43698360905 again passed every pre-existing browser/package gate, step 067 and the real 8s timeout/stale-completion portion of 068. Only the newly added buffering visibility assertion failed.
- The older verified provider-waiting fixture freezes both `readyState` and the native clock while dispatching `waiting`; the new subcase had frozen only `readyState`. Aligned the subcase exactly with that established fixture, then deletes both temporary properties before Return. This keeps the test focused on pause intent and recovery rather than creating a second, subtly different buffering simulator.

## 2026-11-15 · Buffering-race probe correction (validation pending)

- Run 43697966802 passed the new 067 duration/range test and the existing duplicate/manual/source-swap 068 stress. Its only Phase 7 failure was the new buffering subcase because it dispatched `waiting` while the media was already paused; the player correctly did not present active buffering in that state.
- Corrected the probe to enter `waiting` while playing, wait for the real buffer indicator, pause through the actual play control, restore native readyState and then Return. The asserted requirement remains unchanged: pause must win, and recovery must never restart playback. The preceding real 8s Return-timeout/stale-completion assertions had already passed before that failed visibility assertion.

## 2026-11-15 · Exact-head Phase 7 green baseline and remaining difficult-state probes

- Exact source `88e442377b30e053c7b1ac0404daed90b4b0ac8d` passed [Actions run 43697253579](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43697253579): architecture, packed external host, full Chromium/Firefox/WebKit regressions, footprint budget and all Phase 7 probes. End-key snapshots were **63.95/64.00s** in all three desktop engines. The Phase 7 screenshot artifact is 14154867955.
- Added direct step 067 evidence for duration expansion/shrink/restoration with a held mark, live classification, out-of-range Return and NaN/Infinity absence. Added step 068 timeout evidence that waits for the real 8s Return deadline, resolves the stale promise afterward, and confirms time/mark/pause intent are untouched; it also exercises paused buffering followed by Return. These additions are pending a new exact-head CI run.
- Physical Android Chrome/iPhone Safari (062), NVDA/VoiceOver (064), and native browser 200% zoom (065) remain unavailable in this executor and are explicitly not replaced by Playwright emulation.

## 2026-11-15 · WebKit final-frame seek correction (exact-build CI pending)

- [Actions run 43696833543](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43696833543) passed both desktop Chromium/Firefox full suites, the complete **10/10 independent Phase 7 probes**, 25 responsive screenshots, emulated iPhone landscape and Pixel tap, 066/068 stress, 1,812 B incremental gzip, and 10 no-long-task Chromium traces. Its only failure was desktop WebKit's End key remaining at 0.000/64.000 seconds.
- The first keyboard boundary override still sought the exact 64.000s end; changed it to request the final decodable frame (last seekable edge minus 50 ms) and capture the keystroke at document level only if its composed path includes this player's seek slider, preventing native WebKit from overriding it. Native Home and End remain keyboard actions, source/timer guards remain in place. A fresh WebKit run must confirm actual arrival before checking Phase 7 keyboard certification.

## 2026-11-15 · Phase 7 regression fixes (exact-build CI pending)

- At [Actions run 43696239741](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43696239741), Chromium and Firefox full suites passed. Desktop WebKit failed Home/End: native playhead was still **0.000s** after End with duration and seekable end both 64.000s. Added an explicit, capability-checked Home/End keyboard boundary path to the ordinary media shell, using the actual Video.js store seek and a source-scoped manual-seek cancellation event for pending Returns. It does not replace arrow-key behavior or autoplay.
- The Phase 7 duplicate-Return probe incorrectly used Playwright's delayed click before repeated DOM clicks; the 8s pending deadline expired and permitted a **new valid retry**. Corrected it to dispatch four clicks synchronously inside the 8s deadline. The test still requires exactly one store seek, and still checks manual-seek cancellation, stale resolution and source replacement. Behavior and test both await fresh CI.
- 43696239741 otherwise passed 25/25 Chromium state captures, landscape iPhone-descriptor WebKit, Pixel emulated touch, 063 keyboard probes, long 9:59:59 RTL/dense chapters, five fresh-context and five repeat-context performance traces, and 1,781B gzip delta. Ten traces recorded zero observed tasks >50 ms. All are Linux-hosted/browser-emulated, not physical QA.

## 2026-11-15 · 25 responsive screenshots and capability-aware landscape verification

- [Run 43695753935](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43695753935) passed the full **5 widths × 5 states = 25** Chromium responsive player matrix, keyboard-only signature, Shift+Tab/rejected-Return focus, reduced-motion/forced-colors/CSS-zoom, emulated Pixel touch (landed 19.199s), gzip budget (1,781 B), and five no-long-task signature loops. Uploaded 28 screenshot files in Actions artifact 14154059762. This is browser emulation evidence, not physical-device proof or accepted screenshot design review.
- The emulated iPhone landscape probe exposed that WebKit legitimately reports fullscreen unsupported and hides its control. Changed the geometry validator to require visibility only when `fullscreenAvailability` reports `available`; this preserves capability truthfulness rather than forcing a decorative disabled fullscreen button.
- Desktop WebKit's Home/End scenario still failed its end-interval assertion after 10s; added an exact native clock/seekable-end diagnostic before asserting. This is an unresolved **software/browser test issue** until the next run reveals whether End is ignored or frame-clamped.
- Extended Phase 7 tests with a synthetic 9:59:59 clock/RTL/dense-chapter case, duplicate Return/manual-seek/source-swap cancellation, and five fresh-context plus five repeat-context Chromium scripting/layout/layer observations. Newly added cases are **not yet verified**.

## 2026-11-15 · First independent Phase 7 probe results and precision fixes

- GitHub Actions [run 43695310958](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43695310958) independently ran the Phase 7 tests even after a desktop-WebKit regression failure. The import-graph gzip measurement passed **1,781 B incremental** (base 81,155 B; enhanced 82,936 B) against **15,360 B**. Five 320px Chromium signature loops observed **zero long tasks >50ms** (290–314 ms wall time per iteration; not a device-speed claim). Keyboard-only, Shift+Tab/rejected Return, reduced motion, forced colors and emulated CSS zoom probes passed.
- Responsive matrix and iPhone-landscape probes exposed a **test harness error**: a button within a hidden parent retained its computed display but its rectangle was zero. Changed visibility checks to actual rendered rectangles. The emulated Pixel probe previously tapped the inner slider role instead of the time-slider surface and timed out; it now uses the player slider geometry, logs landed time and asserts a bounded seek.
- Desktop WebKit's Home/End test was using a 50ms tolerance against a potentially frame-clamped duration; updated to a measured seekable-end tolerance of 0.5s and added exact arrival diagnostics. Native ended behavior remains an independent assertion and must pass on the next run. No Phase 7 box is checked by these fixes.

## 2026-11-15 · WebKit cross-browser diagnostics and independent Phase 7 evidence (pending)

- Run 43694806349 reached desktop WebKit, failing the fullscreen Escape assertion, a geometry invariance check and the native end-of-media wait. Added an explicit zero-minimum grid column to stop dynamic min-content sizing from shrinking the seek rail when held actions appear. The browser regression now logs the natural-end stage and allows a bounded 15s native-ended wait; this is instrumentation, **not** a manufactured ended event or a pass.
- Previously committed capture-phase Escape interception addresses the native fullscreen/Settings ordering, pending WebKit confirmation. Phase 7 footprint/responsive steps now execute even when preceding browser tests fail; both probes and capture artifacts will be available for diagnosis rather than silently skipped.

## 2026-11-15 · Firefox fullscreen menu Escape fix (validation pending)

- GitHub Actions run 43694723080 failed Firefox's full-screen Settings Escape path: menu stayed visible after Escape while fullscreen/native transition was in flight. Added focus-scoped, capture-phase Escape handling to close the playback disclosure before native fullscreen handling, and allowed asynchronous visibility settlement in the regression test. Do not mark this pass until exact-head Firefox CI confirms it.
- Added iPhone-descriptor **landscape WebKit emulation** and Shift+Tab plus controlled rejected-Return focus tests to Phase 7. These are software emulation and keyboard checks, not physical iPhone or screen-reader certification.

## 2026-11-15 · Phase 7 footprint and five-repeat interaction probe (validation pending)

- Added reproducible, equal-target gzip compilation of the detached base and DETOUR entries and a 15 KiB incremental budget assertion. Common scoped CSS is identical across entries (zero incremental CSS); the total CSS is not claimed as zero. This import-graph estimate does not replace actual network trace byte accounting.
- Added five 320px Chromium hold → two seeks → Return traces collecting PerformanceObserver long tasks and reporting wall time per run; no verified performance results are claimed until exact-head CI passes. Physical or budget-hardware results remain open.

## 2026-11-15 · Phase 7 browser-probe implementation (validation pending)

- Added `tests/phase7.test.mjs` with an exact 240/320/375/768/1280px embedded-player matrix for idle, held, real captions, Settings and delayed Return, plus optional real Playwright screenshots; keyboard-only Hold → Home/End → Return and Stay → Escape/focus; reduced motion, forced colors and emulated CSS zoom; and Pixel Chromium emulated touch tap/seek/return.
- CI now invokes the distinct Phase 7 probes after existing build/architecture/packed-host/full-browser regressions, and uploads screenshot artifacts on both success and failure. This is implementation, **not yet a verified passing run**. Existing checklist boxes 061–070 stay open until actual evidence is reviewed.
- Physical iPhone Safari, Android Chrome, NVDA/VoiceOver and real browser zoom cannot be inferred from Playwright descriptors. They remain explicit device/AT gates. Next action: inspect exact-head CI output and screenshots, fix failures, and only then promote supported steps.

## 2026-11-15 · Phase 6 step 058 reconciliation and Phase 7 handoff

- Verified the already-committed iPhone-shaped Playwright WebKit packaged-base consumer at source `15bd747d57285eb7be236577aff7b41e688cc6fc`, successful [Actions run 43693510683](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43693510683). The executable test reads media-store volume/mute availability, tests either supported volume-setting or unsupported-slider state, and toggles native mute on and off. It explicitly does **not** require nonzero maxTouchPoints in Linux WebKit and is **not** real iPhone/touch/Safari evidence.
- Reconciled 058 to verified, bringing Phase 6 to 10/10 executable and previously evidenced checklist items. Existing desktop Chromium/WebKit external-host coverage includes transport, caption toggle, playback-rate selection, Escape/focus restoration, and capability-conditional fullscreen. This is a tracking/evidence reconciliation, **not** a new browser run or feature patch.
- Next actionable: 061 responsive state matrix and real screenshots. 062 physical iOS/Android touch, 064 AT, and 070 real-device browser gate remain unverified. Owner dependencies 002 and 017 remain open. The CI progress validator must pass on this reconciliation commit.

## 2026-11-15 · Phase 6 core implementation checkpoint

- Verified 051, 055, 056, 057, 059 and 060 at `524bac5fb73aaf0568e559c4e08342137c443da7` / Actions run 43692857813. The run passed 5 architecture checks, 3 packed-consumer tests, 17 Chromium scenarios and the 10-run desktop-WebKit signature check.
- Split generic media lifecycle from held-place behavior. `detour-video-skin/base` now proves the five ordinary controls can load from the packed artifact without importing or registering `detour-place`.
- Added a true stale-after-dismissal race and a 20-cycle pending-Return remount stress test. All 20 cycles cleared the marker and one-shot deadline; the final Return dispatched exactly once.
- Packed Chromium and desktop WebKit now cover the signature path plus Stay, play/pause, mute, captions, rate and Settings focus restoration. Dense 64-cue metadata does not add rail clutter.
- Step 058 stays open because its work text specifically requires mobile user-agent volume behavior. Compact desktop emulation is not being counted as that evidence. See [Phase 6](design/PHASE-6.md).

## 2026-11-15 · Phase 5 architecture and portability gate

- Verified steps 042–050. The core, styles and optional Mux helper have separate package exports; `npm pack` excludes demo/test/fixture material and includes Apache-2.0 licensing. A fresh external host installed the tarball and supplied its own video and caption track.
- GitHub Actions run 43691495087 at `012482415ecb706d246646f0f9b95dbe780d91dc` passed 4/4 architecture checks, 2/2 packed-host checks, 16/16 Chromium scenarios, and the focused desktop-WebKit round trip with 10/10 arrivals at 42.350s. The packed host itself returned to 42.350s in both engines with native and Video.js store clocks agreeing.
- Fixed the pending-Return reconnect defect by keeping persistent label/pending nodes instead of destructively replacing button children. Two packed player instances isolate marks; explicit live/audio cases hide DETOUR; stale provider completions and source epochs remain guarded.
- Added deterministic portrait media, a 64-cue chapter track and a synthetic 40,000-second state case. Existing local harnesses cover chapterless/no-poster, captions, throttling, error/retry, source swap and delayed/rejected seeks. No paid media calls are needed.
- Technical decision: **go**. Estimated submission-ready core work is 12–18 active engineering hours against roughly 45 hours of calendar reserve to the planned Nov 17 10:44 NPT freeze. Keep optional Mux/public-site extras behind the core gate. Desktop WebKit is not claimed as physical Safari/iPhone, and Mux URL-helper resolution is not claimed as HLS playback.
- Full architecture, capability, event budget, fixture table and limits: [Phase 5 acceptance](design/PHASE-5.md#2026-11-15-phase-5-acceptance). Next actionable step: 051.

## 2026-11-15 · Phase 4 visual system

- Implemented the opaque graphite shelf, separate white playhead and safety-lime bracket, and tabular Return ticket. The stem holds its exact rail position as its arms flip inward near the end.
- Verified 240, 320, 375, 600, 768 and 1100 px layouts, including the 600 px inline threshold. The regular Hold transition preserves transport geometry. Reduced-motion and forced-colors cases were measured in Chromium.
- Added visible loading, waiting, ended, no-time and retry treatments. A separate bright fixture demonstrates the same controls, native captions and kept-place behavior.
- Locked the [visual acceptance sheet](design/PHASE-4.md) with three paired player-only boards and a forced-colors sample. See the [test evidence](submission-report/EVIDENCE.md#2026-11-15-phase-4-visual-proof).

## 2026-11-15 · Phase 3 interaction and release decisions

- Kept required controls exposed at desktop and compact widths. Settings offers real playback speed below the picture while native two-line captions remain inside it. Escape closes settings and restores focus.
- Tested Home/End and emulated touch seeking, paused/playing/ended return, missing captions, unavailable time, and long RTL copy. Added seekable-range and source-epoch guards. Controlled rejection and late completion confirmed the UI preserves a valid mark, including a new mark after a same-URL reload.
- Adopted a DETOUR-specific Cloudflare host, optional Mux HLS bonus path and milestone-based Google Drive archive. The proposed hostname and service paths are release work. See the [interaction contract](design/PHASE-3.md), [browser evidence](submission-report/EVIDENCE.md#2026-11-15-phase-3-interaction-proof) and [release plan](submission-report/RELEASE-PLAN.md).

## 2026-11-15 · Phase 2 visual decision and backup

- Compared live player-only crops at 320 and 768 px with the bracket present and hidden. Retained the raised bracket and the explicit Return button. Current and held markers stay distinct even at the same timestamp.
- Ran the isolated Pausepoint proof. Set 18.3s using the keyboard picker, observed one pause at 18.380s, resumed playback, and verified that seeking across armed targets while paused and while playing skips the point. The backup has a 2–4 hour switch estimate.
- Locked the single-place scope and prepared the first-use moderator guide. Step 017 remains unchecked. The next independently actionable step is 021.
- See the [crops and backup proof](design/PHASE-2.md), [concept scope](design/SCOPE.md), and [test evidence](submission-report/EVIDENCE.md#2026-11-15-phase-2-design-proof).

## 2026-11-15 · Competition refresh and playable prototype

- Rechecked the public terms and documented the open second-entry question. Reviewed 58 entries across both feed orderings, inspected seven related designs, and found no described full match for the exposed hold/explore/return flow in the sample. Direct demo playback was unavailable in the capture environment for Plate and Arcade.
- Recomputed all 30 candidate scores. Proceeded with DETOUR and kept Pausepoint as backup. Added a milestone run sheet, source-independent use cases and the first player state table.
- Built the first reusable local skin with pinned v10 components, real buffered ranges, a chapterless 64-second fixture and a source-scoped origin. Chromium returned to 42.350s in all ten runs after seeking through 18s and 24s. Playback, mute, captions, fullscreen, narrow keyboard Stay and same-element source reload passed. See [evidence](submission-report/EVIDENCE.md#2026-11-15-first-prototype).
- Start the next session at step 018. Record uncoached observations when available rather than treating automated success as discovery evidence.

## 2026-11-15 · Branch setup

- Imported the 100 original IDs and acceptance conditions into the [living checklist](CHECKLIST.md). Added the [master direction](README.md), [resumption rules](CONTINUE.md), and the [submission report](submission-report/README.md).
- Verified step 001 with the dated [public rules and requirement map](submission-report/RULES.md). Initialization does not verify any implementation steps.
- Next artifact to produce: an eligibility evidence note or a precise unresolved status, then the timed run sheet for step 003.

For each checkpoint, place the newest dated entry above older entries. Record step IDs, changes, meaningful test/evidence links, any open dependencies and the exact next action. Set the two fields at the top to the current phase and first actionable unchecked step. Identify remaining gaps in the same update when resuming past a blocked item.
