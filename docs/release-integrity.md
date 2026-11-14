# Exact-build publication and rollback

The public production origin is the **dedicated** R2 bucket `dhago-studio-static` on `creative.aafnaipatro.com` and `dhago.aafnaipatro.com`. No Patro application worker, zone-wide routing or unrelated bucket is part of this release.

## Stage from the tested source

A push to `main` runs the candidate gate: clean Node 24 install, reproducible fibre WebM/weave generation, typecheck, production build, Chromium suite, Firefox proof and WebKit proof. Only after those jobs pass does CI stage the **exact tested `dist/` artifact** on immutable branch `dist-<source-commit-first-12>`.

`release-manifest.json` is the release authority. It records the exact `source_sha`, build run ID, file count, SHA-256 and byte length for every release object. No Mux, Cloudflare or Google credential is copied into the immutable branch.

## Publish the exact staged artifact

Before publishing:

1. Require `release-manifest.json.source_sha` to equal the successful main CI head.
2. Require the manifest to contain the canonical `media/from-fibre-to-fabric.mp4`, compatibility WebM, poster, chapters, captions, generated weave asset, generated JS/CSS and the index, Journal, Stress Lab, Ribbon, preview and workbench pages.
3. Compare manifest objects with the dedicated R2 bucket. Reuse exact matching large media; do not upload duplicate film bytes merely to create a new release.
4. Upload missing/changed hashed assets and static resources first and verify readback where tooling permits.
5. Preserve the previous public HTML entry points under a DHAGO-only `releases/<date>-<sha>/` rollback prefix.
6. Publish entry HTML after its dependencies, and publish **`release-manifest.json` last**. The manifest must never certify bytes that are not already present.

The canonical release is direct R2 playback of **From Fibre to Fabric**. A future verified Mux asset is an optional delivery bonus, not a prerequisite for the public film. Never reuse the retired film's playback ID or describe an R2 release as Mux-delivered.

## Post-publication proof

A manifest match is necessary but not sufficient. The public-smoke job must observe the exact manifest SHA, real decoded playback and time advancement, pause/play, chapter seek around 32 seconds with **Warp meets weft**, captions, keyboard interaction, narrow layout, Studio Journal seeking, Stress Lab/Ribbon surfaces, real screenshots, interaction recording, Lighthouse measurement and evidence-index generation.

Classify failures by mechanism: production playback, test harness, evidence generation, performance, or optional bonus. An evidence-recorder failure after successful playback is not a playback failure.

## Rollback

If the deployed HTML or media is genuinely broken, restore only the saved DHAGO entry points after verifying the rollback bytes. Keep old hashed assets while existing browser sessions may still reference them. Never delete or replace unrelated AafnaiPatro workers, routes, buckets, DNS, assets or zone-wide rules.

If Actions cannot stage the immutable branch, retain the exact CI artifact and report the permissions error. Do not invent a replacement release or claim publication without exact source/build provenance.
