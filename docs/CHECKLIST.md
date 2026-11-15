# DHAGO — Competition Excellence Checklist

Phases 1–9 below are the authoritative current program, stored in **docs/steps.json** after the preserved historical 100 steps. IMPLEMENTED is not VERIFIED. Phase 10 remains owner-only and unsubmitted.

8/214 VERIFIED · 144 IMPLEMENTED · 60 IN PROGRESS · 2 BLOCKED

## Phase 1

### Design and engineering audit

- [x] **EX-01-001: Latest main and development history** — VERIFIED

  Existing: Source inspected at main 7b585e369bc3

  Required: Latest main and development history

  Acceptance: Capture base SHA, recent changes and exact prior evidence

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: https://github.com/aprashnasuraj2-dev/videoj/commit/7b585e369bc3f4d322a26d947a9bbcd114707fc4

  Blocker: none recorded

- [x] **EX-01-002: Existing docs and outstanding work** — VERIFIED

  Existing: Source inspected at main 7b585e369bc3

  Required: Existing docs and outstanding work

  Acceptance: Reconcile all existing progress and known gaps

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: https://github.com/aprashnasuraj2-dev/videoj/commit/7b585e369bc3f4d322a26d947a9bbcd114707fc4

  Blocker: none recorded

- [x] **EX-01-003: Player component hierarchy** — VERIFIED

  Existing: Source inspected at main 7b585e369bc3

  Required: Player component hierarchy

  Acceptance: Trace the real video-player and all native controls

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: https://github.com/aprashnasuraj2-dev/videoj/commit/7b585e369bc3f4d322a26d947a9bbcd114707fc4

  Blocker: none recorded

- [x] **EX-01-004: Living Loom implementation** — VERIFIED

  Existing: Source inspected at main 7b585e369bc3

  Required: Living Loom implementation

  Acceptance: Map event-driven state to actual media

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: https://github.com/aprashnasuraj2-dev/videoj/commit/7b585e369bc3f4d322a26d947a9bbcd114707fc4

  Blocker: none recorded

- [x] **EX-01-005: Internal chapter ribbon** — VERIFIED

  Existing: Source inspected at main 7b585e369bc3

  Required: Internal chapter ribbon

  Acceptance: Explain cues, thumb, fill and seek semantics

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: https://github.com/aprashnasuraj2-dev/videoj/commit/7b585e369bc3f4d322a26d947a9bbcd114707fc4

  Blocker: none recorded

- [x] **EX-01-006: Portable ribbon component** — VERIFIED

  Existing: Source inspected at main 7b585e369bc3

  Required: Portable ribbon component

  Acceptance: Confirm no Video.js-specific import

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: https://github.com/aprashnasuraj2-dev/videoj/commit/7b585e369bc3f4d322a26d947a9bbcd114707fc4

  Blocker: none recorded

- [ ] **EX-01-007: Seek, playback, captions, speed, audio and fullscreen** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Seek, playback, captions, speed, audio and fullscreen

  Acceptance: Trace each control to its actual source

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [x] **EX-01-008: Homepage and all studio pages** — VERIFIED

  Existing: Source inspected at main 7b585e369bc3

  Required: Homepage and all studio pages

  Acceptance: Record five public page roles and links

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: https://github.com/aprashnasuraj2-dev/videoj/commit/7b585e369bc3f4d322a26d947a9bbcd114707fc4

  Blocker: none recorded

- [ ] **EX-01-009: Live deployed release** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Live deployed release

  Acceptance: Retrieve and compare release manifest with tested source

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-01-010: Baseline player-only screenshots** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Baseline player-only screenshots

  Acceptance: Capture isolated desktop and mobile before images

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-01-011: Linen, Ink and Paper comparison** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Linen, Ink and Paper comparison

  Acceptance: Show same geometry and distinct surface readability

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-01-012: Generic-looking control audit** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Generic-looking control audit

  Acceptance: Name selectors and show screenshots of deficiencies

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-01-013: Unfinished or duplicate functionality** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Unfinished or duplicate functionality

  Acceptance: Point to exact code and avoid reimplementation

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-01-014: Mobile weaknesses** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Mobile weaknesses

  Acceptance: Record target geometry and overflow at 240 and 320

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [x] **EX-01-015: Browser and accessibility evidence** — VERIFIED

  Existing: Source inspected at main 7b585e369bc3

  Required: Browser and accessibility evidence

  Acceptance: Separate automation from real human/device coverage

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: https://github.com/aprashnasuraj2-dev/videoj/commit/7b585e369bc3f4d322a26d947a9bbcd114707fc4

  Blocker: none recorded

- [ ] **EX-01-016: Rubric baseline** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Rubric baseline

  Acceptance: Record supported facts, counterexample and unverified gaps

  Verification: source inspection and actual player screenshot

  Source files: src/create-player.ts, src/video/living-loom.ts, src/video/dhago.css, apps/preview/index.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

## Phase 2

### Textile visual identity

