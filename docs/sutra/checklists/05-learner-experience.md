# 05. Coherent learner experience

[Checklist index](../CHECKLIST.md) | [Progress register](../PROGRESS.md) | [Continuation procedure](../CONTINUE.md)

Original planning window: **11-15 Dec 2026**. This is a target window, not proof of work.

A complete evidence-to-video workflow on desktop and narrow screens.

States: `[ ]` pending, `[~]` active, `[!]` blocked, `[x]` verified complete, `[-]` intentionally omitted with a recorded rationale. Task IDs never change.

Check a box only after its result is observed. Add revision-linked evidence to `../progress.json` and append the session record; documentation written about a feature is not implementation evidence.

## Phase 041 - Design the full learner workspace

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 05,20,40. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Create one composition with video, transcript, source evidence and review card. Use a short guided starting task rather than an empty chatbot panel.
- **Phase exit:** A first-time viewer sees the question, supporting cue and next action without opening a developer trace.

- [ ] `SUTRA-P041-01` Design the initial task prompt so users avoid an empty chat dead end
- [ ] `SUTRA-P041-02` Place video, transcript, evidence and review card in one coherent workspace
- [ ] `SUTRA-P041-03` Make the active lesson and selected source version visible
- [ ] `SUTRA-P041-04` Define loading, empty, denied, error and completed screen states
- [ ] `SUTRA-P041-05` Keep the source comparison and next human action discoverable
- [ ] `SUTRA-P041-06` Place technical execution details in an optional inspector
- [ ] `SUTRA-P041-07` Specify desktop, narrow screen and zoom behavior before styling
- [ ] `SUTRA-P041-08` Walk through the complete question-to-card flow with a fresh viewer
- [ ] `SUTRA-P041-09` Produce and review the phase artifact: Responsive screen design and interaction map.
- [ ] `SUTRA-P041-10` Close phase 041 only after its applicable tasks have evidence and its exit condition is observed: A first-time viewer sees the question, supporting cue and next action without opening a developer trace.

## Phase 042 - Integrate the DHAGO reusable player

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 12,19,41. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Mount createDhagoPlayer from src/create-player.ts with host-supplied lesson and tracks. Use a thin adapter to observe the actual native media element. Preserve the v10 custom-element runtime.
- **Phase exit:** Play, pause, seek, volume, captions and fullscreen work; no DETOUR code or existing demo media is imported.

- [x] `SUTRA-P042-01` Import only the DHAGO reusable create-player surface through the adapter
- [x] `SUTRA-P042-02` Use host-supplied media, poster, captions and chapter tracks
- [x] `SUTRA-P042-03` Preserve the installed v10 custom-element playback runtime
- [x] `SUTRA-P042-04` Observe actual native media state rather than synthesizing progress
- [ ] `SUTRA-P042-05` Verify ordinary play, pause, volume, seek and fullscreen behavior
- [ ] `SUTRA-P042-06` Handle source changes, missing decode support and media load errors
- [x] `SUTRA-P042-07` Avoid coupling the player to agents, model state or DETOUR internals
- [ ] `SUTRA-P042-08` Check host styles do not break player focus and narrow-screen controls
- [ ] `SUTRA-P042-09` Produce and review the phase artifact: SUTRA player adapter and ordinary controls.
- [ ] `SUTRA-P042-10` Close phase 042 only after its applicable tasks have evidence and its exit condition is observed: Play, pause, seek, volume, captions and fullscreen work; no DETOUR code or existing demo media is imported.

## Phase 043 - Connect evidence cards to real playback

- **Baseline effort:** 2 person-hours; **owner:** E.
- **Original phase dependencies:** 16-17,27,42. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Render cue references as time ranges. On explicit viewer action, seek to a validated timestamp and confirm actual media time; handle unseekable sources and delayed metadata.
- **Phase exit:** A seek reaches within one second of the valid target on supported test media; unavailable seeking is described accurately.

