# DHAGO — competition entry handoff

**Status:** the final candidate is released and evidence is generated from the exact public build. The contest entry itself remains owner-controlled and is not claimed as submitted until a real receipt is observed.

## Copy-ready fields

**Project title:** DHAGO — Time, woven

**Public playable skin:** https://creative.aafnaipatro.com/

**Studio Journal:** https://creative.aafnaipatro.com/journal.html

**Portable Stress Lab:** https://creative.aafnaipatro.com/stress.html

**Reusable Woven Time Ribbon:** https://creative.aafnaipatro.com/ribbon.html

**Public integration contract:** https://creative.aafnaipatro.com/install.html

**License:** Apache-2.0 challenge release

**Video.js version:** v10.4.0

**Mux note:** the public film uses a public Mux playback ID; no Mux management credential belongs in submission materials.

## Short description

DHAGO turns time into a woven ribbon. Chapters become woven sections, real playback conditions can leave a viewing history in the cloth, and metadata becomes layered weft while standard Video.js controls remain familiar. The skin also provides nonvisual chapter navigation, a reusable host-neutral ribbon, and a browser-side Stress Lab that other compatible player authors can use directly.

## Long description

DHAGO takes its name from the Nepali word for thread and translates woven material logic into a Video.js v10 interface without replacing familiar playback behavior. Time is the warp: chapter cues become woven sections around the ordinary seek control. Metadata becomes weft: native chapter/caption tracks and explicitly supplied speaker, sponsor or custom intervals can occupy separate lanes. Playback history is capability-gated—an exposed active rendition is preferred when available, decoded dimensions are the fallback resolution signal, real waiting/stalled events create slack intervals, and real dropped-frame counter deltas create missed stitches.

Accessibility is a separate semantic system, not an interpretation of color or geometry. Chapter navigation exposes ordinal position, total count, title, start and end time through visible text plus hidden semantic context, while the continuously changing playback clock is not turned into a noisy live region. Forced colors and reduced motion are tested as real environment features in automation. Real VoiceOver/NVDA testing is NOT TESTED unless separately performed.

The public Stress Lab is a genuine browser tool. Another compatible player can be loaded by ESM URL or local .js/.mjs adapter, executed inside an opaque-origin sandbox, tested against real narrow containers, malformed/late metadata, missing media, audio-only behavior, source replacement and environment capability gates, then exported as JSON or Markdown. CORS/module-load failures are reported as NOT RUN rather than skin failures.

## Attachment order

Lead with the player, not developer tooling:

1. `hero-desktop.png`
2. `interaction-loop.mp4`
3. `finished-cloth.png`
4. `hero-mobile.png`
5. `stress-lab.png`
6. `stress-lab-browser-loader.png`
7. `layered-weft.png`
8. `ribbon-component.png`
9. `install-example.png`
10. `final-release-evidence.md` and `performance-evidence.md` as optional engineering proof

## Explicit limitations

- Safari desktop on macOS — NOT TESTED unless genuinely tested.
- iPhone Safari physical device — NOT TESTED unless genuinely tested.
- Android Chrome physical device — NOT TESTED unless genuinely tested.
- VoiceOver / NVDA real assistive-technology pass — NOT TESTED unless genuinely tested.
- External human validation — NOT OBTAINED unless a real tester is recorded.
- Official Video.js adoption/upstream acceptance — NOT CLAIMED.
- Contest submission — NOT CLAIMED until the owner submits and records the receipt.

**Deadline noted in challenge brief:** November 16, 2026 at 11:59pm PST (November 17, 2026 at 1:44pm Kathmandu).

**Submission receipt:** `null` until observed.
