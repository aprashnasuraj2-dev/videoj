# Migration ledger — 2026-11-25

Immutable v1 baseline: `9bd76ef8bfd05f323592f21fe4b0841188861693`, tree `c83fc3d1e4a998582d28d22d84615dc9a0ed5e61`, draft [PR #49](https://github.com/aprashnasuraj2-dev/videoj/pull/49). 19/19 exact PR workflow conclusions observed successful; [register job](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45425391036/job/138555848454) reported 714/1100 verified, 379 pending, 6 omissions, 1 blocked, 45/100 fully verified phases. Pending X010-43 separately passed exact 19/19 at cbddb72b6ce582e8919edf2ea186682f1813e15a; do not change the historical register. New direction resets product acceptance, not source history.

Source tree inspected (complete recursive tree; not truncated); selected implementation and contracts inspected, not every line or security proof. No measured reuse percentage.

| Existing boundary | Disposition | New acceptance |
|---|---|---|
| packages/sutra-runtime: pinned nsDeploy, host admission, budget and trace | preserve | actual browser composition of proof peers, no upstream mutation |
| packages/sutra-consent/strict-json.js | directly reuse | duplicate decoded keys rejected before claim admission |
| packages/sutra-consent + runtime peer/private-context | preserve | exact contact consent; dependency fetch never implicitly grants disclosure |
| packages/sutra-evidence/index.js | adapter, not general truth engine | catalog-matched receipts remain source consistency; no self-certification |
| packages/sutra-source-tools | extend through separate registry | exact claims, no incomplete result presented as complete |
| packages/sutra-content-profile + player-adapter | retain as observation adapter | hash-bound time-indexed evidence with native seek; not required by every claim |
| apps/sutra/src/comparison.js | preserve old behavior; new semantics separately | scope/assumption incompatibility, formal vs numerical vs empirical separation |
| packages/sutra-actions | preserve explicit host action authority | no model-selected writes or deployment authority |
| packages/sutra-inference, services/sutra-api | optional planning only | deterministic checks run without inference; no paid calls |
| apps/sutra learner shell | reference / video adapter | new product workspace separate from old release routes |
| Existing starter, Open Kit, neutral consumer, impact/risk tooling | extend after contract | genuinely independent consumer of v2 reports; public kit and trial |
| Existing 19 workflows | retain historical baseline | dedicated v2 workflow now; later combined applicable CI and real HTTPS tests |

No DHAGO/DETOUR edits, old branch changes, public route changes, paid inference or Devpost submission. Do not treat passing v1 workflows as verification of v2.
