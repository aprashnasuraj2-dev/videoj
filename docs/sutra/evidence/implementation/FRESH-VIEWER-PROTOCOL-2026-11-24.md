# SUTRA fresh-viewer acceptance protocol — 2026-11-24

**Status:** prepared only. No participant/user result is claimed by this file.

Use this protocol for P041-08 and the human part of the complete-product milestone. The facilitator should not explain the interface unless the participant is genuinely stuck; the goal is to observe whether the visible product communicates its own task.

## Preconditions

- Use a tested development/staging revision and record the immutable SHA.
- Do not enable paid inference or public peer contact merely for this test unless separately authorized.
- Use the local/synthetic path where external services are not approved.
- Start with a clean browser profile or clear only SUTRA local review data.
- Record viewport/device/browser and whether assistive technology is used.
- Obtain the participant's consent before recording notes, screen capture or quotes.

## Primary task

Tell the viewer only:

> “Use this page to find the relevant moment, understand what evidence supports it, and keep a reviewable reference. Stop if the page asks you to contact an external service and you do not want to.”

Do not tell them which buttons to press.

## Observe without leading

Record whether the viewer can:

1. explain in their own words that the current material is synthetic and not factual proof;
2. identify the source/cue area without opening the execution inspector;
3. run the local consistency check and distinguish “matched” from “factually verified”;
4. load the timing fixture and reach the evidence cue;
5. understand the missing-guide or conflict state rather than assuming consensus;
6. preview a review card before saving;
7. find where the saved card lives and delete it;
8. encounter an external-contact prompt and understand that denial keeps the local learning path usable;
9. finish without opening developer tools or receiving facilitator instructions.

## Stop/clarification criteria

The facilitator may clarify only after recording the failure point. Treat any of these as a usability issue:

- viewer believes synthetic evidence is factual truth;
- viewer cannot find the next action for 30 seconds;
- viewer thinks denial will lose local work;
- viewer saves before understanding the preview;
- viewer believes browser-local storage is an account/cloud save;
- viewer opens the technical inspector because the main flow does not explain itself;
- viewer cannot recover from a denied/error state.

## Evidence to record

- participant code (not unnecessary personal data);
- consent status;
- exact source revision;
- device/browser/viewport;
- start/end time and task duration;
- completion yes/no;
- first point of confusion;
- whether facilitator intervention was needed;
- exact wording of any truth/consent/storage misunderstanding;
- high-impact issue and proposed fix;
- retest result after a fix, if performed.

## Acceptance interpretation

One successful viewer does not establish general usability. For P041-08, record at least one genuine fresh-viewer walkthrough. For broader participant claims, use the project’s participant-testing phase and do not generalize beyond the actual sample.

Automated Chromium tests remain separate evidence: they can prove DOM state, keyboard activation and layout regressions, but not comprehension.