- [ ] **EX-02-001: Warp, weft, shuttle, selvedge and tension language** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Warp, weft, shuttle, selvedge and tension language

  Acceptance: Each term maps to a visible, functional component

  Verification: player-only static/interactive screenshots

  Source files: src/video/dhago.css, src/video/skin.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-02-002: Cohesive player material** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Cohesive player material

  Acceptance: Identity recognizable without surrounding website

  Verification: player-only static/interactive screenshots

  Source files: src/video/dhago.css, src/video/skin.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-02-003: Consistent geometry** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Consistent geometry

  Acceptance: Spacing, corners and icon alignment follow one grid

  Verification: player-only static/interactive screenshots

  Source files: src/video/dhago.css, src/video/skin.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-02-004: Refined textures** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Refined textures

  Acceptance: Patterns are legible without overpowering actual media

  Verification: player-only static/interactive screenshots

  Source files: src/video/dhago.css, src/video/skin.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-02-005: Time and chapter typography** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Time and chapter typography

  Acceptance: Stable numerals and scannable hierarchy at 320

  Verification: player-only static/interactive screenshots

  Source files: src/video/dhago.css, src/video/skin.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-02-006: Depth, contrast and shadows** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Depth, contrast and shadows

  Acceptance: Readable player against three backgrounds

  Verification: player-only static/interactive screenshots

  Source files: src/video/dhago.css, src/video/skin.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-02-007: Three unified surface treatments** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Three unified surface treatments

  Acceptance: Linen, Ink and Paper share behavior and proportions

  Verification: player-only static/interactive screenshots

  Source files: src/video/dhago.css, src/video/skin.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-02-008: Video dominance** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Video dominance

  Acceptance: Film remains main visual area, not decoration

  Verification: player-only static/interactive screenshots

  Source files: src/video/dhago.css, src/video/skin.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-02-009: Remove ornamental clutter** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Remove ornamental clutter

  Acceptance: No visual element obscures caption, thumb or control

  Verification: player-only static/interactive screenshots

  Source files: src/video/dhago.css, src/video/skin.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-02-010: Signature paused-state crop** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Signature paused-state crop

  Acceptance: Unlabeled paused player expresses woven-time concept

  Verification: player-only static/interactive screenshots

  Source files: src/video/dhago.css, src/video/skin.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

## Phase 3

### Signature woven timeline

- [ ] **EX-03-001: Continuous chapter textile** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Continuous chapter textile

  Acceptance: Joined chapters read as one time structure

  Verification: cue geometry assertions and cropped browser screenshots

  Source files: src/video/dhago.css, src/ribbon/ribbon.ts, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-03-002: Chapter-specific patterns** — IMPLEMENTED

  Existing: Changed on candidate bd83e562e593

  Required: Chapter-specific patterns

  Acceptance: Each of the four original swatches differs without relying solely on color

  Verification: cue geometry assertions and cropped browser screenshots

  Source files: src/video/dhago.css, src/ribbon/ribbon.ts, tests/thread.spec.ts

  Evidence: https://github.com/aprashnasuraj2-dev/videoj/commit/bd83e562e5938f354392414b37bc702bf55ea2c2

  Blocker: none recorded

- [ ] **EX-03-003: Active versus inactive cue treatment** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Active versus inactive cue treatment

  Acceptance: Current-time fill and cue boundaries are discernible

  Verification: cue geometry assertions and cropped browser screenshots

  Source files: src/video/dhago.css, src/ribbon/ribbon.ts, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-03-004: Shuttle thumb** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Shuttle thumb

  Acceptance: Visually distinctive yet remains clear as a seek handle

  Verification: cue geometry assertions and cropped browser screenshots

  Source files: src/video/dhago.css, src/ribbon/ribbon.ts, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-03-005: True progress fill** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: True progress fill

  Acceptance: Displayed fill follows currentTime including backwards

  Verification: cue geometry assertions and cropped browser screenshots

  Source files: src/video/dhago.css, src/ribbon/ribbon.ts, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-03-006: Cue numbering and labels** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Cue numbering and labels

  Acceptance: All labels are drawn from actual chapter tracks

  Verification: cue geometry assertions and cropped browser screenshots

  Source files: src/video/dhago.css, src/ribbon/ribbon.ts, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-03-007: Unequal durations** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Unequal durations

  Acceptance: Cue widths represent real intervals

  Verification: cue geometry assertions and cropped browser screenshots

  Source files: src/video/dhago.css, src/ribbon/ribbon.ts, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-03-008: No-chapter fallback** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: No-chapter fallback

  Acceptance: No invented chapter markers or false labels

  Verification: cue geometry assertions and cropped browser screenshots

  Source files: src/video/dhago.css, src/ribbon/ribbon.ts, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-03-009: Dense cue collections** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Dense cue collections

  Acceptance: 40 and 100 cues remain usable

  Verification: cue geometry assertions and cropped browser screenshots

  Source files: src/video/dhago.css, src/ribbon/ribbon.ts, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-03-010: International and long labels** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: International and long labels

  Acceptance: Content remains understandable without clipping interaction

  Verification: cue geometry assertions and cropped browser screenshots

  Source files: src/video/dhago.css, src/ribbon/ribbon.ts, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-03-011: Native keyboard and touch seeking** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Native keyboard and touch seeking

  Acceptance: Arrow/Home/End and pointer affect real currentTime

  Verification: cue geometry assertions and cropped browser screenshots

  Source files: src/video/dhago.css, src/ribbon/ribbon.ts, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-03-012: No invented media previews** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: No invented media previews

  Acceptance: Thumbnails only come from genuine source storyboard

  Verification: cue geometry assertions and cropped browser screenshots

  Source files: src/video/dhago.css, src/ribbon/ribbon.ts, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-03-013: Assistive slider semantics** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Assistive slider semantics

  Acceptance: Value, time and chapter available to screen reader

  Verification: cue geometry assertions and cropped browser screenshots

  Source files: src/video/dhago.css, src/ribbon/ribbon.ts, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

## Phase 4

### Living Loom state

