# DHAGO — Time, Woven.

**Video.js Skins Design Challenge · Submission draft · 14 November 2026**

> **Submission is not yet filed.** Public release and current Mux proof are separate gates; do not present them as completed until observed.

## Copy-ready title

**DHAGO — Time, Woven.**

## Short description (primary form field)

DHAGO is a custom Video.js v10 skin inspired by *dhago*—the Nepali word for thread. Real chapter cues become a tactile woven timeline, with a shuttle-like seek handle that follows real playback while familiar play, time, sound, captions, settings and fullscreen remain easy to use. Linen, Ink and Paper adapt the same portable interface from phone-sized players to widescreen viewing.

## Visual design / thinking (recommended four sentences)

What if video time were something you could weave? DHAGO turns chapter intervals into distinct pieces of cloth, joined by a visible thread that advances—and reverses—with the video itself. A textured shuttle, responsive woven ribbon, and precise, opaque control shelf carry the textile metaphor into actual controls without hiding captions, clock or keyboard focus. The original 64-second *Studies in Thread* motion study and specially illustrated woven-sunset poster make the player feel like one cohesive editorial object.

## Public URLs — release candidates, verify before pasting

- **Judge-facing playable URL, Mux proof route:** https://creative.aafnaipatro.com/?mux
- **Normal resilient playback:** https://creative.aafnaipatro.com/
- **Real-site showcase / Studio Journal:** https://creative.aafnaipatro.com/journal.html
- **Engineering Tools:** https://creative.aafnaipatro.com/tools.html
- **Edge States Lab:** https://creative.aafnaipatro.com/stress.html
- **Host-neutral Woven Time Ribbon:** https://creative.aafnaipatro.com/ribbon.html
- **Open-source repository:** https://github.com/aprashnasuraj2-dev/videoj
- **Skin installation:** https://github.com/aprashnasuraj2-dev/videoj/blob/main/INSTALL.md

**Important:** Until exact-head CI, publication and live checks pass, those URLs describe the intended release, not a confirmed deployed version. The `?mux` route is the correct judge URL **only** if its live Mux playback proof succeeds.

## Bonus field 1 — Mux (one possible point)

**Public playback ID from the first, source-preserved Studies in Thread asset:**

`Kc01fHxM9HqQpKzgf9qZRumwvL02wQZLZUwZHKtQ6F02mw`

The pre-replacement Git configuration associates the ID with the source SHA-256 `9dcc4672e3014ca947e310c1809c0cf6d40ffff186478f3e6a1e47f89b3688b3`; the Git MP4 is 2,563,521 bytes. A current branded-Chrome Mux playback test must confirm actual decoded playback, seeking and chapters before this can be claimed as a **verified bonus**. Publishing a playlist URL or embedding the ID without playback is **not enough**. Keep the asset publicly playable through judging.

## Bonus field 2 — real website (one possible point)

**https://creative.aafnaipatro.com/journal.html**

The independent Studio Journal is a live-site publishing context, not just a different player theme: it lets readers select four annotated scene notes and seek the *same* original film without autoplay. Judges determine whether this qualifies as a real-site bonus; describe it accurately as a genuine published Studio Journal, not an unrelated pre-existing client website. Verify signed-out accessibility and actual playback after deployment.

## The first 20 seconds judges should see

1. **Play:** the original 64-second film moves in the actual v10 player under a designed poster. Its opaque shelf is legible above light and dark footage.
2. **Seek:** drag the shuttle thumb from 00:00 to ~00:32. The player announces chapter **Where shadows gather**, while the genuinely playing media, fill and four-part visual language move together.
3. **Interact:** pause, mute, show captions, open and escape Settings, toggle fullscreen, switch Linen/Ink/Paper, and try Phone size.

The core skin—not the page surrounding it—is the artwork. Prefer a tight player crop with woven chapters and focused controls as the lead visual.

## Why this matters to Video.js founders

