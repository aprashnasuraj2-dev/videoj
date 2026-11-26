# Parallel SUTRA v2 engineering workstreams

Integration target: `sutra/v2-knowledge-compiler` (draft PR #50). Starting source: `25ae51a7341c6afa178466b8d107a6705c426c8d`. Child PRs must be draft, independently reviewable, never merged or released without applicable authorization. Workstream branch prefix `sutra/v2-parallel/`. The workstream files record candidate state and actual evidence; central gate status stays unchanged until integration. Shared files should have one owner or an explicitly coordinated integration patch. Reconcile exact child HEAD and CI, then run the full unchanged integration gate after any authorized merge. No active task is dropped; existing SUTRA1 and V2 release gates remain.

| Workstream | Existing roadmap IDs | Acceptance |
|---|---|---|
| [Model-independent orchestration](workstreams/01-model-orchestration.md) | V2-P14-BYOK-UX; V2-P14-BUDGET; V2-P02-RUNTIME | Model substitution preserves a pinned investigation; route/credential/consent changes cannot silently dispatch. |
| [Persistent knowledge and revision](workstreams/02-persistent-knowledge.md) | V2-K07; V2-LK08-KNOWLEDGE-GRAPH; V2-LK09-REVISION; V2-LK10-VERSION-CONTROL; V2-LK11-IMPACT-REPORT | Exact independently replayed history; dependency closure parity; crash/concurrency/rollback counterexamples. |
| [Semantic compilation and intent](workstreams/03-semantic-compilation.md) | V2-LK02-INTENT-IR; V2-LK03-PATHWAYS; V2-LK04-ROUNDTRIP; V2-LK07-AMBIGUITY-REVIEW | Materially different interpretations retained, scope mismatch refused, human review required. |
| [Evidence acquisition and source economics](workstreams/04-evidence-acquisition.md) | V2-LK12-ACQUISITION; V2-LK13-STRUCTURAL-WEAKNESS; V2-D24-DISCLOSURE-FRONTIER; V2-F03; V2-F04 | No invented probabilities, unknown lineage retained, zero unapproved contact. |
| [Independent verification and replay](workstreams/05-independent-verification.md) | V2-P07-WASM; V2-D01; V2-D02; V2-D03; V2-O04; V2-LK14-STATISTICAL-PROFILES | Independent oracle and tamper rejection for a declared bounded profile. |
| [Counterfactuals and adversarial challenge](workstreams/06-counterfactuals.md) | V2-LK05-SEMANTIC-COUNTERFACTUAL; V2-LK06-SEMANTIC-WORLDS; V2-F05 | Bounded counterexample search with explicit completeness, no semantic truth claim. |
| [Security, privacy and recovery](workstreams/07-security-recovery.md) | V2-LK19-TRUST-BOUNDARY; V2-P01-THREAT; V2-P04-CONSENT; V2-P05-RECOVERY; V2-P05-ROLLBACK; V2-F11b; V2-P06-REFINE | No unauthorized disclosure/action, independent adversarial replay, unresolved coordinated rollback retained. |
| [Unified investigation workspace](workstreams/08-unified-workspace.md) | V2-LK15-UNIFIED-WORKSPACE; V2-LK07-AMBIGUITY-REVIEW | Complete keyboard/mobile manual journey, explicit state and recovery, no automatic authority. |
| [Specialist domain journeys](workstreams/09-specialist-domains.md) | V2-LK16-SPECIALIST-JOURNEYS; V2-LK14-STATISTICAL-PROFILES; V2-D03; V2-L03 | Two complete independently replayed narrow journeys with applicability limits and user evidence. |
| [Independent benchmarking and prior art](workstreams/10-benchmark.md) | V2-LK17-BENCHMARK; V2-LK18-PRIOR-ART; V2-B01 | Held-out annotation, matched budgets, coverage and accuracy separately, publish failures. |

Branches may advance independently. Review dependencies before integration: security and provider boundaries underpin orchestration; knowledge identity and compiler underpin counterfactuals and specialist profiles; workspace consumes reviewed APIs; benchmarking runs across all but must freeze its inputs independently. Branch-only JS CI is not full verification. Do not duplicate common ledger edits across child branches.

## Exact initial child PR checkpoint

| PR | Branch | Head | Scoped JS CI at observation |
|---|---|---|---|
| [#51](https://github.com/aprashnasuraj2-dev/videoj/pull/51) | `01-model-orchestration` | `49eb1f56352b95cbff5135fa3f368d77e4f8d339` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45750028185) |
| [#52](https://github.com/aprashnasuraj2-dev/videoj/pull/52) | `02-persistent-knowledge` | `538e399b37cfac793f324d63f6ded73c8334373d` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45750033050) |
| [#53](https://github.com/aprashnasuraj2-dev/videoj/pull/53) | `03-semantic-compilation` | `2526cde01130541471b067afe0deed63088d8fa8` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45750039080) |
| [#54](https://github.com/aprashnasuraj2-dev/videoj/pull/54) | `04-evidence-acquisition` | `00fed563af6a3b5e79e007ced4d01264183a2d6c` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45750042028) |
| [#55](https://github.com/aprashnasuraj2-dev/videoj/pull/55) | `05-independent-verification` | `575efab451cfdb4e41aa3487e83a166f2168cd86` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45750087991) |
| [#56](https://github.com/aprashnasuraj2-dev/videoj/pull/56) | `06-counterfactuals` | `11873ae54add4625e89a3ab353532f78524b59ff` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45750147430) |
| [#57](https://github.com/aprashnasuraj2-dev/videoj/pull/57) | `07-security-recovery` | `6f2532d2b3119287c97d7ca089d63db5d386c201` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45750150946) |
| [#58](https://github.com/aprashnasuraj2-dev/videoj/pull/58) | `08-unified-workspace` | `78bd9509ac01e06951fbab33d089fd847b435b7c` | [success](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45750155401) |
| [#59](https://github.com/aprashnasuraj2-dev/videoj/pull/59) | `09-specialist-domains` | `357891e20374441e8af242928cdb6793ca465152` | [in_progress](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45750211579) |
| [#60](https://github.com/aprashnasuraj2-dev/videoj/pull/60) | `10-benchmark` | `bc3a06d9241b6f1671f036601d5c037f8e30d5b7` | [in_progress](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45750217798) |

Four children have executable changes (01, 02, 07, 10); six initially establish acceptance contracts. Draft PR status does not imply implementation completion. Re-read exact remote heads and CI before using this checkpoint. Files linked in the workstream table are on their respective child branches until integration.
