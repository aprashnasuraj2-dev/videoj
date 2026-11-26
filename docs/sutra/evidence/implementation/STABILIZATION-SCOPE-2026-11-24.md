# Stabilization scope and post-fix attack rerun — 2026-11-24

## Product stabilization baseline

Exact product baseline: `0ef8a613c1c8d6db522d50a1088f9528ad055d4b`.

That revision passed all ten then-current workflows, including the full learner shell, neutral consumer, engineering evaluation, Chromium/Firefox/WebKit matrix, evidence library, ingress and impact checks.

The learner job includes regression coverage for:
- consent denial before peer/MCP transport;
- caller-local peer execution and exact destination/private-context policy;
- hostile peer/caller model-hint rejection;
- malformed/wrong network refusal;
- cycle/budget/cancellation failures;
- credential/canary isolation;
- CORS/redirect fail-closed behavior;
- local write completed/rejected/unknown outcomes;
- source/evidence consistency and invalid-source rejection;
- CSP/connect restrictions;
- offline/mid-run failure behavior;
- provider quota/cancellation/no-retry behavior.

The exact green baseline was measured after the evidence-data descriptor hardening and comparison/provenance fixes. Resolved risks R-001, R-002 and R-004 therefore have post-fix integrated regression evidence rather than only unit patches.

## No-unrelated-product-feature check

Compared `0ef8a613c1c8d6db522d50a1088f9528ad055d4b` to checkpoint `0866b3f2ae07fb2f91f362f72d42431ca63d44a0`.

Observed changed files: **76**.

Changed product implementation files under:
- `apps/sutra/src/`
- `apps/sutra-peer/src/`
- `packages/sutra-*/`
- `services/sutra-api/`

**0 files.**

Post-baseline changes are:
- workflow/test hardening;
- validation/readiness tooling for provider cost, user study, outside builders, physical device and real content;
- strategy/evidence/risk/checklist documentation;
- an additional BYOK-absence build test.

This is evidence that the stabilization period did not add another learner/runtime feature after the exact-green product baseline. It does not prohibit future blocker fixes: if a product-source bug fix becomes necessary, it should be made, mapped to affected evidence, and revalidated rather than avoided to preserve this count.

## Counterexample

A new unrelated UI module, model feature, social/account feature or runtime capability after the baseline would invalidate this finding. Validation tooling for already-declared release gates does not count as a product feature because it does not enter the learner/runtime delivery surface.

## Remaining stabilization blockers

This scope result does not close phase 078. Target-user pilot/mobile observations remain missing, and the final stabilization exit still depends on those external checks and any resulting blockers.
