# DHAGO — Time, woven

Reusable Video.js v10 HTML skin with a woven chapter ribbon, visible control shelf, captions and speed settings. The preview includes an original 64-second silent motion study.

Requires Node 24 and npm. Run `npm ci`, `npm run dev`; validate with `npm run typecheck` and `npm run build`. Serve `dist/` over HTTPS. For browser checks run `npx playwright install --with-deps chromium` then `npm test`.

Import `createDhagoPlayer` from `src/create-player.ts` through a compatible TypeScript/Vite build. Append its returned element to your mount. Supply `source`, optional `poster`, `chapters`, `captions`, and `surface` (`warm`, `dark`, `minimal`). A public `playbackId` selects the version-matched Mux adapter. Skin code imports nothing from the preview application.

## Progress and operations

[100-step checklist](docs/CHECKLIST.md), [verification](tests/QA.md), [Mux setup](docs/media.md). `docs/steps.json` is authoritative; run `node scripts/progress.mjs` after updates.

Actions validate builds and browser behavior, provision Mux using repository secrets, and package exact source revisions with SHA-256 checksums. Source-package automation does not establish final submission readiness. No contest submission, accepted terms or bonus is claimed until verified.
