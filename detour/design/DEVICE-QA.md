# DETOUR Phase 7 — physical-device and assistive-technology acceptance protocol

This is a **test script, not test evidence**. Leave checklist 062, 064 and 070 unchecked until real participants complete the relevant sessions. Never count a Playwright device descriptor as an iPhone, Android phone or screen reader.

## Session metadata (record for each run)

- Test operator, time zone, start/end timestamp, source commit, deployed preview URL, media file hash/version.
- **Device:** model, physical/emulated, operating system/build, browser + version, screen resolution, DPR, viewport orientation, zoom/text size, input type.
- **Assistive technology:** name and version, speech output recording/notes, relevant verbosity settings.
- Network type/latency and any reproduction video, screenshot or console capture.
- For each case: observed start time, actions, actual result, expected result, pass/fail/blocked, severity, evidence file reference.

## 062 — real touch and pointer (run on both physical iPhone Safari and Android Chrome)

1. Open the independently hosted MP4/VTT, pause at **42.35 s**, tap **Keep my place**; verify no seek, no pause-mode change and the bracket appears at 42.35.
2. Tap the linear seek bar near **18 s**, then drag it near **24 s**. Confirm native clock changes twice and held bracket remains fixed. Take an active-state crop.
3. Tap **Return to 00:42** and verify one seek arrives within **±0.5 s** with the previous play/pause intent intact. Repeat once while playing.
4. Hold again, seek to 18 s, then tap **Stay here**. Verify the time remains ~18 s and mark disappears.
5. Start a seek drag, interrupt with pointer cancellation (lift or leave the control, navigate browser UI as appropriate). Verify outside-page vertical scrolling works immediately and another tap seek works. Record actual mechanism used—synthetic `pointercancel` does not count as physical interruption.
6. Measure DOM rectangles (or calibrated screenshots) of Keep, Return and Stay. Each interactive target must be at least **44×44 CSS px**. Verify no hidden transport item or overlapping hit area in portrait and landscape.
7. Toggle mute, captions and fullscreen if the device/provider actually supports it; distinguish **unsupported volume slider** from a **broken mute button**. Include source reload/reset and one network-error recovery.

**Stop condition:** any repeated unresponsive tap, stuck scroll, accidental play, hidden required control or mark consumed after a failed Return is a blocking issue.

## 064 — actual screen-reader sessions

Use at minimum **NVDA on Windows with Firefox or Chrome** and **VoiceOver with Safari**. The iPhone VoiceOver path is preferred if possible; macOS VoiceOver is separately labeled.

1. With screen obscured or without visual reliance, navigate by Tab/Shift+Tab or screen-reader gestures to Play, Seek, Keep, Return, Stay, Mute, Captions, Fullscreen and Playback settings.
2. Read the seek slider's role, label, min/max/current value and keyboard gesture model. Operate Home/End, arrows and the alternative tap path where appropriate.
3. Hold at 42.35 s. Record **exact spoken text** and count of announcements for mark creation, successful return, Stay dismissal, rejected return and source reset.
4. Verify **no per-second announcement chatter** during playback; new meaningful announcements are not suppressed. Count duplicates.
5. Open Settings, change rate, close with Escape or device equivalent, and confirm focus returns to Settings. After Return and Stay, confirm focus is on a sensible visible control.
6. Repeat with captions enabled, high text scaling and forced-colors/high-contrast settings where supported.

**Pass:** unaided completion of hold → two seeks → return; correct role/value text; concise once-only state announcements; no focus trap. An accessibility-tree snapshot or DOM label inspection alone is **not** an AT session.

## 070 — clean browser/device gate

- Chrome/Chromium desktop, Firefox desktop, desktop Safari/WebKit, physical iOS Safari and physical Android Chrome.
- Repeat first-use Hold → two seeks → Return, Stay, play/pause, time/seek, mute, captions, fullscreen capability, keyboard/touch appropriate to platform, source swap, failed Return and recoverable retry.
- Use a new anonymous session with caches cleared as appropriate. Capture exact deployed source SHA and media version.
- Assign severity: **P0** unusable playback or lost mark with misleading success; **P1** required action inaccessible or stale source mis-seek; **P2** recoverable controls/visual defect; **P3** polish.
- Any missing device/AT coverage remains **unverified**, not a passing test. Re-run every P0/P1 on the corrected source and record new browser/device evidence.

## Owner handoff format

```text
Source SHA:
Deployed URL:
Media filename + hash:
Device / OS / browser / AT:
Test 062 case IDs:
Test 064 case IDs:
Test 070 case IDs:
Actual playback/seek arrivals:
Observed focus and spoken announcements:
Screenshots / recordings:
P0/P1 open issues:
Operator/date:
```

The contest entrant must separately review eligibility, accept terms and submit the entry. This QA protocol does not authorize those actions.
