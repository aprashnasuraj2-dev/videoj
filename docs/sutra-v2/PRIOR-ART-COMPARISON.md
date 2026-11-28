# Prior-art and reuse boundaries — 2026-11-28

This is a scoped technical comparison of documented capabilities, not a comprehensive literature or patent search. Sources were checked on 2026-11-28. No competitor product benchmark or claim of first-ever capability.

| Reference | Established capability (documented) | SUTRA reuse or distinction | Evidence and limitation |
| --- | --- | --- | --- |
| Neuro SAN / nsDeploy | Data-only HOCON networks, browser agent execution, tool calls, delegation, peer publication. | SUTRA vendors the upstream runtime rather than claiming to invent agentic web execution. Its distinct work is the evidence-to-revision interaction on top of that runtime. | Pinned vendor commit 486ecf26aa8775963f9b765f894734bef1ac9817; neutral consumer and browser peer tests passed at 670d4dd. New upstream reference execution is pending. |
| Perplexity Pro Search | Search synthesis and clickable citations to original sources. | SUTRA additionally records exact reviewed source spans, binding units, conditional expressions, source withdrawal/replacement and proof capsule. | Research-to-revision browser job at 670d4dd used synthetic data and injected models. No claim about Perplexity's internal revision or provenance implementation. |
| Microsoft AutoGen AgentChat/Core | Group chat, selectors and multi-agent coordination patterns. | SUTRA's reviewed kernel treats model proposals as candidates with no decision authority; disagreement remains until explicitly resolved, and arithmetic replay does not rely on reviewer consensus. | Existing reviewed expression/council tests. Not a claim AutoGen cannot implement an equivalent workflow with custom components. |
| W3C PROV-DM / Git / DVC | Entity/activity/agent derivations; content-addressed revisions; dependency-based pipeline reproduction and caching. | SUTRA adapts analogous concepts to pinned sources, reviewed bindings and conditional conclusion dependencies, with typed missing inputs and explicit re-selection. | Investigation and evidence-revision transaction tests, independent Python verifier. SUTRA's schema is not asserted to conform to PROV or replace Git/DVC. |
| Z3 / SMT solvers | Satisfiability and validity checking over formal constraints, including arithmetic and unsatisfiable cores. | SUTRA's small deterministic arithmetic kernel addresses a narrower reviewed expression language, with source spans and semantic obligations explicitly outside the arithmetic proof. | Actual WASM lattice and exact conditional replay; not a general-purpose SMT solver or proof of empirical facts. |

## Actual additional workflow

The useful composition is: objective → approved research → exact provenance and conflicting candidates → reviewed numeric interpretation → conditional computation → explicit source revision → scoped invalidation → independently replayable proof. Each arrow has a separate authority boundary. The system may compute a condition correctly even when the source is wrong or the declared interpretation is inapplicable. A content hash identifies bytes, not authenticity.

Counterexample: a stable factual lookup or a two-cell calculation does not need an investigation history or multi-agent critique. A conventional search/chat or spreadsheet can be a simpler and faster choice. No universal superiority or observed latency advantage over these products is claimed; the matched evaluation and human study remain separate gates I03/I04/U09. Existing internal selective-replay development controls quantify node reuse, not user productivity.

## References

- [Worldwide Agentic Web MVP specification](https://github.com/cognizant-ai-labs/agentic-web/blob/main/docs/worldwide_agentic_web_mvp_spec.md); [nsDeploy](https://github.com/cognizant-ai-lab/nsdeploy); [Neuro SAN](https://github.com/cognizant-ai-lab/neuro-san).
- [Perplexity Pro Search documentation](https://www.perplexity.ai/help-center/en/articles/10352903-what-is-pro-search).
- [AutoGen AgentChat teams](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/teams.html); [Core group chat](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/group-chat.html).
- [W3C PROV-DM](https://www.w3.org/TR/prov-dm/); [Git data model](https://git-scm.com/docs/gitdatamodel); [DVC pipeline dependency model](https://doc.dvc.org/user-guide/pipelines/defining-pipelines).
- [Z3 guide](https://microsoft.github.io/z3guide/docs/logic/intro/); [Programming Z3](https://z3prover.github.io/papers/programmingz3).

## SUTRA evidence

- [Built workspace and neutral browser conformance, 670d4dd](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46108250196/job/140865758471).
- [Research suite, 101/101, 670d4dd](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46108250018/job/140865758299).
- `packages/sutra-knowledge/test/evidence-revision-transaction.test.mjs` and `packages/sutra-knowledge/evaluation/revision-session-pilot.mjs`.
- `packages/sutra-runtime/vendor/` upstream pins; no claim of original upstream authorship.
