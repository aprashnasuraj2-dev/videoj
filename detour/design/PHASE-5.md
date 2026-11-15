# Phase 5 — package and host boundary

## 2026-11-15 Phase 5 acceptance

**Decision: proceed with DETOUR.** The exact implementation gate at `012482415ecb706d246646f0f9b95dbe780d91dc` passed in GitHub Actions [run 43691495087](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/43691495087) on Ubuntu with Node 24, pinned `@videojs/html` 10.4.0, Playwright 1.62.1, Chromium and desktop WebKit.

| Gate | Observed result |
| --- | --- |
| Architecture invariants | 4/4 passed: package boundary, Mux ID guard, bounded lifecycle/no polling, scoped CSS/no management credential hooks. |
| Packed external consumer | 2/2 passed after `npm pack` and install into a fresh host. The archive contains the skin, declarations, README and Apache-2.0 license; demo, integration, tests, design and fixtures are excluded. |
| Cross-engine package behavior | External-host Return landed at 42.350s in Chromium and desktop WebKit. Native `currentTime` and `player.store.state.currentTime` agreed; seeks use `player.store.seek(...)`. |
| Full Chromium regression | 16/16 scenarios passed, including failure/stale-result guards, source capability guards, touch/keyboard, loading/error, portrait media, dense chapters and long-duration labeling. |
| Focused desktop WebKit regression | 10/10 Return attempts landed at 42.350s after the 42.35 → 18 → 24 → 42.35 route. |
| Reconnect regression | A pending Return can disconnect/reconnect without destroying the Return label/time markup; a subsequent held place renders and behaves normally. |

### Delivery boundaries

| Surface | Owns | Explicitly does not own |
| --- | --- | --- |
| `skin/index.js` | `createDetourPlayer`, v10 component composition and DETOUR behavior | Demo copy, media URLs, fixture paths, Mux code, publication paths |
| `skin/player.css` | Player-scoped visual tokens and component rules under `.detour` | Host-global element/body rules |
| Host media slot | Native video/audio element and native track children supplied by caller | Asset selection or rights policy inside the skin |
| `skin/mux.js` | Optional public playback-ID URL/native-HLS helper | Management API, secrets, Chromium HLS engine, mandatory network dependency |
| `integration/` | Example host composition and replacement source/captions | Package internals |
| `public/fixtures/` | Generated deterministic regression media | Package payload or production media requirement |

Package exports are `.`, `./styles` and optional `./mux`. The package remains `private: true`: Phase 5 proves a packed install, not registry publication.

### Player state and per-instance model

DETOUR reads the v10 player store and native provider rather than maintaining a second clock. The seek action is `player.store.seek(time)`; verification cross-checks `player.store.state.currentTime`, native `media.currentTime`, duration, seeking settlement and real seekable ranges. The held state stores only the unrounded origin time, source identity/epoch and current return attempt.

Each `detour-place` instance owns its mark and attempt. Two packed-host players were mounted simultaneously: keeping a place on player A never created a marker on player B. Source epoch checks and attempt identity reject late results. A pending-return reconnect regression specifically covers the former destructive-markup failure: the button now keeps persistent label and pending nodes rather than replacing its children.

### Capability contract

| Media/provider state | DETOUR held-place action | Baseline playback |
| --- | --- | --- |
| Explicit VOD video, metadata ready, finite duration, target inside a real seekable range | Enabled | Enabled |
| VOD before readiness / empty seekable ranges | Disabled | Unchanged |
| Provider reports `streamType === 'live'`, even with finite-looking values | Disabled | Unchanged |
| Explicit `sourceKind: 'live'` | Hidden | Unchanged |
| Audio element | Hidden | Audio remains host/player-owned |
| `srcObject` | Disabled | Unchanged |
| Replacement source | Old mark/attempt invalidated | New source can become eligible after readiness |

This is intentionally conservative. A finite duration by itself is not proof of stable VOD semantics.

### Event, render and accessibility budget

