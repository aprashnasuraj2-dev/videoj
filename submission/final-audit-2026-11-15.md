# DHAGO | Final source, release and entry audit

**Checked:** 2026-11-15. **Production code release:** `4acefca864e54b1f85ca021204e03ff148d170a7` (main at audit start). The docs-only handoff correction does not alter the tested player bundle.

## Required versus observed

| Contest requirement | Current verified basis | Evidence boundary |
|---|---|---|
| Working public URL, Video.js v10, video playback | `@videojs/html` pinned 10.4.0; public Chromium decoded and advanced real media | Browser/codec support remains device-dependent |
| Play/pause, seek, time, mute/volume, fullscreen | Automated browser playback and control coverage | Not a blind first-use user study |
| Mobile and desktop | CI responsive layout and real 375px/320px browser evidence | Browser emulation is not a physical phone |
| Keyboard navigation, exit from menus | Playwright focus/keyboard and accessible controls | VoiceOver/NVDA manual sessions absent |
| Bright and dark media, touch, reduced motion | Opaque control shelf, tested variants and reduced-motion code | Site's tiny footer links affected whole-page Lighthouse touch-target check |
| Original visual and description | Four distinct woven chapter ribbons, cue-driven shuttle and authored 64-second film | Judge may prefer a more dramatic visual concept |
| Optional Mux video | Public playback ID, live Mux route and passing Mux video job | Asset must remain live through judging; award decided by judges |
| Optional actual website use | Separate live Studio Journal uses same player mount | A competition companion site may not satisfy judges' interpretation |

## Full-release verification

- Main CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43667195719, completed successfully.
- Public release manifest: https://creative.aafnaipatro.com/release-manifest.json, `source_sha=4acefca864e54b1f85ca021204e03ff148d170a7`, 93 release files.
- Published readback checks: ten changed CSS/JS assets matched SHA-256 and all 93 release objects matched expected bytes at the verification point; old release recoverable.
- Genuine public Chromium: play 1.867 → 8.650 sec, pause 9.066 sec, seek 35.84 sec, end ~64 sec, replay ~0.116 sec; 960px decoded image, readyState=4.
- Lighthouse mobile: Performance 97, Accessibility 96, Best Practices 81, SEO 100; LCP 1,538ms, CLS 0, TBT 192ms. Test-specific, not a real-device guarantee.

## Known issues and mechanism

- The whole-page Lighthouse accessibility 96 is linked to 3 footer navigation links with ~11px physical boxes, not to the player transport controls. A later CSS release should enlarge those targets, but this requires rebuilding and re-validating the published binary; do not patch a frozen release silently.
- The Best Practices 81 derives from two browser deprecations within Cloudflare's injected `/cdn-cgi/challenge-platform/scripts/jsd/main.js`; no authored DHAGO source file is identified in those warnings. Avoid changing unrelated Cloudflare security/bot settings solely to influence a competition score.
- Lack of real iOS/Android and screen-reader sessions is a verification gap, not evidence of failure or success.
- The film/skin/landing experience is restrained. A more theatrical entry may stand out faster in a scrolling feed. Lead with a tight active-player crop and genuine eight-second interaction loop; do not trade away the stable playback experience for untested spectacle.

**Decision:** Freeze the verified player code, improve the actual submission package and accurate documentation. Last-minute visual code changes would invalidate the exact-commit release evidence and introduce a deployment regression risk. Separate owner verification and Contra submission remain open.
