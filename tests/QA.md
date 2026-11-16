# DHAGO quality assurance

This file is a reproducible test guide, not a claim that every browser or device has been certified. Historical test runs remain in GitHub Actions and repository history.

## Local prerequisites

Use Node.js 24. FFmpeg is used for reproducible media preparation; Playwright browser binaries are necessary for browser tests.

```bash
npm ci
npm run sync:canonical-media
npm run typecheck
npm run build
npx playwright install --with-deps chromium
npm test
```

Additional browser engines can be checked through the GitHub Actions matrix or installed locally. Keep published-route testing explicitly separate from production-build testing.

## Verification matrix

| Concern | What must be verified | What does **not** count |
| --- | --- | --- |
| Core playback | Actual native media time advances; seek/play/pause/mute/speed/fullscreen reflect state | Animation of a decorative progress bar |
| Chapters | Actual cue timing, navigation, absent-cue fallback | Hand-entered labels treated as media evidence |
| Captions | Supplied track selected and readable; no fabricated dialogue | Caption toggle rendered without a real track |
| Resilience | Missing/expired media, loading, recoverable errors and narrow widths | A happy-path screenshot |
| Stream history | Buffering, dropped frames and decoded dimensions only when exposed | Invented rendition or bitrate history |
| Keyboard and preferences | Focus visible, controls reachable, reduced motion/forced colors supported | Static visual review alone |
| External integration | Skin works with host replacement media outside preview app | An example that imports preview-only state |
| Public release | Live manifest matches source SHA and media actually decodes | CI passing without checking the deployed origin |
| Physical accessibility | Recorded phone and screen-reader runs by a tester | Desktop WebKit or simulated mobile viewport |

## Production specifics

The maintained public DHAGO demo is https://creative.aafnaipatro.com/ with a separate annotated Journal. The direct media path and optional Mux path are separate playback modes. Test the public path after deployment; historical checks do not establish current uptime. Record the source revision, browser, test mode, observed result and environment.

See [`docs/release-integrity.md`](../docs/release-integrity.md), [`tests/manual-accessibility.md`](manual-accessibility.md) and [`STRESS-LAB.md`](../STRESS-LAB.md).
