# SUTRA session 0011 — learner-state, media-recovery, bilingual-core checkpoint

- Exact observed code candidate: `2686e3cacdd3e4d552820ccaf57b968a7544ddb4`.
- Passing learner/build/browser workflow: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45297219581/job/138120560126
- Observation: 2026-11-24T06:12:47+05:45.
- Development branch: `sutra/caller-peer-failure-boundary`, draft PR #49; **development only / do not release**.
- Previous machine checkpoint: 358 / 1,000 verified checks and 25 / 100 complete phases at `e1122ec58c7a773b41e4470dc0139a897049f912`.

## Exact-head validation

The observed workflow passed:

- **52** learner/app tests;
- **49** consent/inference/source/API tests;
- the pinned 10-module upstream integrity check;
- **97** runtime/peer/privacy tests;
- **7** independent peer-publication tests;
- eight real Chromium profiles covering the learner, consent example, two-origin peer flow, MCP, accessibility, CSP/security policy, resilience and the measured low-bandwidth profile.

The Chromium summaries reconfirm source-consistency/truth separation, completed/rejected/unknown local writes, consent-before-contact, native media controls/seek/recovery, peer/MCP failure boundaries, active native captions, 200% zoom, 360 px layout, offline/mid-run recovery and transcript-first behavior under 1 Mbps/150 ms shaping.

## Media replacement and decode recovery

The DHAGO adapter now treats source replacement as a transaction:

- a valid replacement waits for actual native metadata;
- invalid source input has a distinct `MEDIA_SOURCE` failure;
- unsupported decode uses `MEDIA_UNSUPPORTED`;
- generic load failure and timeout remain distinct;
- if a replacement fails after a previously playable source existed, the adapter attempts to restore that exact prior native source;
- successful restoration marks the replacement failure `recovered=true` but never reports the replacement itself as successful;
- failed restoration stops with `MEDIA_RESTORE_FAILED`.

The two-origin Chromium fixture replaced the timing media, supplied non-decodable MP4 bytes, observed the unsupported failure and confirmed the previous playable source was restored. This closes P042-06 and, with the already-verified ordinary controls/isolation tasks, phase 042.

## Safe inspector partial outcomes

The trace receipt vocabulary now preserves `partial` and `unknown` rather than collapsing them into generic success/failure. The visible inspector distinguishes:

- completed;
- denied;
- cancelled;
- failed before any completed external operation;
- **partial** — one or more approved public reads completed, but no peer result completed;
- **unknown** — a side effect may have happened and must not be retried automatically.

The wrong-name peer fixture deliberately completes the manifest read and then fails graph/name resolution. Chromium observes one completed contact, a visible partial-failure label, and a downloaded redacted receipt with `outcome: "partial"`. Existing local-write coverage separately preserves an unknown action result without automatic retry. This closes P047-04 and phase 047; credential/private canary boundaries remain unchanged.

## Accessibility and captions

The automated accessibility profile now forces the non-default native WebVTT track to load in hidden mode, verifies the authored cue text and metadata, then returns it to hidden mode and uses the actual media caption control to enter `showing`. At native time 1 second the active cue is observed. The same profile retains sampled >=4.5:1 contrast, reduced motion, keyboard/modal focus restoration, >=24 CSS px targets (now including the language selector), 200% Chromium CSS zoom with no horizontal clipping and the 360 px no-clipping check.

This closes P049-03 only. Physical touch hardware and human screen-reader testing remain open, so phase 049 is not closed.

## Core bilingual layer

A bounded localization module now provides **52 English keys and 52 matching Nepali draft keys**. English remains the canonical/default surface. Nepali is explicitly marked as a machine-authored working draft with human terminology review pending.

The implementation deliberately mutates only nodes carrying `data-i18n` or `data-i18n-placeholder`; source excerpts, source IDs, versions, provenance values and raw cue wording are not translation targets. The browser test changes language after selecting a cue and after completing the scripted local run, and verifies the validation state, selected cue, sanitized run trace and original source wording remain intact. Comparison rerenders preserve the current locale while their source excerpt stays in its original wording. Unit tests require complete English coverage for every Nepali catalog key and deterministic fallback to English/key identity for unsupported locales/missing keys.

The intentionally deferred part is equally important: dynamic runtime/peer/MCP diagnostics and evidence timestamps/units are not half-translated in this checkpoint. Human review of Nepali technical vocabulary, consistent locale-aware date/unit policy and the final reviewed terminology artifact remain open.

## Responsive contract chronology

A responsive interaction map is recorded separately in `RESPONSIVE-INTERACTION-MAP-2026-11-24.md`. Existing Chromium evidence validates the current behavior at 360 px and 200% CSS zoom. P041-07 itself requires that behavior to have been specified **before styling**; styling already existed, so that historical sequencing claim cannot truthfully be verified. The project records the task as intentionally omitted with a narrow rationale rather than rewriting chronology. Fresh-viewer acceptance remains open.

## Cloudflare route-precedence observation

A read-only connected-account check examined the two proposed hostnames already recorded in the project register:

- `sutra.aafnaipatro.com`
- `sutra-guide.aafnaipatro.com`

At observation time both had no DNS record, neither appeared as a Worker custom domain, and no current Worker route used either hostname or a wildcard subdomain pattern that would capture them. Existing Worker routes are apex/path-specific. Current Cloudflare routing documentation states that custom domains match the configured hostname and that the most-specific Worker route wins. No DNS, Worker domain, route, script, setting or deployment was changed.

This supports P065-03 as a **read-only precedence audit only**. It does not establish billing headroom, deployed static-vs-Worker behavior, final production route ownership, or release readiness.

## Credited checklist scope

Newly verified in this checkpoint:

- `SUTRA-P041-09`
- `SUTRA-P042-06`, `SUTRA-P042-10`
- `SUTRA-P047-04`, `SUTRA-P047-10`
- `SUTRA-P048-01`, `P048-02`, `P048-04`, `P048-05`, `P048-07`, `P048-08`
- `SUTRA-P049-03`
- `SUTRA-P065-03`

`SUTRA-P041-07` is intentionally omitted with Decision 0017 and does not count as verified. The resulting verified count is **371 / 1,000**, with **27 / 100 phases complete**.

## Gates that remain explicit

No rights-cleared original lesson/video or reviewed written guide was supplied; no human factual review was performed; no physical touch/screen-reader acceptance was performed; no independent public HTTPS peer or MCP publisher was tested; no live paid provider/budget was enabled; no billing headroom was established; no production DNS/route was created; no participant/fresh-viewer study was run; and no release, package submission or Devpost action is authorized by this checkpoint.
