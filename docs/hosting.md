# Public hosting and deployment

Public collection: https://creative.aafnaipatro.com/

Compatibility address: https://dhago.aafnaipatro.com/

Both custom domains point directly to the existing `dhago-studio-static` R2 bucket in the connected Cloudflare account. Only these two hosts map `/` to `/index.html` through a URL transform. No Patro application route, worker, asset, DNS record or sitemap is replaced. The empty `dhago-studio` Pages project is not the serving origin.

The production build contains plain static files. Hashed assets are uploaded first, HTML entry points last. Existing objects are compared by key and MD5 ETag before uploading: unchanged media and other assets are reused. Old hashed assets are retained so a previously loaded page continues to work. No general SPA fallback masks missing media or scripts as HTML.

Video requests go directly to Mux after its public playback ID is configured. `?local` explicitly selects the original MP4; playback failure never silently changes the claimed Mux source. The original film is retained in Git and at the existing R2 key. This architecture adds zero application Worker invocations per ordinary static request; R2 operations, storage and Mux delivery remain metered under their account allowances.

## Release evidence

Record the source revision, public playback ID, object hashes, production smoke result and captures in `submission/manifest.json` and `tests/QA.md`. A 200 response alone proves neither playback nor bonus eligibility. The annotated `journal.html` is a separate studio publication using the portable skin to navigate scene notes; final bonus eligibility is the judges' decision.

## Recovery

To roll back, restore the prior HTML entry points and their matching source revision; retained hashed assets remain available. Never replace zone-wide rulesets or delete shared bucket content to deploy this project. Leave both direct domains enabled through judging.

## 2026-11-13 incremental live repair (not final dist)

Release source intent: `4f3f86c`. Exact public R2 objects: `assets/demo-mux-4f3f86c.js`, `assets/dhago-refine-4f3f86c.css`, `assets/journal-mux-4f3f86c.js`, `index.html`, `journal.html`. Each was uploaded and read back from R2 before reporting success. Former `index.html` is retained as `releases/2026-11-13-before-mux/index.html`. Existing hashed code, Mux adapter, original MP4, other buckets and Patro routes were not deleted or replaced. This targeted repair is **not** an exact deployment of the latest CI-generated `dist/`; that remains a release task.

An external automated browser has no compatible H.264/AAC decoder and rejects the HLS variants. The same test browser earlier rejected the local MP4. GitHub Playwright Chromium on Linux successfully plays and seeks the Mux asset at the exact candidate revision. Run additional branded-browser and physical-device checks rather than claiming universal support.

The empty `dhago-studio` Pages project is a Direct Uploads project and cannot be converted to a Git integration. New Git-connected Pages creation returned Cloudflare Git installation error 8000011. Keep dedicated static R2 hostnames; do not attempt to rewire the Patro zone or replace workers to work around the Pages connection.

## Superseding release verification — 2026-11-13

The earlier incremental/hotfix-only limitation above has been **resolved**. Commit `72ec6c324f646c6dcb18708bc86d3f0d415f39c2` passed 30 Chromium source tests, and GitHub Actions built immutable `dist-72ec6c324f64`, containing 78 release files plus a SHA-256 manifest. The dedicated R2 bucket had 10 missing hash-named files, which were uploaded and read back. One stale `preview.html` was backed up and replaced.

The **entire** public release was verified: 76/76 UTF-8 text files matched their `release-manifest.json` SHA-256 hashes; the 2 binary files (original MP4 and poster WebP) matched their known MD5 object identifiers and byte lengths. Prior index/journal/preview entry points were saved under `releases/2026-11-13-pre72ec6c/`. Exact immutable `journal.html` and `index.html` were published last. Independent unauthenticated HTTP checks confirmed both domains and the journal.

This proves content parity, not universal codec support or an accepted contest submission. Public Chromium playback/seek after the full release remains a distinct smoke gate; any failure must roll back rather than be hidden by the manifest match. No DNS, zone rules, Patro workers, or shared assets were modified.

## Production browser acceptance (supersedes pending-gate note)

[Main run 43443029329](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43443029329) completed successfully **after** the 78/78 immutable publication: 2/2 public smoke tests passed, verifying actual Mux playback time, seek, chapter readout, and Studio Journal scene-note seeking. This is decoded video evidence in CI Chromium, not just a 200 response or fetched HLS manifest. Browser-specific codec availability and owner assistive-technology checks remain open.

## Current exact build — 2026-11-13 (supersedes `72ec6c3` as production source)

The current source revision is `a6492362b634799f3f23611e95eb88d003474d1f` (PR #6, 35/35 source Chromium tests, main CI PASS). Its immutable build lives at `dist-a6492362b634`, manifest `release-manifest.json`, total 78 objects. The dedicated R2 bucket `dhago-studio-static` received only seven missing immutable hashed JS/CSS resources; each was SHA-256 verified on readback. The previous three HTML entries were verified against the old build and backed up at `releases/2026-11-13-prea6492362/`, then `journal.html`, `preview.html`, and finally `index.html` were updated.

After publication, all **76/76 UTF-8 assets match their staged SHA-256**, and the unchanged poster and original MP4 match **2/2 prior MD5 object identifiers and sizes**. The public CI browser acceptance run [43461852782](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43461852782) passed **before** the new HTML cutover; repeat a signed-out Chromium Mux/journal run on the new release. Web text-fetch diagnostics returned inaccessible and cannot establish video-codec support either way.

Rollback for this cutover: restore only the three HTML objects from `releases/2026-11-13-prea6492362/` after verifying their SHA-256. Keep old/new hashed files and both original media objects. No unrelated Patro routes, worker quotas, zone rules, Mux assets, or other R2 content were changed.
