# DETOUR cross-hardening evidence

This pass strengthens DETOUR's standard-player keyboard, fullscreen, focus, touch-interruption and release evidence without changing the Keep → Explore → Return / Stay interaction or DETOUR's graphite/lime identity.

## Baseline, product and release boundary

- Baseline branch: `detour`
- Protected baseline head: `a4af85bc7e83c08d6417ce4d3065738a0e2da68f`
- Hardening branch: `detour-hardening`
- Verified hardening product SHA: `d91494e77c1bf8860a2d26a638e1e72958040e69`
- Full release-style hardening run: GitHub Actions `43818172481` — success.
- Focused new-gate run at the same product SHA: `43818172494` — success.
- Package/runtime version remains `0.1.0` with `@videojs/html 10.4.0`.
- Current public route remains `https://detour-entry.aafnaipatro.com/mux/`.
- Current public release identity remains `d430f2ee49fa93a460c150fd90205b13fe5327be` / `detour-dist-d430f2ee49fa`.
- The hardening candidate was **not** promoted publicly during this pass. Public-host evidence for the older release is not reused as proof of the new hardening product.

## What changed

Engineering/accessibility changes only:

1. Focus indication remains DETOUR blue but is now a rendered 3px indicator instead of 2px.
2. The non-control `media-container` is removed from sequential focus navigation.
3. The semantic seek thumb is explicitly available in the natural keyboard sequence.
4. A bare host media element is removed from implicit sequential focus navigation only when the host did not explicitly set its own `tabindex`; an explicit host choice is preserved.
5. Architecture tests now reject AFTERIMAGE / Temporal Lens / Pinned-Split-Now / WATERLINE concept leakage into DETOUR's reusable runtime.
6. Dedicated executable gates now certify keyboard, fullscreen, touch interruption and first-use automation.

No new seek model, checkpoint semantics, frame capture, comparison mode or visual language was added.

## Exact passing gate

Run `43818172481` passed on product SHA `d91494e77c1bf8860a2d26a638e1e72958040e69`:

- production build;
- architecture and concept-boundary tests;
- real packed external-host regression;
- full Chromium regression;
- full Firefox regression;
- full desktop WebKit regression;
- existing Phase 7 responsive, preferences, keyboard and emulated-touch gate;
- footprint budget;
- definitive keyboard journey in Chromium;
- definitive keyboard journey in Firefox;
- definitive keyboard journey in desktop WebKit;
- headed fullscreen roundtrip;
- touch-interruption recovery;
- judge-first-use automation metric;
- checklist/progress validator.

The separate focused run `43818172494` passed the new keyboard/fullscreen/touch/judge gates at the same product SHA.

## Keyboard-only journey

A clean page begins with `document.activeElement === body`; DETOUR does not artificially prefocus a player control.

Across Chromium, Firefox and desktop WebKit, the first player Tab stop is the semantic Seek thumb:

- tag: `media-slider-thumb`
- accessible name: `Seek`
- role: `slider`
- rendered thumb: 8×12 CSS px inside a 44px-high seek target
- focus outline: 3px solid `rgb(185, 234, 255)`
- focus contrast against `#171c1d`: **13.34:1**
- representative control foreground `rgb(241, 244, 236)` against the shelf: **15.48:1**

The deterministic keyboard path reaches Seek, Play, Mute, Volume where available, Captions, Fullscreen, Playback Settings, Keep my place, Return and Stay here. Forward and reverse navigation are both exercised without relying on browser focus wrapping.

Actual media state is asserted rather than button attributes:

- Enter on Play starts real playback and the media clock advances;
- Space pauses and the clock stops;
- Enter resumes according to the component semantics;
- Enter/Space on Mute changes real `video.muted`;
- ArrowLeft/ArrowRight on Volume changes real `video.volume` when volume is available;
- Captions activation reaches a real loaded VTT track with cues;
- Settings opens from the keyboard, Tab reaches the first rate, Escape closes it, focus returns to Settings, and playback intent is unchanged.

Signature flow is also keyboard-only:

`00:42 Keep → seek to ~00:18 → second exploration seek → Return → ~00:42`

and separately:

`Keep → explore → Stay here`

Successful Return consumes the single held place and settles focus on a visible logical base-state action. In the final evidence artifacts all three engines settled on **Keep my place**. Stay clears the held place without seeking and returns focus to **Keep my place**.

## Fullscreen roundtrip

Headed Chromium under Xvfb exercised the real Fullscreen API.