**A skin that can be adapted, not just admired.** DHAGO is implemented with Video.js v10 custom elements (`@videojs/html@10.4.0`), not a legacy v8 wrapper or a fake CSS player. The reusable `createDhagoPlayer()` mount keeps the skin separate from the promotional page. The **Woven Time Ribbon** is an extracted host-neutral component: cue intervals, media time and real telemetry in; seek callback and visual state out. It requires no import of the DHAGO showcase app, making its interaction pattern transferable to other Video.js projects.

**Truthful state machines, not decorative simulations.** The Living Loom maps actual `currentTime / duration` to four reversible stages, and handles pause, seek backwards, wait/stall, complete and replay without an independent animated timer. Stream-history marks only information exposed by the real media element and uses no fabricated ABR data. TextTrack-based chapters handle missing, delayed, overlapping or dense cues; absent chapters fall back to a usable linear seek surface. The Edge States Lab distinguishes actual media failures from controlled fixtures and marks unverified cases as manual.

**Accessibility as part of the visual design.** Essential controls use 44px targets, visible focus, an opaque shelf, named Settings and captions actions, native keyboard navigation, menu Escape, constrained captions, and prefers-reduced-motion/forced-colors treatments. Browser tests cover responsive player widths and representative edge states. Automated checks do **not** prove physical-device or VoiceOver/NVDA certification.

**Directly inspectable proof.** The separate Studio Journal shows portability, the Edge States Lab exposes failure behavior, and Engineering Tools show actual native time, ranges, events and derived DHAGO state. Source has an Apache-2.0 license and an `INSTALL.md` guide.

## Originality and attribution

The textile metaphor is inspired by the meaning of *dhago* and by Nepali weaving in general. DHAGO does not claim the woven vectors authenticate or reproduce any named traditional motif. The cover is original artwork, not a video frame. *Studies in Thread* is an original four-part procedural motion study with synthesized ambient audio, **no spoken narration**, and English **descriptive** captions. The Stress Lab also references clearly credited third-party fixtures that retain their respective upstream licenses.

## Suggested media attachment order (replace placeholders with actual final-release captures)

1. Final public **hero/player screenshot** at desktop size with poster and woven controls.
2. **Real scrub/seek screenshot** at chapter 03, with current chapter and progress visible.
3. **Mobile skin screenshot**, ideally 320px player and 375px viewport.
4. **15–30-second screen recording** of play, seek, captions, dark surface and responsive controls, recorded from the public verified build.
5. One annotated **Studio Journal / ribbon** still, followed by a compact Edge States Lab crop.

No test screenshot from an old documentary build should be submitted as if it depicted the restored film.

## Engineering evidence and known limits

- Fixed original film SHA-256 guard; no replaced media and no duplicate upload is required.
- Current candidate tests run clean install, reproducible source-derivatives, typecheck, build, Chromium interaction suite, Firefox and WebKit judge proof; current exact SHA and counts must be filled from the successful run.
- No false claims of universal HLS/codec support, live DVR, casting, network throttling or every assistive technology.
- CDN or Mux delivery minutes and accounts are billed under their own terms; neither does ordinary playback invoke the main AafnaiPatro application Worker.
- The Mux bonus and public-site bonus remain **pending until live proof**; the entry itself stays **unsubmitted until owner acceptance**.

## Final field checklist

- [ ] Exact final `main` candidate passes build, core browser suite and cross-engine checks
- [ ] Mux HLS playback ID has current browser decode/seek evidence matching original 01:04 film
- [ ] Immutable release manifest matches final main SHA; complete static distribution published
- [ ] Public `/?mux` shows real Mux playback, not an auto-switched local file
- [ ] Public `/journal.html` shows correct original film and scene notes
- [ ] Screenshots and interaction clip are recorded **after** the public release
- [ ] Apache-2.0, rights, eligibility and owner identity confirmed
- [ ] Owner accepts entry agreement and submits; record real receipt (currently **not obtained**)

**Deadline:** 2026-11-17 07:59 UTC = November 17, 1:44 p.m. Kathmandu (November 16, 11:59 p.m. PST). Confirm from the live official Contra challenge immediately before submission.
