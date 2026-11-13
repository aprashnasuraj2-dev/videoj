# Exact-build publication and rollback

The public production origin is the **dedicated** R2 bucket `dhago-studio-static` on `creative.aafnaipatro.com` and `dhago.aafnaipatro.com`. No Patro application worker, zone-wide routing or unrelated bucket is part of this release.

## Stage from the tested source
A push to `main` affecting the source files triggers `Prepare immutable Cloudflare release assets`. It runs a clean Node 24 install, typecheck and production build; publishes the exact `dist/` files on a new **immutable branch** `dist-<source-commit-first-12>` under `published-dist/`; and includes `release-manifest.json` with SHA-256 and byte length for every file. No Mux, Cloudflare or Google credential is copied to the release branch. The stage job is not itself a deployment, and its success does not imply a public smoke pass.

Before publishing, compare `release-manifest.json.source_sha` with the successful main CI head; check that the manifest includes `index.html`, `journal.html` and the Mux player assets. Upload missing hash-named assets first. Reuse present identical objects, including the original video and poster, without duplicating them. For each new upload, verify the exact object via readback. Preserve the old `index.html` and `journal.html` under `releases/<date>-<sha>/`. Publish HTML **last**, and then verify the public experience (actual Mux decoding, advancing time, chapter seek and journal scene note), not just HTTP 200.

## Rollback
If the deployed HTML or media fails, restore the two saved previous HTML entry points. Keep old hashed assets while any open browser may reference them. Never delete contents outside the DHAGO bucket. Unchanged Mux assets must not be reuploaded. `?local` is an explicitly selected original MP4 fallback and does not count toward a Mux bonus.

If Actions cannot push the immutable release branch, report its exact permissions error and retain the CI artifact; do not claim full publication or create a replacement URL. Production release stays **open** until exact build parity, browser playback and real-site page have been checked.
