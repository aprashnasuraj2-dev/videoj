# SUTRA V2 implementation plan

## Objective

Build a durable investigation system that can preserve, challenge and revise conclusions across model/provider changes.

## Architecture

1. **Question and evidence intake** — retain exact source identity and reviewed extraction.
2. **Semantic compilation** — represent multiple plausible meanings and explicit unknowns.
3. **Knowledge kernel** — perform typed deterministic computation only on admitted inputs.
4. **Counterfactual challenge** — search for incompatible worlds, decisive observations and minimum changes.
5. **Persistent revision** — branch, correct, withdraw and replay evidence while tracking impact.
6. **Collaborative intelligence** — use provider-neutral agents as bounded proposal generators.
7. **Independent replay** — export artifacts that can be checked without trusting the originating model.
8. **Authority boundary** — keep external decisions and actions outside computational verification.

## Engineering priorities

- correctness before breadth;
- reusable interfaces before application-specific shortcuts;
- explicit uncertainty before forced answers;
- exact evidence before presentation claims;
- adversarial regression tests for every reproducible failure;
- measured resource use rather than agent-count complexity.

Optional web access is not part of the core dependency chain unless a later explicit decision activates it.
