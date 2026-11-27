# SUTRA session 0012 — locale/date semantics, rollout retention and Milestone C hardening

- Exact observed implementation: `35be38bc80cade335110c6f38c1966123c7707d9`.
- Passing learner/build/browser job: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45299131018/job/138126934790
- Observation date: 2026-11-24, Asia/Kathmandu.
- Development branch: `sutra/caller-peer-failure-boundary`, draft PR #49; **no release/deployment authorization**.
- Prior verified register: 371 / 1,000 checks, 27 / 100 fully verified phases, one intentional omission.

## Exact-head validation

The green job passed:

- **59** learner/app tests, zero failures;
- **49** consent/inference/source/API tests, zero failures;
- 10 pinned upstream module hashes;
- **97** runtime/peer/privacy tests, zero failures;
- **7** independent peer-publication tests, zero failures;
- nine Chromium profiles, including the new visible hero journey.

The established browser profiles remained green: learner, consent, two-origin peer, MCP, accessibility, CSP/security policy, offline/resilience, measured low-bandwidth performance, and hero journey.

## Locale-safe timestamps and units

A dedicated formatter now makes evidence presentation deterministic across runtimes rather than relying on browser ICU behavior.

- canonical source timestamps remain UTC ISO data;
- displayed dates are explicitly Gregorian UTC in both languages;
- English uses Latin numerals;
- Nepali uses deterministic Devanagari numerals and draft Nepali Gregorian month labels;
- elapsed execution timing preserves the explicit `ms` unit and numeric value while localizing numerals;
- invalid timestamps/units fail instead of being silently normalized.

Chromium verifies that the canonical timestamp attribute remains unchanged while the visible Nepali date changes presentation, and that the collapsed inspector's elapsed limit preserves the same 60,000 ms meaning across locale switches.

This supports P048-06. It does **not** satisfy human terminology review P048-03 or the final reviewed localization artifact P048-09.

## Immutable rollout retention

The new rollout helper copies only previous immutable hashed assets and content-addressed graph versions into a next static build. Mutable HTML, manifests, canonical graph aliases and media are not carried forward by this mechanism.

Tests cover successful retention, idempotency, immutable-path collision rejection, unversioned-asset refusal and graph hash forgery rejection. See `ROLLOUT-RETENTION-2026-11-24.md`.

This supports P068-06. It is local deployment engineering, not evidence of an actual Cloudflare production rollout.

## Visible complete-product walkthrough

The new hero profile executes the local learner path through visible controls:

- initial empty state;
- source consistency check with truth boundary;
- explicit unresolved conflict;
- delayed media loading state;
- native media readiness and evidence seek;
- transcript cue navigation;
- comparison seek;
- review preview/save/delete;
- external-contact denial with local functionality retained;
- reload at 360 x 800 and keyboard-activated local completion.

The separate two-origin peer profile additionally denies the **actual visible peer workbench** before transport, observes zero peer requests, then proves local evidence and transcript search still work.

This supports P050-01, P050-03, P050-04, P050-05 and P050-06.

The milestone artifact prioritizes human/content/default-path blockers above optional features, records the exact revision and explicitly leaves the milestone open. This supports P050-07, P050-08 and P050-09.

P050-02 remains open because funded/default inference discovery cannot be truthfully demonstrated while live paid inference is intentionally disabled pending participant provider/budget authorization. Therefore P050-10 remains open and the phase is **not closed**.

## Human gates prepared, not passed

Two additional protocols were prepared without claiming results:

- `LOCALIZATION-HUMAN-REVIEW-QUEUE-2026-11-24.md` for Nepali terminology review;
- `FRESH-VIEWER-PROTOCOL-2026-11-24.md` for genuine first-viewer comprehension testing.

They reduce later execution ambiguity but do not count as P048-03 or P041-08 evidence.

## New verification delta

Newly supportable verified checks:

- `SUTRA-P048-06`
- `SUTRA-P068-06`
- `SUTRA-P050-01`
- `SUTRA-P050-03`
- `SUTRA-P050-04`
- `SUTRA-P050-05`
- `SUTRA-P050-06`
- `SUTRA-P050-07`
- `SUTRA-P050-08`
- `SUTRA-P050-09`

Resulting verified count: **381 / 1,000**. Fully verified phase count remains **27 / 100** because phases 048, 050 and 068 still contain applicable open items.

## Remaining hard boundaries

No original rights-cleared lesson/video or reviewed guide was supplied; no factual human review occurred; no human Nepali terminology review occurred; no fresh-viewer or physical-device/screen-reader result occurred; no live paid provider was enabled; no public independent HTTPS peer/MCP was exercised; no production Cloudflare deployment/rollback/headroom sample occurred; and no official submission action occurred.
