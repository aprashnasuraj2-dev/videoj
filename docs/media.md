# Original film and Mux operations

`from-fibre-to-fabric.mp4` is the canonical 64-second original DHAGO motion study. Its four chapters follow Raw fibre → Twist into thread → Warp meets weft → Cloth holds time, with matching descriptive captions and a WebM compatibility encode. The public release currently serves these exact media objects from the dedicated Cloudflare R2 bucket. `?local` explicitly disables any future Mux playback ID so local-source verification remains possible.

Repository Actions secrets must be named `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET`. Their values cannot be read through the connected repository API. The supplied API token ID is not a playback ID. Never put either management credential into VITE variables.

`Provision Mux demo media` creates or reuses the matching content-hash asset with basic quality and public playback. It waits for ready, then exports only the public configuration as a workflow artifact for review. It does not accept contest terms or submit an entry. An asset list safety bound prevents blindly creating duplicates in unexpectedly large accounts. A runner failure after direct upload creation but before asset creation can leave a pending upload; inspect Mux before repeating an interrupted upload.

After provisioning, inspect the workflow result and test actual HLS playback before marking steps 65–67 complete. A ready API asset is not browser playback proof. Account billing limits and judging lifetime remain to be confirmed. At 1,000 full 64-second views, delivery is about 1,067 minutes before replay. At 4 Mbps this is roughly 32 GB. Video stays on the media CDN; no application worker proxies it.

API reference verified 2026-11-13: https://www.mux.com/docs/api-reference/video/direct-uploads/create-direct-upload . Version-matched integration: installed @videojs/html 10.4.0 docs/reference/components/mux-video.md.

## Current source, release, and spend boundary

`apps/preview/src/media.json` is intentionally null until the canonical fibre-to-fabric asset receives its own verified public Mux playback ID. The previous playback ID belongs to the retired `studies-in-thread` film and must not be reused. Public smoke accepts the exact R2 film today and can validate the new Mux source later when `media.json` is populated.

The published 2026-11-13 Mux Free plan advertises 100,000 delivered minutes monthly and at most 10 stored videos; a full 64-second watch consumes about 1.067 delivery minutes. The account-specific plan/remaining quota were not available. See `docs/mux-cost-and-retention.md`. Do not start another upload or enable paid spend to work around an unverified limit.
