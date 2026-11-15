# Phase 3 interaction contract

## Layout and caption boundary

See the [Phase 4 acceptance sheet](PHASE-4.md#container-rules) for the current fitted breakpoints.

| Area | Desktop, 720 px and wider | Compact, under 720 px |
| --- | --- | --- |
| Picture and captions | Native captions inside the picture. | Same media boundary. A two-line cue can appear while Keep or Return is visible. |
| Seek | Full-width, left-to-right VOD timeline. The current thumb and held bracket have separate lanes. | Same seek mapping and full row. |
| Main transport | Play/pause, elapsed and duration, mute, volume, available captions, fullscreen. | Keep play, time, mute and fullscreen exposed. The volume slider yields to mute below 370 px. Time gets its own line below 270 px. |
| Held place | Return and Stay on the right side after the required transport. | A separate row with the signature actions and the settings trigger side-by-side. |
| Settings | Optional playback speed after the signature actions. | Same keyboard semantics. The speed panel flows below the transport and cannot cover a caption. |

Visual order and Tab order use the same underlying sequence: Seek → Play → Mute → available Volume → available Captions → Fullscreen → Keep or Return/Stay → Settings. Clock text is readable but does not add a Tab stop. At minimum sizes buttons retain 44 px hit areas. The visible buffer indicator stays in the picture only while the player reports waiting.

## Safe origin and seek mapping

- The host must declare ordinary VOD. Native live media with infinite duration, MediaStreams, a provider explicitly reporting live, and undeclared sources are ineligible. A finite DVR window alone is insufficient. The streaming adapter will declare VOD only for confirmed on-demand assets.
- Keep reads the unrounded native current time after metadata and validates that it is finite, within duration, and in a reported seekable interval. Store the mark against the player instance, source attribute, resolved media URL and a load epoch. A reload clears it even if the URL is identical.
- If the range temporarily stops covering the saved timestamp, retain the mark and Stay, and disable Return. Restore Return if the range covers it again. If the source changes or fails, clear the old mark.
- Video.js owns the real slider. Home and End reach the VOD bounds. Buffered ranges are separate segments positioned with their own start and end fractions. Gaps remain unfilled. The bracket never intercepts input or becomes a Tab stop.

## Settlement and playback intent

| State or event | Effect |
| --- | --- |
| Return requested | Dispatch one Video.js seek unless already within 50 ms of the point. Lock duplicate presses. Match the attempt, source epoch and mark, and require both the result and native media time within 500 ms. |
| Reject or 8 s expiry | Preserve the point when the source is still usable. Show a visible retry notice and announce the transition once. Restore access to Return and Stay. |
| New primary pointer or seek key | The new seek wins. Detach the earlier attempt before the slider acts. A late result cannot clear the preserved mark. |
| Source reset, media error or player removal | Invalidate pending work and clear the mark. No stale completion can change a replacement session. |
| Paused or playing | A return never calls Play or Pause. The existing playback intent carries through where the provider supports it. |
| Ended | Keep the mark. A successful backward return leaves the video paused and clears its ended state. Play remains explicit. |

## Inputs, copy and accessibility

- Tab exposes each signature action. Enter and Space use native button activation. On Keep, focus moves to Return. On successful Return or Stay it returns to Keep when that action is available. A later user focus change stays respected. Arrow keys, Home/End, PageUp/PageDown and click/tap use the native Video.js seek component. A pointer cancellation does not initiate a DETOUR return. A tap or keyboard seek is available without dragging.
- Settings is a disclosure that responds to Enter/Space. Escape closes it and focuses the trigger, including in document fullscreen when supported. Selecting a speed also closes it and restores focus. Tabbing out closes the disclosure without moving the new focus.
- The bracket icon means a held point. The light rectangular thumb means current playback. Keep my place, Return to 00:42, Returning…, Stay here, and the retry message remain explicit. The settings icon has the accessible name “Playback settings”. Captions availability comes from the native track list.
- Meaningful transitions update the polite status region. Playback progression and buffer updates do not. Return times use MM:SS under an hour and H:MM:SS at an hour or more. The media clock and seek rail remain left-to-right inside an RTL host. Longer copy can wrap. The current interface copy is English, and the long Arabic strings used for layout validation are QA probes.

## Walkthrough and open checks

Use the playable prototype to keep the point at 42.350s, seek to 18s and 24s, return, clear a mark via Stay, load a new source and exit settings with the keyboard. Remove the caption track to check independent transport. Empty the media source to check the disabled time path. Use the browser suite to reproduce the measured paths and the injected error/seek-range cases. Physical-device, assistive-technology and uncoached-viewer results remain distinct from these local checks.
