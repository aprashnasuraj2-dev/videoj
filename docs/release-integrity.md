# DHAGO — release integrity, recovery and judge-proof protocol

**Active contract 2026-11-14:** Restore *Studies in Thread*, the initial authored 64-second film. The newer `from-fibre-to-fabric.*` documentary is a retired experiment, **not** the competition media. Source-controlled original SHA-256: `9dcc4672e3014ca947e310c1809c0cf6d40ffff186478f3e6a1e47f89b3688b3`.

## Isolated hosting

- The public sites `creative.aafnaipatro.com` and `dhago.aafnaipatro.com` map to dedicated Cloudflare R2 bucket `dhago-studio-static`.
- Regular playback must **not** invoke AafnaiPatro application Workers. Do not touch other domains, workers, page routes, DNS, sitemaps, buckets or ads.
- Original film and fallback are `media/studies-in-thread.mp4` and `media/studies-in-thread.webm`; captions and chapter tracks are `media/captions.vtt` and `media/chapters.vtt`.
- New judge-facing poster is `media/dhago-studies-poster.svg` (a designed vector illustration). Preserve `media/poster.webp` as the historical original poster/rollback resource.
- Demo, Studio Journal, Ribbon, Stress Lab and Tools reuse the matching published assets.

## Exact source → immutable release

1. **Candidate PR:** clean Node 24 dependency install, original MP4 SHA verification, original-WebM derivation, sampled chapter-weave extraction, TypeScript typecheck and production build.
2. **Real browser proof:** Chromium video playback, keyboard/mouse/touch-emulation, 320/375/768/1280px, captions, play/pause/seek/replay, chapter seek and quiet reduced-motion states. Firefox and WebKit cross-engine proof after candidate verify.
3. **Mux bonus proof:** separate actual Chrome job exercises the historical original Mux playback ID at `/?mux` for real decoded time advancement, chapter seeking and captions. This evidence is mandatory **before** presenting the Mux bonus as verified, but should not silently alter the default local film.
4. **Source merge:** only exact green candidate head may merge; record final `main` commit SHA, not merely the PR number.
5. **Stage artifact:** publish the **same CI-tested distribution**, never recompile with different inputs. CI builds an immutable `dist-<mainSHA-prefix>` branch with a file-level SHA-256 manifest and byte lengths. Validate the manifest's `source_sha` and all expected page/media keys.
6. **Publish R2:** compare keys, sizes and hashes with `dhago-studio-static`. Reuse matching originals; do **not** create needless duplicate media. Upload missing immutable CSS/JS/static assets first. Read back and hash-check. Backup only DHAGO entry HTML and old manifest under a restricted `releases/` prefix. Publish `index.html`, `journal.html` and other entry HTML **last**, then `release-manifest.json` only when its entire referenced file list is present.
7. **Live QA:** verify signed-out public manifest is final SHA; original film decodes and time advances. Confirm local page, Mux judge route (if bonus claimed), Journal seek, fullscreen, Settings Escape, 320px player, and no source errors. CI browser logs and screenshots must come from the **public exact release**.
8. **Submission evidence:** curate actual browser screenshots, a short real interaction loop, accessibility/keyboard proof and engineering lab links. Clearly mark physical device/screen-reader checks not yet performed.
9. **Owner entry:** owner accepts license/legal terms and submits on Contra; retain a real success receipt. Never infer submission from site availability.

## Mux and bonus boundary

Original public playback ID (previous Git provenance): `Kc01fHxM9HqQpKzgf9qZRumwvL02wQZLZUwZHKtQ6F02mw`.

The Mux bonus is **one** potential point, contingent on real current video playback and a publicly retained asset. The **second** potential bonus point is for a separate real live-site use; propose the published `/journal.html` context, subject to judge interpretation. Historical IDs, a fetched playlist, or an R2 film do not by themselves earn the Mux point.

The judge-facing Mux route is `https://creative.aafnaipatro.com/?mux` (and optional `/journal.html?mux`). Standard `/?local` and `/` continue to use original direct media for codec resilience until a verified release strategy is explicitly chosen.

## Failure and rollback

A failed bonus-only Mux probe should be logged as a **bonus gap**, not mislabeled a failure of the local original MP4. A failed real player/CI browser gate blocks deployment. A published-bundle mismatch blocks manifest finalization. When live playback genuinely regresses, restore only the backed-up DHAGO entry HTML from the immediately previous known-good release (verify bytes first), retaining prior immutable assets. Do not roll back any unrelated AafnaiPatro service.

The **exact final release SHA**, full-browser QA results, Mux status, release asset checks and owner submission receipt are populated only from verified evidence; do not hardcode future success.
