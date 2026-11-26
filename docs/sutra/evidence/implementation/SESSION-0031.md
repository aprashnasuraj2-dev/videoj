# Session 0031 — Local-first inference and production-safe offline evidence

Revision observed: `450746ff4b1bf9ba9b1eb30a115ede1f0e042968` at 2026-11-24T06:15:38Z. No provider billing, actual model execution, DNS, deployment, release or user research.

## What was implemented

- **Zero-model evidence path:** A natural-language question becomes strictly catalog-matched source cue receipts, not model-authored claims; unsupported and near-equal matches visibly abstain or remain ambiguous. Local calls are always 0 model / 0 additional question-time network. User explicitly confirms review persistence.
- **Source integrity:** own a nested primitive snapshot and accept Nepali combining marks; regression discovered caller mutation after indexing and fixed it.
- **Self-hosted option:** Worker requires explicit mode, exact model, secure gateway and private token. Hosted mode is also opt-in; never an implicit paid fallback. Verified 2 agents and 3 model calls only with synthetic SSE; no actual weights.
- **Standalone model gateway:** independent Node loopback bridge (127.0.0.1), strict bearer/model, ≤33,792 input B, ≤262,144 output B, two active calls, deadline ≤30s, redirect refusal, abort propagation, no retry. Does not create public HTTPS or deploy model.
- **Fresh and offline viewer:** clean browser asks local question, checks actual receipt, previews the review card, explicitly saves, reloads and deletes without any model/provider/media request. Loaded catalog still works offline.
- **X006-07 measured:** one completed media HTTP response of 8,327 B. The CDP media-only byte counter remains null, not an invented zero; pre-click MP4 requests =0.
- **40 authored synthetic cases:** 20 matched, 10 unsupported abstained, 10 adversarial or ambiguous handled. No model calls; **not** held-out human review, semantic precision or factual-truth verification.

## Exact CI

- [Learner shell](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45339004529/job/138257848583): 100 app + 92 action/source/consent/content/API + 112 pinned runtime + 8 peer = **312 tests passed**, all Chromium end-to-end profiles passed.
- [Dedicated gateway](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45339004555/job/138257848723): **7/7 contract tests** passed, including held-open client disconnect, post-deadline response rejection, denial and concurrency.
- [Browser matrix](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45339004245): Chromium 151.0.7922.34, Firefox 153.0, WebKit 26.5; 1280×800 and 360×800 headless, no physical-touch/screen-reader evidence inferred.
- [Engineering evaluation](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45339004282/job/138257918720): 20/20 exact synthetic retrieval and 10/10 adversarial; median direct 0.0206215 ms, delegated 2.009948 ms in-process; 0 vs 90 total scripted model calls. Actual live model token, semantic precision and cost absent.
- **19 of 19 workflows passed** at exact `450746ff4b1bf9ba9b1eb30a115ede1f0e042968`. Old failing CI for literal-newline syntax, caller source mutation and async post-reload assertion remains in GitHub history rather than hidden.

## Network laboratory evidence

Chromium headless, 1280×800, 1 Mbps up/down and 150 ms shaping: 457,231 B compressed learner shell; first usable transcript 2,851 ms; initial MP4 requests 0; after explicit click video ready 3,493 ms; native seek feedback 65 ms. HTTP media response 8,327 B / 1 complete. CDP media-only encoded-byte count not observed (null); total incremental encoded traffic 374,587 B comprises more than video bytes. Original targets 700 KiB shell and 5 s transcript were not changed to fit results.

## Outstanding work and evidence boundary

**608/1,000 original; 637/1,030 total verified; 45 fully verified phases; six historical omissions; one explicitly blocked real model/hardware check.** P078-02 stabilization remains pending, as do genuine held-out human answer review, live model/function calls, real p50/p95 token/energy economics, independent outside adoption, public HTTPS and release. A catalog hash establishes exact bytes and coherent metadata—not factual truth. X007-08 has a narrow operator-owned hardware/secure gateway blocker; no silent promotion or paid fallback.