- [ ] **EX-04-001: Single native media engine** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Single native media engine

  Acceptance: No independent playback clock or dummy media

  Verification: real-media event and duration checks

  Source files: src/video/living-loom.ts, tests/loom.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-04-002: Real time synchronization** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Real time synchronization

  Acceptance: Woven percentage matches currentTime/duration

  Verification: real-media event and duration checks

  Source files: src/video/living-loom.ts, tests/loom.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-04-003: Visible woven advancement** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Visible woven advancement

  Acceptance: Progress is perceptible without background synthetic animation

  Verification: real-media event and duration checks

  Source files: src/video/living-loom.ts, tests/loom.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-04-004: Pause state** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Pause state

  Acceptance: Progress freezes with genuine media pause

  Verification: real-media event and duration checks

  Source files: src/video/living-loom.ts, tests/loom.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-04-005: Backward seek** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Backward seek

  Acceptance: Weave state reverses with real currentTime

  Verification: real-media event and duration checks

  Source files: src/video/living-loom.ts, tests/loom.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-04-006: Rapid forward seek** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Rapid forward seek

  Acceptance: Latest actual position prevails

  Verification: real-media event and duration checks

  Source files: src/video/living-loom.ts, tests/loom.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-04-007: Completion and replay** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Completion and replay

  Acceptance: Ended state requires media ending and resets on replay

  Verification: real-media event and duration checks

  Source files: src/video/living-loom.ts, tests/loom.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-04-008: Waiting and stalled media** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Waiting and stalled media

  Acceptance: Decorative response is driven by corresponding media events

  Verification: real-media event and duration checks

  Source files: src/video/living-loom.ts, tests/loom.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-04-009: Unknown duration and failures** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Unknown duration and failures

  Acceptance: No false percent, completion or fabricated telemetry

  Verification: real-media event and duration checks

  Source files: src/video/living-loom.ts, tests/loom.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-04-010: Reduced motion** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Reduced motion

  Acceptance: Decorative movement is suppressed when requested

  Verification: real-media event and duration checks

  Source files: src/video/living-loom.ts, tests/loom.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-04-011: Seeking is not viewing history** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Seeking is not viewing history

  Acceptance: UI reports seek position without claiming it was watched

  Verification: real-media event and duration checks

  Source files: src/video/living-loom.ts, tests/loom.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-04-012: Performance at scale** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Performance at scale

  Acceptance: No per-frame cue DOM relayout or heavy renderer

  Verification: real-media event and duration checks

  Source files: src/video/living-loom.ts, tests/loom.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-04-013: Audio-only state** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Audio-only state

  Acceptance: Presentation survives audio media without dimensions

  Verification: real-media event and duration checks

  Source files: src/video/living-loom.ts, tests/loom.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

## Phase 5

### Shuttle interaction

- [ ] **EX-05-001: Native pointer accuracy** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Native pointer accuracy

  Acceptance: Dragged position corresponds to media currentTime

  Verification: mouse, coarse-pointer and keyboard browser interactions

  Source files: src/video/dhago.css, src/video/skin.html, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-05-002: Restrained thread tension** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Restrained thread tension

  Acceptance: Drag feedback disappears when interaction ends

  Verification: mouse, coarse-pointer and keyboard browser interactions

  Source files: src/video/dhago.css, src/video/skin.html, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-05-003: Hover, focus and active states** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Hover, focus and active states

  Acceptance: Shuttle state is visible across input modalities

  Verification: mouse, coarse-pointer and keyboard browser interactions

  Source files: src/video/dhago.css, src/video/skin.html, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-05-004: Timestamp preview** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Timestamp preview

  Acceptance: Seek preview shows real pointer time

  Verification: mouse, coarse-pointer and keyboard browser interactions

  Source files: src/video/dhago.css, src/video/skin.html, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-05-005: Active chapter during seek** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Active chapter during seek

  Acceptance: Preview label matches source cue

  Verification: mouse, coarse-pointer and keyboard browser interactions

  Source files: src/video/dhago.css, src/video/skin.html, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-05-006: Genuine thumbnail path** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Genuine thumbnail path

  Acceptance: Only supported Mux storyboard frames appear

  Verification: mouse, coarse-pointer and keyboard browser interactions

  Source files: src/video/dhago.css, src/video/skin.html, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-05-007: Text-only thumbnail fallback** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Text-only thumbnail fallback

  Acceptance: Missing image never hides accurate preview text

  Verification: mouse, coarse-pointer and keyboard browser interactions

  Source files: src/video/dhago.css, src/video/skin.html, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-05-008: Repeated and rapid seeks** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Repeated and rapid seeks

  Acceptance: No lag or stale target survives

  Verification: mouse, coarse-pointer and keyboard browser interactions

  Source files: src/video/dhago.css, src/video/skin.html, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-05-009: Start/end boundary behavior** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Start/end boundary behavior

  Acceptance: Thumb and preview stay within player bounds

  Verification: mouse, coarse-pointer and keyboard browser interactions

  Source files: src/video/dhago.css, src/video/skin.html, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-05-010: Comfortable touch geometry** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Comfortable touch geometry

  Acceptance: Seek surface is usable on phone-sized player

  Verification: mouse, coarse-pointer and keyboard browser interactions

  Source files: src/video/dhago.css, src/video/skin.html, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-05-011: Keyboard seek and focus** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Keyboard seek and focus

  Acceptance: Native slider remains reachable and operable

  Verification: mouse, coarse-pointer and keyboard browser interactions

  Source files: src/video/dhago.css, src/video/skin.html, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-05-012: No misleading inertia** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: No misleading inertia

  Acceptance: Animation is decorative and does not delay real seek

  Verification: mouse, coarse-pointer and keyboard browser interactions

  Source files: src/video/dhago.css, src/video/skin.html, tests/thread.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

## Phase 6

### Control polish

- [ ] **EX-06-001: Play and pause control** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Play and pause control

  Acceptance: State and 44px target remain obvious

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-002: Volume and mute controls** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Volume and mute controls

  Acceptance: Volume slider and button remain aligned

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-003: Tabular time typography** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Tabular time typography

  Acceptance: Clock does not jump on digit changes

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-004: Captions menu** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Captions menu

  Acceptance: Visible selected state and functional subtitles

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-005: Speed menu** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Speed menu

  Acceptance: Only supported actual rates are offered

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-006: Settings lifecycle** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Settings lifecycle

  Acceptance: Open, Escape and restored focus work

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-007: Fullscreen mode** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Fullscreen mode

  Acceptance: Controls remain usable and fit safe areas

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-008: Keyboard focus outlines** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Keyboard focus outlines

  Acceptance: Visible focus across three themes

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-009: Tooltip and seek preview** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Tooltip and seek preview

  Acceptance: No endpoint clipping or unreadable labels

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-010: Real buffering indicator** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Real buffering indicator

  Acceptance: Indicator tracks actual buffering state

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-011: Media error and recovery** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Media error and recovery

  Acceptance: Failure state is understandable and actionable

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-012: Finished and replay state** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Finished and replay state

  Acceptance: Replay transitions back into real media

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-013: No layout jumps** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: No layout jumps

  Acceptance: Interaction state does not shift control geometry

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-014: Icon centering, borders, radii** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Icon centering, borders, radii

  Acceptance: No mismatched controls in screenshot crops

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-06-015: Consistent control variants** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Consistent control variants

  Acceptance: Focused, active, disabled and open states match theme

  Verification: open-menu, focus, fullscreen and error-state screenshots

  Source files: src/video/dhago.css, src/video/skin.html, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

