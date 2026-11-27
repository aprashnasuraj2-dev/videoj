# Session 0032 — Credentialless default, local system transport, Nepali learner and loading-state verification

Observed 2026-11-24T06:43:31Z; exact code revision `4b1c27daff748f723a564afad6f9310274c83404`, on SUTRA draft PR #49 only. **No** actual open-weight model/paid inference, public deployment, DNS, live API service, outside adoption, human factual verification or competition submission occurred.

## Revision trail and failures retained

- `080aacab`: switched model and source-MCP POSTs from same-origin ambient credentials to `credentials:'omit'`; cookie canary browser regressions and worker adapter tests pass.
- `a6a7f2b`–`b95b10d`: complete real local HTTP chain from caller adapter via quota worker and authenticated gateway to a **fake** SSE engine and delegated runtime; aborted client request closes the local model socket and releases quota with no retry. Earlier fixture accidentally retained an escaped `[DONE]` delimiter; corrected and 19/19 workflows passed at `b95b10d`.
- `ca716292`: Worker rejects unexpected nested tool-call/function/url metadata before quota access or paid requests.
- `ae50bd50`: free question UI first in learner, local results/actions and status live-translate EN/NE. Nepali terms remain working draft without human review.
- `7197744` failed one prior BYOK wording test after changing provider consent copy; `f93a61f` restored the explicit personal API key prohibition and kept operator data-flow explanation.
- `6ad30f4`–`a0228a0`: accessible HTML loading status for async content profile. `index.html` initially missed verification classification; `5348b51` maps it to journey/browser/performance/security suites with a new impact test. Tests passed 19/19 on this exact precursor. Never credit initial loading as a completed source.
- `4b1c27daff748f723a564afad6f9310274c83404`: gateway independently checks nested roles/calls/tool-definition allowlists, rejects oversize context and unknown fields. Repeated 19/19 success on exact candidate; 13 prior commits since `450746f` modify only SUTRA-owned app/tool/inference/evidence paths.

## Quantitative verification

- [Learner CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45342446357/job/138269051024): 100 app + 95 action/inference/source/API + 112 pinned runtime + 8 peer = **315 passing automated tests**, including 40 authored synthetic zero-model questions, the full fake local model HTTP chain and abort/lease tests. Browser integrations all passed on controlled Chromium.
- [Independent gateway CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45342446341/job/138269050591): 7/7 passing contract tests. Negative nested-field cases incorporated into authenticated streaming test; still no real model.
- [Three-engine matrix](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45342446447): Chromium 151, Firefox 153 and WebKit 26.5 headless; both desktop and narrow 360px. No physical touch or human assistive-technology evidence inferred.
- [In-process engineering baseline](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45342446499/job/138269173518): 20/20 synthetic literal cue cases and 10/10 synthetic adversarial; direct median 0.021068 ms vs delegated 2.2866565 ms; total simulated model steps 0 vs 90, no real tokens or semantic truth.
- [Impact classification](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45342446498) green; `apps/sutra/index.html` now invalidates dependent evidence families and can no longer slip through unmapped.
- All **19 associated workflows** completed successfully.

## Measured low-bandwidth profile, source `4b1c27daff748f723a564afad6f9310274c83404`

Chromium headless 1280×800, 1 Mbps up/down and 150 ms laboratory shaping: gzip shell **458,664 B** (<700 KiB ceiling), transcript usable **2,892 ms** (<5,000ms), zero source MP4 GET prior to explicit click, actual video ready after click **3,512 ms**, native seek feedback **66 ms**, exactly one completed MP4 HTTP body of **8,327 B**. CDP media encoded-byte counter **null/unobserved**, not zero; aggregate incremental bytes **374,587 B** include non-video transfer. No physical-device result or production SLA follows from this lab fixture.

## Scope and remaining blockers

**609/1,000 original verified; 644/1,036 total verified; 45/100 phases fully verified; six historical omissions; one real-hardware blocked check.** X007-08 real authorized GPU/model and private TLS gateway trial remains blocked (rights, cost, tool-call quality and user acceptance still unmeasured). P078-02 and P041-10 remain pending; default inference not silently declared competition-ready. Synthetic development prompts and source hash consistency prove neither factual truth nor real user success. No deployment, promotion, live sponsored inference or submission authorized.
