# Candidate verification — 2026-11-13

PASS: clean `npm ci`; TypeScript check; Vite production build on Node 24.
NOT TESTED: browser behavior, responsive screenshots, automated axe scan. All six local Playwright cases failed at browser launch because the Chromium archive download was corrupt. A second attempt with system Chromium also failed at launch because socket creation is prohibited in this runtime. These are infrastructure failures, not passing player tests. CI installs Chromium independently and retains traces/screenshots.
NOT TESTED: physical iPhone, VoiceOver/NVDA, real fullscreen, phone first-use trial, production signed-out access, Mux HLS playback.

## Behavior matrix

| Action | Expected evidence | Automation |
|---|---|---|
| Play / pause | media time advances; paused becomes true | player.spec.ts |
| Seek | End moves actual media time past 60 seconds | player.spec.ts |
| Mute | actual media muted property is true | player.spec.ts |
| Captions | captions text track becomes showing | player.spec.ts |
| Settings / Escape | menu opens; focus returns to trigger | player.spec.ts |
| Widths 320/375/768/1280 | no document overflow; essential controls visible; screenshot | player.spec.ts |
| Accessibility | zero serious/critical axe findings in player | player.spec.ts |

The deterministic suite uses `?local`, keeping local media checks independent of CDN availability. It does not establish the Mux bonus. Test Mux separately against the deployed default player and record manifest/segment requests and advancing media time.


## Verified GitHub browser run — revision 1cae217

Run https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43420343473 completed with **17/17 passing tests**, Chromium on Ubuntu, @playwright/test 1.65.0 and axe 4.14.0. Clean install, typecheck and build also passed.

Verified real media state: play/pause, focused-thumb seeking and volume, mute, captions, chapter seek/readout, playback speed, ended/replay, native document fullscreen entry/exit, no-chapter seek. Captured 320/375/768/1280 layouts, three themes, bright/dark isolated player. Checked visible focus, 44px essential control targets and reduced motion. Serious/critical axe scans passed for resting player, open settings, error and each theme.

Earlier observed failures were retained: unnamed Settings button; missing ribbon from collapsed track; fullscreen shelf lost because state selector targeted the container instead of native :fullscreen; test focus placed on slider wrapper instead of the focusable thumb. Relevant fixes now pass. Tests do not establish physical-phone behavior, screen-reader usability, forced-colors rendering, live production access or Mux playback. No WCAG certification is claimed.