## Phase 7

### Accessible and responsive

- [ ] **EX-07-001: 240px width** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: 240px width

  Acceptance: No horizontal spill or inaccessible essentials

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-002: 320px width** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: 320px width

  Acceptance: Full controls and clock remain reachable

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-003: 375px width** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: 375px width

  Acceptance: Labels remain readable and tactile

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-004: 768px width** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: 768px width

  Acceptance: Ribbon and shelf remain proportional

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-005: 1280px width** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: 1280px width

  Acceptance: Layout does not become sparse or disjointed

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-006: Portrait and landscape** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Portrait and landscape

  Acceptance: Orientation change does not hide controls

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-007: Fullscreen** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Fullscreen

  Acceptance: Enter and exit preserve player controls

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-008: Keyboard-only access** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Keyboard-only access

  Acceptance: Complete watch flow works with no pointer

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-009: Focus visibility and order** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Focus visibility and order

  Acceptance: All actionable controls have logical tab order

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-010: Escape and focus restoration** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Escape and focus restoration

  Acceptance: Menus return focus to expected trigger

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-011: Touch target sizes** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Touch target sizes

  Acceptance: Required controls meet 44px target where practicable

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-012: Caption legibility** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Caption legibility

  Acceptance: Light and dark footage cannot wash out subtitle reading

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-013: Control contrast** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Control contrast

  Acceptance: Text and icons meet contrast in three surfaces

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-014: Reduced motion** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Reduced motion

  Acceptance: Stationary alternative is fully usable

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-015: Forced colors** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Forced colors

  Acceptance: Critical controls and seek state remain perceivable

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-016: Increased contrast** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Increased contrast

  Acceptance: Icons and boundaries survive alternate contrast

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-017: Text enlargement and zoom** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Text enlargement and zoom

  Acceptance: 200% text does not hide essential player controls

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-018: Axe and accessible names** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Axe and accessible names

  Acceptance: No critical or serious tested violations

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-07-019: Physical screen-reader session** — BLOCKED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Physical screen-reader session

  Acceptance: VoiceOver or NVDA identifies roles, values, menus

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: Requires physical/human review

- [ ] **EX-07-020: Real device and browser matrix** — BLOCKED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Real device and browser matrix

  Acceptance: Actual hardware checks distinguished from emulation

  Verification: Playwright layout matrix and human manual reviews

  Source files: src/video/dhago.css, tests/player.spec.ts, tests/manual-accessibility.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: Requires physical/human review

## Phase 8

### 8A Reusable skin

- [ ] **EX-08-001: Shared Video.js v10 implementation** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Shared Video.js v10 implementation

  Acceptance: One createDhagoPlayer with real v10 template

  Verification: integration fixtures and media cleanup inspection

  Source files: src/create-player.ts, INSTALL.md, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-002: No showcase dependency** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: No showcase dependency

  Acceptance: Library files do not import preview app

  Verification: integration fixtures and media cleanup inspection

  Source files: src/create-player.ts, INSTALL.md, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-003: Plain HTML Vite integration** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Plain HTML Vite integration

  Acceptance: Documented mount and playback work

  Verification: integration fixtures and media cleanup inspection

  Source files: src/create-player.ts, INSTALL.md, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-004: React mounting and disposal** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: React mounting and disposal

  Acceptance: Unmount cleans media and event registrations

  Verification: integration fixtures and media cleanup inspection

  Source files: src/create-player.ts, INSTALL.md, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-005: Theme customization** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Theme customization

  Acceptance: Three surfaces and host tokens apply coherently

  Verification: integration fixtures and media cleanup inspection

  Source files: src/create-player.ts, INSTALL.md, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-006: Configurable media source** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Configurable media source

  Acceptance: Host can supply real video/audio URL

  Verification: integration fixtures and media cleanup inspection

  Source files: src/create-player.ts, INSTALL.md, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-007: Optional captions and chapters** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Optional captions and chapters

  Acceptance: Tracks are parsed only when supplied

  Verification: integration fixtures and media cleanup inspection

  Source files: src/create-player.ts, INSTALL.md, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-008: Graceful no-chapter fallback** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Graceful no-chapter fallback

  Acceptance: No false chapter list created

  Verification: integration fixtures and media cleanup inspection

  Source files: src/create-player.ts, INSTALL.md, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-009: Media lifecycle cleanup** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Media lifecycle cleanup

  Acceptance: Observers and listeners do not survive destroyed mounts

  Verification: integration fixtures and media cleanup inspection

  Source files: src/create-player.ts, INSTALL.md, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-010: Duplicate initialization prevention** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Duplicate initialization prevention

  Acceptance: Multiple mounts have unique IDs

  Verification: integration fixtures and media cleanup inspection

  Source files: src/create-player.ts, INSTALL.md, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-011: Public customization contract** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Public customization contract

  Acceptance: API types and constraints are documented

  Verification: integration fixtures and media cleanup inspection

  Source files: src/create-player.ts, INSTALL.md, tests/player.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

### 8B Portable ribbon

