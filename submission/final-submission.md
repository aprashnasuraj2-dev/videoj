# DHAGO — final competition submission package

Prepared from the repository, exact public-release workflow and the live Contra challenge record checked on 2026-11-14. Contra currently lists the challenge ACTIVE with submissions due **2026-11-17 07:59 UTC** (Nov 16, 11:59pm PST), and requires a public Video.js v10 URL plus a visual and short design description. The optional fields are a Mux public playback ID and a real live-site URL. This document is copy-ready, but it does **not** accept the Apache-2.0 challenge agreement, certify identity or authorize the irreversible final submission action.

## A. Final title

**DHAGO — Time, Woven.**

Alternative if a form benefits from a more descriptive title: **DHAGO — Woven Time for Video.js**. The primary recommendation remains **DHAGO — Time, Woven.**

## B. Short description

DHAGO turns Video.js v10 chapter time into a tactile woven ribbon inspired by Nepali weaving, while keeping play, seek, sound, captions, speed and fullscreen immediately familiar. Its original *From Fibre to Fabric* film, responsive Linen/Ink/Paper surfaces and portable Stress Lab demonstrate the same reusable skin from polished playback through difficult edge cases.

## C. Judge-facing description

DHAGO takes its name from the Nepali word for thread and treats video time as warp and weft. Real chapter cues become woven sections on a conventional Video.js v10 seek surface: the viewer can drag across the ribbon, read the current chapter and use the same precise playback controls they already know. The public release pairs the skin with the original 64-second *From Fibre to Fabric* documentary short and a Studio Journal that seeks the same film from four scene notes.

The interaction is designed to survive outside the showcase page. Linen, Ink and Paper use the same semantics; narrow layouts retain essential controls; keyboard focus, captions, reduced motion, forced-colors behavior, error recovery and no-chapter cases are exercised in the browser suite. A standalone Ribbon proves the timeline can be hosted separately, while the Stress Lab tests dense/absent/malformed cues, narrow players, missing posters, source errors, multilingual titles, audio-only media and clearly labelled external fixtures. Release evidence is generated from the exact CI-tested public artifact rather than from a separate promotional build.

## D. Feature highlights

- **Woven chapter timeline:** real WebVTT chapter intervals become tactile warp/weft sections without replacing the standard seek model.
- **Shuttle-like seeking:** drag across the native time slider while real time and chapter context remain visible.
- **Three coherent surfaces:** Linen, Ink and Paper change treatment, not control meaning.
- **Original demonstration film:** *From Fibre to Fabric* follows Raw fibre → Twist into thread → Warp meets weft → Cloth holds time.
- **Studio Journal:** four scene notes seek the same released film and keep selection paused until the viewer chooses Play.
- **Accessibility-first control shelf:** visible keyboard focus, English documentary captions, reduced-motion and forced-colors handling, comfortable essential targets.
- **Stress Lab:** realistic edge-state coverage without invented telemetry or fake live/DVR claims.
- **Portable architecture:** reusable player factory plus a host-neutral Woven Time Ribbon component.

## E. Technical highlights

- Built on **Video.js v10 / @videojs/html 10.4.0**, not the v8 `videojs()` API.
- Portable `createDhagoPlayer()` API accepts source, optional compatibility source, poster, chapter/caption tracks, surface and authored metadata.
- Canonical public delivery uses the dedicated Cloudflare R2 release; the HTML media element uses `preload="metadata"`, so the ~22.7 MB MP4 is not intentionally fetched in full before interaction.
- A ~25.6 MB VP9/WebM compatibility encode is generated/validated reproducibly for browsers without H.264 support.
- Optional Mux support is lazy-loaded only when a verified playback ID is configured; direct R2 playback remains the reliable canonical path.
- Immutable `dist-<SHA>` releases carry SHA-256 + byte-length manifests and are published without rebuilding after CI.
- Public smoke binds the live manifest to the exact Git SHA, then captures playback, seeking, screenshots, interaction media and Lighthouse evidence.

## F. Accessibility highlights

Keyboard routes cover playback, seeking, settings and menu exit; focus remains visible on solid control surfaces. English documentary captions, chapter text, non-color cues, reduced-motion treatment, forced-colors behavior and narrow layouts are tested. Automated/browser-engine evidence is not relabelled as a physical-device or screen-reader certification: real VoiceOver/NVDA and physical iPhone/Android checks remain separate owner/device evidence unless actually performed.

## G. Originality statement

