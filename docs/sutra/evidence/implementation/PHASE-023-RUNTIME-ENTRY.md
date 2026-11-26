# Phase 023 runtime entry and first local run

Observed: 2026-11-26.

Supports `SUTRA-P023-09` only. It documents the browser runtime entry module and an observed local orchestration run. It does **not** satisfy `SUTRA-P023-03` because the demonstrated model driver is scripted, not an approved live configured inference provider.

## Runtime entry

Learner entry: `apps/sutra/src/main.js`.

The browser module:
- imports `loadLocalNetwork` and `runNetwork` from `packages/sutra-runtime/index.js`;
- resolves the public same-origin agent base;
- loads the published `learner` network through `loadLocalNetwork`;
- invokes `runNetwork` inside page JavaScript;
- injects a deterministic scripted model only for the local development/test run;
- emits only sanitized agent-start trace rows to the visible page;
- renders completed/error state visibly without requiring the developer console.

Published graph: `apps/sutra/public/agents/learner.network.json` and its immutable versioned copy referenced by the public manifest.

## Observed browser run

The Chromium learner/browser suite activates the visible **Run scripted network test** control and waits for the actual page result.

Observed assertions:
- result state becomes `completed`;
- visible result includes **2 agent invocations; 3 scripted model steps**;
- sanitized visible trace contains exactly two agent-start rows;
- visible result explicitly states **No live AI**;
- completed orchestration state and trace survive locale switching;
- a cyclic graph fixture is rejected with zero trace rows;
- an unavailable graph produces no completed result.

The same browser suite separately executes the scripted source network and observes five scripted model steps plus two source reads, while preserving the explicit “factual truth remains unverified” boundary.

Exact current browser implementation remains covered by the learner-shell Chromium suite; Session 0048 records a later successful full browser run on source `6bf140510c41ad016942157b039b9768be299887`, which contains the same local runtime entry/run behavior.

## Boundary / counterexample

This artifact is intentionally **not** evidence of:
- a paid or self-hosted live provider call;
- provider availability, pricing or token economics;
- production deployment;
- factual correctness of the synthetic source;
- phase-023 closure while `P023-03` remains pending.

A server-only chat response would not satisfy this artifact. The observed run is initiated from the browser UI, loads the graph in the browser, executes the pinned runner there and renders browser-visible delegation trace.