- [ ] **EX-08-012: Host-neutral component** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Host-neutral component

  Acceptance: No Video.js import required

  Verification: independent host tests and cue-mutation probe

  Source files: src/ribbon/ribbon.ts, src/ribbon/ribbon.css, tests/ribbon.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-013: Time normalization** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Time normalization

  Acceptance: Progress clamps within finite duration

  Verification: independent host tests and cue-mutation probe

  Source files: src/ribbon/ribbon.ts, src/ribbon/ribbon.css, tests/ribbon.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-014: Unequal and dense cue widths** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Unequal and dense cue widths

  Acceptance: Cue geometry follows real timestamps

  Verification: independent host tests and cue-mutation probe

  Source files: src/ribbon/ribbon.ts, src/ribbon/ribbon.css, tests/ribbon.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-015: Supplied metadata lanes** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Supplied metadata lanes

  Acceptance: No unsupplied metadata rendered

  Verification: independent host tests and cue-mutation probe

  Source files: src/ribbon/ribbon.ts, src/ribbon/ribbon.css, tests/ribbon.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-016: Accurate seek callback** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Accurate seek callback

  Acceptance: Range emits numeric desired seek time

  Verification: independent host tests and cue-mutation probe

  Source files: src/ribbon/ribbon.ts, src/ribbon/ribbon.css, tests/ribbon.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-017: Lifecycle destroy** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Lifecycle destroy

  Acceptance: Listeners and visual nodes are removed

  Verification: independent host tests and cue-mutation probe

  Source files: src/ribbon/ribbon.ts, src/ribbon/ribbon.css, tests/ribbon.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-018: Static geometry between time ticks** — IMPLEMENTED

  Existing: Changed on candidate bd83e562e593

  Required: Static geometry between time ticks

  Acceptance: Cue placement is not rewritten each update

  Verification: independent host tests and cue-mutation probe

  Source files: src/ribbon/ribbon.ts, src/ribbon/ribbon.css, tests/ribbon.spec.ts

  Evidence: https://github.com/aprashnasuraj2-dev/videoj/commit/bd83e562e5938f354392414b37bc702bf55ea2c2

  Blocker: none recorded

- [ ] **EX-08-019: Preserve native integrated slider** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Preserve native integrated slider

  Acceptance: Separate ribbon never hijacks Video.js seek control

  Verification: independent host tests and cue-mutation probe

  Source files: src/ribbon/ribbon.ts, src/ribbon/ribbon.css, tests/ribbon.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

### 8C Edge States Lab

- [ ] **EX-08-020: Preserve existing scenarios** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Preserve existing scenarios

  Acceptance: 25 comparison fixtures retain their IDs

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-021: Professional studio hierarchy** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Professional studio hierarchy

  Acceptance: Setup controls and results visually distinct

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-022: Readable scenario explanations** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Readable scenario explanations

  Acceptance: Visitors understand what a fixture tests

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-023: Dense 40/100 cues** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Dense 40/100 cues

  Acceptance: Navigation and rendering stay stable

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-024: Malformed and missing cues** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Malformed and missing cues

  Acceptance: Broken data does not crash player

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-025: Missing media errors** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Missing media errors

  Acceptance: Failure is identified as an intentional test

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-026: Buffering and stalled behavior** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Buffering and stalled behavior

  Acceptance: Event source clearly distinguished

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-027: Seek/replay transitions** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Seek/replay transitions

  Acceptance: Position changes reported honestly

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-028: Unknown duration** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Unknown duration

  Acceptance: Percentages not fabricated

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-029: Audio-only mode** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Audio-only mode

  Acceptance: No assumed picture or dimensions

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-030: 240px host stress** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: 240px host stress

  Acceptance: Measured host width and controls remain usable

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-031: Reduced-motion and contrast stress** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Reduced-motion and contrast stress

  Acceptance: Unavailable conditions reported NOT RUN

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-032: Actionable failures** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Actionable failures

  Acceptance: Failures include observed cause, not fake pass

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-033: Isolate lab from primary demo** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Isolate lab from primary demo

  Acceptance: Test sources never replace homepage film

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-034: Accurate downloadable reports** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Accurate downloadable reports

  Acceptance: Reports preserve fixture and observation distinction

  Verification: fixtures and observed result reports

  Source files: apps/preview/src/stress.ts, apps/preview/src/stress-loader.ts, src/stress-lab/harness.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

### 8D Browser-side adapters

- [ ] **EX-08-035: Document adapter mount contract** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Document adapter mount contract

  Acceptance: External adapter must return root and destroy

  Verification: safe/invalid URL and local module tests

  Source files: apps/preview/src/stress-loader.ts, apps/preview/public/stress-adapter.example.mjs

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-036: Supported URL loading** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Supported URL loading

  Acceptance: HTTPS module is accepted with CORS

  Verification: safe/invalid URL and local module tests

  Source files: apps/preview/src/stress-loader.ts, apps/preview/public/stress-adapter.example.mjs

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-037: Local JavaScript loading** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Local JavaScript loading

  Acceptance: File selected stays on client unless user exports

  Verification: safe/invalid URL and local module tests

  Source files: apps/preview/src/stress-loader.ts, apps/preview/public/stress-adapter.example.mjs

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-038: Opaque-origin sandbox** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Opaque-origin sandbox

  Acceptance: Sandbox uses allow-scripts without allow-same-origin

  Verification: safe/invalid URL and local module tests

  Source files: apps/preview/src/stress-loader.ts, apps/preview/public/stress-adapter.example.mjs

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-039: Origin and scheme restrictions** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Origin and scheme restrictions

  Acceptance: Non-HTTPS and credential URLs fail safely

  Verification: safe/invalid URL and local module tests

  Source files: apps/preview/src/stress-loader.ts, apps/preview/public/stress-adapter.example.mjs

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-040: Adapter lifecycle** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Adapter lifecycle

  Acceptance: Pending work and frames cleaned on destroy

  Verification: safe/invalid URL and local module tests

  Source files: apps/preview/src/stress-loader.ts, apps/preview/public/stress-adapter.example.mjs

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-041: Malformed adapter handling** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Malformed adapter handling

  Acceptance: Missing mount and invalid exports report clear errors

  Verification: safe/invalid URL and local module tests

  Source files: apps/preview/src/stress-loader.ts, apps/preview/public/stress-adapter.example.mjs

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-042: No secret leaks** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: No secret leaks

  Acceptance: Reports never copy signed URLs or credentials

  Verification: safe/invalid URL and local module tests

  Source files: apps/preview/src/stress-loader.ts, apps/preview/public/stress-adapter.example.mjs

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-043: Separate fixture and observed metrics** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Separate fixture and observed metrics

  Acceptance: External results are not reclassified as native truths

  Verification: safe/invalid URL and local module tests

  Source files: apps/preview/src/stress-loader.ts, apps/preview/public/stress-adapter.example.mjs

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

