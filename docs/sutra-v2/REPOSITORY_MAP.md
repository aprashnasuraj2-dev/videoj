# Active SUTRA repository map

The repository contains one active product: SUTRA.

The current SUTRA product combines the advanced living-knowledge system with reusable implementation inherited from earlier SUTRA engineering. Inherited code is retained when current runtime, consent, evidence, provider, source-integrity, browser or verification paths depend on it.

| Path | Role |
| --- | --- |
| `apps/sutra-v2/` | Current investigation workspace |
| `packages/sutra-knowledge/` | Living-knowledge kernel, revision, counterfactual and replay logic |
| `packages/sutra-runtime/` | Portable bounded agent execution inherited and extended by current SUTRA |
| `packages/sutra-inference/` | Provider-neutral inference contracts |
| `packages/sutra-consent/` | Permission and disclosure boundaries |
| `packages/sutra-evidence/` | Evidence contracts |
| `packages/sutra-source-tools/` and `packages/sutra-content-profile/` | Source/profile primitives still used by SUTRA paths |
| `services/sutra-api/` | Bounded service adapters |
| `apps/sutra/` | Earlier SUTRA implementation retained as reusable/inherited code where current integration still depends on it |
| `docs/sutra/` | Earlier SUTRA engineering evidence and exact historical verification records |
| `docs/sutra-v2/` | Current product mandate, roadmap and active verification state |

Standalone DHAGO, DETOUR and AFTERIMAGE trees are retired from the active repository. Historical Git revisions remain intact.

Do not infer obsolescence from directory age. Remove inherited SUTRA code only after exact import/test/runtime analysis proves that the current product no longer depends on it.