Observed:

- `document.fullscreenEnabled === true`;
- Video.js fullscreen availability: `available`;
- fullscreen element: `MEDIA-CONTAINER.detour`;
- viewport: 1280×800;
- picture remained visible;
- shelf bottom: 799px, inside the viewport;
- Play: 44×44;
- Seek: 1239.625×44;
- Return: 178.17×44;
- Stay: 93.83×44;
- Settings: 44×44;
- captions remained `showing` with real cues;
- Settings remained keyboard reachable inside fullscreen;
- Escape closed Settings first and returned focus to Settings without changing the held place or playback intent.

The CI browser did not exit the Fullscreen API when Escape was attempted. The test does **not** fake that result: it records the limitation, proves the visible Fullscreen control remains keyboard reachable, and exits through that control.

Accessible-name settlement passed twice:

`Enter fullscreen → Exit fullscreen → Enter fullscreen → Exit fullscreen → Enter fullscreen`.

## Touch interruption evidence

This is browser-level Chromium touch/mobile emulation, not physical-device evidence.

Passed:

- touch Keep at 42.35s;
- tap seek to 19.199s while retaining the held place;
- Return to 42.35s;
- touch drag seek;
- pointer release outside the slider with no retained pointer capture;
- `pointercancel` with bounded media state;
- page scrolling after slider interaction, observed `scrollY 0 → 305`;
- Stay after touch seek with no extra seek;
- manual touch seek while Return is pending;
- pending Return cancellation message: `The new seek took precedence. Your place is still kept.`;
- late stale Return completion is ignored and does not jump the media.

The physical iPhone Safari and Android Chrome gate remains open.

## Judge-first-use automation

This is an engineering timing metric only. It is **not** a human discoverability claim.

Fresh session:

- active element: `body`;
- Play: 44×44;
- Seek: 1207.625×44;
- Keep my place: 276×44;
- Fullscreen: 44×44;
- Settings: 44×44;
- automated fresh-state observation: 153.2 ms.

Automated signature walkthrough:

- hold at 42.35s;
- explore to 18s;
- second exploration to 24s;
- Return to 42.35s;
- elapsed automation: 327.7 ms.

Automated Stay walkthrough:

- hold;
- explore to 18s;
- Stay here;
- current time remains 18s and paused state is unchanged;
- elapsed automation: 171.5 ms.

Steps 017 and 090 remain open because automation cannot substitute for uncoached human evidence.

## Existing footprint and architecture evidence retained

The existing equal-target footprint gate passed again in run `43818172481`:

- incremental compressed DETOUR feature cost: **1,815 bytes** versus the base entry;
- five fresh-context plus five repeat-context signature traces;
- zero observed Long Tasks >50ms in those CI traces.

This remains CI/browser evidence, not a low-end-phone performance claim.

The reusable package still provides a functional `detour-video-skin/base` export without held-place behavior. Core package/runtime code contains no AFTERIMAGE import or signature terminology and no browser management credential.

## Deliberate exclusions

- A permanent keyboard-help cue was not added. The direct keyboard path is now independently certified and the existing compact control composition already exposes the necessary controls; another persistent cue would add visual density without being required for operation.
- No AFTERIMAGE frame capture, canvas reference, split-screen, Temporal Lens, Pinned/Split/Now, WATERLINE media, comparison preset or authored paired-frame behavior was introduced.
- No public promotion was performed merely to claim the hardening candidate as released.

## Known limits

Still unverified and therefore not claimed:

- physical iPhone Safari;
- physical Android Chrome;
- NVDA;
- VoiceOver;
- native browser-level 200% zoom;
- uncoached first-use human recognition/task completion;
- low-end-device performance.

The desktop WebKit gate is browser-engine evidence on the CI host; it is not described as physical Safari/iPhone.

## Regression audit

The full pre-existing package and browser suites passed before the new hardening claims were accepted.

The original signature interaction remains intact:

- Keep records one real, source-scoped position;
- ordinary seeking remains ordinary;
- Return performs one deliberate seek to the held position;
- Stay clears without seeking;
- optional C1–C4 checkpoints remain bounded and source-scoped;
- standard Play/Pause, Seek, time, Mute/Volume, Captions and Fullscreen remain independent of the signature feature.

## Concept-drift audit

**No.** No hardening change altered DETOUR's central behavior, graphite/lime visual identity or submission story. The changes are keyboard/focus, fullscreen evidence, touch-interruption resilience, architecture isolation and release-proof hardening only.
