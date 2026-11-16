# AFTERIMAGE · 100-task build checklist

Live execution record for the independent AFTERIMAGE Video.js v10 entry. Stable IDs come from the approved build prompt. Status values: `open`, `in progress`, `done`, `blocked`, `unverified`. `done` requires observable evidence.

| ID | Task and acceptance condition | Status | Evidence or blocker |
| --- | --- | --- | --- |
| 01 | Identify the current source and protected release targets. Record the branch, base SHA, active worktree, and protected paths. | done | Remote baseline inspected: `main` @ `fddbfdbc2ea9f9aa26bf3d72bac88b17a557b560`; root DHAGO, `detour/`, existing workflows/routes, and their release targets are protected. |
| 02 | Create or resume the isolated AFTERIMAGE branch and verify that existing unrelated changes are preserved. | done | No existing AFTERIMAGE branch was present. Isolated remote branch `afterimage` created from the verified `main` base; no DHAGO/DETOUR file is part of this baseline change. |
| 03 | Seed and commit the checklist and progress files. Record the first next action and make the branch visible on the remote when authorized. | done | This tracking-only baseline commit creates `afterimage/CHECKLIST.md` and `afterimage/PROGRESS.md` before player code, production media, or live-service changes; branch is remote-visible. |
| 04 | Recheck official requirements, cutoff and timezone, licensing, form availability, and additional-entry eligibility. | open | — |
| 05 | Map the rubric to visible player evidence. Give each scored category a concrete demonstration or test. | open | — |
| 06 | Review DHAGO’s and DETOUR’s build and release boundaries. Identify which proven conventions can be reused. | open | — |
| 07 | Confirm the Video.js version against the selected docs and installed package API. | open | — |
| 08 | Refresh the closest prior art. Document accessible sources, observation limits, and one design decision it changed. | open | — |
| 09 | Record the publish target and a fallback host. Establish how to roll back an isolated build. | open | — |
| 10 | Define the first-use flow and the opening matched-camera pair. Name the visible change that makes the pair worth showing. | open | — |
| 11 | Scaffold the separate package, reproducible install, and local preview. | open | — |
| 12 | Mount genuine Video.js v10 with an encoded local fixture. Verify the real clock advances. | open | — |
| 13 | Resolve the material palette and type against actual footage. Measure contrast in the intended layout. | open | — |
| 14 | Draw the reusable transport deck and icon treatment. Check the familiar actions with a first-time viewer or a fresh walkthrough. | open | — |
| 15 | Connect play and pause to real media state. Verify both in the browser. | open | — |
| 16 | Connect seek, duration, and time display. Exercise unknown duration and ended states. | open | — |
| 17 | Implement mute and volume on supported platforms. Check the platform-native path on relevant mobile devices. | open | — |
| 18 | Wire fullscreen and verify the wrapper or native fallback keeps standard playback usable. | open | — |
| 19 | Add captions and a usable caption control. Verify a real cue over the playing picture. | open | — |
| 20 | Build a recognizable initial poster state with Play and Try a comparison reachable on phone width. | open | — |
| 21 | Define the reference record, source generation, capture method, requested time, and best available frame time. | open | — |
| 22 | Produce a real numbered fixture with known timestamps for comparison accuracy. | open | — |
| 23 | Draw one bounded snapshot from an eligible playing source and confirm the rendered frame. | open | — |
| 24 | Verify paused capture with no forced transport action. Make the accuracy level visible. | open | — |
| 25 | Bound frame-callback waits and verify callback cancellation. | open | — |
| 26 | Handle missing metadata, seeking, waiting, ended, and invalid-frame boundaries. | open | — |
| 27 | Detect unsupported canvas or media capability and preserve ordinary playback. | open | — |
| 28 | Implement atomic re-pin and retain a valid prior pin when replacement fails. | open | — |
| 29 | Verify latest-request, same-URL reload, and source-change behavior under intentionally delayed results. | open | — |
| 30 | Prove teardown releases callbacks, observers, bitmap or object URL ownership, and input state. | open | — |
| 31 | Register pin and current video to one fitted content rectangle in the actual player. | open | — |
| 32 | Move the visible seam without rescaling or moving the underlying image. | open | — |
| 33 | Make the seam respond to drag, click or tap, arrows, Home, and End. | open | — |
| 34 | Add and verify single-tap Pinned, Split, and Now presets. | open | — |
| 35 | Show both timestamps and a signed delta from actual media state. Test reverse seek, hours, zero, and approximation. | open | — |
| 36 | Keep the fixed pin and moving playhead distinct on the real transport rail. | open | — |
| 37 | Show the interval accurately on both sides of the pin without intercepting normal seek. | open | — |
| 38 | Implement Compare, Close comparison, and Clear pin with sensible focus and preserved transport. | open | — |
| 39 | Connect one real authored pair to the same feature. Check the documented seek and preserved playback intent. | open | — |
| 40 | Decide whether Blend adds meaningful visual evidence. Record the decision or verify its opacity control. | open | — |
| 41 | Storyboard the dry, rising, draining, and marked states in the same fictional location. | open | — |
| 42 | Establish the stone gauge, inspection opening, and copper gate as legible landmarks. | open | — |
| 43 | Bench-test the render pipeline and record the time to render a representative shot. | open | — |
| 44 | Lock up to three camera positions and the repeated compositions. | open | — |
| 45 | Render and encode the 12–18 second opening proof first. Verify the reveal is clear by 00:15. | open | — |
| 46 | Play the opening proof in the skin and verify the viewer can create a meaningful manual pin. | open | — |
| 47 | Render a resolved 2:45–3:15 cut or record the chosen shorter cut and its measured runtime. | open | — |
| 48 | Grade bright and dark footage and add the original or redistributable sound treatment. | open | — |
| 49 | Encode the web delivery and independent fallback. Verify actual duration, sizes, poster, and web playback. | open | — |
| 50 | Record six observed frame pairs, chapter and caption files, source directions, versions, checksums, and rights. | open | — |
| 51 | Perform the core flow at 320px and 390px with comfortable primary touch targets. | open | — |
| 52 | Check 768px and 1280px or equivalent container widths, including visible menu placement. | open | — |
| 53 | Verify 240px fallback, mobile landscape, letterbox and portrait fixtures, and 200% zoom. | open | — |
| 54 | Prove full keyboard-only playback, comparison, Escape, and logical focus restoration. | open | — |
| 55 | Verify visible focus and contrast over bright footage, dark footage, and the poster. | open | — |
| 56 | Check arbitrary seam positions with a tap or click. Verify that vertical scrolling, touch cancellation, and handle limits work. | open | — |
| 57 | Verify accessible button names, range values, status announcements, and clear feedback from a failed pin. | open | — |
| 58 | Check captions remain readable during comparison, at full width, and in fullscreen where supported. | open | — |
| 59 | Verify reduced motion and forced colors. Document any platform-specific limitations. | open | — |
| 60 | Try a screen reader and physical phone when available. Record real hardware and emulation coverage separately. | open | — |
| 61 | Instrument app transport calls to prove pinning, dragging, presets, clear, and close preserve play state. | open | — |
| 62 | Check baseline and comparison playback for actual pause, seeking, waiting, and stall events. | open | — |
| 63 | Measure frame-to-timestamp tolerance on the numbered fixture and document sampling limitations. | open | — |
| 64 | Test image failures, inaccessible cross-origin sources, and expired provider URLs without affecting playback. | open | — |
| 65 | Test explicit sample seeking on a slow connection, including closing or switching sources while loading. | open | — |
| 66 | Verify one committed reference and bounded capture buffers over 20 repeated pins and teardown. | open | — |
| 67 | Measure initial payload, capture latency, extra reference bytes, and requests while dragging. | open | — |
| 68 | Check slow-network and constrained-device behavior and record test conditions. | open | — |
| 69 | Exercise two instances, rapid mounting and teardown, and preserved ordinary playback for unsupported sources. | open | — |
| 70 | Run available Chromium, Firefox, and WebKit coverage. Resolve the defects that break the primary flow. | open | — |
| 71 | Export the reusable skin and styles with documented lifecycle. Pack or build the actual consumer artifact. | open | — |
| 72 | Install in a clean external host with alternate video, poster, and captions. | open | — |
| 73 | Verify host-supplied theme, chapters, allowed provider, and normal comparison-disabled behavior. | open | — |
| 74 | Inspect the package contents for film or studio coupling, runtime secrets, and unneeded dependencies. | open | — |
| 75 | Publish the first anonymous playable demo on the isolated host and test it in a fresh browser. | open | — |
| 76 | Verify final public media delivery, MIME, ranges, caching, CORS, and the independent fallback path. | open | — |
| 77 | If feasible, provision and play the separate Mux asset. Verify the public ID and real browser playback requests. | open | — |
| 78 | If used, confirm pinning, captions, and public uptime policy on the actual Mux route. | open | — |
| 79 | If feasible, integrate alternate real content on a qualifying AafnaiPatro page. Test actual public playback and normal navigation. | open | — |
| 80 | Recheck existing release routes when shared hosting settings were involved. Record the isolation and rollback evidence. | open | — |
| 81 | Start on an anonymous page load and test recognition of Play and Try a comparison in five seconds. | open | — |
| 82 | Time the first thirty-second walkthrough. Fix the first meaningful discovery or usability problem. | open | — |
| 83 | Rehearse the official rubric with one demonstrated strength and one observed limitation per category. | open | — |
| 84 | Select a visibly compelling matched pair from the real final player. | open | — |
| 85 | Capture and verify the primary still at a size accepted by the current form. | open | — |
| 86 | Capture readable mobile and keyboard or caption evidence where useful. | open | — |
| 87 | Record the continuous proof of pin, playback advance, and seam change from the public build. | open | — |
| 88 | Edit and check the approximately 55-second reel. Verify it communicates with audio off. | open | — |
| 89 | Prepare the brief design description using only demonstrated behaviors and real creative details. | open | — |
| 90 | Verify optional fields and real URLs. Check that screenshots and reel match the candidate’s visual state. | open | — |
| 91 | Record the source SHA, lockfile, media versions and hashes, and deploy artifact identity. | open | — |
| 92 | Run and record the relevant checks against the exact candidate after its final changes. | open | — |
| 93 | Test the submitted or intended URL as a signed-out visitor. Verify default playback, example, manual pin, mobile controls, and fallback. | open | — |
| 94 | Record the known-good rollback and check that required public assets are reachable independently. | open | — |
| 95 | Finalize the README, license and notices, integration sample, and media provenance. | open | — |
| 96 | Assemble the form-ready URL, visual, description, support reel, and independently verified bonus fields. | open | — |
| 97 | Complete the authorized submission or hand off all fields and the specific remaining account action. | open | — |
| 98 | Record the verified submission status and the serving release identity. | open | — |
| 99 | Reconcile every checklist item with evidence or the actual blocker. Identify any support or verification still outstanding. | open | — |
| 100 | Commit and, when authorized, push the final progress and evidence update. Record the exact next action if work remains. | open | — |
