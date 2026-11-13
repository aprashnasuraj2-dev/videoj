# Direct device and assistive-technology check

Automated semantic, contrast and keyboard checks do not establish VoiceOver or NVDA usability. Physical-device checks below remain pending until a person actually runs them.

Open https://creative.aafnaipatro.com/ on a physical phone. Without reading the hints, find Play, seek to the third chapter, mute, enable captions, open Settings and enter/exit fullscreen. A roughly five-second discovery target per action is a design heuristic. Record hesitation, device, browser and date; do not turn an emulated viewport into a physical-phone result.

With VoiceOver on Safari or NVDA on Chrome/Firefox:

1. Reach the player and hear its media landmark. Inspect the Seek slider's current time, then move it with the screen reader's slider commands.
2. Activate Play/Pause and Mute. Confirm names reflect actual state and the elapsed clock does not announce every second.
3. Enable captions. Open Settings, enter Speed, select 1.5× and return with Escape. Focus should return to Settings; there must be no keyboard trap.
4. Find the third scene using the chapter buttons. Seek should receive keyboard focus and the chapter name should read “Where shadows gather”.
5. At 200% browser zoom, reach every control without horizontal page scrolling. Check long names without reducing OS text size.
6. Disconnect the network before loading a fresh `?local` page. Restore it, choose “Try loading again”, then Play. Error dismissal alone is not recovery.

Known boundary: browser-controlled native iOS fullscreen may present different controls; a Chromium fullscreen pass does not cover this. The custom gold journal accent is measured against the Ink shelf; arbitrary host accent colors are not automatically accessible.
