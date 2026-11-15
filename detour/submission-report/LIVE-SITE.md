# Aafnai Patro live-site bonus

**Qualification date:** 2026-11-15  
**Public URL:** https://aafnaipatro.com/labs/detour/  
**Owned site:** https://aafnaipatro.com/  
**Worker:** `aafnai-detour-live-v1`  
**Cloudflare route:** `aafnaipatro.com/labs/detour*`  
**Current deployment:** `f0e707401bac46dfab475122ef993daf`  
**Accepted DETOUR runtime:** `a3b43f74c7652c707c3703193ab1081820bafa79` / hashed production assets from `detour-dist-a3b43f74c765`

## Why this is a separate +1 claim

The Mux bonus and live-site bonus are independent:

- **Mux +1:** the competition judging URL plays the qualified public Mux asset.
- **Live-site +1:** the owned Aafnai Patro project exposes DETOUR on its own public domain with an independent same-origin video and caption track.

The live-site page is not a redirect to the competition demo and does not use Mux to establish the second bonus. It loads the accepted hashed DETOUR player bundle and the separate `daylight-study.mp4` / `daylight-study.vtt` content through the Aafnai Patro origin.

## Cloudflare isolation

Before deployment, the Aafnai Patro zone had no route matching `/labs/detour*`. A new Worker and one exact route were created rather than modifying the root `patro` Worker or existing Atlas, library, date, discovery or advanced-tool routes.

The public page identifies itself as **Aafnai Patro — Video lab** and links back to the site root. Response headers identify the isolated use:

- `x-detour-live-site: aafnaipatro`
- `x-detour-runtime: a3b43f74c765`
- `x-detour-use: independent-site`

## Independent browser evidence

Cloudflare Browser Rendering loaded the live URL after JavaScript execution and observed:

- final HTTPS page on `aafnaipatro.com`;
- `video-player` mounted with `data-media-state="ready"`;
- same-origin source `/labs/detour/fixtures/daylight-study.mp4`;
- 64-second duration exposed by the seek slider;
- host captions from `daylight-study.vtt`;
- play, seek/time, mute, captions, fullscreen, Keep my place, Return, Stay and playback settings rendered in the live player.

Validate DETOUR run **43715327394** adds the interaction proof. Its **Verify Aafnai Patro live-site bonus** step passed signed out and verified:

1. HTTPS Aafnai Patro route and live-site/runtime headers.
2. Independent same-origin 64-second video/captions.
3. All five contest-required controls visible.
4. Hold at **42.35s**.
5. Seek to **18s**.
6. **Return** settles back at approximately **42.35s** while preserving paused state.
7. Play/pause and mute work on the live page.

## Retention and counterexample

Keep `aafnai-detour-live-v1` and the `/labs/detour*` route live through judging. If the page were merely an iframe/redirect to the competition demo, or if it used a test-only localhost, the second bonus would be weak; this deployment instead mounts DETOUR on the owned site and serves independent media on that origin.

The historical Phase 8 decision to skip the live-site bonus was correct at that time. This later evidence supersedes the skip without rewriting that historical record.
