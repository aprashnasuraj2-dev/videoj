# Aafnai Patro live-site bonus — independent editorial use

**Qualification date:** 2026-11-15  
**Live-site bonus URL:** https://aafnaipatro.com/on-this-day/video/apollo-11/  
**Owned site:** https://aafnaipatro.com/  
**Feature context:** Aafnai Patro → On This Day → Visual history  
**Worker:** `aafnai-history-video-apollo11`  
**Cloudflare route:** `aafnaipatro.com/on-this-day/video/apollo-11*`  
**Deployment:** `0c287b4c1e994a3caf41c575e7b7376d`  
**Reusable skin authority:** `a3b43f74c7652c707c3703193ab1081820bafa79` / hashed build from `detour-dist-a3b43f74c765`

## The two URLs have different jobs

| Role | URL | Content / purpose |
| --- | --- | --- |
| **Competition submission demo** | https://detour.aafnaipatro.com/mux/ | DETOUR-branded judging showcase using the project-authored Mux-hosted contest video; also qualifies the Mux bonus |
| **Independent live-site bonus** | https://aafnaipatro.com/on-this-day/video/apollo-11/ | Aafnai Patro editorial history page using the reusable skin on a separate NASA Apollo 11 visualization |

**These are intentionally not interchangeable.** The competition URL is also intentionally branded; no account-level `workers.dev` hostname belongs in the submission. The Aafnai Patro page is not the submitted skin demo. The Mux Worker is not being called a genuine live-site placement.

## Why the Aafnai Patro page is genuine site use

The page lives inside the existing `/on-this-day` product area and is written as historical editorial content:

- Aafnai Patro breadcrumb and link back to the On This Day archive;
- editorial title **Apollo 11 Landing Site** and date **20 July 1969**;
- explanatory history copy and “what to look for” notes;
- NASA Scientific Visualization Studio attribution and source link;
- no DETOUR title, competition copy, submission instructions, repo/process language or Mux showcase media.

The skin is simply the player interface used by the page.

## Different media

The live-site page does **not** reuse the contest showcase video.

- Editorial media: NASA Scientific Visualization Studio, **A New Look at the Apollo 11 Landing Site**, landing-site flyover.
- Public source page: https://svs.gsfc.nasa.gov/4185/
- Original source: NASA SVS Apollo 11 flyover linked above.
- Resilient editorial delivery asset: Mux Playback ID `kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U`, ingested from that NASA source and separate from the competition Mux asset.
- Aafnai Patro media path: `/on-this-day/video/apollo-11/media/apollo11.mp4`, which proxies only the editorial Mux rendition.
- Caption path: `/on-this-day/video/apollo-11/media/apollo11.vtt`.
- Observed duration in Cloudflare Browser Rendering after the delivery change: **46.94 seconds**.
- NASA SVS states its visualizations are public domain unless otherwise noted; Aafnai Patro credits NASA SVS and links the source.

## Browser evidence

Cloudflare Browser Rendering independently loaded the public editorial URL and observed:

- HTTPS 200 on `aafnaipatro.com`;
- response headers `x-aafnai-feature: on-this-day-video`, `x-player-skin: detour-a3b43f74c765`, `x-live-site-use: editorial-history`;
- the Video.js player initialized to ready state;
- a ~47-second Apollo 11 media duration, served from the separate editorial Mux asset behind the Aafnai Patro media URL;
- captions, play/pause, seek/time, mute, fullscreen, Keep my place, Return, Stay and settings.

A second Browser Rendering interaction probe executed the real signature path against the remote editorial media:

1. wait until media is ready and seekable;
2. seek to **12s** and wait for the remote seek to settle;
3. Keep my place and wait for the held **00:12** label;
4. seek to **2s**;
5. Return;
6. observe **12.000s**, paused state preserved.

The repository gate `tests/live-site.test.mjs` targets this exact editorial URL and includes the remote-seek settlement requirement. The competition asset Playback ID `Ml1c1QHJ…` and editorial asset Playback ID `kjscGKEn…` are intentionally different.

## Removed temporary implementation

The earlier experimental route `aafnaipatro.com/labs/detour*` and Worker `aafnai-detour-live-v1` were deleted after recognizing that a DETOUR-branded “Video Lab” was too close to a second contest showcase. **Do not cite or restore that route as bonus evidence.**

## Retention and counterexample

Keep `aafnai-history-video-apollo11` and the editorial route live through judging. If the live-site page became a redirect/iframe to the competition demo, reused the contest landing-page narrative, or stopped serving independent editorial media, the live-site bonus would no longer be defensible.
