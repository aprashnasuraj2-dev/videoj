# Build artifacts, media and durable storage

Source code, generated media and published web assets have different lifecycles.

| Asset | Primary reference | Retention rule |
| --- | --- | --- |
| Reusable DHAGO source | Git commit in this repository | Tag/review source revision; do not embed secrets |
| Reusable DETOUR package | `cd detour && npm pack` | Preserve exact source SHA and tarball checksum |
| Canonical DHAGO film and captions | `apps/preview/public/media/` and media provenance | Preserve verified MP4, WebM, WebVTT and poster |
| Deployed static files | Commit-matched `dist/` and release manifest | Store immutable build and checksum evidence |
| Browser runs / performance captures | GitHub Actions artifacts or configured owner archive | Keep actual browser, date, run and source revision visible |
| Optional Mux delivery | Public playback config plus account-owned asset | Keep management tokens outside source and browser |

`archive-drive.yml` is an optional, manually triggered durable source/evidence archive and requires separately configured OAuth credentials. It must not be assumed to run merely because GitHub or Drive is connected. Confirm uploads and independent readback before calling them retained.

Published URLs are **not** evidence that a specific commit is live. Verify `release-manifest.json.source_sha` and actual playback from the named public route. Do not duplicate media uploads or alter shared Cloudflare storage and unrelated domains to refresh a project-specific demonstration.

Prior one-off release packets and detailed run logs remain available in repository version history; maintain new records around exact source versions and tested results.
