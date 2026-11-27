# SUTRA — Living, verifiable knowledge

SUTRA is a living computational knowledge system for discovering, challenging, maintaining, revising and acting on important knowledge.

The product preserves investigations across model changes. It separates source evidence, interpretation, method, deterministic computation, empirical support, freshness, applicability and action authority instead of collapsing them into a single confidence score.

## Active workspace

- `apps/sutra-v2/` — browser investigation workspace.
- `packages/sutra-knowledge/` — knowledge kernel, revision engine, counterfactuals, evidence economics and independent replay contracts.
- `packages/sutra-runtime/` — bounded portable-agent runtime.
- `packages/sutra-inference/` — provider-neutral inference contracts and credential boundaries.
- `packages/sutra-consent/` — explicit contact and disclosure controls.
- `services/sutra-api/` — bounded service adapters.
- `docs/sutra-v2/` — current product mandate, execution contract, roadmap and verification state.

Run the core knowledge suite with Node 24:

```sh
node --test packages/sutra-knowledge/test/*.test.mjs
```

The canonical browser build uses the standalone toolchain in `apps/sutra-v2/`.

Passing tests establish only their stated scope. Model output is never verification authority, and deterministic replay is not empirical truth.

[Product mandate](docs/sutra-v2/LIVING-KNOWLEDGE.md) · [Execution contract](docs/sutra-v2/CONTINUE.md) · [Roadmap](docs/sutra-v2/ROADMAP.md) · [Checklist](docs/sutra-v2/CHECKLIST.md)