DHAGO is an original Video.js skin and interaction system. The woven-time metaphor is **inspired by Nepali weaving**—thread/dhago, warp and weft, and textile rhythm—without claiming that its abstract CSS/SVG pattern reproduces a specific historically authenticated textile motif.

## H. Media / asset statement

The primary *From Fibre to Fabric* documentary short, generated textile geometry, poster, chapter data, documentary narration and English captions are authored for DHAGO. The Stress Lab also links clearly credited external fixture media under their original licenses for edge-case testing; those fixtures are not presented as original DHAGO footage, are not silently relicensed, and are not the canonical competition film.

## I. License statement

DHAGO source is released under **Apache License 2.0** with `LICENSE` and `NOTICE` in the repository/source handoff. Third-party dependencies and externally linked Stress Lab fixture media retain their respective upstream licenses.

## J. Live links

- Main player: https://creative.aafnaipatro.com/
- Studio Journal: https://creative.aafnaipatro.com/journal.html
- Standalone Ribbon: https://creative.aafnaipatro.com/ribbon.html
- Stress Lab: https://creative.aafnaipatro.com/stress.html
- Repository: https://github.com/aprashnasuraj2-dev/videoj

## K. 45–60 second judge walkthrough

**0–8s — First impression.** Open the homepage, start *From Fibre to Fabric* and identify the woven timeline inside the actual player.

**8–18s — Woven seeking.** Drag the timeline into chapter 03 at about 32 seconds. Confirm **Warp meets weft**, real time movement, pause and replay. A storyboard image is optional backend evidence; the time/chapter preview is always the truthful proof.

**18–28s — Familiar controls, different surface.** Toggle captions, use keyboard focus, open Settings, switch Linen → Ink, and briefly show the same semantics at phone width.

**28–38s — Studio Journal.** Open scene note 03; the same released film seeks to the note and remains paused for intentional reading.

**38–48s — Stress Lab.** Show dense chapters or the controlled source-error/recovery case. Point out that external fixtures and simulated geometry are labelled rather than passed off as production telemetry.

**48–60s — Portability.** Open the standalone Ribbon / install proof, then the repository. Close on the idea: **one reusable Video.js v10 skin; time, woven.**

## L. Screenshot shortlist

Use only captures generated from the exact public release:

1. `submission/hero-desktop.png` — desktop hero and player.
2. `submission/living-loom-seeking.png` or `submission/chapter-transition.png` — active weave around **Warp meets weft**.
3. `submission/hero-mobile.png` — narrow/mobile player.
4. `submission/studio-journal.png` — same skin in the Journal.
5. `submission/stress-lab.png` — resilience proof.
6. `submission/ribbon-component.png` — reusable timeline proof.

Prefer the generated interaction clip when it accurately shows real browser state. Do not substitute staged graphics or Photoshop-simulated player states.

## M. Submission checklist

- [ ] Exact final `main` SHA passes clean install, generated weave/WebM validation, typecheck, production build and Chromium suite.
- [ ] Firefox browser proof passes on the same final head.
- [ ] WebKit browser proof passes on the same final head.
- [ ] Immutable dist manifest names the exact final SHA/build run and contains all canonical media/pages/assets.
- [ ] Exact verified dist is promoted to the dedicated DHAGO R2 bucket; manifest published last.
- [ ] Public manifest returns the final SHA and active hashed demo asset.
- [ ] Homepage playback advances real media time; pause/play and chapter seek around 32s work.
- [ ] Studio Journal, Ribbon and Stress Lab load from the exact public release.
- [ ] Captions, keyboard, narrow layout and surfaces are captured from the live release.
- [ ] Lighthouse/mobile and evidence index are generated and retained.
- [ ] License/NOTICE and external fixture credits are present.
- [ ] Mux bonus is claimed **only** if the canonical fibre film has its own verified public playback ID and real browser playback evidence.
- [ ] Physical-device / assistive-technology evidence is labelled NOT TESTED unless actually performed.
- [ ] Current challenge form fields, deadline, identity/eligibility and attachment requirements are reviewed by the owner.
- [ ] Owner explicitly accepts legal/open-source declarations and authorizes the final irreversible submission action.
- [ ] Only after that action, save the observed success/receipt and verify every published entry link.

## Current decision boundary

R2 remains the canonical public source. Mux is a competition bonus path and is claimed only after the same canonical 64-second documentary has its own verified public playback ID and browser evidence. No paid Mux upgrade or competition legal acceptance is authorized by this package.