### 8E Real playback telemetry

- [ ] **EX-08-044: Stream-history ledger** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Stream-history ledger

  Acceptance: Only real exposed media observations recorded

  Verification: browser media API observation

  Source files: src/video/stream-history.ts, apps/preview/src/tools.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-045: Buffered interval capture** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Buffered interval capture

  Acceptance: Use actual TimeRanges

  Verification: browser media API observation

  Source files: src/video/stream-history.ts, apps/preview/src/tools.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-046: Dropped frame counters** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Dropped frame counters

  Acceptance: Require supported browser counters

  Verification: browser media API observation

  Source files: src/video/stream-history.ts, apps/preview/src/tools.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-047: Decoded dimensions** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Decoded dimensions

  Acceptance: Read actual videoWidth and videoHeight

  Verification: browser media API observation

  Source files: src/video/stream-history.ts, apps/preview/src/tools.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-048: No inferred rendition claims** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: No inferred rendition claims

  Acceptance: Quality changes require sufficient evidence

  Verification: browser media API observation

  Source files: src/video/stream-history.ts, apps/preview/src/tools.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-049: Graceful unavailable metrics** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Graceful unavailable metrics

  Acceptance: Advanced charts show unsupported, not zero

  Verification: browser media API observation

  Source files: src/video/stream-history.ts, apps/preview/src/tools.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-050: Diagnostics independent of player** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Diagnostics independent of player

  Acceptance: Basic viewing does not rely on telemetry

  Verification: browser media API observation

  Source files: src/video/stream-history.ts, apps/preview/src/tools.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

### 8F Studio Journal

- [ ] **EX-08-051: Preserve original four notes** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Preserve original four notes

  Acceptance: Original editorial text and film remain

  Verification: same player source and actual scene-note seeking

  Source files: apps/preview/src/journal.ts, apps/preview/journal.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-052: Reuse same DHAGO player** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Reuse same DHAGO player

  Acceptance: Journal imports createDhagoPlayer

  Verification: same player source and actual scene-note seeking

  Source files: apps/preview/src/journal.ts, apps/preview/journal.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-053: Real scene-note seek** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Real scene-note seek

  Acceptance: Click changes actual media time

  Verification: same player source and actual scene-note seeking

  Source files: apps/preview/src/journal.ts, apps/preview/journal.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-054: Publication-grade presentation** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Publication-grade presentation

  Acceptance: Notes and player form a coherent article

  Verification: same player source and actual scene-note seeking

  Source files: apps/preview/src/journal.ts, apps/preview/journal.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-055: Mobile usability** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Mobile usability

  Acceptance: No horizontal overflow or hidden scene notes

  Verification: same player source and actual scene-note seeking

  Source files: apps/preview/src/journal.ts, apps/preview/journal.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-056: Credible separate site integration** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Credible separate site integration

  Acceptance: Not portrayed as independent external client

  Verification: same player source and actual scene-note seeking

  Source files: apps/preview/src/journal.ts, apps/preview/journal.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-057: No bonus overclaim** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: No bonus overclaim

  Acceptance: Judges determine live-site eligibility

  Verification: same player source and actual scene-note seeking

  Source files: apps/preview/src/journal.ts, apps/preview/journal.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

### 8G Engineering Tools

- [ ] **EX-08-058: Preserve useful instruments** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Preserve useful instruments

  Acceptance: Real seek, buffer, seekable and events available

  Verification: real output and failure-handling checks

  Source files: apps/preview/src/tools.ts, apps/preview/tools.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-059: Remove redundant tools** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Remove redundant tools

  Acceptance: Each visible utility answers distinct question

  Verification: real output and failure-handling checks

  Source files: apps/preview/src/tools.ts, apps/preview/tools.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-060: Visitor-friendly explanation** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Visitor-friendly explanation

  Acceptance: Copy describes outcomes without raw diagnostics

  Verification: real output and failure-handling checks

  Source files: apps/preview/src/tools.ts, apps/preview/tools.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-061: Keep tools off homepage** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Keep tools off homepage

  Acceptance: Primary player remains unencumbered

  Verification: real output and failure-handling checks

  Source files: apps/preview/src/tools.ts, apps/preview/tools.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-062: Meaningful error handling** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Meaningful error handling

  Acceptance: Unsupported API shows explanation

  Verification: real output and failure-handling checks

  Source files: apps/preview/src/tools.ts, apps/preview/tools.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-08-063: Avoid unnecessary network cost** — IMPLEMENTED

  Existing: Existing code/documentation present, current candidate unverified

  Required: Avoid unnecessary network cost

  Acceptance: No unrelated Worker calls added

  Verification: real output and failure-handling checks

  Source files: apps/preview/src/tools.ts, apps/preview/tools.html

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

## Phase 9

### 9A Primary experience

- [ ] **EX-09-001: Real player focal point** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Real player focal point

  Acceptance: Video dominates first screen

  Verification: public homepage and player-only crop

  Source files: apps/preview/index.html, apps/preview/src/demo.css

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-002: Lead with woven interaction** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Lead with woven interaction

  Acceptance: Shuttle/time concept is understandable quickly

  Verification: public homepage and player-only crop

  Source files: apps/preview/index.html, apps/preview/src/demo.css

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-003: Eliminate developer language** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Eliminate developer language

  Acceptance: No internal release terms on primary page

  Verification: public homepage and player-only crop

  Source files: apps/preview/index.html, apps/preview/src/demo.css

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-004: Remove repo links from hero** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Remove repo links from hero

  Acceptance: No GitHub links in visible homepage

  Verification: public homepage and player-only crop

  Source files: apps/preview/index.html, apps/preview/src/demo.css

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-005: Watch-first call to action** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Watch-first call to action

  Acceptance: Controls are obvious and immediately usable

  Verification: public homepage and player-only crop

  Source files: apps/preview/index.html, apps/preview/src/demo.css

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-006: Keep journal/ribbon/stress navigation** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Keep journal/ribbon/stress navigation

  Acceptance: Secondary pages remain discoverable

  Verification: public homepage and player-only crop

  Source files: apps/preview/index.html, apps/preview/src/demo.css

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-007: Editorial consistency** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Editorial consistency

  Acceptance: Public copy claims only verified behavior

  Verification: public homepage and player-only crop

  Source files: apps/preview/index.html, apps/preview/src/demo.css

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

