# Active SUTRA repository map

The repository contains one active product: SUTRA. `main` is canonical.

| Path | Role |
| --- | --- |
| `apps/sutra-v2/` | Current SUTRA investigation workspace; historical path name |
| `packages/sutra-knowledge/` | Living-knowledge kernel, revision, counterfactual and replay logic |
| `packages/sutra-runtime/` | Portable bounded agent execution inherited and extended by current SUTRA |
| `packages/sutra-inference/` | Provider-neutral inference contracts |
| `packages/sutra-consent/` | Permission and disclosure boundaries |
| `packages/sutra-evidence/` | Evidence contracts |
| `packages/sutra-source-tools/`, `packages/sutra-content-profile/` | Source/profile primitives used by inherited/current SUTRA paths |
| `services/sutra-api/` | Bounded service adapters |
| `apps/sutra/` | Earlier SUTRA implementation retained wherever current integration depends on it |
| `docs/sutra/` | Earlier SUTRA engineering evidence and historical verification records |
| `docs/sutra-v2/` | Current SUTRA mandate, roadmap, checklist and verification state |

Standalone DHAGO, DETOUR and AFTERIMAGE trees are retired. Git history remains intact.

Historical V2 child and validation branches are provenance only. Do not infer obsolescence from a directory name or age; remove inherited SUTRA code only after exact dependency and regression verification.
