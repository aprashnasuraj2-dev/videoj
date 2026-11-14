# DHAGO — Time, woven

Reusable Video.js v10 HTML skin with a woven chapter ribbon, visible control shelf, captions and speed settings. The preview includes an original 64-second motion study with quiet synthesized ambient audio.

[Public collection](https://creative.aafnaipatro.com/) · [Annotated film journal](https://creative.aafnaipatro.com/journal.html) · [Install in under a minute](INSTALL.md)

Requires Node 24 and npm. Run `npm ci`, `npm run dev`; validate with `npm run typecheck` and `npm run build`. Serve `dist/` over HTTPS. For browser checks run `npx playwright install --with-deps chromium`, `npm run build`, then `npm test`. Tests exercise the production build through Vite preview. Set `DHAGO_LIVE_URL` to run appropriate checks against a published origin; keep fault-injection cases in the test environment.

See [`INSTALL.md`](INSTALL.md) for minimal HTML/Vite and React mounts. Import `createDhagoPlayer` from `src/create-player.ts` through a compatible TypeScript/Vite build. Append its returned element to your mount. Supply `source`, optional `poster`, `chapters`, `captions`, and `surface` (`warm`, `dark`, `minimal`). A public `playbackId` selects the version-matched Mux adapter. Skin code imports nothing from the preview application.

Set `--media-accent-color`, `--media-accent-text-color`, `--media-border-radius` and the documented `--dhago-*` host tokens on the mount for a host treatment. `journal.html` demonstrates Ink with gold `#e8c078` and dark accent text `#171918`, on shelf `#202321`; that accent/shelf pair is approximately 9.25:1. The same accent on a white shelf is a counterexample: it does not provide adequate focus contrast. Test the actual combinations you ship.

## Progress and operations

[100-step checklist](docs/CHECKLIST.md), [verification](tests/QA.md), [Mux setup](docs/media.md). `docs/steps.json` is authoritative; run `node scripts/progress.mjs` after updates.

Actions validate builds and browser behavior, provision Mux using repository secrets, and package exact source revisions with SHA-256 checksums. Source-package automation does not establish final submission readiness. No contest submission, accepted terms or bonus is claimed until verified.

## Release and competition handoff

[Judging rehearsal](docs/score-rehearsal.md) · [Owner review](docs/owner-review.md) · [Immutable release guide](docs/release-integrity.md) · [Mux usage limits](docs/mux-cost-and-retention.md). Production assets are staged in `dist-72ec6c324f64` and all 78 release objects were hash/ETag-verified in the dedicated R2 origin. Source CI and public smoke remain separate acceptance gates. The project has **not** been entered into the contest.

## 2026-11-13 thread-craft refinement

[PR #6](https://github.com/aprashnasuraj2-dev/videoj/pull/6) adds cue-derived decorative joins, subtle native dragging tension and real-media buffering response without inventing a control, cue or telemetry state. Reduced-motion and forced-colors behavior remain test-covered. Source `a6492362b634799f3f23611e95eb88d003474d1f` passed **35/35 Playwright Chromium tests** and its immutable `dist-a6492362b634` release matched **78/78 dedicated R2 assets**. A new post-release public browser smoke, physical-phone assessment, screen-reader review and owner-submitted challenge entry are separate gates. Prior HTML entry points remain backed up for rollback.