- [x] `SUTRA-P043-01` Validate cue ranges against actual loaded media duration
- [x] `SUTRA-P043-02` Seek only after explicit viewer intent and required metadata availability
- [x] `SUTRA-P043-03` Observe actual currentTime after seeking rather than an optimistic timer
- [ ] `SUTRA-P043-04` Handle missing seekable ranges, live sources and nonseekable media
- [x] `SUTRA-P043-05` Preserve correct source identity across media replacement
- [x] `SUTRA-P043-06` Show the exact source cue and time range on evidence cards
- [ ] `SUTRA-P043-07` Provide keyboard activation and clear unavailable-seek feedback
- [x] `SUTRA-P043-08` Measure supported seeking against the one-second target tolerance
- [ ] `SUTRA-P043-09` Produce and review the phase artifact: Evidence-to-seek interaction and actual-state feedback.
- [ ] `SUTRA-P043-10` Close phase 043 only after its applicable tasks have evidence and its exit condition is observed: A seek reaches within one second of the valid target on supported test media; unavailable seeking is described accurately.

## Phase 044 - Add an inspectable transcript experience

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 16,41-43. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Provide search, active-cue highlight and keyboard navigation without stealing focus during playback. Link each result to source version and video interval.
- **Phase exit:** Search and cue navigation work with keyboard only; absent captions or transcript produce explicit empty states.

- [ ] `SUTRA-P044-01` Render transcript text and cue controls with stable accessible names
- [ ] `SUTRA-P044-02` Implement bounded query filtering and clear no-results behavior
- [ ] `SUTRA-P044-03` Highlight the actual active cue without stealing keyboard focus
- [ ] `SUTRA-P044-04` Support keyboard movement and activation of transcript results
- [ ] `SUTRA-P044-05` Link result metadata to the media and transcript versions
- [ ] `SUTRA-P044-06` Preserve scroll intent rather than forcing disruptive auto-follow
- [ ] `SUTRA-P044-07` Handle absent captions, missing transcript and very long cue text
- [ ] `SUTRA-P044-08` Distinguish translated text from original source quotations
- [ ] `SUTRA-P044-09` Produce and review the phase artifact: Accessible transcript panel.
- [ ] `SUTRA-P044-10` Close phase 044 only after its applicable tasks have evidence and its exit condition is observed: Search and cue navigation work with keyboard only; absent captions or transcript produce explicit empty states.

## Phase 045 - Add the peer comparison view

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 35,41. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Display the video claim and written checklist side by side with source dates and scope. Expose agreement, conflict and missing information rather than blending them into one confident answer.
- **Phase exit:** A conflict fixture remains visibly unresolved until reviewed; no inferred agreement is labeled verified.

- [ ] `SUTRA-P045-01` Render video evidence and written guide as separate source cards
- [ ] `SUTRA-P045-02` Display source date, scope and provenance for each claim
- [ ] `SUTRA-P045-03` Represent agreement only when supported by the actual excerpts
- [ ] `SUTRA-P045-04` Expose conflicts without blending them into a false consensus
- [ ] `SUTRA-P045-05` Show missing information and unsupported comparisons explicitly
- [ ] `SUTRA-P045-06` Retain links to original cues and written source excerpts
- [ ] `SUTRA-P045-07` Allow peer denial while preserving local evidence
- [ ] `SUTRA-P045-08` Test the deliberately conflicting fixture in the visible UI
- [ ] `SUTRA-P045-09` Produce and review the phase artifact: Comparison cards with source links.
- [ ] `SUTRA-P045-10` Close phase 045 only after its applicable tasks have evidence and its exit condition is observed: A conflict fixture remains visibly unresolved until reviewed; no inferred agreement is labeled verified.

## Phase 046 - Build the review-card action flow

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 29,43-45. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Let the viewer review a short card with cue and source references before local save or download. Show where it is stored and allow deletion.
- **Phase exit:** Saved data matches the approved preview; reload and delete work, and storage failure remains visible.

