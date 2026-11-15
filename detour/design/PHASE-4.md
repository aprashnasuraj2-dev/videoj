# DETOUR visual system and acceptance sheet

Phase 4 establishes the player’s own visual signature. A conventional white playhead shows where playback is now. The raised safety-lime bracket shows the time kept, and the labeled Return button confirms the action. Opacity, shape, and vertical placement keep those meanings separate on bright footage, dark footage, and monochrome displays.

## Tokens and geometry

| Role | Token or geometry | Acceptance |
| --- | --- | --- |
| Picture and captions | Dark stage `#0E1213` and matching opaque caption backing | Real caption cues remain readable on pale and dark frames. No-poster loading shows the neutral stage. |
| Controls | Graphite shelf `#171C1D`, outlined speed panel `#212829`, edge `#667773` | Square joins, no texture, opaque background invariant under media changes. |
| Ink | Cool off-white `#F1F4EC`, secondary `#BFCDC6`, disabled `#A8B6AF` | Main time and primary controls lead. Stay and supporting state text remain legible. |
| Held point | Safety lime `#E5FC64`, ticket ink `#181E13` | The lime treatment is reserved for the kept point and its actionable Return button. Shape and copy carry the same distinction. |
| Rail | 4 px track, 2 px buffered layer, 8 × 12 px current thumb, 8 × 9 px held bracket | Buffered ranges remain discrete. The held stem tracks the same percentage as the time it represents. Its arms reverse near the right edge so the stem still lands on the real position. |
| Type | System sans stack at 14 px with 1.3 line height. System mono clock and Return time with tabular numerals. Status at 13 px. | Use short sentence-case labels and wrap longer copy. Use `bdi` for the held timestamp and a left-to-right time display in RTL. |
| Controls | 21 px transport icons, 44 px targets, 12 px desktop shelf inset, 4 px default spacing | Mute, captions, playback, replay and fullscreen use visible state changes tied to Video.js. Settings follows the essentials. |
| Focus | 2 px inset `#B9EAFF` on dark surfaces, dark outline on the enabled lime ticket | Always visible during keyboard interaction, including on the full rail. Use Highlight and ButtonText in forced colors. |

## Container rules

| Outer player width | Layout |
| --- | --- |
| 240–319 px | Transport above its own clock row. The signature actions occupy a full-width row and can wrap. Settings follows them. |
| 320–599 px | Transport and time share a row. The signature actions sit beside the Settings trigger below. |
| 600 px and wider | The signature slot sits inline after the required controls. The 236–276 px slot stays in place when Keep becomes Return and Stay. |
| 660 px and wider | Show the optional volume slider where the provider supports it. Mute remains exposed at every width. |

The browser grid checks 240, 320, 375, 600, 768 and 1100 px. Long Arabic QA copy and the `100:59:59` token wrap inside the 240 px shell without ellipsis. These strings check layout. The current interface copy is English.

## Motion and visible states

- Keep reveals the raised bracket with a 140 ms ease-out opacity and 2 px vertical settle. Positions are fixed after appearance. The playhead, clock, and surrounding controls have no transition. Reduced motion snaps the bracket into place.
- While real media metadata is loading, show **Loading video…** and an unavailable clock. With no poster, the video well stays neutral until a frame arrives. No timestamp is inferred.
- Delayed **Buffering…** is the Video.js waiting indicator. It sits below transport and leaves the video caption lane clear. A cleared stall removes it.
- In a pending return, the ticket says **Returning…** and uses the unavailable treatment. On a recoverable rejection, the original **Return to [time]** label reappears and a plain retry notice sits below the controls. A temporarily unseekable point keeps its label and explains why Return is unavailable.
- Real end of playback gives a replay glyph and **Video ended**. A native source error shows **This video could not load** and **Try again**. Retry calls native load. Neither surface occupies the caption lane.
- A filled CC badge denotes captions on. Fullscreen uses inward corners on exit. Settings and its selected speed have visible expanded and selected states. The main play, seek, mute, time and fullscreen controls remain exposed.

## Contrast and visual evidence

Measured sRGB ratios, rounded to two decimals. Ratios apply to the named solid CSS color pairs. The UI target is 4.5:1 for text and 3:1 for relevant component edges. The [forced-colors sample](evidence/phase4/forced-colors.jpg) shows the keyboard focus ring and separate hold marker with system colors.

| Pair | Ratio |
| --- | ---: |
| Main text on graphite shelf | 15.48:1 |
| Secondary text on graphite shelf | 10.46:1 |
| Return ink on lime | 14.94:1 |
| Disabled text on panel | 7.12:1 |
| Caption ink on dark stage backing | 16.95:1 |
| Rail and control edge against shelf | 3.65:1 |
| Control edge against settings panel | 3.18:1 |
| Buffered segment against shelf | 7.74:1 |
| Raised bracket against shelf | 15.11:1 |
| Focus on shelf / hover surface | 13.34:1 / 9.61:1 |

| Player-only board | Idle state | Kept-place state |
| --- | --- | --- |
| 900 px with dark fixture | [Idle capture](evidence/phase4/wide-dark-idle.jpg) | [Held capture](evidence/phase4/wide-dark-held.jpg) |
| 320 px with mixed fixture | [Idle capture](evidence/phase4/narrow-mixed-idle.jpg) | [Held capture](evidence/phase4/narrow-mixed-held.jpg) |
| 768 px with bright independent fixture | [Idle capture](evidence/phase4/wide-bright-idle.jpg) | [Held capture](evidence/phase4/wide-bright-held.jpg) |

All six crops are runtime frames of the built player and two repository-generated MP4 sources. Captions are present in both states. The held captures save 42.350s and seek back to the same paused frame shown in the idle capture. The board excludes the host page. These are visual QA samples. Human recognition remains [a separate first-use check](FIRST-USE.md).

Run `npm run build` and `DETOUR_PHASE4_CAPTURES=/path/to/crops npm test` from `detour/` to reproduce the boards. The [browser suite](../tests/browser.test.mjs) also covers endpoint alignment, focus, motion, loading, retry, and end of media. Headless Chromium results are recorded in the [evidence ledger](../submission-report/EVIDENCE.md).
