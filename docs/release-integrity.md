# DHAGO — release integrity and recovery

This repository keeps build verification, immutable static assets and real public playback observations distinct. A green build is not proof that a specific host serves the same bytes.

## Canonical film and player

The maintained original motion study is **Studies in Thread**, a 64-second four-chapter procedural film. The source demonstration uses `apps/preview/public/media/studies-in-thread.mp4`, compatible WebM media, poster and caption/chapter WebVTT. The larger *From Fibre to Fabric* documentary renders are retired experiments; they are not the canonical viewing source.

The reusable skin is in `src/`, and the preview application is in `apps/preview/`. The browser should show actual current time and ordinary Video.js controls. A decorative weave must never replace the native seek range or invent buffering/quality observations.

## Build, prove, stage

1. Run `npm ci`, `npm run sync:canonical-media`, `npm run typecheck`, and `npm run build`. Verify the canonical film and compatibility WebM.
2. Run `npm test` after installing Playwright browsers. Separate functional tests from Firefox, desktop WebKit, external-host checks and physical device testing.
3. Preserve the exact commit SHA, `dist/` byte hashes, size report and real test results.
4. Stage only the build verified for that SHA. The generated `release-manifest.json.source_sha` identifies the published source revision; do not substitute a historical hard-coded SHA.
5. On the public origin, verify the release manifest, film decode, seeking, captions, speed/fullscreen, narrow layout, Studio Journal and the edge-state studio. Verify optional public Mux playback independently; missing access to Mux does not prove that direct-file playback is broken.
6. If the live assets fail, restore a prior **matching** code-and-media release. Do not replace zone-wide Cloudflare settings, shared buckets or other Aafnai Patro products to fix this isolated application.

## Limits and attribution

Physical Safari/iPhone/Android and VoiceOver/NVDA are not established by Playwright's desktop WebKit or emulated touch. Unsupported telemetry and absent chapters must be omitted rather than simulated. Use [`NOTICE`](../NOTICE), [`LICENSE`](../LICENSE), [`docs/media.md`](media.md) and [`tests/QA.md`](../tests/QA.md) for rights and verification context.