### 9B Authentic evidence

- [ ] **EX-09-008: Desktop active playback capture** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Desktop active playback capture

  Acceptance: Real footage, controls and time visible

  Verification: screenshots and real interaction recording tied to final SHA

  Source files: scripts/capture-submission.mjs, tests/skin-visual.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-009: Player-only crop** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Player-only crop

  Acceptance: No decorative website chrome

  Verification: screenshots and real interaction recording tied to final SHA

  Source files: scripts/capture-submission.mjs, tests/skin-visual.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-010: Shuttle seek capture** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Shuttle seek capture

  Acceptance: Thumb corresponds to real seek time

  Verification: screenshots and real interaction recording tied to final SHA

  Source files: scripts/capture-submission.mjs, tests/skin-visual.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-011: Active chapter capture** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Active chapter capture

  Acceptance: Chapter title corresponds to cue

  Verification: screenshots and real interaction recording tied to final SHA

  Source files: scripts/capture-submission.mjs, tests/skin-visual.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-012: Three-theme captures** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Three-theme captures

  Acceptance: Same skin shown in all surfaces

  Verification: screenshots and real interaction recording tied to final SHA

  Source files: scripts/capture-submission.mjs, tests/skin-visual.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-013: 320/375 mobile captures** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: 320/375 mobile captures

  Acceptance: Actual browser geometry, no mockup

  Verification: screenshots and real interaction recording tied to final SHA

  Source files: scripts/capture-submission.mjs, tests/skin-visual.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-014: Settings and captions capture** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Settings and captions capture

  Acceptance: Real open menu and captions states

  Verification: screenshots and real interaction recording tied to final SHA

  Source files: scripts/capture-submission.mjs, tests/skin-visual.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-015: Studio Journal capture** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Studio Journal capture

  Acceptance: Published journal player visible

  Verification: screenshots and real interaction recording tied to final SHA

  Source files: scripts/capture-submission.mjs, tests/skin-visual.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-016: Stress Studio capture** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Stress Studio capture

  Acceptance: Fixtures and results shown truthfully

  Verification: screenshots and real interaction recording tied to final SHA

  Source files: scripts/capture-submission.mjs, tests/skin-visual.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-017: Authentic motion capture** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Authentic motion capture

  Acceptance: Real play, drag and pause without synthetic footage

  Verification: screenshots and real interaction recording tied to final SHA

  Source files: scripts/capture-submission.mjs, tests/skin-visual.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

### 9C Submission narrative

- [ ] **EX-09-018: Explain dhago meaning** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Explain dhago meaning

  Acceptance: Thread meaning stated without invented motif

  Verification: copy/source/playback comparison

  Source files: submission/final-submission.md, submission/description.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-019: Explain woven-time thesis** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Explain woven-time thesis

  Acceptance: Concept exists inside player controls

  Verification: copy/source/playback comparison

  Source files: submission/final-submission.md, submission/description.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-020: Explain real playback truth** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Explain real playback truth

  Acceptance: Progress follows media rather than a timer

  Verification: copy/source/playback comparison

  Source files: submission/final-submission.md, submission/description.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-021: Explain familiar accessibility** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Explain familiar accessibility

  Acceptance: Controls work without learning new gestures

  Verification: copy/source/playback comparison

  Source files: submission/final-submission.md, submission/description.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-022: Explain portable ribbon** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Explain portable ribbon

  Acceptance: Precise host-neutral contract described

  Verification: copy/source/playback comparison

  Source files: submission/final-submission.md, submission/description.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-023: Explain journal integration** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Explain journal integration

  Acceptance: Same mount correctly described

  Verification: copy/source/playback comparison

  Source files: submission/final-submission.md, submission/description.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-024: Explain Edge Studio** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Explain Edge Studio

  Acceptance: Fixtures distinguished from production incidents

  Verification: copy/source/playback comparison

  Source files: submission/final-submission.md, submission/description.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-025: Identify competition-specific work** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Identify competition-specific work

  Acceptance: Original film and component craft acknowledged

  Verification: copy/source/playback comparison

  Source files: submission/final-submission.md, submission/description.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-026: Separate independent verification** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Separate independent verification

  Acceptance: Claimed capabilities cite exact evidence

  Verification: copy/source/playback comparison

  Source files: submission/final-submission.md, submission/description.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-027: State untested areas** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: State untested areas

  Acceptance: Physical devices and screen readers disclosed

  Verification: copy/source/playback comparison

  Source files: submission/final-submission.md, submission/description.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

### 9D Technical evidence