- [ ] `SUTRA-P046-01` Preview the learning card before any local persistence or download
- [ ] `SUTRA-P046-02` Include exact cue IDs, source versions and receipt references
- [ ] `SUTRA-P046-03` Explain where cards are stored and how users can delete them
- [ ] `SUTRA-P046-04` Bind saved values to the confirmed preview without hidden mutation
- [ ] `SUTRA-P046-05` Handle storage quota, unavailable storage and export failures
- [ ] `SUTRA-P046-06` Verify reload restores supported cards and flags stale data
- [ ] `SUTRA-P046-07` Verify deletion removes associated local data
- [ ] `SUTRA-P046-08` Keep card export independent of private prompts and router credentials
- [ ] `SUTRA-P046-09` Produce and review the phase artifact: Review-card preview, local persistence and receipt export.
- [ ] `SUTRA-P046-10` Close phase 046 only after its applicable tasks have evidence and its exit condition is observed: Saved data matches the approved preview; reload and delete work, and storage failure remains visible.

## Phase 047 - Expose a safe run-provenance inspector

- **Baseline effort:** 1.5 person-hours; **owner:** E.
- **Original phase dependencies:** 26,35-38,41. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Add an optional run-provenance panel showing the exact specification commit, pinned runtime revision, active graph SHA-256, model ID, router, contacted origins, call counts, consent decisions and errors. Keep raw prompts, private context and credentials out of the panel/export.
- **Phase exit:** The panel lets a reviewer identify which spec/runtime/graph/router/model produced a run; a synthetic credential canary is absent from both UI and exported provenance and panel failure cannot break playback.

- [ ] `SUTRA-P047-01` Show exact Open Agentic Web spec commit and pinned nsDeploy/runtime revision
- [ ] `SUTRA-P047-02` Recompute/display the active graph SHA-256 and list contacted origins with approved/denied contacts
- [ ] `SUTRA-P047-03` Show model ID, router identity, agent/tool names, call counts and bounded timing/budget information
- [ ] `SUTRA-P047-04` Represent partial failures, consent decisions and unknown action outcomes accurately
- [ ] `SUTRA-P047-05` Redact credentials, private fields and unnecessary raw prompt/model text
- [ ] `SUTRA-P047-06` Bound provenance memory and support safe user-initiated export
- [ ] `SUTRA-P047-07` Test credential/private canaries in inspector UI and downloaded files
- [ ] `SUTRA-P047-08` Ensure optional provenance-panel failures never break media playback or the local evidence flow
- [ ] `SUTRA-P047-09` Produce and review the phase artifact: Redacted run-provenance panel and export format.
- [ ] `SUTRA-P047-10` Close phase 047 only after its applicable tasks have evidence and its exit condition is observed: Spec/runtime/graph/model/router/origins are inspectable without secret exposure.


## Phase 048 - Make the core flow bilingual — deferred

- **Baseline effort:** 2 person-hours; **owner:** E+P.
- **Original phase dependencies:** 41-47. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work).
- **Scope decision:** Nepali localization is intentionally omitted from the competition release under SUTRA-DECISION-0010. English remains complete; source quotations keep their original language. This phase does not block P049/P050 or release.
- **Practical effect:** The competition build is English-first. Localization can be resumed after the evidence/runtime/media/BYOK/public-proof gates are stable.

