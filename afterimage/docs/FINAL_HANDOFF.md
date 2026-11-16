# AFTERIMAGE final submission handoff

## Current challenge state

Rechecked from Contra on 2026-11-16: **ACTIVE**, submissions enabled, deadline **2026-11-17 07:59 UTC** (Nov 16 11:59 p.m. PST / Nov 17 1:44 p.m. NPT). Required: public Video.js v10 URL playing video + one visual + a short design description. Minimum controls: play/pause, seek, time, volume/mute, fullscreen; responsive and keyboard operable. Bonuses: public Mux playback ID + real live site using the skin.

## Freeze line

Do not modify the serving product unless a new release-critical defect is demonstrated.

- Product source: `2316dc7f07f5b73a2d30d7e95fc5b09e6f83fb69`
- Runtime: `0.3.10-control-fit`
- Candidate: https://afterimage.aafnaipatro.com/
- Primary Worker deployment: `0b1d5abb-07ae-4c97-87e8-66512216bcfa`
- Primary Worker version: `05caf0d5-26c7-432a-abbf-ed77fe092e6b` (100%)
- Known-good predecessor deployments remain in Cloudflare history for rollback.

## Submission fields

1. **URL:** https://afterimage.aafnaipatro.com/
2. **Visual:** `afterimage-primary-still.png` from Actions artifact `14200790244`.
3. **Description:** use the three-sentence description in `docs/SUBMISSION.md`.
4. **Mux playback ID:** `kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U`
5. **Live-site URL:** https://aafnaipatro.com/on-this-day/afterimage/apollo-11/
6. **Optional reel if the signed-in form exposes a media/video field:** `afterimage-submission-reel.mp4`, 52.28s / 5.21MB / silent.

## Evidence ledger

| Gate | Run | Result |
| --- | ---: | --- |
| Exact product CI | 43810424989 | pass |
| Keyboard + touch/race + judge first-use | 43810603770 | pass |
| Chromium / Firefox / WebKit | 43810610298 | pass |
| Headed fullscreen + exit label settlement | 43812044536 | pass |
| Submission capture | 43810624542 | pass |
| Aafnai Patro + Mux live-site | 43810653422 | pass |

Key artifacts:

- `14200790244` — final submission stills + 52.28s reel.
- `14200770178` — definitive keyboard screenshots/report.
- `14200770155` — touch/race report + mobile touch screenshot.
- `14200760222` — first-use report/screenshot.
- `14201295418` — strengthened fullscreen evidence.
- `14199609812` — Apollo/Mux live-site screenshot/report.

## Bonus proof

Apollo page observed direct `stream.mux.com` playback using the submitted public playback ID, host lime `#d9ff4a`, host Mux poster, captions, chapters, Aafnai Patro navigation and NASA attribution. Manual pinning and all reveal presets work without the WATERLINE authored example. Apollo Worker deployment is `37a1a47a-7e1f-40dd-af3c-124d7cf00933` / version `e85068b9-4e0e-4976-85d3-f4c42ecbd55a` at 100%.

## Rollback

Primary `afterimage-preview` has a separate deployment history; current deployment is `0b1d5abb...`. Earlier known-good 100% versions include `aae285ec...`, `62c4305f...`, `2b43f14a...`, `e2eb23a6...`, and earlier tested releases. Apollo is isolated under `aafnai-history-afterimage-apollo11` with its own independent deployment chain. Do not change apex Patro or DETOUR routes to roll back AFTERIMAGE.

## Remaining account action

No connected Contra tool exposes challenge submission, and no submission has been claimed. The owner must complete the signed-in form upload/submit step and confirm success. After submission, record the resulting URL/status without altering the frozen product unless Contra reports a real defect.

## Ongoing requirement

Keep Mux playback ID `kjscGKEn9895zn00Tk7GWxsa1y8c00mtKQYT4K00NgMI3U` live through judging.