- [ ] **EX-09-028: Concise architecture explanation** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Concise architecture explanation

  Acceptance: Source links to shared player and helpers

  Verification: exact build and documented test artifacts

  Source files: submission/manifest.json, INSTALL.md, docs/release-integrity.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-029: Vite and React integration proof** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Vite and React integration proof

  Acceptance: Real installation and cleanup documentation

  Verification: exact build and documented test artifacts

  Source files: submission/manifest.json, INSTALL.md, docs/release-integrity.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-030: Exact Video.js v10 version** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Exact Video.js v10 version

  Acceptance: Package and lockfile match

  Verification: exact build and documented test artifacts

  Source files: submission/manifest.json, INSTALL.md, docs/release-integrity.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-031: Accessibility summary** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Accessibility summary

  Acceptance: Automated tests separated from manual gaps

  Verification: exact build and documented test artifacts

  Source files: submission/manifest.json, INSTALL.md, docs/release-integrity.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-032: Browser compatibility summary** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Browser compatibility summary

  Acceptance: Engine versions and limits recorded

  Verification: exact build and documented test artifacts

  Source files: submission/manifest.json, INSTALL.md, docs/release-integrity.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-033: Performance and bundle evidence** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Performance and bundle evidence

  Acceptance: Actual byte totals, not perceived speed

  Verification: exact build and documented test artifacts

  Source files: submission/manifest.json, INSTALL.md, docs/release-integrity.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-034: Stress Studio capability summary** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Stress Studio capability summary

  Acceptance: True tested fixtures listed

  Verification: exact build and documented test artifacts

  Source files: submission/manifest.json, INSTALL.md, docs/release-integrity.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-035: Public release evidence** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Public release evidence

  Acceptance: Manifest SHA matches tested main

  Verification: exact build and documented test artifacts

  Source files: submission/manifest.json, INSTALL.md, docs/release-integrity.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-036: Apache licensing** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Apache licensing

  Acceptance: LICENSE and NOTICE present

  Verification: exact build and documented test artifacts

  Source files: submission/manifest.json, INSTALL.md, docs/release-integrity.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-037: Original film attribution** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Original film attribution

  Acceptance: Owner confirms original rights and file hash

  Verification: exact build and documented test artifacts

  Source files: submission/manifest.json, INSTALL.md, docs/release-integrity.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-038: Mux public playback evidence** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Mux public playback evidence

  Acceptance: Real decode and seek documented

  Verification: exact build and documented test artifacts

  Source files: submission/manifest.json, INSTALL.md, docs/release-integrity.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-039: Journal live-site evidence** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Journal live-site evidence

  Acceptance: Public scene-note seeking verified

  Verification: exact build and documented test artifacts

  Source files: submission/manifest.json, INSTALL.md, docs/release-integrity.md

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

### 9E Exact release

- [ ] **EX-09-040: Confirm Mux playback ID** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Confirm Mux playback ID

  Acceptance: Public ID maps to existing original asset

  Verification: exact-head CI, manifest parity and signed-out live playback

  Source files: .github/workflows/ci.yml, docs/release-integrity.md, tests/live.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-041: Test decoded Mux playback** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Test decoded Mux playback

  Acceptance: CurrentTime advances on published route

  Verification: exact-head CI, manifest parity and signed-out live playback

  Source files: .github/workflows/ci.yml, docs/release-integrity.md, tests/live.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-042: Preserve original media** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Preserve original media

  Acceptance: No duplicate upload or replacement

  Verification: exact-head CI, manifest parity and signed-out live playback

  Source files: .github/workflows/ci.yml, docs/release-integrity.md, tests/live.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-043: Protect dedicated hosting boundary** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Protect dedicated hosting boundary

  Acceptance: Touch only DHAGO R2 keys

  Verification: exact-head CI, manifest parity and signed-out live playback

  Source files: .github/workflows/ci.yml, docs/release-integrity.md, tests/live.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-044: Run candidate build and browser gates** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Run candidate build and browser gates

  Acceptance: Exact head passes appropriate checks

  Verification: exact-head CI, manifest parity and signed-out live playback

  Source files: .github/workflows/ci.yml, docs/release-integrity.md, tests/live.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-045: Merge only tested head** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Merge only tested head

  Acceptance: PR merge tied to green candidate SHA

  Verification: exact-head CI, manifest parity and signed-out live playback

  Source files: .github/workflows/ci.yml, docs/release-integrity.md, tests/live.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-046: Stage identical tested distribution** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Stage identical tested distribution

  Acceptance: No independent rebuilding after validation

  Verification: exact-head CI, manifest parity and signed-out live playback

  Source files: .github/workflows/ci.yml, docs/release-integrity.md, tests/live.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-047: Publish versioned assets safely** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Publish versioned assets safely

  Acceptance: Assets before entry HTML and manifest last

  Verification: exact-head CI, manifest parity and signed-out live playback

  Source files: .github/workflows/ci.yml, docs/release-integrity.md, tests/live.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-048: Verify public manifest SHA** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Verify public manifest SHA

  Acceptance: Current deployed source matches tested merge

  Verification: exact-head CI, manifest parity and signed-out live playback

  Source files: .github/workflows/ci.yml, docs/release-integrity.md, tests/live.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-049: Test live film and controls** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Test live film and controls

  Acceptance: Play, seek, captions and fullscreen actually work

  Verification: exact-head CI, manifest parity and signed-out live playback

  Source files: .github/workflows/ci.yml, docs/release-integrity.md, tests/live.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-050: Verify Journal and Stress Lab** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Verify Journal and Stress Lab

  Acceptance: Public pages functional after release

  Verification: exact-head CI, manifest parity and signed-out live playback

  Source files: .github/workflows/ci.yml, docs/release-integrity.md, tests/live.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-051: Record console and visual evidence** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Record console and visual evidence

  Acceptance: No unexplained severe errors

  Verification: exact-head CI, manifest parity and signed-out live playback

  Source files: .github/workflows/ci.yml, docs/release-integrity.md, tests/live.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

- [ ] **EX-09-052: Prepare owner-only handoff** — IN PROGRESS

  Existing: Existing code/documentation present, current candidate unverified

  Required: Prepare owner-only handoff

  Acceptance: Unverified gaps and receipt remain explicit

  Verification: exact-head CI, manifest parity and signed-out live playback

  Source files: .github/workflows/ci.yml, docs/release-integrity.md, tests/live.spec.ts

  Evidence: PENDING exact-head CI/browser evidence

  Blocker: none recorded

## Preserved historical 100-step program

Historical evidence: 86 DONE, 9 IN_PROGRESS, 5 NOT_STARTED, 0 BLOCKED. Original task texts and evidence remain intact in the first 100 entries of docs/steps.json. Those statuses are not candidate test results.

## Phase 10 — Owner only

No terms accepted. No Contra submission performed. No receipt recorded.