The DETOUR-owned behavior has 14 listener call sites that expand to a fixed 24 runtime registrations per connected instance through two fixed media-event lists. Every registration is tied to one instance `AbortSignal` and is aborted on disconnect. There is no `requestAnimationFrame`, video-frame callback, interval, MutationObserver, analytics loop or mandatory third-party fetch. The only DETOUR timer is the one-shot 8-second Return settlement deadline.

Rendering is event-driven. `#viewKey` and `#bufferKey` suppress unchanged DOM work; buffered segments are rebuilt only when measured ranges change. The standard v10 controls retain their roles and keyboard behavior. DETOUR adds semantic Hold/Return/Stay/settings buttons and one polite atomic status. The held bracket and buffered decoration are `aria-hidden`, non-focusable and pointer-inert. Existing focus tests cover Keep, Return, Stay, Settings and the documented time slider.

### CSS, media and security seams

All player rules remain rooted under `.detour` (aside from scoped keyframe/media/container constructs), and the architecture test rejects an unscoped selector. Client source is checked for management credential hooks. The optional Mux helper accepts only public playback-ID-shaped strings and rejects custom playback domains rather than silently embedding host credentials.

The packed external host supplies its own MP4 and VTT. A different deployment may use remote media only when that media host provides the required CORS/range behavior. No token or secret is required for ordinary MP4 playback.

### Representative fixture matrix

| Scenario | Fixture / harness | Expected behavior | Result |
| --- | --- | --- | --- |
| Landscape VOD, captions, no poster, chapterless | `navigation-study.mp4/.vtt` | Ordinary controls + DETOUR; no invented poster/chapter UI | Pass |
| Bright visual content | `daylight-study.mp4/.vtt` | Same controls/contrast behavior independent of footage | Pass |
| Portrait VOD | generated `portrait-study.mp4/.vtt`, 360×640 | Same 42.35 → 18 → 42.35 behavior without layout/media coupling | Pass |
| Dense metadata | generated 64-cue `dense-chapters.vtt` | Track may exist without cluttering or changing held-place semantics | Pass |
| Long duration without a long film | controlled 40,000s media state | A held time at 36,042.35s renders `Return to 10:00:42` | Pass |
| Initial throttling / waiting | held HTTP response and controlled ready state | Only measured loading/buffering status appears | Pass |
| 404 / retry | intercepted fixture request | Error is visible; retry recovers after source is available | Pass |
| Source replacement | same native element, changed URL/load | Old mark clears; replacement becomes eligible after readiness | Pass |
| Rejected/delayed/stale seek | controlled store wrapper | Valid mark survives failure; stale completion cannot consume newer state | Pass |
| Two players / disconnect-reconnect | packed host | Marks isolate; listeners/attempt state reset on disconnect | Pass |

All generated video/VTT fixtures are local deterministic test assets; no paid service call is required.

### Technical go/no-go

Proceed with the primary DETOUR concept. The core seek path now passes both key desktop engines, an independently installed package, simultaneous instances, replacement media, readiness/capability guards and reconnect cleanup. The 90-minute backup trigger is therefore not active.

From the Phase 5 CI checkpoint at about 13:34 NPT on Nov 15 to the planned Nov 17 10:44 NPT release freeze is roughly **45 hours of calendar reserve**. Remaining work through a submission-ready core is estimated at **12–18 active engineering hours**: Phase 6 closure/race loops, browser/mobile/accessibility QA, evidence/performance capture, and public release/handoff. Calendar reserve is not equivalent to productive hours, so optional Mux/public-site bonuses must not consume the core reserve.

**Counterexamples and limits:** desktop WebKit is not a physical Safari/iPhone pass; browser emulation is not a screen-reader session; the Mux module resolving and validating a public playback ID is not evidence that Mux HLS was played; the package is packed-installable but not registry-published; uncoached first-use evidence and account-level second-entry eligibility remain separate open dependencies.

## Earlier architecture checkpoint

The first Phase 5 checkpoint established the separate core, styles, optional Mux entry, declarations and `integration/` composition but deliberately left step 042 unchecked because no separately installed consumer had run. That restraint is preserved in history; the acceptance above is what closes the architecture phase.
