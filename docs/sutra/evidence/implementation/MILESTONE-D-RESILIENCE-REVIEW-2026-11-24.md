# Milestone D resilience review — partial, release-blocked

Exact reviewed product revision: `0ef8a613c1c8d6db522d50a1088f9528ad055d4b`, all ten current project workflows green.

## Resolved engineering boundaries

- **Consent:** denial is observed before external transport; peer/MCP contacts require exact visible destination/purpose/disclosure policy.
- **Credential isolation:** caller model/provider policy stays caller-owned; public peer metadata cannot inject model credentials or override routing. Canary-oriented tests have no observed leak.
- **Ambiguous writes:** local review writes distinguish completed/rejected/unknown, require exact readback before completion, and do not auto-retry unknown outcomes.
- **Source/media drift:** receipts bind source/media hashes and stale saved cards are not silently migrated.
- **Bounded work:** cycles, graph limits, agent/model budgets, timeouts and cancellation fail incomplete rather than successful.
- **Media:** native source identity/seek behavior and transcript-first fallback are tested; no media request occurs before explicit load in the shaped profile.
- **Optional attack surface:** direct BYOK is cut from minimum scope instead of adding a second credential path.

## Still release-blocking

1. **Default funded judge path:** site-funded live inference has not been approved/measured; synthetic transport tests are not a substitute.
2. **Actual provider economics:** real model identifier, input/output tokens, price basis, mean/high-percentile cost and judging reserve are unknown.
3. **Rights-reviewed real content:** synthetic fixture cannot stand in for the final lesson/guide and factual review.
4. **Physical/human accessibility:** automated desktop/headless checks do not establish physical touch or human screen-reader acceptance.
5. **Independent public interoperability:** same-owner/loopback neutral-consumer evidence does not prove outside public HTTPS adoption.
6. **Production hosting headroom:** Billing Read/request sample and final production routing remain unresolved.

## Practical effect

The local synthetic learner is robust against the tested privacy/consent/write/source failures, but it is **not a release candidate for judges yet** because the free live judge path and real cost/content/public evidence are missing. No amount of cosmetic polish should supersede those blockers.

## Scope discipline

The risk register keeps optional omissions separate from mandatory failures. Direct BYOK is an optional omission. The funded judge path is a mandatory unresolved gate. They must never be combined into “inference done.”

Phase 070 therefore remains open. This review supports only checks whose mechanisms are actually observed; P070-02, P070-03 and P070-10 remain pending.
