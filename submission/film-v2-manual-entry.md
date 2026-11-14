# DHAGO — final competition-entry package (film-v2 candidate)

**Preparation date:** 2026-11-14. **User-controlled submission, not sent.** Never claim the new film is published or Mux-verified until this candidate passes the real public checks. The existing working live version and its existing Mux ID remain the safe fallback.

## Title and positioning

**Entry title:** DHAGO — Time, woven

**Tagline:** A woven sense of time, built on Video.js v10.

**Short description (140 characters maximum)**

A tactile Video.js v10 player inspired by weaving: chapters become stitches, the timeline becomes a thread, and the controls stay familiar.

**Main entry description**

> DHAGO means thread in Nepali. Instead of covering the picture with controls, it brings a woven sense of time to a familiar Video.js v10 player: chapter cues shape the ribbon, a real seek thumb moves naturally across it, and actual film frames appear in previews. The skin responds to seeking, buffering, captions, audio, keyboard input, screen size and reduced-motion preferences without inventing playback states. Its original 64-second film follows fibre, twisting yarn, crossing warp and weft, and the finished cloth. One portable skin serves the public viewing page, a scene-linked Studio Journal and a stress lab that exposes real edge cases.

**Technical overview**

> Built on Video.js v10.4.0 with a portable custom player, responsive warm/dark/minimal surfaces, cue-derived chapter stitches, caption and chapter tracks, genuine seek-preview frames, optional Mux HLS transport, a source-verified MP4 and an independent VP9/Opus fallback. English copy throughout. Automated tests cover keyboard seeking, real media playback, playback state, 240–1280px layouts, forced-colors, reduced motion, empty/dense chapter tracks, source fallback, error recovery and accessibility scans. Real-device and assistive-technology review remain independent acceptance gates.

**Creative provenance statement**

> The hero film and its synthesized soundtrack are original, deterministic, procedural artwork. They express fibre and interlacing as a visual metaphor. They are not documentary footage or a representation of a named weaving community or maker. The interface is influenced by the tactile qualities of Nepali weaving; the design does not claim to reproduce a specific weaving method.

**Mux bonus statement — ONLY after the new film is genuinely provisioned and deployed**

> DHAGO uses Mux to deliver the original hero film through HLS in the Video.js v10 player. We verified a ready, public Mux playback ID tied to the film's actual SHA-256, saw decoded frames and time advancement on the public page, and tested seeking and captions. The Studio Journal also uses the same playback technology.

**If the new film is not Mux-provisioned before the deadline:** *Do not use the statement above.* The old live version already has its own Mux stream and documented public playback tests, but it is a different film. Submit only the actual public version; do not represent the legacy Mux ID as the fibre-to-fabric film.

## Public and technical URLs

| Purpose | URL |
|---|---|
| Main playable public player (currently legacy film) | https://creative.aafnaipatro.com/ |
| Alternate DHAGO domain | https://dhago.aafnaipatro.com/ |
| Real Studio Journal | https://creative.aafnaipatro.com/journal.html |
| Public edge-case demonstration | https://creative.aafnaipatro.com/stress.html |
| Open-source GitHub code, license and build | https://github.com/aprashnasuraj2-dev/videoj |
| Candidate film implementation | https://github.com/aprashnasuraj2-dev/videoj/pull/13 |
| Exact-head candidate CI | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43544588891 |
| Candidate UI evidence artifact (GitHub Actions) | https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43544588891 |
| Original rendered film and codec provenance | https://github.com/aprashnasuraj2-dev/videoj/blob/film/from-fibre-to-fabric-20261114/docs/film-v2-production.md |
| Existing finished competition image/video bundle | https://drive.google.com/file/d/1fXoXIj1gNWBXItMxOm1lt0l-aVnkPq6y/view |
| Existing source and release archive | https://drive.google.com/file/d/1MPl0blKgSh9QM_giGV9SfZkGX2xXw7G_/view |

Do not silently substitute older image evidence for the candidate film. The browser-test artifact for the new film has genuine candidate screenshots and proof recording, but has not been published as a separate stable Drive ZIP.

## Recommended entry image/caption choices

1. **Primary cover:** real browser screenshot of fibre-to-fabric hero at 00:33, with the woven chapters and control shelf visible. Must be captured from the actual built film, **not** a web-search visual reference or generated synthetic player mockup.
2. **Responsive shot:** same player on a narrow mobile viewport, showing controls without overlapping the picture.
3. **Interaction shot:** active woven seek thumb and true source-derived chapter preview.
4. **Journal shot:** the actual annotated Studio Journal with playable chapter navigation.
5. **Proof video:** original 30-second real-control walkthrough from CI, unmodified in ways that pretend UI behavior.

Proposed image alt text: *DHAGO Video.js v10 player with original textile film, visible woven chapter ribbon, accessible controls and a timecode.*

## Film chapter copy

| Interval | Title | Honest description |
|---|---|---|
| 00:00–00:16 | Raw fibre | Loose strands catch light before becoming yarn |
| 00:16–00:32 | Twist into thread | Drawn fibres converge as a spindle-inspired form turns |
| 00:32–00:48 | Warp meets weft | A moving shuttle and interlacing threads establish a textile structure |
| 00:48–01:04 | Cloth holds time | A close woven surface reveals crossings, edges and light |

## Submission and disclosure checklist

- [x] Original 64-second film, H264/AAC MP4, VP9/Opus WebM and source-derived poster authored
- [x] Full English chapter and caption tracks attached
- [x] Responsive Video.js v10 skin, player controls, alternate media and source-verifiable thumbnails
- [x] Candidate 60 Playwright browser checks passed; 4 tests skipped because new Mux and deployed public validation are separate
- [x] Offline Mux exact-hash reuse and free-plan ceiling checks passed
- [x] Earlier R2 legacy WebM missing object repaired and hash verified
- [ ] New candidate Mux `playbackId` in `apps/preview/src/media-fibre.json`
- [ ] New-film Mux browser test runs and passes instead of skipping
- [ ] Final immutable candidate built and fully synchronized with Cloudflare R2 by hash
- [ ] Public Chrome/Safari/Firefox, phone and VoiceOver/NVDA physical review
- [ ] Actual final candidate screenshots and proof video accepted for submission
- [ ] Owner confirms rights/Apache-2.0, eligibility, account profile and challenge terms
- [ ] Contra entry submitted and actual receipt/URL preserved

## Critical decision rule

**Do not wait for the new-film bonus at the expense of the submission deadline.** A public, honest, already verified Mux-backed predecessor film is safer than a broken film with a misleading bonus claim. The new film is eligible to become the hero only after its real Mux HLS and R2 release checks pass. The competition jury decides the final score and any optional +2 bonus; our testing cannot award points.

Deadline: 2026-11-16 23:59 Pacific / 2026-11-17 13:44 Nepal.