- [-] `SUTRA-P048-01` Inventory core learner labels and error messages requiring translation — omitted from competition scope
- [-] `SUTRA-P048-02` Keep English complete for judges and external builders — covered as the release baseline rather than a translation task
- [-] `SUTRA-P048-03` Have a human review Nepali technical terms and ambiguity — deferred
- [-] `SUTRA-P048-04` Retain original source excerpts when translations are shown — no translated UI shipped
- [-] `SUTRA-P048-05` Preserve selected lesson, cue and run state during language switching — no language switch shipped
- [-] `SUTRA-P048-06` Format timestamps, units and dates consistently across languages — multilingual formatting deferred
- [-] `SUTRA-P048-07` Check fallback text and missing localization keys — localization system deferred
- [-] `SUTRA-P048-08` Cut optional localization polish before compromising core runtime correctness — decision exercised by SUTRA-DECISION-0010
- [-] `SUTRA-P048-09` Produce and review the phase artifact: Localized core screens and reviewed terminology list — omitted
- [-] `SUTRA-P048-10` Phase exit omitted for the competition release; report phase 048 as complete with omissions, not implemented.


## Phase 049 - Complete accessibility and mobile checks

- **Baseline effort:** 2 person-hours; **owner:** E+P.
- **Original phase dependencies:** 42-48. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work); original phase order is not a blanket prohibition on independent engineering.
- **Intent:** Check tab order, visible focus, names, contrast, reduced motion, zoom, live announcements and 360px layouts. Test real touch interaction on available hardware.
- **Phase exit:** Core task is keyboard usable; no critical automated accessibility finding remains; physical and emulated tests are labeled separately.

- [ ] `SUTRA-P049-01` Check meaningful labels, visible focus and keyboard order for the core task
- [ ] `SUTRA-P049-02` Verify dynamic announcements are useful and not repeatedly disruptive
- [ ] `SUTRA-P049-03` Test contrast, 200-percent zoom, reduced motion and readable captions
- [ ] `SUTRA-P049-04` Verify 360px layouts without horizontal clipping of core controls
- [ ] `SUTRA-P049-05` Test touch targets and modal focus restoration
- [ ] `SUTRA-P049-06` Run an automated accessibility audit and review its actual findings
- [ ] `SUTRA-P049-07` Exercise available physical touch hardware separately from emulation
- [ ] `SUTRA-P049-08` Record device/browser versions, unresolved barriers and their user impact
- [ ] `SUTRA-P049-09` Produce and review the phase artifact: Accessibility findings and corrected high-impact issues.
- [ ] `SUTRA-P049-10` Close phase 049 only after its applicable tasks have evidence and its exit condition is observed: Core task is keyboard usable; no critical automated accessibility finding remains; physical and emulated tests are labeled separately.

## Phase 050 - Close the complete-product milestone

- **Baseline effort:** 1 person-hours; **owner:** E+P.
- **Original phase dependencies:** 41-49. See [dependency policy](../CONTINUE.md#dependencies-and-independent-work). P048 is an explicit optional omission under SUTRA-DECISION-0010 and does not block this milestone.
- **Intent:** Run the entire hero journey without a developer console. Review loading, empty, denied, source-conflict and success states for clarity and consistency.
- **Phase exit:** A new viewer can finish the task using the visible UI; the local learning flow survives peer denial.

- [ ] `SUTRA-P050-01` Complete the hero journey without console commands or hidden setup
- [ ] `SUTRA-P050-02` Check first-load instructions and default funded inference discovery
- [ ] `SUTRA-P050-03` Inspect all loading, empty, denied, conflict and success transitions
- [ ] `SUTRA-P050-04` Confirm evidence selection and saved-card feedback are consistent
- [ ] `SUTRA-P050-05` Verify peer refusal leaves local lesson/transcript functionality useful
- [ ] `SUTRA-P050-06` Review mobile core task and keyboard-only completion
- [ ] `SUTRA-P050-07` Prioritize usability blockers over additional features
- [ ] `SUTRA-P050-08` Record the complete-product gate against the current build revision
- [ ] `SUTRA-P050-09` Produce and review the phase artifact: Milestone C walkthrough and remaining issue priorities.
- [ ] `SUTRA-P050-10` Close phase 050 only after its applicable tasks have evidence and its exit condition is observed: A new viewer can finish the task using the visible UI; the local learning flow survives peer denial.
