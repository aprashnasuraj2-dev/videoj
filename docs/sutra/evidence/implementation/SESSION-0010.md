# SUTRA session 0010 — observed head reconciliation: private context, MCP, accessibility and resilience

- Exact observed code candidate: `545f2c310beb9ac4e5e3a4e30603dd6640cf67d7`.
- Passing learner/build/browser workflow: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45293913993/job/138109358437
- Passing progress-register workflow: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45293913823/job/138109358029
- Observation: 2026-11-24T05:48:49+05:45.
- Development branch: `sutra/caller-peer-failure-boundary`, draft PR #49; **development only / do not release**.
- Previous credited checkpoint: 263 / 1,000 checks, 16 complete phases at `141635df81697e7daed5a166815ab2ac3f3e1bb9`.

## Why this checkpoint exists

The branch had advanced materially beyond the last evidence revision while the machine register still pointed at the older code. This checkpoint reconciles only behavior that was actually observed green on the current head. It does not treat later documentation commits as code evidence and it does not infer factual truth from source consistency.

## Newly credited private-context behavior

The current runtime and tests demonstrate an explicit caller-owned side channel rather than implicit prompt forwarding:

- allowed fields are bound to the exact peer URL **and** network name;
- downstream (`toPeer`) and upstream (`toCaller`) permissions are independent;
- default forwarding is empty, wildcard grants are rejected, and a same-name network on another origin does not inherit a grant;
- the browser integration shares an approved non-secret `locale` value with the exact peer while keeping the synthetic private canary out of artifact requests, peer prompts, local prompts and trace events;
- safe trace receipts do not carry the private canary or approved private values;
- peer-returned context is projected only from caller-owned fields and an independent `toCaller` allowlist.

This closes the currently applicable phase-036 checks. The residual limitation remains explicit: ordinary delegated request text is not a private-data classifier; if the caller puts a secret directly into ordinary text, this mechanism does not magically remove it.

## Newly credited MCP behavior

The Chromium cross-origin fixture now exercises all three P039-05 outcomes against the actual browser transport boundary:

1. approved discovery and call produce four stateless JSON-RPC 2025-06-18 requests and a bounded source-backed synthetic read;
2. a discovered destructive/unapproved tool fails closed before `tools/call`;
3. a real held-open HTTP response crosses the client's fixed five-second deadline and is aborted without fallback or browser-security bypass.

The same run also reconfirms zero POSTs when discovery is denied, no cookies or model authorization at the MCP origin, BYOK canary absence from request bodies, and browser CORS refusal failing closed while local video/evidence remain usable.

This is a **controlled loopback source-backed compatibility fixture**, not proof of a third-party production MCP publisher, OAuth/session/SSE compatibility, or public HTTPS availability.

## Additional green evidence retained but not over-credited

The same workflow passed:

- targeted automated accessibility checks including names/IDs, live-region discipline, sampled 4.5:1 contrast, reduced motion, keyboard/modal focus restoration, >=24 px targets, 200% CSS zoom and 360 px layout;
- strict static CSP behavior on the built learner;
- offline startup and mid-artifact network-loss resilience with explicit retry;
- a 1 Mbps / 150 ms laboratory profile where transcript remains usable before video transfer, with a <=700 KiB gzip shell target;
- native timing-fixture play/pause/volume/captions/fullscreen/seek behavior.

Physical touch hardware, screen-reader testing, independent HTTPS peer/MCP origins, original rights-cleared lesson content, human factual review, live funded inference and participant acceptance remain separate gates.

## Checklist credit from this observation

Newly verified here:

- `SUTRA-P036-03`, `P036-04`, `P036-06`, `P036-08`, `P036-09`, `P036-10`
- `SUTRA-P039-05`, `P039-10`

The resulting register is **271 / 1,000 verified checks and 18 / 100 complete phases**. No release/deployment/submission action is authorized by this checkpoint.
